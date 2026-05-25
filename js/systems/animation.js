/**
 * 卡牌地下城 - 动画引擎（AnimationEngine）
 *
 * 设计哲学：
 * 1. 纯对象、无 class、无 Map/Set —— 纯对象 + 数组 + 函数
 * 2. 逻辑层同步结算，表现层异步队列
 * 3. 消费 effectTimeline，按序播放动画
 * 4. 每个动画命令有明确的 duration + start/update/end 生命周期
 * 5. AI 未来迁移时，直接映射为 C# 的 VisualCommandQueue + IVisualCommand
 */

// ===== 辅助函数 =====

function _getAudio() {
    return (typeof window !== 'undefined' && window.GameAudio) ? window.GameAudio : null;
}

function _getFX() {
    return (typeof window !== 'undefined' && window.RenderFX) ? window.RenderFX : null;
}

function _getSlotCenter(renderer, slotIndex, slotCount = 3) {
    const slotW = 220;
    const slotH = 160;
    const gap = 20;
    const totalW = slotCount * slotW + (slotCount - 1) * gap;
    const startX = (renderer ? renderer.width : 1280) * 0.5 - totalW / 2;
    const startY = 280;
    return {
        x: startX + slotIndex * (slotW + gap) + slotW / 2,
        y: startY + slotH / 2
    };
}

function _getHandPos(renderer, handIndex, handCount) {
    const cardW = 140;
    const cardH = 200;
    const maxWidth = (renderer ? renderer.width : 1280) - 40;
    const defaultGap = 16;
    const totalW = handCount * cardW + (handCount - 1) * defaultGap;
    let gap = defaultGap;
    let startX = ((renderer ? renderer.width : 1280) - totalW) / 2;
    if (totalW > maxWidth) {
        gap = (maxWidth - handCount * cardW) / Math.max(1, handCount - 1);
        startX = 20;
    }
    const startY = 480;
    return {
        x: startX + handIndex * (cardW + gap),
        y: startY,
        cardW,
        cardH
    };
}

function _findCardInHand(state, cardUuid) {
    return state.hand.findIndex(c => c.uuid === cardUuid);
}

// ===== 动画命令注册表 =====

const _animHandlers = {};

function registerAnim(type, handler) {
    _animHandlers[type] = handler;
}

// --- play_card_to_slot: 卡牌放入格子 ---
registerAnim('play_card_to_slot', {
    duration: 0.25,
    start(ev, state, fx, audio) {
        const slotIndex = ev.slotIndex;
        if (!state.slotFlashes) state.slotFlashes = [];
        state.slotFlashes.push({ slotIndex, timer: 20 });

        const slot = state.slots[slotIndex];
        const topCard = slot && slot.cards.length > 0 ? slot.cards[slot.cards.length - 1] : null;
        if (topCard) {
            if (!state.pendingPlaceEffects) state.pendingPlaceEffects = [];
            state.pendingPlaceEffects.push({ slotIndex, color: topCard.accentColor || '#ffd700' });
        }

        if (audio) {
            const stackCount = slot ? slot.cards.length : 1;
            if (stackCount > 1) {
                audio.playStackSound(stackCount);
            } else if (topCard && topCard.rarity === 'gold') {
                audio.playRareCard();
            } else if (topCard && topCard.rarity === 'blue') {
                audio.playGoldSparkle();
            } else {
                audio.playCardPlace();
            }
        }
    }
});

// --- card_discarded_by_monster: 怪物弃牌 ---
registerAnim('card_discarded_by_monster', {
    duration: 0.25,
    start(ev, state, fx, audio) {
        const slotIndex = ev.slotIndex;
        if (!state.slotFlashes) state.slotFlashes = [];
        state.slotFlashes.push({ slotIndex, timer: 20 });
        if (audio) audio.playCardInvalid();
    }
});

