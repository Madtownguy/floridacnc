/**
 * Pastries and more!
 * Screens: home, play, shop, recipes, help, results.
 * The Selling Season clock lives in rules.js and reads SEASON_PLAY_MS.
 */
import { BAKER, INGREDIENTS, SEASON_PLAY_MS, TREATS } from "./data.js";
import {
  badgeName,
  buy,
  canMake,
  closeSeason,
  describeNeeds,
  describeOrder,
  formatDuration,
  getCustomer,
  getTopping,
  getTreat,
  markLeave,
  missingIngredients,
  newGame,
  nextUnlockText,
  patienceMaxMs,
  rollOrder,
  seasonClock,
  seasonTimeUp,
  selectAwning,
  setPlate,
  startSeason,
  takeResolution,
  thanksLine,
  toppingsFor,
  totalNeeds,
  tryServe,
  unlockedAwnings,
  unlockedTreats,
  withOrder,
  addPlaytime,
  SHOP,
  AWNINGS,
  TOPPINGS,
} from "./rules.js";
import { load, save } from "./state.js";
import { bakerySvg, customerSvg, emptyPlateSvg, toppingSvg, treatSvg } from "./view.js";

const app = document.querySelector("#app");
let state = newGame();
let ui = freshUi();
let timer = 0;
let timerToken = 0;
let audioCtx = null;
let saveAccum = 0;

function freshUi() {
  return {
    screen: "home",
    returnTo: "home",
    pause: false,
    confirmReset: false,
    clockShop: false,
    timeUp: false,
    busy: false,
    mood: "neutral",
    bubble: "",
    floater: "",
    toast: "",
    toastId: 0,
    results: null,
    patienceMs: 20000,
    patienceMax: 20000,
    lastNow: 0,
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function later(fn, ms) {
  const token = ++timerToken;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (token !== timerToken) return;
    fn();
  }, ms);
}

function cancelLater() {
  timerToken += 1;
  clearTimeout(timer);
}

function toast(message) {
  ui.toast = message;
  const id = ++ui.toastId;
  render();
  setTimeout(() => {
    if (ui.toastId === id) {
      ui.toast = "";
      render();
    }
  }, 2200);
}

function blip(freq, dur) {
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.stop(audioCtx.currentTime + dur);
  } catch {
    /* Audio is optional and stays quiet. */
  }
}

function clockRunning() {
  if (!state.season || seasonTimeUp(state.season)) return false;
  if (document.hidden || ui.pause) return false;
  if (ui.screen === "play") return true;
  return ui.screen === "shop" && ui.clockShop;
}

function frame(now) {
  if (!ui.lastNow) ui.lastNow = now;
  const dt = Math.min(1000, Math.max(0, now - ui.lastNow));
  ui.lastNow = now;
  if (!document.hidden && clockRunning()) {
    const step = addPlaytime(state, dt);
    state = step.state;
    saveAccum += dt;
    if (saveAccum >= 2000) {
      save(state);
      saveAccum = 0;
    }
    if (step.justFinished) onSeasonTimeUp();
  }
  if (ui.screen === "play" && state.season && !ui.pause && !ui.busy && !document.hidden) {
    ui.patienceMs -= dt;
    if (ui.patienceMs <= 0) {
      ui.patienceMs = 0;
      onLeave();
    }
  }
  paintPatience();
  paintClock();
  requestAnimationFrame(frame);
}

function paintPatience() {
  const el = document.querySelector("[data-patience]");
  if (!el || !ui.patienceMax) return;
  const pct = Math.max(0, Math.min(1, ui.patienceMs / ui.patienceMax));
  el.style.width = `${pct * 100}%`;
  el.parentElement.classList.toggle("is-low", pct < 0.3);
}

function paintClock() {
  const clock = seasonClock(state.season);
  document.querySelectorAll("[data-season-meter]").forEach((el) => {
    el.dataset.played = String(Math.round(clock.played));
    el.setAttribute("aria-valuenow", String(Math.round(clock.played)));
    el.setAttribute("aria-valuetext", clock.label);
    el.classList.toggle("is-full", clock.done);
    const label = el.querySelector("[data-season-label]");
    if (label && label.textContent !== clock.label) label.textContent = clock.label;
    const bar = el.querySelector("[data-season-bar]");
    if (bar) bar.style.width = `${clock.visualRatio * 100}%`;
  });
}

