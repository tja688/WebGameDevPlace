// Web Audio API 音效与音乐管理

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmOscillators = [];
    this.bgmInterval = null;
    this.muted = false;
    this.bgmPlaying = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.25;
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.4;
    this.sfxGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(v) {
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setBgmVolume(v) {
    if (this.bgmGain) this.bgmGain.gain.value = v;
  }

  setSfxVolume(v) {
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.5;
    }
    return this.muted;
  }

  // BGM: Airship Serenity 风格 —— 缓慢、空灵的琶音氛围
  startBgm() {
    this.init();
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;

    const notes = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00]; // G3-A3-C4-D4-E4-G4
    let noteIndex = 0;

    const playNote = () => {
      if (!this.bgmPlaying || this.muted) return;
      const freq = notes[noteIndex % notes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.5);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 4);
      this.bgmOscillators.push(osc);
      noteIndex++;
    };

    playNote();
    this.bgmInterval = setInterval(playNote, 1800);
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    for (const osc of this.bgmOscillators) {
      try { osc.stop(); } catch {}
    }
    this.bgmOscillators = [];
  }

  // 音效生成
  playTone(freq, type = 'sine', duration = 0.15, volume = 0.3) {
    this.init();
    if (this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playFlipCard() {
    this.playTone(440, 'sine', 0.12, 0.2);
  }

  playDrag() {
    this.playTone(330, 'triangle', 0.08, 0.15);
  }

  playDrop() {
    this.playTone(220, 'sine', 0.1, 0.2);
  }

  playAttack() {
    this.playTone(150, 'sawtooth', 0.15, 0.15);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.2, 0.1), 80);
  }

  playHit() {
    this.playTone(80, 'square', 0.2, 0.2);
  }

  playHeal() {
    this.playTone(523, 'sine', 0.2, 0.2);
    setTimeout(() => this.playTone(659, 'sine', 0.25, 0.15), 100);
  }

  playPickUp() {
    this.playTone(880, 'sine', 0.1, 0.15);
    setTimeout(() => this.playTone(1100, 'sine', 0.15, 0.1), 60);
  }

  playVictory() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.4, 0.15), i * 120);
    });
  }

  playDefeat() {
    [300, 250, 200, 150].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.4, 0.12), i * 150);
    });
  }

  playStep() {
    this.playTone(260, 'sine', 0.06, 0.1);
  }

  playTrapTrigger() {
    this.playTone(600, 'square', 0.3, 0.15);
    setTimeout(() => this.playTone(300, 'sawtooth', 0.4, 0.15), 100);
  }
}

export const audio = new AudioManager();
