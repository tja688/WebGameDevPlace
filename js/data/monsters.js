/**
 * 卡牌地下城 - 怪物定义
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
    }
};

export const MONSTER_DEFS = {
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
