/**
 * Heave! - 敌舰定义（第二版）
 *
 * 按 14.敌舰数值设计.md 实现
 * 三个航段，每航段8节点
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

// ===== 第一航段敌舰 =====
export const MONSTER_DEFS = {
    // 1-1 普通敌舰池（藤蔓号）
    vine_ship: {
        id: 'vine_ship',
        name: '藤蔓号',
        hp: 200,
        description: '被海藻缠绕的幽灵船，会诱引猎物靠近',
        keywords: ['center_grow_1', 'less_draw_1'],
        keywordDesc: '缠海藻：投入在船首铸造台的矿石淬火1；缠索：玩家每回合少抽取一块矿石',
        theme: 'flower',
        type: 'normal',
        shape: 'flower'
    },

    // 1-2 普通敌舰池（碎舷号）
    shattered_hull: {
        id: 'shattered_hull',
        name: '碎舷号',
        hp: 500,
        description: '船舷破碎的战舰残骸，但火力依然凶猛',
        keywords: ['left_slot_bonus_1', 'center_card_penalty_5'],
        keywordDesc: '左舷薄弱：左舷铸造台倍率+1；船首重甲：投入在船首铸造台的矿石强度-5',
        theme: 'normal',
        type: 'normal',
        shape: 'golem'
    },

    // 1-3 普通敌舰池（狂浪号）
    wild_wave: {
        id: 'wild_wave',
        name: '狂浪号',
        hp: 500,
        description: '在狂浪中颠簸的战舰，打乱你的节奏',
        keywords: ['first_card_random_slot_remain', 'not_first_slot_penalty_5'],
        keywordDesc: '颠浪：每回合投入的第一块矿石随机投入在任意铸造台并使该矿石驻台；战舞：没投入在每回合第一块矿石所在铸造台的矿石强度-5',
        theme: 'elite',
        type: 'normal',
        shape: 'bat'
    },

    // 1-3 普通敌舰池
    rat_swarm: {
        id: 'rat_swarm',
        name: '鼠群舰',
        hp: 500,
        description: '被鼠群占据的废弃船只',
        keywords: ['left_penalty_10'],
        keywordDesc: '放在左舷铸造台上的矿石强度-10',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },
    wall_guard: {
        id: 'wall_guard',
        name: '礁石守卫',
        hp: 500,
        description: '由礁石构成的防御舰艇',
        keywords: ['left_penalty_10'],
        keywordDesc: '放在左舷铸造台上的矿石强度-10',
        theme: 'stone',
        type: 'normal',
        shape: 'golem'
    },
    mist_blade: {
        id: 'mist_blade',
        name: '雾刃舰',
        hp: 500,
        description: '在迷雾中游荡的刃装战舰',
        keywords: [],
        keywordDesc: '',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },

    // 1-4 精英敌舰池（铁甲私掠舰）
    ironclad_privateer: {
        id: 'ironclad_privateer',
        name: '铁甲私掠舰',
        hp: 600,
        description: '重甲私掠舰，精通各种海战战术',
        keywords: ['all_card_penalty_2', 'no_strategy_slot_penalty_10', 'prev_strategy_penalty_5'],
        keywordDesc: '铁甲：所有矿石强度-2；破阵号角：无叠牌生效时，铸造台倍率-10；武技：上回合生效叠牌再次生效时，所有铸造台倍率-5',
        theme: 'elite',
        type: 'elite',
        shape: 'golem'
    },

    // 1-5 普通敌舰池（迷雾号）
    fog_ship: {
        id: 'fog_ship',
        name: '迷雾号',
        hp: 800,
        description: '迷雾中的幽灵船，熟悉又陌生',
        keywords: ['retain_hand_card', 'disable_frequent_strategy'],
        keywordDesc: '迷魂雾：回合开始给一块精炼盘矿石赋予余烬特性，该矿石本回合无法使用；噩梦：玩家无法触发最常用叠牌的加成效果',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },

    // 1-6 普通敌舰池（孢雾号）
    spore_fog: {
        id: 'spore_fog',
        name: '孢雾号',
        hp: 1200,
        description: '释放有毒孢雾的生化战舰',
        keywords: ['play_diffusion_every_3', 'monster_grow_100'],
        keywordDesc: '烟幕弹：每投入三块矿石，投入一块【矿渣】到任意铸造台；回修：每回合敌舰装甲值提升100',
        theme: 'slime',
        type: 'normal',
        shape: 'slime'
    },

    // 1-7 普通敌舰池（劫掠号）
    plunder_ship: {
        id: 'plunder_ship',
        name: '劫掠号',
        hp: 1600,
        description: '劫掠型敌舰，会破坏你的船体改造并偷走银元',
        keywords: ['disable_random_relic', 'lose_gold_per_turn'],
        keywordDesc: '破坏缆绳：随机一件船体改造效果失效；扒船反击：玩家每回合减少1银元',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },

    // 1-8 BOSS敌舰池（金王旗舰）
    gold_king_flagship: {
        id: 'gold_king_flagship',
        name: '金王旗舰',
        hp: 2000,
        description: '深海深处的金王旗舰，掌控着预热与诅咒',
        keywords: ['disable_dedicate', 'yellow_domain', 'yellow_heart'],
        keywordDesc: '金王诅咒：所有预热特性不生效；黄金领域：所有无预热特性的矿石获得反向预热（上方矿石获得-1/2强度）；金王之心：回合开始给一块精炼盘矿石赋予预热特性',
        theme: 'boss',
        type: 'boss',
        shape: 'rat'
    },

    // ===== 第二航段敌舰 =====
    // 2-1 ~ 2-3 普通敌舰
    patrol_corvette: {
        id: 'patrol_corvette',
        name: '巡逻舰',
        hp: 2000,
        description: '第二航段巡逻的敌舰',
        keywords: ['heal_20'],
        keywordDesc: '每回合开始，恢复自身装甲值20',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },
    night_raid: {
        id: 'night_raid',
        name: '夜袭艇',
        hp: 3000,
        description: '夜间突袭的轻型战舰',
        keywords: ['edge_penalty_5'],
        keywordDesc: '放在左舷和右舷铸造台上的矿石强度-5',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    acid_hull: {
        id: 'acid_hull',
        name: '酸蚀舰',
        hp: 4000,
        description: '装备酸液喷射装置的敌舰',
        keywords: ['left_penalty_10'],
        keywordDesc: '放在左舷铸造台上的矿石强度-10',
        theme: 'slime',
        type: 'normal',
        shape: 'slime'
    },

    // 2-4 精英
    ironclad_frigate: {
        id: 'ironclad_frigate',
        name: '铁甲护卫舰',
        hp: 5000,
        description: '重装甲精英护卫舰',
        keywords: ['first_card_discard', 'first_turn_less_draw'],
        keywordDesc: '每回合中投入的第一块矿石直接进入矿渣堆；玩家第一回合少抽取一块矿石',
        theme: 'elite',
        type: 'elite',
        shape: 'golem'
    },

    // 2-5 ~ 2-7 普通敌舰
    magma_walker: {
        id: 'magma_walker',
        name: '熔岩行者',
        hp: 7500,
        description: '在熔岩海域中航行的战舰',
        keywords: ['max_slot_penalty_1'],
        keywordDesc: '倍率最高的铸造台倍率-1',
        theme: 'stone',
        type: 'normal',
        shape: 'golem'
    },
    shadow_hunter: {
        id: 'shadow_hunter',
        name: '暗影猎手',
        hp: 10000,
        description: '潜伏在暗影海域的猎舰',
        keywords: ['steady_penalty'],
        keywordDesc: '若使用叠牌稳重推进，则玩家所有铸造台倍率-1',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    greedy_galleon: {
        id: 'greedy_galleon',
        name: '贪婪帆船',
        hp: 11000,
        description: '贪婪的大型帆船',
        keywords: ['steal_gold'],
        keywordDesc: '每造成一次伤害减少玩家1银元',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },

    // 2-8 BOSS
    magma_leviathan: {
        id: 'magma_leviathan',
        name: '熔岩巨舰',
        hp: 16500,
        description: '由熔岩构成的巨型战舰',
        keywords: ['min_slot_penalty_1', 'first_card_value_penalty_5'],
        keywordDesc: '倍率最低的铸造台倍率-1；每回合投入的第一块矿石强度-5',
        theme: 'boss',
        type: 'boss',
        shape: 'golem'
    },

    // ===== 第三航段敌舰 =====
    // 3-1 ~ 3-3 普通敌舰
    hell_patrol: {
        id: 'hell_patrol',
        name: '地狱巡逻舰',
        hp: 22000,
        description: '来自深海的猎犬级巡逻舰',
        keywords: ['heal_20'],
        keywordDesc: '每回合开始，恢复自身装甲值20',
        theme: 'normal',
        type: 'normal',
        shape: 'rat'
    },
    nightmare_raid: {
        id: 'nightmare_raid',
        name: '噩梦突袭',
        hp: 24000,
        description: '夜晚的噩梦级突袭编队',
        keywords: ['edge_penalty_5'],
        keywordDesc: '放在左舷和右舷铸造台上的矿石强度-5',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    chaos_hull: {
        id: 'chaos_hull',
        name: '混沌舰体',
        hp: 30000,
        description: '混沌之力的化身',
        keywords: ['left_penalty_10'],
        keywordDesc: '放在左舷铸造台上的矿石强度-10',
        theme: 'slime',
        type: 'normal',
        shape: 'slime'
    },

    // 3-4 精英
    fallen_frigate: {
        id: 'fallen_frigate',
        name: '陨落舰艇',
        hp: 40000,
        description: '堕落的精英舰艇',
        keywords: ['first_card_discard', 'first_turn_less_draw'],
        keywordDesc: '每回合中投入的第一块矿石直接进入矿渣堆；玩家第一回合少抽取一块矿石',
        theme: 'elite',
        type: 'elite',
        shape: 'golem'
    },

    // 3-5 ~ 3-7 普通敌舰
    void_walker: {
        id: 'void_walker',
        name: '虚空行者',
        hp: 40000,
        description: '行走于虚空的幽灵舰',
        keywords: ['max_slot_penalty_1'],
        keywordDesc: '倍率最高的铸造台倍率-1',
        theme: 'bat',
        type: 'normal',
        shape: 'bat'
    },
    soul_reaper: {
        id: 'soul_reaper',
        name: '灵魂收割者',
        hp: 50000,
        description: '收割灵魂的死神舰',
        keywords: ['steady_penalty'],
        keywordDesc: '若使用叠牌稳重推进，则玩家所有铸造台倍率-1',
        theme: 'stone',
        type: 'normal',
        shape: 'golem'
    },
    greed_dreadnought: {
        id: 'greed_dreadnought',
        name: '贪婪无畏舰',
        hp: 70000,
        description: '极度贪婪的无畏级战舰',
        keywords: ['steal_gold'],
        keywordDesc: '每造成一次伤害减少玩家1银元',
        theme: 'elite',
        type: 'normal',
        shape: 'rat'
    },

    // 3-8 BOSS
    chaos_lord: {
        id: 'chaos_lord',
        name: '混沌旗舰',
        hp: 100000,
        description: '深海最深处的终极旗舰',
        keywords: ['min_slot_penalty_1', 'first_card_value_penalty_5'],
        keywordDesc: '倍率最低的铸造台倍率-1；每回合投入的第一块矿石强度-5',
        theme: 'boss',
        type: 'boss',
        shape: 'golem'
    }
};
