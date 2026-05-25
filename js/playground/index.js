/**
 * 卡牌地下城 - Playground 入口
 *
 * 职责：
 * 1. 初始化 Playground 状态结构
 * 2. 提供 screen 切换函数（主菜单 ↔ Playground 菜单 ↔ 词条效果沙盒 ↔ 对战测试场）
 * 3. 协调 scenario-engine、ui-controller、renderer、ai-harness
 * 4. 对战测试场状态管理（人类友好的真实战斗测试）
 */

import { switchScreen, createRunData, createBattleSlots } from '../core/state.js';
import { executeScenario } from './scenario-engine.js';
import { EFFECT_SCENARIOS, SCENARIO_CATEGORIES } from './scenario-data.js';
import { loadCustomScenarios, saveCustomScenario } from './local-storage.js';
import { AITest } from './ai-harness.js';
import { shuffleArray } from '../core/utils.js';
import { drawCards, shuffleDiscardToDeck } from '../core/battle-core.js';
import { createCardInstance, CARD_DEFS, MONSTER_DEFS, CLASS_DEFS } from '../data/index.js';
import { DRAW_COUNT, HAND_LIMIT } from '../core/constants.js';

// ===== Playground 状态 =====

export const PlaygroundState = {
    // 当前视图：'menu' | 'effect' | 'battle'
    view: 'menu',

    // 当前选中的场景 ID
    selectedScenarioId: null,

    // 最近一次执行结果
    lastResult: null,

    // 沙盒中的 battle state（用于可视化交互）
    sandboxState: null,

    // 对战测试场当前怪物 ID
    pgMonsterId: null,

    // UI 状态
    ui: {
        showEditor: false,
        editorContent: '',
        running: false,
        hoverScenario: null,
        hoverButton: null,
        hoverSlot: null,
        hoverCard: null,
        message: null,
        messageTimer: 0
    }
};

// ===== 场景获取 =====

export function getAllScenarios() {
    const preset = [...EFFECT_SCENARIOS];
    const custom = Object.values(loadCustomScenarios());
    const byId = {};
    const order = [];
    for (const s of preset) {
        if (!byId[s.id]) order.push(s.id);
        byId[s.id] = s;
    }
    for (const s of custom) {
        if (!byId[s.id]) order.push(s.id);
        byId[s.id] = s;
    }
    return order.map(id => byId[id]);
}

export function getScenarioById(id) {
    const custom = loadCustomScenarios();
    if (custom[id]) return custom[id];
    return EFFECT_SCENARIOS.find(s => s.id === id) || null;
}

export function getScenariosByCategory(category) {
    return getAllScenarios().filter(s => s.category === category);
}

// ===== 状态操作 =====

export function resetPlaygroundState() {
    PlaygroundState.view = 'menu';
    PlaygroundState.selectedScenarioId = null;
    PlaygroundState.lastResult = null;
    PlaygroundState.sandboxState = null;
    PlaygroundState.pgMonsterId = null;
    PlaygroundState.ui.showEditor = false;
    PlaygroundState.ui.editorContent = '';
    PlaygroundState.ui.running = false;
    PlaygroundState.ui.hoverScenario = null;
    PlaygroundState.ui.hoverButton = null;
    PlaygroundState.ui.message = null;
    PlaygroundState.ui.messageTimer = 0;
}

// ===== Screen 切换 =====

export function enterPlayground(gameState) {
    resetPlaygroundState();
    switchScreen(gameState, 'playground', {
        pgView: 'menu',
        pgCategories: SCENARIO_CATEGORIES,
        pgScenarios: getAllScenarios()
    });
}

export function exitPlayground(gameState) {
    resetPlaygroundState();
    switchScreen(gameState, 'title', {});
}

export function enterEffectSandbox(gameState, scenarioId) {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) return;

    PlaygroundState.view = 'effect';
    PlaygroundState.selectedScenarioId = scenarioId;
    PlaygroundState.ui.editorContent = JSON.stringify(scenario, null, 2);

    // 执行一次获取初始状态
    const result = executeScenario(scenario);
    PlaygroundState.lastResult = result;
    PlaygroundState.sandboxState = result.stateAfter;

    gameState.data.pgView = 'effect';
    gameState.data.pgScenario = scenario;
    gameState.data.pgResult = result;
}

