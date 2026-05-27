/**
 * 生死烛局 - 阵型系统（叠牌加成版）
 *
 * 规则：每个倍率格每叠2张触发一次加成，交替进行。
 * - 2张：倍率格倍率+1
 * - 4张：本格所有卡牌点数+1
 * - 6张：倍率格倍率+1
 * - 8张：本格所有卡牌点数+1
 * - 10张：倍率格倍率+1
 * - 12张：本格所有卡牌点数+1
 * - 依此类推...
 *
 * 奇数轮次（2,6,10...）→ 倍率格倍率+1
 * 偶数轮次（4,8,12...）→ 本格所有卡牌点数+1
 */

/**
 * 计算单个倍率格的叠牌加成
 * @param {number} cardCount - 格内卡牌数量
 * @returns {Object} { slotBonus, cardBonus }
 *   slotBonus: 倍率格额外点数
 *   cardBonus: 本格每张卡牌额外点数
 */
export function getStackingBonus(cardCount) {
    // 每2张为一个周期
    const cycles = Math.floor(cardCount / 2);
    if (cycles <= 0) return { slotBonus: 0, cardBonus: 0 };

    let slotBonus = 0;
    let cardBonus = 0;

    for (let c = 1; c <= cycles; c++) {
        if (c % 2 === 1) {
            // 奇数轮次：倍率格倍率+1
            slotBonus += 1;
        } else {
            // 偶数轮次：本格所有卡牌点数+1
            cardBonus += 1;
        }
    }

    return { slotBonus, cardBonus };
}

/**
 * 获取所有倍率格的叠牌加成汇总
 * @param {Array} slots - 三格牌桌
 * @returns {Array} 每个格子的 { slotBonus, cardBonus }
 */
export function getAllStackingBonuses(slots) {
    return slots.map(slot => ({
        index: slot.index,
        ...getStackingBonus(slot.cards.length)
    }));
}

/**
 * 检测当前牌桌的计策（已废弃，保留空函数兼容旧代码）
 */
export function detectStrategy(slots, strategyLevels = {}) {
    return null;
}

/**
 * 获取计策列表（已废弃，返回空）
 */
export function getAllStrategies() {
    return { base: [], overdrive: [] };
}

/**
 * 获取计策基础名称（已废弃，返回空）
 */
export function getStrategyBaseNames() {
    return [];
}
