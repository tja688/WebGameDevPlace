/**
 * 卡牌地下城 - 回合效果 (ON_TURN_START / ON_TURN_END)
 * 
 * 所有"回合开始/结束时"触发的效果定义
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// ===== ON_TURN_END：回合结束 =====

// 救兵（reinforce）：结束回合时若牌桌有空位，自动打出到空位
FX.register(new EffectHandler({
    id: 'reinforce',
    triggers: Trigger.ON_TURN_END,
    priority: Priority.SPECIAL - 20,
    condition: (ctx) => true, // 由execute内部遍历手牌检查
    execute: (ctx) => {
        const reinforceCards = ctx.state.hand.filter(c => c.keywords.includes('reinforce'));
        for (const rCard of reinforceCards) {
            const emptySlots = ctx.state.slots.filter(s => s.available && s.cards.length === 0);
            if (emptySlots.length > 0) {
                const targetSlot = emptySlots[0];
                const handIdx = ctx.state.hand.findIndex(c => c.uuid === rCard.uuid);
                if (handIdx !== -1) {
                    ctx.state.hand.splice(handIdx, 1);
                    targetSlot.cards.push(rCard);
                    ctx.log(`${rCard.name} 救兵效果触发！自动打出到空位`);
                    ctx.state.slotFlashes.push({ slotIndex: targetSlot.index, timer: 20 });
                }
            }
        }
    }
}));

// 灵动（agile）的回合结束处理：已在打出时处理（进入弃牌堆），这里不需要额外逻辑
// 留场（remain）和复用（reuse）的回合结束处理：在 board.js 的 endTurn 清理逻辑中统一处理
// 因为留场/复用涉及格子状态更新，放在 board.js 更合适

// ===== ON_TURN_START：回合开始 =====

// 留场牌获得【堆叠】
FX.register(new EffectHandler({
    id: 'remain_gain_stack',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.CLEANUP,
    condition: (ctx) => true,
    execute: (ctx) => {
        for (const slot of ctx.state.slots) {
            for (const card of slot.cards) {
                if (card.keywords.includes('remain') && !card.keywords.includes('stack')) {
                    card.keywords.push('stack');
                    ctx.log(`${card.name} 留场效果：获得【堆叠】`);
                }
            }
            // 更新格子状态
            if (slot.cards.length > 0) {
                const top = slot.cards[slot.cards.length - 1];
                slot.locked = !top.keywords.includes('stack') && !top.keywords.includes('agile');
                slot.isStacking = top.keywords.includes('stack');
            }
        }
    }
}));
