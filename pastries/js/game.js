/**
 * Pastries and more!
 * Screens: home, play, shop, recipes, help, results.
 * The Selling Season clock lives in rules.js and reads SEASON_PLAY_MS.
 */
import { INGREDIENTS, LOGOS, MUSIC_TRACKS, MUSIC_VOLUMES, SEASON_PLAY_MS, SEASON_START_BONUS, TREATS, DRINKS, TUTORIAL_STEPS, cleanBakerName, BAKER_NAME_LIMIT } from "./data.js";
import {
  badgeName,
  buy,
  closeSeason,
  describeNeeds,
  describeOrder,
  drinkSteps,
  formatDuration,
  getCustomer,
  getDrink,
  getTopping,
  getTreat,
  markLeave,
  missingIngredients,
  newGame,
  nextUnlockText,
  orderNeeds,
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
  applySip,
  SHOP,
  AWNINGS,
  TOPPINGS,
} from "./rules.js";
import { createPlayer } from "./music.js";
import { load, save } from "./state.js";
import { bakerySvg, bookSvg, coinSvg, customerSvg, drinkSvg, emptyPlateSvg, gearSvg, hintHandSvg, noteSvg, shopSvg, sipSvg, toppingSvg, treatSvg } from "./view.js";

const IDLE_MS = 4500;
const WALK_MS = 900;
const player = createPlayer(MUSIC_TRACKS);

const app = document.querySelector("#app");
let state = newGame();
let ui = freshUi();
let timer = 0;
let timerToken = 0;
let saveAccum = 0;
let handKey = "";

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
    toastHtml: false,
    toastId: 0,
    results: null,
    patienceMs: 20000,
    patienceMax: 20000,
    lastNow: 0,
    lastInput: 0,
    tutorial: null,
    idleHint: null,
    musicOpen: false,
    musicLive: false,
    phase: "here",
    freshSip: "",
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

function toast(message, html = false) {
  ui.toast = message;
  ui.toastHtml = html;
  const id = ++ui.toastId;
  render();
  setTimeout(() => {
    if (ui.toastId === id) {
      ui.toast = "";
      ui.toastHtml = false;
      render();
    }
  }, 2200);
}

