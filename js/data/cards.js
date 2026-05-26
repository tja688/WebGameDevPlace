/**
 * 卡牌地下城 - 卡牌定义（第二版）
 *
 * 数值模型：
 * - 白卡基础 10，蓝卡基础 20，金卡基础 40
 * - 高级词条（伟力/回响）：点数 = 1/2 基础
 * - 中级词条（奉献/连携/双生）：点数 = 3/4 基础（向上取整）
 * - 低级词条（留场/蔓延/成长/保留/合群/齐心）：点数 = 基础
 * - 无词条：点数 = 3/2 基础
 * - 词条带数字2视为更高一级成本
 */

export const CARD_DEFS = {
    // ===== 老兵初始卡组 =====
    unity_strike: {
        id: 'unity_strike',
        name: '齐心协力',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        rarity: 'white',
        description: '成长：每次打出后永久+1点数',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    support_strike: {
        id: 'support_strike',
        name: '辅助打击',
        baseValue: 8,
        size: 1,
        keywords: ['dedicate'],
        rarity: 'white',
        description: '奉献：在场上时，下一张打出在本牌所在倍率格的卡牌获得本牌一半的点数（向下取整）',
        color: '#E67E22',
        accentColor: '#D35400',
        iconType: 'shield'
    },
    veteran_ambition: {
        id: 'veteran_ambition',
        name: '老兵雄心',
        baseValue: 5,
        size: 1,
        keywords: ['mighty'],
        rarity: 'white',
        description: '伟力：打出时，将本牌点数翻倍',
        color: '#FF6B6B',
        accentColor: '#FF4444',
        iconType: 'sword'
    },

    // ===== 无体系通用卡 =====
    vine_climb: {
        id: 'vine_climb',
        name: '爬藤',
        baseValue: 10,
        size: 1,
        keywords: ['spread'],
        rarity: 'white',
        description: '蔓延：将一张点数为0的【扩散】加入你的手牌',
        color: '#2ECC71',
        accentColor: '#27AE60',
        iconType: 'magic'
    },
    ponder: {
        id: 'ponder',
        name: '思考',
        baseValue: 8,
        size: 1,
        keywords: ['chain'],
        rarity: 'white',
        description: '连携：打出时，抽一张牌',
        color: '#3498DB',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    prepare_battle: {
        id: 'prepare_battle',
        name: '备战',
        baseValue: 10,
        size: 1,
        keywords: ['retain'],
        rarity: 'white',
        description: '保留：回合结束时，本牌保留在手牌中不返回牌组',
        color: '#E74C3C',
        accentColor: '#C0392B',
        iconType: 'shield'
    },
    hold_position: {
        id: 'hold_position',
        name: '坚守',
        baseValue: 10,
        size: 1,
        keywords: ['remain'],
        rarity: 'white',
        description: '留场：回合结束时本牌不移入弃牌堆，继续留在倍率格上',
        color: '#3498DB',
        accentColor: '#2980B9',
        iconType: 'shield'
    },
    brute_force: {
        id: 'brute_force',
        name: '蛮力',
        baseValue: 15,
        size: 1,
        keywords: [],
        rarity: 'white',
        description: '纯粹的蛮力打击',
        color: '#8B0000',
        accentColor: '#FF4444',
        iconType: 'sword'
    },
    common_goal: {
        id: 'common_goal',
        name: '共同目标',
        baseValue: 10,
        size: 1,
        keywords: ['unison'],
        rarity: 'white',
        description: '齐心：在场上时，本牌所在倍率格每有一张其他卡牌，则本牌点数+1',
        color: '#00CED1',
        accentColor: '#00AAAA',
        iconType: 'sword'
    },
    friendly_chat: {
        id: 'friendly_chat',
        name: '友好交流',
        baseValue: 10,
        size: 1,
        keywords: ['social'],
        rarity: 'white',
        description: '合群：在场上时，本牌相邻倍率格每有一张其他卡牌，则本牌点数+1',
        color: '#F39C12',
        accentColor: '#E67E22',
        iconType: 'sword'
    },
    first_advantage: {
        id: 'first_advantage',
        name: '先手优势',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['first_advantage_effect'],
        rarity: 'white',
        description: '如果本牌是本回合打出的第一张牌，则本牌点数+5并获得留场',
        color: '#E74C3C',
        accentColor: '#C0392B',
        iconType: 'sword'
    },
    battle_banner: {
        id: 'battle_banner',
        name: '战旗',
        baseValue: 5,
        size: 1,
        keywords: [],
        extraEffects: ['battle_banner_effect'],
        rarity: 'white',
        description: '相邻两侧倍率格卡牌点数+5',
        color: '#E67E22',
        accentColor: '#D35400',
        iconType: 'shield'
    },
    rear_guard: {
        id: 'rear_guard',
        name: '殿后',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['rear_guard_effect'],
        rarity: 'white',
        description: '打出本牌后手牌为空时，本牌点数+10',
        color: '#3498DB',
        accentColor: '#2980B9',
        iconType: 'shield'
    },
    icing_on_cake: {
        id: 'icing_on_cake',
        name: '锦上添花',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['icing_on_cake_effect'],
        rarity: 'white',
        description: '当任意倍率格上有三张卡牌，则将本牌从牌组移到手牌',
        color: '#9B59B6',
        accentColor: '#8E44AD',
        iconType: 'magic'
    },
    easy_money: {
        id: 'easy_money',
        name: '顺手的事',
        baseValue: 8,
        size: 1,
        keywords: [],
        extraEffects: ['easy_money_effect'],
        rarity: 'white',
        description: '打出时，获得一金币',
        color: '#F1C40F',
        accentColor: '#F39C12',
        iconType: 'star'
    },
    big_brute_force: {
        id: 'big_brute_force',
        name: '大蛮力',
        baseValue: 30,
        size: 1,
        keywords: [],
        rarity: 'blue',
        description: '更强大的蛮力打击',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'sword'
    },
    clear_mind: {
        id: 'clear_mind',
        name: '理清头绪',
        baseValue: 10,
        size: 1,
        keywords: ['chain'],
        chainCount: 2,
        rarity: 'blue',
        description: '连携2：打出时，抽两张牌',
        color: '#3498DB',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    extreme_think: {
        id: 'extreme_think',
        name: '极限思考',
        baseValue: 5,
        size: 1,
        keywords: ['twin', 'chain'],
        rarity: 'blue',
        description: '双生：打出时，将一张本牌的无双生词条复制加入手牌；连携：打出时，抽一张牌',
        color: '#1ABC9C',
        accentColor: '#16A085',
        iconType: 'magic'
    },
    flexible_dispatch: {
        id: 'flexible_dispatch',
        name: '灵活调度',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['flexible_dispatch_effect'],
        rarity: 'blue',
        description: '如果触发计策，则本牌所在倍率格点数+1',
        color: '#2ECC71',
        accentColor: '#27AE60',
        iconType: 'magic'
    },
    lend_hand: {
        id: 'lend_hand',
        name: '搭把手',
        baseValue: 10,
        size: 1,
        keywords: ['twin', 'dedicate'],
        rarity: 'blue',
        description: '双生：打出时，将一张本牌的无双生词条复制加入手牌；奉献：在场上时，下一张打出在本格的卡牌获得本牌一半点数',
        color: '#1ABC9C',
        accentColor: '#16A085',
        iconType: 'shield'
    },
    messenger: {
        id: 'messenger',
        name: '传令',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['messenger_effect'],
        rarity: 'blue',
        description: '打出时，从牌组里拿一张卡牌放入手牌',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    luxury_gear: {
        id: 'luxury_gear',
        name: '豪华装备',
        baseValue: 20,
        size: 1,
        keywords: [],
        extraEffects: ['luxury_gear_effect'],
        rarity: 'gold',
        description: '若本牌已在倍率格，将相邻两侧倍率点数+1',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },
    ultimate_brute: {
        id: 'ultimate_brute',
        name: '终极蛮力',
        baseValue: 60,
        size: 1,
        keywords: [],
        rarity: 'gold',
        description: '极致的蛮力打击',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'sword'
    },
    cogito_ergo_sum: {
        id: 'cogito_ergo_sum',
        name: '我思故我在',
        baseValue: 0,
        size: 1,
        keywords: [],
        extraEffects: ['cogito_ergo_sum_effect'],
        rarity: 'gold',
        description: '若本牌已在倍率格，将本牌所在倍率格点数×2',
        color: '#9B59B6',
        accentColor: '#8E44AD',
        iconType: 'star'
    },

    // ===== 大数字体系 =====
    ugly_showoff: {
        id: 'ugly_showoff',
        name: '丑陋炫耀',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['ugly_showoff_effect'],
        rarity: 'white',
        description: '打出时，若本牌所在倍率格卡牌基础点数之和超过100，则抽一张牌',
        color: '#8E44AD',
        accentColor: '#9B59B6',
        iconType: 'magic'
    },
    no_wisdom: {
        id: 'no_wisdom',
        name: '何须智慧',
        baseValue: 30,
        size: 1,
        keywords: [],
        extraEffects: ['no_wisdom_effect'],
        rarity: 'white',
        description: '若本牌已在倍率格，则本牌所在倍率格点数-1',
        color: '#7F8C8D',
        accentColor: '#95A5A6',
        iconType: 'sword'
    },
    combined_force: {
        id: 'combined_force',
        name: '合力',
        baseValue: 30,
        size: 1,
        keywords: [],
        extraEffects: ['combined_force_effect'],
        rarity: 'white',
        description: '打出时，将手牌一张随机卡牌放回牌组',
        color: '#C0392B',
        accentColor: '#E74C3C',
        iconType: 'sword'
    },
    apprentice_forge: {
        id: 'apprentice_forge',
        name: '学徒铸造',
        baseValue: 5,
        size: 1,
        keywords: [],
        extraEffects: ['apprentice_forge_effect'],
        rarity: 'white',
        description: '下一张打出在本牌所在倍率格的卡牌本场战斗点数永久+5',
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
        description: '打出时，若本牌所在倍率格卡牌基础点数之和超过100，则本牌所在倍率格点数+1',
        color: '#16A085',
        accentColor: '#1ABC9C',
        iconType: 'shield'
    },
    borrow: {
        id: 'borrow',
        name: '预借',
        baseValue: 30,
        size: 1,
        keywords: [],
        extraEffects: ['borrow_effect'],
        rarity: 'white',
        description: '打出时，本牌在本次战斗点数永久-10',
        color: '#2C3E50',
        accentColor: '#34495E',
        iconType: 'shadow'
    },
    master_forge: {
        id: 'master_forge',
        name: '大师铸造',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['master_forge_effect'],
        rarity: 'blue',
        description: '下一张打出在本牌所在倍率格的卡牌本场战斗点数永久+10',
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
        description: '打出时，获得相邻两侧倍率格点数最高卡牌之和的点数',
        color: '#2980B9',
        accentColor: '#3498DB',
        iconType: 'magic'
    },
    skilled_borrow: {
        id: 'skilled_borrow',
        name: '熟练预借',
        baseValue: 40,
        size: 1,
        keywords: [],
        extraEffects: ['skilled_borrow_effect'],
        rarity: 'blue',
        description: '打出时，本牌在本次战斗点数永久-5',
        color: '#27AE60',
        accentColor: '#2ECC71',
        iconType: 'shadow'
    },
    one_man_army: {
        id: 'one_man_army',
        name: '一人成军',
        baseValue: 0,
        size: 1,
        keywords: ['retain'],
        extraEffects: ['one_man_army_effect'],
        rarity: 'gold',
        description: '保留：回合结束时，本牌保留在手牌中不返回牌组；获得当前牌组内所有卡牌点数之和的点数',
        color: '#B7950B',
        accentColor: '#F4D03F',
        iconType: 'star'
    },

    // ===== 生长体系 =====
    war_training: {
        id: 'war_training',
        name: '战时训练',
        baseValue: 8,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        rarity: 'white',
        description: '成长2：每次打出后永久+2点数',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    training_trace: {
        id: 'training_trace',
        name: '训练痕迹',
        baseValue: 0,
        size: 1,
        keywords: [],
        extraEffects: ['training_trace_effect'],
        rarity: 'white',
        description: '若本牌已在倍率格，则打出在相邻两侧倍率格卡牌的成长效果多触发一次',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'shield'
    },
    intense_training: {
        id: 'intense_training',
        name: '猛训练',
        baseValue: 5,
        size: 1,
        keywords: [],
        extraEffects: ['intense_training_effect'],
        rarity: 'white',
        description: '若本牌已在倍率格，则后续打出在同倍率格卡牌的成长效果多触发一次',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'gear'
    },
    group_training: {
        id: 'group_training',
        name: '集体训练',
        baseValue: 20,
        size: 1,
        keywords: [],
        extraEffects: ['group_training_effect'],
        rarity: 'gold',
        description: '若本牌已在倍率格，则后续打出在同倍率格的卡牌获得成长2',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },
    training_partner: {
        id: 'training_partner',
        name: '训练搭子',
        baseValue: 5,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        extraEffects: ['training_partner_effect'],
        rarity: 'white',
        description: '成长2：每次打出后永久+2点数；当打出一张带有成长词条的卡牌时，将本牌从牌组里打出到相同倍率格',
        color: '#A0522D',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    training_set: {
        id: 'training_set',
        name: '训练集合',
        baseValue: 0,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        extraEffects: ['training_set_effect'],
        rarity: 'white',
        description: '成长2：每次打出后永久+2点数；打出时，将牌组内所有同名牌打出在本牌所在倍率格',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'magic'
    },
    support_training: {
        id: 'support_training',
        name: '辅助训练',
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['support_training_effect'],
        rarity: 'white',
        description: '若本牌已在倍率格，则下一张打出在本牌所在倍率格上卡牌获得成长1',
        color: '#E67E22',
        accentColor: '#D35400',
        iconType: 'shield'
    },
    training_30h: {
        id: 'training_30h',
        name: '30小时训练',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        extraEffects: ['training_30h_effect'],
        rarity: 'blue',
        description: '成长：每次打出后永久+1点数；打出时，本牌成长数+1',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'gear'
    },
    steroid_training: {
        id: 'steroid_training',
        name: '激素训练',
        baseValue: 0,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        extraEffects: ['steroid_training_effect'],
        rarity: 'blue',
        description: '成长2：每次打出后永久+2点数；打出时，本牌每有10点数就给所在倍率格点数+1',
        color: '#C0392B',
        accentColor: '#E74C3C',
        iconType: 'gear'
    },
    regular_training: {
        id: 'regular_training',
        name: '规律训练',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        extraEffects: ['regular_training_effect'],
        rarity: 'blue',
        description: '成长：每次打出后永久+1点数；打出时，从牌组里拿一张带有成长词条的卡牌放入手牌',
        color: '#27AE60',
        accentColor: '#2ECC71',
        iconType: 'magic'
    },
    training_result: {
        id: 'training_result',
        name: '训练成果',
        baseValue: 0,
        size: 1,
        keywords: ['grow'],
        extraEffects: ['training_result_effect'],
        rarity: 'gold',
        description: '成长：每次打出后永久+1点数；本局游戏每打出过一次带有成长词条的卡牌，本牌点数+2',
        color: '#B7950B',
        accentColor: '#F4D03F',
        iconType: 'star'
    },

    // ===== 衍生牌 =====
    diffusion: {
        id: 'diffusion',
        name: '扩散',
        baseValue: 0,
        size: 1,
        keywords: [],
        rarity: 'white',
        description: '点数为0的扩散牌',
        color: '#888888',
        accentColor: '#aaaaaa',
        iconType: 'shadow'
    },
    cheat_card: {
        id: 'cheat_card',
        name: '作弊卡',
        baseValue: 50,
        size: 1,
        keywords: [],
        rarity: 'gold',
        description: '一张强力的临时卡牌',
        color: '#FFD700',
        accentColor: '#FFA500',
        iconType: 'magic'
    }
};

// 战后三选一牌的卡池
export const CARD_REWARD_POOL = [
    'vine_climb', 'ponder', 'prepare_battle', 'hold_position', 'brute_force',
    'common_goal', 'friendly_chat', 'first_advantage', 'battle_banner', 'rear_guard',
    'icing_on_cake', 'easy_money', 'big_brute_force', 'clear_mind', 'extreme_think',
    'flexible_dispatch', 'lend_hand', 'messenger', 'luxury_gear', 'ultimate_brute',
    'cogito_ergo_sum', 'war_training', 'training_trace', 'intense_training', 'group_training',
    'ugly_showoff', 'no_wisdom', 'combined_force', 'apprentice_forge', 'body_wisdom',
    'borrow', 'master_forge', 'perfect_borrow', 'skilled_borrow', 'one_man_army',
    'training_partner', 'training_set', 'support_training', 'training_30h',
    'steroid_training', 'regular_training', 'training_result'
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
