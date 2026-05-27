/**
 * 生死烛局 - 牌桌系统（第二版）
 * 
 * 负责：
 * 1. 卡牌放置规则校验
 * 2. 打出卡牌（触发效果系统）
 * 3. 伤害计算（含计策加成）
 * 4. 放置预览
 */

import { logCombat, recordTimeline, addBattleLog } from '../core/battle-core.js';
import { FX, EffectContext } from '../effects/core.js';
import { Trigger } from '../core/constants.js';
import { detectStrategy, getStackingBonus } from './strategy.js';
import { createCardInstance } from '../data/index.js';

// ===== 工具函数 =====

function getActiveRelics(state) {
    const disabledKey = state.monster?.disabledRelicKey;
    return (state.runDataRef?.relics || []).filter(r => !disabledKey || (r.id || r.name) !== disabledKey);
}

export function buildCardSlotMap(state) {
    const map = {};
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            map[card.uuid] = slot.index;
        }
    }
    return map;
}

export function getCardBaseValue(card) {
    return (card.baseValue || 0) + (card.permanentBonus || 0) + (card.battleBonus || 0) + (card.tempBonus || 0);
}

// ===== 数值计算链（通过效果系统钩子） =====

export function getCardEffectiveValue(card, state) {
    let val = getCardBaseValue(card);
    const ctx = new EffectContext({
        state, trigger: Trigger.ON_CALC_VALUE,
        card, value: val
    });
    FX.fire(Trigger.ON_CALC_VALUE, ctx);
    return ctx.value;
}

export function getCardFinalValue(card, state) {
    let val = getCardEffectiveValue(card, state);
    const ctx = new EffectContext({
        state, trigger: Trigger.ON_CALC_FINAL,
        card, value: val
    });
    FX.fire(Trigger.ON_CALC_FINAL, ctx);

    // 叠牌加成：所在格卡牌点数
    const slotIndex = ctx.getCardSlotIndex ? ctx.getCardSlotIndex(card) : -1;
    if (slotIndex >= 0) {
        const slot = state.slots[slotIndex];
        const stacking = getStackingBonus(slot.cards.length);
        ctx.value += stacking.cardBonus;
    }

    return ctx.value;
}

export function getSlotEffectiveMultiplier(slot, state) {
    let mul = slot.multiplier + (slot.roundMultiplierBonus || 0);

    // 叠牌加成：倍率格点数
    const stacking = getStackingBonus(slot.cards.length);
    mul += stacking.slotBonus;

    const ctx = new EffectContext({
        state, trigger: Trigger.ON_SLOT_CALC,
        slotIndex: slot.index, value: mul
    });
    FX.fire(Trigger.ON_SLOT_CALC, ctx);
    return ctx.value;
}

// ===== 计策加成计算（已废弃，计策系统改为叠牌加成）=====

export function getStrategySlotBonuses(state) {
    state.currentStrategy = null;
    return [0, 0, 0];
}

// ===== 伤害计算 =====

export function calculateCardOutput(card, slot, state) {
    const val = getCardFinalValue(card, state);
    const mul = getSlotEffectiveMultiplier(slot, state);
    return val * mul;
}

export function calculateTotalBoardDamage(state) {
    let total = 0;
    for (const slot of state.slots) {
        let slotMul = getSlotEffectiveMultiplier(slot, state);
        let slotDamage = 0;
        for (const card of slot.cards) {
            slotDamage += getCardFinalValue(card, state);
        }
        total += slotDamage * slotMul;
    }
    // 额外指数（遗物加成等）
    let extraMultiplier = state.runDataRef?.extraMultiplier || 1;

    return Math.floor(total * extraMultiplier);
}

// ===== 放置规则 =====

export function canPlaceCard(card, slot, state) {
    if (card.size > 1) {
        return { ok: false, reason: '多格卡暂未实现' };
    }
    if (card.retainDisabledThisTurn) {
        return { ok: false, reason: '该卡牌本回合被禁用' };
    }
    return { ok: true };
}

// ===== 判断卡牌是否可二次拖动（持久驻场卡） =====

export function isCardDraggableFromSlot(card) {
    // 扩散牌等一次性效果卡不可拖动
    if (card.defId === 'diffusion') return false;
    // 标记为不可拖动的衍生卡（如某些怪物生成的临时卡）
    if (card.isDerived && card.defId === 'cheat_card') return false;
    return true;
}

function resolveSlotMove(state, card, fromSlotIndex, toSlotIndex, insertIndex) {
    const fromSlot = state.slots[fromSlotIndex];
    const toSlot = state.slots[toSlotIndex];
    if (!fromSlot || !toSlot || !card) return null;

    const sourceIndex = fromSlot.cards.findIndex(c => c.uuid === card.uuid);
    if (sourceIndex === -1) return null;

    const sameSlot = fromSlotIndex === toSlotIndex;
    const visibleCount = Math.max(0, toSlot.cards.length - (sameSlot ? 1 : 0));
    const targetIndex = Math.max(0, Math.min(insertIndex, visibleCount));

    return {
        fromSlot,
        toSlot,
        sourceIndex,
        targetIndex,
        sameSlot,
        isNoOp: sameSlot && targetIndex === sourceIndex
    };
}

