/**
 * 卡牌地下城 - 卡牌定义
 * 
 * 扩展字段说明：
 * - extraEffects: string[] - 卡牌专属效果ID列表（除关键词效果外）
 * - growAmount: number - 生长时每次增加的点数（默认1）
 */

export const CARD_DEFS = {
    precise_strike: {
        id: 'precise_strike',
        name: '精确打击',
        baseValue: 5,
        size: 1,
        keywords: ['mighty'],
        rarity: 'white',
        description: '伟力：若场上无更大点数牌，该卡牌点数翻倍',
        color: '#8B0000',
        accentColor: '#FF4444',
        iconType: 'sword'
    },
    feint: {
        id: 'feint',
        name: '佯攻',
        baseValue: 3,
        size: 1,
        keywords: ['field'],
        rarity: 'white',
        description: '驻场：临近该卡牌的卡牌点数提升2',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'shadow'
    },
    maintain_gear: {
        id: 'maintain_gear',
        name: '保养装备',
        baseValue: 0,
        size: 1,
        keywords: ['stack'],
        rarity: 'white',
        description: '堆叠；将该卡牌所处倍率格倍率+1',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'gear'
    },
    wild_strike: {
        id: 'wild_strike',
        name: '狂野打击',
        baseValue: 4,
        size: 1,
        keywords: ['grow'],
        rarity: 'blue',
        description: '生长：每次打出后永久+1点数',
        color: '#6B238E',
        accentColor: '#BB88DD',
        iconType: 'sword'
    },
    // ========== 生长体系 ==========
    war_training: {
        id: 'war_training',
        name: '战时训练',
        baseValue: 2,
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
        baseValue: 4,
        size: 1,
        keywords: ['mighty'],
        rarity: 'white',
        description: '伟力：若场上无更大点数牌，相邻卡牌永久+1',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    training_trace: {
        id: 'training_trace',
        name: '训练痕迹',
        baseValue: 1,
        size: 1,
        keywords: ['stack', 'grow'],
        growAmount: 1,
        rarity: 'white',
        description: '堆叠，生长1。点数达到3时，将牌组内所有训练痕迹打出到同格',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    hone_skill: {
        id: 'hone_skill',
        name: '磨练技巧',
        baseValue: 3,
        size: 1,
        keywords: ['field'],
        rarity: 'white',
        description: '驻场：相邻生长牌点数+4',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'shield'
    },
    re_training: {
        id: 're_training',
        name: '再训练',
        baseValue: 2,
        size: 1,
        keywords: ['agile', 'exit'],
        rarity: 'white',
        description: '灵动，离场：相邻生长牌获得复用',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'shadow'
    },
    thirty_hour_training: {
        id: 'thirty_hour_training',
        name: '30小时训练',
        baseValue: 5,
        size: 1,
        keywords: ['stack', 'field'],
        rarity: 'blue',
        description: '堆叠，驻场：同一格生长效果触发两次',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'gear'
    },
    extra_training: {
        id: 'extra_training',
        name: '加练！',
        baseValue: 3,
        size: 1,
        keywords: ['agile', 'exit'],
        rarity: 'blue',
        description: '灵动，离场：相邻生长牌获得留场',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'shadow'
    },
    training_hormone: {
        id: 'training_hormone',
        name: '训练激素',
        baseValue: 5,
        size: 1,
        keywords: ['field'],
        rarity: 'blue',
        description: '驻场：相邻格生长效果触发两次',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'gear'
    },
    training_program: {
        id: 'training_program',
        name: '训练纲领',
        baseValue: 0,
        size: 1,
        keywords: ['field'],
        rarity: 'gold',
        description: '驻场：相邻生长卡牌获得等同于牌组内训练牌数量的点数',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },
    proper_training: {
        id: 'proper_training',
        name: '合理训练',
        baseValue: 0,
        size: 1,
        keywords: ['stack'],
        rarity: 'gold',
        description: '堆叠，同格卡牌打出时生长+1',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    },
    // ========== 无体系兵大哥卡 ==========
    muscle_never_betrays: {
        id: 'muscle_never_betrays',
        name: '肌肉不会背叛你',
        baseValue: 5,
        size: 1,
        keywords: ['reinforce'],
        rarity: 'white',
        description: '救兵：结束回合时若牌桌有空位，自动打出到空位',
        color: '#8B4513',
        accentColor: '#CD853F',
        iconType: 'sword'
    },
    surging_anger: {
        id: 'surging_anger',
        name: '怒意上涌',
        baseValue: 0,
        size: 1,
        keywords: ['stack', 'field'],
        rarity: 'white',
        description: '堆叠，驻场：下一张打出在同格的卡牌点数+5',
        color: '#8B0000',
        accentColor: '#FF4444',
        iconType: 'fire'
    },
    clear_mind: {
        id: 'clear_mind',
        name: '理清头绪',
        baseValue: 0,
        size: 1,
        keywords: ['agile'],
        rarity: 'blue',
        description: '灵动，抽两张牌，左侧卡牌数值-1',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    recall_past: {
        id: 'recall_past',
        name: '忆往昔',
        baseValue: 0,
        size: 1,
        keywords: ['agile'],
        rarity: 'blue',
        description: '灵动，从弃牌堆拿回一张卡牌',
        color: '#1B4F72',
        accentColor: '#5DADE2',
        iconType: 'magic'
    },
    perfect_state: {
        id: 'perfect_state',
        name: '完美境界',
        baseValue: 5,
        size: 1,
        keywords: ['stack', 'field'],
        rarity: 'gold',
        description: '堆叠，驻场：相邻倍率格倍率+1',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'star'
    }
};

// 战后三选一牌的卡池
export const CARD_REWARD_POOL = [
    'war_training', 'show_muscle', 'training_trace', 'hone_skill', 're_training',
    'thirty_hour_training', 'extra_training', 'training_hormone', 'training_program', 'proper_training',
    'muscle_never_betrays', 'surging_anger', 'clear_mind', 'recall_past', 'perfect_state'
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
