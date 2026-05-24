/**
 * Playground 引擎快速验证脚本
 */

import { executeScenario, executeScenarios } from './js/playground/scenario-engine.js';
import { EFFECT_SCENARIOS } from './js/playground/scenario-data.js';

// 必须导入以触发效果注册副作用
import './js/effects/index.js';

console.log('=== Playground 场景引擎验证 ===\n');

let pass = 0;
let fail = 0;

for (const scenario of EFFECT_SCENARIOS) {
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

console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 / 总计 ${EFFECT_SCENARIOS.length} ===`);
if (fail > 0) process.exit(1);
