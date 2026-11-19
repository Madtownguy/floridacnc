import assert from "node:assert/strict";
import test from "node:test";
import { DRINK_ORDER_CHANCE, DRINKS, MUSIC_TRACKS, SEASON_PLAY_MS, SEASON_START_BONUS, STORAGE_KEY, TREAT_UNLOCK_ORDER, TUTORIAL_STEPS, cleanBakerName } from "./data.js";
import {
  addPlaytime,
  applySip,
  clockLabel,
  closeSeason,
  describeOrder,
  formatDuration,
  getTopping,
  getTreat,
  newGame,
  rollOrder,
  seasonClock,
  seasonTimeUp,
  seasonUnlocks,
  startSeason,
  takeResolution,
  tryServe,
  tutorialOrder,
  drinkSteps,
  unlockedTreats,
  rollMailJob,
  normalizeMail,
  applyMailSip,
  setMailPlate,
  packMailItem,
  closeMailBox,
  shipMail,
  mailPay,
  mailItemReady,
} from "./rules.js";
import { load, save } from "./state.js";

function memory() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
  };
}

test("season length is 20 minutes and lives in the config constant", () => {
  assert.equal(SEASON_PLAY_MS, 20 * 60 * 1000);
  assert.equal(formatDuration(SEASON_PLAY_MS), "20 minutes");
  assert.match(clockLabel(0), /20-minute season · 20 min to go/);
  assert.equal(seasonClock(null).total, SEASON_PLAY_MS);
});

test("short visits add up and only the last chunk finishes the season", () => {
  let state = startSeason(newGame(), () => 0.1);
  const chunk = 10 * 60 * 1000;
  const step = addPlaytime(state, chunk);
  state = step.state;
  assert.equal(step.justFinished, false);
  assert.equal(step.timeUp, false);
  assert.equal(state.season.playedMs, 10 * 60 * 1000);
  const last = addPlaytime(state, chunk);
  state = last.state;
  assert.equal(last.justFinished, true);
  assert.equal(state.season.playedMs, SEASON_PLAY_MS);
  const extra = addPlaytime(state, chunk);
  assert.equal(extra.justFinished, false);
  assert.equal(extra.state.season.playedMs, SEASON_PLAY_MS);
  assert.equal(seasonTimeUp(state.season), true);
});

test("a saved season past 20 minutes completes instead of breaking", () => {
  let state = startSeason(newGame(), () => 0);
  state = {
    ...state,
    coins: 40,
    season: { ...state.season, playedMs: 60 * 60 * 1000, earned: 22 },
  };
  const store = memory();
  save(state, store);
  const loaded = load(store);
  assert.equal(loaded.season.playedMs, 60 * 60 * 1000);
  assert.equal(loaded.coins, 40);
  assert.equal(seasonTimeUp(loaded.season), true);
  assert.equal(seasonClock(loaded.season).done, true);
  assert.equal(clockLabel(loaded.season.playedMs), "Time for a new unlock!");
  const closed = closeSeason(loaded);
  assert.equal(closed.state.level, 2);
  assert.equal(closed.state.season, null);
  assert.equal(closed.state.coins, 40);
  assert.equal(closed.played, 60 * 60 * 1000);
  assert.ok(closed.unlocks.some((item) => item.kind === "treat" && item.id === "donut"));
  const almost = startSeason(newGame(), () => 0);
  almost.season.playedMs = 19 * 60 * 1000;
  assert.equal(seasonTimeUp(almost.season), false);
  almost.season.playedMs = 20 * 60 * 1000;
  assert.equal(seasonTimeUp(almost.season), true);
});

