/**
 * 生死烛局 - 战后结算系统（第二版）
 *
 * 战后流程：
 * - 普通战：获得金币 → 商店 → 事件 → 地图
 * - 精英战：获得金币 → 铁匠 → 事件 → 地图
 * - BOSS战：获得金币 → BOSS遗物 → 传说事件 → 下一层
 */

import { pickRandom } from '../core/utils.js';
import { getCurrentStageKey } from '../core/state.js';
import { STAGE_CONFIG, RELIC_DEFS, CARD_DEFS, createCardRewardOptions } from '../data/index.js';

// ===== 事件池定义（按 7.事件池.md） =====
const EVENT_POOLS = {
    common: [
        { name: '散落的金币', desc: '玩家获得4金币', effect: 'gain_gold', param: 4 },
        { name: '遗落的兵书', desc: '获得一次随机计策等级强化', effect: 'random_strategy_level' },
        { name: '好心的小画家', desc: '从牌组中选择任意一张牌+5点数', effect: 'buff_card', param: 5 },
        { name: '自助铁匠锤', desc: '玩家-2金币，任意倍率格点数+1', effect: 'self_blacksmith', param: { goldCost: 2, slotBonus: 1 } },
        { name: '及时的帮助', desc: '获得一次三选一卡牌的机会', effect: 'card_pick_three' },
        { name: '求牌乞丐', desc: '获得一次免费删牌机会', effect: 'free_remove_card' },
        { name: '可疑商人', desc: '玩家-4金币，随机获得一件遗物', effect: 'buy_random_relic', param: 4 },
        { name: '神秘肌肉男', desc: '获得一张何须智慧？', effect: 'gain_specific_card', param: 'no_wisdom' },
        { name: '乱涂乱画', desc: '选择牌组内任意一张卡牌随机转换为随机卡牌', effect: 'transform_card' },
        { name: '催熟激素', desc: '牌组内的成长牌立刻成长2次', effect: 'grow_cards_twice' },
        { name: '盲目岩壁', desc: '选择牌组内任意一张卡牌获得蔓延词条', effect: 'enchant_spread' },
        { name: '场外援助', desc: '下一场战斗，怪物血量减少200点', effect: 'next_monster_hp_down', param: 200 }
    ],
    rare: [
        { name: '抵御怪物', desc: '玩家立刻与X-7的任意一只怪物进行战斗（X为当前所在层数）', effect: 'fight_monster' },
        { name: '出土遗物', desc: '获得一次三选一中级遗物的机会', effect: 'pick_rare_relic' },
        { name: '残破克隆镜', desc: '下一场战斗，人群数+1', effect: 'next_battle_hearts_plus', param: 1 },
        { name: '预言家', desc: '下一次商店刷新卡牌均为随机指定体系牌', effect: 'next_shop_system' },
        { name: '赝品画家', desc: '选择牌组内任意一张卡牌，将它的复制品加入卡组', effect: 'duplicate_card' },
        { name: '金钱壶', desc: '玩家获得8金币', effect: 'gain_gold', param: 8 }
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
    const maxAttempts = 50;
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let event;
        do {
            const tier = pickEventTier(pending.tier);
            event = pickEventFromPool(tier);
            attempts++;
        } while (attempts < maxAttempts && options.some(o => o.name === event.name));
        options.push(event);
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
        const fastKillRelic = runData.relics.find(r => r.effect?.type === 'fast_kill_gold');
        if (fastKillRelic && battleState.turn <= (fastKillRelic.effect.turns || 2)) {
            goldGain += fastKillRelic.effect.gold || 2;
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
            c.battleBonus = 0;
            c.dedicateTriggered = false;
            delete c.removeRemainOnNextTurnStart;
            delete c.remainExhausted;
            delete c.retainDisabledThisTurn;
            delete c._tempRemainAdded;
            if (c._monsterAddedKeywords) {
                const def = CARD_DEFS[c.defId];
                const originalKeywords = def ? def.keywords : [];
                for (const kw of c._monsterAddedKeywords) {
                    if (!originalKeywords.includes(kw)) {
                        const idx = c.keywords.indexOf(kw);
                        if (idx !== -1) c.keywords.splice(idx, 1);
                    }
                }
                delete c._monsterAddedKeywords;
            }
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
                postBattleData: { relicOptions: pickBossRelics(battleState.monster.id) }
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

function pickBossRelics(monsterId) {
    const options = [];
    const pool = RELIC_DEFS.filter(r => r.rarity === 'boss');
    const fallbackPool = RELIC_DEFS.filter(r => r.rarity === 'epic');
    const bossSpecificIds = {
        yellow_king: ['relic_boss_yellow_bone', 'relic_boss_yellow_heart', 'relic_boss_yellow_flesh']
    };
    const specificPool = pool.filter(r => (bossSpecificIds[monsterId] || []).includes(r.id));
    if (specificPool.length > 0) {
        options.push(specificPool[Math.floor(Math.random() * specificPool.length)]);
    }
    const used = {};
    for (const relic of options) used[relic.id] = true;
    const usablePool = (pool.length >= 3 ? pool : [...pool, ...fallbackPool]).filter(r => !used[r.id]);
    const shuffled = [...usablePool].sort(() => Math.random() - 0.5);
    for (let i = 0; options.length < 3 && i < shuffled.length; i++) {
        options.push(shuffled[i]);
    }
    return options;
}

export function pickExcavatedRelicOptions() {
    const options = [];
    const rarePool = RELIC_DEFS.filter(r => r.rarity === 'rare');
    const epicPool = RELIC_DEFS.filter(r => r.rarity === 'epic');
    for (let i = 0; i < 3; i++) {
        const useEpic = epicPool.length > 0 && Math.random() < 0.05;
        const pool = useEpic ? epicPool : rarePool;
        if (pool.length === 0) break;
        options.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return options;
}
