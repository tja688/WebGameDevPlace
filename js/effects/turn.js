/**
 * 卡牌地下城 - 回合效果 (ON_TURN_START / ON_TURN_END)（重构版）
 *
 * 所有效果处理器为纯对象，通过 registerEffect 注册。
 */

import { registerEffect } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { recordTimeline } from '../core/battle-core.js';

// ===== ON_TURN_START：回合开始 =====

// 留场牌继续保留在倍率格上
registerEffect({
    id: 'remain_persist',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.CLEANUP,
    condition: (ctx) => true,
    execute: (ctx) => {
        // 留场牌保留在场上，无需额外处理
        // 回合开始时的其他效果可在此添加
    }
});

// 怪物每回合恢复血量
registerEffect({
    id: 'monster_heal',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.SLOT_MODIFIER - 20,
    condition: (ctx) => ctx.state.monster.healPerTurn > 0,
    execute: (ctx) => {
        const heal = ctx.state.monster.healPerTurn;
        const before = ctx.state.monster.hp;
        ctx.state.monster.hp = Math.min(ctx.state.monster.maxHp, before + heal);
        const actualHeal = ctx.state.monster.hp - before;
        if (actualHeal > 0) {
            recordTimeline(ctx.state, 'monster_heal', {
                monsterName: ctx.state.monster.name,
                amount: actualHeal,
                hpBefore: before,
                hpAfter: ctx.state.monster.hp
            });
            ctx.log(`${ctx.state.monster.name} 恢复了 ${actualHeal} 点血量`);
        }
    }
});

// 黄色君王——黄之心：回合开始时给一张随机手牌赋予奉献词条
registerEffect({
    id: 'yellow_heart',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.SPECIAL + 20,
    condition: (ctx) => ctx.state.monster.yellowHeart && ctx.state.hand.length > 0,
    execute: (ctx) => {
        const hand = ctx.state.hand;
        const idx = Math.floor(Math.random() * hand.length);
        const card = hand[idx];
        if (!card.keywords.includes('dedicate')) {
            card.keywords.push('dedicate');
            recordTimeline(ctx.state, 'card_keyword_added', {
                cardUuid: card.uuid,
                cardDefId: card.defId,
                keyword: 'dedicate',
                reason: 'yellow_heart'
            });
            ctx.log(`黄色君王的黄之心生效：${card.name} 被赋予了奉献词条`);
        }
    }
});
