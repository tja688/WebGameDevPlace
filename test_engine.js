import { createInitialState, startBattle } from './js/core/state.js';
import { createGameState, createRunData } from './js/core/state.js';
import { drawCards, endTurn } from './js/systems/battle.js';
import { initBattleFromRun } from './js/systems/battle.js';
import { playCardToSlot, calculateTotalBoardDamage, buildCardSlotMap, getCardEffectiveValue, getCardFinalValue, canPlaceCard, getSlotEffectiveMultiplier, getCardBaseValue } from './js/systems/board.js';
import { createCardInstance, createBlacksmithStock, addKeywordToCard } from './js/data/index.js';
import { detectStrategy } from './js/systems/strategy.js';
import { resolveBattleEnd } from './js/systems/post-battle.js';
import { enterPlaygroundBattle } from './js/playground/index.js';
import { Input } from './js/input/index.js';
import { FX, EffectContext } from './js/effects/core.js';
import { Trigger } from './js/core/constants.js';

// 必须导入以触发效果注册
import './js/effects/index.js';

let pass = 0;
let fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log('✓', msg); }
    else { fail++; console.error('✗', msg); }
}

console.log('=== 引擎单元测试（第二版）===\n');

function makeTestState(handDefIds) {
    const st = createInitialState();
    st.hand = [];
    st.deck = [];
    for (const id of handDefIds) {
        const card = createCardInstance(id);
        if (card) st.hand.push(card);
    }
    return st;
}

function makeMonsterTestState(handDefIds, monsterPatch = {}) {
    const st = makeTestState(handDefIds);
    Object.assign(st.monster, monsterPatch);
    return st;
}

// Test 1: 初始状态
const s = createInitialState();
drawCards(s, 5);
assert(s.player.hearts === 3, '老兵初始生命为3');
assert(s.slots.length === 3, '牌桌为3格');
assert(s.slots[0].multiplier === 1, '左格倍率为1X');
assert(s.slots[1].multiplier === 1, '中格倍率为1X');
assert(s.slots[2].multiplier === 1, '右格倍率为1X');
assert(s.hand.length === 5, '初始手牌5张');

// Test 2: 老兵雄心伟力触发（5点翻倍=10，在1X格=10）
const s2 = makeTestState(['veteran_ambition']);
playCardToSlot(s2.hand[0], 1, s2);
let dmg = calculateTotalBoardDamage(s2);
assert(dmg === 10, `老兵雄心(5)伟力翻倍(10)在1X格应为10，实际${dmg}`);

// Test 3: 蛮力纯点数（15点在1X格=15）
const s3 = makeTestState(['brute_force']);
playCardToSlot(s3.hand[0], 0, s3);
dmg = calculateTotalBoardDamage(s3);
assert(dmg === 15, `蛮力(15)在1X格应为15，实际${dmg}`);

// Test 4: 伟力无条件触发（场上有更大点数也翻倍）
const s4 = makeTestState(['veteran_ambition', 'brute_force']);
const s4card1 = s4.hand[0];
const s4card2 = s4.hand[1];
playCardToSlot(s4card1, 1, s4); // 老兵雄心放中格
playCardToSlot(s4card2, 2, s4); // 蛮力放右格
const fv4a = getCardFinalValue(s4.slots[2].cards[0], s4);
assert(fv4a === 15, `蛮力(15)最终值应为15，实际${fv4a}`);
const fv4b = getCardFinalValue(s4.slots[1].cards[0], s4);
assert(fv4b === 10, `老兵雄心(5)伟力应无条件翻倍为10，实际${fv4b}`);

// Test 5: 齐心协力成长（10点打出后永久+1）
const s5 = makeTestState(['unity_strike']);
playCardToSlot(s5.hand[0], 0, s5);
assert(s5.slots[0].cards[0].permanentBonus === 1, '齐心协力成长+1');
assert(getCardBaseValue(s5.slots[0].cards[0]) === 11, '齐心协力基础值变为11');