test("an in-progress season keeps minutes played and caps time left at 20", () => {
  function saved(playedMin, coins, limitMin) {
    const raw = {
      v: 1,
      coins,
      level: 2,
      bakerName: "Pip",
      music: "off",
      season: {
        playedMs: playedMin * 60 * 1000,
        earned: 11,
        bonusPaid: true,
        ...(limitMin ? { limitMs: limitMin * 60 * 1000 } : {}),
        order: { treat: "cookie", topping: "plain", qty: 1, customer: "sunny", vip: false },
        plate: { treat: null, topping: null },
      },
    };
    const store = memory();
    store.setItem(STORAGE_KEY, JSON.stringify(raw));
    return load(store);
  }
  const early = saved(0, 77, 25);
  assert.equal(early.coins, 77);
  assert.equal(early.season.playedMs, 0);
  assert.equal(early.season.limitMs, 20 * 60 * 1000);
  assert.equal(seasonClock(early.season).left, 20 * 60 * 1000);
  const halfway = saved(10, 80, 25);
  assert.equal(halfway.coins, 80);
  assert.equal(halfway.season.playedMs, 10 * 60 * 1000);
  assert.equal(seasonClock(halfway.season).left, 15 * 60 * 1000);
  assert.equal(seasonTimeUp(halfway.season), false);
  const later = saved(20, 90, 25);
  assert.equal(later.season.playedMs, 20 * 60 * 1000);
  assert.equal(seasonClock(later.season).left, 5 * 60 * 1000);
  assert.equal(later.coins, 90);
  const long = saved(10, 100, 35);
  assert.equal(long.season.playedMs, 10 * 60 * 1000);
  assert.equal(seasonClock(long.season).left, 20 * 60 * 1000);
  assert.equal(long.coins, 100);
});

test("closing the page does not invent play time, and the total is saved", () => {
  let state = startSeason(newGame(), () => 0.2);
  state = addPlaytime(state, 10 * 60 * 1000).state;
  const store = memory();
  save(state, store);
  const loaded = load(store);
  assert.equal(loaded.season.playedMs, 10 * 60 * 1000);
  assert.equal(store.getItem(STORAGE_KEY).includes("600000"), true);
  const gap = addPlaytime(loaded, 0);
  assert.equal(gap.state.season.playedMs, 10 * 60 * 1000);
});

test("customers keep coming until the play timer is full", () => {
  let state = startSeason(newGame(), () => 0);
  state = tryServe({ ...state, season: { ...state.season, plate: { treat: "cupcake", topping: "strawberry" } } }, { fast: false }).state;
  let step = takeResolution(state);
  assert.equal(step.done, false);
  assert.equal(step.state.season.playedMs, 0);
  step = { ...step, state: { ...step.state, season: { ...step.state.season, playedMs: SEASON_PLAY_MS, resolved: "sold", order: tutorialOrder() } } };
  step = takeResolution(step.state);
  assert.equal(step.done, true);
});

test("finishing a season always unlocks something visible", () => {
  const state = startSeason(newGame(), () => 0);
  state.season.playedMs = SEASON_PLAY_MS;
  state.season.earned = 12;
  const closed = closeSeason(state);
  assert.equal(closed.state.level, 2);
  assert.equal(closed.state.season, null);
  assert.ok(closed.unlocks.some((item) => item.kind === "treat" && item.id === "donut"));
  for (let level = 2; level <= 30; level += 1) {
    const items = seasonUnlocks(newGame(), level);
    assert.ok(
      items.some((item) => ["treat", "topping", "bakery", "decor", "awning"].includes(item.kind)),
      `level ${level} should unlock a treat, a topping, or a decoration`,
    );
  }
  assert.ok(seasonUnlocks(newGame(), 4).some((item) => item.kind === "bakery" && item.id === "shelf"));
  assert.ok(seasonUnlocks(newGame(), 7).some((item) => item.text.includes("window")));
  assert.ok(seasonUnlocks(newGame(), 13).some((item) => item.kind === "decor"));
});

