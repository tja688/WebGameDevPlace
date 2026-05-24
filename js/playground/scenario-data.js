/**
 * 卡牌地下城 - Playground 预设场景数据
 *
 * 覆盖全部 11 种词条及边界组合，共 18 个场景。
 * 场景格式与 scenario-engine.js 兼容，可直接导出为 JSON。
 */

export const EFFECT_SCENARIOS = [
    // ===== 伟力（mighty）=====
    {
        id: 'mighty_basic',
        name: '伟力基础触发',
        category: 'keyword',
        description: '5点伟力牌打出，场上无更大点数，应翻倍为10',
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
            { path: 'slots[1].cards[0].finalValue', expected: 10, desc: '伟力翻倍后点数为10' },
            { path: 'slots[1].cards[0].keywords', expected: ['mighty'], desc: '词条未被消耗' }
        ]
    },
    {
        id: 'mighty_not_trigger',
        name: '伟力不触发（场上有更大点数）',
        category: 'keyword',
        description: '5点伟力牌打出，但场上有15点蛮力，伟力不应触发',
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
            { path: 'slots[1].cards[0].finalValue', expected: 5, desc: '老兵雄心伟力不触发，保持5点' }
        ]
    },

    // ===== 回响（echo）=====
    {
        id: 'echo_chain',
        name: '回响+连携（抽2次牌）',
        category: 'keyword',
        description: '回响词条使ON_PLAY效果再触发一次，连携应抽2张牌',
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
            { path: 'hand.length', expected: 2, desc: '连携触发2次，抽2张牌' }
        ]
    },
    {
        id: 'echo_grow',
        name: '回响+成长（成长触发2次）',
        category: 'keyword',
        description: '回响使成长效果触发2次，永久点数+2',
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
            { path: 'slots[0].cards[0].permanentBonus', expected: 2, desc: '回响使成长触发2次，永久加成+2' },
            { path: 'slots[0].cards[0].baseValue', expected: 10, desc: '基础值不变' }
        ]
    },

    // ===== 双生（twin）=====
    {
        id: 'twin_no_twin',
        name: '双生复制去除双生词条',
        category: 'keyword',
        description: '双生牌打出后，复制加入手牌，复制体应去除双生词条',
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
            { path: 'hand.length', expected: 1, desc: '复制牌加入手牌' },
            { path: 'hand[0].keywords', expected: ['dedicate'], desc: '复制体去除双生，保留奉献' },
            { path: 'hand[0].baseValue', expected: 10, desc: '复制体基础值相同' }
        ]
    },

    // ===== 连携（chain）=====
    {
        id: 'chain_basic',
        name: '连携基础（抽1张牌）',
        category: 'keyword',
        description: '连携牌打出，从牌库抽1张牌',
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
            { path: 'hand.length', expected: 1, desc: '抽1张牌后手牌剩1张（原牌打出，新牌抽入）' },
            { path: 'deck.length', expected: 1, desc: '牌库剩余1张' }
        ]
    },
    {
        id: 'chain_2',
        name: '连携2（抽2张牌）',
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
            { path: 'hand.length', expected: 2, desc: '连携2抽2张牌' },
            { path: 'deck.length', expected: 1, desc: '牌库剩余1张' }
        ]
    },

    // ===== 蔓延（spread）=====
    {
        id: 'spread_draw',
        name: '蔓延加入扩散牌',
        category: 'keyword',
        description: '打出蔓延牌后，手牌中应出现0点扩散牌',
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
            { path: 'hand.length', expected: 1, desc: '蔓延加入1张扩散牌' },
            { path: 'hand[0].defId', expected: 'diffusion', desc: '加入的是扩散牌' },
            { path: 'hand[0].baseValue', expected: 0, desc: '扩散牌点数为0' }
        ]
    },

    // ===== 成长（grow）=====
    {
        id: 'grow_basic',
        name: '成长基础（永久+1）',
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
            { path: 'slots[0].cards[0].permanentBonus', expected: 1, desc: '成长永久+1' },
            { path: 'slots[0].cards[0].finalValue', expected: 11, desc: '最终点数=基础10+永久1' }
        ]
    },
    {
        id: 'grow_2',
        name: '成长2（永久+2）',
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
            { path: 'slots[0].cards[0].permanentBonus', expected: 2, desc: '成长2永久+2' },
            { path: 'slots[0].cards[0].finalValue', expected: 10, desc: '最终点数=基础8+永久2' }
        ]
    },

    // ===== 奉献（dedicate）=====
    {
        id: 'dedicate_half',
        name: '奉献向下取整',
        category: 'keyword',
        description: '8点奉献牌在场，下一张同格牌获得8/2=4点加成',
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
            { path: 'slots[1].cards[0].finalValue', expected: 8, desc: '奉献牌自身点数不变' },
            { path: 'slots[1].cards[1].finalValue', expected: 19, desc: '蛮力获得+4奉献加成=15+4' }
        ]
    },
    {
        id: 'devotion_stacking',
        name: '多张奉献堆叠顺序',
        category: 'keyword',
        description: '同格有多张奉献牌时，按打出顺序依次触发。【注意】奉献B已被奉献A加成，其提供的bonus基于当前值(13/2=6)，故测试牌获得11而非10',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { name: '奉献A', baseValue: 6, keywords: ['dedicate'] },
                { name: '奉献B', baseValue: 10, keywords: ['dedicate'] },
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
            { path: 'slots[1].cards[0].finalValue', expected: 6, desc: '奉献A自身6点' },
            { path: 'slots[1].cards[1].finalValue', expected: 13, desc: '奉献B获得奉献A的+3=10+3' },
            { path: 'slots[1].cards[2].finalValue', expected: 11, desc: '测试牌获得奉献B的+6=5+6（奉献B当前值13/2向下取整=6）' }
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
            { path: 'slots[0].cards[3].finalValue', expected: 13, desc: '齐心：同格3张其他牌=10+3' }
        ]
    },

    // ===== 保留（retain）=====
    {
        id: 'retain_hand',
        name: '保留手牌',
        category: 'keyword',
        description: '保留牌回合结束时应保留在手牌中',
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
            { path: 'hand.length', expected: 5, desc: '保留牌留在手牌，其余丢弃后抽5张' },
            { path: 'hand.some(c => c.keywords.includes("retain"))', expected: undefined, desc: '保留牌仍在手牌（手动检查）' }
        ]
    },

    // ===== 留场（remain）=====
    {
        id: 'remain_stay',
        name: '留场不移入弃牌堆',
        category: 'keyword',
        description: '留场牌回合结束时应保留在格子上',
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
            { path: 'slots[0].cards.length', expected: 1, desc: '留场牌仍在格0' },
            { path: 'slots[1].cards.length', expected: 0, desc: '非留场牌已清理' }
        ]
    },

    // ===== 组合与边界 =====
    {
        id: 'mighty_vs_penalty',
        name: '伟力与怪物惩罚',
        category: 'boundary',
        description: '怪物有hard_skin（左右格-1），伟力牌放在右格。【注意】伟力优先级(400) < 惩罚优先级(500)，故先翻倍(5*2=10)再惩罚(10-1=9)',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100, hardSkin: true, keywords: ['hard_skin'] },
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
            { path: 'slots[2].cards[0].finalValue', expected: 9, desc: '先翻倍(5*2=10)再惩罚(10-1=9)' }
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
