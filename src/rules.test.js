import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  createInitialState,
  getLegalActions,
  resolveRound
} from "./rules.js";

test("charging gains one qi when nobody lands a wave", () => {
  const state = createInitialState();
  const result = resolveRound(state, "charge", "wall");

  assert.equal(result.nextState.playerQi, 1);
  assert.equal(result.nextState.enemyQi, 0);
  assert.equal(result.winner, "none");
});

test("a small wave defeats an opponent who is charging", () => {
  const state = { ...createInitialState(), playerQi: 1 };
  const result = resolveRound(state, "smallWave", "charge");

  assert.equal(result.winner, "player");
  assert.equal(result.nextState.playerScore, 1);
  assert.equal(result.nextState.playerQi, 0);
  assert.equal(result.nextState.enemyQi, 0);
});

test("single wall blocks small wave but not big wave", () => {
  const smallBlocked = resolveRound(
    { ...createInitialState(), enemyQi: 1 },
    "wall",
    "smallWave"
  );
  const bigBreaksWall = resolveRound(
    { ...createInitialState(), enemyQi: 2 },
    "wall",
    "bigWave"
  );

  assert.equal(smallBlocked.winner, "none");
  assert.equal(bigBreaksWall.winner, "enemy");
});

test("hand knife blocks big wave but not small wave", () => {
  const bigBlocked = resolveRound(
    { ...createInitialState(), enemyQi: 2 },
    "knife",
    "bigWave"
  );
  const smallSlipsThrough = resolveRound(
    { ...createInitialState(), enemyQi: 1 },
    "knife",
    "smallWave"
  );

  assert.equal(bigBlocked.winner, "none");
  assert.equal(smallSlipsThrough.winner, "enemy");
});

test("larger waves beat smaller waves and equal waves cancel", () => {
  const bigBeatsSmall = resolveRound(
    { ...createInitialState(), playerQi: 2, enemyQi: 1 },
    "bigWave",
    "smallWave"
  );
  const smallCancelsSmall = resolveRound(
    { ...createInitialState(), playerQi: 1, enemyQi: 1 },
    "smallWave",
    "smallWave"
  );

  assert.equal(bigBeatsSmall.winner, "player");
  assert.equal(smallCancelsSmall.winner, "none");
});

test("three qi genki blast cannot be blocked", () => {
  const result = resolveRound(
    { ...createInitialState(), playerQi: 3 },
    "genki",
    "knife"
  );

  assert.equal(result.winner, "player");
  assert.equal(result.summary, "无敌元气弹突破了防御。");
});

test("legal actions depend on current qi", () => {
  assert.deepEqual(getLegalActions(0), [
    ACTIONS.charge,
    ACTIONS.wall,
    ACTIONS.knife
  ]);
  assert.ok(getLegalActions(2).includes(ACTIONS.bigWave));
  assert.ok(!getLegalActions(2).includes(ACTIONS.genki));
  assert.ok(getLegalActions(3).includes(ACTIONS.genki));
});
