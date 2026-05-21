/**
 * 卡牌地下城 - 战斗系统
 * 
 * 负责：
 * 1. 从RunData初始化战斗
 * 2. 回合管理（结束回合、抽牌）
 * 3. 战斗日志
 */

import { shuffleArray, pickRandom, getAvailableSlotIndices } from '../core/utils.js';
import { logCombat, drawCards } from '../core/battle-core.js';
import { SLOT_COUNT, MAX_UNLOCKED_SLOTS } from '../core/constants.js';
import { CLASS_DEFS, STAGE_CONFIG, MONSTER_DEFS } from '../data/index.js';
import { FX, EffectContext } from '../effects/core.js';
import { Trigger } from '../core/constants.js';

export { logCombat, drawCards } from '../core/battle-core.js';

// ===== 从RunData初始化战斗 =====

export function initBattleFromRun(runData) {
    const cls = CLASS_DEFS[runData.classId];
    const stageKey = `${runData.act}-${runData.stageIndex + 1}`;
    const config = STAGE_CONFIG[stageKey];
    const monsterDefId = pickRandom(config.monsterPool);
    const monsterDef = MONSTER_DEFS[monsterDefId];

    const availableIndices = getAvailableSlotIndices(runData.slotCount, runData.unlockedSlots);

    const slots = [];
    for (let i = 0; i < runData.slotCount; i++) {
        const isAvailable = availableIndices.includes(i);
        let mul = isAvailable ? 1 : 0;
        if (isAvailable && cls.relic.effect.type === 'slot_multiplier' && cls.relic.effect.slotIndex === i) {
            mul += cls.relic.effect.bonus;
        }
        const upgradeCount = runData.slotUpgrades[i] || 0;
        mul += upgradeCount;
        slots.push({
            index: i,
            multiplier: mul,
            baseMultiplier: mul - upgradeCount,
            cards: [],
            locked: false,
            isStacking: false,
            available: isAvailable,
            nextCardBonus: 0,
            roundMultiplierBonus: 0
        });
    }

    const deck = [...runData.deck];
    shuffleArray(deck);

    const state = {
        screen: 'battle',
        phase: 'playing',
        player: {
            name: cls.name,
            maxHearts: cls.hearts,
            hearts: cls.hearts,
            relic: cls.relic
        },
        monster: {
            name: monsterDef.name,
            maxHp: monsterDef.hp,
            hp: monsterDef.hp,
            description: monsterDef.description,
            keywords: [...monsterDef.keywords],
            keywordDesc: monsterDef.keywordDesc,
            theme: monsterDef.theme,
            type: monsterDef.type,
            virusPenalty: 0
        },
        slots: slots,
        deck: deck,
        hand: [],
        discard: [],
        turn: 1,
        turnDamage: 0,
        totalDamage: 0,
        selectedCard: null,
        hoveredSlot: null,
        draggedCard: null,
        dragX: 0,
        dragY: 0,
        animatingCards: [],
        slotFlashes: [],
        monsterFlash: 0,
        message: null,
        messageTimer: 0,
        combatLog: [],
        runDataRef: runData,
        stageKey: stageKey,
        heartsLost: 0
    };

    drawCards(state, 4);
    return state;
}

// ===== 结束回合 =====

