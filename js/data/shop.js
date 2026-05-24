/**
 * 卡牌地下城 - 商店与库存数据（第二版）
 *
 * 经济系统按 6.经济系统.md 实现
 */

import { RARITY_PRICE } from '../core/constants.js';
import { CARD_DEFS } from './cards.js';
import { RELIC_DEFS } from './relics.js';
import { KEYWORDS } from './keywords.js';

/**
 * 创建商店库存
 * - 5张卡牌可选
 * - 3件装备可选
 */
export function createShopStock() {
    const cards = [];
    const cardIds = Object.keys(CARD_DEFS).filter(id => id !== 'diffusion');
    for (let i = 0; i < 5; i++) {
        const defId = cardIds[Math.floor(Math.random() * cardIds.length)];
        const def = CARD_DEFS[defId];
        const price = RARITY_PRICE[def.rarity] || 2;
        cards.push({ defId, price, bought: false });
    }

    const relics = [];
    const relicPool = RELIC_DEFS.filter(r => r.rarity !== 'boss');
    for (let i = 0; i < 3; i++) {
        const relic = relicPool[Math.floor(Math.random() * relicPool.length)];
        let price = 2;
        if (relic.rarity === 'common') price = 2 + Math.floor(Math.random() * 3); // 2-4
        else if (relic.rarity === 'rare') price = 4 + Math.floor(Math.random() * 3); // 4-6
        else if (relic.rarity === 'epic') price = 8 + Math.floor(Math.random() * 3); // 8-10
        relics.push({ ...relic, price, bought: false });
    }

    return { cards, relics };
}

/**
 * 创建铁匠库存
 * - 2件非BOSS遗物
 * - 附魔词条选项（2个随机词条）
 */
export function createBlacksmithStock() {
    const relics = [];
    const pool = RELIC_DEFS.filter(r => r.rarity !== 'boss');
    for (let i = 0; i < 2; i++) {
        const relic = pool[Math.floor(Math.random() * pool.length)];
        let price = 2;
        if (relic.rarity === 'common') price = 2 + Math.floor(Math.random() * 3);
        else if (relic.rarity === 'rare') price = 4 + Math.floor(Math.random() * 3);
        else if (relic.rarity === 'epic') price = 8 + Math.floor(Math.random() * 3);
        relics.push({ ...relic, price, bought: false });
    }

    // 附魔词条：提供两个选项
    const enchantKeywords = [];
    const keywordPool = Object.keys(KEYWORDS);
    for (let i = 0; i < 2; i++) {
        const kw = keywordPool[Math.floor(Math.random() * keywordPool.length)];
        enchantKeywords.push(kw);
    }

    return { relics, enchantKeywords };
}
