/**
 * Heave! - 战斗系统（第二版）
 * 
 * 负责：
 * 1. 从RunData初始化战斗
 * 2. 回合管理（结束回合、抽牌）
 * 3. 战斗日志
 */

import { shuffleArray, pickRandom } from '../core/utils.js';
import { logCombat, drawCards, shuffleDiscardToDeck, recordTimeline, addBattleLog } from '../core/battle-core.js';
import { CLASS_DEFS, STAGE_CONFIG, MONSTER_DEFS, createCardInstance } from '../data/index.js';
import { FX, EffectContext } from '../effects/core.js';
import { Trigger, DRAW_COUNT, HAND_LIMIT } from '../core/constants.js';
import { calculateTotalBoardDamage, getCardFinalValue } from './board.js';
import { createBattleSlots } from '../core/state.js';
import { getAllStrategies } from './strategy.js';

export { logCombat, drawCards, addBattleLog } from '../core/battle-core.js';

function getActiveRelics(state) {
    const disabledKey = state.monster?.disabledRelicKey;
    return (state.runDataRef?.relics || []).filter(r => !disabledKey || (r.id || r.name) !== disabledKey);
}

// ===== 从RunData初始化战斗 =====

export function initBattleFromRun(runData) {
    const cls = CLASS_DEFS[runData.classId];
    const stageKey = `${runData.act}-${runData.stageIndex + 1}`;
    const config = STAGE_CONFIG[stageKey];
    const monsterDefId = pickRandom(config.monsterPool);
    const monsterDef = MONSTER_DEFS[monsterDefId];
    const nextMonsterHpPenalty = runData.nextMonsterHpPenalty || 0;
    const nextBattleHeartBonus = runData.nextBattleHeartBonus || 0;
    let monsterMaxHp = Math.max(1, monsterDef.hp - nextMonsterHpPenalty);
    const playerMaxHearts = (runData.maxHearts || cls.hearts) + nextBattleHeartBonus;

    const slots = createBattleSlots({
        slotUpgrades: runData.slotUpgrades
    });

    const deck = shuffleArray([...runData.deck]);

    const state = {
        screen: 'battle',
        phase: 'playing',
        player: {
            name: cls.name,
            maxHearts: playerMaxHearts,
            hearts: playerMaxHearts
        },
        monster: {
            id: monsterDef.id,
            name: monsterDef.name,
            maxHp: monsterMaxHp,
            hp: monsterMaxHp,
            description: monsterDef.description,
            keywords: [...monsterDef.keywords],
            keywordDesc: monsterDef.keywordDesc,
            theme: monsterDef.theme,
            type: monsterDef.type,
            shape: monsterDef.shape,
            healPerTurn: 0,
            firstCardDiscard: false,
            firstTurnLessDraw: false,
            lessDraw: 0,
            edgePenalty: 0,
            leftPenalty: 0,
            maxSlotPenalty: 0,
            minSlotPenalty: 0,
            steadyPenalty: false,
            stealGold: false,
            firstCardValuePenalty: 0,
            dodge: false,
            centerGrow1: false,
            allCardPenalty: 0,
            noStrategySlotPenalty: 0,
            prevStrategyPenalty: 0,
            prevStrategyId: null,
            disableDedicate: false,
            yellowDomain: false,
            yellowHeart: false,
            leftSlotBonus: 0,
            centerCardPenalty: 0,
            firstCardRandomSlotRemain: false,
            notFirstSlotPenalty: 0,
            firstCardSlotIndex: -1,
            retainHandCard: false,
            disableFrequentStrategy: false,
            playDiffusionEvery3: 0,
            cardsPlayedThisTurn: 0,
            monsterGrow: 0,
            disableRandomRelic: false,
            disabledRelicId: null,
            disabledRelicKey: null,
            disabledRelicEffect: null,
            loseGoldPerTurn: 0
        },
        slots: slots,
        deck: deck,
        hand: [],
        discard: [],
        turn: 1,
        turnDamage: 0,
        currentStrategy: null,
        firstCardPlayedThisTurn: null,
        firstCardPlayedThisBattle: null,

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
        battleLog: [],
        runDataRef: runData,
        stageKey: stageKey,
        heartsLost: 0,
        firstTurnKill: false,
        pendingPlaceEffects: [],
        pendingGrowthEffects: [],
        effectTimeline: [],
        timelineSeq: 0,
        _playgroundBattle: false,
        _eventBattle: false,
        _eventBattleReward: null,
        _originalStageIndex: undefined
    };

    if (nextMonsterHpPenalty > 0) {
        delete runData.nextMonsterHpPenalty;
        logCombat(state, `顺风波及生效：${state.monster.name} 装甲值减少 ${nextMonsterHpPenalty}`);
        addBattleLog(state, 'other', { text: `顺风波及：${state.monster.name} 装甲值-${nextMonsterHpPenalty}` });
    }
    if (nextBattleHeartBonus > 0) {
        delete runData.nextBattleHeartBonus;
        logCombat(state, `残破克隆镜生效：本场海战备用锚 +${nextBattleHeartBonus}`);
        addBattleLog(state, 'other', { text: `残破克隆镜：备用锚+${nextBattleHeartBonus}` });
    }

    // 解析敌舰技能
    parseMonsterSkills(state.monster);

    // 铁甲私掠舰：第一回合随机指定上回合叠牌（叠牌系统已废弃，保留空逻辑）
    if (state.monster.prevStrategyPenalty > 0) {
        state.monster.prevStrategyId = null;
    }

    // 劫掠号：船体改造偷取——随机禁用一件本场海战内的船体改造效果
    if (state.monster.disableRandomRelic && runData.relics.length > 0) {
        const candidates = runData.relics.filter(r => r.effect);
        const stolen = candidates.length > 0 ? pickRandom(candidates) : null;
        if (stolen) {
            state.monster.disabledRelicId = stolen.id;
            state.monster.disabledRelicKey = stolen.id || stolen.name;
            state.monster.disabledRelicEffect = { ...stolen.effect };
            logCombat(state, `${state.monster.name} 的技能生效：${stolen.name} 的效果本场海战失效！`);
        } else {
            logCombat(state, `${state.monster.name} 的技能生效，但你的船体改造似乎没什么可偷的...`);
        }
    }
    recordTimeline(state, 'battle_start', {
        stageKey,
        monsterName: state.monster.name,
        monsterHp: state.monster.hp,
        playerHearts: state.player.hearts
    });

    // 金王之心：每场海战开始赋予矿舱内随机一块矿石预热词条
    const yellowHeartRelic = getActiveRelics(state).find(r => r.effect?.type === 'dedicate_permanent');
    if (yellowHeartRelic) {
        const candidates = deck.filter(c => !c.keywords.includes('dedicate'));
        if (candidates.length > 0) {
            const card = pickRandom(candidates);
            card.keywords.push('dedicate');
            logCombat(state, `${yellowHeartRelic.name} 生效：${card.name} 获得预热词条`);
            addBattleLog(state, 'relic', { relicName: yellowHeartRelic.name, text: `${card.name} 获得预热` });
        }
    }

    // 黄之肉：矿舱内所有带预热词条的矿石获得共生词条
    const yellowFleshRelic = getActiveRelics(state).find(r => r.effect?.type === 'dedicate_chain');
    if (yellowFleshRelic) {
        let count = 0;
        for (const card of deck) {
            if (card.keywords.includes('dedicate') && !card.keywords.includes('chain')) {
                card.keywords.push('chain');
                count++;
            }
        }
        if (count > 0) {
            logCombat(state, `${yellowFleshRelic.name} 生效：${count} 块预热矿获得共生`);
            addBattleLog(state, 'relic', { relicName: yellowFleshRelic.name, text: `${count}块预热矿获得共生` });
        }
    }

    const startGoldRelic = getActiveRelics(state).find(r => r.effect?.type === 'battle_start_gold');
    if (startGoldRelic) {
        const gold = startGoldRelic.effect.gold || 1;
        runData.gold = (runData.gold || 0) + gold;
        logCombat(state, `${startGoldRelic.name} 生效：获得 ${gold} 银元`);
        addBattleLog(state, 'relic', { relicName: startGoldRelic.name, text: `获得${gold}银元` });
    }

    shuffleDiscardToDeck(state);

    // 处理少抽牌（敌舰技能）
    let drawCount = DRAW_COUNT;
    if (state.monster.lessDraw > 0) {
        drawCount = Math.max(1, drawCount - state.monster.lessDraw);
        logCombat(state, `${state.monster.name} 的技能生效：每回合少抽 ${state.monster.lessDraw} 张牌`);
    }
    if (state.monster.firstTurnLessDraw && state.turn === 1) {
        drawCount = Math.max(1, drawCount - 1);
        logCombat(state, `${state.monster.name} 的技能生效：第一回合少抽一张牌`);
    }
    drawCards(state, drawCount);

    const firstTurnDrawRelic = getActiveRelics(state).find(r => r.effect?.type === 'first_turn_extra_draw');
    if (firstTurnDrawRelic && state.turn === 1) {
        const extraDraw = firstTurnDrawRelic.effect.bonus || 1;
        drawCards(state, extraDraw);
        logCombat(state, `${firstTurnDrawRelic.name} 生效，首回合额外抽 ${extraDraw} 张牌`);
    }

    // 印卡：每场海战开始将一张作弊卡加入精炼盘
    const printCardRelic = getActiveRelics(state).find(r => r.effect?.type === 'print_cheat_card');
    if (printCardRelic) {
        const cheatCard = createCardInstance('cheat_card');
        if (cheatCard) {
            cheatCard.isDerived = true;
            state.hand.push(cheatCard);
            logCombat(state, `${printCardRelic.name} 生效：获得一张作弊卡`);
            addBattleLog(state, 'relic', { relicName: printCardRelic.name, text: `获得作弊卡` });
        }
    }

    // 播放对应BGM
    if (typeof GameAudio !== 'undefined') {
        const bgmType = monsterDef.type === 'boss' ? 'boss' : 'normal';
        GameAudio.playBGM(bgmType);
    }

    // 触发第一回合开始效果（敌舰恢复等）
    FX.fire(Trigger.ON_TURN_START, EffectContext({
        state, trigger: Trigger.ON_TURN_START
    }));

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
            case 'less_draw_1': monster.lessDraw = 1; break;
            case 'max_slot_penalty_1': monster.maxSlotPenalty = 1; break;
            case 'min_slot_penalty_1': monster.minSlotPenalty = 1; break;
            case 'steady_penalty': monster.steadyPenalty = true; break;
            case 'steal_gold': monster.stealGold = true; break;
            case 'first_card_value_penalty_5': monster.firstCardValuePenalty = 5; break;
            case 'dodge': monster.dodge = true; break;
            case 'center_grow_1': monster.centerGrow1 = true; break;
            case 'all_card_penalty_2': monster.allCardPenalty = 2; break;
            case 'no_strategy_slot_penalty_10': monster.noStrategySlotPenalty = 10; break;
            case 'prev_strategy_penalty_5': monster.prevStrategyPenalty = 5; break;
            case 'disable_dedicate': monster.disableDedicate = true; break;
            case 'yellow_domain': monster.yellowDomain = true; break;
            case 'yellow_heart': monster.yellowHeart = true; break;
            case 'left_slot_bonus_1': monster.leftSlotBonus = 1; break;
            case 'center_card_penalty_5': monster.centerCardPenalty = 5; break;
            case 'first_card_random_slot_remain': monster.firstCardRandomSlotRemain = true; break;
            case 'not_first_slot_penalty_5': monster.notFirstSlotPenalty = 5; break;
            case 'retain_hand_card': monster.retainHandCard = true; break;
            case 'disable_frequent_strategy': monster.disableFrequentStrategy = true; break;
            case 'play_diffusion_every_3': monster.playDiffusionEvery3 = 3; break;
            case 'monster_grow_100': monster.monsterGrow = 100; break;
            case 'disable_random_relic': monster.disableRandomRelic = true; break;
            case 'lose_gold_per_turn': monster.loseGoldPerTurn = 1; break;
        }
    }
}

