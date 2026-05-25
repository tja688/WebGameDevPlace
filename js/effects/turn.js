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
        const candidates = hand.filter(card => !card.keywords.includes('dedicate'));
        if (candidates.length <= 0) return;

        const idx = Math.floor(Math.random() * candidates.length);
        const card = candidates[idx];
        card.keywords.push('dedicate');
        recordTimeline(ctx.state, 'card_keyword_added', {
            cardUuid: card.uuid,
            cardDefId: card.defId,
            keyword: 'dedicate',
            reason: 'yellow_heart'
        });
        ctx.log(`黄色君王的黄之心生效：${card.name} 被赋予了奉献词条`);
    }
});

// 蘑菇儿子——成长：每回合怪物血量提升100
registerEffect({
    id: 'monster_grow_100',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.SPECIAL + 15,
    condition: (ctx) => ctx.state.monster.monsterGrow > 0,
    execute: (ctx) => {
        const grow = ctx.state.monster.monsterGrow;
        const before = ctx.state.monster.hp;
        ctx.state.monster.hp = Math.min(ctx.state.monster.maxHp, before + grow);
        const actualGrow = ctx.state.monster.hp - before;
        if (actualGrow > 0) {
            recordTimeline(ctx.state, 'monster_grow', {
                monsterName: ctx.state.monster.name,
                amount: actualGrow,
                hpBefore: before,
                hpAfter: ctx.state.monster.hp
            });
            ctx.log(`${ctx.state.monster.name} 的成长生效：血量提升 ${actualGrow} 点`);
        }
    }
});

// 盗贼——顺手的事！：玩家每回合减少1金币
registerEffect({
    id: 'lose_gold_per_turn',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.state.monster.loseGoldPerTurn > 0 && ctx.state.runDataRef,
    execute: (ctx) => {
        const lost = Math.min(ctx.state.monster.loseGoldPerTurn, ctx.state.runDataRef.gold || 0);
        if (lost > 0) {
            ctx.state.runDataRef.gold -= lost;
            recordTimeline(ctx.state, 'gold_lost', {
                amount: lost,
                goldAfter: ctx.state.runDataRef.gold
            });
            ctx.log(`${ctx.state.monster.name} 的技能生效：失去 ${lost} 金币`);
        }
    }
});

// 梦中的你——怀念：回合开始给一张手牌赋予保留词条
registerEffect({
    id: 'retain_hand_card',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.SPECIAL + 18,
    condition: (ctx) => ctx.state.monster.retainHandCard && ctx.state.hand.length > 0,
    execute: (ctx) => {
        const hand = ctx.state.hand;
        const candidates = hand.filter(card => !card.keywords.includes('retain'));
        if (candidates.length <= 0) return;

        const idx = Math.floor(Math.random() * candidates.length);
        const card = candidates[idx];
        if (!card.keywords.includes('retain')) {
            card.keywords.push('retain');
        }
        card.retainDisabledThisTurn = true;
        recordTimeline(ctx.state, 'card_keyword_added', {
            cardUuid: card.uuid,
            cardDefId: card.defId,
            keyword: 'retain',
            reason: 'retain_hand_card'
        });
        ctx.log(`梦中的你——怀念生效：${card.name} 被赋予了保留词条，本回合无法使用`);
    }
});
