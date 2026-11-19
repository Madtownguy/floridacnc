/**
 * Pure game rules. No DOM and no localStorage, so seasons, prices,
 * and unlocks can be tested and tweaked in one place.
 */
import {
  AWNINGS,
  BADGES,
  BAKERY_GROWTH,
  cleanBakerName,
  CUSTOMERS,
  COCOA_MARSHMALLOW_CHANCE,
  DRINK_ORDER_CHANCE,
  DRINK_STEPS,
  DRINKS,
  FEATURES,
  INGREDIENTS,
  LOGOS,
  MUSIC_TRACKS,
  RIBBONS,
  PARTY_EVENTS,
  PARTY_FROSTING,
  PARTY_TOPPINGS,
  SEASON_PLAY_MS,
  SEASON_START_BONUS,
  SHOP,
  STICKERS,
  THANKS,
  TOPPINGS,
  TREATS,
} from "./data.js";

export { cleanBakerName };

export function newGame() {
  return {
    v: 1,
    coins: 18,
    level: 1,
    awning: "pink",
    sound: false,
    music: "off",
    musicMuted: false,
    musicVolume: "medium",
    sfx: true,
    tutorialSeen: false,
    tutorialOn: true,
    bakerName: "Madison",
    tutorialDone: false,
    logo: { kind: "treat", id: "cupcake" },
    pantry: {
      flour: 8,
      sugar: 8,
      butter: 6,
      eggs: 3,
      milk: 3,
      fruit: 5,
      chocolate: 5,
      sprinkles: 4,
      matcha: 4,
    },
    upgrades: { cozyOven: false, tipJar: false, secondChance: false },
    decor: {},
    stats: { customers: 0, baked: 0, seasons: 0, best: 0 },
    season: null,
    mail: [],
    seenVersion: "",
  };
}

export function normalize(data) {
  const base = newGame();
  if (!data || typeof data !== "object") return base;
  let season = data.season || null;
  if (season) {
    const order = season.order;
    const knownTreat = order && TREATS.some((t) => t.id === order.treat);
    const knownTop = order && TOPPINGS.some((t) => t.id === order.topping);
    const knownCust = order && CUSTOMERS.some((c) => c.id === order.customer);
    if (!knownTreat || !knownTop || !knownCust) season = null;
    else {
      const special = TREATS.some((t) => t.id === season.special) ? season.special : null;
      const resolved = season.resolved === "sold" || season.resolved === "leave" ? season.resolved : null;
      season = {
        playedMs: clampInt(season.playedMs, 0, 24 * 60 * 60 * 1000, 0),
        limitMs: migratedLimit(season),
        earned: clampInt(season.earned, 0, 999999, 0),
        special,
        sold: clampInt(season.sold, 0, 999999, 0),
        missed: clampInt(season.missed, 0, 999999, 0),
        usedSecondChance: !!season.usedSecondChance,
        resolved,
        lastPay: clampInt(season.lastPay, 0, 999999, 0),
        bonusPaid: season.bonusPaid !== false,
        ...(() => {
          const orderDrink = DRINKS.some((d) => d.id === order.drink) ? order.drink : null;
          const orderFloat = keptFloat(orderDrink, order.float);
          const plateDrink = DRINKS.some((d) => d.id === season.plate?.drink) ? season.plate.drink : null;
          const plateFloat = keptFloat(plateDrink, season.plate?.float);
          const sips = cleanSips(
            { drink: orderDrink, float: orderFloat },
            { drink: plateDrink, float: plateFloat, sips: season.plate?.sips },
          );
          const required = requiredDrinkSteps(orderDrink, orderFloat);
          const made = required.length > 0 && required.every((step, index) => sips[index] === step.id);
          return {
            plate: {
              treat: TREATS.some((t) => t.id === season.plate?.treat) ? season.plate.treat : null,
              topping: TOPPINGS.some((t) => t.id === season.plate?.topping) ? season.plate.topping : null,
              drink: made ? orderDrink : null,
              float: made ? keptFloat(orderDrink, sips.includes("matcha-milk") ? "milk" : orderFloat) : null,
              sips,
            },
            order: {
              qty: order.qty === 2 ? 2 : 1,
              vip: !!order.vip,
              treat: order.treat,
              topping: order.topping,
              customer: order.customer,
              drink: orderDrink,
              float: orderFloat,
            },
          };
        })(),
      };
    }
  }
  const awning = AWNINGS.some((a) => a.id === data.awning) ? data.awning : "pink";
  return {
    ...base,
    ...data,
    v: 1,
    coins: clampInt(data.coins, 0, 999999, base.coins),
    level: clampInt(data.level, 1, 9999, 1),
    awning,
    sound: !!data.sound,
    music: validMusic(data.music),
    musicMuted: !!data.musicMuted,
    musicVolume: ["soft", "medium", "loud"].includes(data.musicVolume) ? data.musicVolume : "medium",
    sfx: data.sfx !== false,
    tutorialSeen: !!data.tutorialSeen,
    tutorialOn: data.tutorialOn !== false,
    bakerName: cleanBakerName(data.bakerName),
    tutorialDone: !!data.tutorialDone,
    logo: validLogo(data.logo),
    seenVersion: cleanSeenVersion(data.seenVersion),
    mail: normalizeMail(data.mail, { level: clampInt(data.level, 1, 9999, 1) }),
    pantry: { ...base.pantry, ...(data.pantry || {}) },
    upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
    decor: { ...(data.decor || {}) },
    stats: { ...base.stats, ...(data.stats || {}) },
    season,
  };
}

function cleanSeenVersion(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 && text.length <= 40 ? text : "";
}

function validLogo(logo) {
  const match = LOGOS.find((item) => item.kind === logo?.kind && item.id === logo?.id);
  return match ? { kind: match.kind, id: match.id } : { kind: "treat", id: "cupcake" };
}

function validMusic(id) {
  if (id === "off") return "off";
  if (MUSIC_TRACKS.some((track) => track.id === id)) return id;
  return "off";
}

