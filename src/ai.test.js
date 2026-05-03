import test from "node:test";
import assert from "node:assert/strict";
import { chooseEnemyAction } from "./ai.js";
import { createInitialState, isActionLegal } from "./rules.js";

test("enemy AI only returns actions it can afford", () => {
  for (let enemyQi = 0; enemyQi <= 3; enemyQi += 1) {
    for (let playerQi = 0; playerQi <= 3; playerQi += 1) {
      const state = { ...createInitialState(), playerQi, enemyQi };
      const actionId = chooseEnemyAction(state, [], () => 0.42);

      assert.equal(isActionLegal(actionId, enemyQi), true);
    }
  }
});

test("enemy AI uses genki when it has three qi and the roll is aggressive", () => {
  const state = { ...createInitialState(), playerQi: 2, enemyQi: 3 };
  const actionId = chooseEnemyAction(state, [], () => 0.02);

  assert.equal(actionId, "genki");
});
