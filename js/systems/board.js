/**
 * 卡牌地下城 - 牌桌系统
 * 
 * 负责：
 * 1. 卡牌放置规则校验
 * 2. 打出卡牌（触发效果系统）
 * 3. 伤害计算
 * 4. 放置预览
 */

import { logCombat } from '../core/battle-core.js';
import { FX, EffectContext } from '../effects/core.js';
import { Trigger } from '../core/constants.js';

// ===== 工具函数 =====

export function buildCardSlotMap(state) {
    const map = new Map();
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            map.set(card.uuid, slot.index);
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

// ===== 伤害计算 =====

export function calculateCardOutput(card, slot, state) {
    const val = getCardFinalValue(card, state);
    const mul = getSlotEffectiveMultiplier(slot, state);
    return val * mul;
}

export function calculateTotalBoardDamage(state) {
    let total = 0;
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            total += calculateCardOutput(card, slot, state);
        }
    }
    return total;
}

// ===== 放置规则 =====

export function canPlaceCard(card, slot, state) {
    if (!slot.available) {
        return { ok: false, reason: '该格子尚未解锁' };
    }
    if (card.size > 1) {
        return { ok: false, reason: '多格卡暂未实现' };
    }
    if (slot.cards.length === 0) {
        return { ok: true };
    }
    const topCard = slot.cards[slot.cards.length - 1];
    if (topCard.keywords.includes('stack')) {
        return { ok: true };
    }
    return { ok: false, reason: '该格子已被锁定' };
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

    // 触发 ON_PLAY 效果链
    const ctx = new EffectContext({
        state, trigger: Trigger.ON_PLAY,
        card, slotIndex
    });
    FX.fire(Trigger.ON_PLAY, ctx);

    card.hasBeenPlayed = true;
    state.slotFlashes.push({ slotIndex, timer: 20 });

    // 视觉特效：卡牌放置火花
    if (typeof FX !== 'undefined') {
        const slot = state.slots[slotIndex];
        const sx = slot.index * 240 + 120 + 140; // 近似屏幕坐标，由渲染层处理实际位置
        // 由于坐标系不一致，我们在渲染层根据 slotFlashes 来生成粒子
        // 这里先标记需要生成粒子
        if (!state.pendingPlaceEffects) state.pendingPlaceEffects = [];
        state.pendingPlaceEffects.push({ slotIndex, color: card.accentColor || '#ffd700' });
    }

    if (typeof GameAudio !== 'undefined') {
        const stackCount = slot.cards.length;
        if (stackCount > 1) {
            // 堆叠递进音效
            GameAudio.playStackSound(stackCount);
        } else if (card.rarity === 'gold') {
            GameAudio.playRareCard();
        } else if (card.rarity === 'blue') {
            GameAudio.playGoldSparkle();
        } else {
            GameAudio.playCardPlace();
        }
    }
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
        cards: [...slot.cards, card],
        multiplier: slot.multiplier + (card.defId === 'maintain_gear' ? 1 : 0)
    };
    const tempSlots = state.slots.map((s, i) => i === slotIndex ? tempSlot : s);

    const tempState = {
        ...state,
        hand: tempHand,
        slots: tempSlots
    };

    const val = getCardFinalValue(card, tempState);
    const effMul = getSlotEffectiveMultiplier(tempSlot, tempState);
    const output = val * effMul;
    const total = calculateTotalBoardDamage(tempState);

    return {
        cardOutput: output,
        totalDamage: total,
        monsterRemaining: Math.max(0, state.monster.hp - total),
        willKill: total >= state.monster.hp,
        slotMultiplier: effMul
    };
}
