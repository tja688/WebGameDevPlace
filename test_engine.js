import fs from 'fs';
import { createInitialState, startBattle } from './js/core/state.js';
import { drawCards, endTurn } from './js/systems/battle.js';
import { playCardToSlot, calculateTotalBoardDamage, buildCardSlotMap, getCardEffectiveValue, getCardFinalValue, canPlaceCard, getSlotEffectiveMultiplier } from './js/systems/board.js';
import { createCardInstance } from './js/data/index.js';

// 必须导入以触发效果注册
import './js/effects/index.js';

let pass = 0;
let fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log('✓', msg); }
    else { fail++; console.error('✗', msg); }
}

console.log('=== 引擎单元测试 ===\n');

function makeTestState(handDefIds) {
    const st = createInitialState();
    st.hand = [];
    st.deck = [];
    for (const id of handDefIds) {
        st.hand.push(createCardInstance(id));
    }
    return st;
}

// Test 1: 初始状态
const s = createInitialState();
drawCards(s, 4);
assert(s.player.hearts === 3, '初始生命为3');
assert(s.slots[2].multiplier === 2, '中间格(索引2)初始倍率为2X（遗物加成）');
assert(s.slots[1].multiplier === 1, '左中格倍率为1X');
assert(s.slots[3].multiplier === 1, '右中格倍率为1X');
assert(!s.slots[0].available, '最左格未解锁');
assert(!s.slots[4].available, '最右格未解锁');
assert(s.hand.length === 4, '初始手牌4张');

// Test 2: 精确打击在2X格（伟力触发）
const s2 = makeTestState(['precise_strike']);
playCardToSlot(s2.hand[0], 2, s2);
let dmg = calculateTotalBoardDamage(s2);
assert(dmg === 16, `精确打击(4)伟力翻倍(8)在2X格应为16，实际${dmg}`);

// Test 3: 佯攻给临近+2
const s3 = makeTestState(['precise_strike', 'feint']);
const s3strike = s3.hand[0];
const s3feint = s3.hand[1];
playCardToSlot(s3strike, 2, s3);
playCardToSlot(s3feint, 1, s3);
const strikeOnBoard = s3.slots[2].cards[0];
const effVal = getCardEffectiveValue(strikeOnBoard, s3);
assert(effVal === 6, `佯攻光环后精确打击应为6，实际${effVal}`);

// Test 4: 伟力不触发（场上有更大点数）
const s4 = makeTestState(['precise_strike', 'precise_strike', 'feint']);
const s4strike1 = s4.hand[0];
const s4strike2 = s4.hand[1];
const s4feint = s4.hand[2];
playCardToSlot(s4strike1, 2, s4);
playCardToSlot(s4strike2, 3, s4);
const fv4a = getCardFinalValue(s4.slots[3].cards[0], s4);
assert(fv4a === 8, `空场精确打击2伟力应翻倍为8，实际${fv4a}`);
playCardToSlot(s4feint, 1, s4);
const fv4b = getCardFinalValue(s4.slots[2].cards[0], s4);
assert(fv4b === 12, `佯攻光环后精确打击1应为6*2=12，实际${fv4b}`);
const fv4c = getCardFinalValue(s4.slots[3].cards[0], s4);
assert(fv4c === 4, `精确打击2旁边无佯攻，且场上有12点牌，伟力不应触发，实际${fv4c}`);

// Test 5: 保养装备提升倍率 + 精确打击吃倍率
const s5 = makeTestState(['maintain_gear', 'feint']);
const s5gear = s5.hand[0];
const s5feint = s5.hand[1];
playCardToSlot(s5gear, 3, s5);
assert(s5.slots[3].roundMultiplierBonus === 1, '保养装备提升roundMultiplierBonus+1');
playCardToSlot(s5feint, 3, s5);
const dmg5 = calculateTotalBoardDamage(s5);
assert(dmg5 === 8, `佯攻(4)在2X格(保养后)应为8，实际${dmg5}`);

// Test 6: 堆叠规则 - 普通牌封口后不能再堆叠
const s6 = makeTestState(['maintain_gear', 'precise_strike', 'maintain_gear']);
const s6gear1 = s6.hand[0];
const s6strike = s6.hand[1];
const s6gear2 = s6.hand[2];
playCardToSlot(s6gear1, 1, s6);
playCardToSlot(s6strike, 1, s6);
const ok6 = canPlaceCard(s6gear2, s6.slots[1], s6);
assert(!ok6.ok, '普通牌封口后不能再堆叠');