test("treats follow TREAT_UNLOCK_ORDER and later levels stay extra", () => {
  assert.deepEqual(TREAT_UNLOCK_ORDER, [
    ["cupcake", "cookie"],
    ["donut"],
    ["pie"],
    ["cake"],
    ["flan"],
  ]);
  assert.deepEqual(unlockedTreats(1).map((treat) => treat.id), ["cupcake", "cookie"]);
  assert.equal(getTreat("donut").unlockLevel, 2);
  assert.equal(getTreat("pie").unlockLevel, 3);
  assert.equal(getTreat("cake").unlockLevel, 4);
  assert.equal(getTreat("flan").unlockLevel, 5);
  TREAT_UNLOCK_ORDER.forEach((group, index) => {
    const level = index + 1;
    if (level === 1) return;
    const treats = seasonUnlocks(newGame(), level).filter((item) => item.kind === "treat").map((item) => item.id);
    assert.deepEqual(treats, group);
  });
  for (let level = TREAT_UNLOCK_ORDER.length + 1; level <= 20; level += 1) {
    const items = seasonUnlocks(newGame(), level);
    assert.equal(items.some((item) => item.kind === "treat"), false, `level ${level} should not add another treat`);
    assert.ok(
      items.some((item) => ["topping", "decor", "awning", "bakery"].includes(item.kind)),
      `level ${level} should unlock a topping or decoration`,
    );
  }
});

test("music stays off until she picks a song, and the lesson is short", () => {
  const game = newGame();
  assert.equal(game.music, "off");
  assert.equal(game.musicMuted, false);
  assert.equal(game.sfx, true);
  assert.equal(game.tutorialSeen, false);
  assert.deepEqual(MUSIC_TRACKS.map((track) => track.id), ["midnight-muffins", "cozy-cocoa", "sweet-flan-lullaby"]);
  assert.equal(MUSIC_TRACKS.some((track) => track.src), false);
  assert.ok(TUTORIAL_STEPS.length >= 3 && TUTORIAL_STEPS.length <= 6);
  assert.deepEqual(TUTORIAL_STEPS.map((step) => step.id), ["order", "treat", "topping", "sip", "serve", "clock"]);
});

test("vanilla is the plain topping name in labels and orders", () => {
  const order = { treat: "cupcake", topping: "plain", qty: 1, customer: "sunny", vip: false };
  const said = describeOrder(order);
  assert.equal(said.line, "One vanilla cupcake, please!");
  assert.equal(said.wanted, "a vanilla cupcake");
  assert.equal(getTopping("plain").name, "Vanilla");
});

test("each Selling Season adds 30 coins once, on top of what she already has", () => {
  assert.equal(SEASON_START_BONUS, 30);
  const fresh = newGame();
  assert.equal(fresh.coins, 18);
  const first = startSeason(fresh, () => 0);
  assert.equal(first.coins, 18 + SEASON_START_BONUS);
  assert.equal(first.season.bonusPaid, true);
  const store = memory();
  save(first, store);
  assert.equal(load(store).coins, 48);
  assert.equal(load(store).season.bonusPaid, true);
  const again = load(store);
  assert.equal(again.coins, 48);
  const closed = closeSeason({ ...again, coins: 70 });
  assert.equal(closed.state.coins, 70);
  const next = startSeason(closed.state, () => 0);
  assert.equal(next.coins, 100);
  const old = startSeason(newGame(), () => 0);
  old.coins = 22;
  delete old.season.bonusPaid;
  const oldStore = memory();
  save(old, oldStore);
  const reopened = load(oldStore);
  assert.equal(reopened.coins, 22);
  assert.equal(reopened.season.bonusPaid, true);
});

test("tutorial switch is saved and does not reset the bakery", () => {
  const game = newGame();
  assert.equal(game.tutorialOn, true);
  game.coins = 55;
  game.level = 3;
  game.tutorialOn = false;
  game.tutorialSeen = true;
  const store = memory();
  save(game, store);
  const loaded = load(store);
  assert.equal(loaded.tutorialOn, false);
  assert.equal(loaded.tutorialSeen, true);
  assert.equal(loaded.coins, 55);
  assert.equal(loaded.level, 3);
  store.setItem(STORAGE_KEY, JSON.stringify({ v: 1, coins: 40, level: 2 }));
  const migrated = load(store);
  assert.equal(migrated.tutorialOn, true);
  assert.equal(migrated.coins, 40);
  assert.equal(migrated.level, 2);
});

