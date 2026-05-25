/**
 * 卡牌地下城 - 战后结算系统（第二版）
 *
 * 战后流程：
 * - 普通战：获得金币 → 商店 → 事件 → 地图
 * - 精英战：获得金币 → 铁匠 → 事件 → 地图
 * - BOSS战：获得金币 → BOSS遗物 → 传说事件 → 下一层
 */

import { pickRandom } from '../core/utils.js';
import { getCurrentStageKey } from '../core/state.js';
import { STAGE_CONFIG, RELIC_DEFS, createCardRewardOptions } from '../data/index.js';

// ===== 事件池定义（按 7.事件池.md） =====
const EVENT_POOLS = {
    common: [
        { name: '散落的金币', desc: '玩家获得4金币', effect: 'gain_gold', param: 4 },
        { name: '遗落的兵书', desc: '获得一次随机计策等级强化', effect: 'random_strategy_level' },
        { name: '好心的小画家', desc: '从牌组中选择任意一张牌+5点数', effect: 'buff_card', param: 5 },
        { name: '自助铁匠锤', desc: '玩家-2金币，任意倍率格点数+1', effect: 'self_blacksmith', param: { goldCost: 2, slotBonus: 1 } },
        { name: '及时的帮助', desc: '获得一次三选一卡牌的机会', effect: 'card_pick_three' }
    ],
    rare: [
        { name: '抵御怪物', desc: '玩家立刻与X-7的任意一只怪物进行战斗（X为当前所在层数）', effect: 'fight_monster' },
        { name: '出土遗物', desc: '获得一次三选一中级遗物的机会', effect: 'pick_rare_relic' },
        { name: '好心的小画家', desc: '从牌组中选择任意一张牌+5点数', effect: 'buff_card', param: 5 }
    ],
    legendary: [
        { name: '魔镜', desc: '玩家在本局中人群数+1', effect: 'max_hearts_plus' },
        { name: '轻语岩壁', desc: '选择任意一张卡牌获得伟力词条', effect: 'enchant_mighty' },
        { name: '挑战强敌', desc: '玩家立刻与该层任意精英进行战斗', effect: 'fight_elite' }
    ]
};

function pickEventTier(poolType) {
    const r = Math.random();
    if (poolType === 'high') {
        // 高常见概率：90%常见 10%稀有
        return r < 0.9 ? 'common' : 'rare';
    } else if (poolType === 'mid') {
        // 中概率稀有：49%常见 50%稀有 1%传说
        if (r < 0.49) return 'common';
        else if (r < 0.99) return 'rare';
        else return 'legendary';
    } else if (poolType === 'low') {
        // 低概率传说：90%稀有 10%传说
        return r < 0.9 ? 'rare' : 'legendary';
    } else if (poolType === 'boss') {
        return 'legendary';
    }
    return 'common';
}

function pickEventFromPool(tier) {
    const pool = EVENT_POOLS[tier] || EVENT_POOLS.common;
    return { ...pool[Math.floor(Math.random() * pool.length)] };
}

export function generatePostBattleEvents(runData) {
    const pending = runData.pendingEventPool;
    if (!pending) return [];
    const count = pending.count || 2;
    const options = [];
    for (let i = 0; i < count; i++) {
        const tier = pickEventTier(pending.tier);
        options.push(pickEventFromPool(tier));
    }
    return options;
}

export function resolveBattleEnd(battleState) {
    const runData = battleState.runDataRef;
    if (!runData) {
        return { result: 'win', goldGained: 0, nextScreen: 'map', postBattleData: {} };
    }
    let config = STAGE_CONFIG[battleState.stageKey];
    if (!config) {
        const fallbackKey = `1-${battleState.stageKey.split('-')[1]}`;
        config = STAGE_CONFIG[fallbackKey];
    }

    if (battleState.result === 'win') {
        let goldGain = config.goldReward || 6;
        // 首回合击杀额外+2金币
        if (battleState.firstTurnKill) {
            goldGain += 2;
        }

        runData.gold += goldGain;
        runData.heartsLostInStage = battleState.heartsLost;
        runData.completedStages.push(battleState.stageKey);

        // 合并所有卡牌回 runData.deck
        const allCards = [
            ...battleState.deck,
            ...battleState.hand,
            ...battleState.discard,
            ...battleState.slots.flatMap(s => s.cards)
        ];
        for (const c of allCards) {
            c.tempBonus = 0;
            c.dedicateTriggered = false;
        }
        runData.deck = allCards.filter(c => !c.isDerived);

        // 设置待处理的事件类型
        runData.pendingEventPool = getEventPool(config.postBattle);

        // 根据战后类型决定下一步
        if (config.postBattle.startsWith('shop')) {
            return {
                result: 'win',
                goldGained: goldGain,
                nextScreen: 'shop',
                postBattleData: {}
            };
        } else if (config.postBattle.startsWith('blacksmith')) {
            return {
                result: 'win',
                goldGained: goldGain,
                nextScreen: 'blacksmith',
                postBattleData: {}
            };
        } else if (config.postBattle.startsWith('boss_relic')) {
            return {
                result: 'win',
                goldGained: goldGain,
                nextScreen: 'boss_relic',
                postBattleData: { relicOptions: pickBossRelics() }
            };
        }

        return {
            result: 'win',
            goldGained: goldGain,
            nextScreen: 'map',
            postBattleData: {}
        };
    } else {
        return { result: 'lose' };
    }
}

function getEventPool(postBattleType) {
    switch (postBattleType) {
        case 'shop_high_event':
            return { tier: 'high', count: 2 };
        case 'shop_low_event':
            return { tier: 'low', count: 2 };
        case 'blacksmith_mid_event':
            return { tier: 'mid', count: 3 };
        case 'boss_relic_event':
            return { tier: 'boss', count: 3 };
        default:
            return { tier: 'high', count: 2 };
    }
}

function pickBossRelics() {
    const options = [];
    const pool = RELIC_DEFS.filter(r => r.rarity === 'boss');
    const fallbackPool = RELIC_DEFS.filter(r => r.rarity === 'epic');
    const usablePool = pool.length >= 3 ? pool : [...pool, ...fallbackPool];
    const shuffled = [...usablePool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
        options.push(shuffled[i]);
    }
    return options;
}
