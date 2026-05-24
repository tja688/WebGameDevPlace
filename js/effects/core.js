/**
 * 卡牌地下城 - 效果系统核心（重构版）
 *
 * 设计哲学：
 * 1. 无 class、无 Map、无 Set —— 纯对象 + 数组 + 函数
 * 2. 所有效果处理器为纯对象：{ id, triggers, priority, condition, execute }
 * 3. 效果上下文为纯对象，通过工厂函数创建
 * 4. 注册表为普通对象：{ [trigger]: handler[] }
 * 5. AI 未来迁移时，可直接翻译为 C# 的 Dictionary + switch + struct
 */

import { Trigger } from '../core/constants.js';

// ===== 全局注册表（纯对象） =====
const _handlers = [];
const _triggerMap = {};

/**
 * 注册一个效果处理器
 * @param {object} handler - { id, triggers, priority, condition, execute }
 */
export function registerEffect(handler) {
    if (!handler || !handler.id) {
        console.warn('[EffectSystem] 注册失败：handler 缺少 id');
        return;
    }
    // 防重复：同名 id 覆盖旧注册
    const existingIndex = _handlers.findIndex(h => h.id === handler.id);
    if (existingIndex !== -1) {
        const oldHandler = _handlers[existingIndex];
        // 从旧 triggerMap 中移除
        for (const t of oldHandler.triggers) {
            const arr = _triggerMap[t];
            if (arr) {
                const idx = arr.indexOf(oldHandler);
                if (idx !== -1) arr.splice(idx, 1);
            }
        }
        _handlers.splice(existingIndex, 1);
    }

    const normalized = {
        id: handler.id,
        triggers: Array.isArray(handler.triggers) ? handler.triggers : [handler.triggers],
        priority: handler.priority ?? 500,
        condition: handler.condition || (() => true),
        execute: handler.execute || (() => {})
    };

    _handlers.push(normalized);
    for (const t of normalized.triggers) {
        if (!_triggerMap[t]) _triggerMap[t] = [];
        _triggerMap[t].push(normalized);
    }
}

/**
 * 触发指定时机的所有效果
 * @param {string} trigger - 触发时机常量
 * @param {object} ctx - 效果上下文（纯对象）
 */
export function fireEffects(trigger, ctx) {
    const handlers = (_triggerMap[trigger] || [])
        .filter(h => h.condition(ctx))
        .sort((a, b) => a.priority - b.priority);

    for (const h of handlers) {
        if (ctx.cancelled) break;
        h.execute(ctx);
    }

    // 回响：ON_PLAY 时，若卡牌有 echo 词条，效果再触发一次
    if (trigger === Trigger.ON_PLAY && ctx.card && ctx.card.keywords.includes('echo')) {
        for (const h of handlers) {
            if (ctx.cancelled) break;
            h.execute(ctx);
        }
    }
}

/**
 * 获取某张卡牌应触发的所有效果ID（基于关键词和专属效果）
 * @param {object} card - 卡牌实例（纯对象）
 * @returns {string[]}
 */
export function getCardEffectIds(card) {
    const ids = [];
    for (const kw of card.keywords || []) {
        ids.push(kw);
    }
    if (card.extraEffects) {
        ids.push(...card.extraEffects);
    }
    // defId 作为专属效果标识（如果存在对应处理器）
    const hasHandler = _handlers.some(h => h.id === card.defId);
    if (hasHandler) {
        ids.push(card.defId);
    }
    return [...new Set(ids)];
}

// ===== 效果上下文工厂函数 =====