test("the home logo is saved and a bad value stays a cupcake", () => {
  const game = newGame();
  assert.deepEqual(game.logo, { kind: "treat", id: "cupcake" });
  game.coins = 61;
  game.logo = { kind: "drink", id: "flan" };
  const store = memory();
  save(game, store);
  assert.deepEqual(load(store).logo, { kind: "treat", id: "cupcake" });
  assert.equal(load(store).coins, 61);
  game.logo = { kind: "drink", id: "hot-chocolate" };
  save(game, store);
  const loaded = load(store);
  assert.deepEqual(loaded.logo, { kind: "drink", id: "hot-chocolate" });
  assert.equal(loaded.coins, 61);
  store.setItem(STORAGE_KEY, JSON.stringify({ v: 1, coins: 33, level: 4 }));
  const old = load(store);
  assert.deepEqual(old.logo, { kind: "treat", id: "cupcake" });
  assert.equal(old.coins, 33);
  assert.equal(old.level, 4);
});

test("baker name defaults to Madison and stays short", () => {
  assert.equal(cleanBakerName(""), "Madison");
  assert.equal(cleanBakerName("  sam  "), "sam");
  assert.equal(cleanBakerName("Supercalifragilistic"), "Supercalifragili");
  const game = newGame();
  game.bakerName = "Pip";
  const store = memory();
  save(game, store);
  assert.equal(load(store).bakerName, "Pip");
});

test("a shorter config still completes when saved time already passed it", () => {
  const state = startSeason(newGame(), () => 0);
  state.season.playedMs = 10 * 60 * 1000;
  const fiveMinutes = 5 * 60 * 1000;
  assert.equal(seasonTimeUp(state.season, fiveMinutes), true);
  const step = addPlaytime(state, 0, fiveMinutes);
  assert.equal(step.timeUp, true);
  assert.equal(step.justFinished, false);
});

test("drinks are optional, priced, and old saves keep their coins", () => {
  assert.equal(DRINK_ORDER_CHANCE, 0.3);
  assert.deepEqual(DRINKS.map((drink) => drink.unlockLevel), [1, 1, 1, 1]);
  assert.equal(tutorialOrder().drink, "milk");
  const said = describeOrder({ treat: "cupcake", topping: "plain", qty: 1, customer: "sunny", drink: "milk" });
  assert.equal(said.line, "One vanilla cupcake and milk, please!");
  const fresh = { ...newGame(), tutorialDone: true };
  const seq = [0, 0, 0, 0, 0, 0.1, 0, 0];
  let n = 0;
  const withDrink = rollOrder(fresh, () => seq[n++] ?? 0);
  assert.equal(withDrink.drink, "coffee");
  n = 0;
  const quiet = [0, 0, 0, 0, 0, 0.95];
  const noDrink = rollOrder(fresh, () => quiet[n++] ?? 0);
  assert.equal(noDrink.drink, null);
  const learning = rollOrder(newGame(), () => 0);
  assert.equal(learning.drink, null);

  let state = startSeason(newGame(), () => 0);
  state = {
    ...state,
    season: {
      ...state.season,
      order: { ...state.season.order, drink: "milk" },
      plate: { treat: "cupcake", topping: "strawberry", drink: null },
    },
  };
  assert.equal(tryServe(state).result, "need-drink");
  state = { ...state, season: { ...state.season, plate: { treat: "cupcake", topping: "strawberry", drink: "coffee" } } };
  const wrong = tryServe(state);
  assert.equal(wrong.result, "mismatch");
  assert.equal(wrong.state.pantry.milk, state.pantry.milk);
  state = { ...state, season: { ...state.season, plate: { treat: "cupcake", topping: "strawberry", drink: "milk" } } };
  const sold = tryServe(state, { fast: false });
  assert.equal(sold.result, "match");
  assert.equal(sold.pay, 8 + 2 + 3);
  assert.equal(sold.state.pantry.milk, state.pantry.milk - 1);
  assert.equal(sold.state.coins, state.coins + sold.pay);

  const old = {
    v: 1,
    coins: 77,
    level: 3,
    bakerName: "Pip",
    music: "cozy-cocoa",
    musicVolume: "soft",
    season: {
      playedMs: 120000,
      earned: 15,
      bonusPaid: true,
      order: { treat: "cookie", topping: "plain", qty: 1, customer: "sunny", vip: false },
      plate: { treat: "cookie", topping: "plain" },
    },
  };
  const store = memory();
  store.setItem(STORAGE_KEY, JSON.stringify(old));
  const loaded = load(store);
  assert.equal(loaded.coins, 77);
  assert.equal(loaded.level, 3);
  assert.equal(loaded.bakerName, "Pip");
  assert.equal(loaded.music, "cozy-cocoa");
  assert.equal(loaded.musicVolume, "soft");
  assert.equal(loaded.season.playedMs, 120000);
  assert.equal(loaded.season.earned, 15);
  assert.equal(loaded.season.bonusPaid, true);
  assert.equal(loaded.season.order.treat, "cookie");
  assert.equal(loaded.season.order.drink, null);
  assert.equal(loaded.season.plate.drink, null);
  assert.equal(loaded.season.order.float, null);
  assert.equal(loaded.pantry.milk, newGame().pantry.milk);
});

