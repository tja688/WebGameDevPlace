/**
 * Heave! - 矿石定义（第二版）
 *
 * 数值模型：
 * - 粗矿基础 10，精炼矿基础 20，纯金矿基础 40
 * - 高级词条（熔核/重铸）：点数 = 1/2 基础
 * - 中级词条（预热/共生/双晶）：点数 = 3/4 基础（向上取整）
 * - 低级词条（驻台/碎屑/淬火/余烬/合群/齐心）：点数 = 基础
 * - 无词条：点数 = 3/2 基础
 * - 词条带数字2视为更高一级成本
 */

export const CARD_DEFS = {
    // ===== 老兵初始卡组 =====
    teamwork_ore: {
        id: 'teamwork_ore',
        name: '齐心协力矿',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        rarity: 'white',
        description: '淬火：每次投入后永久+1强度',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    assist_ore: {
        id: 'assist_ore',
        name: '助燃矿',
        baseValue: 8,
        size: 1,
        keywords: ['dedicate'],
        rarity: 'white',
        description: '预热：在台上时，熔炼在它上方的第一块矿石获得本矿一半的强度（向下取整）',
        color: '#E67E22',
        accentColor: '#D35400',
        iconType: 'shield'
    },
    veteran_ore: {
        id: 'veteran_ore',
        name: '老兵的矿脉',
        baseValue: 5,
        size: 1,
        keywords: ['mighty'],
        rarity: 'white',
        description: '熔核：投入时，将本矿强度翻倍',
        color: '#FF6B6B',
        accentColor: '#FF4444',
        iconType: 'sword'
    },

    // ===== 通用矿脉 =====
    vine_ore: {
        id: 'vine_ore',
        name: '爬藤矿',
        baseValue: 10,
        size: 1,
        keywords: ['spread'],
        rarity: 'white',
        description: '碎屑：将一块强度为0的【矿渣】加入你的精炼盘',
        color: '#2ECC71',
        accentColor: '#27AE60',
        iconType: 'magic'
    },
    probe_ore: {
        id: 'probe_ore',
        name: '探矿',
        baseValue: 8,
        size: 1,
        keywords: ['chain'],
        rarity: 'white',
        description: '共生：投入时，抽取一块矿石',
        color: '#3498DB',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    ember_ore: {
        id: 'ember_ore',
        name: '余烬矿',
        baseValue: 10,
        size: 1,
        keywords: ['retain'],
        rarity: 'white',
        description: '余烬：回合结束时，本矿保留在精炼盘中不返回矿舱',
        color: '#E74C3C',
        accentColor: '#C0392B',
        iconType: 'shield'
    },
    tungsten_core: {
        id: 'tungsten_core',
        name: '钨芯',
        baseValue: 10,
        size: 1,
        keywords: ['remain'],
        rarity: 'white',
        description: '驻台：回合结束时本矿不移入矿渣堆，继续留在铸造台上',
        color: '#3498DB',
        accentColor: '#2980B9',
        iconType: 'shield'
    },
    crude_iron: {
        id: 'crude_iron',
        name: '粗铁',
        baseValue: 15,
        size: 1,
        keywords: [],
        rarity: 'white',
        description: '粗犷沉重的原铁，纯度不高但份量十足',
        color: '#8B0000',
        accentColor: '#FF4444',
        iconType: 'sword'
    },
    same_cast: {
        id: 'same_cast',
        name: '同铸',
        baseValue: 10,
        size: 1,
        keywords: ['unison'],
        rarity: 'white',
        description: '齐心：在台上时，本矿所在铸造台每有一块其他矿石，则本矿强度+1',
        color: '#00CED1',
        accentColor: '#00AAAA',
        iconType: 'sword'
    },
    friendly_vein: {
        id: 'friendly_vein',
        name: '友好矿脉',
        baseValue: 10,
        size: 1,
        keywords: ['social'],
        rarity: 'white',
        description: '合群：在台上时，本矿相邻铸造台每有一块其他矿石，则本矿强度+1',
        color: '#F39C12',
        accentColor: '#E67E22',
        iconType: 'sword'
    },
    first_ore: {
        id: 'first_ore',
        name: '先手矿',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['first_advantage_effect'],
        rarity: 'white',
        description: '如果本矿是本回合投入的第一块矿石，则强度+5并获得驻台',
        color: '#E74C3C',
        accentColor: '#C0392B',
        iconType: 'sword'
    },
    anchor_badge: {
        id: 'anchor_badge',
        name: '船锚徽记',
        baseValue: 5,
        size: 1,
        keywords: [],
        extraEffects: ['battle_banner_effect'],
        rarity: 'white',
        description: '相邻两侧铸造台矿石强度+5',
        color: '#E67E22',
        accentColor: '#D35400',
        iconType: 'shield'
    },
    rear_ore: {
        id: 'rear_ore',
        name: '殿后矿',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['rear_guard_effect'],
        rarity: 'white',
        description: '投入本矿后精炼盘为空时，本矿强度+10',
        color: '#3498DB',
        accentColor: '#2980B9',
        iconType: 'shield'
    },
    silver_plate: {
        id: 'silver_plate',
        name: '镀银',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['icing_on_cake_effect'],
        rarity: 'white',
        description: '当任一铸造台上有三块矿石，则将本矿从矿舱移到精炼盘',
        color: '#9B59B6',
        accentColor: '#8E44AD',
        iconType: 'magic'
    },
    ballast_stone: {
        id: 'ballast_stone',
        name: '压舱石',
        baseValue: 8,
        size: 1,
        keywords: [],
        extraEffects: ['easy_money_effect'],
        rarity: 'white',
        description: '投入时，获得一银元',
        color: '#F1C40F',
        accentColor: '#F39C12',
        iconType: 'star'
    },
    big_crude_iron: {
        id: 'big_crude_iron',
        name: '大块粗铁',
        baseValue: 30,
        size: 1,
        keywords: [],
        rarity: 'blue',
        description: '更大更重的粗铁块，纯粹吨位',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'sword'
    },
    clear_vein: {
        id: 'clear_vein',
        name: '理清矿脉',
        baseValue: 10,
        size: 1,
        keywords: ['chain'],
        chainCount: 2,
        rarity: 'blue',
        description: '共生2：投入时，抽取两块矿石',
        color: '#3498DB',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    extreme_probe: {
        id: 'extreme_probe',
        name: '极限探矿',
        baseValue: 5,
        size: 1,
        keywords: ['twin', 'chain'],
        rarity: 'blue',
        description: '双晶：投入时复制加入精炼盘；共生：投入时抽取一块矿石',
        color: '#1ABC9C',
        accentColor: '#16A085',
        iconType: 'magic'
    },
    flexible_ore: {
        id: 'flexible_ore',
        name: '灵活调度矿',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['flexible_dispatch_effect'],
        rarity: 'blue',
        description: '投入时，本矿所在铸造台倍率+1',
        color: '#2ECC71',
        accentColor: '#27AE60',
        iconType: 'magic'
    },
    dual_crystal: {
        id: 'dual_crystal',
        name: '双晶矿',
        baseValue: 10,
        size: 1,
        keywords: ['twin', 'dedicate'],
        rarity: 'blue',
        description: '双晶：投入时，复制一块本矿的无双晶特性复制品加入精炼盘；预热：在台上时，熔炼在它上方的矿石获得本矿一半强度',
        color: '#1ABC9C',
        accentColor: '#16A085',
        iconType: 'shield'
    },
    dispatch_ore: {
        id: 'dispatch_ore',
        name: '传令矿',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['messenger_effect'],
        rarity: 'blue',
        description: '投入时，从矿舱里拿一块矿石放入精炼盘',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    steel_drill: {
        id: 'steel_drill',
        name: '精钢钻头',
        baseValue: 20,
        size: 1,
        keywords: [],
        extraEffects: ['luxury_gear_effect'],
        rarity: 'gold',
        description: '若本矿已在铸造台，将相邻两侧铸造台倍率+1',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },
    dark_iron: {
        id: 'dark_iron',
        name: '玄铁锭',
        baseValue: 60,
        size: 1,
        keywords: [],
        rarity: 'gold',
        description: '极致沉重的玄铁，最大单体矿石',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'sword'
    },
    cogito: {
        id: 'cogito',
        name: '我思故我在',
        baseValue: 0,
        size: 1,
        keywords: [],
        extraEffects: ['cogito_ergo_sum_effect'],
        rarity: 'gold',
        description: '若本矿已在铸造台，将本矿所在铸造台倍率×2',
        color: '#9B59B6',
        accentColor: '#8E44AD',
        iconType: 'star'
    },

    // ===== 重铸矿脉 =====
    ugly_showoff: {
        id: 'ugly_showoff',
        name: '丑陋炫耀',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['ugly_showoff_effect'],
        rarity: 'white',
        description: '投入时，若本矿所在铸造台矿石基础强度之和超过100，则抽取一块矿石',
        color: '#8E44AD',
        accentColor: '#9B59B6',
        iconType: 'magic'
    },
    no_strategy: {
        id: 'no_strategy',
        name: '何需谋略',
        baseValue: 30,
        size: 1,
        keywords: [],
        extraEffects: ['no_wisdom_effect'],
        rarity: 'white',
        description: '若本矿已在铸造台，则本矿所在铸造台倍率-1',
        color: '#7F8C8D',
        accentColor: '#95A5A6',
        iconType: 'sword'
    },
    combined_forge: {
        id: 'combined_forge',
        name: '合锻',
        baseValue: 30,
        size: 1,
        keywords: [],
        extraEffects: ['combined_force_effect'],
        rarity: 'white',
        description: '投入时，将精炼盘一块随机矿石放回矿舱',
        color: '#C0392B',
        accentColor: '#E74C3C',
        iconType: 'sword'
    },
    apprentice_cast: {
        id: 'apprentice_cast',
        name: '学徒铸造',
        baseValue: 5,
        size: 1,
        keywords: [],
        extraEffects: ['apprentice_forge_effect'],
        rarity: 'white',
        description: '下一块投入在本矿所在铸造台的矿石本场海战强度永久+5',
        color: '#D35400',
        accentColor: '#E67E22',
        iconType: 'gear'
    },
    body_wisdom: {
        id: 'body_wisdom',
        name: '肉体智慧',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['body_wisdom_effect'],
        rarity: 'white',
        description: '投入时，若本矿所在铸造台矿石基础强度之和超过100，则本矿所在铸造台倍率+1',
        color: '#16A085',
        accentColor: '#1ABC9C',
        iconType: 'shield'
    },
    overdraft: {
        id: 'overdraft',
        name: '透支矿',
        baseValue: 30,
        size: 1,
        keywords: [],
        extraEffects: ['borrow_effect'],
        rarity: 'white',
        description: '投入时，本矿在本次海战强度永久-10',
        color: '#2C3E50',
        accentColor: '#34495E',
        iconType: 'shadow'
    },
    master_cast: {
        id: 'master_cast',
        name: '大师铸造',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['master_forge_effect'],
        rarity: 'blue',
        description: '下一块投入在本矿所在铸造台的矿石本场海战强度永久+10',
        color: '#8E44AD',
        accentColor: '#9B59B6',
        iconType: 'gear'
    },
    perfect_borrow: {
        id: 'perfect_borrow',
        name: '完美借力',
        baseValue: 0,
        size: 1,
        keywords: [],
        extraEffects: ['perfect_borrow_effect'],
        rarity: 'blue',
        description: '投入时，获得相邻两侧铸造台强度最高矿石之和的强度',
        color: '#2980B9',
        accentColor: '#3498DB',
        iconType: 'magic'
    },
    skilled_overdraft: {
        id: 'skilled_overdraft',
        name: '熟练透支',
        baseValue: 40,
        size: 1,
        keywords: [],
        extraEffects: ['skilled_borrow_effect'],
        rarity: 'blue',
        description: '投入时，本矿在本次海战强度永久-5',
        color: '#27AE60',
        accentColor: '#2ECC71',
        iconType: 'shadow'
    },
    solo_drill: {
        id: 'solo_drill',
        name: '独钻',
        baseValue: 0,
        size: 1,
        keywords: ['retain'],
        extraEffects: ['one_man_army_effect'],
        rarity: 'gold',
        description: '余烬：回合结束时保留在精炼盘中；获得当前矿舱内所有矿石强度之和的强度',
        color: '#B7950B',
        accentColor: '#F4D03F',
        iconType: 'star'
    },

    // ===== 淬火矿脉 =====
    war_quench: {
        id: 'war_quench',
        name: '战时淬火',
        baseValue: 8,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        rarity: 'white',
        description: '淬火2：每次投入后永久+2强度',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    forge_trace: {
        id: 'forge_trace',
        name: '锻痕',
        baseValue: 0,
        size: 1,
        keywords: [],
        extraEffects: ['training_trace_effect'],
        rarity: 'white',
        description: '若本矿已在铸造台，则投入在相邻两侧铸造台矿石的淬火效果多触发一次',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'shield'
    },
    intense_forge: {
        id: 'intense_forge',
        name: '猛锻',
        baseValue: 5,
        size: 1,
        keywords: [],
        extraEffects: ['intense_training_effect'],
        rarity: 'white',
        description: '若本矿已在铸造台，则后续投入在同铸造台矿石的淬火效果多触发一次',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'gear'
    },
    batch_quench: {
        id: 'batch_quench',
        name: '集体淬火',
        baseValue: 20,
        size: 1,
        keywords: [],
        extraEffects: ['group_training_effect'],
        rarity: 'gold',
        description: '若本矿已在铸造台，则后续投入在同铸造台的矿石获得淬火2',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },
    forge_partner: {
        id: 'forge_partner',
        name: '锻伴',
        baseValue: 5,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        extraEffects: ['training_partner_effect'],
        rarity: 'white',
        description: '淬火2：每次投入后永久+2强度；当投入一块带有淬火特性的矿石时，将本矿从矿舱里投入到相同铸造台',
        color: '#A0522D',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    forge_set: {
        id: 'forge_set',
        name: '锻集',
        baseValue: 0,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        extraEffects: ['training_set_effect'],
        rarity: 'white',
        description: '淬火2：每次投入后永久+2强度；投入时，将矿舱内所有同名矿投入在本矿所在铸造台',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'magic'
    },
    assist_forge: {
        id: 'assist_forge',
        name: '助锻矿',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['support_training_effect'],
        rarity: 'white',
        description: '若本矿已在铸造台，则下一块投入在本矿所在铸造台上的矿石获得淬火1',
        color: '#E67E22',
        accentColor: '#D35400',
        iconType: 'shield'
    },
    thirty_quench: {
        id: 'thirty_quench',
        name: '三十次淬火',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        extraEffects: ['training_30h_effect'],
        rarity: 'blue',
        description: '淬火：每次投入后永久+1强度；投入时，本矿淬火数+1',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'gear'
    },
    steroid_quench: {
        id: 'steroid_quench',
        name: '激素淬火',
        baseValue: 0,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        extraEffects: ['steroid_training_effect'],
        rarity: 'blue',
        description: '淬火2：每次投入后永久+2强度；投入时，本矿每有10强度就给所在铸造台倍率+1',
        color: '#C0392B',
        accentColor: '#E74C3C',
        iconType: 'gear'
    },
    regular_quench: {
        id: 'regular_quench',
        name: '规律淬火',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        extraEffects: ['regular_training_effect'],
        rarity: 'blue',
        description: '淬火：每次投入后永久+1强度；投入时，从矿舱里拿一块带有淬火特性的矿石放入精炼盘',
        color: '#27AE60',
        accentColor: '#2ECC71',
        iconType: 'magic'
    },
    quench_result: {
        id: 'quench_result',
        name: '淬火成果',
        baseValue: 0,
        size: 1,
        keywords: ['grow'],
        extraEffects: ['training_result_effect'],
        rarity: 'gold',
        description: '淬火：每次投入后永久+1强度；本局游戏每投入过一次带有淬火特性的矿石，本矿强度+2',
        color: '#B7950B',
        accentColor: '#F4D03F',
        iconType: 'star'
    },

    // ===== 衍生物 =====
    slag: {
        id: 'slag',
        name: '矿渣',
        baseValue: 0,
        size: 1,
        keywords: [],
        rarity: 'white',
        description: '强度为0的碎屑衍生物',
        color: '#888888',
        accentColor: '#aaaaaa',
        iconType: 'shadow'
    },
    contraband: {
        id: 'contraband',
        name: '私货',
        baseValue: 50,
        size: 1,
        keywords: [],
        rarity: 'gold',
        description: '一块强力的临时矿石（黑市走私品）',
        color: '#FFD700',
        accentColor: '#FFA500',
        iconType: 'magic'
    }
};

// 战后三选一矿石的矿池
export const CARD_REWARD_POOL = [
    'vine_ore', 'probe_ore', 'ember_ore', 'tungsten_core', 'crude_iron',
    'same_cast', 'friendly_vein', 'first_ore', 'anchor_badge', 'rear_ore',
    'silver_plate', 'ballast_stone', 'big_crude_iron', 'clear_vein', 'extreme_probe',
    'flexible_ore', 'dual_crystal', 'dispatch_ore', 'steel_drill', 'dark_iron',
    'cogito', 'war_quench', 'forge_trace', 'intense_forge', 'batch_quench',
    'ugly_showoff', 'no_strategy', 'combined_forge', 'apprentice_cast', 'body_wisdom',
    'overdraft', 'master_cast', 'perfect_borrow', 'skilled_overdraft', 'solo_drill',
    'forge_partner', 'forge_set', 'assist_forge', 'thirty_quench',
    'steroid_quench', 'regular_quench', 'quench_result'
];

const CARD_REWARD_RARITY_WEIGHTS = [
    { rarity: 'white', weight: 65 },
    { rarity: 'blue', weight: 30 },
    { rarity: 'gold', weight: 5 }
];

function pickWeightedCardRarity() {
    const total = CARD_REWARD_RARITY_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of CARD_REWARD_RARITY_WEIGHTS) {
        if (roll < item.weight) return item.rarity;
        roll -= item.weight;
    }
    return CARD_REWARD_RARITY_WEIGHTS[CARD_REWARD_RARITY_WEIGHTS.length - 1].rarity;
}

function pickRewardCardId(pool) {
    for (let attempt = 0; attempt < CARD_REWARD_RARITY_WEIGHTS.length; attempt++) {
        const rarity = pickWeightedCardRarity();
        const rarityPool = pool.filter(id => CARD_DEFS[id].rarity === rarity);
        if (rarityPool.length > 0) {
            return rarityPool[Math.floor(Math.random() * rarityPool.length)];
        }
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

export function createCardRewardOptions() {
    const options = [];
    const pool = [...CARD_REWARD_POOL];
    for (let i = 0; i < 3; i++) {
        if (pool.length === 0) break;
        const defId = pickRewardCardId(pool);
        const idx = pool.indexOf(defId);
        options.push(pool.splice(idx, 1)[0]);
    }
    return options;
}
