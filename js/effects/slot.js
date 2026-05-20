/**
 * 卡牌地下城 - 格子效果 (ON_SLOT_CALC)
 * 
 * 所有"计算格子倍率时"触发的效果定义
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// 完美境界（perfect_state）：相邻格倍率+1
FX.register(new EffectHandler({
    id: 'perfect_state_slot',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => true, // 由execute内部检查
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        let bonus = 0;
        for (const s of ctx.state.slots) {
            if (Math.abs(s.index - slot.index) === 1) {
                if (s.cards.some(c => c.defId === 'perfect_state')) {
                    bonus += 1;
                }
            }
        }
        ctx.value += bonus;
    }
}));