test("marshmallow is a starting topping and an optional cocoa add-on", () => {
  const marshmallow = getTopping("marshmallow");
  assert.equal(marshmallow.unlockLevel, 1);
  assert.equal(marshmallow.priceAdd, 2);
  assert.ok(getTreat("cupcake").toppings.includes("marshmallow"));
  assert.ok(getTreat("cookie").toppings.includes("marshmallow"));
  assert.equal(getTreat("pie").toppings.includes("marshmallow"), false);
  const said = describeOrder({
    treat: "cupcake", topping: "plain", qty: 1, customer: "sunny", drink: "hot-chocolate", float: "marshmallow",
  });
  assert.equal(said.line, "One vanilla cupcake and a hot chocolate with marshmallows, please!");
  const plainCocoa = describeOrder({
    treat: "cupcake", topping: "plain", qty: 1, customer: "sunny", drink: "hot-chocolate",
  });
  assert.equal(plainCocoa.line, "One vanilla cupcake and a hot chocolate, please!");

  const fresh = { ...newGame(), tutorialDone: true };
  const seq = [0, 0, 0, 0, 0, 0.1, 0, 0.3, 0];
  let n = 0;
  const cocoa = rollOrder(fresh, () => seq[n++] ?? 0);
  assert.equal(cocoa.drink, "hot-chocolate");
  assert.equal(cocoa.float, "marshmallow");
  n = 0;
  const skip = [0, 0, 0, 0, 0, 0.1, 0, 0.3, 0.9];
  const noPuff = rollOrder(fresh, () => skip[n++] ?? 0);
  assert.equal(noPuff.drink, "hot-chocolate");
  assert.equal(noPuff.float, null);

  let state = startSeason(newGame(), () => 0);
  state = {
    ...state,
    season: {
      ...state.season,
      order: { treat: "cupcake", topping: "strawberry", qty: 1, customer: "sunny", vip: false, drink: "hot-chocolate", float: "marshmallow" },
      plate: { treat: "cupcake", topping: "strawberry", drink: "hot-chocolate", float: null },
    },
  };
  assert.equal(tryServe(state, { fast: false }).result, "need-float");
  state = { ...state, season: { ...state.season, plate: { ...state.season.plate, float: "marshmallow" } } };
  const sold = tryServe(state, { fast: false });
  assert.equal(sold.result, "match");
  assert.equal(sold.pay, 8 + 2 + 5 + 2);
  assert.equal(sold.state.pantry.sugar, state.pantry.sugar - 2);
  assert.equal(sold.state.coins, state.coins + sold.pay);
});

