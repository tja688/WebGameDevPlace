/**
 * 卡牌地下城 - 战后结算系统
 */

import { pickRandom } from '../core/utils.js';
import { getCurrentStageKey } from '../core/state.js';
import { STAGE_CONFIG, RELIC_DEFS, createCardRewardOptions } from '../data/index.js';

export function resolveBattleEnd(battleState) {
    const runData = battleState.runDataRef;
    if (!runData) {
        return { result: 'win', soulsGained: 0, postBattleType: 'act_clear', postBattleData: { reward: '测试奖励', desc: '调试模式' }, nextStage: null };
    }
    const config = STAGE_CONFIG[battleState.stageKey];

    if (battleState.result === 'win') {
        let soulGain = 0;
        if (!runData.pendingPostBattle) {
            soulGain = Math.max(1, config.baseSouls - battleState.heartsLost);
            runData.souls += soulGain;
            runData.heartsLostInStage = battleState.heartsLost;
            runData.completedStages.push(battleState.stageKey);

            const allCards = [
                ...battleState.deck,
                ...battleState.hand,
                ...battleState.discard,
                ...battleState.slots.flatMap(s => s.cards)
            ];
            // 清空所有卡牌的临时加成（防止跨战斗保留伪永久数值）
            for (const c of allCards) {
                c.tempBonus = 0;
            }
            runData.deck = allCards;
        }

        if (config.type === 'normal' && !runData.pendingPostBattle) {
            runData.pendingPostBattle = config.postBattle;
            runData.pendingSoulsGained = soulGain;
            return {
                result: 'win',
                soulsGained: soulGain,
                postBattleType: 'card_pick',
                postBattleData: { options: createCardRewardOptions() },
                nextStage: runData.stageIndex + 1
            };
        }

        const pendingType = runData.pendingPostBattle;
        const pendingSouls = runData.pendingSoulsGained;
        runData.pendingPostBattle = null;
        runData.pendingSoulsGained = 0;

        const postBattleType = pendingType || config.postBattle;
        const postBattleData = generatePostBattleData(postBattleType, runData);

        return {
            result: 'win',
            soulsGained: pendingSouls || soulGain,
            postBattleType: postBattleType,
            postBattleData: postBattleData,
            nextStage: battleState.stageKey === '1-8' ? null : runData.stageIndex + 1
        };
    } else {
        return { result: 'lose' };
    }
}

export function generatePostBattleData(type, runData) {
    switch (type) {
        case 'two_events':
            return {
                options: [
                    { name: '神秘力量', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card' },
                    { name: '古老祝福', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card' }
                ]
            };
        case 'three_events':
            return {
                options: [
                    { name: '神秘力量', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card' },
                    { name: '古老祝福', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card' },
                    { name: '精灵馈赠', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card' }
                ]
            };
        case 'treasure':
            return {
                relic: pickRandom(RELIC_DEFS)
            };
        case 'shop_choice':
            return {
                options: [
                    { type: 'shop', name: '牌店', icon: '🏪', desc: '购买卡牌、删牌和强化' },
                    { type: 'blacksmith', name: '铁匠铺', icon: '🔨', desc: '购买遗物、升级倍率和附魔' },
                    { type: 'event', name: '随机事件', icon: '❓', desc: '遇到意想不到的事' }
                ]
            };
        case 'act_clear':
            return {
                reward: '拓展效率牌桌',
                desc: '倍率牌桌上限增加一格'
            };
        default:
            return {};
    }
}