// ===== 移动已入场卡牌 =====

export function moveSlotCard(card, fromSlotIndex, toSlotIndex, insertIndex, state) {
    if (!isCardDraggableFromSlot(card)) return false;

    const move = resolveSlotMove(state, card, fromSlotIndex, toSlotIndex, insertIndex);
    if (!move || move.isNoOp) return false;

    move.fromSlot.cards.splice(move.sourceIndex, 1);
    move.toSlot.cards.splice(move.targetIndex, 0, card);

    // 记录时间线
    recordTimeline(state, 'move_slot_card', {
        cardUuid: card.uuid,
        cardDefId: card.defId,
        cardName: card.name,
        fromSlot: fromSlotIndex,
        toSlot: toSlotIndex,
        insertIndex: move.targetIndex
    });

    // 检测计策变化
    state.currentStrategy = detectStrategy(state.slots, state.runDataRef?.strategyLevels);

    return true;
}

// ===== 获取拖动预览（用于入场卡牌拖动时的实时计算） =====

export function getSlotDragPreview(card, fromSlotIndex, toSlotIndex, insertIndex, state) {
    // 创建临时状态副本
    const tempSlots = state.slots.map((s, i) => ({
        ...s,
        cards: [...s.cards]
    }));

    const tempState = {
        ...state,
        slots: tempSlots
    };

    const move = resolveSlotMove(tempState, card, fromSlotIndex, toSlotIndex, insertIndex);
    if (!move) return null;
    if (!move.isNoOp) {
        move.fromSlot.cards.splice(move.sourceIndex, 1);
        move.toSlot.cards.splice(move.targetIndex, 0, card);
    }

    const total = calculateTotalBoardDamage(tempState);
    const strategyBonuses = getStrategySlotBonuses(tempState);
    const effectiveSlotMultiplier = getSlotEffectiveMultiplier(tempState.slots[toSlotIndex], tempState) + (strategyBonuses[toSlotIndex] || 0);

    return {
        totalDamage: total,
        monsterRemaining: Math.max(0, state.monster.hp - total),
        willKill: total >= state.monster.hp,
        cardOutput: getCardFinalValue(card, tempState) * effectiveSlotMultiplier
    };
}

// ===== 打出卡牌 =====

