/**
 * 卡牌地下城 - Playground 场景执行引擎
 *
 * 核心设计原则：
 * 1. 纯逻辑，不依赖 DOM/Canvas/Audio
 * 2. 直接复用生产代码的 createInitialState、playCardToSlot、FX.fire 等
 * 3. 场景格式为纯 JSON，可序列化、可导出、可被 AI 生成
 */

import { createInitialState, createBattleSlots } from '../core/state.js';
import { generateUUID } from '../core/utils.js';
import { createCardInstance, CARD_DEFS } from '../data/index.js';
import { playCardToSlot, getCardFinalValue, getCardBaseValue, calculateTotalBoardDamage } from '../systems/board.js';
import { endTurn } from '../systems/battle.js';
import { drawCards } from '../core/battle-core.js';

// ===== 工具函数 =====

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function getValueByPath(obj, path) {
    if (!path) return undefined;
    const parts = path.split(/\.|\[(\d+)\]/).filter(p => p !== '' && p !== undefined);
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        const idx = /^\d+$/.test(part) ? parseInt(part, 10) : part;
        current = current[idx];
    }
    return current;
}

function valuesEqual(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((v, i) => valuesEqual(v, b[i]));
    }
    return a === b;
}

// ===== 卡牌构建 =====

function buildCardFromSetup(cardSetup) {
    if (!cardSetup) return null;

    let card;
    if (cardSetup.template || cardSetup.defId) {
        const defId = cardSetup.template || cardSetup.defId;
        card = createCardInstance(defId);
        if (!card) {
            console.warn(`[Playground] 未找到卡牌定义: ${defId}`);
            card = createFallbackCard(cardSetup);
        }
    } else {
        card = createFallbackCard(cardSetup);
    }

    // 覆盖字段
    if (cardSetup.baseValue !== undefined) card.baseValue = cardSetup.baseValue;
    if (cardSetup.permanentBonus !== undefined) card.permanentBonus = cardSetup.permanentBonus;
    if (cardSetup.battleBonus !== undefined) card.battleBonus = cardSetup.battleBonus;
    if (cardSetup.tempBonus !== undefined) card.tempBonus = cardSetup.tempBonus;
    if (cardSetup.keywords !== undefined) card.keywords = [...cardSetup.keywords];
    if (cardSetup.growAmount !== undefined) card.growAmount = cardSetup.growAmount;
    if (cardSetup.chainCount !== undefined) card.chainCount = cardSetup.chainCount;
    if (cardSetup.name !== undefined) card.name = cardSetup.name;
    if (cardSetup.description !== undefined) card.description = cardSetup.description;

    card.currentValue = getCardBaseValue(card);
    return card;
}

function createFallbackCard(setup) {
    return {
        uuid: generateUUID(),
        defId: setup.defId || 'custom',
        name: setup.name || '自定义卡牌',
        baseValue: setup.baseValue || 0,
        permanentBonus: setup.permanentBonus || 0,
        battleBonus: setup.battleBonus || 0,
        tempBonus: setup.tempBonus || 0,
        currentValue: (setup.baseValue || 0) + (setup.permanentBonus || 0) + (setup.battleBonus || 0) + (setup.tempBonus || 0),
        size: setup.size || 1,
        keywords: [...(setup.keywords || [])],
        extraEffects: setup.extraEffects ? [...setup.extraEffects] : [],
        description: setup.description || '',
        color: setup.color || '#888888',
        accentColor: setup.accentColor || '#aaaaaa',
        iconType: setup.iconType || 'shadow',
        hasBeenPlayed: false,
        growAmount: setup.growAmount || 1,
        chainCount: setup.chainCount || 1,
        rarity: setup.rarity || 'white'
    };
}

// ===== 状态构建 =====

function buildStateFromSetup(setup) {
    const state = createInitialState();

    // 覆盖玩家状态
    if (setup.player) {
        Object.assign(state.player, setup.player);
    }

    // 覆盖怪物状态
    if (setup.monster) {
        Object.assign(state.monster, setup.monster);
    }

    // 覆盖格子
    if (setup.slots) {
        state.slots = setup.slots.map((s, i) => ({
            index: s.index !== undefined ? s.index : i,
            multiplier: s.multiplier !== undefined ? s.multiplier : 1,
            baseMultiplier: s.baseMultiplier !== undefined ? s.baseMultiplier : 1,
            cards: (s.cards || []).map(c => buildCardFromSetup(c)),
            nextCardBonus: s.nextCardBonus || 0,
            roundMultiplierBonus: s.roundMultiplierBonus || 0,
            intenseTrainingActive: s.intenseTrainingActive || false,
            groupTrainingActive: s.groupTrainingActive || false
        }));
    }

    // 覆盖手牌
    if (setup.hand) {
        state.hand = setup.hand.map(c => buildCardFromSetup(c));
    }

    // 覆盖牌库
    if (setup.deck) {
        state.deck = setup.deck.map(c => buildCardFromSetup(c));
    }

    // 覆盖弃牌堆
    if (setup.discard) {
        state.discard = setup.discard.map(c => buildCardFromSetup(c));
    }

    // 覆盖回合数
    if (setup.turn !== undefined) state.turn = setup.turn;

    // 覆盖 runDataRef（如有）
    if (setup.runDataRef !== undefined) {
        state.runDataRef = deepClone(setup.runDataRef);
    }

    return state;
}

// ===== 动作执行 =====

