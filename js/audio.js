/**
 * 生死烛局 - 增强音效系统（Web Audio API + BGM）
 */

export const GameAudio = {
    ctx: null,
    enabled: true,
    masterGain: null,
    sfxGain: null,
    bgmGain: null,
    sfxVolume: 0.5,
    bgmVolume: 0.5,
    sfxBaseVolume: 0.8,
    bgmBaseVolume: 0.1,

    // BGM 元素
    bgmNormal: null,
    bgmBoss: null,
    currentBGM: null,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxBaseVolume * (this.sfxVolume / 0.5);
            this.sfxGain.connect(this.masterGain);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = this.bgmBaseVolume * (this.bgmVolume / 0.5);
            this.bgmGain.connect(this.masterGain);
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }

        // 绑定 BGM 音频元素
        this.bgmNormal = document.getElementById('bgm-normal');
        this.bgmBoss = document.getElementById('bgm-boss');
        if (this.bgmNormal) {
            this.bgmNormal.loop = true;
            this.bgmNormal.volume = this.bgmBaseVolume * (this.bgmVolume / 0.5);
        }
        if (this.bgmBoss) {
            this.bgmBoss.loop = true;
            this.bgmBoss.volume = this.bgmBaseVolume * (this.bgmVolume / 0.5);
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // ===== 音量控制 =====
    _effectiveSFX() {
        return Math.min(1, this.sfxBaseVolume * (this.sfxVolume / 0.5));
    },

    _effectiveBGM() {
        return Math.min(1, this.bgmBaseVolume * (this.bgmVolume / 0.5));
    },

    setSFXVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain) {
            this.sfxGain.gain.setValueAtTime(this._effectiveSFX(), this.ctx.currentTime);
        }
    },

    setBGMVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, val));
        const effective = this._effectiveBGM();
        if (this.bgmNormal) this.bgmNormal.volume = effective;
        if (this.bgmBoss) this.bgmBoss.volume = effective;
    },

    // ===== BGM 播放 =====
    playBGM(type) {
        if (!this.enabled) return;
        const target = type === 'boss' ? this.bgmBoss : this.bgmNormal;
        const other = type === 'boss' ? this.bgmNormal : this.bgmBoss;
        if (!target) return;

        // 淡出其他音乐
        if (other && !other.paused) {
            this._fadeOut(other, 800);
        }

        // 播放目标音乐
        if (target.paused || this.currentBGM !== target) {
            target.currentTime = 0;
            target.volume = this._effectiveBGM();
            const playPromise = target.play();
            if (playPromise) playPromise.catch(() => {});
            this.currentBGM = target;
        }
    },

    stopBGM() {
        if (this.bgmNormal) { this.bgmNormal.pause(); this.bgmNormal.currentTime = 0; }
        if (this.bgmBoss) { this.bgmBoss.pause(); this.bgmBoss.currentTime = 0; }
        this.currentBGM = null;
    },

    _fadeOut(audioEl, duration) {
        if (!audioEl || audioEl.paused) return;
        const startVol = audioEl.volume;
        const steps = 20;
        const stepTime = duration / steps;
        let step = 0;
        const interval = setInterval(() => {
            step++;
            audioEl.volume = Math.max(0, startVol * (1 - step / steps));
            if (step >= steps) {
                clearInterval(interval);
                audioEl.pause();
                audioEl.volume = startVol;
            }
        }, stepTime);
    },

    // ===== 核心播放 =====
    playTone(freq, duration, type = 'sine', vol = 0.08, delay = 0) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        const effectiveVol = vol * this._effectiveSFX();
        gain.gain.setValueAtTime(effectiveVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain || this.ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
    },

    playChord(freqs, duration, type = 'sine', vol = 0.06) {
        freqs.forEach((f, i) => {
            this.playTone(f, duration, type, vol, i * 0.02);
        });
    },

    // ===== 堆叠递进音效 =====
    playStackSound(stackCount) {
        // stackCount: 放置后该格的总卡牌数
        // 音调随堆叠数递增，带来满足感
        const baseFreq = 440;
        const step = 60; // 每多一张音高提升
        const freq = baseFreq + (stackCount - 1) * step;
        const vol = Math.min(0.12, 0.06 + stackCount * 0.01);

        // 播放一个明亮向上的琶音
        this.playTone(freq, 0.12, 'sine', vol, 0);
        this.playTone(freq * 1.25, 0.1, 'sine', vol * 0.7, 0.04);
        this.playTone(freq * 1.5, 0.14, 'sine', vol * 0.5, 0.08);
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
    },

    playGrow() {
        this.playTone(600, 0.08, 'sine', 0.05);
        setTimeout(() => this.playTone(800, 0.1, 'sine', 0.04), 60);
        setTimeout(() => this.playTone(1000, 0.12, 'sine', 0.03), 120);
    },

    playSlotUpgrade() {
        this.playTone(400, 0.1, 'sine', 0.06);
        setTimeout(() => this.playTone(600, 0.1, 'sine', 0.05), 80);
        setTimeout(() => this.playTone(900, 0.15, 'sine', 0.04), 160);
    },

    playRareCard() {
        this.playChord([523, 659, 784], 0.2, 'sine', 0.05);
        setTimeout(() => this.playChord([659, 784, 1047], 0.3, 'sine', 0.06), 150);
    },

    playTooltip() {
        this.playTone(1200, 0.02, 'sine', 0.015);
    },

    playShuffle() {
        this.playTone(300, 0.06, 'sawtooth', 0.03);
        setTimeout(() => this.playTone(250, 0.06, 'sawtooth', 0.03), 40);
        setTimeout(() => this.playTone(350, 0.06, 'sawtooth', 0.03), 80);
    }
};
