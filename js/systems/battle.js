/**
 * 卡牌地下城 - 战斗系统（第二版）
 * 
 * 负责：
 * 1. 从RunData初始化战斗
 * 2. 回合管理（结束回合、抽牌）
 * 3. 战斗日志
 */

import { shuffleArray, pickRandom } from '../core/utils.js';
import { logCombat, drawCards, shuffleDiscardToDeck } from '../core/battle-core.js';
import { CLASS_DEFS, STAGE_CONFIG, MONSTER_DEFS } from '../data/index.js';
import { FX, EffectContext } from '../effects/core.js';
import { Trigger, DRAW_COUNT } from '../core/constants.js';
import { calculateTotalBoardDamage } from './board.js';
import { createBattleSlots } from '../core/state.js';
import { detectStrategy } from './strategy.js';

export { logCombat, drawCards } from '../core/battle-core.js';

// ===== 从RunData初始化战斗 =====

export function initBattleFromRun(runData) {
    const cls = CLASS_DEFS[runData.classId];
    const stageKey = `${runData.act}-${runData.stageIndex + 1}`;
    const config = STAGE_CONFIG[stageKey];
    const monsterDefId = pickRandom(config.monsterPool);
    const monsterDef = MONSTER_DEFS[monsterDefId];

    const slots = createBattleSlots({
        slotUpgrades: runData.slotUpgrades
    });

    const deck = shuffleArray([...runData.deck]);

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
            healPerTurn: 0,
            firstCardDiscard: false,
            firstTurnLessDraw: false,
            edgePenalty: 0,
            leftPenalty: 0,
            maxSlotPenalty: 0,
            minSlotPenalty: 0,
            steadyPenalty: false,
            stealGold: false,
            firstCardValuePenalty: 0,
            dodge: false
        },
        slots: slots,
        deck: deck,
        hand: [],
        discard: [],
        turn: 1,
        turnDamage: 0,
        currentStrategy: null,
        firstCardPlayedThisTurn: null,

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
        firstTurnKill: false,
        pendingPlaceEffects: [],
        pendingGrowthEffects: [],
        _playgroundBattle: false,
        _eventBattle: false,
        _eventBattleReward: null,
        _originalStageIndex: undefined
    };

    // 解析怪物技能
    parseMonsterSkills(state.monster);

    shuffleDiscardToDeck(state);

    // 处理第一回合少抽牌（怪物技能）
    let drawCount = DRAW_COUNT;
    if (state.monster.firstTurnLessDraw && state.turn === 1) {
        drawCount = Math.max(1, drawCount - 1);
        logCombat(state, `${state.monster.name} 的技能生效：第一回合少抽一张牌`);
    }
    drawCards(state, drawCount);

    // 播放对应BGM
    if (typeof GameAudio !== 'undefined') {
        const bgmType = monsterDef.type === 'boss' ? 'boss' : 'normal';
        GameAudio.playBGM(bgmType);
    }

    return state;
}

function parseMonsterSkills(monster) {
    for (const kw of monster.keywords) {
        switch (kw) {
            case 'heal_20': monster.healPerTurn = 20; break;
            case 'edge_penalty_5': monster.edgePenalty = 5; break;
            case 'left_penalty_10': monster.leftPenalty = 10; break;
            case 'first_card_discard': monster.firstCardDiscard = true; break;
            case 'first_turn_less_draw': monster.firstTurnLessDraw = true; break;
            case 'max_slot_penalty_1': monster.maxSlotPenalty = 1; break;
            case 'min_slot_penalty_1': monster.minSlotPenalty = 1; break;
            case 'steady_penalty': monster.steadyPenalty = true; break;
            case 'steal_gold': monster.stealGold = true; break;
            case 'first_card_value_penalty_5': monster.firstCardValuePenalty = 5; break;
            case 'dodge': monster.dodge = true; break;
        }
    }
}

// ===== 结束回合 =====