function onSeasonTimeUp() {
  ui.timeUp = true;
  save(state);
  blip(520, 0.12);
  render();
}

function beginCustomer() {
  if (!state.season?.order) return;
  const customer = getCustomer(state.season.order.customer);
  ui.patienceMax = patienceMaxMs(state, customer);
  ui.patienceMs = ui.patienceMax;
  ui.mood = "neutral";
  ui.bubble = "";
  ui.floater = "";
  ui.busy = false;
}

function endSeason() {
  if (!state.season) return;
  cancelLater();
  const closed = closeSeason(state);
  state = closed.state;
  ui.results = closed;
  ui.screen = "results";
  ui.timeUp = false;
  ui.pause = false;
  ui.busy = false;
  ui.clockShop = false;
  save(state);
  blip(660, 0.1);
  setTimeout(() => blip(880, 0.12), 120);
  render();
}

function settle(kind) {
  ui.busy = true;
  ui.mood = kind === "sold" ? "happy" : "sad";
  ui.bubble = kind === "sold" ? thanksLine(state.season?.sold || 0) : "Maybe next time!";
  ui.floater = kind === "sold" ? `+${state.season?.lastPay || 0}` : "";
  if (kind === "sold") blip(660, 0.08);
  else blip(220, 0.1);
  save(state);
  render();
  later(() => {
    ui.busy = false;
    ui.mood = "neutral";
    ui.bubble = "";
    ui.floater = "";
    if (!state.season?.resolved) {
      render();
      return;
    }
    const step = takeResolution(state);
    state = step.state;
    if (step.done || seasonTimeUp(state.season)) {
      endSeason();
      return;
    }
    state = withOrder(state, rollOrder(state, Math.random));
    beginCustomer();
    save(state);
    render();
  }, kind === "sold" ? 680 : 780);
}

function onLeave() {
  if (ui.busy || !state.season || state.season.resolved) return;
  state = markLeave(state);
  settle("leave");
}

function onServe() {
  if (ui.busy || ui.screen !== "play" || !state.season) return;
  const fast = ui.patienceMs / ui.patienceMax > 0.65;
  const out = tryServe(state, { fast });
  if (out.result === "incomplete") {
    toast(state.season.plate?.treat ? "Now pick a topping!" : "Pick a treat first!");
    return;
  }
  if (out.result === "short") {
    const names = out.missing.map((item) => item.name.toLowerCase()).join(", ");
    toast(`You need ${names}. The shop can help!`);
    return;
  }
  if (out.result === "mismatch") {
    state = out.state;
    ui.busy = true;
    ui.mood = "sad";
    const order = state.season.order;
    const who = getCustomer(order.customer).name;
    ui.bubble = `${who} wanted ${describeOrder(order).wanted}.`;
    if (!out.usedBell) ui.patienceMs = Math.max(0, ui.patienceMs * 0.62);
    const leaveAfter = ui.patienceMs <= 400;
    blip(180, 0.1);
    save(state);
    render();
    later(() => {
      ui.busy = false;
      ui.mood = "neutral";
      ui.bubble = "";
      if (leaveAfter) onLeave();
      else render();
    }, 850);
    return;
  }
  if (out.result !== "match") return;
  state = { ...out.state, tutorialDone: true };
  settle("sold");
}

function pickTreat(id) {
  if (ui.busy || !state.season) return;
  const treat = getTreat(id);
  if (!treat) return;
  if (treat.unlockLevel > state.level) {
    toast(`${treat.name} unlocks at level ${treat.unlockLevel}. Keep baking!`);
    return;
  }
  const plate = state.season.plate || { treat: null, topping: null };
  const turningOff = plate.treat === id;
  const stillOk = plate.topping && toppingsFor(id, state.level).some((top) => top.id === plate.topping);
  state = setPlate(state, {
    treat: turningOff ? null : id,
    topping: turningOff ? null : (stillOk ? plate.topping : null),
  });
  save(state);
  render();
}

