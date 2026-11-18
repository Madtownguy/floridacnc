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
  DRINK_ORDER_CHANCE,
  DRINKS,
  FEATURES,
  INGREDIENTS,
  MUSIC_TRACKS,
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
    bakerName: "Madison",
    tutorialDone: false,
    pantry: {
      flour: 8,
      sugar: 8,
      butter: 6,
      eggs: 3,
      milk: 3,
      fruit: 5,
      chocolate: 5,
      sprinkles: 4,
    },
    upgrades: { cozyOven: false, tipJar: false, secondChance: false },
    decor: {},
    stats: { customers: 0, baked: 0, seasons: 0, best: 0 },
    season: null,
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
        earned: clampInt(season.earned, 0, 999999, 0),
        special,
        sold: clampInt(season.sold, 0, 999999, 0),
        missed: clampInt(season.missed, 0, 999999, 0),
        usedSecondChance: !!season.usedSecondChance,
        resolved,
        lastPay: clampInt(season.lastPay, 0, 999999, 0),
        bonusPaid: season.bonusPaid !== false,
        plate: {
          treat: TREATS.some((t) => t.id === season.plate?.treat) ? season.plate.treat : null,
          topping: TOPPINGS.some((t) => t.id === season.plate?.topping) ? season.plate.topping : null,
          drink: DRINKS.some((d) => d.id === season.plate?.drink) ? season.plate.drink : null,
        },
        order: {
          qty: order.qty === 2 ? 2 : 1,
          vip: !!order.vip,
          treat: order.treat,
          topping: order.topping,
          customer: order.customer,
          drink: DRINKS.some((d) => d.id === order.drink) ? order.drink : null,
        },
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
    bakerName: cleanBakerName(data.bakerName),
    tutorialDone: !!data.tutorialDone,
    pantry: { ...base.pantry, ...(data.pantry || {}) },
    upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
    decor: { ...(data.decor || {}) },
    stats: { ...base.stats, ...(data.stats || {}) },
    season,
  };
}

function validMusic(id) {
  if (id === "off") return "off";
  if (MUSIC_TRACKS.some((track) => track.id === id)) return id;
  return "off";
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

export function seasonClock(season, total = SEASON_PLAY_MS) {
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

export function seasonTimeUp(season, total = SEASON_PLAY_MS) {
  return !!season && (season.playedMs || 0) >= total;
}

/**
 * Add active play time. dt is milliseconds the page was actually open
 * on the baking or shop screen. Closing the page does not add the gap.
 */
export function addPlaytime(state, dtMs, total = SEASON_PLAY_MS) {
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

export function totalNeeds(treatId, toppingId, qty = 1, drinkId = null) {
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
  return needs;
}

export function orderNeeds(order) {
  if (!order) return {};
  return totalNeeds(order.treat, order.topping, order.qty || 1, order.drink || null);
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
  const noun = order.qty === 2 ? treat.plural : treat.name.toLowerCase();
  const count = order.qty === 2 ? "Two" : "One";
  const treatBit = topping.id === "plain"
    ? `${count} ${topping.phrase} ${noun}`
    : `${count} ${noun} with ${topping.phrase}`;
  const extra = drink ? ` and ${drink.with}` : "";
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
  return { treat: null, topping: null, drink: null };
}

function pick(list, rng) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

export function tutorialOrder() {
  return { treat: "cupcake", topping: "strawberry", qty: 1, customer: "sunny", vip: false, drink: null };
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
  return { treat: treat.id, topping: topping.id, qty, customer: customer.id, vip, drink };
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
  const needs = totalNeeds(plate.treat, plate.topping, season.order.qty || 1, plate.drink);
  const missing = missingIngredients(state.pantry, needs);
  if (missing.length) return { state, result: "short", missing };
  const match = plate.treat === season.order.treat
    && plate.topping === season.order.topping
    && (plate.drink || null) === (season.order.drink || null);
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
  const pay = payout(state, season.order, fast);
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