// Test 6: 堆叠规则 - 任意牌可无限堆叠
const s6 = makeTestState(['brute_force', 'veteran_ambition', 'brute_force']);
const s6c1 = s6.hand[0]; const s6c2 = s6.hand[1]; const s6c3 = s6.hand[2];
playCardToSlot(s6c1, 0, s6);
playCardToSlot(s6c2, 0, s6);
const ok6 = canPlaceCard(s6c3, s6.slots[0], s6);
assert(ok6.ok, '第二版任意牌可无限堆叠');

// Test 7: 扣人群规则（每回合固定扣1）
const s7 = makeTestState([]);
endTurn(s7);
assert(s7.player.hearts === 2, '第一回合结束扣1人群，剩余2');
endTurn(s7);
assert(s7.player.hearts === 1, '第二回合结束扣1人群，剩余1');
endTurn(s7);
assert(s7.player.hearts === 0, '第三回合结束扣1人群，总计3人群扣完');
assert(s7.phase === 'ended', '玩家死亡');
assert(s7.result === 'lose', '战斗失败');

// Test 8: 击杀胜利
const s8 = makeTestState(['brute_force']);
s8.monster.hp = 15;
playCardToSlot(s8.hand[0], 1, s8);
endTurn(s8);
assert(s8.phase === 'ended', '击杀后战斗结束');
assert(s8.result === 'win', '战斗胜利');

// Test 9: 辅助打击奉献（8点奉献=下一张同格+4）
const s9 = makeTestState(['support_strike', 'brute_force']);
const s9c1 = s9.hand[0]; const s9c2 = s9.hand[1];
playCardToSlot(s9c1, 1, s9); // 辅助打击放中格
playCardToSlot(s9c2, 1, s9); // 蛮力放中格，应获得+4
const dmg9 = calculateTotalBoardDamage(s9);
assert(dmg9 === (8 + 19) * 1, `辅助打击(8)+蛮力(15+4=19)在1X格应为27，实际${dmg9}`);

// Test 10: 回合开始弃牌堆洗回牌库
const s10 = createInitialState();
drawCards(s10, 5);
assert(s10.deck.length === 5, '初始抽5张后牌库剩5张（老兵10张牌）');
for (let i = 0; i < 3 && s10.hand.length > 0; i++) {
    const emptySlot = s10.slots.find(slt => slt.cards.length === 0);
    if (emptySlot) playCardToSlot(s10.hand[0], emptySlot.index, s10);
}
assert(s10.deck.length === 5, '打出3张到格子后牌库仍为5张');
assert(s10.hand.length === 2, '手牌剩余2张');
endTurn(s10);
assert(s10.hand.length === 5, '下回合手牌5张（无保留则全部丢弃，洗回后抽5张）');

// Test 11: 所有格子都可以放牌
const s11 = makeTestState(['brute_force']);
const ok11a = canPlaceCard(s11.hand[0], s11.slots[0], s11);
assert(ok11a.ok, '左格可以放牌');
const ok11b = canPlaceCard(s11.hand[0], s11.slots[1], s11);
assert(ok11b.ok, '中格可以放牌');
const ok11c = canPlaceCard(s11.hand[0], s11.slots[2], s11);
assert(ok11c.ok, '右格可以放牌');

// Test 12: 爬藤蔓延（加入扩散牌）
const s12 = makeTestState(['vine_climb']);
playCardToSlot(s12.hand[0], 0, s12);
assert(s12.hand.some(c => c.defId === 'diffusion'), '爬藤蔓延加入扩散牌');