function blip(freq, dur) {
  player.blip(freq, dur);
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
  if (ui.screen === "play" && state.season && !ui.pause && !ui.busy && ui.phase === "here" && !document.hidden) {
    ui.patienceMs -= dt;
    if (ui.patienceMs <= 0) {
      ui.patienceMs = 0;
      onLeave();
    }
  }
  if (state.tutorialOn && !ui.tutorial && !ui.idleHint && !ui.busy && !ui.pause && !ui.musicOpen && !ui.confirmReset && !document.hidden) {
    if (ui.lastInput && now - ui.lastInput > IDLE_MS) {
      const hint = idleHint();
      if (hint) {
        ui.idleHint = hint;
        render();
      }
    }
  }
  paintPatience();
  paintClock();
  placeHand();
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

function logoMarkup(logo, size) {
  if (logo?.kind === "drink") return drinkSvg(logo.id, size);
  const topping = logo?.id === "flan" ? "caramel" : logo?.id === "cake" ? "strawberry" : "plain";
  return treatSvg(logo?.id || "cupcake", topping, size);
}

function applyTabIcon(logo) {
  const markup = logoMarkup(logo, 180);
  const blob = new Blob([markup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff6ee";
    ctx.fillRect(0, 0, 180, 180);
    ctx.drawImage(image, 18, 18, 144, 144);
    URL.revokeObjectURL(url);
    const png = canvas.toDataURL("image/png");
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.type = "image/png";
    icon.href = png;
  };
  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}

function nameOf() {
  return cleanBakerName(state.bakerName);
}

function stillMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function beginCustomer() {
  if (!state.season?.order) return;
  const customer = getCustomer(state.season.order.customer);
  ui.patienceMax = patienceMaxMs(state, customer);
  ui.patienceMs = ui.patienceMax;
  ui.mood = "neutral";
  ui.bubble = "";
  ui.floater = "";
  ui.phase = stillMotion() ? "here" : "entering";
  ui.busy = ui.phase === "entering";
  player.ding();
  render();
  if (ui.phase !== "entering") return;
  later(() => {
    if (ui.phase !== "entering") return;
    ui.phase = "here";
    ui.busy = false;
    render();
  }, WALK_MS);
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

function finishVisit() {
  ui.busy = false;
  ui.mood = "neutral";
  ui.bubble = "";
  ui.floater = "";
  if (!state.season?.resolved) {
    ui.phase = "here";
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
  save(state);
  beginCustomer();
}

function settle(kind) {
  ui.busy = true;
  ui.phase = "here";
  ui.mood = kind === "sold" ? "happy" : "sad";
  ui.bubble = kind === "sold" ? thanksLine(state.season?.sold || 0) : "Maybe next time!";
  ui.floater = kind === "sold" ? state.season?.lastPay || 0 : "";
  if (kind === "sold") blip(660, 0.08);
  else blip(220, 0.1);
  save(state);
  render();
  later(() => {
    if (stillMotion()) {
      finishVisit();
      return;
    }
    ui.phase = "leaving";
    player.ding();
    render();
    later(() => finishVisit(), WALK_MS);
  }, kind === "sold" ? 650 : 560);
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
  if (out.result === "need-drink") {
    const steps = drinkSteps(state.season.order?.drink, state.season.order?.float);
    const next = steps[(state.season.plate?.sips || []).length];
    toast(next?.hint || "Make their drink!");
    return;
  }
  if (out.result === "need-float") {
    toast("Add marshmallows!");
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
  const teachServe = tutorialStep()?.waitFor === "serve";
  state = { ...out.state, tutorialDone: true };
  if (teachServe) nextTutorial();
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
  if (tutorialStep()?.waitFor === "treat" && id === state.season.order.treat && plate.treat === id) {
    nextTutorial();
    render();
    return;
  }
  const turningOff = plate.treat === id;
  const stillOk = plate.topping && toppingsFor(id, state.level).some((top) => top.id === plate.topping);
  state = setPlate(state, {
    treat: turningOff ? null : id,
    topping: turningOff ? null : (stillOk ? plate.topping : null),
    drink: turningOff ? null : (plate.drink || null),
    float: turningOff ? null : (plate.float || null),
  });
  if (state.season.plate.treat === state.season.order.treat) maybeAdvance("treat");
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
  if (tutorialStep()?.waitFor === "topping" && id === state.season.order.topping && plate.topping === id) {
    nextTutorial();
    render();
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
    drink: plate.drink || null,
    float: plate.float || null,
  });
  if (state.season.plate.treat === state.season.order.treat && state.season.plate.topping === state.season.order.topping) maybeAdvance("topping");
  save(state);
  render();
}

function onSip(id) {
  if (ui.busy || !state.season?.order?.drink) return;
  const out = applySip(state, id);
  if (out.result === "hint") {
    toast(out.hint || "Try the next step!");
    return;
  }
  if (out.result !== "ok" && out.result !== "made") return;
  state = out.state;
  ui.freshSip = id;
  blip(out.result === "made" ? 660 : 520, 0.08);
  if (out.result === "made" && tutorialStep()?.waitFor === "sip") nextTutorial();
  save(state);
  render();
}

function tutorialStep() {
  if (!ui.tutorial) return null;
  return TUTORIAL_STEPS[ui.tutorial.index] || null;
}

function nextTutorial() {
  if (!ui.tutorial) return;
  const next = ui.tutorial.index + 1;
  if (next >= TUTORIAL_STEPS.length) {
    ui.tutorial = null;
    state = { ...state, tutorialSeen: true };
    save(state);
  } else {
    ui.tutorial = { index: next };
  }
  ui.idleHint = null;
  ui.lastInput = performance.now();
  handKey = "";
}

function maybeAdvance(waitFor) {
  if (tutorialStep()?.waitFor === waitFor) nextTutorial();
}

function enterPlay(forceTutorial) {
  if (seasonTimeUp(state.season)) return false;
  let freshSeason = false;
  if (!state.season) {
    state = startSeason(state, Math.random);
    freshSeason = true;
    ui.timeUp = false;
  }
  if (!state.season.order) state = withOrder(state, rollOrder(state, Math.random));
  ui.screen = "play";
  ui.pause = false;
  ui.musicOpen = false;
  ui.idleHint = null;
  state = setPlate(state, { treat: null, topping: null });
  ui.tutorial = state.tutorialOn && (forceTutorial || !state.tutorialSeen) ? { index: 0 } : null;
  ui.lastInput = performance.now();
  handKey = "";
  save(state);
  beginCustomer();
  if (freshSeason) toast(`+${money(SEASON_START_BONUS)} for the new season!`, true);
  return true;
}

function activeHint() {
  if (!state.tutorialOn) return null;
  if (ui.tutorial) {
    const step = tutorialStep();
    if (!step) return null;
    return { target: step.id, text: step.text, cta: step.waitFor ? "" : (step.cta || "Next"), tutorial: true };
  }
  return ui.idleHint;
}

function idleHint() {
  if (ui.screen === "home") {
    if (seasonTimeUp(state.season)) return { target: "claim", text: "Tap for your unlock!" };
    if (state.season) return { target: "continue", text: "Tap to keep baking!" };
    return { target: "start", text: "Tap to start!" };
  }
  if (ui.screen === "results") return { target: "home", text: "Tap to go back!" };
  if (ui.screen === "shop" || ui.screen === "recipes" || ui.screen === "help" || ui.screen === "settings") {
    return { target: "back", text: "Tap Back." };
  }
  if (ui.screen === "play" && state.season && !ui.pause) {
    if (ui.timeUp) return { target: "claim", text: "Tap for your unlock!" };
    const order = state.season.order;
    const plate = state.season.plate || {};
    if (order && missingIngredients(state.pantry, orderNeeds(order)).length) {
      return { target: "shop", text: "Tap Shop to buy." };
    }
    if (!plate.treat) return { target: "treat", text: "Tap this treat." };
    if (!plate.topping) return { target: "topping", text: "Tap this topping." };
    if (order?.drink && plate.drink !== order.drink) {
      const steps = drinkSteps(order.drink, order.float);
      const next = steps[(plate.sips || []).length];
      return { target: "sip", text: next?.hint || "Tap the next step!" };
    }
    return { target: "serve", text: "Tap Serve!" };
  }
  return null;
}

function placeHand() {
  const hand = document.querySelector(".hint-hand");
  if (!hand) return;
  const target = document.querySelector(`[data-hint="${hand.dataset.target}"]`);
  if (!target) {
    hand.hidden = true;
    return;
  }
  hand.hidden = false;
  const key = `${hand.dataset.target}:${ui.tutorial ? ui.tutorial.index : "idle"}`;
  if (key !== handKey) {
    handKey = key;
    const scroller = target.closest(".dock-main");
    if (scroller) {
      const item = target.getBoundingClientRect();
      const frame = scroller.getBoundingClientRect();
      if (item.top < frame.top + 4) scroller.scrollTop -= frame.top - item.top + 8;
      else if (item.bottom > frame.bottom - 4) scroller.scrollTop += item.bottom - frame.bottom + 8;
    }
  }
  const box = target.getBoundingClientRect();
  const appBox = app.getBoundingClientRect();
  const x = Math.max(36, Math.min(appBox.width - 36, box.left + box.width / 2 - appBox.left));
  const point = box.top + box.height * 0.55 - appBox.top;
  const below = point < 130;
  hand.classList.toggle("is-below", below);
  hand.style.left = `${x}px`;
  hand.style.top = `${point}px`;
  const banner = document.querySelector(".hint-banner");
  if (banner) banner.classList.toggle("is-top", box.top > appBox.top + appBox.height * 0.5);
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
  ui.lastInput = performance.now();
  if (ui.idleHint && act !== "tutorial-next" && act !== "tutorial-skip") ui.idleHint = null;
  if (act === "music") {
    ui.musicOpen = !ui.musicOpen;
    ui.pause = false;
    render();
    return;
  }
  if (act === "music-close") {
    ui.musicOpen = false;
    render();
    return;
  }
  if (act === "music-pick") {
    if (id === "off") {
      player.stop();
      state = { ...state, music: "off" };
      ui.musicLive = false;
    } else {
      player.setMuted(false);
      player.setVolume(state.musicVolume || "medium");
      player.start(id);
      state = { ...state, music: id, musicMuted: false };
      ui.musicLive = true;
    }
    save(state);
    render();
    return;
  }
  if (act === "music-volume") {
    state = { ...state, musicVolume: id };
    player.setVolume(id);
    save(state);
    render();
    return;
  }
  if (act === "sfx-toggle") {
    const next = state.sfx === false;
    state = { ...state, sfx: next };
    player.setEffects(next);
    if (next && !state.musicMuted) player.ding();
    save(state);
    render();
    return;
  }
  if (act === "music-mute") {
    const muted = !state.musicMuted;
    state = { ...state, musicMuted: muted };
    player.setMuted(muted);
    if (!muted && state.music && state.music !== "off" && !ui.musicLive) {
      player.setVolume(state.musicVolume || "medium");
      player.start(state.music);
      ui.musicLive = true;
    }
    save(state);
    render();
    return;
  }
  if (act === "tutorial-next") {
    nextTutorial();
    render();
    return;
  }
  if (act === "tutorial-skip") {
    ui.tutorial = null;
    state = { ...state, tutorialSeen: true };
    ui.lastInput = performance.now();
    save(state);
    render();
    return;
  }
  if (act === "howto") {
    if (!state.tutorialOn) {
      if (ui.screen === "help") toast("Turn Tutorial on in Settings to see the taps.");
      else openSub("help");
      return;
    }
    if (!enterPlay(true)) openSub("help");
    return;
  }
  if (act === "pick-logo") {
    const [kind, logoId] = String(id).split(":");
    if (!LOGOS.some((item) => item.kind === kind && item.id === logoId)) return;
    state = { ...state, logo: { kind, id: logoId } };
    save(state);
    applyTabIcon(state.logo);
    render();
    return;
  }
  if (act === "tutorial-on") {
    if (state.tutorialOn) return;
    state = { ...state, tutorialOn: true, tutorialSeen: false };
    ui.idleHint = null;
    ui.tutorial = null;
    save(state);
    if (ui.returnTo === "play" && state.season && !seasonTimeUp(state.season)) {
      state = setPlate(state, { treat: null, topping: null, drink: null, float: null, sips: [] });
      ui.screen = "play";
      ui.pause = false;
      ui.tutorial = { index: 0 };
      ui.lastInput = performance.now();
      handKey = "";
      save(state);
    }
    render();
    return;
  }
  if (act === "tutorial-off") {
    if (!state.tutorialOn && !ui.tutorial && !ui.idleHint) return;
    state = { ...state, tutorialOn: false };
    ui.tutorial = null;
    ui.idleHint = null;
    save(state);
    render();
    return;
  }
  if (act === "start" && !state.season) {
    enterPlay(false);
    return;
  }
  if (act === "continue" && state.season && !seasonTimeUp(state.season)) {
    enterPlay(false);
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
  if (act === "shop" || act === "recipes" || act === "help" || act === "settings") {
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
  if (act === "sip") {
    onSip(id);
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
    if (!result.ok && result.reason === "coins") toast(`You need ${result.need} more ${coinSvg(18)}`, true);
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
  if (act === "save-name") {
    const input = document.querySelector("#baker-name");
    state = { ...state, bakerName: cleanBakerName(input ? input.value : state.bakerName) };
    save(state);
    toast(`Baker ${nameOf()}!`);
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
    player.stop();
    state = newGame();
    ui = freshUi();
    ui.lastInput = performance.now();
    save(state);
    render();
  }
}

function textBtn(act, label, cls = "", id = "", hint = "") {
  const idAttr = id ? ` data-id="${esc(id)}"` : "";
  const hintAttr = hint ? ` data-hint="${esc(hint)}"` : "";
  const next = hint && activeHint()?.target === hint ? " is-next" : "";
  const icons = { shop: shopSvg, recipes: bookSvg, settings: gearSvg, music: noteSvg };
  const draw = icons[act];
  const inner = draw
    ? `<span class="btn-with-icon">${draw(22)}<span>${esc(label)}</span></span>`
    : esc(label);
  return `<button type="button" class="btn ${cls}${next}" data-act="${esc(act)}"${idAttr}${hintAttr}>${inner}</button>`;
}

function money(amount, size = 18) {
  return `<span class="money" aria-label="${amount}">${coinSvg(size)}<b>${amount}</b></span>`;
}

function hintBox() {
  const hint = activeHint();
  if (!hint) return "";
  const showCoin = hint.target === "serve" || hint.target === "clock";
  const cta = hint.cta ? `<button type="button" class="btn btn-go hint-next" data-act="tutorial-next">${esc(hint.cta)}</button>` : "";
  const skip = hint.tutorial ? `<button type="button" class="btn btn-quiet hint-skip" data-act="tutorial-skip">Skip</button>` : "";
  const actions = cta || skip ? `<div class="hint-actions">${cta}${skip}</div>` : "";
  return `<div class="hint-banner"><div class="hint-label"><p>${esc(hint.text)}</p>${showCoin ? coinSvg(22) : ""}${actions}</div></div>
    <div class="hint-hand" data-target="${esc(hint.target)}">${hintHandSvg()}</div>`;
}

function musicSheet() {
  if (!ui.musicOpen) return "";
  const songs = [{ id: "off", name: "Off", feel: "Quiet" }, ...MUSIC_TRACKS].map((track) => {
    const on = state.music === track.id;
    const waiting = on && track.id !== "off" && !ui.musicLive;
    return `<button type="button" class="btn song ${on ? "is-on" : ""}" data-act="music-pick" data-id="${track.id}">
      <span>${esc(track.name)}</span>
      <small>${esc(waiting ? "Tap to play" : track.feel)}</small>
    </button>`;
  }).join("");
  const volumes = MUSIC_VOLUMES.map((item) =>
    `<button type="button" class="btn ${state.musicVolume === item.id ? "is-on" : ""}" data-act="music-volume" data-id="${item.id}">${esc(item.label)}</button>`
  ).join("");
  return `<div class="overlay"><div class="sheet">
    <h2>Music</h2>
    <p>Pick a song. It stays quiet until you tap one.</p>
    <div class="song-list">${songs}</div>
    <div class="btn-row">${volumes}</div>
    ${textBtn("music-mute", state.musicMuted ? "Sound is muted" : "Mute")}
    ${textBtn("sfx-toggle", state.sfx === false ? "Effects are off" : "Effects are on")}
    ${textBtn("music-close", "Close", "btn-quiet")}
  </div></div>`;
}

function seasonMeter(extraClass = "") {
  const clock = seasonClock(state.season);
  const hinting = activeHint()?.target === "clock" ? " is-next" : "";
  return `<div class="season-meter ${extraClass}${clock.done ? " is-full" : ""}${hinting}" data-season-meter data-hint="clock" data-played="${Math.round(clock.played)}" data-total="${clock.total}" role="progressbar" aria-valuemin="0" aria-valuemax="${clock.total}" aria-valuenow="${Math.round(clock.played)}" aria-label="Selling Season progress" aria-valuetext="${esc(clock.label)}">
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

function renderHome() {
  const timeUp = seasonTimeUp(state.season);
  const inSeason = !!state.season && !timeUp;
  const lead = timeUp
    ? "Your Selling Season is full. A new unlock is waiting!"
    : inSeason
      ? `Welcome back, ${nameOf()}! Your minutes are still saved.`
      : `Hi, ${nameOf()}! The bakery is open.`;
  const primary = timeUp
    ? textBtn("claim", "See my unlock", "btn-go", "", "claim")
    : inSeason
      ? textBtn("continue", "Continue Selling Season", "btn-go", "", "continue")
      : textBtn("start", "Start Selling Season", "btn-go", "", "start");
  const menu = TREATS.map((treat) => {
    const locked = treat.unlockLevel > state.level;
    return `<button type="button" class="choice ${locked ? "is-locked" : ""}" data-act="preview-treat" data-id="${treat.id}">
      ${treatSvg(treat.id, treat.id === "flan" ? "caramel" : "plain", 64)}
      <span class="name">${esc(treat.name)}</span>
      <em>${locked ? `Level ${treat.unlockLevel}` : "Ready"}</em>
    </button>`;
  }).join("");
  return `<section class="screen home" data-screen="home">
    <div class="hero">
      ${bakerySvg(state)}
      <div class="logo-badge" data-logo="${esc(state.logo?.kind || "treat")}:${esc(state.logo?.id || "cupcake")}">${logoMarkup(state.logo, 112)}</div>
    </div>
    <h1>Pastries and more!</h1>
    <p class="tag" data-baker-name>Baker ${esc(nameOf())}</p>
    <p class="lead">${esc(lead)}</p>
    <div class="pills">
      <span class="pill">${money(state.coins)}</span>
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
    <div class="btn-row">
      ${textBtn("howto", "How to play")}
      ${textBtn("settings", "Settings")}
      ${textBtn("music", "Music")}
    </div>
    <p class="next">${esc(nextUnlockText(state.level))}</p>
    <div class="scroller" data-scroller="home-menu">${menu}</div>
    <p class="fine">Best season ${money(state.stats.best)} · Baked ${state.stats.baked}</p>
  </section>`;
}

function renderPlay() {
  const season = state.season;
  const order = season.order;
  const customer = getCustomer(order.customer);
  const described = describeOrder(order);
  const plate = season.plate || { treat: null, topping: null };
  const line = ui.bubble || described.line;
  const canFill = missingIngredients(state.pantry, orderNeeds(order)).length === 0;
  const hint = activeHint();
  const treats = TREATS.map((treat) => {
    const locked = treat.unlockLevel > state.level;
    const on = plate.treat === treat.id;
    const guide = treat.id === order.treat;
    const next = guide && hint?.target === "treat" ? " is-next" : "";
    return `<button type="button" class="choice ${on ? "is-on" : ""} ${locked ? "is-locked" : ""}${next}" data-act="pick-treat" data-id="${treat.id}" ${guide ? 'data-hint="treat"' : ""} aria-pressed="${on}">
      ${treatSvg(treat.id, "plain", 52)}
      <span class="name">${esc(treat.name)}</span>
      ${locked ? `<em>Lv ${treat.unlockLevel}</em>` : ""}
    </button>`;
  }).join("");
  const toppingSource = plate.treat ? toppingsFor(plate.treat, state.level) : TOPPINGS.filter((top) => top.unlockLevel <= state.level);
  const toppings = toppingSource.map((top) => {
    const on = plate.topping === top.id;
    const guide = top.id === order.topping;
    const next = guide && hint?.target === "topping" ? " is-next" : "";
    return `<button type="button" class="choice ${on ? "is-on" : ""}${next}" data-act="pick-topping" data-id="${top.id}" ${guide ? 'data-hint="topping"' : ""} aria-pressed="${on}">
      ${toppingSvg(top.id, 48)}
      <span class="name">${esc(top.name)}</span>
    </button>`;
  }).join("");
  const steps = order.drink ? drinkSteps(order.drink, order.float) : [];
  const doneSips = plate.sips || [];
  const nextSip = steps[doneSips.length];
  const sipButtons = steps.map((step, index) => {
    const done = index < doneSips.length;
    const current = step.id === nextSip?.id;
    const fresh = ui.freshSip === step.id ? " is-fresh" : "";
    return `<button type="button" class="btn sip-step ${done ? "is-done" : ""}${current && hint?.target === "sip" ? " is-next" : ""}${fresh}" data-act="sip" data-id="${step.id}" ${current ? 'data-hint="sip"' : ""} aria-pressed="${done}">
      ${sipSvg(step.id, 56)}
      <span class="name">${esc(step.name)}</span>
    </button>`;
  }).join("");
  const drinkReady = !order.drink || plate.drink === order.drink;
  const needs = plate.treat && plate.topping && drinkReady
    ? describeNeeds(totalNeeds(plate.treat, plate.topping, order.qty, plate.drink, plate.float))
    : (plate.treat && plate.topping && order.drink ? (nextSip?.hint || "Make their drink") : "Pick a treat and a topping");
  const missing = plate.treat && plate.topping && drinkReady
    ? missingIngredients(state.pantry, totalNeeds(plate.treat, plate.topping, order.qty, plate.drink, plate.float))
    : [];
  const needNote = missing.length
    ? `Need ${missing.map((item) => `${item.short} ${item.name.toLowerCase()}`).join(", ")}`
    : needs;
  const special = season.special && season.special === order.treat ? `<em class="tag">Today's special ${money(4, 16)}</em>` : "";
  const vip = order.vip ? `<em class="tag tag-vip">VIP ${money(5, 16)}</em>` : "";
  const qty = order.qty === 2 ? `<em class="tag">Batch of 2</em>` : "";
  const timeBanner = ui.timeUp ? `<div class="timeup"><p>The season timer is full!</p><p>Finish this customer, or open your unlock.</p>${textBtn("claim", "See my unlock", "btn-go")}</div>` : "";
  const pause = ui.pause ? `<div class="overlay"><div class="sheet">
      <h2>Paused</h2>
      <p>The season clock is paused. Your minutes stay saved.</p>
      ${textBtn("resume", "Keep baking", "btn-go")}
      ${textBtn("shop", "Shop")}
      ${textBtn("recipes", "Recipes")}
      ${textBtn("howto", "How to play")}
      ${textBtn("settings", "Settings")}
      ${textBtn("help", "Tips")}
      ${textBtn("save-home", "Save and come back later", "btn-quiet")}
    </div></div>` : "";
  return `<section class="screen play" data-screen="play">
    <header class="hud" data-coins="${state.coins}" data-level="${state.level}" data-music-live="${ui.musicLive ? "1" : "0"}">
      <button type="button" class="icon-btn" data-act="pause" aria-label="Pause">II</button>
      <div class="hud-stat" data-hint="coins">${money(state.coins, 16)}</div>
      <div class="hud-stat" aria-label="Level ${state.level}">Lv ${state.level}</div>
      <div class="hud-stat">${money(season.earned, 16)}</div>
      <button type="button" class="icon-btn" data-act="music" aria-label="Music">♪</button>
    </header>
    ${seasonMeter()}
    <div class="play-grid">
      <div class="scene" data-order-treat="${esc(order.treat)}" data-order-topping="${esc(order.topping)}" data-order-drink="${esc(order.drink || "")}" data-order-float="${esc(order.float || "")}" data-order-qty="${order.qty}">
        ${bakerySvg(state)}
        <div class="bakery-door ${ui.phase === "entering" || ui.phase === "leaving" ? "is-open" : ""}" aria-hidden="true">
          <div class="door-frame"><div class="door-slab"><span class="door-glass"></span><span class="door-knob"></span></div></div>
        </div>
        <div class="actors">
          <div class="customer ${esc(ui.phase || "here")} ${ui.phase === "here" ? esc(ui.mood) : ""}" data-phase="${esc(ui.phase || "here")}">${customerSvg(customer, ui.mood)}</div>
          <div class="bubble">
            <div class="order-art ${order.drink ? "has-drink" : ""} ${hint?.target === "order" ? "is-next" : ""}" data-hint="order">
              ${treatSvg(order.treat, order.topping, 104)}
              ${order.drink ? drinkSvg(order.drink, 88, order.float) : ""}
            </div>
            <div>
              <p>${esc(line)}</p>
              <small>${esc(customer.name)}</small>
              <span class="tags">${qty}${special}${vip}</span>
            </div>
            ${ui.floater !== "" && ui.floater != null && tutorialStep()?.id !== "clock" ? `<b class="floater">${money(ui.floater, 16)}</b>` : ""}
          </div>
        </div>
        <div class="patience" aria-label="How long the customer waits"><span data-patience></span></div>
      </div>
      <div class="dock">
        <div class="dock-main">
          ${timeBanner}
          <div class="plate-row">
            <div class="plate">
              ${plate.treat ? treatSvg(plate.treat, plate.topping || "plain", 78) : emptyPlateSvg(78)}
              ${plate.drink ? `<span class="sip">${drinkSvg(plate.drink, 56, plate.float)}</span>` : ""}
            </div>
            <div>
              <strong>${plate.treat ? esc(getTreat(plate.treat).name) : "Your tray"}</strong>
              <span>${plate.topping ? esc(getTopping(plate.topping).name) : "No topping yet"}</span>
              ${plate.drink ? `<span>${esc(getDrink(plate.drink).name)}</span>` : ""}
              <span class="${missing.length ? "need" : ""}">${esc(needNote)}</span>
            </div>
          </div>
          <div class="scroller" data-scroller="treats">${treats}</div>
          <div class="scroller" data-scroller="toppings">${toppings}</div>
          ${canFill ? "" : textBtn("let-go", "Let them go kindly", "btn-quiet wide")}
        </div>
        ${steps.length ? `<p class="row-label">Make the ${esc(getDrink(order.drink)?.name || "drink")}</p><div class="sip-row" data-scroller="sips">${sipButtons}</div>` : ""}
        ${pantryHtml()}
        <div class="serve-row">
          ${ui.tutorial ? "" : textBtn("clear", "Clear", "btn-ghost")}
          ${textBtn("serve", "Serve", "btn-go", "", "serve")}
          ${textBtn("shop", "Shop", "btn-ghost", "", "shop")}
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
        <span class="shop-cost">${owned ? "Got it!" : money(item.cost)}</span>
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
    <header class="topbar">${textBtn("back", "Back", "", "", "back")}<h2>Shop</h2><span class="pill">${money(state.coins)}</span></header>
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
        <p class="sub">${money(treat.price)} plus ${money(2)} with a topping</p>
      </div>
    </article>`;
  }).join("");
  const drinkBlocks = DRINKS.map((drink) => {
    const locked = drink.unlockLevel > state.level;
    const needs = describeNeeds(drink.needs);
    return `<article class="recipe ${locked ? "is-locked" : ""}">
      ${drinkSvg(drink.id, 84)}
      <div>
        <h3>${esc(drink.name)} ${locked ? `<em>Level ${drink.unlockLevel}</em>` : ""}</h3>
        <p>${esc(needs || "Ready to pour")}</p>
        <p class="sub">${esc(drinkSteps(drink.id).map((step) => step.name).join(" → "))}</p>
        <p class="sub">${money(drink.price)}</p>
      </div>
    </article>`;
  }).join("");
  return `<section class="screen sub" data-screen="recipes">
    <header class="topbar">${textBtn("back", "Back", "", "", "back")}<h2>Recipes</h2></header>
    ${blocks}
    <h2>Drinks</h2>
    ${drinkBlocks}
  </section>`;
}

function renderSettings() {
  return `<section class="screen sub" data-screen="settings">
    <header class="topbar">${textBtn("back", "Back", "", "", "back")}<h2>Settings</h2></header>
    <label class="name-label" for="baker-name">Baker name</label>
    <input id="baker-name" class="name-field" maxlength="${BAKER_NAME_LIMIT}" autocomplete="off" enterkeyhint="done" value="${esc(state.bakerName && String(state.bakerName).trim() ? nameOf() : "")}" placeholder="Madison">
    <p class="fine">Up to ${BAKER_NAME_LIMIT} letters. This name is on your bakery.</p>
    ${textBtn("save-name", "Save name", "btn-go")}
    <p class="name-label">Tutorial</p>
    <p class="fine">On shows the tapping tips. Off lets you bake right away.</p>
    <div class="btn-row">
      ${textBtn("tutorial-on", "On", state.tutorialOn ? "btn-go" : "")}
      ${textBtn("tutorial-off", "Off", state.tutorialOn ? "" : "btn-go")}
    </div>
    <p class="name-label">Logo</p>
    <p class="fine">This picture sits on the home screen.</p>
    <div class="logo-grid">${LOGOS.map((item) => {
      const on = state.logo?.kind === item.kind && state.logo?.id === item.id;
      return `<button type="button" class="choice ${on ? "is-on" : ""}" data-act="pick-logo" data-id="${item.kind}:${item.id}" aria-pressed="${on}">
        ${item.kind === "drink" ? drinkSvg(item.id, 56) : treatSvg(item.id, item.id === "flan" ? "caramel" : "plain", 56)}
        <span class="name">${esc(item.name)}</span>
      </button>`;
    }).join("")}</div>
  </section>`;
}

function renderHelp() {
  const reset = ui.confirmReset
    ? `<div class="sheet inset">${textBtn("reset", "Yes, start over", "btn-go")}${textBtn("cancel-reset", "Keep my bakery")}</div>`
    : textBtn("ask-reset", "Start over", "btn-quiet");
  return `<section class="screen sub" data-screen="help">
    <header class="topbar">${textBtn("back", "Back", "", "", "back")}<h2>How to play</h2></header>
    <ol class="steps">
      <li><b>1.</b> Read the customer's bubble. The picture is the order.</li>
      <li><b>2.</b> Tap that treat, then the topping. If they want a drink, tap each step in order. A wrong tap just shows what is next. Then tap Serve.</li>
      <li><b>3.</b> A happy customer pays ${coinSvg(22)} Ingredients stay if the order is wrong.</li>
      <li><b>4.</b> A Selling Season is ${esc(formatDuration(SEASON_PLAY_MS))} of baking and shopping. Leave whenever you want. The minutes are saved, and they add up.</li>
      <li><b>5.</b> When the season timer fills, you unlock something new. The bakery never closes.</li>
    </ol>
    ${textBtn("howto", "Show me how", "btn-go")}
    <p class="fine">On an iPhone or iPad, tap Share, then Add to Home Screen.</p>
    <h3>Start over</h3>
    <p class="fine">This clears your ${coinSvg(18)}, ingredients, the season timer, and level.</p>
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
    <p class="lead">You played ${esc(formatDuration(result.played || SEASON_PLAY_MS))} and earned ${money(result.earned)}.</p>
    <div class="unlock-art">${pictures || bakerySvg(state)}</div>
    <h2>New this season</h2>
    <ul class="unlocks">${lines}</ul>
    ${textBtn("home", "Back to the bakery", "btn-go", "", "home")}
  </section>`;
}

function render() {
  if (tutorialStep()?.waitFor === "sip" && state.season?.order?.drink && state.season.plate?.drink === state.season.order.drink) {
    nextTutorial();
  }
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
    : ui.screen === "settings" ? renderSettings()
    : ui.screen === "help" ? renderHelp()
    : ui.screen === "results" ? renderResults()
    : renderHome();
  const toastHtml = ui.toast ? `<div class="toast" role="status">${ui.toastHtml ? ui.toast : esc(ui.toast)}</div>` : "";
  app.innerHTML = screen + hintBox() + musicSheet() + toastHtml;
  const next = document.querySelector(".screen");
  if (next && next.dataset.screen === prevName) next.scrollTop = top;
  document.querySelectorAll("[data-scroller]").forEach((el) => {
    if (lefts[el.dataset.scroller]) el.scrollLeft = lefts[el.dataset.scroller];
  });
  paintPatience();
  paintClock();
  placeHand();
}

function unlockAudio(event) {
  const btn = event.target?.closest?.("[data-act]");
  const act = btn?.dataset.act || "";
  const id = btn?.dataset.id || "";
  if (act === "music-pick" && id && id !== "off") {
    player.setMuted(false);
    player.setVolume(state.musicVolume || "medium");
    player.start(id);
    return;
  }
  if (act === "music-mute" && state.musicMuted && state.music && state.music !== "off") {
    player.setMuted(false);
    player.setVolume(state.musicVolume || "medium");
    if (ui.musicLive) player.resumeIfWanted();
    else player.start(state.music);
    return;
  }
  if (ui.musicLive && state.music && state.music !== "off" && !state.musicMuted) player.resumeIfWanted();
}

app.addEventListener("pointerdown", (event) => {
  ui.lastInput = performance.now();
  unlockAudio(event);
  if (!ui.idleHint || event.target.closest(".hint-hand")) return;
  ui.idleHint = null;
  document.querySelector(".hint-hand")?.remove();
  document.querySelectorAll(".is-next").forEach((el) => el.classList.remove("is-next"));
});
document.addEventListener("touchend", unlockAudio, { passive: true });

app.addEventListener("input", (event) => {
  if (event.target.id !== "baker-name") return;
  state = { ...state, bakerName: String(event.target.value || "").slice(0, BAKER_NAME_LIMIT) };
  save(state);
});

app.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-act]");
  if (!btn) return;
  handle(btn.dataset.act, btn.dataset.id || "");
});

function wakeMusic() {
  ui.lastNow = performance.now();
  if (ui.musicLive && state.music && state.music !== "off" && !state.musicMuted) player.resumeIfWanted();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    player.prepareForBackground();
    save(state);
  } else wakeMusic();
});
window.addEventListener("pageshow", wakeMusic);
window.addEventListener("focus", wakeMusic);
window.addEventListener("pagehide", () => save(state));

state = load();
applyTabIcon(state.logo);
ui.timeUp = seasonTimeUp(state.season);
ui.lastInput = performance.now();
player.setMuted(state.musicMuted);
player.setVolume(state.musicVolume || "medium");
player.setEffects(state.sfx !== false);
render();
requestAnimationFrame(frame);