function pickTopping(id) {
  if (ui.busy || !state.season) return;
  const plate = state.season.plate || { treat: null, topping: null };
  if (!plate.treat) {
    toast("Pick a treat first!");
    return;
  }
  const allowed = toppingsFor(plate.treat, state.level);
  if (!allowed.some((top) => top.id === id)) {
    const top = getTopping(id);
    if (top && top.unlockLevel > state.level) toast(`${top.name} unlocks at level ${top.unlockLevel}.`);
    else toast("That topping goes on a different treat.");
    return;
  }
  state = setPlate(state, {
    treat: plate.treat,
    topping: plate.topping === id ? null : id,
  });
  save(state);
  render();
}

function openSub(screen) {
  if (ui.screen === "play" || ui.screen === "home") ui.returnTo = ui.screen;
  if (screen === "shop") ui.clockShop = ui.returnTo === "play" && !!state.season;
  ui.screen = screen;
  ui.pause = false;
  save(state);
  render();
}

function goBack() {
  ui.screen = ui.returnTo === "play" && state.season ? "play" : "home";
  if (ui.screen !== "shop") ui.clockShop = false;
  render();
}

function handle(act, id) {
  if (act === "toggle-sound") {
    state = { ...state, sound: !state.sound };
    save(state);
    if (state.sound) blip(660, 0.08);
    render();
    return;
  }
  if (act === "start" && !state.season) {
    state = startSeason(state, Math.random);
    ui.timeUp = false;
    ui.screen = "play";
    ui.pause = false;
    beginCustomer();
    save(state);
    render();
    return;
  }
  if (act === "continue" && state.season && !seasonTimeUp(state.season)) {
    ui.screen = "play";
    ui.pause = false;
    if (!state.season.order) state = withOrder(state, rollOrder(state, Math.random));
    beginCustomer();
    save(state);
    render();
    return;
  }
  if (act === "claim") {
    if (state.season?.resolved) {
      const step = takeResolution(state);
      state = step.state;
    }
    endSeason();
    return;
  }
  if (act === "pause") {
    ui.pause = !ui.pause;
    save(state);
    render();
    return;
  }
  if (act === "resume") {
    ui.pause = false;
    render();
    return;
  }
  if (act === "save-home") {
    ui.pause = false;
    ui.screen = "home";
    ui.clockShop = false;
    cancelLater();
    ui.busy = false;
    save(state);
    render();
    return;
  }
  if (act === "shop" || act === "recipes" || act === "help") {
    openSub(act === "shop" ? "shop" : act);
    return;
  }
  if (act === "back") {
    goBack();
    return;
  }
  if (act === "home") {
    ui.screen = "home";
    ui.results = null;
    render();
    return;
  }
  if (act === "pick-treat") {
    pickTreat(id);
    return;
  }
  if (act === "pick-topping") {
    pickTopping(id);
    return;
  }
  if (act === "clear" && state.season && !ui.busy) {
    state = setPlate(state, { treat: null, topping: null });
    save(state);
    render();
    return;
  }
  if (act === "serve") {
    onServe();
    return;
  }
  if (act === "let-go") {
    onLeave();
    return;
  }
  if (act === "preview-treat") {
    const treat = getTreat(id);
    if (!treat) return;
    toast(treat.unlockLevel > state.level
      ? `${treat.name} unlocks at level ${treat.unlockLevel}.`
      : `${treat.name}s are on the menu!`);
    return;
  }
  if (act === "buy") {
    const result = buy(state, id);
    state = result.state;
    if (!result.ok && result.reason === "coins") toast(`You need ${result.need} more coins.`);
    else if (!result.ok && result.reason === "owned") toast("Already in your bakery!");
    else if (result.ok) {
      toast(`${result.item.name} is yours!`);
      blip(700, 0.08);
    }
    save(state);
    render();
    return;
  }
  if (act === "awning") {
    const result = selectAwning(state, id);
    if (!result.ok) toast("That awning unlocks later.");
    else {
      state = result.state;
      toast("The awning looks so cute!");
      save(state);
    }
    render();
    return;
  }
  if (act === "ask-reset") {
    ui.confirmReset = true;
    render();
    return;
  }
  if (act === "cancel-reset") {
    ui.confirmReset = false;
    render();
    return;
  }
  if (act === "reset") {
    state = newGame();
    ui = freshUi();
    save(state);
    render();
  }
}

