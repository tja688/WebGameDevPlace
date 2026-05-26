/**
 * 卡牌地下城 - 遗物效果系统
 *
 * 所有遗物效果通过 registerEffect 注册到对应触发时机。
 * 遍历 runData.relics 数组来判断玩家拥有哪些遗物。
 */

import { registerEffect } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { recordTimeline, drawCards } from '../core/battle-core.js';
import { detectStrategy } from '../systems/strategy.js';

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

// ===== 1. 先锋徽章：每次战斗第一张打出的卡牌点数+20 =====
registerEffect({
    id: 'relic_first_card_bonus',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_BONUS + 5,
    condition: (ctx) => {
        if (!ctx.card) return false;
        const relic = getRelic(ctx.state, 'first_card_bonus');
        if (!relic) return false;
        return ctx.card === ctx.state.firstCardPlayedThisBattle;
    },
    execute: (ctx) => {
        const bonus = getRelic(ctx.state, 'first_card_bonus').effect.bonus || 20;
        ctx.value += bonus;
        ctx.log(`先锋徽章生效：${ctx.card.name} 点数+${bonus}`);
    }
});

// ===== 2. 锻体护符：牌组里所有卡牌点数+2 =====
registerEffect({
    id: 'relic_deck_bonus',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 1,
    condition: (ctx) => hasRelic(ctx.state, 'deck_bonus'),
    execute: (ctx) => {
        const bonus = getRelic(ctx.state, 'deck_bonus').effect.bonus || 2;
        ctx.value += bonus;
    }
});

// ===== 3. 成长种子：每场战斗第一张打出的卡牌点数永久+5 =====
registerEffect({
    id: 'relic_first_card_permanent_grow',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW + 10,
    condition: (ctx) => {
        if (!ctx.card) return false;
        const relic = getRelic(ctx.state, 'first_card_permanent_grow');
        if (!relic) return false;
        if (ctx.card !== ctx.state.firstCardPlayedThisBattle) return false;
        // 每场战斗只生效一次
        if (ctx.state.firstCardGrowApplied) return false;
        return true;
    },
    execute: (ctx) => {
        const bonus = getRelic(ctx.state, 'first_card_permanent_grow').effect.bonus || 5;
        ctx.card.permanentBonus += bonus;
        ctx.state.firstCardGrowApplied = true;
        recordTimeline(ctx.state, 'card_permanent_bonus', {
            cardUuid: ctx.card.uuid,
            cardDefId: ctx.card.defId,
            amount: bonus,
            reason: 'relic_first_card_permanent_grow'
        });
        ctx.log(`成长种子生效：${ctx.card.name} 永久点数+${bonus}`);
    }
});

// ===== 4. 左翼透镜 / 焦点透镜 / 右翼透镜：指定倍率格点数+2 =====
registerEffect({
    id: 'relic_slot_bonus',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 3,
    condition: (ctx) => hasRelic(ctx.state, 'slot_bonus'),
    execute: (ctx) => {
        const relics = getPlayerRelics(ctx.state).filter(r => r.effect?.type === 'slot_bonus');
        for (const relic of relics) {
            const slotIndex = relic.effect.slotIndex;
            const bonus = relic.effect.bonus || 2;
            if (ctx.slotIndex === slotIndex) {
                ctx.value += bonus;
            }
        }
    }
});

// ===== 5. 连击手套：每次战斗首次将倍率格填满，倍率格上每张卡牌点数+10 =====
registerEffect({
    id: 'relic_full_board_bonus',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 5,
    condition: (ctx) => {
        if (!ctx.card) return false;
        const relic = getRelic(ctx.state, 'full_board_bonus');
        if (!relic) return false;
        const allSlotsHaveCards = ctx.state.slots.every(s => s.cards.length > 0);
        if (!allSlotsHaveCards) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        if (ctx.state.fullBoardBonusApplied && !ctx.state.fullBoardBonusCards?.[ctx.card.uuid]) return false;
        return true;
    },
    execute: (ctx) => {
        const bonus = getRelic(ctx.state, 'full_board_bonus').effect.bonus || 10;
        if (!ctx.state.fullBoardBonusApplied) {
            ctx.state.fullBoardBonusApplied = true;
            ctx.state.fullBoardBonusCards = {};
            for (const card of ctx.state.slots.flatMap(s => s.cards)) {
                ctx.state.fullBoardBonusCards[card.uuid] = true;
            }
        }
        if (!ctx.state.fullBoardBonusCards[ctx.card.uuid]) return;
        ctx.value += bonus;
        recordTimeline(ctx.state, 'card_temp_bonus', {
            targetUuid: ctx.card.uuid,
            targetDefId: ctx.card.defId,
            amount: bonus,
            reason: 'relic_full_board_bonus'
        });
        ctx.log(`连击手套生效：${ctx.card.name} 点数+${bonus}`);
    }
});