// --- draw_card: 从牌库抽牌 ---
registerAnim('draw_card', {
    duration: 0.4,
    start(ev, state, fx, audio) {
        const handIndex = ev.handIndex;
        // 优先使用快照，避免动画期间 state.hand 被修改导致 undefined 或错误引用
        let card = ev.cardSnapshot;
        if (!card || !card.rarity) {
            card = state.hand[handIndex];
        }
        if (!card) return; // 防御性检查：手牌可能已被清空
        if (!state.drawAnimations) state.drawAnimations = [];
        state.drawAnimations.push({
            card: card,
            handIndex: handIndex,
            timer: 40,
            maxTimer: 40,
            delay: 0,
            rotation: (Math.random() - 0.5) * 1.5
        });
        if (audio) audio.playDrawCard();
    }
});

// --- create_card_in_hand: 手牌中生成卡牌（双生/蔓延） ---
registerAnim('create_card_in_hand', {
    duration: 0.35,
    start(ev, state, fx, audio) {
        const cardUuid = ev.cardUuid;
        const handIndex = _findCardInHand(state, cardUuid);
        let card = ev.cardSnapshot;
        if (!card || !card.rarity) {
            card = handIndex >= 0 ? state.hand[handIndex] : null;
        }
        if (card && !state.drawAnimations) state.drawAnimations = [];
        if (card) {
            state.drawAnimations.push({
                card: card,
                handIndex: handIndex >= 0 ? handIndex : (state.hand.length - 1),
                timer: 35,
                maxTimer: 35,
                delay: 0,
                rotation: (Math.random() - 0.5) * 2
            });
        }
        if (audio) audio.playDrawCard();
    }
});

// --- deck_to_hand: 从牌库到手牌（信使） ---
registerAnim('deck_to_hand', {
    duration: 0.35,
    start(ev, state, fx, audio) {
        const cardUuid = ev.cardUuid;
        const handIndex = _findCardInHand(state, cardUuid);
        let card = ev.cardSnapshot;
        if (!card || !card.rarity) {
            card = handIndex >= 0 ? state.hand[handIndex] : null;
        }
        if (card && !state.drawAnimations) state.drawAnimations = [];
        if (card) {
            state.drawAnimations.push({
                card: card,
                handIndex: handIndex >= 0 ? handIndex : (state.hand.length - 1),
                timer: 35,
                maxTimer: 35,
                delay: 0,
                rotation: (Math.random() - 0.5) * 1.5
            });
        }
        if (audio) audio.playDrawCard();
    }
});

// --- card_permanent_bonus: 永久加点（成长等） ---
registerAnim('card_permanent_bonus', {
    duration: 0.3,
    start(ev, state, fx, audio) {
        if (ev.reason === 'grow' || ev.reason === 'center_grow_1') {
            const slotIndex = ev.slotIndex;
            if (slotIndex !== undefined && fx) {
                if (!state.pendingGrowthEffects) state.pendingGrowthEffects = [];
                state.pendingGrowthEffects.push({ slotIndex });
            }
            if (audio) audio.playGrow();
        }
        // 浮动文字提示
        if (fx && fx.floatingText && ev.amount) {
            const slot = state.slots[ev.slotIndex];
            if (slot) {
                const pos = _getSlotCenter(null, ev.slotIndex);
                fx.floatingText.add({
                    x: pos.x,
                    y: pos.y - 20,
                    text: `+${ev.amount}`,
                    color: '#2ecc71',
                    fontSize: 18,
                    vy: -1.5,
                    vx: (Math.random() - 0.5) * 0.5,
                    life: 30
                });
            }
        }
    }
});

// --- card_temp_bonus: 临时加点（奉献等） ---
registerAnim('card_temp_bonus', {
    duration: 0.2,
    start(ev, state, fx, audio) {
        if (fx && fx.floatingText && ev.amount) {
            const slot = state.slots[ev.slotIndex];
            if (slot) {
                const pos = _getSlotCenter(null, ev.slotIndex);
                const isPositive = ev.amount > 0;
                fx.floatingText.add({
                    x: pos.x,
                    y: pos.y - 30,
                    text: isPositive ? `+${ev.amount}` : `${ev.amount}`,
                    color: isPositive ? '#ffd700' : '#e74c3c',
                    fontSize: 16,
                    vy: -1.2,
                    vx: (Math.random() - 0.5) * 0.5,
                    life: 25
                });
            }
        }
    }
});