export function backToPlaygroundMenu(gameState) {
    PlaygroundState.view = 'menu';
    PlaygroundState.selectedScenarioId = null;
    PlaygroundState.lastResult = null;
    PlaygroundState.sandboxState = null;
    PlaygroundState.ui.showEditor = false;

    gameState.data.pgView = 'menu';
    gameState.data.pgScenario = null;
    gameState.data.pgResult = null;
    gameState.data.pgScenarios = getAllScenarios();
}

// ===== 场景执行 =====

export function runScenario(scenarioId) {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) return null;

    PlaygroundState.ui.running = true;
    const result = executeScenario(scenario);
    PlaygroundState.lastResult = result;
    PlaygroundState.sandboxState = result.stateAfter;
    PlaygroundState.ui.running = false;

    return result;
}

export function runCurrentScenarioFromEditor(jsonText) {
    try {
        const scenario = JSON.parse(jsonText);
        PlaygroundState.ui.running = true;
        const result = executeScenario(scenario);
        PlaygroundState.lastResult = result;
        PlaygroundState.sandboxState = result.stateAfter;
        PlaygroundState.ui.running = false;
        return { success: true, result };
    } catch (err) {
        PlaygroundState.ui.running = false;
        return { success: false, error: err.message };
    }
}

// ===== 场景编辑 =====

