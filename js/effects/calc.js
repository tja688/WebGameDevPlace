/**
 * 卡牌地下城 - 数值计算效果 (ON_CALC_VALUE / ON_CALC_FINAL)
 * 
 * 所有"计算卡牌点数时"触发的效果定义
 * 这些效果通过修改 ctx.value 来影响最终计算结果
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { getCardEffectiveValue } from '../systems/board.js';

// ===== ON_CALC_VALUE：计算有效点数（光环、加成阶段）=====

// 佯攻（feint）：相邻卡牌+2
FX.register(new EffectHandler({
    id: 'feint_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA,
    condition: (ctx) => {
        // 当前计算的是目标卡牌，feint在相邻格时生效
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

// 磨练技巧（hone_skill）：相邻生长牌+4
FX.register(new EffectHandler({
    id: 'hone_skill_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 1,
    condition: (ctx) => {
        if (!ctx.card || !ctx.card.keywords.includes('grow')) return false;
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
                    ctx.value += 4;
                }
            }
        }
    }
}));

// 训练纲领（training_program）：相邻生长牌+训练牌数量
FX.register(new EffectHandler({
    id: 'training_program_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 2,
    condition: (ctx) => {
        if (!ctx.card || !ctx.card.keywords.includes('grow')) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                if (slot.cards.some(c => c.defId === 'training_program')) return true;
            }
        }
        return false;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        let hasProgram = false;
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                if (slot.cards.some(c => c.defId === 'training_program')) {
                    hasProgram = true;
                    break;
                }
            }
        }
        if (hasProgram) {
            // 统计所有训练牌
            const allCards = [
                ...ctx.state.deck, ...ctx.state.hand, ...ctx.state.discard,
                ...ctx.state.slots.flatMap(s => s.cards)
            ];
            const count = allCards.filter(c => c.name.includes('训练')).length;
            ctx.value += count;
        }
    }
}));

// ===== ON_CALC_FINAL：计算最终点数（翻倍、惩罚阶段）=====

// 伟力（mighty）：若场上无更大点数牌，翻倍
FX.register(new EffectHandler({
    id: 'mighty',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY,
    condition: (ctx) => ctx.card.keywords.includes('mighty'),
    execute: (ctx) => {
        const myVal = ctx.value; // 当前已计算到有效值（经过 ON_CALC_VALUE）
        const boardCards = ctx.getBoardCards();
        let hasLarger = false;
        for (const bc of boardCards) {
            if (bc.uuid === ctx.card.uuid) continue;
            // 计算其他牌的有效值（触发 ON_CALC_VALUE，但不触发 ON_CALC_FINAL 避免递归）
            const bcVal = getCardEffectiveValue(bc, ctx.state);
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

// 硬质皮肤（hard_skin）：最左最右可用格-1
FX.register(new EffectHandler({
    id: 'hard_skin',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY,
    condition: (ctx) => {
        if (!ctx.state.monster.keywords.includes('hard_skin')) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        const available = ctx.state.slots.filter(s => s.available);
        if (available.length === 0) return false;
        const leftmost = available[0].index;
        const rightmost = available[available.length - 1].index;
        return targetSlot === leftmost || targetSlot === rightmost;
    },
    execute: (ctx) => {
        ctx.value -= 1;
        if (ctx.value < 0) ctx.value = 0;
    }
}));
