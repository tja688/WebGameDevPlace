/**
 * 卡牌地下城 - 增强音效系统（Web Audio API）
 */

export const GameAudio = {
    ctx: null,
    enabled: true,
    masterGain: null,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.7;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playTone(freq, duration, type = 'sine', vol = 0.08, delay = 0) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
    },

    // 和弦播放
    playChord(freqs, duration, type = 'sine', vol = 0.06) {
        freqs.forEach((f, i) => {
            this.playTone(f, duration, type, vol, i * 0.02);
        });
    },

    playCardPlace() {
        this.playTone(600, 0.1, 'sine', 0.06);
        setTimeout(() => this.playTone(900, 0.08, 'sine', 0.04), 50);
        setTimeout(() => this.playTone(1200, 0.06, 'sine', 0.02), 100);
    },

    playCardInvalid() {
        this.playTone(200, 0.15, 'sawtooth', 0.05);
        setTimeout(() => this.playTone(150, 0.12, 'sawtooth', 0.04), 80);
    },

    playEndTurn() {
        this.playTone(150, 0.3, 'square', 0.08);
        setTimeout(() => this.playTone(100, 0.4, 'square', 0.06), 100);
        setTimeout(() => this.playTone(80, 0.5, 'square', 0.04), 200);
    },

    playDamage() {
        this.playTone(400, 0.1, 'square', 0.06);
        setTimeout(() => this.playTone(300, 0.15, 'square', 0.05), 80);
        setTimeout(() => this.playTone(200, 0.2, 'square', 0.04), 160);
    },

    playMonsterDeath() {
        this.playTone(200, 0.2, 'sawtooth', 0.08);
        setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.06), 100);
        setTimeout(() => this.playTone(100, 0.4, 'sawtooth', 0.04), 200);
        setTimeout(() => this.playTone(60, 0.6, 'sawtooth', 0.03), 300);
    },

    playHeartLoss() {
        this.playTone(300, 0.2, 'sine', 0.08);
        setTimeout(() => this.playTone(200, 0.3, 'sine', 0.06), 100);
        setTimeout(() => this.playTone(150, 0.4, 'sine', 0.04), 200);
    },

    playWin() {
        this.playChord([523, 659, 784, 1047], 0.4, 'sine', 0.06);
        setTimeout(() => this.playChord([659, 784, 1047, 1319], 0.5, 'sine', 0.07), 200);
    },

    playLose() {
        this.playChord([300, 250, 200], 0.5, 'sine', 0.05);
        setTimeout(() => this.playChord([250, 200, 150], 0.6, 'sine', 0.04), 300);
    },

    playHover() {
        this.playTone(800, 0.03, 'sine', 0.02);
    },

    playDrawCard() {
        this.playTone(500, 0.05, 'sine', 0.04);
        setTimeout(() => this.playTone(700, 0.04, 'sine', 0.03), 30);
    },

    playGoldSparkle() {
        this.playChord([1200, 1500, 1800], 0.1, 'sine', 0.03);
    }
};
