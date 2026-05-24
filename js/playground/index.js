/**
 * 卡牌地下城 - Playground 入口
 *
 * 职责：
 * 1. 初始化 Playground 状态结构
 * 2. 提供 screen 切换函数（主菜单 ↔ Playground 菜单 ↔ 词条效果沙盒）
 * 3. 协调 scenario-engine、ui-controller、renderer、ai-harness
 */

import { switchScreen } from '../core/state.js';
import { executeScenario } from './scenario-engine.js';
import { EFFECT_SCENARIOS, SCENARIO_CATEGORIES } from './scenario-data.js';
import { loadCustomScenarios, saveCustomScenario } from './local-storage.js';
import { AITest } from './ai-harness.js';

// ===== Playground 状态 =====

export const PlaygroundState = {
    // 当前视图：'menu' | 'effect'
    view: 'menu',

    // 当前选中的场景 ID
    selectedScenarioId: null,

    // 最近一次执行结果
    lastResult: null,

    // 沙盒中的 battle state（用于可视化交互）
    sandboxState: null,

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
    const map = new Map();
    for (const s of preset) map.set(s.id, s);
    for (const s of custom) map.set(s.id, s);
    return Array.from(map.values());
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

// ===== 全局暴露 =====

if (typeof window !== 'undefined') {
    window.Playground = {
        state: PlaygroundState,
        enter: enterPlayground,
        exit: exitPlayground,
        enterEffect: enterEffectSandbox,
        backToMenu: backToPlaygroundMenu,
        run: runScenario,
        runFromEditor: runCurrentScenarioFromEditor,
        saveFromEditor: saveScenarioFromEditor,
        getScenario: getScenarioById,
        getAll: getAllScenarios,
        AITest
    };
}