// Test 13: 计策必须精确匹配，条件不满足时清空
const s13 = makeTestState(['brute_force', 'brute_force', 'brute_force', 'brute_force']);
playCardToSlot(s13.hand[0], 0, s13);
playCardToSlot(s13.hand[0], 1, s13);
playCardToSlot(s13.hand[0], 2, s13);
assert(detectStrategy(s13.slots)?.id === 'attempt_push', '1/1/1 精确触发尝试推进');
playCardToSlot(s13.hand[0], 0, s13);
assert(detectStrategy(s13.slots) === null, '2/1/1 不满足任何计策');
calculateTotalBoardDamage(s13);
assert(s13.currentStrategy === null, '条件不满足时 currentStrategy 清空');

// Test 14: 铁匠刷新词条应避开上一组并保持两个选项唯一
const originalRandom = Math.random;
Math.random = () => 0;
const allButLastTwo = ['mighty', 'echo', 'dedicate', 'chain', 'twin', 'remain', 'spread', 'grow', 'retain'];
const stock14 = createBlacksmithStock(allButLastTwo);
Math.random = originalRandom;
assert(stock14.enchantKeywords.length === 2, '铁匠提供两个附魔词条选项');
assert(stock14.enchantKeywords[0] !== stock14.enchantKeywords[1], '铁匠附魔词条选项不重复');
assert(stock14.enchantKeywords.every(k => !allButLastTwo.includes(k)), '刷新词条避开上一组词条');

// Test 15: 训练体系驻场效果影响后续打出的牌
const s15a = makeTestState(['group_training', 'brute_force']);
playCardToSlot(s15a.hand[0], 1, s15a);
playCardToSlot(s15a.hand[0], 1, s15a);
assert(s15a.slots[1].cards[1].permanentBonus === 2, '集体训练在场后，后续同格无成长牌获得成长2');

const s15b = makeTestState(['intense_training', 'war_training']);
playCardToSlot(s15b.hand[0], 1, s15b);
playCardToSlot(s15b.hand[0], 1, s15b);
assert(s15b.slots[1].cards[1].permanentBonus === 4, '猛训练在场后，后续同格成长2多触发一次为+4');

const s15c = makeTestState(['training_trace', 'war_training']);
playCardToSlot(s15c.hand[0], 1, s15c);
playCardToSlot(s15c.hand[0], 0, s15c);
assert(s15c.slots[0].cards[0].permanentBonus === 4, '训练痕迹在场后，相邻格成长2多触发一次为+4');

// Test 16: Playground 战斗标记不应污染正式主线战斗
const s16 = createGameState('title');
enterPlaygroundBattle(s16, 'training_dummy');
assert(s16._playgroundBattle === true, 'Playground 对战会标记为沙盒战斗');
const run16 = createRunData('veteran');
const mainBattle16 = initBattleFromRun(run16);
Object.assign(s16, mainBattle16);
s16.screen = 'battle';
s16.data = {};
assert(!s16._playgroundBattle, '正式主线战斗不应残留 Playground 标记');

// Test 17: 事件战斗标记不应污染后续正式主线战斗
const s17 = createGameState('event');
const run17 = createRunData('veteran');
run17.pendingEventPool = { tier: 'high', count: 2 };
Input.state = s17;
s17.data = { runData: run17 };
Input._startEventBattle(run17, 'normal');
assert(s17._eventBattle === true, '事件打怪会标记为事件战斗');
const mainBattle17 = initBattleFromRun(run17);
Object.assign(s17, mainBattle17);
s17.screen = 'battle';
s17.data = {};
assert(!s17._eventBattle, '正式主线战斗不应残留事件战斗标记');
assert(s17._originalStageIndex === undefined, '正式主线战斗不应残留事件原始关卡索引');

// Test 18: 留场奉献已触发后不应在下一回合重复奉献
const s18 = makeTestState(['support_strike', 'brute_force']);
s18.monster.hp = 9999;
const s18Support = s18.hand[0];
s18Support.keywords.push('remain');
playCardToSlot(s18Support, 1, s18);
playCardToSlot(s18.hand[0], 1, s18);
assert(s18.slots[1].cards[1].tempBonus === 4, '首张同格后续牌获得奉献+4');
endTurn(s18);
const s18SecondBrute = createCardInstance('brute_force');
s18.hand = [s18SecondBrute];
s18.deck = [];
playCardToSlot(s18SecondBrute, 1, s18);
assert((s18.slots[1].cards[1].tempBonus || 0) === 0, '留场奉献触发过后，下一回合不重复触发');

