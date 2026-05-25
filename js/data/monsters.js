/**
 * 卡牌地下城 - 怪物定义（第二版）
 *
 * 按 14.怪物数值设计.md 实现
 * 三层，每层8节点
 */

export const MONSTER_COLOR_THEMES = {
    normal: {
        body: '#8B4513', bodyHighlight: '#A0522D', head: '#7A3E11',
        ears: '#6B3A10', earInner: '#CC9966', eyes: '#fff',
        pupil: '#e74c3c', nose: '#ff9999', whiskers: '#A07050',
        teeth: '#ffffcc', tail: '#6B3A10', claws: '#5C3317',
        shadow: 'rgba(0,0,0,0.4)'
    },
    elite: {
        body: '#6B238E', bodyHighlight: '#8B45B3', head: '#5A1F7A',
        ears: '#4A1A66', earInner: '#BB88DD', eyes: '#fff',
        pupil: '#ff00ff', nose: '#ff99ff', whiskers: '#9977AA',
        teeth: '#ffccff', tail: '#4A1A66', claws: '#3D1454',
        shadow: 'rgba(40,0,60,0.5)'
    },
    boss: {
        body: '#8B0000', bodyHighlight: '#B33333', head: '#700000',
        ears: '#600000', earInner: '#FF6666', eyes: '#fff',
        pupil: '#ff0000', nose: '#ff4444', whiskers: '#AA5555',
        teeth: '#ffcccc', tail: '#600000', claws: '#440000',
        shadow: 'rgba(60,0,0,0.5)'
    },
    stone: {
        body: '#5A5A5A', bodyHighlight: '#7A7A7A', head: '#4A4A4A',
        ears: '#3A3A3A', earInner: '#999999', eyes: '#fff',
        pupil: '#666666', nose: '#aaaaaa', whiskers: '#777777',
        teeth: '#cccccc', tail: '#3A3A3A', claws: '#2A2A2A',
        shadow: 'rgba(0,0,0,0.5)'
    },
    dummy: {
        body: '#8B7355', bodyHighlight: '#A0826D', head: '#7A6345',
        ears: '#6B5335', earInner: '#CCBBAA', eyes: '#fff',
        pupil: '#5A5A5A', nose: '#999999', whiskers: '#887766',
        teeth: '#DDDDDD', tail: '#6B5335', claws: '#5A4535',
        shadow: 'rgba(0,0,0,0.3)'
    },
    bat: {
        body: '#4A3A5A', bodyHighlight: '#6A5A7A', head: '#3A2A4A',
        ears: '#2A1A3A', earInner: '#8877AA', eyes: '#ffcccc',
        pupil: '#cc3333', nose: '#aa7777', whiskers: '#665566',
        teeth: '#ffaaaa', tail: '#2A1A3A', claws: '#1A0A2A',
        shadow: 'rgba(20,0,40,0.5)'
    },
    slime: {
        body: '#4A6B3A', bodyHighlight: '#6A9B5A', head: '#3A5B2A',
        ears: '#2A4B1A', earInner: '#88BB77', eyes: '#ccffcc',
        pupil: '#226622', nose: '#66aa66', whiskers: '#558855',
        teeth: '#aaffaa', tail: '#2A4B1A', claws: '#1A3B0A',
        shadow: 'rgba(0,40,0,0.4)'
    },
    flower: {
        body: '#6B4A3A', bodyHighlight: '#8B6A5A', head: '#5B3A2A',
        ears: '#4B2A1A', earInner: '#BB9988', eyes: '#ffddcc',
        pupil: '#cc6633', nose: '#dd9988', whiskers: '#997766',
        teeth: '#ffccbb', tail: '#4B2A1A', claws: '#3B1A0A',
        shadow: 'rgba(60,20,0,0.4)'
    }
};

