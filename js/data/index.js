/**
 * 卡牌地下城 - 数据层统一入口
 * 
 * 所有游戏静态数据和数据工厂函数从此导出
 */

import { generateUUID } from '../core/utils.js';

export { KEYWORDS } from './keywords.js';
export { CARD_DEFS, CARD_REWARD_POOL, createCardRewardOptions } from './cards.js';
export { MONSTER_DEFS, MONSTER_COLOR_THEMES } from './monsters.js';
export { CLASS_DEFS } from './classes.js';
export { STAGE_CONFIG } from './stages.js';
export { RELIC_DEFS, EVENT_NAMES, pickRandomEvent } from './relics.js';
export { createShopStock, createBlacksmithStock } from './shop.js';

import { CARD_DEFS } from './cards.js';
import { CLASS_DEFS } from './classes.js';

/**
 * 创建卡牌实例
 */
export function createCardInstance(defId) {
    const def = CARD_DEFS[defId];
    if (!def) return null;
    return {
        uuid: generateUUID(),
        defId: defId,
        baseValue: def.baseValue,
        permanentBonus: 0,
        tempBonus: 0,
        currentValue: def.baseValue,
        size: def.size,
        keywords: [...def.keywords],
        extraEffects: def.extraEffects ? [...def.extraEffects] : [],
        description: def.description,
        name: def.name,
        color: def.color,
        accentColor: def.accentColor,
        iconType: def.iconType,
        hasBeenPlayed: false,
        growAmount: def.growAmount || 1,
        chainCount: def.chainCount || 1,
        rarity: def.rarity || 'white'
    };
}

/**
 * 根据职业定义创建初始牌组
 */
export function createDeck(classDef) {
    const deck = [];
    for (const entry of classDef.startingDeck) {
        for (let i = 0; i < entry.count; i++) {
            deck.push(createCardInstance(entry.defId));
        }
    }
    return deck;
}
