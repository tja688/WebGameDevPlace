import { startBattle } from './js/core/state.js';
import { drawCards, endTurn } from './js/systems/battle.js';
import { playCardToSlot, calculateTotalBoardDamage, getPlacementPreview, canPlaceCard } from './js/systems/board.js';
import { MONSTER_DEFS } from './js/data/index.js';

// 必须导入以触发效果注册
import './js/effects/index.js';

// 将 simulateBattles 挂载到全局以便调用
import './js/autotest.js';

function testHp(hp) {
    MONSTER_DEFS.vine_ship.hp = hp;
    const result = window.simulateBattles(200, false);
    console.log(`HP=${hp}: 胜率 ${result.wins}/200 (${(result.wins/200*100).toFixed(1)}%), 平均回合 ${result.avgTurns}`);
}

console.log('=== 自动战斗胜率模拟 ===\n');
for (const hp of [55, 65, 75, 85, 95]) {
    testHp(hp);
}