function executeAction(state, action, logs) {
    switch (action.type) {
        case 'play': {
            const { handIndex, slotIndex, cardUuid } = action;
            let card;
            if (cardUuid) {
                card = state.hand.find(c => c.uuid === cardUuid);
            } else if (handIndex !== undefined) {
                card = state.hand[handIndex];
            }
            if (!card) {
                logs.push(`[ERROR] 动作 play 找不到卡牌: handIndex=${handIndex}, uuid=${cardUuid}`);
                return false;
            }
            const success = playCardToSlot(card, slotIndex, state);
            logs.push(`[ACTION] play ${card.name}(${card.baseValue}) → slot ${slotIndex} : ${success ? '成功' : '失败'}`);
            return success;
        }
        case 'endTurn': {
            endTurn(state);
            logs.push(`[ACTION] endTurn → turn=${state.turn}, phase=${state.phase}`);
            return true;
        }
        case 'draw': {
            const count = action.count || 1;
            drawCards(state, count);
            logs.push(`[ACTION] draw ${count} → hand size=${state.hand.length}`);
            return true;
        }
        default:
            logs.push(`[ERROR] 未知动作类型: ${action.type}`);
            return false;
    }
}

// ===== 断言评估 =====

function evaluateAssertion(state, assertion, logs) {
    const { path, expected, operator = 'eq', desc } = assertion;
    let actual = getValueByPath(state, path);

    // 特殊路径：如果路径以 .finalValue 结尾，动态计算
    if (path.endsWith('.finalValue')) {
        const basePath = path.slice(0, -'.finalValue'.length);
        const card = getValueByPath(state, basePath);
        if (card && typeof card === 'object') {
            actual = getCardFinalValue(card, state);
        }
    }

    let passed;
    switch (operator) {
        case 'eq':
            passed = valuesEqual(actual, expected);
            break;
        case 'gt':
            passed = actual > expected;
            break;
        case 'gte':
            passed = actual >= expected;
            break;
        case 'lt':
            passed = actual < expected;
            break;
        case 'lte':
            passed = actual <= expected;
            break;
        case 'contains':
            passed = Array.isArray(actual) && actual.some(item => valuesEqual(item, expected));
            break;
        case 'notEq':
            passed = !valuesEqual(actual, expected);
            break;
        default:
            passed = valuesEqual(actual, expected);
    }

    return { assertion, actual, expected, operator, passed, desc: desc || path };
}

// ===== 状态快照增强 =====

function enrichStateSnapshot(state) {
    const snapshot = deepClone(state);
    // 为每个slot中的卡牌添加计算后的 finalValue
    for (const slot of snapshot.slots) {
        for (const card of slot.cards) {
            // 这里的state是原始对象，snapshot是克隆，需要用原始state计算
            const originalCard = state.slots.find(s => s.index === slot.index)?.cards.find(c => c.uuid === card.uuid);
            if (originalCard) {
                card._finalValue = getCardFinalValue(originalCard, state);
                card._baseValue = getCardBaseValue(originalCard);
            }
        }
    }
    // 添加总伤害
    snapshot._totalDamage = calculateTotalBoardDamage(state);
    return snapshot;
}

// ===== 主执行函数 =====

export function executeScenario(scenario) {
    const startTime = performance.now();
    const logs = [];
    logs.push(`[SCENARIO] ${scenario.id}: ${scenario.name}`);

    let state;
    try {
        state = buildStateFromSetup(scenario.setup || {});
    } catch (err) {
        logs.push(`[ERROR] 构建初始状态失败: ${err.message}`);
        return {
            passed: false,
            scenarioId: scenario.id,
            name: scenario.name,
            logs,
            stateBefore: null,
            stateAfter: null,
            assertionResults: [],
            error: err.message,
            durationMs: performance.now() - startTime
        };
    }

    const stateBefore = enrichStateSnapshot(state);

    // 执行动作序列
    const actions = scenario.actions || [];
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        try {
            executeAction(state, action, logs);
        } catch (err) {
            logs.push(`[ERROR] 动作 #${i} (${action.type}) 执行失败: ${err.message}`);
            return {
                passed: false,
                scenarioId: scenario.id,
                name: scenario.name,
                logs,
                stateBefore,
                stateAfter: enrichStateSnapshot(state),
                assertionResults: [],
                error: err.message,
                durationMs: performance.now() - startTime
            };
        }
    }

    // 评估断言
    const assertions = scenario.assertions || [];
    const assertionResults = [];
    for (const assertion of assertions) {
        try {
            const result = evaluateAssertion(state, assertion, logs);
            assertionResults.push(result);
            logs.push(`[ASSERT] ${result.desc}: ${result.passed ? '✓' : '✗'} (期望=${JSON.stringify(result.expected)}, 实际=${JSON.stringify(result.actual)})`);
        } catch (err) {
            assertionResults.push({
                assertion, actual: null, expected: assertion.expected,
                operator: assertion.operator || 'eq',
                passed: false,
                desc: assertion.desc || assertion.path,
                error: err.message
            });
            logs.push(`[ERROR] 断言评估失败: ${err.message}`);
        }
    }

    const allPassed = assertionResults.length > 0 && assertionResults.every(r => r.passed);
    const stateAfter = enrichStateSnapshot(state);
    const durationMs = performance.now() - startTime;

    logs.push(`[RESULT] ${allPassed ? '全部通过' : '存在失败'} (${assertionResults.filter(r => r.passed).length}/${assertionResults.length})`);

    return {
        passed: allPassed,
        scenarioId: scenario.id,
        name: scenario.name,
        logs,
        stateBefore,
        stateAfter,
        assertionResults,
        durationMs,
        actionCount: actions.length
    };
}

// ===== 批量执行 =====

export function executeScenarios(scenarios) {
    const results = [];
    for (const scenario of scenarios) {
        results.push(executeScenario(scenario));
    }
    return results;
}
