/**
 * Heave! - 数值计算效果 (ON_CALC_VALUE / ON_CALC_FINAL)（重构版）
 *
 * 所有效果处理器为纯对象，通过 registerEffect 注册。
 */

import { registerEffect } from './core.js';
import { addBattleLog } from '../core/battle-core.js';
import { Trigger, Priority } from '../core/constants.js';


// ===== ON_CALC_VALUE：计算有效点数（光环、加成阶段） =====

// 预热（dedicate）光环：所在格中，位于本牌正上方（数组中紧邻下一张）的矿石获得本牌一半点数
registerEffect({
    id: 'dedicate_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 1,
    condition: (ctx) => {
        if (!ctx.card) return false;
        if (ctx.state.monster.disableDedicate) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return true;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        const slot = ctx.state.slots[targetSlot];
        const cards = slot.cards;
        const myIdx = cards.findIndex(c => c.uuid === ctx.card.uuid);
        if (myIdx < 0) return;
        // 检查本牌正下方（数组中紧邻前一张）是否有预热矿石
        if (myIdx === 0) return;
        const belowCard = cards[myIdx - 1];
        if (!belowCard.keywords.includes('dedicate')) return;
        const val = (belowCard.baseValue || 0) + (belowCard.permanentBonus || 0) + (belowCard.battleBonus || 0);
        const disabledKey = ctx.state.monster?.disabledRelicKey;
        const hasYellowBone = ctx.state.runDataRef?.relics?.some(r => r.effect?.type === 'dedicate_1_5x' && (!disabledKey || (r.id || r.name) !== disabledKey));
        const bonus = hasYellowBone ? Math.floor(val * 1.5) : Math.floor(val / 2);
        if (bonus > 0) {
            const isPermanentDedicate = ctx.state.runDataRef?.relics?.some(r => r.effect?.type === 'dedicate_permanent' && (!disabledKey || (r.id || r.name) !== disabledKey));
            if (isPermanentDedicate) {
                // 永久预热：通过永久加成实现（光环阶段只加一次，避免重复）
                // 为了避免每次计算都累加，使用一个标记记录已应用
                if (!ctx.card._dedicatePermanentApplied) {
                    ctx.card._dedicatePermanentApplied = [];
                }
                const alreadyApplied = ctx.card._dedicatePermanentApplied.some(x => x.sourceUuid === belowCard.uuid);
                if (!alreadyApplied) {
                    ctx.card.permanentBonus = (ctx.card.permanentBonus || 0) + bonus;
                    ctx.card._dedicatePermanentApplied.push({ sourceUuid: belowCard.uuid, amount: bonus });
                }
            } else {
                ctx.value += bonus;
            }
        }
    }
});

// 黄金领域（yellow_domain）光环：无预热特性的矿石，其上方矿石获得-1/2点数
registerEffect({
    id: 'yellow_domain_aura',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA + 1,
    condition: (ctx) => {
        if (!ctx.card) return false;
        if (!ctx.state.monster.yellowDomain) return false;
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        if (targetSlot < 0) return false;
        return true;
    },
    execute: (ctx) => {
        const targetSlot = ctx.getCardSlotIndex(ctx.card);
        const slot = ctx.state.slots[targetSlot];
        const cards = slot.cards;
        const myIdx = cards.findIndex(c => c.uuid === ctx.card.uuid);
        if (myIdx < 0) return;
        if (myIdx === 0) return;
        const belowCard = cards[myIdx - 1];
        if (belowCard.keywords.includes('dedicate')) return;
        const val = (belowCard.baseValue || 0) + (belowCard.permanentBonus || 0) + (belowCard.battleBonus || 0);
        const penalty = Math.floor(val / 2);
        if (penalty > 0) {
            ctx.value -= penalty;
        }
    }
});

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

// 熔核（mighty）：将本牌点数翻倍
registerEffect({
    id: 'mighty',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY,
    condition: (ctx) => ctx.card.keywords.includes('mighty'),
    execute: (ctx) => {
        ctx.value *= 2;
    }
});

// 最左最右格-5（敌舰技能）
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

// 最左格-10（敌舰技能）
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

// 数值最高铸造台-1（敌舰技能）
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

// 数值最低铸造台-1（敌舰技能）
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

// 每回合第一张打出矿石点数-5（敌舰技能）
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

// 铁甲私掠舰——铁甲：所有矿石点数-2
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

// 铁甲私掠舰——破阵号角：无计策生效时，铸造台点数-10（计策系统已废弃，此效果不再触发）
registerEffect({
    id: 'no_strategy_slot_penalty_10',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER - 10,
    condition: () => false,
    execute: () => {}
});

// 铁甲私掠舰——武技：上回合计策再次生效时，铸造台点数-5（计策系统已废弃，此效果不再触发）
registerEffect({
    id: 'prev_strategy_penalty_5',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER - 8,
    condition: () => false,
    execute: () => {}
});

// 碎舷号——左舷薄弱：最左侧铸造台点数+1
registerEffect({
    id: 'left_slot_bonus_1',
    triggers: Trigger.ON_SLOT_CALC,
    priority: Priority.SLOT_MODIFIER + 5,
    condition: (ctx) => ctx.state.monster.leftSlotBonus > 0 && ctx.slotIndex === 0,
    execute: (ctx) => {
        ctx.value += ctx.state.monster.leftSlotBonus;
    }
});

// 碎舷号——船首重甲：打出在最中间铸造台上的矿石点数-5
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

// 狂浪号——战舞：没打出在每回合第一张矿石所在铸造台的矿石点数-5
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

// 锚章（anchor_badge）：相邻两侧铸造台矿石点数+5
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
                const banners = slot.cards.filter(c => c.defId === 'anchor_badge');
                if (banners.length > 0) {
                    ctx.value += 5 * banners.length;
                }
            }
        }
    }
});

// 完美借力（perfect_borrow）：获得相邻两侧铸造台点数最高矿石之和
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
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 完美借力：+${total}` });
        }
    }
});

// 独钻（solo_drill）：获得当前矿舱内所有矿石点数之和
registerEffect({
    id: 'one_man_army_effect',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_MIGHTY - 1,
    condition: (ctx) => ctx.card && ctx.card.defId === 'solo_drill',
    execute: (ctx) => {
        let total = 0;
        for (const c of ctx.state.deck) {
            if (c.isDerived) continue;
            total += ctx.getCardBaseValue(c);
        }
        ctx.value += total;
        if (total > 0) {
            ctx.log(`${ctx.card.name} 独钻触发，获得当前矿舱点数之和 ${total}`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 独钻：+${total}` });
        }
    }
});

// 淬火成果（quench_result）：本局每打出过一块淬火矿石，点数+2
registerEffect({
    id: 'training_result_effect',
    triggers: Trigger.ON_CALC_FINAL,
    priority: Priority.VALUE_AURA + 4,
    condition: (ctx) => ctx.card && ctx.card.defId === 'quench_result',
    execute: (ctx) => {
        const count = ctx.state.runDataRef?.growthCardsPlayedThisRun || 0;
        if (count > 0) {
            const bonus = count * 2;
            ctx.value += bonus;
            ctx.log(`${ctx.card.name} 淬火成果触发，本局已打出${count}块淬火矿石，点数+${bonus}`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 淬火成果：+${bonus}` });
        }
    }
});
