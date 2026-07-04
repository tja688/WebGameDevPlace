/**
 * 审查官自定义测试 - 验证潜在问题
 */

import { executeScenario } from './js/playground/scenario-engine.js';
import './js/effects/index.js';

const scenarios = [
    // ===== 问题1：双晶复制缺失动态growAmount =====
    // 使用定义中无growAmount的模板，但实例覆盖growAmount=2
    {
        id: 'twin_growAmount_dynamic',
        name: '双晶复制应余烬实例的growAmount',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'brute_force', keywords: ['twin', 'grow'], growAmount: 2 }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'hand.length', expected: 1, desc: '复制牌加入精炼盘' },
            { path: 'hand[0].growAmount', expected: 2, desc: '复制体应余烬实例的growAmount=2' },
            { path: 'hand[0].keywords', expected: ['grow'], desc: '复制体去除双晶，余烬淬火' }
        ]
    },
    // ===== 问题2：双晶复制缺失动态chainCount =====
    // 使用定义中无chainCount的模板，但实例覆盖chainCount=2
    {
        id: 'twin_chainCount_dynamic',
        name: '双晶复制应余烬实例的chainCount',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'brute_force', keywords: ['twin', 'chain'], chainCount: 2 }
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
            // brute_force有关键词twin+chain，打出后：chain先抽2张，twin后push copy，hand=[bf,bf,copy]
            { path: 'hand.length', expected: 3, desc: 'chain抽2张 + twin复制1张 = 3张精炼盘' },
            { path: 'hand[2].defId', expected: 'brute_force', desc: '最后一张是复制牌' },
            { path: 'hand[2].chainCount', expected: 2, desc: '复制体应余烬实例的chainCount=2' }
        ]
    },
    // ===== 问题3：锻痕效果 =====
    {
        id: 'training_trace_adjacent',
        name: '锻痕：相邻格淬火多触发一次',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'training_trace', baseValue: 0, keywords: [], extraEffects: ['training_trace_effect'] },
                { name: '淬火牌', baseValue: 10, keywords: ['grow'], growAmount: 1 }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 },
            { type: 'play', handIndex: 0, slotIndex: 1 }
        ],
        assertions: [
            { path: 'slots[1].cards[0].permanentBonus', expected: 2, desc: '相邻格有锻痕，淬火应+2（多触发一次）' }
        ]
    },
    // ===== 问题4：猛训练效果 =====
    {
        id: 'intense_training_same_slot',
        name: '猛训练：同格后续淬火多触发一次',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'intense_training', baseValue: 10, keywords: [], extraEffects: ['intense_training_effect'] },
                { name: '淬火牌', baseValue: 10, keywords: ['grow'], growAmount: 1 }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 },
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'slots[0].cards[1].permanentBonus', expected: 2, desc: '同格有猛训练，淬火应+2（多触发一次）' }
        ]
    },
    // ===== 问题5：集体训练效果 =====
    {
        id: 'group_training_grant_grow2',
        name: '集体训练：同格后续矿石获得淬火2',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'group_training', baseValue: 20, keywords: [], extraEffects: ['group_training_effect'] },
                { name: '无淬火牌', baseValue: 10, keywords: [] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 },
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'slots[0].cards[1].permanentBonus', expected: 2, desc: '集体训练赋予淬火2，永久+2' }
        ]
    },
    // ===== 问题6：集体训练覆盖淬火1为淬火2 =====
    {
        id: 'group_training_override',
        name: '集体训练：有淬火1的牌应变为淬火2',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'group_training', baseValue: 20, keywords: [], extraEffects: ['group_training_effect'] },
                { name: '淬火1牌', baseValue: 10, keywords: ['grow'], growAmount: 1 }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 },
            { type: 'play', handIndex: 0, slotIndex: 0 }
        ],
        assertions: [
            { path: 'slots[0].cards[1].permanentBonus', expected: 2, desc: '集体训练覆盖为淬火2，永久+2' }
        ]
    },
    // ===== 问题7：重铸+预热不重复触发（光环效果不受重铸影响） =====
    {
        id: 'echo_dedicate_no_double',
        name: '重铸+预热：光环效果不受重铸影响',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 100, maxHp: 100 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'support_strike', baseValue: 10, keywords: ['dedicate', 'echo'] },
                { template: 'brute_force', baseValue: 5, keywords: [] }
            ],
            deck: [],
            discard: []
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 1 },
            { type: 'play', handIndex: 0, slotIndex: 1 }
        ],
        assertions: [
            { path: 'slots[1].cards[1].finalValue', expected: 10, desc: '测试牌获得预热光环+5=10，重铸不影响光环' }
        ]
    },
    // ===== 问题8：战后余烬permanentBonus =====
    {
        id: 'post_battle_keep_permanent',
        name: '战后淬火加成应跨战斗余烬',
        setup: {
            player: { hearts: 4, maxHearts: 4 },
            monster: { hp: 10, maxHp: 10 },
            slots: [
                { index: 0, multiplier: 1, cards: [] },
                { index: 1, multiplier: 1, cards: [] },
                { index: 2, multiplier: 1, cards: [] }
            ],
            hand: [
                { template: 'unity_strike', baseValue: 10, keywords: ['grow'] }
            ],
            deck: [],
            discard: [],
            runDataRef: {
                gold: 0,
                heartsLostInStage: 0,
                completedStages: [],
                deck: [],
                pendingEventPool: null,
                strategyLevels: {}
            }
        },
        actions: [
            { type: 'play', handIndex: 0, slotIndex: 0 },
            { type: 'endTurn' }
        ],
        assertions: [
            { path: 'slots[0].cards[0].permanentBonus', expected: 1, desc: '淬火永久+1' }
        ]
    }
];

console.log('=== 审查官自定义测试 ===\n');
let pass = 0;
let fail = 0;

for (const scenario of scenarios) {
    const result = executeScenario(scenario);
    if (result.passed) {
        pass++;
        console.log(`✓ ${scenario.id}: ${scenario.name}`);
    } else {
        fail++;
        console.log(`\n✗ ${scenario.id}: ${scenario.name}`);
        for (const ar of result.assertionResults) {
            if (!ar.passed) {
                console.log(`  断言失败: ${ar.desc}`);
                console.log(`    期望: ${JSON.stringify(ar.expected)}`);
                console.log(`    实际: ${JSON.stringify(ar.actual)}`);
            }
        }
        if (result.error) {
            console.log(`  错误: ${result.error}`);
        }
        console.log('');
    }
}

console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 / 总计 ${scenarios.length} ===`);
if (fail > 0) process.exit(1);
