import { CRT_THEME } from "../style/crtTheme.js";

const DEFAULT_CONFIG = {
  reduceAudioNoise: CRT_THEME.audio.reduceAudioNoise,
  mute: CRT_THEME.audio.mute,
  masterVolume: CRT_THEME.audio.masterVolume,
  hum: {
    volume: 0.018,
    baseFrequency: 49,
    overtoneFrequency: 98,
    filterFrequency: 680,
  },
  beep: {
    volume: 0.075,
    attack: 0.004,
    decay: 0.055,
    filterFrequency: 2600,
    types: {
      default: [1040, 0.045],
      hover: [3200, 0.018],
      tick: [1700, 0.024],
      confirmA: [880, 0.043],
      confirmB: [1320, 0.05],
      warning: [620, 0.085],
    },
  },
  error: {
    volume: 0.095,
    startFrequency: 180,
    endFrequency: 74,
    duration: 0.16,
    noiseVolume: 0.035,
  },
  glitch: {
    volume: 0.07,
    duration: 0.12,
    filterStart: 1800,
    filterEnd: 340,
  },
};

export default class TerminalAudio {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = mergeConfig(DEFAULT_CONFIG, config);
    this.context = null;
    this.master = null;
    this.hum = null;
    this.initialized = false;
    this.pendingHum = false;
    this.muted = !!this.config.mute;
    this.masterVolume = clamp01(this.config.masterVolume);
    this._lastHoverAt = 0;
    this._unlockHandlersBound = false;

