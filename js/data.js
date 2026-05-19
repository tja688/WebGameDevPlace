/**
 * 卡牌地下城 - 数据定义
 */

// ========== 关键词定义 ==========
const KEYWORDS = {
    agile: { name: '灵动', desc: '该卡牌放上倍率牌桌后不锁定，计算完数值后进入弃牌堆', color: '#4ECDC4' },
    stack: { name: '堆叠', desc: '该卡牌放上倍率牌桌后，可以继续将带有堆叠词条的卡牌打在该位置，或者再打一张没有堆叠词条的卡牌', color: '#FFD93D' },
    mighty: { name: '伟力', desc: '如果场上没有比该牌点数大的牌，触发效果', color: '#FF6B6B' },
    devour: { name: '吞噬', desc: '将左右两侧卡牌的数值加在该卡牌数值上后，将两侧卡牌移入弃牌堆', color: '#9B59B6' },
    exit: { name: '离场', desc: '当该卡牌离开倍率牌桌时，触发效果', color: '#E67E22' },
    remain: { name: '留场', desc: '在新的回合开始后，该卡牌不会离开倍率牌桌', color: '#3498DB' },
    field: { name: '驻场', desc: '当该卡牌已经在倍率牌桌上后，触发效果（持续光环）', color: '#1ABC9C' },
    unity: { name: '团结', desc: '当同名卡牌已经在倍率牌桌上后，触发效果', color: '#F39C12' },
    response: { name: '响应', desc: '当倍率牌桌数值已达到X，触发效果', color: '#E74C3C' },
    grow: { name: '生长', desc: '每次打出后数值永久加一', color: '#2ECC71' },
    echo: { name: '回响', desc: '本牌的其他词条效果触发时，再结算一次。回响不会触发自身', color: '#9B59B6' },
    dedicate: { name: '奉献', desc: '若左侧相邻格有牌，将自身点数一半（向下取整）加至该牌上。自身点数保留', color: '#E67E22' },
    levy: { name: '征收', desc: '从牌组中随机选择一张【堆叠】牌，将其打出到本牌所在格子', color: '#3498DB' },
    stackjoy: { name: '叠叠乐', desc: '当本牌所在格子叠放超过3张牌时，触发卡面所述效果', color: '#F39C12' },
    reinforce: { name: '救兵', desc: '结束回合时，若牌桌有空位，将本牌打出到空位上', color: '#6BCB77' },
    reuse: { name: '复用', desc: '该卡牌离开倍率牌桌后回到牌组', color: '#00CED1' }
};

// ========== 卡牌定义 ==========
const CARD_DEFS = {
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
    // 新增测试卡牌
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

// ========== 怪物颜色主题 ==========
const MONSTER_COLOR_THEMES = {
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
    }
};