function textBtn(act, label, cls = "", id = "") {
  const idAttr = id ? ` data-id="${esc(id)}"` : "";
  return `<button type="button" class="btn ${cls}" data-act="${esc(act)}"${idAttr}>${esc(label)}</button>`;
}

function seasonMeter(extraClass = "") {
  const clock = seasonClock(state.season);
  return `<div class="season-meter ${extraClass}${clock.done ? " is-full" : ""}" data-season-meter data-played="${Math.round(clock.played)}" data-total="${clock.total}" role="progressbar" aria-valuemin="0" aria-valuemax="${clock.total}" aria-valuenow="${Math.round(clock.played)}" aria-label="Selling Season progress" aria-valuetext="${esc(clock.label)}">
    <div class="season-meter-top"><span>Selling Season</span><span data-season-label>${esc(clock.label)}</span></div>
    <div class="season-track" aria-hidden="true"><span data-season-bar style="width:${clock.visualRatio * 100}%"></span></div>
  </div>`;
}

function pantryHtml() {
  return `<div class="scroller pantry" data-scroller="pantry">${INGREDIENTS.map((item) => {
    const n = state.pantry[item.id] || 0;
    const cls = n === 0 ? "is-out" : n === 1 ? "is-low" : "";
    return `<span class="chip ${cls}">${item.emoji} ${esc(item.name)} <b>${n}</b></span>`;
  }).join("")}</div>`;
}

function coachText() {
  if (state.tutorialDone || !state.season) return "";
  const plate = state.season.plate || {};
  if (!plate.treat) return "Look at the bubble, then tap the same treat.";
  if (!plate.topping) return "Now tap the matching topping.";
  return "Tap Serve to hand it over!";
}

function renderHome() {
  const timeUp = seasonTimeUp(state.season);
  const inSeason = !!state.season && !timeUp;
  const lead = timeUp
    ? "Your Selling Season is full. A new unlock is waiting!"
    : inSeason
      ? `Welcome back, ${BAKER}! Your minutes are still saved.`
      : `Hi, ${BAKER}! The bakery is open.`;
  const primary = timeUp
    ? textBtn("claim", "See my unlock", "btn-go")
    : inSeason
      ? textBtn("continue", "Continue Selling Season", "btn-go")
      : textBtn("start", "Start Selling Season", "btn-go");
  const menu = TREATS.map((treat) => {
    const locked = treat.unlockLevel > state.level;
    return `<button type="button" class="choice ${locked ? "is-locked" : ""}" data-act="preview-treat" data-id="${treat.id}">
      ${treatSvg(treat.id, treat.id === "flan" ? "caramel" : "plain", 64)}
      <span class="name">${esc(treat.name)}</span>
      <em>${locked ? `Level ${treat.unlockLevel}` : "Ready"}</em>
    </button>`;
  }).join("");
  return `<section class="screen home" data-screen="home">
    <div class="hero">${bakerySvg(state)}</div>
    <h1>Pastries and more!</h1>
    <p class="tag">Baker ${esc(BAKER)}</p>
    <p class="lead">${esc(lead)}</p>
    <div class="pills">
      <span class="pill">${state.coins} coins</span>
      <span class="pill">Level ${state.level}</span>
      <span class="pill">${esc(badgeName(state.level))}</span>
    </div>
    ${seasonMeter("season-meter-home")}
    ${primary}
    <p class="fine">Each Selling Season is ${esc(formatDuration(SEASON_PLAY_MS))} of baking. Close the game whenever you want. The minutes add up on this iPad.</p>
    <div class="btn-row">
      ${textBtn("shop", "Shop")}
      ${textBtn("recipes", "Recipes")}
    </div>
    ${textBtn("help", "How to play", "btn-quiet")}
    <p class="next">${esc(nextUnlockText(state.level))}</p>
    <div class="scroller" data-scroller="home-menu">${menu}</div>
    <p class="fine">Best season ${state.stats.best} coins · Baked ${state.stats.baked}</p>
  </section>`;
}

