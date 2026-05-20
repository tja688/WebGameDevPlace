/**
 * 卡牌地下城 - 商店系统
 */

import { createShopStock, createBlacksmithStock } from '../data/index.js';

export function getOrCreateShopStock(runData) {
    if (!runData.shopStock) {
        runData.shopStock = createShopStock();
    }
    return runData.shopStock;
}

export function refreshShopStock(runData) {
    runData.shopStock = createShopStock();
}

export function getOrCreateBlacksmithStock(runData) {
    if (!runData.blacksmithStock) {
        runData.blacksmithStock = createBlacksmithStock();
    }
    return runData.blacksmithStock;
}

export function refreshBlacksmithStock(runData) {
    runData.blacksmithStock = createBlacksmithStock();
}
