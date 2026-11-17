/** localStorage load and save. The key stays stable so Madison's bakery persists. */
import { STORAGE_KEY } from "./data.js";
import { newGame, normalize } from "./rules.js";

export function load(storage = globalThis.localStorage) {
  try {
    if (!storage) return newGame();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return newGame();
    return normalize(JSON.parse(raw));
  } catch {
    return newGame();
  }
}

export function save(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Private mode can block storage. The season still plays. */
  }
}

export { STORAGE_KEY };
