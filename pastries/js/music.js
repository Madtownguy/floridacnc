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
  let musicGain = null;
  let effectsGain = null;
  let volume = "medium";
  let muted = false;
  let effects = true;
  let generation = 0;
  let timer = 0;
  let live = [];
  let audioEl = null;
  let fileSource = null;
  let wantedId = null;
  let playing = false;

  function context() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(master);
      effectsGain = ctx.createGain();
      effectsGain.gain.value = 0;
      effectsGain.connect(master);
      ctx.addEventListener("statechange", () => {
        if (ctx.state === "running") nudge();
      });
    }
    return ctx;
  }

  function level() {
    return VOLUME[volume] || VOLUME.medium;
  }

  function applyGain() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const audible = muted ? 0 : MASTER * level();
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(playing && wantedId ? audible : 0, now);
    }
    if (effectsGain) {
      effectsGain.gain.cancelScheduledValues(now);
      effectsGain.gain.setValueAtTime(!muted && effects ? audible : 0, now);
    }
    if (audioEl) audioEl.volume = !playing || muted ? 0 : level();
  }

  function silenceNode(osc) {
    try { osc.disconnect(); } catch { /* already gone */ }
    try { osc.stop(); } catch { /* not started yet, or already stopped */ }
  }

  function hush() {
    generation += 1;
    clearTimeout(timer);
    timer = 0;
    for (const osc of live) silenceNode(osc);
    live = [];
    if (audioEl) {
      audioEl.pause();
      try { audioEl.removeAttribute("src"); audioEl.load(); } catch { /* ignore */ }
      audioEl = null;
    }
    if (fileSource) {
      try { fileSource.disconnect(); } catch { /* already gone */ }
      fileSource = null;
    }
  }

  function tone(when, freq, dur, amount, wave, gen) {
    if (gen !== generation || when < ctx.currentTime) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    const peak = Math.max(0.0001, amount);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(peak, when + 0.03);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.08, dur));
    osc.connect(amp);
    amp.connect(musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
    live.push(osc);
    osc.onended = () => {
      live = live.filter((item) => item !== osc);
    };
  }

  function playPattern(pattern, gen) {
    const beat = 60 / pattern.bpm;
    const loop = pattern.beats * beat;
    let when = ctx.currentTime + 0.08;
    const schedule = () => {
      if (gen !== generation || !playing || !wantedId) return;
      if (document.hidden || ctx.state !== "running") {
        timer = setTimeout(schedule, 300);
        return;
      }
      if (when < ctx.currentTime + 0.02) when = ctx.currentTime + 0.08;
      const horizon = ctx.currentTime + 0.5;
      while (when < horizon) {
        for (const note of pattern.notes) {
          tone(when + note.at * beat, midi(note.n), Math.min(note.dur, pattern.beats) * beat, note.g, note.wave, gen);
        }
        when += loop;
      }
      timer = setTimeout(schedule, Math.max(90, (when - ctx.currentTime - 0.2) * 1000));
    };
    schedule();
  }

  function beginTrack(id) {
    if (!playing || wantedId !== id || !ctx || ctx.state !== "running") return;
    if (timer || audioEl) return;
    const track = tracks.find((item) => item.id === id);
    const pattern = track && SYNTH[track.id];
    applyGain();
    if (track && track.src) {
      audioEl = new Audio(track.src);
      audioEl.loop = true;
      audioEl.volume = muted ? 0 : (VOLUME[volume] || 0.65);
      fileSource = ctx.createMediaElementSource(audioEl);
      fileSource.connect(musicGain);
      const started = audioEl.play();
      if (started && started.catch) started.catch(() => { /* needs another tap */ });
    } else if (pattern) {
      playPattern(pattern, generation);
    }
  }

  function gestureResume() {
    const audio = context();
    if (audio.state === "running") return Promise.resolve();
    let pending = null;
    try { pending = audio.resume(); } catch { /* try the silent buffer below */ }
    try {
      const buf = audio.createBuffer(1, 1, audio.sampleRate || 22050);
      const src = audio.createBufferSource();
      src.buffer = buf;
      src.connect(master);
      src.start(0);
    } catch { /* Safari can refuse this until the tap is accepted. */ }
    return pending || Promise.resolve();
  }

  function kick() {
    if (!playing || !wantedId || muted) return;
    const audio = context();
    const go = () => {
      if (!playing || !wantedId || muted || audio.state !== "running") return;
      if (!timer && !audioEl) beginTrack(wantedId);
    };
    if (audio.state === "running") go();
    const pending = gestureResume();
    if (pending && pending.then) pending.then(go).catch(go);
  }

  function nudge() {
    if (!playing || !wantedId || muted || !ctx || ctx.state !== "running") return;
    if (timer || audioEl) return;
    beginTrack(wantedId);
  }

  function chime(when, freq, dur, amount) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, amount), when + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp);
    amp.connect(effectsGain);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  return {
    start(id) {
      const track = tracks.find((item) => item.id === id);
      if (!track) return;
      const audio = context();
      if (wantedId === id && playing && !muted) {
        kick();
        return;
      }
      hush();
      wantedId = id;
      playing = true;
      muted = false;
      if (audio.state === "running") beginTrack(id);
      const pending = gestureResume();
      if (pending && pending.then) pending.then(() => beginTrack(id)).catch(() => beginTrack(id));
    },
    stop() {
      playing = false;
      wantedId = null;
      hush();
      applyGain();
    },
    setVolume(id) {
      if (VOLUME[id]) volume = id;
      applyGain();
    },
    setMuted(next) {
      muted = !!next;
      applyGain();
      if (!muted) kick();
    },
    setEffects(on) {
      effects = on !== false;
    },
    ding() {
      if (!effects || muted) return;
      try {
        const audio = context();
        const go = () => {
          if (!effects || muted) return;
          applyGain();
          const now = audio.currentTime;
          chime(now, midi(76), 0.2, 0.05);
          chime(now + 0.18, midi(81), 0.32, 0.04);
        };
        if (audio.state === "running") go();
        else {
          const pending = audio.resume();
          if (pending && pending.then) pending.then(go);
        }
      } catch {
        /* The bell is optional. */
      }
    },
    resumeIfWanted() {
      kick();
    },
    prepareForBackground() {
      const id = wantedId;
      const was = playing;
      hush();
      wantedId = id;
      playing = was;
      applyGain();
    },
    blip(freq, dur) {
      if (!effects || muted) return;
      try {
        const audio = context();
        const go = () => {
          if (!effects || muted) return;
          applyGain();
          chime(audio.currentTime, freq, dur, 0.04);
        };
        if (audio.state === "running") go();
        else {
          const pending = audio.resume();
          if (pending && pending.then) pending.then(go);
        }
      } catch {
        /* Effects are optional. */
      }
    },
  };
}
