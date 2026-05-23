/**
 * 卡牌地下城 - 战后结算系统（第二版）
 *
 * 第二版战后流程：
 * - 普通战：获得魂 → 直接进入牌店 → 事件 → 地图
 * - 精英战：获得魂 → 直接进入铁匠铺 → 事件 → 地图
 * - BOSS战：获得魂 → BOSS遗物三选一 → 事件 → 下一层
 */

import { pickRandom } from '../core/utils.js';
import { getCurrentStageKey } from '../core/state.js';
import { STAGE_CONFIG, RELIC_DEFS, createCardRewardOptions } from '../data/index.js';

// ===== 事件池定义 =====
const EVENT_POOLS = {
    common: [
        { name: '神秘祭坛', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card', param: 2 },
        { name: '古老石碑', desc: '你发现了石碑下隐藏的魂石，获得1魂', effect: 'gain_souls', param: 1 },
        { name: '地下泉水', desc: '清澈的泉水让你精神一振，获得2魂', effect: 'gain_souls', param: 2 },
        { name: '暗影低语', desc: '选择一张卡牌，使其获得【生长1】', effect: 'enchant_grow' },
        { name: '迷失旅人', desc: '一位旅人赠与你一张随机卡牌', effect: 'gain_random_card' },
    ],
    rare: [
        { name: '精灵赌局', desc: '赌一把？50%获得3魂，50%失去2魂', effect: 'gamble' },
        { name: '遗忘宝库', desc: '获得一个随机低级遗物', effect: 'gain_relic' },
        { name: '契约之环', desc: '选择一张卡牌移除，获得3魂', effect: 'remove_for_souls', param: 3 },
        { name: '精灵商店', desc: '用1魂换取一张随机卡牌', effect: 'buy_random_card', param: 1 },
    ],
    legendary: [
        { name: '神圣祝福', desc: '选择牌组内一张卡牌，数值永久+5', effect: 'buff_card', param: 5 },
        { name: '远古传承', desc: '获得一个随机高级遗物', effect: 'gain_rare_relic' },
        { name: '时空裂隙', desc: '复制牌组内一张卡牌加入牌组', effect: 'duplicate_card' },
    ]
};

function pickEventTier(poolType) {
    const r = Math.random();
    if (poolType === 'high') {
        return r < 0.9 ? 'common' : 'rare';
    } else if (poolType === 'mid') {
        if (r < 0.49) return 'common';
        else if (r < 0.99) return 'rare';
        else return 'legendary';
    } else if (poolType === 'low') {
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
        return { result: 'win', soulsGained: 0, nextScreen: 'map', postBattleData: {} };
    }
    let config = STAGE_CONFIG[battleState.stageKey];
    if (!config) {
        const fallbackKey = `1-${battleState.stageKey.split('-')[1]}`;
        config = STAGE_CONFIG[fallbackKey];
    }

    if (battleState.result === 'win') {
        let soulGain = config.baseSouls;
        // 第二版：首回合击杀额外奖励1魂
        if (battleState.turn === 1) {
            soulGain += 1;
        }
        // 扣除损失的心对应的魂（最低为1）
        soulGain = Math.max(1, soulGain - battleState.heartsLost);

        runData.souls += soulGain;
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
        }
        runData.deck = allCards;

        // 设置待处理的事件类型
        runData.pendingEventPool = getEventPool(config.postBattle);

        // 根据战后类型决定下一步
        if (config.postBattle.startsWith('shop')) {
            return {
                result: 'win',
                soulsGained: soulGain,
                nextScreen: 'shop',
                postBattleData: {}
            };
        } else if (config.postBattle.startsWith('blacksmith')) {
            return {
                result: 'win',
                soulsGained: soulGain,
                nextScreen: 'blacksmith',
                postBattleData: {}
            };
        } else if (config.postBattle.startsWith('boss_relic')) {
            return {
                result: 'win',
                soulsGained: soulGain,
                nextScreen: 'boss_relic',
                postBattleData: { relicOptions: pickBossRelics() }
            };
        }

        return {
            result: 'win',
            soulsGained: soulGain,
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
        case 'blacksmith_high_event':
            return { tier: 'high', pool: 'common', count: 2 };
        case 'shop_mid_event':
        case 'blacksmith_mid_event':
            return { tier: 'mid', pool: 'mixed', count: 2 };
        case 'shop_low_event':
        case 'blacksmith_low_event':
            return { tier: 'low', pool: 'rare', count: 2 };
        case 'boss_relic_event':
            return { tier: 'boss', pool: 'legendary', count: 3 };
        default:
            return { tier: 'high', pool: 'common', count: 2 };
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


