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

/** Sprinkle Party: bright and bouncy, original pentatonic loop. */
const SPRINKLE = {
  bpm: 124,
  beats: 8,
  notes: [
    { at: 0, n: 76, dur: 0.45, g: 0.09, wave: "triangle" },
    { at: 0.5, n: 79, dur: 0.45, g: 0.09, wave: "triangle" },
    { at: 1, n: 81, dur: 0.45, g: 0.1, wave: "triangle" },
    { at: 1.5, n: 79, dur: 0.4, g: 0.08, wave: "triangle" },
    { at: 2, n: 76, dur: 0.45, g: 0.09, wave: "triangle" },
    { at: 2.5, n: 74, dur: 0.4, g: 0.08, wave: "triangle" },
    { at: 3, n: 72, dur: 0.45, g: 0.09, wave: "triangle" },
    { at: 3.5, n: 74, dur: 0.4, g: 0.08, wave: "triangle" },
    { at: 4, n: 76, dur: 0.45, g: 0.09, wave: "triangle" },
    { at: 4.5, n: 79, dur: 0.45, g: 0.1, wave: "triangle" },
    { at: 5, n: 84, dur: 0.5, g: 0.1, wave: "triangle" },
    { at: 5.5, n: 81, dur: 0.4, g: 0.08, wave: "triangle" },
    { at: 6, n: 79, dur: 0.45, g: 0.09, wave: "triangle" },
    { at: 6.5, n: 76, dur: 0.4, g: 0.08, wave: "triangle" },
    { at: 7, n: 74, dur: 0.45, g: 0.08, wave: "triangle" },
    { at: 7.5, n: 72, dur: 0.7, g: 0.09, wave: "triangle" },
    { at: 0, n: 60, dur: 1.4, g: 0.05, wave: "sine" },
    { at: 2, n: 67, dur: 1.4, g: 0.05, wave: "sine" },
    { at: 4, n: 69, dur: 1.4, g: 0.05, wave: "sine" },
    { at: 6, n: 67, dur: 1.4, g: 0.05, wave: "sine" },
  ],
};

/** Midnight Muffins: slow, soft, cozy. */
const MUFFINS = {
  bpm: 72,
  beats: 16,
  notes: [
    { at: 0, n: 67, dur: 1.8, g: 0.07, wave: "sine" },
    { at: 2, n: 64, dur: 1.8, g: 0.07, wave: "sine" },
    { at: 4, n: 62, dur: 1.8, g: 0.06, wave: "sine" },
    { at: 6, n: 60, dur: 1.8, g: 0.07, wave: "sine" },
    { at: 8, n: 64, dur: 1.8, g: 0.07, wave: "sine" },
    { at: 10, n: 62, dur: 1.8, g: 0.06, wave: "sine" },
    { at: 12, n: 60, dur: 1.8, g: 0.07, wave: "sine" },
    { at: 14, n: 57, dur: 1.8, g: 0.06, wave: "sine" },
    { at: 0, n: 48, dur: 8, g: 0.035, wave: "sine" },
    { at: 0, n: 55, dur: 8, g: 0.03, wave: "sine" },
    { at: 8, n: 53, dur: 8, g: 0.035, wave: "sine" },
    { at: 8, n: 60, dur: 8, g: 0.028, wave: "sine" },
  ],
};

/** Flan Dance: short bouncy notes. */
const FLAN = {
  bpm: 142,
  beats: 8,
  notes: [
    { at: 0, n: 72, dur: 0.22, g: 0.09, wave: "square" },
    { at: 0.5, n: 76, dur: 0.22, g: 0.08, wave: "square" },
    { at: 1, n: 79, dur: 0.22, g: 0.09, wave: "square" },
    { at: 1.5, n: 76, dur: 0.22, g: 0.08, wave: "square" },
    { at: 2, n: 81, dur: 0.22, g: 0.09, wave: "square" },
    { at: 2.5, n: 79, dur: 0.22, g: 0.08, wave: "square" },
    { at: 3, n: 76, dur: 0.22, g: 0.08, wave: "square" },
    { at: 3.5, n: 79, dur: 0.22, g: 0.09, wave: "square" },
    { at: 4, n: 84, dur: 0.28, g: 0.09, wave: "square" },
    { at: 4.5, n: 79, dur: 0.22, g: 0.08, wave: "square" },
    { at: 5, n: 76, dur: 0.22, g: 0.08, wave: "square" },
    { at: 5.5, n: 72, dur: 0.22, g: 0.08, wave: "square" },
    { at: 6, n: 74, dur: 0.22, g: 0.08, wave: "square" },
    { at: 6.5, n: 76, dur: 0.22, g: 0.09, wave: "square" },
    { at: 7, n: 79, dur: 0.22, g: 0.08, wave: "square" },
    { at: 7.5, n: 76, dur: 0.3, g: 0.09, wave: "square" },
    { at: 0, n: 48, dur: 0.2, g: 0.06, wave: "triangle" },
    { at: 0.5, n: 60, dur: 0.16, g: 0.05, wave: "triangle" },
    { at: 1, n: 55, dur: 0.2, g: 0.06, wave: "triangle" },
    { at: 1.5, n: 67, dur: 0.16, g: 0.05, wave: "triangle" },
    { at: 2, n: 48, dur: 0.2, g: 0.06, wave: "triangle" },
    { at: 2.5, n: 60, dur: 0.16, g: 0.05, wave: "triangle" },
    { at: 3, n: 55, dur: 0.2, g: 0.06, wave: "triangle" },
    { at: 3.5, n: 67, dur: 0.16, g: 0.05, wave: "triangle" },
    { at: 4, n: 53, dur: 0.2, g: 0.06, wave: "triangle" },
    { at: 4.5, n: 65, dur: 0.16, g: 0.05, wave: "triangle" },
    { at: 5, n: 60, dur: 0.2, g: 0.06, wave: "triangle" },
    { at: 5.5, n: 72, dur: 0.16, g: 0.05, wave: "triangle" },
    { at: 6, n: 55, dur: 0.2, g: 0.06, wave: "triangle" },
    { at: 6.5, n: 67, dur: 0.16, g: 0.05, wave: "triangle" },
    { at: 7, n: 48, dur: 0.2, g: 0.06, wave: "triangle" },
    { at: 7.5, n: 60, dur: 0.16, g: 0.05, wave: "triangle" },
  ],
};

const SYNTH = {
  "sprinkle-party": SPRINKLE,
  "midnight-muffins": MUFFINS,
  "flan-dance": FLAN,
};

export function createPlayer(tracks) {
  let ctx = null;
  let master = null;
  let volume = "medium";
  let muted = false;
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
    suspend() {
      if (ctx && ctx.state === "running") ctx.suspend();
    },
    resume() {
      if (ctx && ctx.state === "suspended") ctx.resume();
    },
    blip(freq, dur) {
      try {
        const audio = context();
        const osc = audio.createOscillator();
        const amp = audio.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        amp.gain.value = 0.03;
        osc.connect(amp);
        amp.connect(audio.destination);
        osc.start();
        amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
        osc.stop(audio.currentTime + dur);
      } catch {
        /* Effects are optional. */
      }
    },
  };
}
