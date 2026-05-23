/**
 * 卡牌地下城 - 回合效果 (ON_TURN_START / ON_TURN_END)（第二版）
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// ===== ON_TURN_END：回合结束 =====

// 救兵（reinforce）：结束回合时若牌组里有救兵牌，自动打出到任意倍率格
FX.register(new EffectHandler({
    id: 'reinforce',
    triggers: Trigger.ON_TURN_END,
    priority: Priority.SPECIAL - 20,
    condition: (ctx) => true,
    execute: (ctx) => {
        const reinforceCards = ctx.state.hand.filter(c => c.keywords.includes('reinforce'));
        for (const rCard of reinforceCards) {
            // 第二版：不检查空位，直接打出到任意格（优先选择卡牌数最少的格）
            const sortedSlots = [...ctx.state.slots].sort((a, b) => a.cards.length - b.cards.length);
            const targetSlot = sortedSlots[0];
            const handIdx = ctx.state.hand.findIndex(c => c.uuid === rCard.uuid);
            if (handIdx !== -1) {
                ctx.state.hand.splice(handIdx, 1);
                targetSlot.cards.push(rCard);
                ctx.log(`${rCard.name} 救兵效果触发！自动打出到第${targetSlot.index + 1}格`);
                ctx.state.slotFlashes.push({ slotIndex: targetSlot.index, timer: 20 });
            }
        }
    }
}));

// ===== ON_TURN_START：回合开始 =====

// 留场牌获得【堆叠】（第一版遗留，第二版留场牌不需要获得堆叠，因为无锁定机制）
// 但留场牌仍然保留在场上，所以这个效果可以简化
FX.register(new EffectHandler({
    id: 'remain_persist',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.CLEANUP,
    condition: (ctx) => true,
    execute: (ctx) => {
        // 第二版：留场牌保留在场上即可，无需额外处理
        // 格子状态也无需更新（无锁定机制）
    }
}));