// Test 19: 词条添加统一遵守3词条上限与去重
const s19Card = createCardInstance('brute_force');
let kwResult = addKeywordToCard(s19Card, 'grow');
assert(kwResult.ok && s19Card.growAmount === 1, '添加成长词条时初始化growAmount');
kwResult = addKeywordToCard(s19Card, 'grow');
assert(!kwResult.ok, '不能重复添加相同词条');
addKeywordToCard(s19Card, 'chain');
addKeywordToCard(s19Card, 'mighty');
kwResult = addKeywordToCard(s19Card, 'retain');
assert(!kwResult.ok && s19Card.keywords.length === 3, '每张卡牌最多3个词条');

// Test 20: 魔镜类最大人群变化应进入下一场战斗
const run20 = createRunData('veteran');
run20.maxHearts = 4;
const s20 = initBattleFromRun(run20);
assert(s20.player.maxHearts === 4 && s20.player.hearts === 4, 'runData.maxHearts 会应用到新战斗');

// Test 21: 结算时间线显式记录出牌、效果和下一回合开始
const s21 = makeTestState(['ponder']);
s21.deck = [createCardInstance('brute_force')];
playCardToSlot(s21.hand[0], 0, s21);
assert(s21.effectTimeline.some(e => e.type === 'play_card_to_slot'), '时间线记录出牌入格');
assert(s21.effectTimeline.some(e => e.type === 'effect_start' && e.effectId === 'chain'), '时间线记录词条效果开始');
endTurn(s21);
assert(s21.effectTimeline.some(e => e.type === 'turn_start' && e.turn === 2), '下一回合开始记录在turn=2');

// Test 22: 黄色君王 - 黄之王会禁用奉献
const s22 = makeMonsterTestState(['support_strike', 'brute_force'], {
    name: '黄色君王',
    disableDedicate: true
});
playCardToSlot(s22.hand[0], 1, s22);
playCardToSlot(s22.hand[0], 1, s22);
assert(s22.slots[1].cards[1].tempBonus === 0, '黄之王激活时，同格后续牌不会获得奉献加成');
assert(calculateTotalBoardDamage(s22) === 23, '黄之王激活时，辅助打击与蛮力同格总伤害应为23');

// Test 23: 黄色君王 - 黄色领域会让无奉献牌触发反向奉献
const s23 = makeMonsterTestState(['brute_force', 'brute_force'], {
    name: '黄色君王',
    yellowDomain: true
});
playCardToSlot(s23.hand[0], 1, s23);
playCardToSlot(s23.hand[0], 1, s23);
assert(s23.slots[1].cards[1].tempBonus === -7, '黄色领域会让后一张同格无奉献牌获得-7临时点数');
assert(calculateTotalBoardDamage(s23) === 23, '黄色领域激活时，两张蛮力同格总伤害应为23');

// Test 24: 黄色君王 - 黄之心会在回合开始给随机手牌赋予奉献
const s24 = makeMonsterTestState(['brute_force', 'unity_strike'], {
    name: '黄色君王',
    yellowHeart: true
});
const originalRandom24 = Math.random;
Math.random = () => 0;
FX.fire(Trigger.ON_TURN_START, new EffectContext({
    state: s24,
    trigger: Trigger.ON_TURN_START
}));
Math.random = originalRandom24;
assert(s24.hand[0].keywords.includes('dedicate'), '黄之心会给随机手牌添加奉献词条');

