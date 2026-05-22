/**
 * 卡牌地下城 - 关卡配置
 */

export const STAGE_CONFIG = {
    '1-1': { type: 'normal',  monsterPool: ['lone_rat', 'cave_bat', 'rotten_rat'],          postBattle: 'two_events',   baseSouls: 3 },
    '1-2': { type: 'normal',  monsterPool: ['rotten_rat', 'gluttony_swarm', 'stone_guard'],  postBattle: 'treasure',     baseSouls: 3 },
    '1-3': { type: 'normal',  monsterPool: ['mud_slime', 'polluted_flower', 'blade_bro'],    postBattle: 'shop_choice',  baseSouls: 3 },
    '1-4': { type: 'elite',   monsterPool: ['elite_guard'],                                   postBattle: 'three_events', baseSouls: 4 },
    '1-5': { type: 'normal',  monsterPool: ['gluttony_swarm', 'vest_sage', 'polluted_flower'], postBattle: 'two_events',   baseSouls: 3 },
    '1-6': { type: 'normal',  monsterPool: ['stone_guard', 'small_gate', 'mud_slime'],        postBattle: 'two_events',   baseSouls: 3 },
    '1-7': { type: 'normal',  monsterPool: ['soul_thief', 'rotten_rat', 'gluttony_swarm'],    postBattle: 'shop_choice', baseSouls: 3 },
    '1-8': { type: 'boss',    monsterPool: ['rat_king'],                                      postBattle: 'act_clear',    baseSouls: 5 }
};