test("drinks are made one step at a time, and a wrong tap only hints", () => {
  const milk = drinkSteps("milk");
  assert.deepEqual(milk.map((step) => step.id), ["glass", "pour-milk"]);
  assert.deepEqual(drinkSteps("coffee").map((step) => step.id), ["cup", "pour-coffee"]);
  assert.deepEqual(drinkSteps("chocolate-milk").map((step) => step.id), ["glass", "milk", "chocolate", "stir"]);
  assert.deepEqual(drinkSteps("hot-chocolate").map((step) => step.id), ["mug", "cocoa", "hot-milk", "stir"]);
  assert.equal(drinkSteps("hot-chocolate", "marshmallow").at(-1).id, "marshmallow");
  let state = startSeason(newGame(), () => 0);
  state = {
    ...state,
    season: {
      ...state.season,
      plate: { treat: "cupcake", topping: "strawberry", drink: null, float: null, sips: [] },
    },
  };
  const before = state.coins;
  const wrong = applySip(state, "pour-milk");
  assert.equal(wrong.result, "hint");
  assert.equal(wrong.hint, "Tap the glass!");
  assert.equal(wrong.state.coins, before);
  assert.equal(wrong.state.season.plate.drink, null);
  state = applySip(state, "glass").state;
  const made = applySip(state, "pour-milk");
  assert.equal(made.result, "made");
  assert.equal(made.state.season.plate.drink, "milk");
  const sold = tryServe(made.state, { fast: false });
  assert.equal(sold.result, "match");
  assert.equal(sold.state.pantry.milk, state.pantry.milk - 1);
  const old = {
    v: 1,
    coins: 64,
    level: 2,
    season: {
      playedMs: 1000,
      earned: 4,
      bonusPaid: true,
      limitMs: 20 * 60 * 1000,
      order: { treat: "cupcake", topping: "strawberry", qty: 1, customer: "sunny", vip: false, drink: "coffee" },
      plate: { treat: "cupcake", topping: "strawberry", drink: "coffee" },
    },
  };
  const store = memory();
  store.setItem(STORAGE_KEY, JSON.stringify(old));
  const loaded = load(store);
  assert.equal(loaded.coins, 64);
  assert.deepEqual(loaded.season.plate.sips, ["cup", "pour-coffee"]);
  assert.equal(loaded.season.plate.drink, "coffee");
});