// ========== 怪物定义 ==========
const MONSTER_DEFS = {
    // 普通怪 - 第一层 50-160 HP
    lone_rat: {
        id: 'lone_rat',
        name: '离群硕鼠',
        hp: 65,
        description: '大一点落单耗子',
        keywords: ['virus_source'],
        keywordDesc: '病毒之源：当扣除敌方生命后，下一次多扣除一次生命',
        theme: 'normal',
        type: 'normal'
    },
    rotten_rat: {
        id: 'rotten_rat',
        name: '腐化田鼠',
        hp: 70,
        description: '被污染农田里钻出的病鼠',
        keywords: ['virus_source'],
        keywordDesc: '病毒之源：当扣除敌方生命后，下一次多扣除一次生命',
        theme: 'normal',
        type: 'normal'
    },
    gluttony_swarm: {
        id: 'gluttony_swarm',
        name: '暴食鼠群',
        hp: 75,
        description: '成群结队觅食的硕鼠',
        keywords: ['virus_source'],
        keywordDesc: '病毒之源：当扣除敌方生命后，下一次多扣除一次生命',
        theme: 'normal',
        type: 'normal'
    },
    cave_bat: {
        id: 'cave_bat',
        name: '洞穴蝙蝠',
        hp: 55,
        description: '在地下城深处栖息的蝙蝠',
        keywords: [],
        keywordDesc: '',
        theme: 'normal',
        type: 'normal'
    },
    mud_slime: {
        id: 'mud_slime',
        name: '泥浆软泥怪',
        hp: 80,
        description: '被污染的泥浆凝聚而成的怪物',
        keywords: [],
        keywordDesc: '',
        theme: 'normal',
        type: 'normal'
    },
    polluted_flower: {
        id: 'polluted_flower',
        name: '污染之花',
        hp: 90,
        description: '被地下城气息侵蚀的食人花',
        keywords: [],
        keywordDesc: '',
        theme: 'normal',
        type: 'normal'
    },
    stone_guard: {
        id: 'stone_guard',
        name: '巨石门卫',
        hp: 100,
        description: '被魔法唤醒的石制守卫',
        keywords: ['hard_skin'],
        keywordDesc: '硬质皮肤：放在最左和最右倍率格子上的卡牌数值减少1',
        theme: 'stone',
        type: 'normal'
    },
    // 精英怪 - 第一层 130-150 HP
    elite_guard: {
        id: 'elite_guard',
        name: '鼠王近卫',
        hp: 140,
        description: '守护鼠王的精锐战士',
        keywords: [],
        keywordDesc: '',
        theme: 'elite',
        type: 'elite'
    },
    // BOSS - 第一层 200-250 HP
    rat_king: {
        id: 'rat_king',
        name: '鼠疫之王',
        hp: 200,
        description: '地下城鼠群的统治者',
        keywords: [],
        keywordDesc: '',
        theme: 'boss',
        type: 'boss'
    },
    // 训练靶子 - 测试用
    training_dummy: {
        id: 'training_dummy',
        name: '训练靶子',
        hp: 200,
        description: '一个耐打的稻草人靶子（测试用）',
        keywords: [],
        keywordDesc: '',
        theme: 'dummy',
        type: 'normal'
    }
};

// ========== 职业定义 ==========
const CLASS_DEFS = {
    soldier: {
        id: 'soldier',
        name: '兵大哥',
        hearts: 3,
        relic: {
            name: '兵团装备',
            description: '为倍率牌桌最中间一格提供1倍率',
            effect: { type: 'slot_multiplier', slotIndex: 2, bonus: 1 }
        },
        startingDeck: [
            { defId: 'precise_strike', count: 5 },
            { defId: 'feint', count: 5 },
            { defId: 'maintain_gear', count: 2 }
        ]
    },
    mage: {
        id: 'mage',
        name: '王国法师',
        hearts: 3,
        relic: {
            name: '奥术法典',
            description: '（暂未开放）',
            effect: { type: 'none' }
        },
        startingDeck: []
    },
    villager: {
        id: 'villager',
        name: '中年村民',
        hearts: 3,
        relic: {
            name: '家传锄头',
            description: '（暂未开放）',
            effect: { type: 'none' }
        },
        startingDeck: []
    }
};

// ========== 关卡配置 ==========
const STAGE_CONFIG = {
    '1-1': { type: 'normal',  monsterPool: ['lone_rat', 'cave_bat', 'rotten_rat'],          postBattle: 'two_events',   baseSouls: 3 },
    '1-2': { type: 'normal',  monsterPool: ['rotten_rat', 'gluttony_swarm', 'mud_slime'],    postBattle: 'treasure',     baseSouls: 3 },
    '1-3': { type: 'normal',  monsterPool: ['mud_slime', 'polluted_flower', 'stone_guard'],   postBattle: 'shop_choice',  baseSouls: 3 },
    '1-4': { type: 'elite',   monsterPool: ['elite_guard'],                                   postBattle: 'three_events', baseSouls: 4 },
    '1-5': { type: 'normal',  monsterPool: ['gluttony_swarm', 'cave_bat', 'polluted_flower'], postBattle: 'two_events',   baseSouls: 3 },
    '1-6': { type: 'normal',  monsterPool: ['stone_guard', 'lone_rat', 'mud_slime'],          postBattle: 'two_events',   baseSouls: 3 },
    '1-7': { type: 'normal',  monsterPool: ['polluted_flower', 'rotten_rat', 'gluttony_swarm'], postBattle: 'shop_choice', baseSouls: 3 },
    '1-8': { type: 'boss',    monsterPool: ['rat_king'],                                      postBattle: 'act_clear',    baseSouls: 5 }
};

