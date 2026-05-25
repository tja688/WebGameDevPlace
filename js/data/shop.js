/**
 * 卡牌地下城 - 商店与库存数据（第二版）
 *
 * 经济系统按 6.经济系统.md 实现
 */

import { RARITY_PRICE } from '../core/constants.js';
import { CARD_DEFS } from './cards.js';
import { RELIC_DEFS } from './relics.js';
import { KEYWORDS } from './keywords.js';

const CARD_RARITY_WEIGHTS = [
    { rarity: 'white', weight: 65 },
    { rarity: 'blue', weight: 30 },
    { rarity: 'gold', weight: 5 }
];

const RELIC_RARITY_WEIGHTS = [
    { rarity: 'common', weight: 65 },
    { rarity: 'rare', weight: 30 },
    { rarity: 'epic', weight: 5 }
];

function pickWeightedRarity(weights) {
    const total = weights.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of weights) {
        if (roll < item.weight) return item.rarity;
        roll -= item.weight;
    }
    return weights[weights.length - 1].rarity;
}

function pickRandomFromPool(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

function pickCardIdByRarity(cardIds) {
    for (let attempt = 0; attempt < CARD_RARITY_WEIGHTS.length; attempt++) {
        const rarity = pickWeightedRarity(CARD_RARITY_WEIGHTS);
        const pool = cardIds.filter(id => CARD_DEFS[id].rarity === rarity);
        if (pool.length > 0) return pickRandomFromPool(pool);
    }
    return pickRandomFromPool(cardIds);
}

function pickRelicByRarity(relicPool) {
    for (let attempt = 0; attempt < RELIC_RARITY_WEIGHTS.length; attempt++) {
        const rarity = pickWeightedRarity(RELIC_RARITY_WEIGHTS);
        const pool = relicPool.filter(relic => relic.rarity === rarity);
        if (pool.length > 0) return pickRandomFromPool(pool);
    }
    return pickRandomFromPool(relicPool);
}

function getRelicPrice(relic) {
    if (relic.rarity === 'common') return 2 + Math.floor(Math.random() * 3); // 2-4
    if (relic.rarity === 'rare') return 4 + Math.floor(Math.random() * 3); // 4-6
    if (relic.rarity === 'epic') return 8 + Math.floor(Math.random() * 3); // 8-10
    return 2;
}

/**
 * 创建商店库存
 * - 5张卡牌可选
 * - 3件遗物可选
 */
export function createShopStock() {
    const cards = [];
    // 排除衍生牌和初始职业卡
    const STARTING_CARD_IDS = ['unity_strike', 'support_strike', 'veteran_ambition'];
    const cardIds = Object.keys(CARD_DEFS).filter(id => id !== 'diffusion' && !STARTING_CARD_IDS.includes(id));
    for (let i = 0; i < 5; i++) {
        const defId = pickCardIdByRarity(cardIds);
        const def = CARD_DEFS[defId];
        const price = RARITY_PRICE[def.rarity] || 2;
        cards.push({ defId, price, bought: false });
    }

    const relics = [];
    const relicPool = RELIC_DEFS.filter(r => r.rarity !== 'boss');
    for (let i = 0; i < 3; i++) {
        const relic = pickRelicByRarity(relicPool);
        const price = getRelicPrice(relic);
        relics.push({ ...relic, price, bought: false });
    }

    return { cards, relics };
}

/**
 * 创建铁匠库存
 * - 2件非BOSS遗物
 * - 附魔词条选项（2个随机词条）
 */
export function createBlacksmithStock(excludeEnchantKeywords = []) {
    const relics = [];
    const pool = RELIC_DEFS.filter(r => r.rarity !== 'boss');
    for (let i = 0; i < 2; i++) {
        const relic = pickRelicByRarity(pool);
        const price = getRelicPrice(relic);
        relics.push({ ...relic, price, bought: false });
    }

    // 附魔词条：提供两个不重复选项，刷新时尽量避开上一组
    let keywordPool = Object.keys(KEYWORDS).filter(kw => !excludeEnchantKeywords.includes(kw));
    if (keywordPool.length < 2) {
        keywordPool = Object.keys(KEYWORDS);
    }

    const enchantKeywords = [];
    while (enchantKeywords.length < 2 && keywordPool.length > 0) {
        const idx = Math.floor(Math.random() * keywordPool.length);
        enchantKeywords.push(keywordPool.splice(idx, 1)[0]);
    }

    return { relics, enchantKeywords };
}
