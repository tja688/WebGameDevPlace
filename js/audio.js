/**
 * 卡牌地下城 - 简单音效系统（Web Audio API）
 */

export const GameAudio = {
    ctx: null,
    enabled: true,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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

    playTone(freq, duration, type = 'sine', vol = 0.08) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playCardPlace() {
        // 清脆的放置音
        this.playTone(600, 0.1, 'sine', 0.06);
        setTimeout(() => this.playTone(900, 0.08, 'sine', 0.04), 50);
    },

    playCardInvalid() {
        // 低沉的错误音
        this.playTone(200, 0.15, 'sawtooth', 0.05);
    },

    playEndTurn() {
        // 沉重的鼓声
        this.playTone(150, 0.3, 'square', 0.08);
        setTimeout(() => this.playTone(100, 0.4, 'square', 0.06), 100);
    },

    playDamage() {
        // 打击音效
        this.playTone(400, 0.1, 'square', 0.06);
        setTimeout(() => this.playTone(300, 0.15, 'square', 0.05), 80);
    },

    playHeartLoss() {
        // 心碎音效
        this.playTone(300, 0.2, 'sine', 0.08);
        setTimeout(() => this.playTone(200, 0.3, 'sine', 0.06), 100);
        setTimeout(() => this.playTone(150, 0.4, 'sine', 0.04), 200);
    },

    playWin() {
        // 胜利和弦
        this.playTone(523, 0.2, 'sine', 0.06);
        setTimeout(() => this.playTone(659, 0.2, 'sine', 0.06), 100);
        setTimeout(() => this.playTone(784, 0.2, 'sine', 0.06), 200);
        setTimeout(() => this.playTone(1047, 0.4, 'sine', 0.08), 300);
    },

    playLose() {
        // 失败低音
        this.playTone(300, 0.3, 'sine', 0.06);
        setTimeout(() => this.playTone(250, 0.3, 'sine', 0.05), 200);
        setTimeout(() => this.playTone(200, 0.5, 'sine', 0.04), 400);
    }
};
