/**
 * 卡牌地下城 - 数值计算效果 (ON_CALC_VALUE / ON_CALC_FINAL)（重构版）
 *
 * 所有效果处理器为纯对象，通过 registerEffect 注册。
 */

import { registerEffect } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { detectStrategy } from '../systems/strategy.js';

// ===== ON_CALC_VALUE：计算有效点数（光环、加成阶段） =====

// 合群（social）：相邻格每有一张其他卡牌+1
registerEffect({
    id: 'social_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 2,
    condition: (ctx) => {
        if (!ctx.card) return false;
        if (!ctx.card.keywords.includes('social')) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return true;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        let bonus = 0;
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                const others = slot.cards.filter(c => c.uuid !== ctx.card.uuid).length;
                bonus += others;
            }
        }
        if (bonus > 0) {
            ctx.value += bonus;
        }
    }
});

// 齐心（unison）：同格每有一张其他卡牌+1
registerEffect({
    id: 'unison_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 3,
    condition: (ctx) => {
        if (!ctx.card) return false;
        if (!ctx.card.keywords.includes('unison')) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return true;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        const slot = ctx.state.slots[targetSlot];
        const others = slot.cards.filter(c => c.uuid !== ctx.card.uuid).length;
        if (others > 0) {
            ctx.value += others;
        }
    }
});

// ===== ON_CALC_FINAL：计算最终点数（翻倍、惩罚阶段） =====

// 伟力（mighty）：将本牌点数翻倍
registerEffect({
    id: 'mighty',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY,
    condition: (ctx) => ctx.card.keywords.includes('mighty'),
    execute: (ctx) => {
        ctx.value *= 2;
    }
});

// 最左最右格-5（怪物技能）
registerEffect({
    id: 'edge_penalty_5',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY + 1,
    condition: (ctx) => {
        if (ctx.state.monster.edgePenalty !== 5) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return targetSlot === 0 || targetSlot === 2;
    },
    execute: (ctx) => {
        ctx.value -= 5;
        if (ctx.value < 0) ctx.value = 0;
    }
});

// 最左格-10（怪物技能）
registerEffect({
    id: 'left_penalty_10',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY + 2,
    condition: (ctx) => {
        if (ctx.state.monster.leftPenalty !== 10) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return targetSlot === 0;
    },
    execute: (ctx) => {
        ctx.value -= 10;
        if (ctx.value < 0) ctx.value = 0;
    }
});

// 数值最高倍率格-1（怪物技能）
registerEffect({
    id: 'max_slot_penalty',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER - 5,
    condition: (ctx) => ctx.state.monster.maxSlotPenalty > 0,
    execute: (ctx) => {
        const slots = ctx.state.slots;
        let maxMul = -1;
        let maxIdx = -1;
        for (const s of slots) {
            const mul = s.multiplier + (s.roundMultiplierBonus || 0);
            if (mul > maxMul) {
                maxMul = mul;
                maxIdx = s.index;
            }
        }
        if (ctx.slotIndex === maxIdx) {
            ctx.value -= ctx.state.monster.maxSlotPenalty;
        }
    }
});

// 数值最低倍率格-1（怪物技能）
registerEffect({
    id: 'min_slot_penalty',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER - 5,
    condition: (ctx) => ctx.state.monster.minSlotPenalty > 0,
    execute: (ctx) => {
        const slots = ctx.state.slots;
        let minMul = Infinity;
        let minIdx = -1;
        for (const s of slots) {
            const mul = s.multiplier + (s.roundMultiplierBonus || 0);
            if (mul < minMul) {
                minMul = mul;
                minIdx = s.index;
            }
        }
        if (ctx.slotIndex === minIdx) {
            ctx.value -= ctx.state.monster.minSlotPenalty;
        }
    }
});

// 每回合第一张打出牌点数-5（怪物技能）
registerEffect({
    id: 'first_card_value_penalty',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY + 3,
    condition: (ctx) => {
        if (ctx.state.monster.firstCardValuePenalty <= 0) return false;
        if (!ctx.card) return false;
        return ctx.card === ctx.state.firstCardPlayedThisTurn;
    },
    execute: (ctx) => {
        ctx.value -= ctx.state.monster.firstCardValuePenalty;
        if (ctx.value < 0) ctx.value = 0;
    }
});

// 骷髅骑士——亡者：所有卡牌点数-2
registerEffect({
    id: 'all_card_penalty_2',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY,
    condition: (ctx) => ctx.state.monster.allCardPenalty > 0,
    execute: (ctx) => {
        ctx.value -= ctx.state.monster.allCardPenalty;
        if (ctx.value < 0) ctx.value = 0;
    }
});

