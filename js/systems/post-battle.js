/**
 * Heave! - 战后结算系统（第二版）
 *
 * 战后流程：
 * - 普通海战：获得银元 → 精炼厂 → 事件 → 地图
 * - 私掠舰战：获得银元 → 船坞 → 事件 → 地图
 * - 旗舰战：获得银元 → 旗舰改造 → 传说事件 → 下一航段
 */

import { pickRandom } from '../core/utils.js';
import { getCurrentStageKey } from '../core/state.js';
import { STAGE_CONFIG, RELIC_DEFS, CARD_DEFS, createCardRewardOptions } from '../data/index.js';

// ===== 事件池定义（按 7.事件池.md） =====
const EVENT_POOLS = {
    common: [
        { name: '漂流银箱', desc: '海面上漂来一个银箱，获得4银元', effect: 'gain_gold', param: 4 },
        { name: '海战图残卷', desc: '获得一次随机叠牌等级强化', effect: 'random_strategy_level' },
        { name: '船首像画家', desc: '从矿舱中选择任意一块矿石+5强度', effect: 'buff_card', param: 5 },
        { name: '自助船坞', desc: '玩家-2银元，任意铸造台倍率+1', effect: 'self_blacksmith', param: { goldCost: 2, slotBonus: 1 } },
        { name: '及时的帮助', desc: '获得一次三选一矿石的机会', effect: 'card_pick_three' },
        { name: '求矿乞丐', desc: '获得一次免费删矿机会', effect: 'free_remove_card' },
        { name: '黑市掮客', desc: '玩家-4银元，随机获得一件船体改造', effect: 'buy_random_relic', param: 4 },
        { name: '走私大副', desc: '获得一块何需谋略？', effect: 'gain_specific_card', param: 'no_strategy' },
        { name: '涂鸦水手', desc: '选择矿舱内任意一块矿石随机转换为随机矿石', effect: 'transform_card' },
        { name: '催熟炉', desc: '矿舱内的淬火矿立刻淬火2次', effect: 'grow_cards_twice' },
        { name: '暗礁馈赠', desc: '选择矿舱内任意一块矿石获得碎屑特性', effect: 'enchant_spread' },
        { name: '顺风波及', desc: '下一场海战，敌舰装甲值减少200点', effect: 'next_monster_hp_down', param: 200 }
    ],
    rare: [
        { name: '遭遇巡逻舰', desc: '玩家立刻与X-7的任意一艘敌舰进行海战（X为当前所在航段）', effect: 'fight_monster' },
        { name: '沉船宝藏', desc: '获得一次三选一中级船体改造的机会', effect: 'pick_rare_relic' },
        { name: '残破克隆镜', desc: '下一场海战，备用锚+1', effect: 'next_battle_hearts_plus', param: 1 },
        { name: '走私掮客', desc: '下一次精炼厂刷新矿石均为随机指定矿脉矿', effect: 'next_shop_system' },
        { name: '赝品工匠', desc: '选择矿舱内任意一块矿石，将它的复制品加入矿舱', effect: 'duplicate_card' },
        { name: '海盗赃款', desc: '玩家获得8银元', effect: 'gain_gold', param: 8 }
    ],
    legendary: [
        { name: '海神遗物', desc: '玩家在本局中备用锚+1', effect: 'max_hearts_plus' },
        { name: '古锚祝福', desc: '选择任意一块矿石获得熔核特性', effect: 'enchant_mighty' },
        { name: '悬赏私掠舰', desc: '玩家立刻与该航段任意私掠舰进行海战', effect: 'fight_elite' }
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
        // 首回合击沉额外+2银元
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

        // 合并所有矿石回 runData.deck
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
        gold_king_flagship: ['relic_gold_king_bone', 'relic_gold_king_heart', 'relic_gold_king_flesh']
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
