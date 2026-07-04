/**
 * Heave! - 航段配置（第二版）
 *
 * 每航段8个节点，共3航段：
 * - 普通敌舰战后：精炼厂 → 事件（高/低概率）
 * - 精英敌舰战后：船坞 → 事件（中/低概率）
 * - BOSS战后：BOSS船体改造 → 传说事件 → 进入下一航段
 */

// 第一航段配置
const ACT1_CONFIG = {
    '1-1': { type: 'normal',  monsterPool: ['vine_ship'],            postBattle: 'shop_high_event',     goldReward: 6 },
    '1-2': { type: 'normal',  monsterPool: ['shattered_hull'],      postBattle: 'shop_high_event',     goldReward: 6 },
    '1-3': { type: 'normal',  monsterPool: ['wild_wave'],            postBattle: 'shop_high_event',     goldReward: 6 },
    '1-4': { type: 'elite',   monsterPool: ['ironclad_privateer'],   postBattle: 'blacksmith_mid_event', goldReward: 8 },
    '1-5': { type: 'normal',  monsterPool: ['fog_ship'],             postBattle: 'shop_low_event',      goldReward: 6 },
    '1-6': { type: 'normal',  monsterPool: ['spore_fog'],            postBattle: 'shop_low_event',      goldReward: 6 },
    '1-7': { type: 'normal',  monsterPool: ['plunder_ship'],         postBattle: 'shop_low_event',      goldReward: 6 },
    '1-8': { type: 'boss',    monsterPool: ['gold_king_flagship'],   postBattle: 'boss_relic_event',    goldReward: 10 }
};

// 第二航段配置
const ACT2_CONFIG = {
    '2-1': { type: 'normal',  monsterPool: ['patrol_corvette', 'night_raid', 'acid_hull'],                postBattle: 'shop_high_event',     goldReward: 6 },
    '2-2': { type: 'normal',  monsterPool: ['patrol_corvette', 'night_raid', 'acid_hull'],                postBattle: 'shop_high_event',     goldReward: 6 },
    '2-3': { type: 'normal',  monsterPool: ['patrol_corvette', 'night_raid', 'acid_hull'],                postBattle: 'shop_high_event',     goldReward: 6 },
    '2-4': { type: 'elite',   monsterPool: ['ironclad_frigate'],                                          postBattle: 'blacksmith_mid_event', goldReward: 8 },
    '2-5': { type: 'normal',  monsterPool: ['magma_walker', 'shadow_hunter', 'greedy_galleon'],           postBattle: 'shop_low_event',      goldReward: 6 },
    '2-6': { type: 'normal',  monsterPool: ['magma_walker', 'shadow_hunter', 'greedy_galleon'],           postBattle: 'shop_low_event',      goldReward: 6 },
    '2-7': { type: 'normal',  monsterPool: ['magma_walker', 'shadow_hunter', 'greedy_galleon'],           postBattle: 'shop_low_event',      goldReward: 6 },
    '2-8': { type: 'boss',    monsterPool: ['magma_leviathan'],                                           postBattle: 'boss_relic_event',    goldReward: 10 }
};

// 第三航段配置
const ACT3_CONFIG = {
    '3-1': { type: 'normal',  monsterPool: ['hell_patrol', 'nightmare_raid', 'chaos_hull'],                postBattle: 'shop_high_event',     goldReward: 6 },
    '3-2': { type: 'normal',  monsterPool: ['hell_patrol', 'nightmare_raid', 'chaos_hull'],                postBattle: 'shop_high_event',     goldReward: 6 },
    '3-3': { type: 'normal',  monsterPool: ['hell_patrol', 'nightmare_raid', 'chaos_hull'],                postBattle: 'shop_high_event',     goldReward: 6 },
    '3-4': { type: 'elite',   monsterPool: ['fallen_frigate'],                                             postBattle: 'blacksmith_mid_event', goldReward: 8 },
    '3-5': { type: 'normal',  monsterPool: ['void_walker', 'soul_reaper', 'greed_dreadnought'],            postBattle: 'shop_low_event',      goldReward: 6 },
    '3-6': { type: 'normal',  monsterPool: ['void_walker', 'soul_reaper', 'greed_dreadnought'],            postBattle: 'shop_low_event',      goldReward: 6 },
    '3-7': { type: 'normal',  monsterPool: ['void_walker', 'soul_reaper', 'greed_dreadnought'],            postBattle: 'shop_low_event',      goldReward: 6 },
    '3-8': { type: 'boss',    monsterPool: ['chaos_lord'],                                                 postBattle: 'boss_relic_event',    goldReward: 10 }
};

export const STAGE_CONFIG = {
    ...ACT1_CONFIG,
    ...ACT2_CONFIG,
    ...ACT3_CONFIG
};
