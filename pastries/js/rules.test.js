import assert from "node:assert/strict";
import test from "node:test";
import { MUSIC_TRACKS, SEASON_PLAY_MS, STORAGE_KEY, TREAT_UNLOCK_ORDER, TUTORIAL_STEPS } from "./data.js";
import {
  addPlaytime,
  clockLabel,
  closeSeason,
  formatDuration,
  getTreat,
  newGame,
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

test("season length is one hour and lives in the config constant", () => {
  assert.equal(SEASON_PLAY_MS, 60 * 60 * 1000);
  assert.equal(formatDuration(SEASON_PLAY_MS), "1 hour");
  assert.match(clockLabel(0), /1 hour season/);
  assert.equal(seasonClock(null).total, SEASON_PLAY_MS);
});

test("short visits add up and only the last chunk finishes the season", () => {
  let state = startSeason(newGame(), () => 0.1);
  const chunk = 15 * 60 * 1000;
  let finished = false;
  for (let i = 0; i < 3; i += 1) {
    const step = addPlaytime(state, chunk);
    state = step.state;
    assert.equal(step.justFinished, false);
    finished = step.timeUp;
  }
  assert.equal(finished, false);
  assert.equal(state.season.playedMs, 45 * 60 * 1000);
  const last = addPlaytime(state, chunk);
  state = last.state;
  assert.equal(last.justFinished, true);
  assert.equal(state.season.playedMs, SEASON_PLAY_MS);
  const extra = addPlaytime(state, chunk);
  assert.equal(extra.justFinished, false);
  assert.equal(extra.state.season.playedMs, SEASON_PLAY_MS);
  assert.equal(seasonTimeUp(state.season), true);
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
  assert.equal(game.tutorialSeen, false);
  assert.deepEqual(MUSIC_TRACKS.map((track) => track.id), ["sprinkle-party", "midnight-muffins", "flan-dance"]);
  assert.equal(MUSIC_TRACKS.some((track) => track.src), false);
  assert.ok(TUTORIAL_STEPS.length >= 3 && TUTORIAL_STEPS.length <= 5);
  assert.deepEqual(TUTORIAL_STEPS.map((step) => step.id), ["order", "treat", "topping", "serve", "clock"]);
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