export function saveScenarioFromEditor(jsonText) {
    try {
        const scenario = JSON.parse(jsonText);
        if (!scenario.id) throw new Error('场景缺少 id');
        saveCustomScenario(scenario);
        return { success: true, scenario };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ===== 对战测试场（新增）=====

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

export function initPlaygroundBattleState(runData, monsterDefId) {
    const cls = CLASS_DEFS[runData.classId];
    const monsterDef = MONSTER_DEFS[monsterDefId];

    const slots = createBattleSlots({ slotUpgrades: runData.slotUpgrades });
    const deck = shuffleArray([...runData.deck]);

    const state = {
        screen: 'playground',
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
        drawAnimations: [],
        slotFlashes: [],
        monsterFlash: 0,
        message: null,
        messageTimer: 0,
        combatLog: [],
        runDataRef: runData,
        stageKey: 'playground',
        heartsLost: 0,
        firstTurnKill: false,
        pendingPlaceEffects: [],
        pendingGrowthEffects: [],
        effectTimeline: [],
        timelineSeq: 0,
        _playgroundBattle: true
    };

    parseMonsterSkills(state.monster);
    shuffleDiscardToDeck(state);

    let drawCount = DRAW_COUNT;
    if (state.monster.firstTurnLessDraw && state.turn === 1) {
        drawCount = Math.max(1, drawCount - 1);
    }
    drawCards(state, drawCount);

    return state;
}

export function enterPlaygroundBattle(gameState, monsterDefId) {
    const runData = createRunData('veteran');
    const battleState = initPlaygroundBattleState(runData, monsterDefId);

    // 合并战斗状态到 gameState，但保留 screen='playground'
    Object.assign(gameState, battleState);
    gameState.screen = 'playground';
    gameState.data = {
        pgView: 'battle',
        pgBattle: true,
        pgMonsterId: monsterDefId
    };

    PlaygroundState.view = 'battle';
    PlaygroundState.pgMonsterId = monsterDefId;
}

export function resetPlaygroundBattle(gameState) {
    // 收集所有非衍生卡回 deck
    const allCards = [
        ...gameState.deck,
        ...gameState.hand,
        ...gameState.discard,
        ...gameState.slots.flatMap(s => s.cards)
    ];
    for (const c of allCards) {
        c.tempBonus = 0;
        c.dedicateTriggered = false;
    }
    gameState.deck = allCards.filter(c => !c.isDerived);
    gameState.hand = [];
    gameState.discard = [];

    for (const slot of gameState.slots) {
        slot.cards = [];
        slot.nextCardBonus = 0;
        slot.roundMultiplierBonus = 0;
        slot.intenseTrainingActive = false;
        slot.groupTrainingActive = false;
    }

    gameState.monster.hp = gameState.monster.maxHp;
    gameState.player.hearts = gameState.player.maxHearts;
    gameState.phase = 'playing';
    gameState.result = null;
    gameState.turn = 1;
    gameState.turnDamage = 0;
    gameState.currentStrategy = null;
    gameState.firstCardPlayedThisTurn = null;
    gameState.heartsLost = 0;
    gameState.firstTurnKill = false;
    gameState.pendingPlaceEffects = [];
    gameState.pendingGrowthEffects = [];
    gameState.effectTimeline = [];
    gameState.timelineSeq = 0;
    gameState.turnTransitioning = false;
    if (gameState.data) gameState.data.battleEndProcessing = false;

    shuffleDiscardToDeck(gameState);
    let drawCount = DRAW_COUNT;
    if (gameState.monster.firstTurnLessDraw && gameState.turn === 1) {
        drawCount = Math.max(1, drawCount - 1);
    }
    drawCards(gameState, drawCount);
}

export function addCardToPlaygroundHand(gameState, defId) {
    const card = createCardInstance(defId);
    if (!card) return false;
    if (gameState.hand.length >= HAND_LIMIT) {
        gameState.message = '手牌已满！';
        gameState.messageTimer = 60;
        return false;
    }
    gameState.hand.push(card);
    return true;
}

export function changePlaygroundMonster(gameState, monsterDefId) {
    const runData = gameState.runDataRef || createRunData('veteran');
    // 保留当前 deck（包括用户添加的卡牌）
    const allCards = [
        ...gameState.deck, ...gameState.hand, ...gameState.discard,
        ...gameState.slots.flatMap(s => s.cards)
    ].filter(c => !c.isDerived);
    for (const c of allCards) {
        c.tempBonus = 0;
        c.dedicateTriggered = false;
    }
    runData.deck = allCards;

    const bs = initPlaygroundBattleState(runData, monsterDefId);

    // 显式替换关键属性（避免 Object.assign 浅拷贝带来的潜在问题）
    gameState.phase = bs.phase;
    gameState.player = bs.player;
    gameState.monster = bs.monster;
    gameState.slots = bs.slots;
    gameState.deck = bs.deck;
    gameState.hand = bs.hand;
    gameState.discard = bs.discard;
    gameState.turn = bs.turn;
    gameState.turnDamage = bs.turnDamage;
    gameState.currentStrategy = bs.currentStrategy;
    gameState.firstCardPlayedThisTurn = bs.firstCardPlayedThisTurn;
    gameState.selectedCard = null;
    gameState.hoveredSlot = null;
    gameState.draggedCard = null;
    gameState.dragX = 0;
    gameState.dragY = 0;
    gameState.animatingCards = [];
    gameState.drawAnimations = bs.drawAnimations;
    gameState.slotFlashes = [];
    gameState.monsterFlash = 0;
    gameState.combatLog = bs.combatLog;
    gameState.heartsLost = 0;
    gameState.firstTurnKill = false;
    gameState.pendingPlaceEffects = [];
    gameState.pendingGrowthEffects = [];
    gameState.effectTimeline = [];
    gameState.timelineSeq = 0;
    gameState._playgroundBattle = true;

    gameState.screen = 'playground';
    gameState.data = {
        pgView: 'battle',
        pgBattle: true,
        pgMonsterId: monsterDefId
    };
    gameState.message = '已切换对手：' + bs.monster.name;
    gameState.messageTimer = 60;
    PlaygroundState.pgMonsterId = monsterDefId;
}

// ===== 全局暴露 =====

if (typeof window !== 'undefined') {
    window.Playground = {
        state: PlaygroundState,
        enter: enterPlayground,
        exit: exitPlayground,
        enterEffect: enterEffectSandbox,
        enterBattle: enterPlaygroundBattle,
        backToMenu: backToPlaygroundMenu,
        run: runScenario,
        runFromEditor: runCurrentScenarioFromEditor,
        saveFromEditor: saveScenarioFromEditor,
        getScenario: getScenarioById,
        getAll: getAllScenarios,
        AITest
    };
}
