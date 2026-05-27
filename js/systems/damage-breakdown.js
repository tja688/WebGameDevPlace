/**
 * 生死烛局 - 伤害拆解计算系统
 *
 * 为每张卡牌提供完整的伤害来源拆解，让玩家一眼看懂：
 * "谁" 提供了 "几点" 伤害。
 *
 * 设计原则：纯函数、纯对象返回，方便未来 AI 迁移到 Unity。
 */

import { getCardBaseValue } from './board.js';
import { Trigger } from '../core/constants.js';
import { getHandlersForTrigger } from '../effects/core.js';
import { getStackingBonus } from './strategy.js';



// ===== 辅助：构建 EffectContext（轻量版，只用于数值计算）=====

function makeCalcCtx(state, card, slotIndex, initialValue) {
    return {
        state,
        card,
        slotIndex,
        value: initialValue,
        getCardSlotIndex(targetCard = card) {
            if (!targetCard) return -1;
            for (const slot of state.slots) {
                if (slot.cards.some(c => c.uuid === targetCard.uuid)) return slot.index;
            }
            return -1;
        },
        getCardBaseValue(targetCard = card) {
            if (!targetCard) return 0;
            return (targetCard.baseValue || 0) + (targetCard.permanentBonus || 0) + (targetCard.battleBonus || 0) + (targetCard.tempBonus || 0);
        },
        log() {},
        cancelled: false
    };
}

function makeSlotCalcCtx(state, slotIndex, initialValue) {
    return {
        state,
        slotIndex,
        value: initialValue,
        getCardSlotIndex() { return -1; },
        getCardBaseValue() { return 0; },
        log() {},
        cancelled: false
    };
}

// ===== 核心：拆解单张卡牌的有效点数（ON_CALC_VALUE 阶段）=====

function breakdownCardEffectiveValue(card, state) {
    const base = getCardBaseValue(card);
    const ctx = makeCalcCtx(state, card, -1, base);

    // 手动遍历 ON_CALC_VALUE 效果，收集每个来源的增量
    const steps = [];
    steps.push({ source: '基础点数', amount: base, detail: `基础${card.baseValue || 0} + 永久${card.permanentBonus || 0} + 战斗${card.battleBonus || 0} + 临时${card.tempBonus || 0}` });

    // 获取所有 ON_CALC_VALUE 处理器并排序
    let handlers = [];
    try {
        handlers = getHandlersForTrigger(Trigger.ON_CALC_VALUE)
            .filter(h => h.condition(ctx))
            .sort((a, b) => a.priority - b.priority);
    } catch (e) {
        handlers = [];
    }

    for (const h of handlers) {
        const before = ctx.value;
        h.execute(ctx);
        const delta = ctx.value - before;
        if (delta !== 0) {
            steps.push({ source: effectIdToName(h.id), amount: delta, detail: h.id });
        }
    }

    return { final: ctx.value, steps };
}

// ===== 核心：拆解单张卡牌的最终点数（ON_CALC_FINAL 阶段）=====

function breakdownCardFinalValue(card, state, effectiveValue) {
    const ctx = makeCalcCtx(state, card, -1, effectiveValue);
    const steps = [];

    let handlers = [];
    try {
        handlers = getHandlersForTrigger(Trigger.ON_CALC_FINAL)
            .filter(h => h.condition(ctx))
            .sort((a, b) => a.priority - b.priority);
    } catch (e) {
        handlers = [];
    }

    for (const h of handlers) {
        const before = ctx.value;
        h.execute(ctx);
        const delta = ctx.value - before;
        if (delta !== 0) {
            steps.push({ source: effectIdToName(h.id), amount: delta, detail: h.id });
        }
    }

    // 叠牌加成：所在格卡牌点数
    const slotIndex = ctx.getCardSlotIndex ? ctx.getCardSlotIndex(card) : -1;
    if (slotIndex >= 0) {
        const slot = state.slots[slotIndex];
        const stacking = getStackingBonus(slot.cards.length);
        if (stacking.cardBonus > 0) {
            ctx.value += stacking.cardBonus;
            steps.push({ source: '叠牌加成', amount: stacking.cardBonus, detail: `格内${slot.cards.length}张牌叠牌加成` });
        }
    }

    return { final: Math.max(0, ctx.value), steps };
}

// ===== 核心：拆解倍率格倍率（ON_SLOT_CALC 阶段）=====

function breakdownSlotMultiplier(slot, state) {
    const baseMul = slot.multiplier + (slot.roundMultiplierBonus || 0);
    const ctx = makeSlotCalcCtx(state, slot.index, baseMul);
    const steps = [];
    steps.push({ source: '基础倍率', amount: baseMul, detail: `基础${slot.multiplier} + 回合${slot.roundMultiplierBonus || 0}` });

    // 叠牌加成：倍率格点数
    const stacking = getStackingBonus(slot.cards.length);
    if (stacking.slotBonus > 0) {
        ctx.value += stacking.slotBonus;
        steps.push({ source: '叠牌加成', amount: stacking.slotBonus, detail: `格内${slot.cards.length}张牌叠牌加成` });
    }

    let handlers = [];
    try {
        handlers = getHandlersForTrigger(Trigger.ON_SLOT_CALC)
            .filter(h => h.condition(ctx))
            .sort((a, b) => a.priority - b.priority);
    } catch (e) {
        handlers = [];
    }

    for (const h of handlers) {
        const before = ctx.value;
        h.execute(ctx);
        const delta = ctx.value - before;
        if (delta !== 0) {
            steps.push({ source: effectIdToName(h.id), amount: delta, detail: h.id });
        }
    }

    return { final: ctx.value, steps };
}