function renderPlay() {
  const season = state.season;
  const order = season.order;
  const customer = getCustomer(order.customer);
  const described = describeOrder(order);
  const plate = season.plate || { treat: null, topping: null };
  const line = ui.bubble || described.line;
  const canFill = canMake(state.pantry, order.treat, order.topping, order.qty);
  const coach = coachText();
  const treats = TREATS.map((treat) => {
    const locked = treat.unlockLevel > state.level;
    const on = plate.treat === treat.id;
    return `<button type="button" class="choice ${on ? "is-on" : ""} ${locked ? "is-locked" : ""}" data-act="pick-treat" data-id="${treat.id}" aria-pressed="${on}">
      ${treatSvg(treat.id, "plain", 52)}
      <span class="name">${esc(treat.name)}</span>
      ${locked ? `<em>Lv ${treat.unlockLevel}</em>` : ""}
    </button>`;
  }).join("");
  const toppingSource = plate.treat ? toppingsFor(plate.treat, state.level) : TOPPINGS.filter((top) => top.unlockLevel <= state.level);
  const toppings = toppingSource.map((top) => {
    const on = plate.topping === top.id;
    return `<button type="button" class="choice ${on ? "is-on" : ""}" data-act="pick-topping" data-id="${top.id}" aria-pressed="${on}">
      ${toppingSvg(top.id, 48)}
      <span class="name">${esc(top.name)}</span>
    </button>`;
  }).join("");
  const needs = plate.treat && plate.topping
    ? describeNeeds(totalNeeds(plate.treat, plate.topping, order.qty))
    : "Pick a treat and a topping";
  const missing = plate.treat && plate.topping
    ? missingIngredients(state.pantry, totalNeeds(plate.treat, plate.topping, order.qty))
    : [];
  const needNote = missing.length
    ? `Need ${missing.map((item) => `${item.short} ${item.name.toLowerCase()}`).join(", ")}`
    : needs;
  const special = season.special && season.special === order.treat ? `<em class="tag">Today's special +4</em>` : "";
  const vip = order.vip ? `<em class="tag tag-vip">VIP +5</em>` : "";
  const qty = order.qty === 2 ? `<em class="tag">Batch of 2</em>` : "";
  const timeBanner = ui.timeUp ? `<div class="timeup"><p>The season timer is full!</p><p>Finish this customer, or open your unlock.</p>${textBtn("claim", "See my unlock", "btn-go")}</div>` : "";
  const pause = ui.pause ? `<div class="overlay"><div class="sheet">
      <h2>Paused</h2>
      <p>The season clock is paused. Your minutes stay saved.</p>
      ${textBtn("resume", "Keep baking", "btn-go")}
      ${textBtn("shop", "Shop")}
      ${textBtn("recipes", "Recipes")}
      ${textBtn("help", "How to play")}
      ${textBtn("save-home", "Save and come back later", "btn-quiet")}
    </div></div>` : "";
  return `<section class="screen play" data-screen="play">
    <header class="hud" data-coins="${state.coins}" data-level="${state.level}">
      <button type="button" class="icon-btn" data-act="pause" aria-label="Pause">II</button>
      <div class="hud-stat" aria-label="${state.coins} coins">${state.coins}</div>
      <div class="hud-stat" aria-label="Level ${state.level}">Lv ${state.level}</div>
      <div class="hud-stat" aria-label="${season.earned} coins this season">+${season.earned}</div>
      <button type="button" class="icon-btn" data-act="toggle-sound" aria-label="${state.sound ? "Sound on" : "Sound off"}">${state.sound ? "On" : "Off"}</button>
    </header>
    ${seasonMeter()}
    <div class="play-grid">
      <div class="scene" data-order-treat="${esc(order.treat)}" data-order-topping="${esc(order.topping)}" data-order-qty="${order.qty}">
        ${bakerySvg(state)}
        <div class="actors">
          <div class="customer ${esc(ui.mood)}">${customerSvg(customer, ui.mood)}</div>
          <div class="bubble">
            ${treatSvg(order.treat, order.topping, 72)}
            <div>
              <p>${esc(line)}</p>
              <small>${esc(customer.name)}</small>
              <span class="tags">${qty}${special}${vip}</span>
            </div>
            ${ui.floater ? `<b class="floater">${esc(ui.floater)}</b>` : ""}
          </div>
        </div>
        <div class="patience" aria-label="How long the customer waits"><span data-patience></span></div>
      </div>
      <div class="dock">
        <div class="dock-main">
          ${timeBanner}
          ${coach ? `<p class="coach">${esc(coach)}</p>` : ""}
          <div class="plate-row">
            <div class="plate">${plate.treat ? treatSvg(plate.treat, plate.topping || "plain", 78) : emptyPlateSvg(78)}</div>
            <div>
              <strong>${plate.treat ? esc(getTreat(plate.treat).name) : "Your tray"}</strong>
              <span>${plate.topping ? esc(getTopping(plate.topping).name) : "No topping yet"}</span>
              <span class="${missing.length ? "need" : ""}">${esc(needNote)}</span>
            </div>
          </div>
          <div class="scroller" data-scroller="treats">${treats}</div>
          <div class="scroller" data-scroller="toppings">${toppings}</div>
          ${canFill ? "" : textBtn("let-go", "Let them go kindly", "btn-quiet wide")}
        </div>
        ${pantryHtml()}
        <div class="serve-row">
          ${textBtn("clear", "Clear", "btn-ghost")}
          ${textBtn("serve", "Serve", "btn-go")}
          ${textBtn("shop", "Shop", "btn-ghost")}
        </div>
      </div>
    </div>
    ${pause}
  </section>`;
}

