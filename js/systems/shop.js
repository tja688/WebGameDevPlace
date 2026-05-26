/**
 * 生死烛局 - 商店系统
 */

import { createShopStock, createBlacksmithStock } from '../data/index.js';

export function getOrCreateShopStock(runData) {
    if (!runData.shopStock) {
        runData.shopStock = createShopStock(runData);
        runData.shopRefreshCost = 5;
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
        runData.blacksmithRefreshCost = 5;
        runData.blacksmithFriendRefreshAvailable = !!runData.relics?.some(r => r.effect?.type === 'first_refresh_free');
        // 重置本铁匠已敲词条记录
        runData.blacksmithEnchantedKeywords = [];
    }
    return runData.blacksmithStock;
}

export function refreshBlacksmithStock(runData) {
    const previousKeywords = runData.blacksmithStock?.enchantKeywords || [];
    // 将当前已显示的词条也加入排除池，刷新后不再出现
    const excluded = [...previousKeywords, ...(runData.blacksmithEnchantedKeywords || [])];
    runData.blacksmithStock = createBlacksmithStock(excluded);
}