function migratedLimit(season) {
  const played = clampInt(season?.playedMs, 0, 24 * 60 * 60 * 1000, 0);
  const saved = Number(season?.limitMs);
  const previous = 25 * 60 * 1000;
  const end = Number.isFinite(saved) && saved > 0 ? saved : previous;
  const remaining = Math.max(0, end - played);
  return played + Math.min(remaining, SEASON_PLAY_MS);
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function getTreat(id) {
  return TREATS.find((t) => t.id === id) || null;
}

export function getTopping(id) {
  return TOPPINGS.find((t) => t.id === id) || null;
}

export function getDrink(id) {
  return DRINKS.find((d) => d.id === id) || null;
}

export function drinkSteps(drinkId, floatId) {
  const steps = DRINK_STEPS[drinkId] || [];
  return steps.filter((step) => !step.when || step.when === floatId);
}

export function requiredDrinkSteps(drinkId, floatId) {
  return drinkSteps(drinkId, floatId).filter((step) => step.optional !== "milk" || floatId === "milk");
}

export function keptFloat(drinkId, floatId) {
  if (drinkId === "hot-chocolate" && floatId === "marshmallow") return "marshmallow";
  if (drinkId === "matcha" && floatId === "milk") return "milk";
  return null;
}

function cleanSips(order, plate) {
  const steps = drinkSteps(order?.drink, order?.float);
  const ids = steps.map((step) => step.id);
  const raw = Array.isArray(plate?.sips) ? plate.sips : [];
  const sips = [];
  for (let i = 0; i < ids.length; i += 1) {
    if (raw[i] === ids[i]) sips.push(ids[i]);
    else break;
  }
  const required = requiredDrinkSteps(order?.drink, order?.float).map((step) => step.id);
  const finished = plate?.drink && plate.drink === order?.drink && keptFloat(order?.drink, plate?.float) === keptFloat(order?.drink, order?.float);
  if (finished && required.length) return required;
  return sips;
}

export function unlockedDrinks(level) {
  return DRINKS.filter((drink) => drink.unlockLevel <= level);
}

export function getCustomer(id) {
  return CUSTOMERS.find((c) => c.id === id) || CUSTOMERS[0];
}

export function getShopItem(id) {
  return SHOP.find((item) => item.id === id) || null;
}

export function ingredientName(id) {
  return INGREDIENTS.find((item) => item.id === id)?.name || id;
}

export function unlockedTreats(level) {
  return TREATS.filter((t) => t.unlockLevel <= level);
}

export function unlockedCustomers(level) {
  return CUSTOMERS.filter((c) => c.unlockLevel <= level);
}

export function toppingsFor(treatId, level) {
  const treat = getTreat(treatId);
  if (!treat) return [];
  return TOPPINGS.filter((t) => t.unlockLevel <= level && treat.toppings.includes(t.id));
}

export function formatDuration(ms) {
  const sec = Math.max(0, Math.round(Number(ms) / 1000));
  if (sec % 3600 === 0 && sec >= 3600) {
    const hours = sec / 3600;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (sec >= 60 && sec % 60 === 0) {
    const mins = sec / 60;
    return mins === 1 ? "1 minute" : `${mins} minutes`;
  }
  if (sec >= 60) {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins} min ${rem} sec`;
  }
  return sec === 1 ? "1 second" : `${sec} seconds`;
}

/** Friendly clock text. The length always comes from SEASON_PLAY_MS. */
export function seasonLimit(season) {
  const saved = Number(season?.limitMs);
  if (Number.isFinite(saved) && saved > 0) return saved;
  return SEASON_PLAY_MS;
}

export function clockLabel(playedMs, total = SEASON_PLAY_MS) {
  const played = Math.max(0, playedMs || 0);
  const left = Math.max(0, total - played);
  if (left <= 0) return "Time for a new unlock!";
  if (left < 2 * 60 * 1000) {
    const sec = Math.ceil(left / 1000);
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    const bit = mins > 0 ? `${mins} min ${rem} sec` : `${rem} sec`;
    return `${bit} until your unlock`;
  }
  const minsLeft = Math.ceil(left / 60000);
  if (played < 1000) {
    const phrase = formatDuration(total)
      .replace(/ minutes$/, "-minute")
      .replace(/ minute$/, "-minute")
      .replace(/ hours$/, "-hour")
      .replace(/ hour$/, "-hour");
    return `${phrase} season · ${minsLeft} min to go`;
  }
  return `${minsLeft} min until your next unlock`;
}

export function seasonClock(season, total = seasonLimit(season)) {
  const playedRaw = Math.max(0, season?.playedMs || 0);
  const played = Math.min(total, playedRaw);
  const left = Math.max(0, total - played);
  const ratio = total <= 0 ? 1 : played / total;
  return {
    played,
    total,
    left,
    ratio,
    // A few saved seconds should still show on the bar.
    visualRatio: played <= 0 ? 0 : Math.max(ratio, 0.03),
    done: !!season && playedRaw >= total,
    label: clockLabel(playedRaw, total),
  };
}

export function seasonTimeUp(season, total = seasonLimit(season)) {
  return !!season && (season.playedMs || 0) >= total;
}

/**
 * Add active play time. dt is milliseconds the page was actually open
 * on the baking or shop screen. Closing the page does not add the gap.
 */
export function addPlaytime(state, dtMs, total = seasonLimit(state.season)) {
  if (!state.season) return { state, justFinished: false, timeUp: false };
  const prev = state.season.playedMs || 0;
  const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
  const playedMs = Math.min(total, prev + dt);
  const timeUp = playedMs >= total;
  const justFinished = prev < total && timeUp;
  if (playedMs === prev) return { state, justFinished: false, timeUp };
  return {
    state: { ...state, season: { ...state.season, playedMs } },
    justFinished,
    timeUp,
  };
}

export function badgeName(level) {
  if (level >= 1 && level <= BADGES.length) return BADGES[level - 1];
  return `Sweet Champion ${level}`;
}

export function hasDecor(state, id) {
  if (state.decor && state.decor[id]) return true;
  const item = getShopItem(id);
  if (item && item.freeAt && state.level >= item.freeAt) return true;
  const sticker = STICKERS.find((row) => row.id === id);
  if (sticker && state.level >= sticker.level) return true;
  if (typeof id === "string" && id.startsWith("ribbon-")) {
    const n = Number(id.slice("ribbon-".length));
    if (Number.isFinite(n) && state.level >= n) return true;
  }
  return false;
}

export function bakeryFeatures(level) {
  return {
    bigShelf: level >= 4,
    bigWindow: level >= 7,
    longCounter: level >= 9,
    nook: level >= 11,
    stickerCount: Math.max(0, Math.min(8, level - 12)),
  };
}

export function unlockedAwnings(level) {
  return AWNINGS.filter((a) => a.unlockLevel <= level);
}

export function currentAwning(state) {
  const open = unlockedAwnings(state.level);
  return open.find((a) => a.id === state.awning) || open[0];
}

export function totalNeeds(treatId, toppingId, qty = 1, drinkId = null, floatId = null) {
  const treat = getTreat(treatId);
  const topping = getTopping(toppingId);
  const drink = getDrink(drinkId);
  const needs = {};
  const add = (src, times) => {
    if (!src) return;
    for (const [id, n] of Object.entries(src)) {
      needs[id] = (needs[id] || 0) + n * times;
    }
  };
  add(treat && treat.needs, qty);
  add(topping && topping.needs, qty);
  add(drink && drink.needs, 1);
  if (floatId === "marshmallow") add(getTopping("marshmallow")?.needs, 1);
  if (floatId === "milk") add({ milk: 1 }, 1);
  return needs;
}

export function orderNeeds(order) {
  if (!order) return {};
  return totalNeeds(order.treat, order.topping, order.qty || 1, order.drink || null, order.float || null);
}

export function missingIngredients(pantry, needs) {
  const missing = [];
  for (const [id, n] of Object.entries(needs)) {
    const have = pantry[id] || 0;
    if (have < n) missing.push({ id, name: ingredientName(id), have, need: n, short: n - have });
  }
  return missing;
}

export function canMake(pantry, treatId, toppingId, qty = 1) {
  return missingIngredients(pantry, totalNeeds(treatId, toppingId, qty)).length === 0;
}

export function addPantry(pantry, gives) {
  const next = { ...pantry };
  for (const [id, n] of Object.entries(gives || {})) next[id] = (next[id] || 0) + n;
  return next;
}

export function subtractPantry(pantry, needs) {
  const next = { ...pantry };
  for (const [id, n] of Object.entries(needs)) next[id] = Math.max(0, (next[id] || 0) - n);
  return next;
}

export function describeNeeds(needs) {
  const parts = Object.entries(needs).map(([id, n]) => `${n} ${ingredientName(id).toLowerCase()}`);
  return parts.join(" · ");
}

export function describeOrder(order) {
  const treat = getTreat(order.treat);
  const topping = getTopping(order.topping);
  if (!treat || !topping) return { line: "One treat, please!", wanted: "a treat" };
  const drink = getDrink(order.drink);
  const noun = order.qty === 2 ? treat.plural : (treat.single || treat.name.toLowerCase());
  const count = order.qty === 2 ? "Two" : "One";
  const treatBit = topping.id === "plain"
    ? `${count} ${topping.phrase} ${noun}`
    : `${count} ${noun} with ${topping.phrase}`;
  const extra = drink
    ? (drink.id === "hot-chocolate" && order.float === "marshmallow"
      ? " and a hot chocolate with marshmallows"
      : drink.id === "matcha" && order.float === "milk"
        ? " and a matcha with milk"
        : ` and ${drink.with}`)
    : "";
  const line = `${treatBit}${extra}, please!`;
  const wantedBit = topping.id === "plain"
    ? `${order.qty === 2 ? "two" : "a"} ${topping.phrase} ${noun}`
    : `${order.qty === 2 ? "two" : "a"} ${noun} with ${topping.phrase}`;
  return { line, wanted: `${wantedBit}${extra}` };
}

export function patienceMaxMs(state, customer) {
  let ms = 22000 + Math.min(state.level, 12) * 350;
  if (state.upgrades.cozyOven) ms += 8000;
  if (!state.tutorialDone) ms += 12000;
  ms *= customer?.patience || 1;
  return Math.round(ms);
}

export function payout(state, order, fast) {
  const treat = getTreat(order.treat);
  const topping = getTopping(order.topping);
  const customer = getCustomer(order.customer);
  let coins = (treat.price + (topping.priceAdd || 0)) * (order.qty || 1);
  const drink = getDrink(order.drink);
  if (drink) coins += drink.price;
  if (order.float === "marshmallow") coins += getTopping("marshmallow")?.priceAdd || 0;
  if (order.float === "milk") coins += 2;
  coins += customer.payBonus || 0;
  if (fast) coins += 2;
  if (state.upgrades.tipJar) coins += 2;
  if (state.season && state.season.special === order.treat) coins += 4;
  if (order.vip) coins += 5;
  coins += Math.min(10, Math.max(0, state.level - 5));
  return coins;
}

export function thanksLine(index) {
  return THANKS[Math.abs(index) % THANKS.length];
}

export function rewardDecorForLevel(level) {
  const named = STICKERS.find((row) => row.level === level);
  if (named) return { kind: "decor", id: named.id, text: named.name };
  if (level > STICKERS[STICKERS.length - 1].level) {
    return { kind: "decor", id: `ribbon-${level}`, text: `Season ${level} ribbon` };
  }
  return null;
}

function blankPlate() {
  return { treat: null, topping: null, drink: null, float: null, sips: [] };
}

function pick(list, rng) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

export function tutorialOrder() {
  return { treat: "cupcake", topping: "strawberry", qty: 1, customer: "sunny", vip: false, drink: "milk", float: null };
}

export function rollOrder(state, rng = Math.random) {
  const treats = unlockedTreats(state.level);
  const makeableTreats = treats.filter((treat) =>
    toppingsFor(treat.id, state.level).some((top) => canMake(state.pantry, treat.id, top.id, 1))
  );
  const treatPool = makeableTreats.length && rng() < 0.72 ? makeableTreats : treats;
  const treat = pick(treatPool, rng);
  let tops = toppingsFor(treat.id, state.level);
  const makeableTops = tops.filter((top) => canMake(state.pantry, treat.id, top.id, 1));
  if (makeableTops.length && rng() < 0.8) tops = makeableTops;
  const topping = pick(tops, rng);
  let qty = state.level >= 5 && state.tutorialDone && rng() < 0.22 ? 2 : 1;
  if (qty === 2 && !canMake(state.pantry, treat.id, topping.id, 2) && canMake(state.pantry, treat.id, topping.id, 1)) {
    qty = 1;
  }
  const customer = pick(unlockedCustomers(state.level), rng);
  const vip = state.level >= 6 && rng() < 0.18;
  let drink = null;
  if (state.tutorialDone && rng() < DRINK_ORDER_CHANCE) {
    const open = unlockedDrinks(state.level);
    const makeable = open.filter((item) => missingIngredients(state.pantry, item.needs).length === 0);
    const pool = makeable.length && rng() < 0.75 ? makeable : open;
    drink = pool.length ? pick(pool, rng).id : null;
  }
  const float = drink === "hot-chocolate" && rng() < COCOA_MARSHMALLOW_CHANCE
    ? "marshmallow"
    : drink === "matcha" && rng() < 0.45
      ? "milk"
      : null;
  return { treat: treat.id, topping: topping.id, qty, customer: customer.id, vip, drink, float };
}

function blankMailPlate() {
  return { treat: null, topping: null, drink: null, float: null, sips: [] };
}

function rollMailItem(state, rng) {
  const treats = unlockedTreats(state.level);
  const drinks = unlockedDrinks(state.level);
  const roll = rng();
  let treat = null;
  let topping = null;
  let drink = null;
  let float = null;
  const wantTreat = treats.length && (roll < 0.78 || !drinks.length);
  const wantDrink = drinks.length && (roll > 0.42 || !wantTreat);
  if (wantTreat) {
    const picked = pick(treats, rng);
    const tops = toppingsFor(picked.id, state.level);
    treat = picked.id;
    topping = (tops.length ? pick(tops, rng) : getTopping("plain")).id;
  }
  if (wantDrink) {
    drink = pick(drinks, rng).id;
    if (drink === "hot-chocolate" && rng() < 0.45) float = "marshmallow";
    if (drink === "matcha" && rng() < 0.45) float = "milk";
  }
  return { treat, topping, drink, float };
}

function blankCustomMade() {
  return { frosting: null, topping: null, ribbon: null, sticker: false };
}

function partyChoices(ids, level) {
  const open = ids.map((id) => getTopping(id)).filter((top) => top && top.unlockLevel <= level);
  return open.length ? open : [getTopping("plain")].filter(Boolean);
}

export function rollCustomJob(state, rng = Math.random) {
  const event = pick(PARTY_EVENTS, rng).id;
  const customer = pick(unlockedCustomers(state.level), rng).id;
  const frosting = pick(partyChoices(PARTY_FROSTING, state.level), rng).id;
  const topping = pick(partyChoices(PARTY_TOPPINGS, state.level), rng).id;
  const ribbon = pick(RIBBONS, rng).id;
  return {
    kind: "custom",
    id: `party-${event}-${customer}-${frosting}`,
    customer,
    event,
    wish: { frosting, topping, ribbon, sticker: true },
    made: blankCustomMade(),
    items: [{ treat: "cake", topping: frosting, drink: null, float: null }],
    packed: 0,
    closed: false,
    ribbon: null,
    sticker: null,
    plate: blankMailPlate(),
  };
}

function rollPlainMailJob(state, rng) {
  const count = 1 + Math.min(2, Math.floor(rng() * 3));
  const people = unlockedCustomers(state.level);
  const customer = pick(people, rng).id;
  const items = [];
  for (let i = 0; i < count; i += 1) items.push(rollMailItem(state, rng));
  return {
    id: `mail-${customer}-${items.length}-${Math.floor(rng() * 100000)}`,
    customer,
    items,
    packed: 0,
    closed: false,
    ribbon: null,
    sticker: "bakery",
    plate: blankMailPlate(),
  };
}

export function rollMailJob(state, rng = Math.random) {
  if (rng() > 0.72) return rollCustomJob(state, rng);
  return rollPlainMailJob(state, rng);
}

function cleanMailItem(item, level) {
  if (!item || typeof item !== "object") return null;
  const treat = getTreat(item.treat);
  const topping = getTopping(item.topping);
  const drink = getDrink(item.drink);
  const treatOk = !!(treat && treat.unlockLevel <= level && topping && topping.unlockLevel <= level);
  const drinkOk = !!(drink && drink.unlockLevel <= level);
  if (item.treat && !treatOk) return null;
  if (item.drink && !drinkOk) return null;
  if (!treatOk && !drinkOk) return null;
  return {
    treat: treatOk ? treat.id : null,
    topping: treatOk ? topping.id : null,
    drink: drinkOk ? drink.id : null,
    float: drinkOk ? keptFloat(drink.id, item.float) : null,
  };
}

function cleanCustomJob(job, state, rng) {
  const event = PARTY_EVENTS.some((item) => item.id === job?.event) ? job.event : null;
  if (!event || !job.wish) return rollPlainMailJob(state, rng);
  const frostings = partyChoices(PARTY_FROSTING, state.level);
  const toppings = partyChoices(PARTY_TOPPINGS, state.level);
  const frosting = frostings.some((top) => top.id === job.wish.frosting) ? job.wish.frosting : frostings[0].id;
  const topping = toppings.some((top) => top.id === job.wish.topping) ? job.wish.topping : toppings[0].id;
  const ribbon = RIBBONS.some((item) => item.id === job.wish.ribbon) ? job.wish.ribbon : RIBBONS[0].id;
  const made = job.made && typeof job.made === "object" ? job.made : {};
  const cleanMade = {
    frosting: frostings.some((top) => top.id === made.frosting) ? made.frosting : null,
    topping: toppings.some((top) => top.id === made.topping) ? made.topping : null,
    ribbon: RIBBONS.some((item) => item.id === made.ribbon) ? made.ribbon : null,
    sticker: !!made.sticker,
  };
  const packed = job.packed >= 1 ? 1 : 0;
  const person = getCustomer(job.customer);
  const customer = person.unlockLevel <= state.level ? person.id : unlockedCustomers(state.level)[0].id;
  return {
    kind: "custom",
    id: typeof job.id === "string" && job.id ? job.id : `party-${event}-${customer}`,
    customer,
    event,
    wish: { frosting, topping, ribbon, sticker: true },
    made: cleanMade,
    items: [{ treat: "cake", topping: frosting, drink: null, float: null }],
    packed,
    closed: !!job.closed && packed === 1,
    ribbon: cleanMade.ribbon,
    sticker: cleanMade.sticker ? "bakery" : null,
    plate: blankMailPlate(),
  };
}

function cleanMailJob(job, state, rng) {
  if (job?.kind === "custom") return cleanCustomJob(job, state, rng);
  if (!job || typeof job !== "object") return rollMailJob(state, rng);
  const items = (Array.isArray(job.items) ? job.items : []).map((item) => cleanMailItem(item, state.level)).filter(Boolean).slice(0, 3);
  if (!items.length) return rollMailJob(state, rng);
  const packed = Math.max(0, Math.min(items.length, Math.round(Number(job.packed) || 0)));
  const drink = items[packed]?.drink;
  const float = items[packed]?.float;
  const visible = drink ? drinkSteps(drink, float) : [];
  const required = drink ? requiredDrinkSteps(drink, float) : [];
  const rawSips = Array.isArray(job.plate?.sips) ? job.plate.sips : [];
  const sips = [];
  for (let i = 0; i < visible.length; i += 1) {
    if (rawSips[i] === visible[i].id) sips.push(visible[i].id);
    else break;
  }
  const ready = required.length > 0 && required.every((step, index) => sips[index] === step.id);
  const person = getCustomer(job.customer);
  const customer = person.unlockLevel <= state.level ? person.id : unlockedCustomers(state.level)[0].id;
  return {
    id: typeof job.id === "string" && job.id ? job.id : `mail-kept-${packed}`,
    customer,
    items,
    packed,
    closed: !!job.closed && packed === items.length,
    ribbon: RIBBONS.some((ribbon) => ribbon.id === job.ribbon) ? job.ribbon : null,
    sticker: typeof job.sticker === "string" && job.sticker ? job.sticker : "bakery",
    plate: {
      treat: getTreat(job.plate?.treat) ? job.plate.treat : null,
      topping: getTopping(job.plate?.topping) ? job.plate.topping : null,
      drink: ready ? drink : null,
      float: ready ? keptFloat(drink, sips.includes("matcha-milk") ? "milk" : float) : null,
      sips,
    },
  };
}

export function normalizeMail(raw, state, rng = Math.random) {
  const jobs = Array.isArray(raw) ? raw : [];
  const next = jobs.slice(0, 3).map((job) => cleanMailJob(job, state, rng));
  while (next.length < 3) next.push(rollMailJob(state, rng));
  return next;
}

export function scoreCustom(job) {
  const wish = job?.wish || {};
  const made = job?.made || {};
  const checks = [
    !!wish.frosting && wish.frosting === made.frosting,
    !!wish.topping && wish.topping === made.topping,
    !!wish.ribbon && wish.ribbon === made.ribbon,
    !!wish.sticker === !!made.sticker && !!wish.sticker,
  ];
  const matched = checks.filter(Boolean).length;
  return { matched, total: checks.length, full: matched === checks.length };
}

export function customPay(state, score) {
  let coins = getTreat("cake")?.price || 12;
  coins += (score?.matched || 0) * 3;
  if (score?.full) coins += 8;
  if (state?.upgrades?.tipJar) coins += 2;
  return coins;
}

export function customNote(score) {
  if (score?.full) return "This is just what they hoped for!";
  if ((score?.matched || 0) >= 2) return "They love the cake you made!";
  return "They are so glad you baked for their party!";
}

export function describeCustomWish(job) {
  const frost = getTopping(job?.wish?.frosting);
  const top = getTopping(job?.wish?.topping);
  const ribbon = RIBBONS.find((item) => item.id === job?.wish?.ribbon);
  return [
    `${frost?.name || "Vanilla"} frosting`,
    top?.name || "Sprinkles",
    `${ribbon?.name || "Pink"} ribbon`,
    "Your bakery sticker",
  ];
}

export function setCustomDecor(state, index, patch) {
  const job = state.mail?.[index];
  if (!job || job.kind !== "custom" || job.closed || job.packed >= 1) return state;
  const made = { ...blankCustomMade(), ...job.made };
  if (patch.frosting && partyChoices(PARTY_FROSTING, state.level).some((top) => top.id === patch.frosting)) {
    made.frosting = made.frosting === patch.frosting ? null : patch.frosting;
  }
  if (patch.topping && partyChoices(PARTY_TOPPINGS, state.level).some((top) => top.id === patch.topping)) {
    made.topping = made.topping === patch.topping ? null : patch.topping;
  }
  if (patch.ribbon && RIBBONS.some((ribbon) => ribbon.id === patch.ribbon)) {
    made.ribbon = made.ribbon === patch.ribbon ? null : patch.ribbon;
  }
  if (patch.sticker === "toggle") made.sticker = !made.sticker;
  const mail = state.mail.slice();
  mail[index] = {
    ...job,
    made,
    ribbon: made.ribbon,
    sticker: made.sticker ? "bakery" : null,
  };
  return { ...state, mail };
}

export function packCustom(state, index) {
  const job = state.mail?.[index];
  if (!job || job.kind !== "custom" || job.closed || job.packed >= 1) return { state, ok: false, reason: "done" };
  if (!job.made?.frosting) return { state, ok: false, reason: "incomplete" };
  const needs = totalNeeds("cake", job.made.frosting, 1);
  if (job.made.topping && job.made.topping !== job.made.frosting) {
    const extra = getTopping(job.made.topping)?.needs || {};
    for (const [id, n] of Object.entries(extra)) needs[id] = (needs[id] || 0) + n;
  }
  const missing = missingIngredients(state.pantry, needs);
  if (missing.length) return { state, ok: false, reason: "short", missing };
  const mail = state.mail.slice();
  mail[index] = { ...job, packed: 1, plate: blankMailPlate() };
  return { state: { ...state, pantry: subtractPantry(state.pantry, needs), mail }, ok: true };
}

export function describeMailItem(item) {
  const bits = [];
  if (item?.treat) {
    const said = describeOrder({ treat: item.treat, topping: item.topping || "plain", qty: 1 });
    bits.push(said.line.replace(/, please!$/, ""));
  }
  if (item?.drink) {
    if (item.drink === "hot-chocolate" && item.float === "marshmallow") bits.push("hot chocolate with marshmallows");
    else if (item.drink === "matcha" && item.float === "milk") bits.push("a matcha with milk");
    else bits.push(getDrink(item.drink)?.with || "a drink");
  }
  return bits.join(" and ") || "A treat";
}

export function mailItemReady(plate, item) {
  const current = plate || {};
  if (!item || (!item.treat && !item.drink)) return false;
  if (item.treat && (current.treat !== item.treat || current.topping !== item.topping)) return false;
  if (item.drink) {
    if (current.drink !== item.drink) return false;
    const want = keptFloat(item.drink, item.float);
    const have = keptFloat(item.drink, current.float);
    if (have !== want && !(item.drink === "matcha" && !want && have === "milk")) return false;
  }
  return true;
}

export function mailPay(state, item) {
  if (item?.treat) {
    return payout(state, {
      treat: item.treat,
      topping: item.topping || "plain",
      qty: 1,
      customer: "sunny",
      vip: false,
      drink: item.drink,
      float: item.float,
    });
  }
  const drink = getDrink(item?.drink);
  let coins = drink ? drink.price : 0;
  if (item?.float === "marshmallow") coins += getTopping("marshmallow")?.priceAdd || 0;
  if (item?.float === "milk") coins += 2;
  if (state.upgrades?.tipJar) coins += 2;
  return coins;
}

export function packMailItem(state, index) {
  const jobs = state.mail || [];
  const job = jobs[index];
  const item = job?.items?.[job.packed];
  if (!job || !item || job.closed) return { state, ok: false, reason: "done" };
  if (!mailItemReady(job.plate, item)) return { state, ok: false, reason: "incomplete" };
  const poured = keptFloat(item.drink, item.float) || (item.drink === "matcha" && job.plate?.float === "milk" ? "milk" : null);
  const needs = totalNeeds(item.treat, item.topping, 1, item.drink, poured);
  const missing = missingIngredients(state.pantry, needs);
  if (missing.length) return { state, ok: false, reason: "short", missing };
  const items = job.items.slice();
  if (poured && poured !== item.float) items[job.packed] = { ...item, float: poured };
  const mail = jobs.slice();
  mail[index] = { ...job, items, packed: job.packed + 1, plate: blankMailPlate() };
  return { state: { ...state, pantry: subtractPantry(state.pantry, needs), mail }, ok: true };
}

export function closeMailBox(state, index) {
  const job = state.mail?.[index];
  if (!job || job.packed < job.items.length) return state;
  const mail = state.mail.slice();
  mail[index] = { ...job, closed: true };
  return { ...state, mail };
}

export function chooseMailRibbon(state, index, ribbonId) {
  const job = state.mail?.[index];
  if (!job?.closed || !RIBBONS.some((ribbon) => ribbon.id === ribbonId)) return state;
  const mail = state.mail.slice();
  mail[index] = { ...job, ribbon: ribbonId };
  return { ...state, mail };
}

export function shipMail(state, index, rng = Math.random) {
  const job = state.mail?.[index];
  if (!job?.closed) return { state, ok: false, pay: 0, note: "" };
  if (job.kind === "custom") {
    const score = scoreCustom(job);
    const pay = customPay(state, score);
    const mail = state.mail.slice();
    mail[index] = rollMailJob(state, rng);
    return {
      state: { ...state, coins: state.coins + pay, mail },
      ok: true,
      pay,
      note: customNote(score),
      full: score.full,
      matched: score.matched,
    };
  }
  if (!RIBBONS.some((ribbon) => ribbon.id === job.ribbon)) return { state, ok: false, pay: 0, note: "" };
  const pay = job.items.reduce((sum, item) => sum + mailPay(state, item), 0);
  const mail = state.mail.slice();
  mail[index] = rollMailJob(state, rng);
  return {
    state: { ...state, coins: state.coins + pay, mail },
    ok: true,
    pay,
  };
}

export function setMailPlate(state, index, plate) {
  const job = state.mail?.[index];
  if (!job || job.closed || job.packed >= job.items.length) return state;
  const mail = state.mail.slice();
  mail[index] = {
    ...job,
    plate: {
      treat: plate?.treat || null,
      topping: plate?.topping || null,
      drink: plate?.drink || null,
      float: plate?.float === "marshmallow" || plate?.float === "milk" ? plate.float : null,
      sips: Array.isArray(plate?.sips) ? plate.sips.filter((id) => typeof id === "string") : [],
    },
  };
  return { ...state, mail };
}

function advanceDrink(drinkId, orderFloat, sips, stepId) {
  const steps = drinkSteps(drinkId, orderFloat);
  const required = requiredDrinkSteps(drinkId, orderFloat);
  const done = Array.isArray(sips) ? sips : [];
  const optional = steps.find((step) => step.optional === "milk");
  const requiredDone = required.length > 0 && required.every((step, index) => done[index] === step.id);
  if (requiredDone && optional && stepId === optional.id && !done.includes(optional.id)) {
    return { result: "made", hint: optional.hint, sips: [...done, optional.id], drink: drinkId, float: "milk" };
  }
  if (requiredDone) {
    return {
      result: "done",
      hint: "",
      sips: done,
      drink: drinkId,
      float: keptFloat(drinkId, done.includes("matcha-milk") ? "milk" : orderFloat),
    };
  }
  const next = required[done.length];
  if (!next || stepId !== next.id) return { result: "hint", hint: next?.hint || "Try the next step!", next: next?.id || "" };
  const nextSips = [...done, stepId];
  const made = required.every((step, index) => nextSips[index] === step.id);
  const poured = nextSips.includes("matcha-milk") ? "milk" : (nextSips.includes("marshmallow") ? "marshmallow" : null);
  return {
    result: made ? "made" : "ok",
    hint: next.hint,
    sips: nextSips,
    drink: made ? drinkId : null,
    float: made ? keptFloat(drinkId, poured) : null,
  };
}

export function applyMailSip(state, index, stepId) {
  const job = state.mail?.[index];
  const item = job?.items?.[job.packed];
  if (!job || !item?.drink || job.closed) return { state, result: "none", hint: "" };
  const step = advanceDrink(item.drink, item.float, job.plate?.sips, stepId);
  if (step.result === "hint" || step.result === "done") return { state, result: step.result, hint: step.hint, next: step.next || "" };
  return {
    state: setMailPlate(state, index, {
      treat: job.plate?.treat || null,
      topping: job.plate?.topping || null,
      drink: step.drink,
      float: step.float,
      sips: step.sips,
    }),
    result: step.result,
    hint: step.hint,
  };
}

export function startSeason(state, rng = Math.random) {
  const season = {
    playedMs: 0,
    earned: 0,
    special: state.level >= 4 ? pick(unlockedTreats(state.level), rng).id : null,
    sold: 0,
    missed: 0,
    usedSecondChance: false,
    resolved: null,
    lastPay: 0,
    bonusPaid: true,
    limitMs: SEASON_PLAY_MS,
    plate: blankPlate(),
    order: null,
  };
  const draft = { ...state, coins: state.coins + SEASON_START_BONUS, season };
  const order = state.tutorialDone ? rollOrder(draft, rng) : tutorialOrder();
  return { ...draft, season: { ...season, order } };
}

export function withOrder(state, order) {
  if (!state.season) return state;
  return {
    ...state,
    season: {
      ...state.season,
      order,
      plate: blankPlate(),
      usedSecondChance: false,
      resolved: null,
    },
  };
}

export function applySip(state, stepId) {
  const order = state.season?.order;
  if (!state.season || !order?.drink) return { state, result: "none", hint: "" };
  const step = advanceDrink(order.drink, order.float, state.season.plate?.sips, stepId);
  if (step.result === "hint" || step.result === "done") return { state, result: step.result, hint: step.hint, next: step.next || "" };
  return {
    state: setPlate(state, {
      treat: state.season.plate?.treat || null,
      topping: state.season.plate?.topping || null,
      drink: step.drink,
      float: step.float,
      sips: step.sips,
    }),
    result: step.result,
    hint: step.hint,
  };
}

export function setPlate(state, plate) {
  if (!state.season || state.season.resolved) return state;
  return {
    ...state,
    season: {
      ...state.season,
      plate: {
        treat: plate?.treat || null,
        topping: plate?.topping || null,
        drink: plate?.drink || null,
        float: plate?.float === "marshmallow" || plate?.float === "milk" ? plate.float : null,
        sips: Array.isArray(plate?.sips) ? plate.sips.filter((id) => typeof id === "string") : [],
      },
    },
  };
}

export function tryServe(state, { fast = false } = {}) {
  const season = state.season;
  if (!season || !season.order) return { state, result: "idle" };
  if (season.resolved) return { state, result: "busy" };
  const plate = season.plate || blankPlate();
  if (!plate.treat || !plate.topping) return { state, result: "incomplete" };
  if (season.order.drink && !plate.drink) return { state, result: "need-drink" };
  if (season.order.float && keptFloat(season.order.drink, plate.float) !== keptFloat(season.order.drink, season.order.float)) {
    return { state, result: "need-float" };
  }
  const servedFloat = plate.float === "milk" && season.order.drink === "matcha" ? "milk" : plate.float;
  const needs = totalNeeds(plate.treat, plate.topping, season.order.qty || 1, plate.drink, servedFloat);
  const missing = missingIngredients(state.pantry, needs);
  if (missing.length) return { state, result: "short", missing };
  const optionalMilk = season.order.drink === "matcha" && !season.order.float && plate.float === "milk";
  const match = plate.treat === season.order.treat
    && plate.topping === season.order.topping
    && (plate.drink || null) === (season.order.drink || null)
    && ((plate.float || null) === (season.order.float || null) || optionalMilk);
  if (!match) {
    const usedBell = !!(state.upgrades.secondChance && !season.usedSecondChance);
    return {
      state: {
        ...state,
        season: {
          ...season,
          plate: blankPlate(),
          usedSecondChance: season.usedSecondChance || usedBell,
        },
      },
      result: "mismatch",
      usedBell,
    };
  }
  const pay = payout(state, optionalMilk ? { ...season.order, float: "milk" } : season.order, fast);
  return {
    state: {
      ...state,
      coins: state.coins + pay,
      pantry: subtractPantry(state.pantry, needs),
      season: {
        ...season,
        earned: season.earned + pay,
        plate: blankPlate(),
        resolved: "sold",
        lastPay: pay,
      },
    },
    result: "match",
    pay,
  };
}

export function markLeave(state) {
  if (!state.season || state.season.resolved) return state;
  return { ...state, season: { ...state.season, resolved: "leave", plate: blankPlate() } };
}

export function takeResolution(state) {
  if (!state.season || !state.season.resolved) return { state, done: false, kind: null };
  const kind = state.season.resolved === "leave" ? "leave" : "sold";
  const season = state.season;
  const order = season.order;
  const done = seasonTimeUp(season);
  const nextSeason = {
    playedMs: season.playedMs || 0,
    earned: season.earned,
    special: season.special,
    sold: season.sold + (kind === "sold" ? 1 : 0),
    missed: season.missed + (kind === "leave" ? 1 : 0),
    usedSecondChance: false,
    resolved: null,
    lastPay: 0,
    bonusPaid: season.bonusPaid !== false,
    limitMs: seasonLimit(season),
    plate: blankPlate(),
    order: null,
  };
  const stats = {
    ...state.stats,
    customers: state.stats.customers + (kind === "sold" ? 1 : 0),
    baked: state.stats.baked + (kind === "sold" ? (order.qty || 1) : 0),
  };
  return { state: { ...state, season: nextSeason, stats }, done, kind };
}

export function closeSeason(state) {
  if (!state.season) {
    return { state, met: false, earned: 0, played: 0, unlocks: [], fromLevel: state.level, toLevel: state.level };
  }
  const earned = state.season.earned || 0;
  const played = state.season.playedMs || 0;
  const fromLevel = state.level;
  const toLevel = state.level + 1;
  const unlocks = seasonUnlocks(state, toLevel);
  return {
    state: {
      ...state,
      level: toLevel,
      season: null,
      tutorialDone: true,
      stats: {
        ...state.stats,
        seasons: state.stats.seasons + 1,
        best: Math.max(state.stats.best || 0, earned),
      },
    },
    met: true,
    earned,
    played,
    unlocks,
    fromLevel,
    toLevel,
  };
}

/** Finishing a season always grants something you can see: a treat, a bigger bakery, or a decoration. */
export function seasonUnlocks(state, toLevel) {
  const items = unlockItemsAt(toLevel).filter((item) => !(item.kind === "decor" && item.id && state.decor?.[item.id]));
  const tangible = items.filter((item) => item.kind === "treat" || item.kind === "bakery" || item.kind === "decor" || item.kind === "awning");
  if (!tangible.length) {
    items.unshift({ kind: "decor", id: `ribbon-${toLevel}`, text: `Season ${toLevel} ribbon` });
  }
  return items;
}

export function buy(state, itemId) {
  const item = getShopItem(itemId);
  if (!item) return { state, ok: false, reason: "missing" };
  if (item.kind === "upgrade" && state.upgrades[item.id]) return { state, ok: false, reason: "owned" };
  if (item.kind === "decor" && hasDecor(state, item.id)) return { state, ok: false, reason: "owned" };
  if (state.coins < item.cost) return { state, ok: false, reason: "coins", need: item.cost - state.coins };
  let next = { ...state, coins: state.coins - item.cost };
  if (item.kind === "ingredient") next = { ...next, pantry: addPantry(next.pantry, item.gives) };
  else if (item.kind === "upgrade") next = { ...next, upgrades: { ...next.upgrades, [item.id]: true } };
  else if (item.kind === "decor") next = { ...next, decor: { ...next.decor, [item.id]: true } };
  return { state: next, ok: true, item };
}

export function selectAwning(state, id) {
  if (!unlockedAwnings(state.level).some((a) => a.id === id)) return { state, ok: false, reason: "locked" };
  return { state: { ...state, awning: id }, ok: true };
}

export function unlockItemsAt(level) {
  const items = [];
  for (const treat of TREATS) {
    if (treat.unlockLevel === level) items.push({ kind: "treat", id: treat.id, text: treat.name });
  }
  for (const topping of TOPPINGS) {
    if (topping.unlockLevel === level) items.push({ kind: "topping", id: topping.id, text: `${topping.name} topping` });
  }
  for (const customer of CUSTOMERS) {
    if (customer.unlockLevel === level) items.push({ kind: "customer", id: customer.id, text: `${customer.name} visits` });
  }
  for (const item of SHOP) {
    if (item.kind === "decor" && item.freeAt === level) items.push({ kind: "decor", id: item.id, text: item.name });
  }
  for (const awning of AWNINGS) {
    if (awning.unlockLevel === level) items.push({ kind: "awning", id: awning.id, text: `${awning.name} awning` });
  }
  for (const feature of FEATURES) {
    if (feature.level === level) items.push({ kind: "feature", text: feature.text });
  }
  for (const growth of BAKERY_GROWTH) {
    if (growth.level === level) items.push({ kind: "bakery", id: growth.id, text: growth.text });
  }
  const extra = rewardDecorForLevel(level);
  if (extra) items.push(extra);
  items.push({ kind: "badge", text: `Badge: ${badgeName(level)}` });
  return items;
}

function joinAnd(list) {
  if (list.length <= 1) return list[0] || "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

export function nextUnlockText(level) {
  for (let lv = level + 1; lv <= level + 30; lv += 1) {
    const items = unlockItemsAt(lv).filter((item) => item.kind !== "badge");
    if (!items.length) continue;
    const names = items.slice(0, 3).map((item) => item.text);
    return `Level ${lv} unlocks ${joinAnd(names)}.`;
  }
  return "Every season can still set a new best!";
}

export { AWNINGS, CUSTOMERS, INGREDIENTS, SEASON_PLAY_MS, SHOP, TOPPINGS, TREATS };
