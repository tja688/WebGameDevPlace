/**
 * 卡牌地下城 - AI Playtest Harness
 *
 * 设计目标：
 * 1. 提供稳定的 JSON-in / JSON-out API，供 AI 批量调用
 * 2. 与 DOM/Canvas 完全解耦，可在 Node.js 环境中运行（需适配）
 * 3. 浏览器 playground 只是可视化入口；真正给 AI 用的，是这套 API
 */

import { executeScenario, executeScenarios } from './scenario-engine.js';
import { EFFECT_SCENARIOS } from './scenario-data.js';
import { loadCustomScenarios } from './local-storage.js';

// ===== 场景查找 =====

function getAllScenarios() {
    const preset = EFFECT_SCENARIOS;
    const custom = Object.values(loadCustomScenarios());
    // 自定义场景可覆盖预设（同 id 时优先自定义）
    const map = new Map();
    for (const s of preset) map.set(s.id, s);
    for (const s of custom) map.set(s.id, s);
    return Array.from(map.values());
}

function findScenario(id) {
    // 优先自定义
    const custom = loadCustomScenarios();
    if (custom[id]) return custom[id];
    return EFFECT_SCENARIOS.find(s => s.id === id) || null;
}

// ===== 核心 API =====

export const AITest = {
    /**
     * 运行单个预设/自定义场景
     * @param {string} scenarioId
     * @returns {object} 执行结果
     */
    run(scenarioId) {
        const scenario = findScenario(scenarioId);
        if (!scenario) {
            return {
                passed: false,
                scenarioId,
                error: `场景未找到: ${scenarioId}`,
                logs: [`[ERROR] 场景未找到: ${scenarioId}`],
                assertionResults: [],
                durationMs: 0
            };
        }
        return executeScenario(scenario);
    },

    /**
     * 运行所有预设场景
     * @returns {object} { total, passed, failed, results }
     */
    runAll() {
        const all = getAllScenarios();
        const results = executeScenarios(all);
        const passed = results.filter(r => r.passed).length;
        return {
            total: results.length,
            passed,
            failed: results.length - passed,
            results
        };
    },

    /**
     * 运行自定义场景（AI 生成 JSON 后直接传入）
     * @param {object} scenarioJson
     * @returns {object} 执行结果
     */
    runCustom(scenarioJson) {
        if (!scenarioJson || !scenarioJson.id) {
            return {
                passed: false,
                error: '场景 JSON 无效：缺少 id',
                logs: ['[ERROR] 场景 JSON 无效：缺少 id'],
                assertionResults: [],
                durationMs: 0
            };
        }
        return executeScenario(scenarioJson);
    },

    /**
     * 快速验证：给定卡牌配置 + 动作，返回执行后的关键状态
     * 用于 AI 快速迭代测试新卡牌/词条
     */
    quickTest({
        cardName = '测试卡牌',
        baseValue = 10,
        keywords = [],
        extraEffects = [],
        growAmount = 1,
        chainCount = 1,
        slotIndex = 1,
        existingCards = [], // { slotIndex, cards: [...] }
        actions = [{ type: 'play', handIndex: 0, slotIndex: 1 }]
    }) {
        const scenario = {
            id: 'quick_test_' + Date.now(),
            name: '快速测试',
            category: 'quick',
            description: 'AI 快速验证',
            setup: {
                player: { hearts: 4, maxHearts: 4 },
                monster: { hp: 100, maxHp: 100 },
                slots: [
                    { index: 0, multiplier: 1, cards: [] },
                    { index: 1, multiplier: 1, cards: [] },
                    { index: 2, multiplier: 1, cards: [] }
                ],
                hand: [{
                    name: cardName,
                    baseValue,
                    keywords,
                    extraEffects,
                    growAmount,
                    chainCount
                }],
                deck: [],
                discard: []
            },
            actions,
            assertions: []
        };

        // 放置已有卡牌
        for (const ec of existingCards) {
            scenario.setup.slots[ec.slotIndex].cards = ec.cards.map(c => ({
                name: c.name || '占位',
                baseValue: c.baseValue || 1,
                keywords: c.keywords || []
            }));
        }

        const result = executeScenario(scenario);

        // 提取关键信息供 AI 快速阅读
        const slot = result.stateAfter?.slots?.[slotIndex];
        const playedCard = slot?.cards?.[slot.cards.length - 1];

        return {
            ...result,
            quickSummary: {
                cardName,
                baseValue,
                keywords,
                finalValue: playedCard?._finalValue ?? null,
                totalDamage: result.stateAfter?._totalDamage ?? null,
                permanentBonus: playedCard?.permanentBonus ?? null,
                tempBonus: playedCard?.tempBonus ?? null,
                handSizeAfter: result.stateAfter?.hand?.length ?? null
            }
        };
    },

    /**
     * 生成完整测试报告
     * @returns {object} 结构化报告
     */
    report() {
        const all = this.runAll();
        return {
            timestamp: new Date().toISOString(),
            version: '3.0.0',
            summary: {
                total: all.total,
                passed: all.passed,
                failed: all.failed,
                passRate: all.total > 0 ? (all.passed / all.total * 100).toFixed(1) + '%' : 'N/A'
            },
            details: all.results.map(r => ({
                scenarioId: r.scenarioId,
                name: r.name,
                passed: r.passed,
                durationMs: r.durationMs,
                failedAssertions: r.assertionResults?.filter(a => !a.passed).map(a => ({
                    desc: a.desc,
                    expected: a.expected,
                    actual: a.actual
                })) || []
            })),
            failedScenarios: all.results.filter(r => !r.passed).map(r => r.scenarioId)
        };
    },

    /**
     * 列出所有可用场景
     */
    listScenarios() {
        return getAllScenarios().map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            description: s.description
        }));
    }
};

// 挂载到全局，供浏览器控制台和 AI 调用
if (typeof window !== 'undefined') {
    window.AITest = AITest;
}
