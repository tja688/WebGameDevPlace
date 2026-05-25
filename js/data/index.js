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
import { MONSTER_DEFS } from './monsters.js';
import { CLASS_DEFS } from './classes.js';

export const MAX_KEYWORDS_PER_CARD = 3;

// ===== 数据覆盖系统（LocalStorage 持久化）=====

const OVERRIDE_KEY = 'card_dungeon_data_overrides';

export function applyDataOverrides() {
    try {
        const raw = localStorage.getItem(OVERRIDE_KEY);
        if (!raw) return;
        const overrides = JSON.parse(raw);
        if (overrides.cards) {
            for (const [id, changes] of Object.entries(overrides.cards)) {
                if (CARD_DEFS[id]) Object.assign(CARD_DEFS[id], changes);
            }
        }
        if (overrides.monsters) {
            for (const [id, changes] of Object.entries(overrides.monsters)) {
                if (MONSTER_DEFS[id]) Object.assign(MONSTER_DEFS[id], changes);
            }
        }
    } catch (e) {
        console.error('[DataOverrides] 应用覆盖失败:', e);
    }
}

export function saveDataOverride(category, id, field, value) {
    try {
        const raw = localStorage.getItem(OVERRIDE_KEY) || '{}';
        const overrides = JSON.parse(raw);
        if (!overrides[category]) overrides[category] = {};
        if (!overrides[category][id]) overrides[category][id] = {};
        overrides[category][id][field] = value;
        localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
        if (category === 'cards' && CARD_DEFS[id]) {
            CARD_DEFS[id][field] = value;
        } else if (category === 'monsters' && MONSTER_DEFS[id]) {
            MONSTER_DEFS[id][field] = value;
        }
    } catch (e) {
        console.error('[DataOverrides] 保存覆盖失败:', e);
    }
}

export function getDataOverrides() {
    try {
        const raw = localStorage.getItem(OVERRIDE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

export function clearDataOverrides() {
    localStorage.removeItem(OVERRIDE_KEY);
}

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
 * 给卡牌添加词条，统一处理重复和词条上限。
 */
export function addKeywordToCard(card, keyword, options = {}) {
    if (!card || !keyword) {
        return { ok: false, reason: '缺少卡牌或词条' };
    }
    if (!card.keywords) card.keywords = [];
    if (card.keywords.includes(keyword)) {
        return { ok: false, reason: '该卡牌已有相同词条' };
    }
    if (card.keywords.length >= MAX_KEYWORDS_PER_CARD) {
        return { ok: false, reason: `该卡牌词条已达上限（${MAX_KEYWORDS_PER_CARD}个）` };
    }

    card.keywords.push(keyword);
    if (keyword === 'grow') {
        card.growAmount = options.growAmount || card.growAmount || 1;
    }
    if (keyword === 'chain') {
        card.chainCount = options.chainCount || card.chainCount || 1;
    }

    return { ok: true };
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