// --- monster_damage: 怪物受伤 ---
registerAnim('monster_damage', {
    duration: 0.5,
    start(ev, state, fx, audio) {
        const amount = ev.amount;
        state.monsterFlash = 15;
        if (audio && amount > 0) audio.playDamage();
        if (fx && amount > 0) {
            const mx = 640;
            const my = 120;
            const isCrit = amount >= (state.monster.maxHp * 0.3);
            fx.spawnDamage(mx, my, amount, isCrit);
            const overflow = Math.max(0, amount - ev.hpBefore);
            const intensity = Math.min(18, 3 + overflow * 0.15);
            const decay = Math.max(0.75, 0.92 - overflow * 0.002);
            fx.screenShake.trigger(intensity, decay);
        }
    }
});

// --- monster_dodge: 怪物闪避 ---
registerAnim('monster_dodge', {
    duration: 0.3,
    start(ev, state, fx, audio) {
        if (fx && fx.floatingText) {
            fx.floatingText.add({
                x: 640,
                y: 100,
                text: '闪避!',
                color: '#95a5a6',
                fontSize: 20,
                vy: -1.5,
                life: 30
            });
        }
    }
});

// --- player_heart_loss: 失去人群 ---
registerAnim('player_heart_loss', {
    duration: 0.5,
    start(ev, state, fx, audio) {
        if (audio) audio.playHeartLoss();
        if (fx) {
            const heartX = 50 + (ev.heartsAfter + 1) * 36 + 15;
            fx.spawnHeartBreak(heartX, 155);
        }
    }
});

// --- battle_result: 战斗结果 ---
registerAnim('battle_result', {
    duration: 1.0,
    start(ev, state, fx, audio) {
        if (ev.result === 'win') {
            if (fx) fx.spawnVictory(640, 120);
            if (audio) audio.playMonsterDeath();
        }
    }
});

// --- turn_end_start: 回合结束 ---
registerAnim('turn_end_start', {
    duration: 0.15,
    start(ev, state, fx, audio) {
        if (audio) audio.playEndTurn();
    }
});

// --- strategy_detected: 计策触发 ---
registerAnim('strategy_detected', {
    duration: 0.5,
    start(ev, state, fx, audio) {
        if (fx && fx.floatingText) {
            fx.floatingText.add({
                x: 640,
                y: 260,
                text: ev.strategyName || '计策触发!',
                color: '#e67e22',
                fontSize: 22,
                vy: -1.5,
                life: 40
            });
        }
    }
});

// --- monster_heal: 怪物恢复 ---
registerAnim('monster_heal', {
    duration: 0.3,
    start(ev, state, fx, audio) {
        if (fx && fx.floatingText) {
            fx.floatingText.add({
                x: 640,
                y: 80,
                text: `+${ev.amount}`,
                color: '#2ecc71',
                fontSize: 18,
                vy: -1.2,
                life: 30
            });
        }
    }
});

// --- monster_strategy_penalty: 怪物计策惩罚 ---
registerAnim('monster_strategy_penalty', {
    duration: 0.3,
    start(ev, state, fx, audio) {
        if (fx && fx.floatingText) {
            fx.floatingText.add({
                x: 640,
                y: 260,
                text: `惩罚 ${ev.amount}`,
                color: '#e74c3c',
                fontSize: 18,
                vy: -1.2,
                life: 30
            });
        }
    }
});

// --- card_keyword_added: 关键词添加 ---
registerAnim('card_keyword_added', {
    duration: 0.3,
    start(ev, state, fx, audio) {
        if (fx && fx.floatingText) {
            const handIndex = _findCardInHand(state, ev.cardUuid);
            if (handIndex >= 0) {
                const layout = _getHandPos(null, handIndex, state.hand.length);
                fx.floatingText.add({
                    x: layout.x + 70,
                    y: layout.y,
                    text: `+${ev.keyword}`,
                    color: '#9b59b6',
                    fontSize: 16,
                    vy: -1.5,
                    life: 30
                });
            }
        }
    }
});

