/**
 * 卡牌地下城 - 关卡配置（第二版）
 *
 * 每层8个节点，共3层：
 * - 普通怪战后：商店 → 事件（高/低概率）
 * - 精英怪战后：铁匠 → 事件（中/低概率）
 * - BOSS战后：BOSS装备 → 传说事件 → 进入下一层
 */

// 第一层配置
const ACT1_CONFIG = {
    '1-1': { type: 'normal',  monsterPool: ['face_plant'],                                                           postBattle: 'shop_high_event',     goldReward: 6 },
    '1-2': { type: 'normal',  monsterPool: ['rotten_rat', 'mud_slime', 'polluted_flower'],                  postBattle: 'shop_high_event',     goldReward: 6 },
    '1-3': { type: 'normal',  monsterPool: ['gluttony_swarm', 'stone_guard', 'blade_bro'],                  postBattle: 'shop_high_event',     goldReward: 6 },
    '1-4': { type: 'elite',   monsterPool: ['skeleton_knight'],                                                      postBattle: 'blacksmith_mid_event', goldReward: 8 },
    '1-5': { type: 'normal',  monsterPool: ['soul_thief', 'training_dummy', 'swamp_toad'],                  postBattle: 'shop_low_event',      goldReward: 6 },
    '1-6': { type: 'normal',  monsterPool: ['shadow_assassin', 'bone_collector', 'venom_spider'],            postBattle: 'shop_low_event',      goldReward: 6 },
    '1-7': { type: 'normal',  monsterPool: ['gold_eater', 'crystal_golem', 'curse_witch'],                  postBattle: 'shop_low_event',      goldReward: 6 },
    '1-8': { type: 'boss',    monsterPool: ['yellow_king'],                                                          postBattle: 'boss_relic_event',    goldReward: 10 }
};

// 第二层配置
const ACT2_CONFIG = {
    '2-1': { type: 'normal',  monsterPool: ['layer2_wolf', 'layer2_bat', 'layer2_slime'],                   postBattle: 'shop_high_event',     goldReward: 6 },
    '2-2': { type: 'normal',  monsterPool: ['layer2_wolf', 'layer2_bat', 'layer2_slime'],                   postBattle: 'shop_high_event',     goldReward: 6 },
    '2-3': { type: 'normal',  monsterPool: ['layer2_wolf', 'layer2_bat', 'layer2_slime'],                   postBattle: 'shop_high_event',     goldReward: 6 },
    '2-4': { type: 'elite',   monsterPool: ['layer2_elite'],                                               postBattle: 'blacksmith_mid_event', goldReward: 8 },
    '2-5': { type: 'normal',  monsterPool: ['layer2_normal5', 'layer2_normal6', 'layer2_normal7'],          postBattle: 'shop_low_event',      goldReward: 6 },
    '2-6': { type: 'normal',  monsterPool: ['layer2_normal5', 'layer2_normal6', 'layer2_normal7'],          postBattle: 'shop_low_event',      goldReward: 6 },
    '2-7': { type: 'normal',  monsterPool: ['layer2_normal5', 'layer2_normal6', 'layer2_normal7'],          postBattle: 'shop_low_event',      goldReward: 6 },
    '2-8': { type: 'boss',    monsterPool: ['layer2_boss'],                                                postBattle: 'boss_relic_event',    goldReward: 10 }
};

// 第三层配置
const ACT3_CONFIG = {
    '3-1': { type: 'normal',  monsterPool: ['layer3_wolf', 'layer3_bat', 'layer3_slime'],                   postBattle: 'shop_high_event',     goldReward: 6 },
    '3-2': { type: 'normal',  monsterPool: ['layer3_wolf', 'layer3_bat', 'layer3_slime'],                   postBattle: 'shop_high_event',     goldReward: 6 },
    '3-3': { type: 'normal',  monsterPool: ['layer3_wolf', 'layer3_bat', 'layer3_slime'],                   postBattle: 'shop_high_event',     goldReward: 6 },
    '3-4': { type: 'elite',   monsterPool: ['layer3_elite'],                                               postBattle: 'blacksmith_mid_event', goldReward: 8 },
    '3-5': { type: 'normal',  monsterPool: ['layer3_normal5', 'layer3_normal6', 'layer3_normal7'],          postBattle: 'shop_low_event',      goldReward: 6 },
    '3-6': { type: 'normal',  monsterPool: ['layer3_normal5', 'layer3_normal6', 'layer3_normal7'],          postBattle: 'shop_low_event',      goldReward: 6 },
    '3-7': { type: 'normal',  monsterPool: ['layer3_normal5', 'layer3_normal6', 'layer3_normal7'],          postBattle: 'shop_low_event',      goldReward: 6 },
    '3-8': { type: 'boss',    monsterPool: ['layer3_boss'],                                                postBattle: 'boss_relic_event',    goldReward: 10 }
};

export const STAGE_CONFIG = {
    ...ACT1_CONFIG,
    ...ACT2_CONFIG,
    ...ACT3_CONFIG
};
