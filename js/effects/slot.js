/**
 * 卡牌地下城 - 格子效果 (ON_SLOT_CALC)（第二版）
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// 豪华装备（perfect_state）：相邻格倍率+1（可叠加）
FX.register(new EffectHandler({
    id: 'perfect_state_slot',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => true,
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        let bonus = 0;
        for (const s of ctx.state.slots) {
            if (Math.abs(s.index - slot.index) === 1) {
                const count = s.cards.filter(c => c.defId === 'perfect_state').length;
                bonus += count;
            }
        }
        ctx.value += bonus;
    }
}));
