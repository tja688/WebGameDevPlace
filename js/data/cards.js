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
        baseValue: 10,
        size: 1,
        keywords: [],
        extraEffects: ['intense_training_effect'],
        rarity: 'blue',
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
    }
};

// 战后三选一牌的卡池
export const CARD_REWARD_POOL = [
    'vine_climb', 'ponder', 'prepare_battle', 'hold_position', 'brute_force',
    'common_goal', 'friendly_chat', 'big_brute_force', 'clear_mind', 'lend_hand',
    'messenger', 'luxury_gear', 'ultimate_brute', 'cogito_ergo_sum',
    'war_training', 'training_trace', 'intense_training', 'group_training'
];

export function createCardRewardOptions() {
    const options = [];
    const pool = [...CARD_REWARD_POOL];
    for (let i = 0; i < 3; i++) {
        if (pool.length === 0) break;
        const idx = Math.floor(Math.random() * pool.length);
        options.push(pool.splice(idx, 1)[0]);
    }
    return options;
}