// 骷髅骑士——惊人伟力：无计策生效时，倍率格点数-10
registerEffect({
    id: 'no_strategy_slot_penalty_10',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER - 10,
    condition: (ctx) => {
        const pen = ctx.state.monster.noStrategySlotPenalty;
        if (!pen || pen <= 0) return false;
        const strategy = detectStrategy(ctx.state.slots, ctx.state.runDataRef?.strategyLevels);
        return strategy === null;
    },
    execute: (ctx) => {
        ctx.value -= ctx.state.monster.noStrategySlotPenalty;
    }
});

// 骷髅骑士——武技：上回合计策再次生效时，倍率格点数-5
registerEffect({
    id: 'prev_strategy_penalty_5',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER - 8,
    condition: (ctx) => {
        const pen = ctx.state.monster.prevStrategyPenalty;
        if (!pen || pen <= 0) return false;
        if (!ctx.state.monster.prevStrategyId) return false;
        const currentStrategy = detectStrategy(ctx.state.slots, ctx.state.runDataRef?.strategyLevels);
        return currentStrategy && currentStrategy.id === ctx.state.monster.prevStrategyId;
    },
    execute: (ctx) => {
        ctx.value -= ctx.state.monster.prevStrategyPenalty;
    }
});

// 独臂巨人——左侧虚弱：最左侧倍率格点数+1
registerEffect({
    id: 'left_slot_bonus_1',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 5,
    condition: (ctx) => ctx.state.monster.leftSlotBonus > 0 && ctx.slotIndex === 0,
    execute: (ctx) => {
        ctx.value += ctx.state.monster.leftSlotBonus;
    }
});

// 独臂巨人——中丢石：打出在最中间倍率格上的卡牌点数-5
registerEffect({
    id: 'center_card_penalty_5',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY + 4,
    condition: (ctx) => {
        if (ctx.state.monster.centerCardPenalty <= 0) return false;
        if (!ctx.card) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return targetSlot === 1;
    },
    execute: (ctx) => {
        ctx.value -= ctx.state.monster.centerCardPenalty;
        if (ctx.value < 0) ctx.value = 0;
    }
});

// 怪奇舞者——战舞：没打出在每回合第一张卡牌所在倍率格的卡牌点数-5
registerEffect({
    id: 'not_first_slot_penalty_5',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_PENALTY + 5,
    condition: (ctx) => {
        if (ctx.state.monster.notFirstSlotPenalty <= 0) return false;
        if (!ctx.card) return false;
        const firstIdx = ctx.state.monster.firstCardSlotIndex;
        if (firstIdx < 0) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return targetSlot !== firstIdx;
    },
    execute: (ctx) => {
        ctx.value -= ctx.state.monster.notFirstSlotPenalty;
        if (ctx.value < 0) ctx.value = 0;
    }
});

// ===== 新增卡牌计算效果 =====

// 战旗（battle_banner）：相邻两侧倍率格卡牌点数+5
registerEffect({
    id: 'battle_banner_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 1,
    condition: (ctx) => {
        if (!ctx.card) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return true;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                const banners = slot.cards.filter(c => c.defId === 'battle_banner');
                if (banners.length > 0) {
                    ctx.value += 5 * banners.length;
                }
            }
        }
    }
});

// 完美借力（perfect_borrow）：获得相邻两侧倍率格点数最高卡牌之和
registerEffect({
    id: 'perfect_borrow_effect',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY - 1,
    condition: (ctx) => ctx.card && ctx.card.defId === 'perfect_borrow',
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        let total = 0;
        for (const slot of ctx.state.slots) {
            if (Math.abs(slot.index - targetSlot) === 1) {
                let maxVal = 0;
                for (const c of slot.cards) {
                    const val = ctx.getCardBaseValue(c);
                    if (val > maxVal) maxVal = val;
                }
                total += maxVal;
            }
        }
        ctx.value += total;
        if (total > 0) {
            ctx.log(`${ctx.card.name} 完美借力触发，获得相邻两侧最高卡牌点数之和 ${total}`);
        }
    }
});

// 一人成军（one_man_army）：获得当前牌组内所有卡牌点数之和
registerEffect({
    id: 'one_man_army_effect',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY - 1,
    condition: (ctx) => ctx.card && ctx.card.defId === 'one_man_army',
    execute: (ctx) => {
        let total = 0;
        for (const c of ctx.state.deck) {
            total += ctx.getCardBaseValue(c);
        }
        ctx.value += total;
        if (total > 0) {
            ctx.log(`${ctx.card.name} 一人成军触发，获得牌组点数之和 ${total}`);
        }
    }
});

// 训练成果（training_result）：本局每打出过一张成长牌，点数+2
registerEffect({
    id: 'training_result_effect',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_AURA + 4,
    condition: (ctx) => ctx.card && ctx.card.defId === 'training_result',
    execute: (ctx) => {
        const count = ctx.state.runDataRef?.growthCardsPlayedThisRun || 0;
        if (count > 0) {
            const bonus = count * 2;
            ctx.value += bonus;
            ctx.log(`${ctx.card.name} 训练成果触发，本局已打出${count}张成长牌，点数+${bonus}`);
        }
    }
});