export function createEffectContext({
    state,
    trigger,
    card = null,
    slotIndex = -1,
    targetCard = null,
    targetSlotIndex = -1,
    amount = 0,
    value = 0,
    extra = {}
} = {}) {
    return {
        state,
        trigger,
        card,
        slotIndex,
        targetCard,
        targetSlotIndex,
        amount,
        value,
        extra,
        results: [],
        cancelled: false,

        /** 快捷日志 */
        log(msg) {
            if (this.state && this.state.combatLog) {
                const turn = this.state.turn || 0;
                this.state.combatLog.push(`[T${turn}] ${msg}`);
                if (this.state.combatLog.length > 50) this.state.combatLog.shift();
            }
        },

        /** 获取卡牌当前所在格子索引 */
        getCardSlotIndex(targetCard = this.card) {
            if (!targetCard) return -1;
            for (const slot of this.state.slots) {
                if (slot.cards.some(c => c.uuid === targetCard.uuid)) {
                    return slot.index;
                }
            }
            return -1;
        },

        /** 获取某张牌的基础值（含永久/临时加成） */
        getCardBaseValue(targetCard = this.card) {
            if (!targetCard) return 0;
            return targetCard.baseValue + targetCard.permanentBonus + (targetCard.tempBonus || 0);
        },

        /** 获取所有在牌桌上的卡牌 */
        getBoardCards() {
            return this.state.slots.flatMap(s => s.cards);
        },

        /** 构建卡牌到格子的映射表 */
        buildCardSlotMap() {
            const map = {};
            for (const slot of this.state.slots) {
                for (const card of slot.cards) {
                    map[card.uuid] = slot.index;
                }
            }
            return map;
        },

        /** 获取相邻格子 */
        getAdjacentSlots(centerIndex) {
            const results = [];
            if (centerIndex > 0) results.push(this.state.slots[centerIndex - 1]);
            if (centerIndex < this.state.slots.length - 1) results.push(this.state.slots[centerIndex + 1]);
            return results;
        },

        /** 获取某格最上方的卡牌 */
        getTopCard(slotIndex) {
            const slot = this.state.slots[slotIndex];
            if (!slot || slot.cards.length === 0) return null;
            return slot.cards[slot.cards.length - 1];
        },

        /** 从牌组中查找指定条件的卡牌 */
        findCardsInDeck(predicate) {
            return this.state.deck.filter(predicate);
        },

        /** 从手牌中移除指定卡牌 */
        removeFromHand(card) {
            const idx = this.state.hand.findIndex(c => c.uuid === card.uuid);
            if (idx !== -1) {
                this.state.hand.splice(idx, 1);
                return true;
            }
            return false;
        },

        /** 将卡牌放入弃牌堆 */
        moveToDiscard(card) {
            this.state.discard.push(card);
        },

        /** 将卡牌放回牌组 */
        moveToDeck(card) {
            this.state.deck.push(card);
        }
    };
}

// ===== 兼容旧接口（类名改为工厂函数） =====

/** @deprecated 使用 createEffectContext 或直接传入纯对象 */
export function EffectContext(props) {
    return createEffectContext(props);
}

/** @deprecated 直接传入纯对象即可 */
export function EffectHandler(props) {
    return {
        id: props.id,
        triggers: Array.isArray(props.triggers) ? props.triggers : [props.triggers],
        priority: props.priority ?? 500,
        condition: props.condition || (() => true),
        execute: props.execute || (() => {})
    };
}

/** @deprecated 使用 { fire: fireEffects, register: registerEffect } */
export function EffectSystem() {
    return FX;
}

/** 全局效果系统实例（纯对象） */
export const FX = {
    fire: fireEffects,
    register: registerEffect
};

// ===== 成长数值计算（训练体系） =====

export function calculateGrowAmount(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    if (!slot) return 0;

    let amount = card.keywords.includes('grow') ? (card.growAmount || 1) : 0;

    // 集体训练：后续同格卡牌获得成长2
    if (slot.groupTrainingActive) {
        amount = Math.max(amount, 2);
    }

    if (amount <= 0) return 0;

    const triggerAmount = amount;

    // 猛训练：后续同格卡牌的成长效果多触发一次
    if (slot.intenseTrainingActive) {
        amount += triggerAmount;
    }

    // 训练痕迹：相邻倍率格卡牌的成长效果多触发一次
    const adjacentSlots = state.slots.filter(s => Math.abs(s.index - slotIndex) === 1);
    for (const adjacent of adjacentSlots) {
        if (adjacent.cards.some(c => c.defId === 'training_trace')) {
            amount += triggerAmount;
        }
    }

    return amount;
}
