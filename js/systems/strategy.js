/**
 * 卡牌地下城 - 计策系统（第二版）
 *
 * 按 4.计策.md 实现
 * 9种基础计策 + 4种超限计策
 */

// ===== 基础计策定义 =====
const BASE_STRATEGIES = [
    {
        id: 'attempt_push',
        name: '尝试推进',
        req: [1, 1, 1],
        total: 3,
        bonuses: [1, 1, 1],
        levelBonus: [1, 1, 1]
    },
    {
        id: 'left_assault',
        name: '左侧强袭',
        req: [3, 1, 1],
        total: 5,
        bonuses: [2, 0, 0],
        levelBonus: [2, 0, 0]
    },
    {
        id: 'right_assault',
        name: '右侧强袭',
        req: [1, 1, 3],
        total: 5,
        bonuses: [0, 0, 2],
        levelBonus: [0, 0, 2]
    },
    {
        id: 'mid_assault',
        name: '中线强袭',
        req: [1, 3, 1],
        total: 5,
        bonuses: [0, 2, 0],
        levelBonus: [0, 2, 0]
    },
    {
        id: 'steady_push',
        name: '稳重推进',
        req: [2, 2, 2],
        total: 6,
        bonuses: [3, 3, 3],
        levelBonus: [2, 2, 2]
    },
    {
        id: 'plan_left',
        name: '计划左攻',
        req: [4, 2, 2],
        total: 8,
        bonuses: [4, 1, 1],
        levelBonus: [3, 1, 1]
    },
    {
        id: 'plan_right',
        name: '计划右攻',
        req: [2, 2, 4],
        total: 8,
        bonuses: [1, 1, 4],
        levelBonus: [1, 1, 3]
    },
    {
        id: 'plan_mid',
        name: '计划中攻',
        req: [2, 4, 2],
        total: 8,
        bonuses: [1, 4, 1],
        levelBonus: [1, 3, 1]
    },
    {
        id: 'forceful_push',
        name: '强硬推进',
        req: [3, 3, 3],
        total: 9,
        bonuses: [5, 5, 5],
        levelBonus: [3, 3, 3]
    }
];

// ===== 超限计策定义 =====
const OVERDRIVE_STRATEGIES = [
    {
        id: 'overdrive_push',
        name: '超限推进',
        req: [4, 4, 4],
        total: 12,
        bonuses: [10, 10, 10],
        levelBonus: [5, 5, 5],
        condition: (counts) => counts[0] === counts[1] && counts[1] === counts[2]
    },
    {
        id: 'overdrive_left',
        name: '超限左攻',
        req: [6, 3, 3],
        total: 12,
        bonuses: [6, 12, 6],
        levelBonus: [5, 5, 5],
        condition: (counts) => counts[0] >= 6 && counts[1] === 3 && counts[2] === 3
    },
    {
        id: 'overdrive_right',
        name: '超限右攻',
        req: [3, 3, 6],
        total: 12,
        bonuses: [6, 12, 6],
        levelBonus: [5, 5, 5],
        condition: (counts) => counts[2] >= 6 && counts[0] === 3 && counts[1] === 3
    },
    {
        id: 'overdrive_mid',
        name: '超限中攻',
        req: [3, 6, 3],
        total: 12,
        bonuses: [6, 12, 6],
        levelBonus: [5, 5, 5],
        condition: (counts) => counts[1] >= 6 && counts[0] === 3 && counts[2] === 3
    }
];

/**
 * 检测当前牌桌的计策
 * @param {Array} slots - 三格牌桌
 * @param {Object} strategyLevels - 计策强化等级 {strategyId: level}
 * @returns {Object|null} { name, id, bonuses: [s0, s1, s2], isOverdrive }
 */
export function detectStrategy(slots, strategyLevels = {}) {
    const counts = slots.map(s => s.cards.length);
    const total = counts.reduce((a, b) => a + b, 0);

    if (total === 0) return null;

    // 超限计策检测（总和≥12）
    if (total >= 12) {
        for (const strat of OVERDRIVE_STRATEGIES) {
            if (strat.condition(counts)) {
                const level = strategyLevels[strat.id] || 0;
                const bonuses = strat.bonuses.map((b, i) => b + strat.levelBonus[i] * level);
                return { name: strat.name, id: strat.id, bonuses, isOverdrive: true, level };
            }
        }
    }

    // 基础计策检测（从高级到低级匹配）
    // 按 total 降序，这样优先匹配更高级别的计策
    const sortedBase = [...BASE_STRATEGIES].sort((a, b) => b.total - a.total);
    for (const strat of sortedBase) {
        let match = true;
        for (let i = 0; i < 3; i++) {
            if (counts[i] < strat.req[i]) {
                match = false;
                break;
            }
        }
        if (match) {
            const level = strategyLevels[strat.id] || 0;
            const bonuses = strat.bonuses.map((b, i) => b + strat.levelBonus[i] * level);
            return { name: strat.name, id: strat.id, bonuses, isOverdrive: false, level };
        }
    }

    return null;
}

/**
 * 获取计策列表（用于显示所有可能的计策）
 */
export function getAllStrategies() {
    return {
        base: BASE_STRATEGIES,
        overdrive: OVERDRIVE_STRATEGIES
    };
}

/**
 * 获取计策基础名称（用于强化选择）
 */
export function getStrategyBaseNames() {
    return BASE_STRATEGIES.map(s => ({ id: s.id, name: s.name }));
}