export function playCardToSlot(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    const check = canPlaceCard(card, slot, state);
    if (!check.ok) {
        logCombat(state, `无法放置: ${check.reason}`);
        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
        return false;
    }

    const handIdx = state.hand.findIndex(c => c.uuid === card.uuid);
    if (handIdx === -1) return false;
    state.hand.splice(handIdx, 1);
    slot.cards.push(card);

    card.hasBeenPlayed = true;
    card.turnPlaced = state.turn;
    delete card.remainExhausted;
    recordTimeline(state, 'play_card_to_slot', {
        cardUuid: card.uuid,
        cardDefId: card.defId,
        cardName: card.name,
        slotIndex
    });

    // 对战记录：出牌事件
    addBattleLog(state, 'play_card', {
        cardName: card.name,
        slotIndex,
        baseValue: card.baseValue || 0,
        text: `打出【${card.name}】到格${slotIndex + 1}`
    });

    // 怪奇舞者——踢踏舞：第一张打出的卡牌随机打出在任意倍率格并留场
    if (!state.firstCardPlayedThisTurn && state.monster.firstCardRandomSlotRemain) {
        const randomSlot = Math.floor(Math.random() * state.slots.length);
        if (randomSlot !== slotIndex) {
            // 将卡牌从原slot移到随机slot
            const oldIdx = slot.cards.findIndex(c => c.uuid === card.uuid);
            if (oldIdx !== -1) {
                slot.cards.splice(oldIdx, 1);
                state.slots[randomSlot].cards.push(card);
            }
            recordTimeline(state, 'card_random_slot', {
                cardUuid: card.uuid,
                cardDefId: card.defId,
                cardName: card.name,
                fromSlot: slotIndex,
                toSlot: randomSlot,
                monsterName: state.monster.name
            });
            logCombat(state, `${state.monster.name} 的踢踏舞生效：${card.name} 被随机打到了第 ${randomSlot + 1} 格！`);
            addBattleLog(state, 'monster_skill', { text: `${state.monster.name} 踢踏舞：${card.name}→格${randomSlot + 1}` });
        }
        // 赋予留场效果
        if (!card.keywords.includes('remain')) {
            card.keywords.push('remain');
            card._tempRemainAdded = true;
        }
        state.monster.firstCardSlotIndex = randomSlot;
    }

    // 记录本回合第一张打出的牌（用于怪物技能）
    if (!state.firstCardPlayedThisTurn) {
        state.firstCardPlayedThisTurn = card;
        if (state.monster.firstCardSlotIndex < 0) {
            state.monster.firstCardSlotIndex = slotIndex;
        }
    }
    if (!state.firstCardPlayedThisBattle) {
        state.firstCardPlayedThisBattle = card;
    }

    // 怪物技能：第一张打出牌直接进弃牌堆（不触发ON_PLAY）
    if (state.monster.firstCardDiscard && state.firstCardPlayedThisTurn === card) {
        const idx = slot.cards.findIndex(c => c.uuid === card.uuid);
        if (idx !== -1) {
            const discarded = slot.cards.splice(idx, 1)[0];
            discarded.dedicateTriggered = false;
            state.discard.push(discarded);
            recordTimeline(state, 'card_discarded_by_monster', {
                cardUuid: discarded.uuid,
                cardDefId: discarded.defId,
                cardName: discarded.name,
                slotIndex,
                monsterName: state.monster.name
            });
            logCombat(state, `${state.monster.name} 的技能生效：第一张打出的 ${discarded.name} 直接进入弃牌堆！`);
            addBattleLog(state, 'monster_skill', { text: `${state.monster.name}：${discarded.name}被丢弃` });
            state.slotFlashes.push({ slotIndex, timer: 20 });
            if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
            return true;
        }
    }

    // 触发 ON_PLAY 效果链
    const ctx = new EffectContext({
        state, trigger: Trigger.ON_PLAY,
        card, slotIndex
    });
    FX.fire(Trigger.ON_PLAY, ctx);

    state.slotFlashes.push({ slotIndex, timer: 20 });

    // 视觉特效：卡牌放置火花
    if (typeof FX !== 'undefined') {
        if (!state.pendingPlaceEffects) state.pendingPlaceEffects = [];
        state.pendingPlaceEffects.push({ slotIndex, color: card.accentColor || '#ffd700' });
    }

    if (typeof GameAudio !== 'undefined') {
        const stackCount = slot.cards.length;
        if (stackCount > 1) {
            GameAudio.playStackSound(stackCount);
        } else if (card.rarity === 'gold') {
            GameAudio.playRareCard();
        } else if (card.rarity === 'blue') {
            GameAudio.playGoldSparkle();
        } else {
            GameAudio.playCardPlace();
        }
    }

    // 检测计策变化；条件不满足时必须立刻清空旧计策
    state.currentStrategy = detectStrategy(state.slots, state.runDataRef?.strategyLevels);

    // 蘑菇儿子——孢子云：每打出三张卡牌，打出一张【扩散】到任意倍率格
    if (state.monster.playDiffusionEvery3 > 0) {
        state.monster.cardsPlayedThisTurn++;
        if (state.monster.cardsPlayedThisTurn % state.monster.playDiffusionEvery3 === 0) {
            const diffusion = createCardInstance('diffusion');
            if (diffusion) {
                diffusion.isDerived = true;
                const randomSlot = Math.floor(Math.random() * state.slots.length);
                diffusion.hasBeenPlayed = true;
                state.slots[randomSlot].cards.push(diffusion);
                recordTimeline(state, 'monster_play_diffusion', {
                    cardUuid: diffusion.uuid,
                    slotIndex: randomSlot,
                    monsterName: state.monster.name
                });
                logCombat(state, `${state.monster.name} 的孢子云生效：一张【扩散】被打出到了第 ${randomSlot + 1} 格！`);
                addBattleLog(state, 'monster_skill', { text: `${state.monster.name} 孢子云：扩散→格${randomSlot + 1}` });
                state.slotFlashes.push({ slotIndex: randomSlot, timer: 20 });
            }
        }
    }

    return true;
}

// ===== 放置预览 =====

export function getPlacementPreview(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    const check = canPlaceCard(card, slot, state);
    if (!check.ok) return null;

    // 创建临时状态
    const tempHand = state.hand.filter(c => c.uuid !== card.uuid);
    const tempSlot = {
        ...slot,
        cards: [...slot.cards, card]
    };
    const tempSlots = state.slots.map((s, i) => i === slotIndex ? tempSlot : s);

    const tempState = {
        ...state,
        hand: tempHand,
        slots: tempSlots
    };

    const total = calculateTotalBoardDamage(tempState);

    return {
        cardOutput: getCardFinalValue(card, tempState) * getSlotEffectiveMultiplier(tempSlot, tempState),
        totalDamage: total,
        monsterRemaining: Math.max(0, state.monster.hp - total),
        willKill: total >= state.monster.hp,
        slotMultiplier: getSlotEffectiveMultiplier(tempSlot, tempState)
    };
}