// Test 7: 病毒之源惩罚（第1回合起即扣心）
const s7 = makeTestState([]);
endTurn(s7);
assert(s7.player.hearts === 2, '第一回合结束扣1心，剩余2颗');
endTurn(s7);
assert(s7.player.hearts === 0, '第二回合结束扣2心（1基础+1病毒），总计3心扣完');
assert(s7.phase === 'ended', '玩家死亡');
assert(s7.result === 'lose', '战斗失败');

// Test 8: 击杀胜利
const s8 = makeTestState(['precise_strike']);
s8.monster.hp = 10;
playCardToSlot(s8.hand[0], 2, s8);
endTurn(s8);
assert(s8.phase === 'ended', '击杀后战斗结束');
assert(s8.result === 'win', '战斗胜利');

// Test 9: 保养装备数值为0
const s9 = makeTestState(['maintain_gear']);
playCardToSlot(s9.hand[0], 2, s9);
const dmg9 = calculateTotalBoardDamage(s9);
assert(dmg9 === 0, `保养装备基础0点，在2X格应为0伤害，实际${dmg9}`);
assert(getSlotEffectiveMultiplier(s9.slots[2], s9) === 3, '保养装备提升中间格有效倍率到3X');

// Test 10: 一场战斗不洗牌
const s10 = createInitialState();
drawCards(s10, 4);
assert(s10.deck.length === 8, '初始抽4张后牌库剩8张');
for (let i = 0; i < 3 && s10.hand.length > 0; i++) {
    const emptySlot = s10.slots.find(slt => slt.available && slt.cards.length === 0);
    if (emptySlot) playCardToSlot(s10.hand[0], emptySlot.index, s10);
}
assert(s10.deck.length === 8, '打出3张到格子后牌库仍为8张');
assert(s10.hand.length === 1, '手牌剩余1张');
endTurn(s10);
assert(s10.deck.length === 4, '回合结束后抽4张补到5张，牌库剩4');
assert(s10.hand.length === 5, '下回合手牌5张（保留1张+抽4张）');

// Test 11: 不可用格子不能放牌
const s11 = makeTestState(['precise_strike']);
const ok11a = canPlaceCard(s11.hand[0], s11.slots[0], s11);
assert(!ok11a.ok, '未解锁格子不能放牌');
const ok11b = canPlaceCard(s11.hand[0], s11.slots[2], s11);
assert(ok11b.ok, '可用格子可以放牌');

// Test 12: 巨石门卫硬质皮肤
const s12 = makeTestState(['feint']);
s12.monster.keywords.push('hard_skin');
s12.monster.keywordDesc = '硬质皮肤：最左最右格-1';
playCardToSlot(s12.hand[0], 1, s12);
const dmg12a = calculateTotalBoardDamage(s12);
assert(dmg12a === 3, `佯攻(4)在最左可用格受硬质皮肤(4-1=3)*1=3，实际${dmg12a}`);

const s12b = makeTestState(['feint']);
s12b.monster.keywords.push('hard_skin');
playCardToSlot(s12b.hand[0], 3, s12b);
const dmg12b = calculateTotalBoardDamage(s12b);
assert(dmg12b === 3, `佯攻(4)在最右可用格受硬质皮肤(4-1=3)*1=3，实际${dmg12b}`);

const s12c = makeTestState(['precise_strike']);
s12c.monster.keywords.push('hard_skin');
playCardToSlot(s12c.hand[0], 1, s12c);
const dmg12c = calculateTotalBoardDamage(s12c);
assert(dmg12c === 7, `精确打击(4)伟力翻倍8再-1=7*1=7，实际${dmg12c}`);

const s12d = makeTestState(['precise_strike']);
s12d.monster.keywords.push('hard_skin');
playCardToSlot(s12d.hand[0], 2, s12d);
const dmg12d = calculateTotalBoardDamage(s12d);
assert(dmg12d === 16, `精确打击(4)在中间格不受硬质皮肤影响，伟力翻倍8*2=16，实际${dmg12d}`);

console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`);
if (fail > 0) process.exit(1);
