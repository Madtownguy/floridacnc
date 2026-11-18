import assert from "node:assert/strict";
import test from "node:test";
import { DRINK_ORDER_CHANCE, DRINKS, MUSIC_TRACKS, SEASON_PLAY_MS, SEASON_START_BONUS, STORAGE_KEY, TREAT_UNLOCK_ORDER, TUTORIAL_STEPS, cleanBakerName } from "./data.js";
import {
  addPlaytime,
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
  unlockedTreats,
} from "./rules.js";
import { load, save } from "./state.js";

function memory() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
  };
}

test("season length is 35 minutes and lives in the config constant", () => {
  assert.equal(SEASON_PLAY_MS, 35 * 60 * 1000);
  assert.equal(formatDuration(SEASON_PLAY_MS), "35 minutes");
  assert.match(clockLabel(0), /35-minute season · 35 min to go/);
  assert.equal(seasonClock(null).total, SEASON_PLAY_MS);
});

test("short visits add up and only the last chunk finishes the season", () => {
  let state = startSeason(newGame(), () => 0.1);
  const chunk = 10 * 60 * 1000;
  for (let i = 0; i < 3; i += 1) {
    const step = addPlaytime(state, chunk);
    state = step.state;
    assert.equal(step.justFinished, false);
    assert.equal(step.timeUp, false);
  }
  assert.equal(state.season.playedMs, 30 * 60 * 1000);
  const last = addPlaytime(state, chunk);
  state = last.state;
  assert.equal(last.justFinished, true);
  assert.equal(state.season.playedMs, SEASON_PLAY_MS);
  const extra = addPlaytime(state, chunk);
  assert.equal(extra.justFinished, false);
  assert.equal(extra.state.season.playedMs, SEASON_PLAY_MS);
  assert.equal(seasonTimeUp(state.season), true);
});

test("a saved season past 35 minutes completes instead of breaking", () => {
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
  almost.season.playedMs = 34 * 60 * 1000;
  assert.equal(seasonTimeUp(almost.season), false);
  almost.season.playedMs = 35 * 60 * 1000;
  assert.equal(seasonTimeUp(almost.season), true);
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
  assert.ok(TUTORIAL_STEPS.length >= 3 && TUTORIAL_STEPS.length <= 5);
  assert.deepEqual(TUTORIAL_STEPS.map((step) => step.id), ["order", "treat", "topping", "serve", "clock"]);
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
  assert.equal(tutorialOrder().drink, null);
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
  assert.equal(loaded.pantry.milk, newGame().pantry.milk);
});