// ===== 第一层怪物 =====
export const MONSTER_DEFS = {
    // 1-1 普通怪池（人面草）
    face_plant: {
        id: 'face_plant',
        name: '人面草',
        hp: 300,
        description: '地下城中生长的诡异植物，会诱惑猎物靠近',
        keywords: ['center_grow_1', 'less_draw_1'],
        keywordDesc: '香甜诱饵：打出在最中间倍率格上的卡牌成长1；盘根：玩家每回合少抽一张牌',
        theme: 'flower',
        type: 'normal',
        shape: 'flower'
    },

    // 1-2 普通怪池
    rotten_rat: {
        id: 'rotten_rat',
        name: '腐化田鼠',
        hp: 400,
        description: '被污染农田里钻出的病鼠',
        keywords: ['edge_penalty_5'],
        keywordDesc: '放在最左和最右的倍率格子上的卡牌数值-5',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },
    mud_slime: {
        id: 'mud_slime',
        name: '泥浆软泥怪',
        hp: 400,
        description: '被污染的泥浆凝聚而成的怪物',
        keywords: [],
        keywordDesc: '',
        theme: 'slime',
        type: 'normal',
        shape: 'slime'
    },
    polluted_flower: {
        id: 'polluted_flower',
        name: '污染之花',
        hp: 400,
        description: '被地下城气息侵蚀的食人花',
        keywords: [],
        keywordDesc: '',
        theme: 'flower',
        type: 'normal',
        shape: 'flower'
    },

    // 1-3 普通怪池
    gluttony_swarm: {
        id: 'gluttony_swarm',
        name: '暴食鼠群',
        hp: 500,
        description: '成群结队觅食的硕鼠',
        keywords: ['left_penalty_10'],
        keywordDesc: '放在最左倍率格子上的卡牌数值-10',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },
    stone_guard: {
        id: 'stone_guard',
        name: '断墙守卫',
        hp: 500,
        description: '被魔法唤醒的石制守卫',
        keywords: ['left_penalty_10'],
        keywordDesc: '放在最左倍率格子上的卡牌数值-10',
        theme: 'stone',
        type: 'normal',
        shape: 'golem'
    },
    blade_bro: {
        id: 'blade_bro',
        name: '白雾刀手',
        hp: 500,
        description: '在白雾中游荡的持刀怪物',
        keywords: [],
        keywordDesc: '',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },

    // 1-4 精英怪池（骷髅骑士）
    skeleton_knight: {
        id: 'skeleton_knight',
        name: '骷髅骑士',
        hp: 600,
        description: '地下城中游荡的亡者骑士，精通武技',
        keywords: ['all_card_penalty_2', 'no_strategy_slot_penalty_10', 'prev_strategy_penalty_5'],
        keywordDesc: '亡者：所有卡牌点数-2；惊人伟力：无计策生效时，倍率格点数-10；武技：上回合生效计策再次生效时，所有倍率格点数-5',
        theme: 'elite',
        type: 'elite',
        shape: 'golem'
    },

    // 1-5 普通怪池
    soul_thief: {
        id: 'soul_thief',
        name: '焦点扰乱者',
        hp: 800,
        description: '会干扰高倍率格节奏的怪物',
        keywords: ['max_slot_penalty_1'],
        keywordDesc: '数值最高的倍率格点数-1',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    training_dummy: {
        id: 'training_dummy',
        name: '训练靶子',
        hp: 800,
        description: '一个耐打的稻草人靶子',
        keywords: ['max_slot_penalty_1'],
        keywordDesc: '数值最高的倍率格点数-1',
        theme: 'dummy',
        type: 'normal',
        shape: 'rat'
    },
    swamp_toad: {
        id: 'swamp_toad',
        name: '沼泽蟾蜍',
        hp: 800,
        description: '潜伏在沼泽中的巨大蟾蜍',
        keywords: ['max_slot_penalty_1'],
        keywordDesc: '数值最高的倍率格点数-1',
        theme: 'slime',
        type: 'normal',
        shape: 'slime'
    },

    // 1-6 普通怪池
    shadow_assassin: {
        id: 'shadow_assassin',
        name: '暗影刺客',
        hp: 1200,
        description: '潜伏在阴影中的杀手',
        keywords: ['steady_penalty'],
        keywordDesc: '若使用计策稳重推进，则玩家所有倍率格点数-1',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    bone_collector: {
        id: 'bone_collector',
        name: '白骨收集者',
        hp: 1200,
        description: '搜集骸骨的亡灵',
        keywords: ['steady_penalty'],
        keywordDesc: '若使用计策稳重推进，则玩家所有倍率格点数-1',
        theme: 'stone',
        type: 'normal',
        shape: 'golem'
    },
    venom_spider: {
        id: 'venom_spider',
        name: '毒液蜘蛛',
        hp: 1200,
        description: '喷射剧毒的巨型蜘蛛',
        keywords: ['steady_penalty'],
        keywordDesc: '若使用计策稳重推进，则玩家所有倍率格点数-1',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },

    // 1-7 普通怪池
    gold_eater: {
        id: 'gold_eater',
        name: '吞金兽',
        hp: 1600,
        description: '以金币为食的怪物',
        keywords: ['steal_gold'],
        keywordDesc: '每造成一次伤害减少玩家1金币',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },
    crystal_golem: {
        id: 'crystal_golem',
        name: '水晶魔像',
        hp: 1600,
        description: '由魔法水晶构成的魔像',
        keywords: ['steal_gold'],
        keywordDesc: '每造成一次伤害减少玩家1金币',
        theme: 'stone',
        type: 'normal',
        shape: 'golem'
    },
    curse_witch: {
        id: 'curse_witch',
        name: '诅咒女巫',
        hp: 1600,
        description: '散播诅咒的女巫',
        keywords: ['steal_gold'],
        keywordDesc: '每造成一次伤害减少玩家1金币',
        theme: 'elite',
        type: 'normal',
        shape: 'rat'
    },

    // 1-8 BOSS池（黄色君王）
    yellow_king: {
        id: 'yellow_king',
        name: '黄色君王',
        hp: 2000,
        description: '地下城深处的黄色君王，掌控着奉献与诅咒',
        keywords: ['disable_dedicate', 'yellow_domain', 'yellow_heart'],
        keywordDesc: '黄之王：所有奉献词条不生效；黄色领域：所有无奉献词条卡牌获得反向奉献；黄之心：回合开始给一张手牌赋予奉献词条',
        theme: 'boss',
        type: 'boss',
        shape: 'rat'
    },

    // ===== 第二层怪物 =====
    // 2-1 ~ 2-3 普通怪
    layer2_wolf: {
        id: 'layer2_wolf',
        name: '腐狼',
        hp: 2000,
        description: '第二层腐化的野狼',
        keywords: ['heal_20'],
        keywordDesc: '每回合开始，恢复自身血量20',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },
    layer2_bat: {
        id: 'layer2_bat',
        name: '血蝠',
        hp: 3000,
        description: '吸血的巨型蝙蝠',
        keywords: ['edge_penalty_5'],
        keywordDesc: '放在最左和最右的倍率格子上的卡牌数值-5',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    layer2_slime: {
        id: 'layer2_slime',
        name: '酸液怪',
        hp: 4000,
        description: '喷射酸液的怪物',
        keywords: ['left_penalty_10'],
        keywordDesc: '放在最左倍率格子上的卡牌数值-10',
        theme: 'slime',
        type: 'normal',
        shape: 'slime'
    },

    // 2-4 精英
    layer2_elite: {
        id: 'layer2_elite',
        name: '铁甲卫',
        hp: 5000,
        description: '身披铁甲的精英守卫',
        keywords: ['first_card_discard', 'first_turn_less_draw'],
        keywordDesc: '每回合中使用的第一张卡牌直接进入弃牌堆；玩家第一回合少抽一张牌',
        theme: 'elite',
        type: 'elite',
        shape: 'golem'
    },

    // 2-5 ~ 2-7 普通怪
    layer2_normal5: {
        id: 'layer2_normal5',
        name: '熔岩行者',
        hp: 7500,
        description: '在熔岩中行走的怪物',
        keywords: ['max_slot_penalty_1'],
        keywordDesc: '数值最高的倍率格点数-1',
        theme: 'stone',
        type: 'normal',
        shape: 'golem'
    },
    layer2_normal6: {
        id: 'layer2_normal6',
        name: '暗影猎手',
        hp: 10000,
        description: '潜伏在暗影中的猎手',
        keywords: ['steady_penalty'],
        keywordDesc: '若使用计策稳重推进，则玩家所有倍率格点数-1',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    layer2_normal7: {
        id: 'layer2_normal7',
        name: '贪婪巨魔',
        hp: 11000,
        description: '贪婪的巨魔',
        keywords: ['steal_gold'],
        keywordDesc: '每造成一次伤害减少玩家1金币',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },

    // 2-8 BOSS
    layer2_boss: {
        id: 'layer2_boss',
        name: '熔岩巨兽',
        hp: 16500,
        description: '由熔岩构成的巨大怪物',
        keywords: ['min_slot_penalty_1', 'first_card_value_penalty_5'],
        keywordDesc: '数值最低的倍率格点数-1；每回合打出的第一张卡牌点数-5',
        theme: 'boss',
        type: 'boss',
        shape: 'golem'
    },

    // ===== 第三层怪物 =====
    // 3-1 ~ 3-3 普通怪
    layer3_wolf: {
        id: 'layer3_wolf',
        name: '地狱犬',
        hp: 22000,
        description: '来自地狱的猎犬',
        keywords: ['heal_20'],
        keywordDesc: '每回合开始，恢复自身血量20',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },
    layer3_bat: {
        id: 'layer3_bat',
        name: '夜魇',
        hp: 24000,
        description: '夜晚的梦魇',
        keywords: ['edge_penalty_5'],
        keywordDesc: '放在最左和最右的倍率格子上的卡牌数值-5',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    layer3_slime: {
        id: 'layer3_slime',
        name: '混沌黏液',
        hp: 30000,
        description: '混沌的化身',
        keywords: ['left_penalty_10'],
        keywordDesc: '放在最左倍率格子上的卡牌数值-10',
        theme: 'slime',
        type: 'normal',
        shape: 'slime'
    },

    // 3-4 精英
    layer3_elite: {
        id: 'layer3_elite',
        name: '堕落骑士',
        hp: 40000,
        description: '堕落的骑士',
        keywords: ['first_card_discard', 'first_turn_less_draw'],
        keywordDesc: '每回合中使用的第一张卡牌直接进入弃牌堆；玩家第一回合少抽一张牌',
        theme: 'elite',
        type: 'elite',
        shape: 'golem'
    },

    // 3-5 ~ 3-7 普通怪
    layer3_normal5: {
        id: 'layer3_normal5',
        name: '虚空行者',
        hp: 40000,
        description: '行走于虚空的怪物',
        keywords: ['max_slot_penalty_1'],
        keywordDesc: '数值最高的倍率格点数-1',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    layer3_normal6: {
        id: 'layer3_normal6',
        name: '灵魂收割者',
        hp: 50000,
        description: '收割灵魂的死神',
        keywords: ['steady_penalty'],
        keywordDesc: '若使用计策稳重推进，则玩家所有倍率格点数-1',
        theme: 'stone',
        type: 'normal',
        shape: 'golem'
    },
    layer3_normal7: {
        id: 'layer3_normal7',
        name: '贪婪魔王',
        hp: 70000,
        description: '极度贪婪的魔王',
        keywords: ['steal_gold'],
        keywordDesc: '每造成一次伤害减少玩家1金币',
        theme: 'elite',
        type: 'normal',
        shape: 'rat'
    },

    // 3-8 BOSS
    layer3_boss: {
        id: 'layer3_boss',
        name: '混沌之主',
        hp: 100000,
        description: '地下城最深处的终极存在',
        keywords: ['min_slot_penalty_1', 'first_card_value_penalty_5'],
        keywordDesc: '数值最低的倍率格点数-1；每回合打出的第一张卡牌点数-5',
        theme: 'boss',
        type: 'boss',
        shape: 'golem'
    }
};