function renderShop() {
  const groups = [
    ["Ingredients", SHOP.filter((item) => item.kind === "ingredient")],
    ["Upgrades", SHOP.filter((item) => item.kind === "upgrade")],
    ["Decorations", SHOP.filter((item) => item.kind === "decor")],
  ];
  const cards = groups.map(([title, items]) => `
    <h3>${title}</h3>
    <div class="shop-grid">${items.map((item) => {
      const owned = (item.kind === "upgrade" && state.upgrades[item.id]) || (item.kind === "decor" && (state.decor[item.id] || (item.freeAt && state.level >= item.freeAt)));
      return `<button type="button" class="shop-card ${owned ? "is-owned" : ""}" data-act="buy" data-id="${item.id}">
        <span class="shop-emoji">${item.emoji}</span>
        <span class="shop-name">${esc(item.name)}</span>
        <span class="shop-desc">${esc(item.desc)}</span>
        <span class="shop-cost">${owned ? "Got it!" : `${item.cost} coins`}</span>
      </button>`;
    }).join("")}</div>`).join("");
  const awnings = unlockedAwnings(state.level).concat(AWNINGS.filter((a) => a.unlockLevel > state.level));
  const awningCards = `<h3>Awnings</h3><div class="shop-grid">${awnings.map((awning) => {
    const locked = awning.unlockLevel > state.level;
    const on = state.awning === awning.id;
    return `<button type="button" class="shop-card ${on ? "is-owned" : ""}" data-act="awning" data-id="${awning.id}">
      <span class="swatch" style="background:linear-gradient(90deg, ${awning.a} 50%, ${awning.b} 50%)"></span>
      <span class="shop-name">${esc(awning.name)}</span>
      <span class="shop-cost">${locked ? `Level ${awning.unlockLevel}` : on ? "On the bakery" : "Use this"}</span>
    </button>`;
  }).join("")}</div>`;
  const banner = ui.timeUp ? `<div class="timeup"><p>The season timer is full!</p>${textBtn("claim", "See my unlock", "btn-go")}</div>` : "";
  return `<section class="screen sub" data-screen="shop">
    <header class="topbar">${textBtn("back", "Back")}<h2>Shop</h2><span class="pill">${state.coins} coins</span></header>
    ${seasonMeter()}
    ${banner}
    ${pantryHtml()}
    ${cards}
    ${awningCards}
  </section>`;
}

function renderRecipes() {
  const blocks = TREATS.map((treat) => {
    const locked = treat.unlockLevel > state.level;
    const tops = treat.toppings.map((id) => getTopping(id)?.name).filter(Boolean);
    return `<article class="recipe ${locked ? "is-locked" : ""}">
      ${treatSvg(treat.id, treat.id === "flan" ? "caramel" : "strawberry", 84)}
      <div>
        <h3>${esc(treat.name)} ${locked ? `<em>Level ${treat.unlockLevel}</em>` : ""}</h3>
        <p>${esc(describeNeeds(treat.needs))}</p>
        <p class="sub">Toppings: ${esc(tops.join(", "))}</p>
        <p class="sub">${treat.price} coins, plus 2 with a topping</p>
      </div>
    </article>`;
  }).join("");
  return `<section class="screen sub" data-screen="recipes">
    <header class="topbar">${textBtn("back", "Back")}<h2>Recipes</h2></header>
    ${blocks}
  </section>`;
}