    this._bindUnlock();
    this.scene?.events?.once?.("shutdown", () => this.destroy());
  }

  bootHum() {
    this.pendingHum = true;
    if (!this._ensureReady()) return;
    if (this.hum) return;

    const now = this.context.currentTime;
    const cfg = this.config.hum;
    const oscA = this.context.createOscillator();
    const oscB = this.context.createOscillator();
    const noise = this._createNoiseSource(1.2);
    noise.loop = true;
    const filter = this.context.createBiquadFilter();
    const shaper = this._createWaveShaper(16);
    const gain = this.context.createGain();

    oscA.type = "sine";
    oscB.type = "triangle";
    oscA.frequency.setValueAtTime(cfg.baseFrequency, now);
    oscB.frequency.setValueAtTime(cfg.overtoneFrequency, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cfg.filterFrequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(this._scaled(cfg.volume), now + 0.45);

    oscA.connect(shaper);
    oscB.connect(shaper);
    noise.connect(filter);
    shaper.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    oscA.start(now);
    oscB.start(now);
    noise.start(now);
    this.hum = { oscA, oscB, noise, gain };
  }

  stopHum() {
    this.pendingHum = false;
    if (!this.hum || !this.context) return;
    const now = this.context.currentTime;
    const { oscA, oscB, noise, gain } = this.hum;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    [oscA, oscB, noise].forEach((node) => {
      try {
        node.stop(now + 0.22);
      } catch (_) {
        // Oscillators can only be stopped once.
      }
    });
    this.hum = null;
  }

  beep(type = "default") {
    if (!this._ensureReady()) return;
    const spec = this.config.beep.types[type] || this.config.beep.types.default;
    this._tone(spec[0], spec[1], this.config.beep.volume, {
      filterFrequency: this.config.beep.filterFrequency,
    });
  }

  confirm() {
    if (!this._ensureReady()) return;
    const now = this.context.currentTime;
    this._tone(this.config.beep.types.confirmA[0], this.config.beep.types.confirmA[1], this.config.beep.volume, { at: now });
    this._tone(this.config.beep.types.confirmB[0], this.config.beep.types.confirmB[1], this.config.beep.volume * 0.8, { at: now + 0.055 });
  }

  error() {
    if (!this._ensureReady()) return;
    const now = this.context.currentTime;
    const cfg = this.config.error;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(cfg.startFrequency, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.endFrequency, now + cfg.duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(620, now);
    gain.gain.setValueAtTime(this._scaled(cfg.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + cfg.duration + 0.02);

    if (!this.config.reduceAudioNoise) {
      this._noiseBurst(now, 0.075, cfg.noiseVolume, 980);
    }
  }

  hover() {
    const nowMs = performance.now();
    if (nowMs - this._lastHoverAt < 45) return;
    this._lastHoverAt = nowMs;
    this.beep("hover");
  }

  tick() {
    this.beep("tick");
  }

  rowRefresh() {
    if (!this._ensureReady()) return;
    const count = 3 + Math.floor(Math.random() * 4);
    const base = this.context.currentTime;
    for (let i = 0; i < count; i++) {
      const freq = 1400 + Math.random() * 1700;
      this._tone(freq, 0.012 + Math.random() * 0.012, this.config.beep.volume * 0.42, {
        at: base + i * (0.018 + Math.random() * 0.018),
        type: "square",
      });
    }
  }

  glitch(duration = 120) {
    if (!this._ensureReady()) return;
    const now = this.context.currentTime;
    const seconds = Math.max(0.035, duration / 1000);
    const cfg = this.config.glitch;
    if (!this.config.reduceAudioNoise) {
      this._noiseBurst(now, seconds, cfg.volume, cfg.filterStart, cfg.filterEnd);
    }
    for (let i = 0; i < 3; i++) {
      this._tone(320 + Math.random() * 1900, 0.025, cfg.volume * 0.45, {
        at: now + i * 0.028,
        type: i % 2 ? "sawtooth" : "square",
      });
    }
  }

  screenOn() {
    if (!this._ensureReady()) {
      this.pendingHum = true;
      return;
    }
    const now = this.context.currentTime;
    this._tone(110, 0.08, 0.045, { at: now, endFrequency: 520, type: "sine" });
    this._tone(760, 0.05, 0.036, { at: now + 0.08, endFrequency: 1240, type: "triangle" });
    this.bootHum();
  }

  screenOff() {
    if (!this._ensureReady()) return;
    const now = this.context.currentTime;
    this._tone(520, 0.14, 0.06, { at: now, endFrequency: 62, type: "sawtooth" });
    this.stopHum();
  }

  warningPulse() {
    if (!this._ensureReady()) return;
    const now = this.context.currentTime;
    this._tone(620, 0.08, 0.065, { at: now, type: "square" });
    this._tone(620, 0.08, 0.045, { at: now + 0.16, type: "square" });
  }

  setMuted(muted) {
    this.muted = !!muted;
    this._applyMasterVolume();
  }

  setVolume(value) {
    this.masterVolume = clamp01(value);
    this._applyMasterVolume();
  }

  destroy() {
    this.stopHum();
    this._unbindUnlock();
    if (this.master) {
      try {
        this.master.disconnect();
      } catch (_) {
        // No-op.
      }
    }
    this.master = null;
    this.initialized = false;
  }

  _ensureReady() {
    if (this.initialized && this.context?.state === "running") return true;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const context = this.context || this.scene?.sound?.context || (AudioContextCtor ? new AudioContextCtor() : null);
    if (!context) return false;
    this.context = context;

    if (this.scene?.sound?.locked || context.state === "suspended") {
      const resume = context.resume?.();
      if (resume?.then) {
        resume.then(() => {
          if (this.context?.state === "running") {
            this._initGraph();
            if (this.pendingHum) this.bootHum();
          }
        }).catch(() => {});
      }
      this._bindUnlock();
      if (context.state !== "running") return false;
    }

    this._initGraph();
    return true;
  }

  _initGraph() {
    if (this.initialized) return;
    this.master = this.context.createGain();
    this.master.connect(this.context.destination);
    this.initialized = true;
    this._applyMasterVolume();
    if (this.pendingHum) this.bootHum();
  }

  _bindUnlock() {
    if (this._unlockHandlersBound || !this.scene) return;
    this._unlockHandlersBound = true;
    this._unlock = () => {
      const maybeResume = this.scene?.sound?.context || this.context;
      maybeResume?.resume?.();
      if (this._ensureReady() && this.pendingHum) this.bootHum();
    };
    this.scene.input?.once?.("pointerdown", this._unlock);
    this.scene.input?.keyboard?.once?.("keydown", this._unlock);
    this.scene.sound?.once?.("unlocked", this._unlock);
  }

  _unbindUnlock() {
    if (!this._unlockHandlersBound || !this.scene || !this._unlock) return;
    this.scene.input?.off?.("pointerdown", this._unlock);
    this.scene.input?.keyboard?.off?.("keydown", this._unlock);
    this.scene.sound?.off?.("unlocked", this._unlock);
    this._unlockHandlersBound = false;
  }

  _applyMasterVolume() {
    if (!this.master || !this.context) return;
    const target = this.muted ? 0 : this.masterVolume;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, 0.02);
  }

  _tone(frequency, duration, volume, options = {}) {
    if (!this.context || !this.master) return;
    const now = options.at ?? this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const shaper = this._createWaveShaper(9);

    osc.type = options.type || "triangle";
    osc.frequency.setValueAtTime(Math.max(20, frequency), now);
    if (options.endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + duration);
    }
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(options.filterFrequency || 1900, now);
    filter.Q.setValueAtTime(5, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(this._scaled(volume), now + this.config.beep.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(shaper);
    shaper.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.025);
  }

  _noiseBurst(at, duration, volume, filterStart, filterEnd = null) {
    const noise = this._createNoiseSource(duration);
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterStart, at);
    if (filterEnd) {
      filter.frequency.exponentialRampToValueAtTime(filterEnd, at + duration);
    }
    filter.Q.setValueAtTime(1.2, at);
    gain.gain.setValueAtTime(this._scaled(volume), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(at);
    noise.stop(at + duration + 0.01);
  }

  _createNoiseSource(duration) {
    const rate = this.context.sampleRate;
    const length = Math.max(1, Math.floor(rate * duration));
    const buffer = this.context.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  _createWaveShaper(amount) {
    const shaper = this.context.createWaveShaper();
    const samples = 128;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
    }
    shaper.curve = curve;
    shaper.oversample = "2x";
    return shaper;
  }

  _scaled(value) {
    return Math.max(0.0001, value * this.masterVolume);
  }
}

function mergeConfig(base, override) {
  const out = { ...base, ...override };
  out.hum = { ...base.hum, ...(override.hum || {}) };
  out.beep = {
    ...base.beep,
    ...(override.beep || {}),
    types: { ...base.beep.types, ...(override.beep?.types || {}) },
  };
  out.error = { ...base.error, ...(override.error || {}) };
  out.glitch = { ...base.glitch, ...(override.glitch || {}) };
  return out;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
