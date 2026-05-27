/**
 * 生死烛局 - 遗物效果系统
 *
 * 所有遗物效果通过 registerEffect 注册到对应触发时机。
 * 遍历 runData.relics 数组来判断玩家拥有哪些遗物。
 */

import { registerEffect } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { recordTimeline, drawCards } from '../core/battle-core.js';


// ===== 辅助函数：获取玩家拥有的所有遗物 =====
function getPlayerRelics(state) {
    const disabledKey = state.monster?.disabledRelicKey;
    return (state.runDataRef?.relics || []).filter(r => !disabledKey || (r.id || r.name) !== disabledKey);
}

function hasRelic(state, effectType) {
    return getPlayerRelics(state).some(r => r.effect?.type === effectType);
}

function getRelic(state, effectType) {
    return getPlayerRelics(state).find(r => r.effect?.type === effectType);
}

// ===== 1. 稳固中心/右翼/左翼：指定倍率格点数+1 =====
registerEffect({
    id: 'relic_slot_bonus',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 3,
    condition: (ctx) => hasRelic(ctx.state, 'slot_bonus'),
    execute: (ctx) => {
        const relics = getPlayerRelics(ctx.state).filter(r => r.effect?.type === 'slot_bonus');
        for (const relic of relics) {
            const slotIndex = relic.effect.slotIndex;
            const bonus = relic.effect.bonus || 1;
            if (ctx.slotIndex === slotIndex) {
                ctx.value += bonus;
            }
        }
    }
});

// ===== 2. 优秀中心/左翼/右翼：指定格卡牌点数+5 =====
registerEffect({
    id: 'relic_slot_card_bonus',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 1,
    condition: (ctx) => {
        if (!ctx.card) return false;
        return hasRelic(ctx.state, 'slot_card_bonus');
    },
    execute: (ctx) => {
        const relics = getPlayerRelics(ctx.state).filter(r => r.effect?.type === 'slot_card_bonus');
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        for (const relic of relics) {
            if (targetSlot === relic.effect.slotIndex) {
                ctx.value += relic.effect.bonus || 5;
            }
        }
    }
});

// ===== 3. 中心/左翼/右翼战术：指定格堆叠大于阈值时倍率点数+1 =====
registerEffect({
    id: 'relic_crowd_slot_bonus_single',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 4,
    condition: (ctx) => hasRelic(ctx.state, 'crowd_slot_bonus_single'),
    execute: (ctx) => {
        const relics = getPlayerRelics(ctx.state).filter(r => r.effect?.type === 'crowd_slot_bonus_single');
        const slot = ctx.state.slots[ctx.slotIndex];
        for (const relic of relics) {
            if (ctx.slotIndex !== relic.effect.slotIndex) continue;
            const threshold = relic.effect.threshold || 2;
            if (slot.cards.length > threshold) {
                ctx.value += relic.effect.bonus || 1;
            }
        }
    }
});

// ===== 4. 持续作战：每回合第一张卡牌点数+10 =====
registerEffect({
    id: 'relic_first_card_per_turn_bonus',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_BONUS + 4,
    condition: (ctx) => {
        if (!ctx.card) return false;
        return hasRelic(ctx.state, 'first_card_per_turn_bonus') && ctx.card === ctx.state.firstCardPlayedThisTurn;
    },
    execute: (ctx) => {
        const relic = getRelic(ctx.state, 'first_card_per_turn_bonus');
        const bonus = relic.effect.bonus || 10;
        ctx.value += bonus;
        ctx.log(`持续作战生效：${ctx.card.name} 点数+${bonus}`);
    }
});

// ===== 5. 闪电战：每场战斗第一张卡牌点数+20 =====
registerEffect({
    id: 'relic_first_card_per_battle_bonus',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_BONUS + 4,
    condition: (ctx) => {
        if (!ctx.card) return false;
        return hasRelic(ctx.state, 'first_card_per_battle_bonus') && ctx.card === ctx.state.firstCardPlayedThisBattle;
    },
    execute: (ctx) => {
        const relic = getRelic(ctx.state, 'first_card_per_battle_bonus');
        const bonus = relic.effect.bonus || 20;
        ctx.value += bonus;
        ctx.log(`闪电战生效：${ctx.card.name} 点数+${bonus}`);
    }
});

// ===== 6. 保留重心：每场战斗第一张带保留词条的卡牌点数+20 =====
registerEffect({
    id: 'relic_first_retain_bonus_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 18,
    condition: (ctx) => {
        if (!ctx.card) return false;
        if (!hasRelic(ctx.state, 'first_retain_bonus')) return false;
        if (ctx.state.firstRetainBonusCardUuid) return false;
        return ctx.card.keywords.includes('retain');
    },
    execute: (ctx) => {
        ctx.state.firstRetainBonusCardUuid = ctx.card.uuid;
        ctx.log(`保留重心锁定：${ctx.card.name}`);
    }
});

