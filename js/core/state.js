/**
 * 卡牌地下城 - 游戏状态管理
 */

import { shuffleArray, getAvailableSlotIndices } from './utils.js';
import { SLOT_COUNT, MAX_UNLOCKED_SLOTS } from './constants.js';
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
 * 创建战斗格子（供 createInitialState 和 initBattleFromRun 共享）
 */
export function createBattleSlots({ slotCount, unlockedSlots, classRelic, slotUpgrades = {} }) {
    const availableIndices = getAvailableSlotIndices(slotCount, unlockedSlots);
    const slots = [];
    for (let i = 0; i < slotCount; i++) {
        const isAvailable = availableIndices.includes(i);
        let mul = isAvailable ? 1 : 0;
        if (isAvailable && classRelic.effect.type === 'slot_multiplier' && classRelic.effect.slotIndex === i) {
            mul += classRelic.effect.bonus;
        }
        const upgradeCount = slotUpgrades[i] || 0;
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
        souls: 0,
        heartsLostInStage: 0,
        deck: shuffleArray(createDeck(cls)),
        relics: [cls.relic],
        slotCount: SLOT_COUNT,
        unlockedSlots: MAX_UNLOCKED_SLOTS,
        classId: classId,
        completedStages: [],
        shopStock: null,
        blacksmithStock: null,
        slotUpgrades: {},
        blacksmithSlotCosts: [2, 2, 2, 2, 2],
        shopUpgradeCost: 1,
        shopRefreshCost: 1,
        blacksmithEnchantCost: 4,
        blacksmithRefreshCost: 1,
        pendingPostBattle: null,
        pendingSoulsGained: 0,
        firstUpgradeDiscount: true,
        firstBlacksmithRefreshFree: true
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
    const cls = CLASS_DEFS.soldier;
    const deck = shuffleArray(createDeck(cls));
    const monster = MONSTER_DEFS.lone_rat;

    const slots = createBattleSlots({
        slotCount: SLOT_COUNT,
        unlockedSlots: MAX_UNLOCKED_SLOTS,
        classRelic: cls.relic
    });

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
        runDataRef: null,
        stageKey: 'test',
        heartsLost: 0
    };
}

export function startBattle() {
    const state = createInitialState();
    return state;
}
