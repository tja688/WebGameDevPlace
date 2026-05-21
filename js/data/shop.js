/**
 * 卡牌地下城 - 商店与库存数据
 */

import { RARITY_PRICE } from '../core/constants.js';
import { CARD_DEFS } from './cards.js';
import { RELIC_DEFS } from './relics.js';
import { KEYWORDS } from './keywords.js';

export function createShopStock() {
    const cards = [];
    const excludedIds = ['wild_strike'];
    const cardIds = Object.keys(CARD_DEFS).filter(id => !excludedIds.includes(id));
    for (let i = 0; i < 4; i++) {
        const defId = cardIds[Math.floor(Math.random() * cardIds.length)];
        const def = CARD_DEFS[defId];
        const price = RARITY_PRICE[def.rarity] || 1;
        cards.push({ defId, price, bought: false });
    }
    return { cards };
}

export function createBlacksmithStock() {
    const relics = [];
    for (let i = 0; i < 2; i++) {
        const relic = RELIC_DEFS[Math.floor(Math.random() * RELIC_DEFS.length)];
        const price = RARITY_PRICE[relic.rarity] || 1;
        relics.push({ ...relic, price, bought: false });
    }
    const enchantKeywords = Object.keys(KEYWORDS);
    const enchantKeyword = enchantKeywords[Math.floor(Math.random() * enchantKeywords.length)];
    return { relics, enchantKeyword };
}
