import {
    drawPostBattle,
    drawCardPick,
    drawCardSelect,
    drawShop,
    drawBlacksmith,
    drawEvent
} from './js/render/screens.js';
import { createRunData } from './js/core/state.js';
import { createCardInstance } from './js/data/index.js';
import { getOrCreateShopStock } from './js/systems/shop.js';

function createMockContext() {
    const gradient = { addColorStop() {} };
    const ctx = {
        measureText(text) {
            return { width: String(text).length * 8 };
        },
        createLinearGradient() {
            return gradient;
        },
        createRadialGradient() {
            return gradient;
        }
    };

    return new Proxy(ctx, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return () => {};
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        }
    });
}

function assertDoesNotThrow(name, fn) {
    try {
        fn();
        console.log('✓', name);
    } catch (error) {
        console.error('✗', name);
        console.error(error.stack || error.message);
        process.exitCode = 1;
    }
}

const renderer = { width: 1280, height: 720, animTime: 1 };
const ctx = createMockContext();

const runData = createRunData('veteran');
runData.gold = 8;

assertDoesNotThrow('drawCardPick renders card reward screen', () => {
    drawCardPick(renderer, ctx, {
        data: { options: ['unity_strike', 'brute_force', 'war_training'] }
    });
});

assertDoesNotThrow('drawPostBattle renders shop-choice rewards', () => {
    drawPostBattle(renderer, ctx, {
        data: {
            runData,
            type: 'shop_choice',
            goldGained: 3,
            postBattleData: {
                options: [
                    { type: 'shop', name: '牌店', icon: 'S', desc: '购买卡牌、删牌和强化' },
                    { type: 'blacksmith', name: '铁匠铺', icon: 'B', desc: '购买遗物、升级倍率和附魔' },
                    { type: 'event', name: '随机事件', icon: '?', desc: '遇到意想不到的事' }
                ]
            }
        }
    });
});

assertDoesNotThrow('drawCardSelect renders deck selection screen', () => {
    drawCardSelect(renderer, ctx, {
        data: {
            title: '选择一张卡牌',
            desc: '测试选牌',
            cards: [createCardInstance('precise_strike'), createCardInstance('feint')]
        }
    });
});

assertDoesNotThrow('drawShop renders shop screen', () => {
    drawShop(renderer, ctx, {
        data: { runData, stock: getOrCreateShopStock(runData) }
    });
});

assertDoesNotThrow('drawBlacksmith renders blacksmith screen', () => {
    drawBlacksmith(renderer, ctx, {
        data: { runData }
    });
});

assertDoesNotThrow('drawEvent renders event screen', () => {
    drawEvent(renderer, ctx, {
        data: {
            eventName: '神秘力量',
            eventDesc: '选择牌组内一张卡牌，使其数值永久+2'
        }
    });
});

if (process.exitCode) {
    process.exit(process.exitCode);
}
