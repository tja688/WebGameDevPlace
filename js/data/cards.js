/**
 * 卡牌地下城 - 卡牌定义（第二版）
 *
 * 数值模型：
 * - 白卡基础 10，蓝卡基础 20，金卡基础 40
 * - 高级词条（伟力/回响）：点数 = 1/2 基础
 * - 中级词条（救兵/奉献/连携/双生）：点数 = 3/4 基础（向上取整）
 * - 低级词条（留场/蔓延/生长/保留/合群/齐心）：点数 = 基础
 * - 无词条：点数 = 3/2 基础
 */

export const CARD_DEFS = {
    // ===== 初始卡组卡牌 =====
    precise_strike: {
        id: 'precise_strike',
        name: '精确打击',
        baseValue: 5,
        size: 1,
        keywords: ['mighty'],
        rarity: 'white',
        description: '伟力：打出时，若场上无更大点数牌，本牌点数翻倍',
        color: '#8B0000',
        accentColor: '#FF4444',
        iconType: 'sword'
    },
    feint: {
        id: 'feint',
        name: '佯攻',
        baseValue: 15,
        size: 1,
        keywords: [],
        rarity: 'white',
        description: '在场上时：临近该卡牌的卡牌点数提升2',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'shadow'
    },
    maintain_gear: {
        id: 'maintain_gear',
        name: '保养装备',
        baseValue: 0,
        size: 1,
        keywords: [],
        rarity: 'white',
        description: '将该卡牌所处倍率格倍率+1（单回合）',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'gear'
    },

    // ===== 生长体系 =====
    war_training: {
        id: 'war_training',
        name: '战时训练',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        growAmount: 2,
        rarity: 'white',
        description: '生长2：每次打出后永久+2点数',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    show_muscle: {
        id: 'show_muscle',
        name: '炫耀肌肉',
        baseValue: 8,
        size: 1,
        keywords: [],
        extraEffects: ['show_muscle_effect'],
        rarity: 'white',
        description: '打出时，相邻两侧卡牌获得生长1',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    training_trace: {
        id: 'training_trace',
        name: '训练痕迹',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        growAmount: 1,
        rarity: 'white',
        description: '生长1。点数达到3时，将牌组内所有训练痕迹打出到同格',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    hone_skill: {
        id: 'hone_skill',
        name: '训练技巧',
        baseValue: 10,
        size: 1,
        keywords: ['grow'],
        growAmount: 1,
        rarity: 'white',
        description: '生长1；在场上时：相邻两侧倍率格卡牌点数+3',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'shield'
    },
    re_training: {
        id: 're_training',
        name: '再训练',
        baseValue: 15,
        size: 1,
        keywords: ['chain'],
        rarity: 'white',
        description: '连携：打出时抽一张牌；相邻两侧卡牌获得保留',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'shadow'
    },
    thirty_hour_training: {
        id: 'thirty_hour_training',
        name: '30小时训练',
        baseValue: 20,
        size: 1,
        keywords: ['unison'],
        rarity: 'blue',
        description: '齐心：同格每有一张其他卡牌+1；在场上时：同格其他卡牌的生长触发两次',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'gear'
    },
    extra_training: {
        id: 'extra_training',
        name: '持续训练',
        baseValue: 20,
        size: 1,
        keywords: ['retain'],
        rarity: 'blue',
        description: '保留：回合结束保留在手牌；相邻两侧卡牌获得留场',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'shadow'
    },
    training_hormone: {
        id: 'training_hormone',
        name: '激素训练',
        baseValue: 20,
        size: 1,
        keywords: [],
        rarity: 'blue',
        description: '在场上时：相邻两侧倍率格卡牌的生长效果触发两次',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'gear'
    },
    training_program: {
        id: 'training_program',
        name: '训练纲领',
        baseValue: 40,
        size: 1,
        keywords: [],
        extraEffects: ['training_program_effect'],
        rarity: 'gold',
        description: '打出时，起始牌组里每有一张名字带有"训练"的卡牌，本牌获得相同数值点数的生长',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },
    proper_training: {
        id: 'proper_training',
        name: '合理训练',
        baseValue: 40,
        size: 1,
        keywords: [],
        rarity: 'gold',
        description: '在场上时：本牌所在倍率格的卡牌获得生长2',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },

    // ===== 无体系通用卡 =====
    muscle_never_betrays: {
        id: 'muscle_never_betrays',
        name: '肌肉不会背叛你',
        baseValue: 8,
        size: 1,
        keywords: ['reinforce'],
        rarity: 'white',
        description: '救兵：回合结束时若本牌在牌组里，自动打出到任意倍率格',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    surging_anger: {
        id: 'surging_anger',
        name: '爱护装备',
        baseValue: 0,
        size: 1,
        keywords: [],
        rarity: 'white',
        description: '在场上时：下一张打出在本倍率格上的卡牌点数+4',
        color: '#8B0000',
        accentColor: '#FF4444',
        iconType: 'fire'
    },
    clear_mind: {
        id: 'clear_mind',
        name: '理清头绪',
        baseValue: 15,
        size: 1,
        keywords: ['chain'],
        rarity: 'blue',
        description: '连携：抽两张牌',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    recall_past: {
        id: 'recall_past',
        name: '忆往昔',
        baseValue: 20,
        size: 1,
        keywords: [],
        rarity: 'blue',
        description: '从弃牌堆拿回一张卡牌放回手牌',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    perfect_state: {
        id: 'perfect_state',
        name: '豪华装备',
        baseValue: 40,
        size: 1,
        keywords: [],
        rarity: 'gold',
        description: '在场上时：将相邻两侧倍率格点数+1',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },

    // ===== 新词条示例卡牌 =====
    wild_strike: {
        id: 'wild_strike',
        name: '狂野打击',
        baseValue: 20,
        size: 1,
        keywords: ['grow'],
        rarity: 'blue',
        description: '生长：每次打出后永久+1点数',
        color: '#6B238E',
        accentColor: '#BB88DD',
        iconType: 'sword'
    },
    social_strike: {
        id: 'social_strike',
        name: '围猎',
        baseValue: 10,
        size: 1,
        keywords: ['social'],
        rarity: 'white',
        description: '合群：相邻倍率格每有一张其他卡牌，则本牌点数+1',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    spread_seed: {
        id: 'spread_seed',
        name: '播种',
        baseValue: 10,
        size: 1,
        keywords: ['spread'],
        rarity: 'white',
        description: '蔓延：将一张点数为0的【扩散】加入你的手牌',
        color: '#2ECC71',
        accentColor: '#27AE60',
        iconType: 'magic'
    },
    twin_blade: {
        id: 'twin_blade',
        name: '双生刃',
        baseValue: 15,
        size: 1,
        keywords: ['twin'],
        rarity: 'blue',
        description: '双生：打出时将一张本牌的复制加入手牌',
        color: '#9B59B6',
        accentColor: '#8E44AD',
        iconType: 'sword'
    },
    echo_grow: {
        id: 'echo_grow',
        name: '回响生长',
        baseValue: 20,
        size: 1,
        keywords: ['grow', 'echo'],
        growAmount: 1,
        rarity: 'gold',
        description: '生长1，回响：每次打出后永久+2点数',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },
    dedicated_guard: {
        id: 'dedicated_guard',
        name: '献身守卫',
        baseValue: 8,
        size: 1,
        keywords: ['dedicate'],
        rarity: 'white',
        description: '奉献：在场上时，下一张打出在本格上的卡牌获得本牌一半的点数',
        color: '#E67E22',
        accentColor: '#D35400',
        iconType: 'shield'
    }
};

// 战后三选一牌的卡池
export const CARD_REWARD_POOL = [
    'war_training', 'show_muscle', 'training_trace', 'hone_skill', 're_training',
    'thirty_hour_training', 'extra_training', 'training_hormone', 'training_program', 'proper_training',
    'muscle_never_betrays', 'surging_anger', 'clear_mind', 'recall_past', 'perfect_state',
    'wild_strike', 'social_strike', 'spread_seed', 'twin_blade', 'echo_grow', 'dedicated_guard'
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