// Test 25: 黄色君王 - 黄之心应优先赋予没有奉献的手牌
const s25 = makeMonsterTestState(['support_strike', 'brute_force'], {
    name: '黄色君王',
    yellowHeart: true
});
const originalRandom25 = Math.random;
Math.random = () => 0;
FX.fire(Trigger.ON_TURN_START, new EffectContext({
    state: s25,
    trigger: Trigger.ON_TURN_START
}));
Math.random = originalRandom25;
assert(s25.hand[1].keywords.includes('dedicate'), '黄之心遇到已有奉献手牌时，仍应给其他手牌赋予奉献');

// Test 26: 人面草 - 香甜诱饵让中间格打出的牌成长+1
const s26 = makeMonsterTestState(['brute_force'], {
    name: '人面草',
    centerGrow1: true
});
playCardToSlot(s26.hand[0], 1, s26);
assert(s26.slots[1].cards[0].permanentBonus === 1, '人面草的香甜诱饵会让中间格打出的牌永久+1');

// Test 27: 人面草 - 盘根让每回合少抽1张牌
const s27 = makeMonsterTestState([], {
    name: '人面草',
    lessDraw: 1
});
s27.deck = [
    createCardInstance('brute_force'),
    createCardInstance('brute_force'),
    createCardInstance('brute_force'),
    createCardInstance('brute_force'),
    createCardInstance('brute_force')
];
endTurn(s27);
assert(s27.turn === 2 && s27.hand.length === 4, '人面草的盘根会让下一回合只抽4张牌');

// Test 28: 骷髅骑士 - 亡者让所有卡牌点数-2
const s28 = makeMonsterTestState(['brute_force'], {
    name: '骷髅骑士',
    allCardPenalty: 2
});
playCardToSlot(s28.hand[0], 0, s28);
assert(getCardFinalValue(s28.slots[0].cards[0], s28) === 13, '骷髅骑士的亡者会让卡牌最终点数-2');

// Test 29: 骷髅骑士 - 惊人伟力在无计策时让倍率格-10
const s29 = makeMonsterTestState(['brute_force'], {
    name: '骷髅骑士',
    noStrategySlotPenalty: 10
});
playCardToSlot(s29.hand[0], 0, s29);
assert(getSlotEffectiveMultiplier(s29.slots[0], s29) === -9, '骷髅骑士无计策时，所在倍率格应额外-10');

// Test 30: 骷髅骑士 - 武技应记录上回合计策并在复现时生效
const s30 = makeMonsterTestState(['brute_force', 'brute_force', 'brute_force'], {
    name: '骷髅骑士',
    prevStrategyPenalty: 5
});
playCardToSlot(s30.hand[0], 0, s30);
playCardToSlot(s30.hand[0], 1, s30);
playCardToSlot(s30.hand[0], 2, s30);
endTurn(s30);
assert(s30.monster.prevStrategyId === 'attempt_push', '骷髅骑士会记录玩家上回合生效的计策');
s30.hand = [
    createCardInstance('brute_force'),
    createCardInstance('brute_force'),
    createCardInstance('brute_force')
];
s30.deck = [];
s30.discard = [];
playCardToSlot(s30.hand[0], 0, s30);
playCardToSlot(s30.hand[0], 1, s30);
playCardToSlot(s30.hand[0], 2, s30);
assert(getSlotEffectiveMultiplier(s30.slots[0], s30) === -4, '骷髅骑士复现上回合计策时，倍率格应额外-5');

// Test 31: 留场牌下回合开始移除留场词条，但牌仍保留在场上到本回合结束
const s31 = makeTestState(['hold_position']);
s31.monster.hp = 9999;
playCardToSlot(s31.hand[0], 0, s31);
endTurn(s31);
assert(s31.slots[0].cards.length === 1, '留场牌会保留到下回合牌桌');
assert(s31.slots[0].cards[0].remainExhausted, '留场牌在下回合开始标记留场已耗尽');

