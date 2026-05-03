import { ACTIONS, ACTION_ORDER, getLegalActions } from "./rules.js";

export function chooseEnemyAction(state, history = [], rng = Math.random) {
  const legalIds = new Set(getLegalActions(state.enemyQi).map((action) => action.id));

  if (legalIds.has("genki") && rng() < 0.35) {
    return "genki";
  }

  const weights = new Map();

  for (const actionId of ACTION_ORDER) {
    if (legalIds.has(actionId)) {
      weights.set(actionId, baseWeight(actionId));
    }
  }

  const playerPattern = readPlayerPattern(history);
  const playerCanSmall = state.playerQi >= ACTIONS.smallWave.cost;
  const playerCanBig = state.playerQi >= ACTIONS.bigWave.cost;
  const playerCanGenki = state.playerQi >= ACTIONS.genki.cost;

  bump(weights, "charge", state.playerQi === 0 ? 3.8 : 1.0);
  bump(weights, "charge", playerPattern.defensive * 1.1);

  if (state.enemyQi >= 1) {
    bump(weights, "smallWave", playerPattern.charging * 3.4);
    bump(weights, "smallWave", state.playerQi === 0 ? 2.8 : 0.7);
    bump(weights, "smallWave", playerPattern.knife * 1.0);
  }

  if (state.enemyQi >= 2) {
    bump(weights, "bigWave", playerPattern.charging * 3.0);
    bump(weights, "bigWave", playerPattern.wall * 1.4);
    bump(weights, "bigWave", playerCanSmall ? 0.9 : 0.2);
  }

  if (state.enemyQi >= 3) {
    bump(weights, "genki", 7.0);
    bump(weights, "genki", playerCanBig ? 1.5 : 0);
  }

  if (playerCanSmall) {
    bump(weights, "wall", 2.0 + playerPattern.smallWave * 2.0);
  }

  if (playerCanBig) {
    bump(weights, "knife", 2.2 + playerPattern.bigWave * 2.0);
  }

  if (playerCanGenki) {
    bump(weights, "charge", -0.8);
    bump(weights, "wall", -0.6);
    bump(weights, "knife", -0.6);
    bump(weights, "smallWave", state.enemyQi >= 1 ? 1.1 : 0);
    bump(weights, "bigWave", state.enemyQi >= 2 ? 1.4 : 0);
  }

  return pickWeighted(weights, rng);
}

export function describeEnemyMood(state, history = []) {
  const pattern = readPlayerPattern(history);

  if (state.enemyQi >= 3) {
    return "对手气满，元气弹威胁很高。";
  }

  if (state.playerQi >= 3) {
    return "你气满了，对手会更急着抢拍。";
  }

  if (pattern.charging > 0.55) {
    return "对手觉得你爱运气，可能会偷波。";
  }

  if (pattern.defensive > 0.55) {
    return "对手觉得你偏防守，可能趁机攒气。";
  }

  return "对手在读你的节奏。";
}

function baseWeight(actionId) {
  switch (actionId) {
    case "charge":
      return 1.8;
    case "wall":
    case "knife":
      return 0.9;
    default:
      return 0.7;
  }
}

function bump(weights, actionId, amount) {
  if (!weights.has(actionId)) {
    return;
  }

  weights.set(actionId, Math.max(0.05, weights.get(actionId) + amount));
}

function pickWeighted(weights, rng) {
  const entries = Array.from(weights.entries());
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;

  for (const [actionId, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return actionId;
    }
  }

  return entries.at(-1)[0];
}

function readPlayerPattern(history) {
  const recent = history.slice(-5);
  if (recent.length === 0) {
    return {
      charging: 0.4,
      defensive: 0.2,
      smallWave: 0.2,
      bigWave: 0.15,
      wall: 0.15,
      knife: 0.15
    };
  }

  const counts = {
    charge: 0,
    smallWave: 0,
    bigWave: 0,
    genki: 0,
    wall: 0,
    knife: 0
  };

  for (const entry of recent) {
    counts[entry.playerActionId] += 1;
  }

  const total = recent.length;
  return {
    charging: counts.charge / total,
    defensive: (counts.wall + counts.knife) / total,
    smallWave: counts.smallWave / total,
    bigWave: counts.bigWave / total,
    wall: counts.wall / total,
    knife: counts.knife / total
  };
}
