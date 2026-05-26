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
    if (Number.isFinite(relic.price)) return relic.price;
    if (relic.rarity === 'common') return 2;
    if (relic.rarity === 'rare') return 4;
    if (relic.rarity === 'epic') return 8;
    return 2;
}

const CARD_SYSTEM_POOLS = {
    neutral: [
        'vine_climb', 'ponder', 'prepare_battle', 'hold_position', 'brute_force',
        'common_goal', 'friendly_chat', 'first_advantage', 'battle_banner', 'rear_guard',
        'icing_on_cake', 'easy_money', 'big_brute_force', 'clear_mind', 'extreme_think',
        'flexible_dispatch', 'lend_hand', 'messenger', 'luxury_gear', 'ultimate_brute',
        'cogito_ergo_sum'
    ],
    big_number: [
        'ugly_showoff', 'no_wisdom', 'combined_force', 'apprentice_forge', 'body_wisdom',
        'borrow', 'master_forge', 'perfect_borrow', 'skilled_borrow', 'one_man_army'
    ],
    growth: [
        'war_training', 'training_trace', 'intense_training', 'group_training',
        'training_partner', 'training_set', 'support_training', 'training_30h',
        'steroid_training', 'regular_training', 'training_result'
    ]
};

/**
 * 创建商店库存
 * - 5张卡牌可选
 * - 3件遗物可选
 */
export function createShopStock(runData = null) {
    const cards = [];
    // 排除衍生牌和初始职业卡
    const STARTING_CARD_IDS = ['unity_strike', 'support_strike', 'veteran_ambition'];
    const forcedSystem = runData?.nextShopCardSystem || null;
    const sourceIds = forcedSystem && CARD_SYSTEM_POOLS[forcedSystem]
        ? CARD_SYSTEM_POOLS[forcedSystem]
        : Object.keys(CARD_DEFS);
    const cardIds = sourceIds.filter(id => CARD_DEFS[id] && id !== 'diffusion' && !STARTING_CARD_IDS.includes(id));
    const usedCardIds = new Set();
    for (let i = 0; i < 5; i++) {
        const defId = pickCardIdByRarity(cardIds.filter(id => !usedCardIds.has(id)));
        if (!defId) break;
        usedCardIds.add(defId);
        const def = CARD_DEFS[defId];
        const price = RARITY_PRICE[def.rarity] || 2;
        cards.push({ defId, price, bought: false });
    }
    if (runData?.nextShopCardSystem) {
        delete runData.nextShopCardSystem;
    }

    const relics = [];
    const ownedRelicIds = new Set((runData?.relics || []).map(r => r.id));
    const relicPool = RELIC_DEFS.filter(r => r.rarity !== 'boss' && !ownedRelicIds.has(r.id));
    const usedRelicIds = new Set();
    for (let i = 0; i < 3; i++) {
        const availablePool = relicPool.filter(r => !usedRelicIds.has(r.id));
        if (availablePool.length === 0) break;
        const relic = pickRelicByRarity(availablePool);
        usedRelicIds.add(relic.id);
        const price = getRelicPrice(relic);
        relics.push({ ...relic, price, bought: false });
    }

    return { cards, relics };
}

/**
 * 创建铁匠库存
 * - 不卖遗物（第二版设计）
 * - 附魔词条选项（2个随机词条，本铁匠每个词条只能敲一次）
 */
export function createBlacksmithStock(excludeEnchantKeywords = []) {
    // 第二版：铁匠不卖遗物
    const relics = [];

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