// ===== 效果ID转中文名 =====

function effectIdToName(id) {
    const map = {
        // 卡牌光环
        social_aura: '合群光环',
        unison_aura: '齐心光环',
        battle_banner_aura: '战旗光环',
        // 最终计算
        mighty: '伟力翻倍',
        // 怪物惩罚
        edge_penalty_5: '边缘惩罚',
        left_penalty_10: '左侧惩罚',
        first_card_value_penalty: '首牌惩罚',
        all_card_penalty_2: '亡者削弱',
        center_card_penalty_5: '中丢石',
        not_first_slot_penalty_5: '战舞惩罚',
        // 格子效果
        max_slot_penalty: '最高倍率惩罚',
        min_slot_penalty: '最低倍率惩罚',
        no_strategy_slot_penalty_10: '无计策惩罚',
        prev_strategy_penalty_5: '武技惩罚',
        left_slot_bonus_1: '左侧虚弱加成',
        // 专属卡牌
        perfect_borrow_effect: '完美借力',
        one_man_army_effect: '一人成军',
        training_result_effect: '训练成果',
        // 遗物
        relic_slot_bonus: '遗物倍率加成',
        relic_slot_card_bonus: '遗物卡牌加成',
        relic_crowd_slot_bonus_single: '遗物战术加成',
        relic_first_card_per_turn_bonus: '持续作战',
        relic_first_card_per_battle_bonus: '闪电战',
        relic_first_retain_bonus: '保留重心',
        relic_no_strategy_slot_bonus: '无脑战术',
    };
    return map[id] || id;
}

// ===== 公共API：获取单张卡牌的完整伤害拆解 =====

/**
 * 返回单张卡牌在当前状态下的完整伤害计算拆解
 * @returns {
 *   cardName: string,
 *   slotIndex: number,
 *   slotMultiplier: number,
 *   strategyBonus: number,
 *   baseValue: number,
 *   effectiveValue: number,
 *   finalValue: number,
 *   cardOutput: number, // finalValue * slotMultiplier
 *   totalOutput: number, // cardOutput + strategyBonus * finalValue (如果计策给该格加成)
 *   steps: {
 *     phase: 'effective' | 'final' | 'slot' | 'strategy' | 'extra',
 *     source: string,
 *     amount: number,
 *     detail?: string
 *   }[]
 * }
 */
export function getCardDamageBreakdown(card, slotIndex, state) {
    const slot = state.slots[slotIndex];

    // 阶段1：有效点数
    const eff = breakdownCardEffectiveValue(card, state);
    // 阶段2：最终点数
    const fin = breakdownCardFinalValue(card, state, eff.final);
    // 阶段3：倍率
    const mulBreak = breakdownSlotMultiplier(slot, state);
    const slotMul = mulBreak.final;

    const cardOutput = fin.final * slotMul;
    const totalOutput = cardOutput;

    const steps = [
        ...eff.steps.map(s => ({ phase: 'effective', ...s })),
        ...fin.steps.map(s => ({ phase: 'final', ...s })),
        ...mulBreak.steps.map(s => ({ phase: 'slot', ...s })),
    ];

    // 额外乘数（如 runData.extraMultiplier）
    const extraMul = state.runDataRef?.extraMultiplier || 1;
    if (extraMul !== 1) {
        steps.push({
            phase: 'extra',
            source: '全局伤害倍率',
            amount: extraMul,
            detail: `最终伤害 ×${extraMul}`
        });
    }

    return {
        cardName: card.name,
        slotIndex,
        slotMultiplier: slotMul,
        strategyBonus: 0,
        baseValue: getCardBaseValue(card),
        effectiveValue: eff.final,
        finalValue: fin.final,
        cardOutput,
        strategyExtra: 0,
        totalOutput: Math.floor(totalOutput * extraMul),
        extraMultiplier: extraMul,
        steps
    };
}

/**
 * 获取当前场上所有卡牌的伤害拆解
 */
export function getAllBoardDamageBreakdowns(state) {
    const results = [];
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            results.push(getCardDamageBreakdown(card, slot.index, state));
        }
    }
    return results;
}

/**
 * 获取当前状态下的外部伤害来源（不来自场上卡牌的直接伤害）
 * 例如：遗物每回合对怪物造成的伤害等
 */
export function getExternalDamageSources(state) {
    const sources = [];
    // 高级镭射枪/多叠：每回合减少怪物血量
    const disabledKey = state.monster?.disabledRelicKey;
    const relics = (state.runDataRef?.relics || []).filter(r => !disabledKey || (r.id || r.name) !== disabledKey);
    for (const r of relics) {
        if (r.effect?.type === 'turn_monster_damage') {
            sources.push({
                source: r.name,
                amount: r.effect.damage || 50,
                detail: '每回合开始时对怪物造成伤害'
            });
        }
    }
    return sources;
}