test("mail orders are calm, pay like a serve, and migrate without wiping the bakery", () => {
  const zero = () => 0;
  const fresh = newGame();
  const sample = rollMailJob(fresh, zero);
  assert.equal(sample.customer, "sunny");
  assert.equal(sample.items.length, 1);
  assert.deepEqual(sample.items[0], { treat: "cupcake", topping: "plain", drink: null, float: null });
  assert.equal(sample.ribbon, null);
  assert.equal(sample.sticker, null);
  assert.equal(sample.packed, 0);
  assert.equal(sample.closed, false);

  const open = new Set(unlockedTreats(1).map((treat) => treat.id));
  for (const job of normalizeMail(null, fresh, zero)) {
    assert.ok(job.items.length >= 1 && job.items.length <= 3);
    for (const item of job.items) {
      assert.ok(item.treat || item.drink);
      if (item.treat) assert.ok(open.has(item.treat));
    }
  }

  let state = startSeason(fresh, zero);
  state = { ...state, season: { ...state.season, playedMs: 5000, earned: 9 } };
  const purse = state.coins;
  state = {
    ...state,
    mail: normalizeMail([{
      id: "keep-me",
      customer: "mayor",
      ribbon: "pink-bow",
      sticker: "star",
      packed: 0,
      items: [
        { treat: "cake", topping: "strawberry" },
        { treat: "cupcake", topping: "strawberry", drink: "milk" },
      ],
      plate: { sips: ["pour-milk"] },
    }], state, zero),
  };
  assert.equal(state.mail.length, 3);
  assert.equal(state.mail[0].id, "keep-me");
  assert.equal(state.mail[0].customer, "sunny");
  assert.equal(state.mail[0].ribbon, "pink-bow");
  assert.equal(state.mail[0].sticker, "star");
  assert.equal(state.mail[0].items.length, 1);
  assert.equal(state.mail[0].items[0].treat, "cupcake");
  assert.equal(state.mail[0].items[0].drink, "milk");
  assert.deepEqual(state.mail[0].plate.sips, []);
  const kept = [state.mail[1].id, state.mail[2].id];

  const item = state.mail[0].items[0];
  const wrong = applyMailSip(state, 0, "pour-milk");
  assert.equal(wrong.result, "hint");
  assert.equal(wrong.state.pantry.milk, state.pantry.milk);
  assert.equal(wrong.state.coins, purse);
  state = applyMailSip(state, 0, "glass").state;
  state = setMailPlate(state, 0, {
    treat: "cupcake",
    topping: "strawberry",
    drink: null,
    float: null,
    sips: state.mail[0].plate.sips,
  });
  assert.equal(mailItemReady(state.mail[0].plate, item), false);
  const early = packMailItem(state, 0);
  assert.equal(early.ok, false);
  assert.equal(early.state.pantry.flour, state.pantry.flour);
  state = applyMailSip(state, 0, "pour-milk").state;
  assert.equal(state.mail[0].plate.drink, "milk");
  assert.equal(mailItemReady(state.mail[0].plate, item), true);
  assert.equal(mailPay(state, item), 8 + 2 + 3);

  const packed = packMailItem(state, 0);
  assert.equal(packed.ok, true);
  assert.equal(packed.state.mail[0].packed, 1);
  assert.equal(packed.state.coins, purse);
  assert.equal(packed.state.pantry.flour, state.pantry.flour - 1);
  assert.equal(packed.state.pantry.fruit, state.pantry.fruit - 1);
  assert.equal(packed.state.pantry.milk, state.pantry.milk - 1);
  assert.equal(packed.state.season.playedMs, 5000);
  state = closeMailBox(packed.state, 0);
  assert.equal(state.mail[0].closed, true);
  const shipped = shipMail(state, 0, zero);
  assert.equal(shipped.ok, true);
  assert.equal(shipped.pay, 13);
  assert.equal(shipped.state.coins, purse + 13);
  assert.equal(shipped.state.season.playedMs, 5000);
  assert.equal(shipped.state.season.earned, 9);
  assert.notEqual(shipped.state.mail[0].id, "keep-me");
  assert.deepEqual([shipped.state.mail[1].id, shipped.state.mail[2].id], kept);
  assert.equal(shipped.state.tutorialDone, fresh.tutorialDone);

  const store = memory();
  store.setItem(STORAGE_KEY, JSON.stringify({
    v: 1,
    coins: 77,
    level: 2,
    tutorialDone: true,
    bakerName: "Ada",
    logo: { kind: "treat", id: "donut" },
    season: {
      playedMs: 12000,
      earned: 6,
      bonusPaid: true,
      limitMs: SEASON_PLAY_MS,
      sold: 1,
      missed: 0,
      order: { treat: "cookie", topping: "plain", qty: 1, customer: "pip", vip: false },
      plate: { treat: "cookie", topping: "plain" },
    },
  }));
  const loaded = load(store);
  assert.equal(loaded.coins, 77);
  assert.equal(loaded.level, 2);
  assert.equal(loaded.tutorialDone, true);
  assert.equal(loaded.bakerName, "Ada");
  assert.deepEqual(loaded.logo, { kind: "treat", id: "donut" });
  assert.equal(loaded.season.playedMs, 12000);
  assert.equal(loaded.season.earned, 6);
  assert.equal(loaded.season.order.treat, "cookie");
  assert.equal(loaded.mail.length, 3);
  const allowed = new Set(unlockedTreats(2).map((treat) => treat.id));
  for (const job of loaded.mail) {
    assert.ok(job.items.length >= 1 && job.items.length <= 3);
    assert.equal(job.ribbon, null);
    assert.equal(job.sticker, null);
    for (const bit of job.items) {
      assert.ok(bit.treat || bit.drink);
      if (bit.treat) assert.ok(allowed.has(bit.treat));
    }
  }
});