// ===== 结束回合 =====

export function endTurn(state) {
    if (state.phase !== 'playing') return;
    if (typeof GameAudio !== 'undefined') GameAudio.playEndTurn();
    recordTimeline(state, 'turn_end_start', { turn: state.turn });

    // 叠牌系统已废弃，叠牌加成自动生效
    state.currentStrategy = null;

    // 计算伤害（含叠牌加成）
    let totalDmg = calculateTotalBoardDamage(state);

    // 闪避：每回合受到的前2点伤害无效
    if (state.monster.dodge) {
        const dodgeAmt = 2;
        const origDmg = totalDmg;
        totalDmg = Math.max(0, totalDmg - dodgeAmt);
        if (origDmg !== totalDmg) {
            recordTimeline(state, 'monster_dodge', {
                monsterName: state.monster.name,
                amount: origDmg - totalDmg
            });
            logCombat(state, `${state.monster.name} 闪避了 ${origDmg - totalDmg} 点伤害`);
            addBattleLog(state, 'monster_skill', { text: `${state.monster.name} 闪避${origDmg - totalDmg}伤害` });
        }
    }

    state.turnDamage = totalDmg;

    // 掠夺银元：每造成一次伤害减少玩家1银元
    if (state.monster.stealGold && totalDmg > 0) {
        const stolen = Math.min(1, state.runDataRef?.gold || 0);
        if (state.runDataRef && stolen > 0) {
            state.runDataRef.gold -= stolen;
            logCombat(state, `${state.monster.name} 窃取了 ${stolen} 银元！`);
            addBattleLog(state, 'monster_skill', { text: `${state.monster.name} 窃取${stolen}银元` });
        }
    }

    // 敌舰扣血
    const monsterHpBefore = state.monster.hp;
    state.monster.hp = Math.max(0, monsterHpBefore - totalDmg);
    recordTimeline(state, 'monster_damage', {
        monsterName: state.monster.name,
        amount: totalDmg,
        hpBefore: monsterHpBefore,
        hpAfter: state.monster.hp
    });

    if (totalDmg > 0) {
        state.monsterFlash = 15;
        if (typeof GameAudio !== 'undefined') GameAudio.playDamage();
        if (typeof window !== 'undefined' && window.RenderFX) {
            const mx = 640;
            const my = 120;
            window.RenderFX.spawnDamage(mx, my, totalDmg, totalDmg >= state.monster.maxHp * 0.3);
            const overflow = Math.max(0, totalDmg - monsterHpBefore);
            const intensity = Math.min(18, 3 + overflow * 0.15);
            const decay = Math.max(0.75, 0.92 - overflow * 0.002);
            window.RenderFX.screenShake.trigger(intensity, decay);
        }
    }

    logCombat(state, `第${state.turn}回合造成 ${totalDmg} 伤害，敌舰剩余 ${state.monster.hp} HP`);

    // 对战记录：伤害事件
    if (totalDmg > 0) {
        addBattleLog(state, 'damage', {
            amount: totalDmg,
            hpBefore: monsterHpBefore,
            hpAfter: state.monster.hp,
            text: `造成 ${totalDmg} 点伤害`
        });
    }

    // 检查击杀
    if (state.monster.hp <= 0) {
        state.phase = 'ended';
        state.result = 'win';
        recordTimeline(state, 'battle_result', { result: 'win', turn: state.turn });
        if (state.turn === 1) {
            state.firstTurnKill = true;
        }
        if (typeof window !== 'undefined' && window.RenderFX) {
            window.RenderFX.spawnVictory(640, 120);
        }
        if (typeof GameAudio !== 'undefined') GameAudio.playMonsterDeath();
        return;
    }

    // 扣生命值
    state.player.hearts -= 1;
    state.heartsLost += 1;
    recordTimeline(state, 'player_heart_loss', {
        amount: 1,
        heartsAfter: state.player.hearts
    });
    if (typeof GameAudio !== 'undefined') GameAudio.playHeartLoss();
    if (typeof window !== 'undefined' && window.RenderFX) {
        const heartX = 50 + (state.player.hearts) * 36 + 15;
        window.RenderFX.spawnHeartBreak(heartX, 155);
        window.RenderFX.flash.triggerScreen('#ff0000', 6);
    }
    logCombat(state, `失去 1 生命值！剩余 ${state.player.hearts} 生命值`);

    // 对战记录：扣血事件（作为回合分隔符，显眼）
    addBattleLog(state, 'heart_loss', {
        amount: 1,
        heartsAfter: state.player.hearts,
        text: `失去 1 生命值（剩余${state.player.hearts}）`
    });

    if (state.player.hearts <= 0) {
        state.phase = 'ended';
        state.result = 'lose';
        recordTimeline(state, 'battle_result', { result: 'lose', turn: state.turn });
        return;
    }

    // 点金术：回合结束时按当前精炼盘数获得银元
    const alchemy = getActiveRelics(state).find(r => r.effect?.type === 'hand_gold_per_turn');
    if (alchemy && state.runDataRef) {
        const gold = (alchemy.effect.gold || 1) * state.hand.length;
        if (gold > 0) {
            state.runDataRef.gold += gold;
            logCombat(state, `${alchemy.name} 生效：按精炼盘数获得 ${gold} 银元`);
            addBattleLog(state, 'relic', { relicName: alchemy.name, text: `按精炼盘数获得${gold}银元` });
        }
    }

    // 清理铸造台（驻台余烬一回合，其余入矿渣堆）
    for (const slot of state.slots) {
        const remaining = [];
        for (const card of slot.cards) {
            if (card.keywords.includes('remain') && !card.remainExhausted) {
                card.removeRemainOnNextTurnStart = true;
                remaining.push(card);
            } else {
                delete card.remainExhausted;
                state.discard.push(card);
            }
        }
        slot.cards = remaining;
        slot.nextCardBonus = 0;
        slot.roundMultiplierBonus = 0;
        // 重置淬火效果标记
        slot.intenseTrainingActive = false;
        slot.groupTrainingActive = false;
        slot.cogitoAppliedThisTurn = false;
    }

    // 非余烬精炼盘丢弃
    const retainedHand = [];
    for (const card of state.hand) {
        if (card.keywords.includes('retain')) {
            retainedHand.push(card);
        } else {
            state.discard.push(card);
        }
    }
    state.hand = retainedHand;

    // 清空所有矿石的临时加成
    const boardCardIds = {};
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            boardCardIds[card.uuid] = true;
        }
    }
    const allCards = [
        ...state.deck, ...state.hand, ...state.discard,
        ...state.slots.flatMap(s => s.cards)
    ];
    for (const c of allCards) {
        if (c.tempBonus) c.tempBonus = 0;
    }
    recordTimeline(state, 'turn_cleanup_done', { nextTurn: state.turn + 1 });

    state.turn++;
    state.turnDamage = 0;
    state.currentStrategy = null;
    state.firstCardPlayedThisTurn = null;
    state.monster.firstCardSlotIndex = -1;
    state.monster.cardsPlayedThisTurn = 0;

    // 清除上回合被迷雾号禁用的矿石标记（精炼盘、矿舱、矿渣堆全部清理）
    const allRetainCards = [...state.hand, ...state.deck, ...state.discard];
    for (const card of allRetainCards) {
        if (card.retainDisabledThisTurn) {
            delete card.retainDisabledThisTurn;
        }
    }

    recordTimeline(state, 'turn_start', { turn: state.turn });

    // 矿渣堆洗回矿舱，抽5张
    shuffleDiscardToDeck(state);
    let nextDrawCount = DRAW_COUNT;
    if (state.monster.lessDraw > 0) {
        nextDrawCount = Math.max(1, nextDrawCount - state.monster.lessDraw);
        logCombat(state, `${state.monster.name} 的技能生效：每回合少抽 ${state.monster.lessDraw} 张牌`);
    }
    drawCards(state, nextDrawCount);

    const firstTurnDrawNext = getActiveRelics(state).find(r => r.effect?.type === 'first_turn_extra_draw');
    if (firstTurnDrawNext && state.turn === 1) {
        const extraDraw = firstTurnDrawNext.effect.bonus || 1;
        drawCards(state, extraDraw);
        logCombat(state, `${firstTurnDrawNext.name} 生效，首回合额外抽 ${extraDraw} 张牌`);
    }

    // 触发回合开始效果
    FX.fire(Trigger.ON_TURN_START, EffectContext({
        state, trigger: Trigger.ON_TURN_START
    }));
}
