/**
 * 卡牌地下城 - 数据定义
 */

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

const MONSTER_DEFS = {
    lone_rat: {
        id: 'lone_rat',
        name: '离群硕鼠',
        hp: 65,
        description: '大一点落单耗子',
        keywords: ['virus_source'],
        keywordDesc: '病毒之源：当扣除敌方生命后，下一次多扣除一次生命',
        color: '#555',
        eyeColor: '#e74c3c'
    }
};

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
    }
};

const SLOT_COUNT = 3;