function renderHelp() {
  const reset = ui.confirmReset
    ? `<div class="sheet inset">${textBtn("reset", "Yes, start over", "btn-go")}${textBtn("cancel-reset", "Keep my bakery")}</div>`
    : textBtn("ask-reset", "Start over", "btn-quiet");
  return `<section class="screen sub" data-screen="help">
    <header class="topbar">${textBtn("back", "Back")}<h2>How to play</h2></header>
    <ol class="steps">
      <li><b>1.</b> Read the customer's bubble. The picture is the order.</li>
      <li><b>2.</b> Tap that treat, tap the topping, then tap Serve.</li>
      <li><b>3.</b> A happy customer pays coins. Ingredients are used only when the order is right.</li>
      <li><b>4.</b> A Selling Season is ${esc(formatDuration(SEASON_PLAY_MS))} of baking and shopping. Leave whenever you want. The minutes are saved, and they add up.</li>
      <li><b>5.</b> When the season timer fills, you unlock something new. The bakery never closes.</li>
    </ol>
    <p class="fine">On an iPhone or iPad, tap Share, then Add to Home Screen. It opens like an app.</p>
    ${textBtn("toggle-sound", state.sound ? "Sound is on" : "Sound is off")}
    <h3>Start over</h3>
    <p class="fine">This clears coins, ingredients, the season timer, and level.</p>
    ${reset}
  </section>`;
}

function renderResults() {
  const result = ui.results || { earned: 0, played: 0, toLevel: state.level, unlocks: [] };
  const pictures = (result.unlocks || []).filter((item) => item.kind === "treat").map((item) => treatSvg(item.id, item.id === "flan" ? "caramel" : "strawberry", 120)).join("");
  const lines = (result.unlocks || []).map((item) => `<li>${esc(item.text)}</li>`).join("");
  const confetti = Array.from({ length: 16 }, (_, i) => `<i style="left:${(i * 6.2) % 100}%; background:${["#ff7aa2", "#ffd166", "#7ddebe", "#8ec8ff", "#c9b6ff"][i % 5]}; animation-delay:${(i % 6) * 0.05}s"></i>`).join("");
  return `<section class="screen results" data-screen="results" data-met="1">
    <div class="confetti" aria-hidden="true">${confetti}</div>
    <p class="tag">Season complete</p>
    <h1>Level ${result.toLevel}!</h1>
    <p class="lead">You played ${esc(formatDuration(result.played || SEASON_PLAY_MS))} and earned ${result.earned} coins.</p>
    <div class="unlock-art">${pictures || bakerySvg(state)}</div>
    <h2>New this season</h2>
    <ul class="unlocks">${lines}</ul>
    ${textBtn("home", "Back to the bakery", "btn-go")}
  </section>`;
}

function render() {
  const prev = document.querySelector(".screen");
  const prevName = prev?.dataset.screen;
  const top = prev?.scrollTop || 0;
  const lefts = {};
  document.querySelectorAll("[data-scroller]").forEach((el) => {
    lefts[el.dataset.scroller] = el.scrollLeft;
  });
  const screen = state.season && ui.screen === "play" ? renderPlay()
    : ui.screen === "shop" ? renderShop()
    : ui.screen === "recipes" ? renderRecipes()
    : ui.screen === "help" ? renderHelp()
    : ui.screen === "results" ? renderResults()
    : renderHome();
  const toastHtml = ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : "";
  app.innerHTML = screen + toastHtml;
  const next = document.querySelector(".screen");
  if (next && next.dataset.screen === prevName) next.scrollTop = top;
  document.querySelectorAll("[data-scroller]").forEach((el) => {
    if (lefts[el.dataset.scroller]) el.scrollLeft = lefts[el.dataset.scroller];
  });
  paintPatience();
  paintClock();
}

app.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-act]");
  if (!btn) return;
  handle(btn.dataset.act, btn.dataset.id || "");
});

document.addEventListener("visibilitychange", () => {
  ui.lastNow = performance.now();
  save(state);
});
window.addEventListener("pagehide", () => save(state));

state = load();
ui.timeUp = seasonTimeUp(state.season);
render();
requestAnimationFrame(frame);
