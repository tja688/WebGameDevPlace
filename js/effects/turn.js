/**
 * 卡牌地下城 - 回合效果 (ON_TURN_START / ON_TURN_END)（重构版）
 *
 * 所有效果处理器为纯对象，通过 registerEffect 注册。
 */

import { registerEffect } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { CARD_DEFS } from '../data/index.js';
import { drawCards, recordTimeline } from '../core/battle-core.js';

// ===== ON_TURN_START：回合开始 =====

// 留场：回合结束保留在场，下回合开始时：
// - 临时添加的留场词条直接移除
// - 卡牌定义中自带的留场词条保留，但设置 remainExhausted 标记，
//   使该卡在本回合结束时进入弃牌堆（避免永久留场）
registerEffect({
    id: 'remain_persist',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.CLEANUP,
    condition: (ctx) => true,
    execute: (ctx) => {
        for (const slot of ctx.state.slots) {
            for (const card of slot.cards) {
                if (!card.removeRemainOnNextTurnStart) continue;
                const idx = card.keywords.indexOf('remain');
                if (idx !== -1) {
                    const def = CARD_DEFS[card.defId];
                    const hasOriginalRemain = def && def.keywords && def.keywords.includes('remain');
                    if (!hasOriginalRemain) {
                        // 临时添加的 remain 直接移除
                        card.keywords.splice(idx, 1);
                        delete card._tempRemainAdded;
                        recordTimeline(ctx.state, 'card_keyword_removed', {
                            cardUuid: card.uuid,
                            cardDefId: card.defId,
                            keyword: 'remain',
                            reason: 'remain_next_turn_start'
                        });
                        ctx.log(`${card.name} 的临时留场词条在回合开始时移除`);
                    } else {
                        // 原始 remain 保留词条，但标记已耗尽，防止永久留场
                        card.remainExhausted = true;
                        ctx.log(`${card.name} 的留场效果已耗尽，将在本回合结束后弃置`);
                    }
                }
                delete card.removeRemainOnNextTurnStart;
            }
        }
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
        card._monsterAddedKeywords = card._monsterAddedKeywords || [];
        card._monsterAddedKeywords.push('dedicate');
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

// 小幸运：每回合开始有概率抽一张牌
registerEffect({
    id: 'relic_luck_draw',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.DRAW - 20,
    condition: (ctx) => {
        const disabledKey = ctx.state.monster?.disabledRelicKey;
        const relic = ctx.state.runDataRef?.relics?.find(r => r.effect?.type === 'luck_draw' && (!disabledKey || (r.id || r.name) !== disabledKey));
        return !!relic;
    },
    execute: (ctx) => {
        const disabledKey = ctx.state.monster?.disabledRelicKey;
        const relic = ctx.state.runDataRef.relics.find(r => r.effect?.type === 'luck_draw' && (!disabledKey || (r.id || r.name) !== disabledKey));
        const chance = (relic.effect.chance || 10) / 100;
        if (Math.random() < chance) {
            drawCards(ctx.state, 1);
            ctx.log(`${relic.name} 生效：抽一张牌`);
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
            card._monsterAddedKeywords = card._monsterAddedKeywords || [];
            card._monsterAddedKeywords.push('retain');
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
