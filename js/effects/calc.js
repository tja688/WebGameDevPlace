/**
 * 卡牌地下城 - 数值计算效果 (ON_CALC_VALUE / ON_CALC_FINAL)（第二版）
 */

import { EffectHandler, FX, EffectContext } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { getCardEffectiveValue } from '../systems/board.js';

// ===== ON_CALC_VALUE：计算有效点数（光环、加成阶段） =====

// 佯攻（feint）：相邻卡牌+2
FX.register(new EffectHandler({
    id: 'feint_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA,
    condition: (ctx) => {
        if (!ctx.card) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                if (slot.cards.some(c => c.defId === 'feint')) return true;
            }
        }
        return false;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                if (slot.cards.some(c => c.defId === 'feint')) {
                    ctx.value += 2;
                }
            }
        }
    }
}));

// 训练技巧（hone_skill）：相邻两侧倍率格卡牌点数+3
FX.register(new EffectHandler({
    id: 'hone_skill_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 1,
    condition: (ctx) => {
        if (!ctx.card) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                if (slot.cards.some(c => c.defId === 'hone_skill')) return true;
            }
        }
        return false;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                if (slot.cards.some(c => c.defId === 'hone_skill')) {
                    ctx.value += 3;
                }
            }
        }
    }
}));

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
                // 只计算其他卡牌（不包括自己）
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

// 伟力（mighty）：若场上无更大点数牌，翻倍
FX.register(new EffectHandler({
    id: 'mighty',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY,
    condition: (ctx) => ctx.card.keywords.includes('mighty') && !ctx.extra?.mightyComparing,
    execute: (ctx) => {
        const myVal = ctx.value;
        const boardCards = ctx.getBoardCards();
        let hasLarger = false;
        for (const bc of boardCards) {
            if (bc.uuid === ctx.card.uuid) continue;
            let bcVal = getCardEffectiveValue(bc, ctx.state);
            const bcCtx = new EffectContext({
                state: ctx.state, trigger: Trigger.ON_CALC_FINAL, card: bc, value: bcVal,
                extra: { mightyComparing: true }
            });
            FX.fire(Trigger.ON_CALC_FINAL, bcCtx);
            bcVal = bcCtx.value;
            if (bcVal > myVal) {
                hasLarger = true;
                break;
            }
        }
        if (!hasLarger) {
            ctx.value *= 2;
        }
    }
}));

// 硬质皮肤（hard_skin）：最左最右格-1（3格中即第1格和第3格）
FX.register(new EffectHandler({
    id: 'hard_skin',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY,
    condition: (ctx) => {
        if (!ctx.state.monster.keywords.includes('hard_skin')) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return targetSlot === 0 || targetSlot === 2;
    },
    execute: (ctx) => {
        ctx.value -= 1;
        if (ctx.value < 0) ctx.value = 0;
    }
}));
