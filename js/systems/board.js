/**
 * 卡牌地下城 - 牌桌系统（第二版）
 * 
 * 负责：
 * 1. 卡牌放置规则校验
 * 2. 打出卡牌（触发效果系统）
 * 3. 伤害计算（含计策加成）
 * 4. 放置预览
 */

import { logCombat } from '../core/battle-core.js';
import { FX, EffectContext } from '../effects/core.js';
import { Trigger } from '../core/constants.js';
import { detectStrategy } from './strategy.js';

// ===== 工具函数 =====

export function buildCardSlotMap(state) {
    const map = {};
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            map[card.uuid] = slot.index;
        }
    }
    return map;
}

export function getCardBaseValue(card) {
    return card.baseValue + card.permanentBonus + (card.tempBonus || 0);
}

// ===== 数值计算链（通过效果系统钩子） =====

export function getCardEffectiveValue(card, state) {
    let val = getCardBaseValue(card);
    const ctx = new EffectContext({
        state, trigger: Trigger.ON_CALC_VALUE,
        card, value: val
    });
    FX.fire(Trigger.ON_CALC_VALUE, ctx);
    return ctx.value;
}

export function getCardFinalValue(card, state) {
    let val = getCardEffectiveValue(card, state);
    const ctx = new EffectContext({
        state, trigger: Trigger.ON_CALC_FINAL,
        card, value: val
    });
    FX.fire(Trigger.ON_CALC_FINAL, ctx);
    return ctx.value;
}

export function getSlotEffectiveMultiplier(slot, state) {
    let mul = slot.multiplier + (slot.roundMultiplierBonus || 0);
    const ctx = new EffectContext({
        state, trigger: Trigger.ON_SLOT_CALC,
        slotIndex: slot.index, value: mul
    });
    FX.fire(Trigger.ON_SLOT_CALC, ctx);
    return ctx.value;
}

// ===== 计策加成计算 =====

export function getStrategySlotBonuses(state) {
    const strategy = detectStrategy(state.slots, state.runDataRef?.strategyLevels);
    state.currentStrategy = strategy;
    if (!strategy) return [0, 0, 0];
    return strategy.bonuses;
}

// ===== 伤害计算 =====

export function calculateCardOutput(card, slot, state) {
    const val = getCardFinalValue(card, state);
    const mul = getSlotEffectiveMultiplier(slot, state);
    return val * mul;
}

export function calculateTotalBoardDamage(state) {
    const strategyBonuses = getStrategySlotBonuses(state);
    let total = 0;
    for (const slot of state.slots) {
        let slotMul = getSlotEffectiveMultiplier(slot, state);
        // 应用计策加成
        slotMul += strategyBonuses[slot.index] || 0;
        let slotDamage = 0;
        for (const card of slot.cards) {
            slotDamage += getCardFinalValue(card, state);
        }
        total += slotDamage * slotMul;
    }
    // 额外指数（装备加成等）
    const extraMultiplier = state.runDataRef?.extraMultiplier || 1;
    return total * extraMultiplier;
}

// ===== 放置规则 =====

export function canPlaceCard(card, slot, state) {
    if (card.size > 1) {
        return { ok: false, reason: '多格卡暂未实现' };
    }
    return { ok: true };
}

// ===== 打出卡牌 =====

export function playCardToSlot(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    const check = canPlaceCard(card, slot, state);
    if (!check.ok) {
        logCombat(state, `无法放置: ${check.reason}`);
        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
        return false;
    }

    const handIdx = state.hand.findIndex(c => c.uuid === card.uuid);
    if (handIdx === -1) return false;
    state.hand.splice(handIdx, 1);
    slot.cards.push(card);

    card.hasBeenPlayed = true;

    // 记录本回合第一张打出的牌（用于怪物技能）
    if (!state.firstCardPlayedThisTurn) {
        state.firstCardPlayedThisTurn = card;
    }

    // 怪物技能：第一张打出牌直接进弃牌堆（不触发ON_PLAY）
    if (state.monster.firstCardDiscard && state.firstCardPlayedThisTurn === card) {
        const idx = slot.cards.findIndex(c => c.uuid === card.uuid);
        if (idx !== -1) {
            const discarded = slot.cards.splice(idx, 1)[0];
            state.discard.push(discarded);
            logCombat(state, `${state.monster.name} 的技能生效：第一张打出的 ${discarded.name} 直接进入弃牌堆！`);
            state.slotFlashes.push({ slotIndex, timer: 20 });
            if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
            return true;
        }
    }

    // 触发 ON_PLAY 效果链
    const ctx = new EffectContext({
        state, trigger: Trigger.ON_PLAY,
        card, slotIndex
    });
    FX.fire(Trigger.ON_PLAY, ctx);

    state.slotFlashes.push({ slotIndex, timer: 20 });

    // 视觉特效：卡牌放置火花
    if (typeof FX !== 'undefined') {
        if (!state.pendingPlaceEffects) state.pendingPlaceEffects = [];
        state.pendingPlaceEffects.push({ slotIndex, color: card.accentColor || '#ffd700' });
    }

    if (typeof GameAudio !== 'undefined') {
        const stackCount = slot.cards.length;
        if (stackCount > 1) {
            GameAudio.playStackSound(stackCount);
        } else if (card.rarity === 'gold') {
            GameAudio.playRareCard();
        } else if (card.rarity === 'blue') {
            GameAudio.playGoldSparkle();
        } else {
            GameAudio.playCardPlace();
        }
    }

    // 检测计策变化；条件不满足时必须立刻清空旧计策
    state.currentStrategy = detectStrategy(state.slots, state.runDataRef?.strategyLevels);

    return true;
}

// ===== 放置预览 =====

export function getPlacementPreview(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    const check = canPlaceCard(card, slot, state);
    if (!check.ok) return null;

    // 创建临时状态
    const tempHand = state.hand.filter(c => c.uuid !== card.uuid);
    const tempSlot = {
        ...slot,
        cards: [...slot.cards, card]
    };
    const tempSlots = state.slots.map((s, i) => i === slotIndex ? tempSlot : s);

    const tempState = {
        ...state,
        hand: tempHand,
        slots: tempSlots
    };

    const total = calculateTotalBoardDamage(tempState);

    return {
        cardOutput: getCardFinalValue(card, tempState) * getSlotEffectiveMultiplier(tempSlot, tempState),
        totalDamage: total,
        monsterRemaining: Math.max(0, state.monster.hp - total),
        willKill: total >= state.monster.hp,
        slotMultiplier: getSlotEffectiveMultiplier(tempSlot, tempState)
    };
}
