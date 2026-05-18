/**
 * 卡牌地下城 - 数据定义
 */

// ========== 关键词定义 ==========
const KEYWORDS = {
    agile: { name: '灵动', desc: '该卡牌放上倍率牌桌后不锁定，计算完数值后进入弃牌堆', color: '#4ECDC4' },
    stack: { name: '堆叠', desc: '该卡牌放上倍率牌桌后，可以继续将带有堆叠词条的卡牌打在该位置，或者再打一张没有堆叠词条的卡牌', color: '#FFD93D' },
    mighty: { name: '伟力', desc: '如果场上没有比该牌点数大的牌，触发效果', color: '#FF6B6B' },
    absorb: { name: '吸收', desc: '获得两侧卡牌数值', color: '#6BCB77' },
    devour: { name: '吞噬', desc: '将左右两侧卡牌的数值加在该卡牌数值上后，将两侧卡牌移入弃牌堆', color: '#9B59B6' },
    exit: { name: '离场', desc: '当该卡牌离开倍率牌桌时，触发效果', color: '#E67E22' },
    remain: { name: '留场', desc: '在新的回合开始后，该卡牌不会离开倍率牌桌', color: '#3498DB' },
    field: { name: '驻场', desc: '当该卡牌已经在倍率牌桌上后，触发效果（持续光环）', color: '#1ABC9C' },
    unity: { name: '团结', desc: '当同名卡牌已经在倍率牌桌上后，触发效果', color: '#F39C12' },
    response: { name: '响应', desc: '当倍率牌桌数值已达到X，触发效果', color: '#E74C3C' },
    grow: { name: '生长', desc: '每次打出后数值永久加一', color: '#2ECC71' }
};

// ========== 卡牌定义 ==========
const CARD_DEFS = {
    precise_strike: {
        id: 'precise_strike',
        name: '精确打击',
        baseValue: 5,
        size: 1,
        keywords: ['mighty'],
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
        description: '堆叠，将该卡牌所处倍率格提升一倍',
        color: '#7D6608',
        accentColor: '#F4D03F',
        iconType: 'gear'
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
    }
};

// ========== 怪物定义 ==========
const MONSTER_DEFS = {
    // 普通怪 - 棕色系
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
    // 精英怪 - 紫色系
    elite_guard: {
        id: 'elite_guard',
        name: '鼠王近卫',
        hp: 100,
        description: '守护鼠王的精锐战士',
        keywords: ['virus_source'],
        keywordDesc: '病毒之源：当扣除敌方生命后，下一次多扣除一次生命',
        theme: 'elite',
        type: 'elite'
    },
    // BOSS - 红色系
    rat_king: {
        id: 'rat_king',
        name: '鼠疫之王',
        hp: 150,
        description: '地下城鼠群的统治者',
        keywords: ['virus_source'],
        keywordDesc: '病毒之源：当扣除敌方生命后，下一次多扣除一次生命',
        theme: 'boss',
        type: 'boss'
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
            effect: { type: 'slot_multiplier', slotIndex: 1, bonus: 1 }
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
    '1-1': { type: 'normal',  monsterPool: ['lone_rat', 'rotten_rat', 'gluttony_swarm'], postBattle: 'two_events',   baseSouls: 3 },
    '1-2': { type: 'normal',  monsterPool: ['lone_rat', 'rotten_rat', 'gluttony_swarm'], postBattle: 'treasure',     baseSouls: 3 },
    '1-3': { type: 'normal',  monsterPool: ['lone_rat', 'rotten_rat', 'gluttony_swarm'], postBattle: 'shop_choice',  baseSouls: 3 },
    '1-4': { type: 'elite',   monsterPool: ['elite_guard'],                               postBattle: 'three_events', baseSouls: 4 },
    '1-5': { type: 'normal',  monsterPool: ['lone_rat', 'rotten_rat', 'gluttony_swarm'], postBattle: 'two_events',   baseSouls: 3 },
    '1-6': { type: 'normal',  monsterPool: ['lone_rat', 'rotten_rat', 'gluttony_swarm'], postBattle: 'two_events',   baseSouls: 3 },
    '1-7': { type: 'normal',  monsterPool: ['lone_rat', 'rotten_rat', 'gluttony_swarm'], postBattle: 'shop_choice',  baseSouls: 3 },
    '1-8': { type: 'boss',    monsterPool: ['rat_king'],                                  postBattle: 'act_clear',    baseSouls: 5 }
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

// ========== 遗物定义池（占位） ==========
const RELIC_DEFS = [
    { id: 'relic_1', name: '锈迹徽章', desc: '一枚生锈的士兵徽章，似乎曾属于某位英雄。（效果暂未实现）' },
    { id: 'relic_2', name: '破损护符', desc: '裂成两半的魔法护符，仍残留着一丝魔力。（效果暂未实现）' },
    { id: 'relic_3', name: '鼠尾挂坠', desc: '用硕鼠尾巴编织成的奇怪饰品。（效果暂未实现）' },
    { id: 'relic_4', name: '田鼠之牙', desc: '一颗巨大的硕鼠门牙，锋利无比。（效果暂未实现）' },
    { id: 'relic_5', name: '腐蚀钱币', desc: '一枚被地下城腐蚀的古旧钱币，上面刻着不认识的文字。（效果暂未实现）' }
];

// ========== 商店商品池（占位） ==========
function createShopStock() {
    const cards = [];
    const cardIds = Object.keys(CARD_DEFS);
    for (let i = 0; i < 4; i++) {
        const defId = cardIds[Math.floor(Math.random() * cardIds.length)];
        const price = 1 + Math.floor(Math.random() * 3);
        cards.push({ defId, price, discount: Math.random() < 0.25 });
    }
    const relics = [];
    for (let i = 0; i < 2; i++) {
        const relic = RELIC_DEFS[Math.floor(Math.random() * RELIC_DEFS.length)];
        const price = 2 + Math.floor(Math.random() * 2);
        relics.push({ ...relic, price, discount: Math.random() < 0.25 });
    }
    return { cards, relics };
}

const SLOT_COUNT = 3;