export function endTurn(state) {
    if (state.phase !== 'playing') return;
    if (typeof GameAudio !== 'undefined') GameAudio.playEndTurn();

    // 检测当前计策
    state.currentStrategy = detectStrategy(state.slots, state.runDataRef?.strategyLevels);
    if (state.currentStrategy) {
        logCombat(state, `触发计策：${state.currentStrategy.name}！`);
    }

    // 稳重推进惩罚检测（怪物技能）
    if (state.monster.steadyPenalty && state.currentStrategy && state.currentStrategy.id === 'steady_push') {
        for (const slot of state.slots) {
            slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) - 1;
        }
        logCombat(state, `${state.monster.name} 的技能生效：使用稳重推进，所有倍率格点数-1`);
    }

    // 计算伤害（含计策加成）
    let totalDmg = calculateTotalBoardDamage(state);

    // 闪避：每回合受到的前2点伤害无效
    if (state.monster.dodge) {
        const dodgeAmt = 2;
        const origDmg = totalDmg;
        totalDmg = Math.max(0, totalDmg - dodgeAmt);
        if (origDmg !== totalDmg) {
            logCombat(state, `${state.monster.name} 闪避了 ${origDmg - totalDmg} 点伤害`);
        }
    }

    // 怪物每回合恢复
    if (state.monster.healPerTurn > 0) {
        const heal = state.monster.healPerTurn;
        state.monster.hp = Math.min(state.monster.maxHp, state.monster.hp + heal);
        logCombat(state, `${state.monster.name} 恢复了 ${heal} 点血量`);
    }

    state.turnDamage = totalDmg;

    // 掠夺金币：每造成一次伤害减少玩家1金币
    if (state.monster.stealGold && totalDmg > 0) {
        const stolen = Math.min(1, state.runDataRef?.gold || 0);
        if (state.runDataRef && stolen > 0) {
            state.runDataRef.gold -= stolen;
            logCombat(state, `${state.monster.name} 窃取了 ${stolen} 金币！`);
        }
    }

    // 怪物扣血
    state.monster.hp = Math.max(0, state.monster.hp - totalDmg);

    if (totalDmg > 0) {
        state.monsterFlash = 15;
        if (typeof GameAudio !== 'undefined') GameAudio.playDamage();
        if (typeof window !== 'undefined' && window.RenderFX) {
            const mx = 640;
            const my = 120;
            window.RenderFX.spawnDamage(mx, my, totalDmg, totalDmg >= state.monster.maxHp * 0.3);
            const overflow = Math.max(0, totalDmg - state.monster.hp);
            const intensity = Math.min(18, 3 + overflow * 0.15);
            const decay = Math.max(0.75, 0.92 - overflow * 0.002);
            window.RenderFX.screenShake.trigger(intensity, decay);
        }
    }

    logCombat(state, `第${state.turn}回合造成 ${totalDmg} 伤害，怪物剩余 ${state.monster.hp} HP`);

    // 检查击杀
    if (state.monster.hp <= 0) {
        state.phase = 'ended';
        state.result = 'win';
        if (state.turn === 1) {
            state.firstTurnKill = true;
        }
        if (typeof window !== 'undefined' && window.RenderFX) {
            window.RenderFX.spawnVictory(640, 120);
        }
        if (typeof GameAudio !== 'undefined') GameAudio.playMonsterDeath();
        return;
    }

    // 扣人群
    state.player.hearts -= 1;
    state.heartsLost += 1;
    if (typeof GameAudio !== 'undefined') GameAudio.playHeartLoss();
    if (typeof window !== 'undefined' && window.RenderFX) {
        const heartX = 50 + (state.player.hearts) * 36 + 15;
        window.RenderFX.spawnHeartBreak(heartX, 155);
    }
    logCombat(state, `失去 1 人群！剩余 ${state.player.hearts} 人群`);

    if (state.player.hearts <= 0) {
        state.phase = 'ended';
        state.result = 'lose';
        return;
    }

    // 清理牌桌（留场保留，其余入弃牌堆）
    for (const slot of state.slots) {
        const remaining = [];
        for (const card of slot.cards) {
            if (card.keywords.includes('remain')) {
                remaining.push(card);
            } else {
                state.discard.push(card);
            }
        }
        slot.cards = remaining;
        slot.nextCardBonus = 0;
        slot.roundMultiplierBonus = 0;
        // 重置训练效果标记
        slot.intenseTrainingActive = false;
        slot.groupTrainingActive = false;
    }

    // 非保留手牌丢弃
    const retainedHand = [];
    for (const card of state.hand) {
        if (card.keywords.includes('retain')) {
            retainedHand.push(card);
        } else {
            state.discard.push(card);
        }
    }
    state.hand = retainedHand;

    // 清空所有卡牌的临时加成
    const allCards = [
        ...state.deck, ...state.hand, ...state.discard,
        ...state.slots.flatMap(s => s.cards)
    ];
    for (const c of allCards) {
        if (c.tempBonus) c.tempBonus = 0;
        c.dedicateTriggered = false;
    }

    // 弃牌堆洗回牌库，抽5张
    shuffleDiscardToDeck(state);
    drawCards(state, DRAW_COUNT);

    // 触发回合开始效果
    FX.fire(Trigger.ON_TURN_START, new EffectContext({
        state, trigger: Trigger.ON_TURN_START
    }));

    state.turn++;
    state.turnDamage = 0;
    state.currentStrategy = null;
    state.firstCardPlayedThisTurn = null;
}
