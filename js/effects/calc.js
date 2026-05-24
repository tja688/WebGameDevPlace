/**
 * 卡牌地下城 - 数值计算效果 (ON_CALC_VALUE / ON_CALC_FINAL)（第二版）
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// ===== ON_CALC_VALUE：计算有效点数（光环、加成阶段） =====

// 合群（social）：相邻格每有一张其他卡牌+1
FX.register(new EffectHandler({
    id: 'social_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 2,
    condition: (ctx) => {
        if (!ctx.card) return false;
        if (!ctx.card.keywords.includes('social')) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return true;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        let bonus = 0;
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                const others = slot.cards.filter(c => c.uuid !== ctx.card.uuid).length;
                bonus += others;
            }
        }
        if (bonus > 0) {
            ctx.value += bonus;
        }
    }
}));

// 齐心（unison）：同格每有一张其他卡牌+1
FX.register(new EffectHandler({
    id: 'unison_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 3,
    condition: (ctx) => {
        if (!ctx.card) return false;
        if (!ctx.card.keywords.includes('unison')) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return true;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        const slot = ctx.state.slots[targetSlot];
        const others = slot.cards.filter(c => c.uuid !== ctx.card.uuid).length;
        if (others > 0) {
            ctx.value += others;
        }
    }
}));

// ===== ON_CALC_FINAL：计算最终点数（翻倍、惩罚阶段） =====

// 伟力（mighty）：将本牌点数翻倍
FX.register(new EffectHandler({
    id: 'mighty',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY,
    condition: (ctx) => ctx.card.keywords.includes('mighty'),
    execute: (ctx) => {
        ctx.value *= 2;
    }
}));

// 最左最右格-5（怪物技能）
FX.register(new EffectHandler({
    id: 'edge_penalty_5',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY + 1,
    condition: (ctx) => {
        if (ctx.state.monster.edgePenalty !== 5) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return targetSlot === 0 || targetSlot === 2;
    },
    execute: (ctx) => {
        ctx.value -= 5;
        if (ctx.value < 0) ctx.value = 0;
    }
}));

// 最左格-10（怪物技能）
FX.register(new EffectHandler({
    id: 'left_penalty_10',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY + 2,
    condition: (ctx) => {
        if (ctx.state.monster.leftPenalty !== 10) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return targetSlot === 0;
    },
    execute: (ctx) => {
        ctx.value -= 10;
        if (ctx.value < 0) ctx.value = 0;
    }
}));

// 数值最高倍率格-1（怪物技能）
FX.register(new EffectHandler({
    id: 'max_slot_penalty',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER - 5,
    condition: (ctx) => ctx.state.monster.maxSlotPenalty > 0,
    execute: (ctx) => {
        const slots = ctx.state.slots;
        let maxMul = -1;
        let maxIdx = -1;
        for (const s of slots) {
            const mul = s.multiplier + (s.roundMultiplierBonus || 0);
            if (mul > maxMul) {
                maxMul = mul;
                maxIdx = s.index;
            }
        }
        if (ctx.slotIndex === maxIdx) {
            ctx.value -= ctx.state.monster.maxSlotPenalty;
        }
    }
}));

// 数值最低倍率格-1（怪物技能）
FX.register(new EffectHandler({
    id: 'min_slot_penalty',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER - 5,
    condition: (ctx) => ctx.state.monster.minSlotPenalty > 0,
    execute: (ctx) => {
        const slots = ctx.state.slots;
        let minMul = Infinity;
        let minIdx = -1;
        for (const s of slots) {
            const mul = s.multiplier + (s.roundMultiplierBonus || 0);
            if (mul < minMul) {
                minMul = mul;
                minIdx = s.index;
            }
        }
        if (ctx.slotIndex === minIdx) {
            ctx.value -= ctx.state.monster.minSlotPenalty;
        }
    }
}));

// 每回合第一张打出牌点数-5（怪物技能）
FX.register(new EffectHandler({
    id: 'first_card_value_penalty',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY + 3,
    condition: (ctx) => {
        if (ctx.state.monster.firstCardValuePenalty <= 0) return false;
        if (!ctx.card) return false;
        return ctx.card === ctx.state.firstCardPlayedThisTurn;
    },
    execute: (ctx) => {
        ctx.value -= ctx.state.monster.firstCardValuePenalty;
        if (ctx.value < 0) ctx.value = 0;
    }
}));