registerEffect({
    id: 'relic_first_retain_bonus',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_BONUS + 4,
    condition: (ctx) => {
        if (!ctx.card) return false;
        return hasRelic(ctx.state, 'first_retain_bonus') && ctx.card.uuid === ctx.state.firstRetainBonusCardUuid;
    },
    execute: (ctx) => {
        const relic = getRelic(ctx.state, 'first_retain_bonus');
        const bonus = relic.effect.bonus || 20;
        ctx.value += bonus;
        ctx.log(`${relic.name} 生效：${ctx.card.name} 点数+${bonus}`);
    }
});

// ===== 7. 无脑战术：未触发计策时所有倍率格点数+2（计策系统已废弃，改为常驻+2）=====
registerEffect({
    id: 'relic_no_strategy_slot_bonus',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 1,
    condition: (ctx) => hasRelic(ctx.state, 'no_strategy_slot_bonus'),
    execute: (ctx) => {
        const relic = getRelic(ctx.state, 'no_strategy_slot_bonus');
        const bonus = relic.effect.bonus || 2;
        ctx.value += bonus;
    }
});

// ===== 8. 高级镭射枪/多叠：每回合减少怪物血量50 =====
registerEffect({
    id: 'relic_turn_monster_damage',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.SLOT_MODIFIER - 20,
    condition: (ctx) => hasRelic(ctx.state, 'turn_monster_damage'),
    execute: (ctx) => {
        const relics = getPlayerRelics(ctx.state).filter(r => r.effect?.type === 'turn_monster_damage');
        let totalDamage = 0;
        for (const relic of relics) {
            totalDamage += relic.effect.damage || 50;
        }
        const before = ctx.state.monster.hp;
        ctx.state.monster.hp = Math.max(0, before - totalDamage);
        recordTimeline(ctx.state, 'monster_damage', {
            amount: totalDamage,
            hpBefore: before,
            hpAfter: ctx.state.monster.hp,
            reason: 'relic_turn_monster_damage'
        });
        ctx.log(`高级镭射枪生效：怪物受到 ${totalDamage} 点伤害`);
        if (ctx.state.monster.hp <= 0 && ctx.state.phase === 'playing') {
            ctx.state.phase = 'ended';
            ctx.state.result = 'win';
            if (ctx.state.turn === 1) ctx.state.firstTurnKill = true;
            recordTimeline(ctx.state, 'battle_result', { result: 'win', turn: ctx.state.turn, reason: 'relic_turn_monster_damage' });
        }
    }
});

// ===== 9. 省吃俭用：每场战斗第一张卡牌获得留场 =====
registerEffect({
    id: 'relic_first_card_remain',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 20,
    condition: (ctx) => {
        if (!hasRelic(ctx.state, 'first_card_remain')) return false;
        if (!ctx.card) return false;
        return ctx.card === ctx.state.firstCardPlayedThisTurn && !ctx.state.firstCardRemainApplied;
    },
    execute: (ctx) => {
        ctx.state.firstCardRemainApplied = true;
        ctx.card.keywords = ctx.card.keywords || [];
        if (!ctx.card.keywords.includes('remain')) {
            ctx.card.keywords = [...ctx.card.keywords, 'remain'];
            ctx.card._tempRemainAdded = true;
        }
        ctx.log(`省吃俭用生效：${ctx.card.name} 获得留场`);
    }
});

// ===== 10. 绝境发力：第三回合开始抽一张牌 =====
registerEffect({
    id: 'relic_third_turn_draw',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.DRAW - 10,
    condition: (ctx) => {
        if (!hasRelic(ctx.state, 'third_turn_draw')) return false;
        return ctx.state.turn === 3;
    },
    execute: (ctx) => {
        drawCards(ctx.state, 1);
        ctx.log('绝境发力生效：第三回合抽一张牌');
    }
});

// ===== 11. 抽一张（高级遗物）：每回合多抽一张牌 =====
registerEffect({
    id: 'relic_extra_draw',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.DRAW - 5,
    condition: (ctx) => {
        const disabledKey = ctx.state.monster?.disabledRelicKey;
        const relic = ctx.state.runDataRef?.relics?.find(r => r.effect?.type === 'extra_draw' && (!disabledKey || (r.id || r.name) !== disabledKey));
        return !!relic;
    },
    execute: (ctx) => {
        const disabledKey = ctx.state.monster?.disabledRelicKey;
        const relics = ctx.state.runDataRef.relics.filter(r => r.effect?.type === 'extra_draw' && (!disabledKey || (r.id || r.name) !== disabledKey));
        let totalDraw = 0;
        for (const relic of relics) {
            totalDraw += relic.effect.bonus || 1;
        }
        if (totalDraw > 0) {
            drawCards(ctx.state, totalDraw);
            ctx.log(`抽一张生效：额外抽 ${totalDraw} 张牌`);
        }
    }
});
