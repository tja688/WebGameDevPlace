/**
 * 卡牌地下城 - 战斗系统
 * 
 * 负责：
 * 1. 从RunData初始化战斗
 * 2. 回合管理（结束回合、抽牌）
 * 3. 战斗日志
 */

import { shuffleArray, pickRandom } from '../core/utils.js';
import { logCombat, drawCards } from '../core/battle-core.js';
import { CLASS_DEFS, STAGE_CONFIG, MONSTER_DEFS } from '../data/index.js';
import { FX, EffectContext } from '../effects/core.js';
import { Trigger } from '../core/constants.js';
import { calculateTotalBoardDamage } from './board.js';
import { createBattleSlots } from '../core/state.js';

export { logCombat, drawCards } from '../core/battle-core.js';

// ===== 从RunData初始化战斗 =====

export function initBattleFromRun(runData) {
    const cls = CLASS_DEFS[runData.classId];
    const stageKey = `${runData.act}-${runData.stageIndex + 1}`;
    const config = STAGE_CONFIG[stageKey];
    const monsterDefId = pickRandom(config.monsterPool);
    const monsterDef = MONSTER_DEFS[monsterDefId];

    const slots = createBattleSlots({
        slotCount: runData.slotCount,
        unlockedSlots: runData.unlockedSlots,
        classRelic: cls.relic,
        slotUpgrades: runData.slotUpgrades
    });

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
            shape: monsterDef.shape,
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
        heartsLost: 0,
        pendingPlaceEffects: [],
        pendingGrowthEffects: []
    };

    drawCards(state, 4);

    // 播放对应BGM
    if (typeof GameAudio !== 'undefined') {
        const bgmType = monsterDef.type === 'boss' ? 'boss' : 'normal';
        GameAudio.playBGM(bgmType);
    }

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

    let totalDmg = calculateTotalBoardDamage(state);
    if (state.monster.keywords.includes('dodge')) {
        const dodgeAmt = 2;
        const origDmg = totalDmg;
        totalDmg = Math.max(0, totalDmg - dodgeAmt);
        if (origDmg !== totalDmg) {
            logCombat(state, `蝙蝠闪避了 ${origDmg - totalDmg} 点伤害`);
        }
    }
    state.turnDamage = totalDmg;
    state.totalDamage += totalDmg;
    state.monster.hp = Math.max(0, state.monster.hp - totalDmg);

    if (totalDmg > 0) {
        state.monsterFlash = 15;
        if (typeof GameAudio !== 'undefined') GameAudio.playDamage();
        // 伤害飘字特效
        if (typeof window !== 'undefined' && window.RenderFX) {
            const mx = 640;
            const my = 120;
            window.RenderFX.spawnDamage(mx, my, totalDmg, totalDmg >= state.monster.maxHp * 0.3);
            // 屏幕晃动：溢出越多晃动越大
            const overflow = Math.max(0, totalDmg - state.monster.hp);
            const intensity = Math.min(18, 3 + overflow * 0.15);
            const decay = Math.max(0.75, 0.92 - overflow * 0.002);
            window.RenderFX.screenShake.trigger(intensity, decay);
        }
    }

    logCombat(state, `第${state.turn}回合造成 ${totalDmg} 伤害，怪物剩余 ${state.monster.hp} HP`);

    if (state.monster.hp <= 0) {
        state.phase = 'ended';
        state.result = 'win';
        if (typeof window !== 'undefined' && window.RenderFX) {
            window.RenderFX.spawnVictory(640, 120);
        }
        if (typeof GameAudio !== 'undefined') GameAudio.playMonsterDeath();
        return;
    }

    // 扣心（每回合固定扣1心）
    state.player.hearts -= 1;
    state.heartsLost += 1;
    if (typeof GameAudio !== 'undefined') GameAudio.playHeartLoss();
    // 心损失视觉特效
    if (typeof window !== 'undefined' && window.RenderFX) {
        const heartX = 50 + (state.player.hearts) * 36 + 15;
        window.RenderFX.spawnHeartBreak(heartX, 155);
    }
    logCombat(state, `失去 1 颗心！剩余 ${state.player.hearts} 颗`);

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