// Test 32: 本场战斗永久加成不会污染战后牌组
const run32 = createRunData('veteran');
const s32 = makeTestState(['apprentice_forge', 'brute_force']);
s32.runDataRef = run32;
s32.stageKey = '1-1';
playCardToSlot(s32.hand[0], 0, s32);
playCardToSlot(s32.hand[0], 0, s32);
assert(s32.slots[0].cards[1].battleBonus === 5 && s32.slots[0].cards[1].permanentBonus === 0, '学徒铸造使用本场战斗永久加成');
s32.result = 'win';
resolveBattleEnd(s32);
assert(run32.deck.some(c => c.defId === 'brute_force' && (c.battleBonus || 0) === 0 && c.permanentBonus === 0), '战斗结束后本场战斗永久加成清零');

// Test 33: 先手优势只在本回合第一张牌时触发
const s33 = makeTestState(['brute_force', 'first_advantage']);
playCardToSlot(s33.hand[0], 0, s33);
playCardToSlot(s33.hand[0], 1, s33);
assert((s33.slots[1].cards[0].tempBonus || 0) === 0, '非第一张打出的先手优势不会获得+5');
assert(!s33.slots[1].cards[0].keywords.includes('remain'), '非第一张打出的先手优势不会获得留场');

// Test 34: 锦上添花从牌组响应上手，而不是打出后抽随机牌
const s34 = makeTestState(['brute_force', 'brute_force', 'brute_force']);
s34.deck = [createCardInstance('icing_on_cake')];
playCardToSlot(s34.hand[0], 0, s34);
playCardToSlot(s34.hand[0], 0, s34);
playCardToSlot(s34.hand[0], 0, s34);
assert(s34.hand.some(c => c.defId === 'icing_on_cake'), '任意倍率格三张牌时，牌组中的锦上添花移到手牌');
assert(!s34.deck.some(c => c.defId === 'icing_on_cake'), '锦上添花响应后离开牌组');

// Test 35: 一人成军只统计当前抽牌堆，不统计手牌/弃牌堆/牌桌
const s35 = makeTestState(['one_man_army', 'war_training']);
s35.deck = [createCardInstance('brute_force')];
s35.discard = [createCardInstance('big_brute_force')];
playCardToSlot(s35.hand[0], 0, s35);
assert(getCardFinalValue(s35.slots[0].cards[0], s35) === 15, '一人成军只会统计当前抽牌堆中的卡牌点数');

// Test 36: 每场战斗第一张牌遗物不会在每回合重复触发
const s36 = makeTestState(['brute_force']);
s36.runDataRef = { relics: [{ id: 'test_blitz', name: '闪电战', effect: { type: 'first_card_per_battle_bonus', bonus: 20 } }] };
s36.monster.hp = 9999;
playCardToSlot(s36.hand[0], 0, s36);
assert(getCardFinalValue(s36.slots[0].cards[0], s36) === 35, '闪电战会强化每场战斗第一张牌');
endTurn(s36);
s36.hand = [createCardInstance('brute_force')];
s36.deck = [];
playCardToSlot(s36.hand[0], 0, s36);
assert(getCardFinalValue(s36.slots[0].cards[0], s36) === 15, '闪电战不会在第二回合第一张牌重复触发');

// Test 37: 击败黄色君王后，BOSS遗物三选一必定包含一个黄色君王专属遗物
const run38 = createRunData('veteran');
run38.stageIndex = 7;
const s38 = initBattleFromRun(run38);
s38.phase = 'ended';
s38.result = 'win';
s38.monster.hp = 0;
const res38 = resolveBattleEnd(s38);
const yellowBossRelicIds = ['relic_boss_yellow_bone', 'relic_boss_yellow_heart', 'relic_boss_yellow_flesh'];
assert(res38.postBattleData.relicOptions.some(r => yellowBossRelicIds.includes(r.id)), '黄色君王战后BOSS遗物必定包含一个专属遗物');

console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`);
if (fail > 0) process.exit(1);
