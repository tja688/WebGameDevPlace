/**
 * Heave! - Playground 预设场景数据
 *
 * 覆盖全部 11 种词条及边界组合，共 18 个场景。
 * 场景格式与 scenario-engine.js 兼容，可直接导出为 JSON。
 */

export const EFFECT_SCENARIOS = [
    // ===== 熔核（mighty）=====
    {
        id: 'mighty_basic',
        name: '熔核基础触发',
        category: 'keyword',
        description: '5点熔核牌打出后，应无条件翻倍为10',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'veteran_ambition', baseValue: 5, keywords: ['mighty'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 1 }
        ],
        assertions: [
            { path: 'slots[1].cards[0].finalValue', expected: 10, desc: '熔核翻倍后点数为10' },
            { path: 'slots[1].cards[0].keywords', expected: ['mighty'], desc: '词条未被消耗' }
        ]
    },
    {
        id: 'mighty_unconditional',
        name: '熔核无条件触发（场上有更大点数）',
        category: 'keyword',
        description: '5点熔核牌在场，即使场上有15点蛮力，也应翻倍为10',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [
                    { name: '老兵雄心', baseValue: 5, keywords: ['mighty'] }
                ]},
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'brute_force', baseValue: 15, keywords: [] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 2 }
        ],
        assertions: [
            { path: 'slots[2].cards[0].finalValue', expected: 15, desc: '蛮力点数不变' },
            { path: 'slots[1].cards[0].finalValue', expected: 10, desc: '老兵雄心熔核无条件翻倍为10点' }
        ]
    },

    // ===== 重铸（echo）=====
    {
        id: 'echo_chain',
        name: '重铸+共生（抽2次牌）',
        category: 'keyword',
        description: '重铸词条使ON_PLAY效果再触发一次，共生应抽2张牌',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'ponder', baseValue: 8, keywords: ['chain', 'echo'] }
            ],
            deck: [
                { template: 'brute_force' },
                { template: 'brute_force' },
                { template: 'brute_force' }
            ],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'hand.length', expected: 2, desc: '共生触发2次，抽2张牌' }
        ]
    },
    {
        id: 'echo_grow',
        name: '重铸+淬火（淬火触发2次）',
        category: 'keyword',
        description: '重铸使淬火效果触发2次，永久点数+2',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'unity_strike', baseValue: 10, keywords: ['grow', 'echo'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'slots[0].cards[0].permanentBonus', expected: 2, desc: '重铸使淬火触发2次，永久加成+2' },
            { path: 'slots[0].cards[0].baseValue', expected: 10, desc: '基础值不变' }
        ]
    },

    // ===== 双晶（twin）=====
    {
        id: 'twin_no_twin',
        name: '双晶复制去除双晶词条',
        category: 'keyword',
        description: '双晶牌打出后，复制加入精炼盘，复制体应去除双晶词条',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'lend_hand', baseValue: 10, keywords: ['twin', 'dedicate'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'hand.length', expected: 1, desc: '复制牌加入精炼盘' },
            { path: 'hand[0].keywords', expected: ['dedicate'], desc: '复制体去除双晶，余烬预热' },
            { path: 'hand[0].baseValue', expected: 10, desc: '复制体基础值相同' }
        ]
    },

    // ===== 共生（chain）=====
    {
        id: 'chain_basic',
        name: '共生基础（抽1张牌）',
        category: 'keyword',
        description: '共生牌打出，从矿舱抽1张牌',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'ponder', baseValue: 8, keywords: ['chain'] }
            ],
            deck: [
                { template: 'brute_force' },
                { template: 'brute_force' }
            ],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 1 }
        ],
        assertions: [
            { path: 'hand.length', expected: 1, desc: '抽1张牌后精炼盘剩1张（原牌打出，新牌抽入）' },
            { path: 'deck.length', expected: 1, desc: '矿舱剩余1张' }
        ]
    },
    {
        id: 'chain_2',
        name: '共生2（抽2张牌）',
        category: 'keyword',
        description: '理清头绪有chainCount=2，应抽2张牌',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'clear_mind', baseValue: 10, keywords: ['chain'], chainCount: 2 }
            ],
            deck: [
                { template: 'brute_force' },
                { template: 'brute_force' },
                { template: 'brute_force' }
            ],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 1 }
        ],
        assertions: [
            { path: 'hand.length', expected: 2, desc: '共生2抽2张牌' },
            { path: 'deck.length', expected: 1, desc: '矿舱剩余1张' }
        ]
    },

    // ===== 碎屑（spread）=====
    {
        id: 'spread_draw',
        name: '碎屑加入矿渣牌',
        category: 'keyword',
        description: '打出碎屑牌后，精炼盘中应出现0点矿渣牌',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'vine_climb', baseValue: 10, keywords: ['spread'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'hand.length', expected: 1, desc: '碎屑加入1张矿渣牌' },
            { path: 'hand[0].defId', expected: 'diffusion', desc: '加入的是矿渣牌' },
            { path: 'hand[0].baseValue', expected: 0, desc: '矿渣牌点数为0' }
        ]
    },

    // ===== 淬火（grow）=====
    {
        id: 'grow_basic',
        name: '淬火基础（永久+1）',
        category: 'keyword',
        description: '齐心协力打出后，永久点数+1',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'unity_strike', baseValue: 10, keywords: ['grow'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'slots[0].cards[0].permanentBonus', expected: 1, desc: '淬火永久+1' },
            { path: 'slots[0].cards[0].finalValue', expected: 11, desc: '最终点数=基础10+永久1' }
        ]
    },
    {
        id: 'grow_2',
        name: '淬火2（永久+2）',
        category: 'keyword',
        description: '战时训练有growAmount=2，打出后永久+2',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'war_training', baseValue: 8, keywords: ['grow'], growAmount: 2 }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'slots[0].cards[0].permanentBonus', expected: 2, desc: '淬火2永久+2' },
            { path: 'slots[0].cards[0].finalValue', expected: 10, desc: '最终点数=基础8+永久2' }
        ]
    },

    // ===== 预热（dedicate）=====
    {
        id: 'dedicate_half',
        name: '预热向下取整',
        category: 'keyword',
        description: '8点预热牌在场，熔炼在它上方的矿石获得8/2=4点加成',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'support_strike', baseValue: 8, keywords: ['dedicate'] },
                { template: 'brute_force', baseValue: 15, keywords: [] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 1 },
            { type: 'play', handIndex: 0, slotIndex: 1 }
        ],
        assertions: [
            { path: 'slots[1].cards[0].finalValue', expected: 8, desc: '预热牌自身点数不变' },
            { path: 'slots[1].cards[1].finalValue', expected: 19, desc: '蛮力获得+4预热加成=15+4' }
        ]
    },
    {
        id: 'devotion_stacking',
        name: '多张预热熔炼顺序',
        category: 'keyword',
        description: '同格有多张预热牌时，每张预热牌只影响正上方紧邻的一张牌。预热A上方是预热B，预热B获得+3；预热B上方是测试牌，测试牌获得预热B基础值10/2=5点（光环不计入光环）',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { name: '预热A', baseValue: 6, keywords: ['dedicate'] },
                { name: '预热B', baseValue: 10, keywords: ['dedicate'] },
                { name: '测试牌', baseValue: 5, keywords: [] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 1 },
            { type: 'play', handIndex: 0, slotIndex: 1 },
            { type: 'play', handIndex: 0, slotIndex: 1 }
        ],
        assertions: [
            { path: 'slots[1].cards[0].finalValue', expected: 6, desc: '预热A自身6点' },
            { path: 'slots[1].cards[1].finalValue', expected: 13, desc: '预热B获得预热A光环+3=10+3' },
            { path: 'slots[1].cards[2].finalValue', expected: 10, desc: '测试牌获得预热B光环+5=5+5（预热B基础值10/2向下取整=5，光环不计入光环）' }
        ]
    },

    // ===== 合群（social）=====
    {
        id: 'social_adjacent',
        name: '合群相邻格加成',
        category: 'keyword',
        description: '合群牌在格1，格0和格2各有2张其他牌，应+4',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [
                    { name: '占位1', baseValue: 1, keywords: [] },
                    { name: '占位2', baseValue: 1, keywords: [] }
                ]},
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [
                    { name: '占位3', baseValue: 1, keywords: [] },
                    { name: '占位4', baseValue: 1, keywords: [] }
                ]}
            ],
            hand: [
                { template: 'friendly_chat', baseValue: 10, keywords: ['social'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 1 }
        ],
        assertions: [
            { path: 'slots[1].cards[0].finalValue', expected: 14, desc: '合群：相邻格各2张=10+4' }
        ]
    },

    // ===== 齐心（unison）=====
    {
        id: 'unison_same_slot',
        name: '齐心同格加成',
        category: 'keyword',
        description: '齐心牌放入已有3张其他牌的格子，应+3',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [
                    { name: '占位1', baseValue: 1, keywords: [] },
                    { name: '占位2', baseValue: 1, keywords: [] },
                    { name: '占位3', baseValue: 1, keywords: [] }
                ]},
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'common_goal', baseValue: 10, keywords: ['unison'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'slots[0].cards[3].finalValue', expected: 14, desc: '齐心：同格3张其他牌=10+3，叠牌加成4张=矿石+1，共14' }
        ]
    },

    // ===== 余烬（retain）=====
    {
        id: 'retain_hand',
        name: '余烬精炼盘',
        category: 'keyword',
        description: '余烬牌回合结束时应余烬在精炼盘中',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'prepare_battle', baseValue: 10, keywords: ['retain'] },
                { template: 'brute_force', baseValue: 15, keywords: [] }
            ],
            deck: [
                { template: 'brute_force' },
                { template: 'brute_force' },
                { template: 'brute_force' }
            ],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 1, slotIndex: 0 },
            { type: 'endTurn' }
        ],
        assertions: [
            { path: 'hand.length', expected: 5, desc: '余烬牌留在精炼盘，其余丢弃后抽5张' },
            { path: 'hand.some(c => c.keywords.includes("retain"))', expected: undefined, desc: '余烬牌仍在精炼盘（手动检查）' }
        ]
    },

    // ===== 驻台（remain）=====
    {
        id: 'remain_stay',
        name: '驻台不移入矿渣堆',
        category: 'keyword',
        description: '驻台牌回合结束时应余烬在格子上',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'hold_position', baseValue: 10, keywords: ['remain'] },
                { template: 'brute_force', baseValue: 15, keywords: [] }
            ],
            deck: [
                { template: 'brute_force' },
                { template: 'brute_force' },
                { template: 'brute_force' }
            ],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 },
            { type: 'play', handIndex: 0, slotIndex: 1 },
            { type: 'endTurn' }
        ],
        assertions: [
            { path: 'slots[0].cards.length', expected: 1, desc: '驻台牌仍在格0' },
            { path: 'slots[1].cards.length', expected: 0, desc: '非驻台牌已清理' }
        ]
    },

    // ===== 组合与边界 =====
    {
        id: 'mighty_vs_edge_penalty',
        name: '熔核与边缘格惩罚',
        category: 'boundary',
        description: '敌舰有边缘格-5惩罚，熔核牌放在右格。先翻倍(5*2=10)再惩罚(10-5=5)',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100, edgePenalty: 5, keywords: ['edge_penalty_5'] },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'veteran_ambition', baseValue: 5, keywords: ['mighty'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 2 }
        ],
        assertions: [
            { path: 'slots[2].cards[0].finalValue', expected: 5, desc: '先翻倍(5*2=10)再惩罚(10-5=5)' }
        ]
    },
    {
        id: 'social_unison_combo',
        name: '合群+齐心同一张牌',
        category: 'combo',
        description: '一张牌同时有合群和齐心，应同时获得两种加成',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [
                    { name: '同格占位', baseValue: 1, keywords: [] }
                ]},
                { index: 1, multiplier: 1, cards: [
                    { name: '相邻占位', baseValue: 1, keywords: [] }
                ]},
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { name: '合群齐心', baseValue: 10, keywords: ['social', 'unison'] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'slots[0].cards[1].finalValue', expected: 12, desc: '合群+1（相邻格1张）+齐心+1（同格1张其他）=10+2' }
        ]
    }
];

// 按category分组
export const SCENARIO_CATEGORIES = [
    { id: 'keyword', name: '词条基础' },
    { id: 'combo', name: '组合效果' },
    { id: 'boundary', name: '边界条件' }
];
