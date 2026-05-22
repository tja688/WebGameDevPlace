/**
 * 卡牌地下城 - 数值计算效果 (ON_CALC_VALUE / ON_CALC_FINAL)
 * 
 * 所有"计算卡牌点数时"触发的效果定义
 * 这些效果通过修改 ctx.value 来影响最终计算结果
 */

import { EffectHandler, FX, EffectContext } from './core.js';
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

// （训练纲领的光环效果已移除，改为打出时效果）

// ===== ON_CALC_FINAL：计算最终点数（翻倍、惩罚阶段）=====

// 伟力（mighty）：若场上无更大点数牌，翻倍
FX.register(new EffectHandler({
    id: 'mighty',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY,
    condition: (ctx) => ctx.card.keywords.includes('mighty') && !ctx.extra?.mightyComparing,
    execute: (ctx) => {
        const myVal = ctx.value; // 当前已计算到有效值（经过 ON_CALC_VALUE）
        const boardCards = ctx.getBoardCards();
        let hasLarger = false;
        for (const bc of boardCards) {
            if (bc.uuid === ctx.card.uuid) continue;
            // 计算其他牌的最终值（触发 ON_CALC_FINAL，但mighty会跳过）
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
