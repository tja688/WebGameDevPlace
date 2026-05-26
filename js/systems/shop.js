/**
 * 卡牌地下城 - 商店系统
 */

import { createShopStock, createBlacksmithStock } from '../data/index.js';

export function getOrCreateShopStock(runData) {
    if (!runData.shopStock) {
        runData.shopStock = createShopStock(runData);
        runData.shopFriendRefreshAvailable = !!runData.relics?.some(r => r.effect?.type === 'first_refresh_free');
    }
    return runData.shopStock;
}

export function refreshShopStock(runData) {
    runData.shopStock = createShopStock(runData);
}

export function getOrCreateBlacksmithStock(runData) {
    if (!runData.blacksmithStock) {
        runData.blacksmithStock = createBlacksmithStock();
        runData.blacksmithFriendRefreshAvailable = !!runData.relics?.some(r => r.effect?.type === 'first_refresh_free');
    }
    return runData.blacksmithStock;
}

export function refreshBlacksmithStock(runData) {
    const previousKeywords = runData.blacksmithStock?.enchantKeywords || [];
    runData.blacksmithStock = createBlacksmithStock(previousKeywords);
}