// ===== 6. 拥挤雕像：倍率格上每有两张卡牌倍率点数+1 =====
registerEffect({
    id: 'relic_crowd_slot_bonus',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 4,
    condition: (ctx) => hasRelic(ctx.state, 'crowd_slot_bonus'),
    execute: (ctx) => {
        const relic = getRelic(ctx.state, 'crowd_slot_bonus');
        const threshold = relic.effect.threshold || 2;
        const bonus = relic.effect.bonus || 1;
        const slot = ctx.state.slots[ctx.slotIndex];
        const totalCards = slot.cards.length;
        const bonusAmount = Math.floor(totalCards / threshold) * bonus;
        if (bonusAmount > 0) {
            ctx.value += bonusAmount;
        }
    }
});

// 中心/左翼/右翼战术：指定格堆叠大于阈值时倍率点数+1
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

// ===== 7. 龙心：所有卡牌点数+5 =====
registerEffect({
    id: 'relic_all_card_bonus',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA,
    condition: (ctx) => hasRelic(ctx.state, 'all_card_bonus_heart_penalty'),
    execute: (ctx) => {
        const bonus = getRelic(ctx.state, 'all_card_bonus_heart_penalty').effect.bonus || 5;
        ctx.value += bonus;
    }
});

// ===== 8. 龙心负面：每回合开始时失去1人群 =====
registerEffect({
    id: 'relic_heart_penalty',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.SLOT_MODIFIER - 30,
    condition: (ctx) => hasRelic(ctx.state, 'all_card_bonus_heart_penalty'),
    execute: (ctx) => {
        const relic = getRelic(ctx.state, 'all_card_bonus_heart_penalty');
        const penalty = relic.effect.penalty || 1;
        ctx.state.player.hearts -= penalty;
        ctx.state.heartsLost += penalty;
        recordTimeline(ctx.state, 'player_heart_loss', {
            amount: penalty,
            heartsAfter: ctx.state.player.hearts,
            reason: 'relic_heart_penalty'
        });
        ctx.log(`龙心负面效果生效：失去 ${penalty} 人群`);
        if (ctx.state.player.hearts <= 0) {
            ctx.state.phase = 'ended';
            ctx.state.result = 'lose';
            recordTimeline(ctx.state, 'battle_result', { result: 'lose', turn: ctx.state.turn, reason: 'relic_heart_penalty' });
        }
    }
});

// ===== 9. 龙骨：倍率格点数+2 =====
registerEffect({
    id: 'relic_all_slot_bonus',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 2,
    condition: (ctx) => hasRelic(ctx.state, 'all_slot_bonus_hp_increase'),
    execute: (ctx) => {
        const bonus = getRelic(ctx.state, 'all_slot_bonus_hp_increase').effect.slotBonus || 2;
        ctx.value += bonus;
    }
});

// ===== 新增遗物效果 =====

// 优秀中心/左翼/右翼：指定格卡牌点数+5
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

// 持续作战：每回合第一张卡牌点数+10
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

// 闪电战：每场战斗第一张卡牌点数+20
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

// 保留重心：每场战斗第一张带保留词条的卡牌点数+20
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

// 无脑战术：未触发计策时所有倍率格点数+2
registerEffect({
    id: 'relic_no_strategy_slot_bonus',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 1,
    condition: (ctx) => {
        if (!hasRelic(ctx.state, 'no_strategy_slot_bonus')) return false;
        const strategy = detectStrategy(ctx.state.slots, ctx.state.runDataRef?.strategyLevels);
        return strategy === null;
    },
    execute: (ctx) => {
        const relic = getRelic(ctx.state, 'no_strategy_slot_bonus');
        const bonus = relic.effect.bonus || 2;
        ctx.value += bonus;
    }
});

// 高级镭射枪：每回合减少怪物血量50
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

// 省吃俭用：每场战斗第一张卡牌获得留场
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
        }
        ctx.log(`省吃俭用生效：${ctx.card.name} 获得留场`);
    }
});

// 绝境发力：第三回合开始抽一张牌
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
