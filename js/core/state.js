/**
 * 卡牌地下城 - 游戏状态管理（第二版）
 */

import { shuffleArray } from './utils.js';
import { SLOT_COUNT, DRAW_COUNT } from './constants.js';
import { createDeck } from '../data/index.js';
import { CLASS_DEFS, STAGE_CONFIG, MONSTER_DEFS } from '../data/index.js';

export function createGameState(screen) {
    return {
        screen: screen || 'title',
        animTime: 0,
        message: null,
        messageTimer: 0,
        data: {}
    };
}

/**
 * 创建战斗格子（固定3格）
 */
export function createBattleSlots({ slotUpgrades = {} }) {
    const slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
        let mul = 1;
        const upgradeCount = slotUpgrades[i] || 0;
        mul += upgradeCount;
        slots.push({
            index: i,
            multiplier: mul,
            baseMultiplier: mul - upgradeCount,
            cards: [],
            nextCardBonus: 0,
            roundMultiplierBonus: 0,
            intenseTrainingActive: false,
            groupTrainingActive: false
        });
    }
    return slots;
}

export function switchScreen(state, newScreen, data) {
    state.screen = newScreen;
    state.data = data || {};
    state.message = null;
    state.messageTimer = 0;
}

export function createRunData(classId) {
    const cls = CLASS_DEFS[classId];
    return {
        act: 1,
        stageIndex: 0,
        gold: 0,           // 金币（替代魂）
        heartsLostInStage: 0,
        deck: shuffleArray(createDeck(cls)),
        startingDeck: JSON.parse(JSON.stringify(cls.startingDeck)),
        relics: [cls.relic],
        classId: classId,
        completedStages: [],
        shopStock: null,
        blacksmithStock: null,
        slotUpgrades: {},
        // 商店费用追踪
        shopUpgradeCost: 1,         // 数值强化基础费用
        shopUpgradeCosts: {},       // 每张卡牌的强化费用 {cardId: cost}
        shopRefreshCost: 5,
        shopRefreshCount: 0,
        firstUpgradeDiscount: true, // 首次强化-1金币
        // 铁匠费用追踪
        blacksmithSlotCosts: [0, 0, 0], // 每格升级费用累积
        blacksmithSlotUpgraded: false,  // 本层是否已免费升级过格子
        blacksmithEnchantCost: 2,       // 当前附魔费用（按稀有度）
        blacksmithRefreshCost: 5,
        blacksmithRefreshCount: 0,
        blacksmithFirstEnchantFree: true, // 新人福利：首次附魔免费
        firstBlacksmithRefreshFree: true,
        // 战后事件
        pendingPostBattle: null,
        pendingGoldGained: 0,
        // 计策强化等级
        strategyLevels: {},
        // 跨层保留
        extraMultiplier: 1   // 额外指数（遗物加成）
    };
}

export function getCurrentStageKey(runData) {
    return `${runData.act}-${runData.stageIndex + 1}`;
}

export function getStageConfig(runData) {
    return STAGE_CONFIG[getCurrentStageKey(runData)];
}

export function isRunComplete(runData) {
    return runData.stageIndex >= 8;
}

// ===== 调试/测试用的初始状态 =====
export function createInitialState() {
    const cls = CLASS_DEFS.veteran;
    const deck = shuffleArray(createDeck(cls));
    const monster = MONSTER_DEFS.lone_rat;

    const slots = createBattleSlots({});

    return {
        screen: 'battle',
        phase: 'playing',
        player: {
            name: cls.name,
            maxHearts: cls.hearts,
            hearts: cls.hearts,
            relic: cls.relic
        },
        monster: {
            name: monster.name,
            maxHp: monster.hp,
            hp: monster.hp,
            description: monster.description,
            keywords: [...monster.keywords],
            keywordDesc: monster.keywordDesc,
            theme: monster.theme,
            type: monster.type,
            shape: monster.shape,
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
            hardSkin: false,
            dodge: false
        },
        slots: slots,
        deck: deck,
        hand: [],
        discard: [],
        turn: 1,
        turnDamage: 0,
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
        runDataRef: null,
        stageKey: 'test',
        heartsLost: 0,
        firstCardPlayedThisTurn: null
    };
}

export function startBattle() {
    const state = createInitialState();
    return state;
}