// --- slot_round_multiplier_bonus: 倍率格加成 ---
registerAnim('slot_round_multiplier_bonus', {
    duration: 0.2,
    start(ev, state, fx, audio) {
        if (fx && fx.floatingText) {
            const pos = _getSlotCenter(null, ev.slotIndex);
            fx.floatingText.add({
                x: pos.x,
                y: pos.y - 50,
                text: `倍率+${ev.amount}`,
                color: '#3498db',
                fontSize: 16,
                vy: -1.2,
                life: 25
            });
        }
    }
});

// --- slot_flag_enabled: 标记启用 ---
registerAnim('slot_flag_enabled', {
    duration: 0.2,
    start(ev, state, fx, audio) {
        if (!state.slotFlashes) state.slotFlashes = [];
        state.slotFlashes.push({ slotIndex: ev.slotIndex, timer: 15 });
    }
});

// ===== 动画引擎核心 =====

export const AnimationEngine = {
    _queue: [],
    _current: null,
    _elapsed: 0,
    _isPlaying: false,
    _speed: 1.0,
    _lastSeq: 0,

    get isLocked() {
        return this._isPlaying;
    },

    setSpeed(s) {
        this._speed = Math.max(0.1, s);
    },

    skip() {
        while (this._queue.length > 0) {
            const cmd = this._queue.shift();
            if (cmd.handler && cmd.handler.end) {
                cmd.handler.end(cmd.payload, null, null, null);
            }
        }
        if (this._current && this._current.handler && this._current.handler.end) {
            this._current.handler.end(this._current.payload, null, null, null);
        }
        this._current = null;
        this._isPlaying = false;
        this._elapsed = 0;
        if (typeof window !== 'undefined' && window.gameState) {
            window.gameState.turnTransitioning = false;
        }
    },

    clear() {
        this._queue = [];
        this._current = null;
        this._elapsed = 0;
        this._isPlaying = false;
        if (typeof window !== 'undefined' && window.gameState) {
            window.gameState.turnTransitioning = false;
        }
    },

    reset() {
        this.clear();
        this._lastSeq = 0;
    },

    /**
     * 从 state.effectTimeline 增量加载新事件到播放队列
     */
    enqueueFromTimeline(state) {
        if (!state || !state.effectTimeline) return;
        const newEvents = state.effectTimeline.filter(e => e.seq > this._lastSeq);
        if (newEvents.length === 0) return;

        newEvents.sort((a, b) => a.seq - b.seq);

        for (const ev of newEvents) {
            const handler = _animHandlers[ev.type];
            if (handler) {
                this._queue.push({
                    type: ev.type,
                    payload: ev,
                    duration: handler.duration || 0,
                    handler
                });
            }
            this._lastSeq = Math.max(this._lastSeq, ev.seq);
        }

        if (!this._isPlaying && this._queue.length > 0) {
            this._isPlaying = true;
            this._startNext(state);
        }
    },

    _startNext(state) {
        if (this._queue.length === 0) {
            this._isPlaying = false;
            this._current = null;
            this._elapsed = 0;
            if (state) state.turnTransitioning = false;
            return;
        }
        this._current = this._queue.shift();
        this._elapsed = 0;
        const audio = _getAudio();
        const fx = _getFX();
        if (this._current.handler.start) {
            this._current.handler.start(this._current.payload, state, fx, audio);
        }
    },

    /**
     * 主循环每帧调用
     * @param {object} state - 游戏状态
     * @param {number} dt - 秒（如 1/60 ≈ 0.0167）
     */
    update(state, dt) {
        if (!this._isPlaying || !this._current) return;

        this._elapsed += dt * this._speed;
        const duration = this._current.duration || 0;
        const progress = duration > 0 ? Math.min(1, this._elapsed / duration) : 1;

        const audio = _getAudio();
        const fx = _getFX();
        if (this._current.handler.update) {
            this._current.handler.update(this._current.payload, state, fx, audio, progress);
        }

        if (progress >= 1) {
            if (this._current.handler.end) {
                this._current.handler.end(this._current.payload, state, fx, audio);
            }
            this._startNext(state);
        }
    }
};
