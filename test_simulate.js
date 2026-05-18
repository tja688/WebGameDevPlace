const fs = require('fs');
const vm = require('vm');

global.window = global;
global.document = undefined;

const files = ['js/data.js', 'js/engine.js', 'js/audio.js', 'js/renderer.js', 'js/input.js', 'js/autotest.js'];
for (const f of files) {
    vm.runInThisContext(fs.readFileSync(f, 'utf8'));
}

function testHp(hp) {
    MONSTER_DEFS.lone_rat.hp = hp;
    const result = simulateBattles(200, false);
    console.log(`HP=${hp}: 胜率 ${result.wins}/200 (${(result.wins/200*100).toFixed(1)}%), 平均回合 ${result.avgTurns}`);
}

console.log('=== 自动战斗胜率模拟 ===\n');
for (const hp of [55, 65, 75, 85, 95]) {
    testHp(hp);
}