export function endTurn(state) {
    if (state.phase !== 'playing') return;
    if (typeof GameAudio !== 'undefined') GameAudio.playEndTurn();

    // 触发回合结束效果（如救兵）
    FX.fire(Trigger.ON_TURN_END, new EffectContext({
        state, trigger: Trigger.ON_TURN_END
    }));

    const totalDmg = calculateTotalBoardDamage(state);
    state.turnDamage = totalDmg;
    state.totalDamage += totalDmg;
    state.monster.hp = Math.max(0, state.monster.hp - totalDmg);

    if (totalDmg > 0) {
        state.monsterFlash = 15;
        if (typeof GameAudio !== 'undefined') GameAudio.playDamage();
    }

    logCombat(state, `第${state.turn}回合造成 ${totalDmg} 伤害，怪物剩余 ${state.monster.hp} HP`);

    if (state.monster.hp <= 0) {
        state.phase = 'ended';
        state.result = 'win';
        return;
    }

    // 扣心（每回合均扣1心，含第1回合）
    const isEliteOrBoss = state.monster.type === 'elite' || state.monster.type === 'boss';
    let baseHeartLoss = 1;
    let heartLoss = baseHeartLoss + (isEliteOrBoss ? 0 : state.monster.virusPenalty);
    state.player.hearts -= heartLoss;
    state.heartsLost += heartLoss;
    if (heartLoss > 0 && typeof GameAudio !== 'undefined') GameAudio.playHeartLoss();
    logCombat(state, `失去 ${heartLoss} 颗心！剩余 ${state.player.hearts} 颗`);

    // 病毒之源
    if (!isEliteOrBoss && baseHeartLoss > 0) {
        state.monster.virusPenalty = 1;
    }

    if (state.player.hearts <= 0) {
        state.phase = 'ended';
        state.result = 'lose';
        return;
    }

    // 触发非留场牌的离场效果
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            if (!card.keywords.includes('remain') && card.keywords.includes('exit')) {
                FX.fire(Trigger.ON_EXIT, new EffectContext({
                    state, trigger: Trigger.ON_EXIT, card, slotIndex: slot.index
                }));
            }
        }
    }

    // 清理牌桌
    for (const slot of state.slots) {
        const remaining = [];
        for (const card of slot.cards) {
            if (card.keywords.includes('remain')) {
                remaining.push(card);
            } else {
                if (card.reuse) {
                    state.deck.push(card);
                    logCombat(state, `${card.name} 复用效果触发，回到牌组`);
                } else {
                    state.discard.push(card);
                }
            }
        }
        slot.cards = remaining;
        slot.locked = remaining.length > 0 && !remaining[remaining.length - 1].keywords.includes('stack');
        slot.isStacking = remaining.length > 0 && remaining[remaining.length - 1].keywords.includes('stack');
        slot.nextCardBonus = 0;
        slot.roundMultiplierBonus = 0;
    }

    // 清空所有卡牌的临时加成
    const allCards = [
        ...state.deck, ...state.hand, ...state.discard,
        ...state.slots.flatMap(s => s.cards)
    ];
    for (const c of allCards) {
        if (c.tempBonus) c.tempBonus = 0;
    }

    drawCards(state, 4);

    // 触发回合开始效果（留场牌获得堆叠等）
    FX.fire(Trigger.ON_TURN_START, new EffectContext({
        state, trigger: Trigger.ON_TURN_START
    }));

    state.turn++;
    state.turnDamage = 0;
}

// 需要从board导入calculateTotalBoardDamage，为避免循环依赖，这里动态计算
function calculateTotalBoardDamage(state) {
    let total = 0;
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            const val = getCardFinalValue(card, state);
            const mul = getSlotEffectiveMultiplier(slot, state);
            total += val * mul;
        }
    }
    return total;
}

// 内联引用以避免循环依赖
function getCardBaseValue(card) {
    return card.baseValue + card.permanentBonus + (card.tempBonus || 0);
}

function getCardEffectiveValue(card, state) {
    let val = getCardBaseValue(card);
    const ctx = new EffectContext({ state, trigger: Trigger.ON_CALC_VALUE, card, value: val });
    FX.fire(Trigger.ON_CALC_VALUE, ctx);
    return ctx.value;
}

function getCardFinalValue(card, state) {
    let val = getCardEffectiveValue(card, state);
    const ctx = new EffectContext({ state, trigger: Trigger.ON_CALC_FINAL, card, value: val });
    FX.fire(Trigger.ON_CALC_FINAL, ctx);
    return ctx.value;
}

function getSlotEffectiveMultiplier(slot, state) {
    let mul = slot.multiplier + (slot.roundMultiplierBonus || 0);
    const ctx = new EffectContext({ state, trigger: Trigger.ON_SLOT_CALC, slotIndex: slot.index, value: mul });
    FX.fire(Trigger.ON_SLOT_CALC, ctx);
    return ctx.value;
}
