/**
 * 卡牌地下城 - 效果系统核心
 * 
 * 设计哲学：
 * 1. 所有卡牌效果都通过"触发时机(Trigger) + 效果处理器(Handler)"模型实现
 * 2. 新增效果只需：定义处理器 → 注册到系统 → 在卡牌定义中关联关键词或效果ID
 * 3. 效果之间通过 EffectContext 共享状态，完全解耦
 */

import { Trigger } from '../core/constants.js';

/**
 * 效果上下文 - 每次触发效果时传递的上下文对象
 * 包含效果执行所需的全部信息，效果处理器通过此对象读取和修改游戏状态
 */
export class EffectContext {
    constructor({
        state,
        trigger,
        card = null,           // 当前触发效果的卡牌
        slotIndex = -1,        // 当前格子索引
        targetCard = null,     // 目标卡牌（如给相邻牌加点数）
        targetSlotIndex = -1,  // 目标格子索引
        amount = 0,            // 通用数值参数
        value = 0,             // 计算链中的当前数值
        extra = {}             // 扩展字段，用于特殊需求
    } = {}) {
        this.state = state;
        this.trigger = trigger;
        this.card = card;
        this.slotIndex = slotIndex;
        this.targetCard = targetCard;
        this.targetSlotIndex = targetSlotIndex;
        this.amount = amount;
        this.value = value;
        this.extra = extra;
        this.results = [];     // 效果执行结果日志
        this.cancelled = false; // 是否取消后续操作
    }

    /** 快捷日志 */
    log(msg) {
        if (this.state && this.state.combatLog) {
            const turn = this.state.turn || 0;
            this.state.combatLog.push(`[T${turn}] ${msg}`);
            if (this.state.combatLog.length > 50) this.state.combatLog.shift();
        }
    }

    /** 获取卡牌当前所在格子索引（从牌桌映射中查找） */
    getCardSlotIndex(targetCard = this.card) {
        if (!targetCard) return -1;
        for (const slot of this.state.slots) {
            if (slot.cards.some(c => c.uuid === targetCard.uuid)) {
                return slot.index;
            }
        }
        return -1;
    }

    /** 获取某张牌的基础值（含永久/临时加成） */
    getCardBaseValue(targetCard = this.card) {
        if (!targetCard) return 0;
        return targetCard.baseValue + targetCard.permanentBonus + (targetCard.tempBonus || 0);
    }

    /** 获取所有在牌桌上的卡牌 */
    getBoardCards() {
        return this.state.slots.flatMap(s => s.cards);
    }

    /** 构建卡牌到格子的映射表 */
    buildCardSlotMap() {
        const map = new Map();
        for (const slot of this.state.slots) {
            for (const card of slot.cards) {
                map.set(card.uuid, slot.index);
            }
        }
        return map;
    }

    /** 获取相邻格子 */
    getAdjacentSlots(centerIndex) {
        const results = [];
        if (centerIndex > 0) results.push(this.state.slots[centerIndex - 1]);
        if (centerIndex < this.state.slots.length - 1) results.push(this.state.slots[centerIndex + 1]);
        return results;
    }

    /** 获取某格最上方的卡牌 */
    getTopCard(slotIndex) {
        const slot = this.state.slots[slotIndex];
        if (!slot || slot.cards.length === 0) return null;
        return slot.cards[slot.cards.length - 1];
    }

    /** 从牌组中查找指定条件的卡牌 */
    findCardsInDeck(predicate) {
        return this.state.deck.filter(predicate);
    }

    /** 从手牌中移除指定卡牌 */
    removeFromHand(card) {
        const idx = this.state.hand.findIndex(c => c.uuid === card.uuid);
        if (idx !== -1) {
            this.state.hand.splice(idx, 1);
            return true;
        }
        return false;
    }

    /** 将卡牌放入弃牌堆 */
    moveToDiscard(card) {
        this.state.discard.push(card);
    }

    /** 将卡牌放回牌组 */
    moveToDeck(card) {
        this.state.deck.push(card);
    }
}

/**
 * 效果处理器定义
 */
export class EffectHandler {
    constructor({
        id,
        triggers = [],
        priority = 500,
        condition = null,      // (ctx) => boolean
        execute                // (ctx) => void
    }) {
        this.id = id;
        this.triggers = Array.isArray(triggers) ? triggers : [triggers];
        this.priority = priority;
        this.condition = condition || (() => true);
        this.execute = execute;
    }

    canTrigger(ctx) {
        return this.condition(ctx);
    }
}

/**
 * 效果系统 - 单例，管理所有效果处理器并负责触发
 */
export class EffectSystem {
    constructor() {
        /** @type {Map<string, EffectHandler>} */
        this.handlers = new Map();
        /** @type {Map<string, string[]>} trigger -> handlerId[] */
        this.triggerMap = new Map();
    }

    /** 注册一个效果处理器 */
    register(handler) {
        if (this.handlers.has(handler.id)) {
            console.warn(`EffectHandler ${handler.id} already registered, overwriting`);
        }
        this.handlers.set(handler.id, handler);
        for (const trigger of handler.triggers) {
            if (!this.triggerMap.has(trigger)) {
                this.triggerMap.set(trigger, []);
            }
            this.triggerMap.get(trigger).push(handler.id);
        }
    }

    /** 触发指定时机的所有效果 */
    fire(trigger, ctx) {
        const ids = this.triggerMap.get(trigger) || [];
        const handlers = ids
            .map(id => this.handlers.get(id))
            .filter(h => h && h.canTrigger(ctx));
        
        handlers.sort((a, b) => a.priority - b.priority);
        
        for (const h of handlers) {
            if (ctx.cancelled) break;
            h.execute(ctx);
        }
    }

    /** 获取某张卡牌应触发的所有效果ID（基于关键词和专属效果） */
    getCardEffectIds(card) {
        // 基础：关键词映射到效果ID
        const ids = [];
        for (const kw of card.keywords) {
            ids.push(kw);
        }
        // 卡牌定义的专属效果
        if (card.extraEffects) {
            ids.push(...card.extraEffects);
        }
        // defId 作为专属效果标识（如果存在对应处理器）
        if (this.handlers.has(card.defId)) {
            ids.push(card.defId);
        }
        return [...new Set(ids)];
    }
}

/** 全局效果系统实例 */
export const FX = new EffectSystem();
