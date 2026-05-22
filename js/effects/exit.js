/**
 * 卡牌地下城 - 离场效果 (ON_EXIT)
 * 
 * 所有"卡牌离开倍率牌桌时"触发的效果定义
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// 再训练（re_training）：离场时相邻卡牌获得复用
FX.register(new EffectHandler({
    id: 're_training_exit',
    triggers: Trigger.ON_EXIT,
    priority: Priority.SPECIAL,
    condition: (ctx) => ctx.card.defId === 're_training',
    execute: (ctx) => {
        ctx.log(`${ctx.card.name} 触发离场效果！`);
        for (const s of ctx.state.slots) {
            if (Math.abs(s.index - ctx.slotIndex) === 1 && s.cards.length > 0) {
                const target = s.cards[s.cards.length - 1];
                target.reuse = true;
                ctx.log(`${target.name} 获得复用！`);
            }
        }
    }
}));

// 持续训练（extra_training）：离场时相邻卡牌获得留场
FX.register(new EffectHandler({
    id: 'extra_training_exit',
    triggers: Trigger.ON_EXIT,
    priority: Priority.SPECIAL,
    condition: (ctx) => ctx.card.defId === 'extra_training',
    execute: (ctx) => {
        ctx.log(`${ctx.card.name} 触发离场效果！`);
        for (const s of ctx.state.slots) {
            if (Math.abs(s.index - ctx.slotIndex) === 1 && s.cards.length > 0) {
                const target = s.cards[s.cards.length - 1];
                if (!target.keywords.includes('remain')) {
                    target.keywords.push('remain');
                    ctx.log(`${target.name} 获得留场！`);
                }
            }
        }
    }
}));
