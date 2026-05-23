/**
 * 卡牌地下城 - 关卡配置（第二版）
 *
 * 每层6个节点：
 * - 普通怪战后：牌店 → 事件
 * - 精英怪战后：铁匠 → 事件
 * - BOSS战后：BOSS遗物 → 事件 → 进入下一层
 */

export const STAGE_CONFIG = {
    '1-1': { type: 'normal',  monsterPool: ['lone_rat', 'cave_bat', 'rotten_rat'],          postBattle: 'shop_high_event',   baseSouls: 3 },
    '1-2': { type: 'normal',  monsterPool: ['rotten_rat', 'gluttony_swarm', 'stone_guard'],  postBattle: 'shop_high_event',   baseSouls: 3 },
    '1-3': { type: 'elite',   monsterPool: ['elite_guard'],                                   postBattle: 'blacksmith_mid_event', baseSouls: 4 },
    '1-4': { type: 'normal',  monsterPool: ['mud_slime', 'polluted_flower', 'blade_bro'],    postBattle: 'shop_low_event',    baseSouls: 3 },
    '1-5': { type: 'normal',  monsterPool: ['gluttony_swarm', 'vest_sage', 'polluted_flower'], postBattle: 'shop_low_event',  baseSouls: 3 },
    '1-6': { type: 'boss',    monsterPool: ['rat_king'],                                      postBattle: 'boss_relic_event',  baseSouls: 5 }
};
