/**
 * Original looping tunes made with the Web Audio API.
 * Nothing here is a copyrighted song.
 *
 * MUSIC_TRACKS in data.js is the picker list. If a track has src
 * ("audio/song.mp3"), that file is played instead of the synth below.
 * The synth key is the track id.
 */

const VOLUME = { soft: 0.4, medium: 0.65, loud: 1 };
const MASTER = 0.11;

function midi(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

/** Midnight Muffins: slow sine melody over a warm held chord. */
const MUFFINS = {
  bpm: 64,
  beats: 16,
  notes: [
    { at: 0, n: 67, dur: 2.2, g: 0.045, wave: "sine" },
    { at: 2.5, n: 64, dur: 2.2, g: 0.04, wave: "sine" },
    { at: 5, n: 62, dur: 2.2, g: 0.04, wave: "sine" },
    { at: 7.5, n: 60, dur: 2.4, g: 0.045, wave: "sine" },
    { at: 10, n: 64, dur: 2.2, g: 0.04, wave: "sine" },
    { at: 12.5, n: 62, dur: 1.8, g: 0.038, wave: "sine" },
    { at: 14.2, n: 60, dur: 1.6, g: 0.04, wave: "sine" },
    { at: 0, n: 48, dur: 16, g: 0.028, wave: "sine" },
    { at: 0, n: 55, dur: 16, g: 0.022, wave: "sine" },
  ],
};

/** Cozy Cocoa: low, warm, unhurried. */
const COCOA = {
  bpm: 60,
  beats: 16,
  notes: [
    { at: 0, n: 60, dur: 3, g: 0.04, wave: "sine" },
    { at: 3.2, n: 64, dur: 2.6, g: 0.038, wave: "sine" },
    { at: 6, n: 67, dur: 3, g: 0.04, wave: "sine" },
    { at: 9.2, n: 64, dur: 2.4, g: 0.036, wave: "sine" },
    { at: 12, n: 62, dur: 2.2, g: 0.036, wave: "sine" },
    { at: 14.2, n: 60, dur: 1.7, g: 0.04, wave: "sine" },
    { at: 0, n: 48, dur: 16, g: 0.03, wave: "sine" },
    { at: 0, n: 52, dur: 16, g: 0.02, wave: "sine" },
  ],
};

/** Sweet Flan Lullaby: very slow, soft, rocking. */
const LULLABY = {
  bpm: 56,
  beats: 16,
  notes: [
    { at: 0, n: 72, dur: 2.4, g: 0.035, wave: "sine" },
    { at: 2.5, n: 69, dur: 2.2, g: 0.032, wave: "sine" },
    { at: 5, n: 67, dur: 2.4, g: 0.032, wave: "sine" },
    { at: 7.6, n: 69, dur: 2, g: 0.03, wave: "sine" },
    { at: 10, n: 72, dur: 2.2, g: 0.034, wave: "sine" },
    { at: 12.4, n: 74, dur: 1.6, g: 0.03, wave: "sine" },
    { at: 14, n: 72, dur: 1.8, g: 0.032, wave: "sine" },
    { at: 0, n: 55, dur: 16, g: 0.022, wave: "sine" },
    { at: 0, n: 60, dur: 16, g: 0.018, wave: "sine" },
  ],
};

const SYNTH = {
  "midnight-muffins": MUFFINS,
  "cozy-cocoa": COCOA,
  "sweet-flan-lullaby": LULLABY,
};

export function createPlayer(tracks) {
  let ctx = null;
  let master = null;
  let volume = "medium";
  let muted = false;
  let effects = true;
  let stopped = true;
  let timer = 0;
  let live = [];
  let audioEl = null;
  let fileSource = null;

  function context() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function gainValue() {
    if (muted) return 0;
    return MASTER * (VOLUME[volume] || VOLUME.medium);
  }

  function applyGain() {
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(gainValue(), ctx.currentTime, 0.03);
    if (audioEl) audioEl.volume = muted ? 0 : (VOLUME[volume] || 0.65);
  }

  function tone(when, freq, dur, amount, wave) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    const peak = Math.max(0.0001, amount);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(peak, when + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.06, dur));
    osc.connect(amp);
    amp.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.04);
    live.push(osc);
    osc.onended = () => {
      live = live.filter((item) => item !== osc);
    };
  }

  function playPattern(pattern) {
    const beat = 60 / pattern.bpm;
    const loop = pattern.beats * beat;
    let when = ctx.currentTime + 0.06;
    stopped = false;
    const schedule = () => {
      if (stopped) return;
      if (document.hidden) {
        timer = setTimeout(schedule, 400);
        return;
      }
      const horizon = ctx.currentTime + 0.35;
      while (when < horizon) {
        for (const note of pattern.notes) {
          tone(when + note.at * beat, midi(note.n), note.dur * beat, note.g, note.wave);
        }
        when += loop;
      }
      timer = setTimeout(schedule, Math.max(60, (when - ctx.currentTime - 0.2) * 1000));
    };
    schedule();
  }

  function playFile(track) {
    audioEl = new Audio(track.src);
    audioEl.loop = true;
    audioEl.volume = muted ? 0 : (VOLUME[volume] || 0.65);
    fileSource = ctx.createMediaElementSource(audioEl);
    fileSource.connect(master);
    audioEl.play();
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    for (const osc of live) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    live = [];
    if (audioEl) {
      audioEl.pause();
      audioEl.src = "";
      audioEl = null;
    }
    if (fileSource) {
      try { fileSource.disconnect(); } catch { /* already gone */ }
      fileSource = null;
    }
  }

  return {
    start(id) {
      const track = tracks.find((item) => item.id === id);
      if (!track) return;
      stop();
      context();
      applyGain();
      if (track.src) playFile(track);
      else if (SYNTH[track.id]) playPattern(SYNTH[track.id]);
    },
    stop,
    setVolume(id) {
      if (VOLUME[id]) volume = id;
      applyGain();
    },
    setMuted(next) {
      muted = !!next;
      applyGain();
    },
    setEffects(on) {
      effects = on !== false;
    },
    ding() {
      if (!effects || muted) return;
      try {
        const audio = context();
        applyGain();
        const now = audio.currentTime;
        chime(now, midi(76), 0.22, 0.05);
        chime(now + 0.18, midi(81), 0.34, 0.045);
      } catch {
        /* The bell is optional. */
      }
    },
    suspend() {
      if (ctx && ctx.state === "running") ctx.suspend();
    },
    resume() {
      if (ctx && ctx.state === "suspended") ctx.resume();
    },
    blip(freq, dur) {
      if (!effects || muted) return;
      try {
        const audio = context();
        applyGain();
        chime(audio.currentTime, freq, dur, 0.04);
      } catch {
        /* Effects are optional. */
      }
    },
  };

  function chime(when, freq, dur, amount) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, amount), when + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}
