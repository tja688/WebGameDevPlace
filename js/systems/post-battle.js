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

export function resolveBattleEnd(battleState) {
    const runData = battleState.runDataRef;
    if (!runData) {
        return { result: 'win', soulsGained: 0, nextScreen: 'map', postBattleData: {} };
    }
    const config = STAGE_CONFIG[battleState.stageKey];

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
    const pool = [...RELIC_DEFS];
    for (let i = 0; i < 3; i++) {
        if (pool.length === 0) break;
        const idx = Math.floor(Math.random() * pool.length);
        options.push(pool.splice(idx, 1)[0]);
    }
    return options;
}

export function generatePostBattleEvent(runData) {
    // 占位：返回一个标准事件
    return {
        name: '神秘力量',
        desc: '选择牌组内一张卡牌，使其数值永久+2',
        effect: 'buff_card'
    };
}