// ========== 事件名称池（占位） ==========
const EVENT_NAMES = [
    { name: '神秘祭坛', desc: '一座散发着微光的古老祭坛，似乎在等待某种献祭...' },
    { name: '古老石碑', desc: '刻满看不懂符文的石碑，触碰时传来微弱的震动...' },
    { name: '迷失旅人', desc: '一个衣衫褴褛的旅人坐在路边，眼神中透着疯狂...' },
    { name: '地下泉水', desc: '一汪清澈的泉水从石缝中涌出，水面倒映着奇异的光芒...' },
    { name: '暗影低语', desc: '黑暗中传来若有若无的低语，听不清在说什么...' },
    { name: '精灵赌局', desc: '一个笑嘻嘻的元素精灵摆出了三杯晃动的液体...' },
    { name: '遗忘宝库', desc: '半掩的石门后面透出金光，但门口有奇怪的符文陷阱...' },
    { name: '契约之环', desc: '地面上画着一个发光的圆环，中间漂浮着一张羊皮纸...' }
];

// ========== 遗物定义池 ==========
const RELIC_DEFS = [
    { id: 'relic_1', name: '锈迹徽章', desc: '一枚生锈的士兵徽章，似乎曾属于某位英雄。', rarity: 'white' },
    { id: 'relic_2', name: '破损护符', desc: '裂成两半的魔法护符，仍残留着一丝魔力。', rarity: 'white' },
    { id: 'relic_3', name: '鼠尾挂坠', desc: '用硕鼠尾巴编织成的奇怪饰品。', rarity: 'blue' },
    { id: 'relic_4', name: '田鼠之牙', desc: '一颗巨大的硕鼠门牙，锋利无比。', rarity: 'blue' },
    { id: 'relic_5', name: '腐蚀钱币', desc: '一枚被地下城腐蚀的古旧钱币，上面刻着不认识的文字。', rarity: 'gold' }
];

// ========== 商店商品池 ==========
const RARITY_PRICE = { white: 1, blue: 2, gold: 3 };

function createShopStock() {
    const cards = [];
    const excludedIds = ['wild_strike', 'shield_bash'];
    const cardIds = Object.keys(CARD_DEFS).filter(id => !excludedIds.includes(id));
    for (let i = 0; i < 4; i++) {
        const defId = cardIds[Math.floor(Math.random() * cardIds.length)];
        const def = CARD_DEFS[defId];
        const price = RARITY_PRICE[def.rarity] || 1;
        cards.push({ defId, price, bought: false });
    }
    return { cards };
}

function createBlacksmithStock() {
    const relics = [];
    for (let i = 0; i < 2; i++) {
        const relic = RELIC_DEFS[Math.floor(Math.random() * RELIC_DEFS.length)];
        const price = RARITY_PRICE[relic.rarity] || 1;
        relics.push({ ...relic, price, bought: false });
    }
    const enchantKeywords = Object.keys(KEYWORDS);
    const enchantKeyword = enchantKeywords[Math.floor(Math.random() * enchantKeywords.length)];
    return { relics, enchantKeyword };
}

// 战后三选一牌的卡池（只出现追加4新卡）
const CARD_REWARD_POOL = [
    'war_training', 'show_muscle', 'training_trace', 'hone_skill', 're_training',
    'thirty_hour_training', 'extra_training', 'training_hormone', 'training_program', 'proper_training',
    'muscle_never_betrays', 'surging_anger', 'clear_mind', 'recall_past', 'perfect_state'
];

function createCardRewardOptions() {
    const options = [];
    const pool = [...CARD_REWARD_POOL];
    for (let i = 0; i < 3; i++) {
        if (pool.length === 0) break;
        const idx = Math.floor(Math.random() * pool.length);
        options.push(pool.splice(idx, 1)[0]);
    }
    return options;
}

const SLOT_COUNT = 5;
const MAX_UNLOCKED_SLOTS = 3; // 初始可用格数
