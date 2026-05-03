export const MAX_QI = 3;
export const MATCH_TARGET = 3;

export const ACTIONS = Object.freeze({
  charge: Object.freeze({
    id: "charge",
    label: "拍拍运气",
    shortLabel: "运气",
    type: "charge",
    cost: 0,
    description: "攒 1 点气；被任何波打中就输这一分。"
  }),
  smallWave: Object.freeze({
    id: "smallWave",
    label: "拍拍波",
    shortLabel: "小波",
    type: "attack",
    cost: 1,
    power: 1,
    blockKey: "wall",
    description: "花 1 气出小波；单手壁能挡。"
  }),
  bigWave: Object.freeze({
    id: "bigWave",
    label: "超大波",
    shortLabel: "大波",
    type: "attack",
    cost: 2,
    power: 2,
    blockKey: "knife",
    description: "花 2 气出大波；手刀能挡，也能压过小波。"
  }),
  genki: Object.freeze({
    id: "genki",
    label: "无敌元气弹",
    shortLabel: "元气弹",
    type: "attack",
    cost: 3,
    power: 3,
    unblockable: true,
    description: "花 3 气；不能被防御挡住。"
  }),
  wall: Object.freeze({
    id: "wall",
    label: "单手壁",
    shortLabel: "壁",
    type: "defense",
    cost: 0,
    blocks: "wall",
    description: "专门挡小波；防大波会被破。"
  }),
  knife: Object.freeze({
    id: "knife",
    label: "手刀",
    shortLabel: "刀",
    type: "defense",
    cost: 0,
    blocks: "knife",
    description: "专门挡大波；防小波会漏。"
  })
});

export const ACTION_ORDER = Object.freeze([
  "charge",
  "smallWave",
  "bigWave",
  "genki",
  "wall",
  "knife"
]);

const ACTION_LIST = ACTION_ORDER.map((id) => ACTIONS[id]);

export function createInitialState() {
  return {
    playerQi: 0,
    enemyQi: 0,
    playerScore: 0,
    enemyScore: 0,
    round: 1,
    matchTarget: MATCH_TARGET,
    matchOver: false
  };
}

export function getLegalActions(qi) {
  return ACTION_LIST.filter((action) => qi >= action.cost);
}

export function isActionLegal(actionId, qi) {
  const action = ACTIONS[actionId];
  return Boolean(action && qi >= action.cost);
}

export function resolveRound(state, playerActionId, enemyActionId) {
  const playerAction = requireAction(playerActionId);
  const enemyAction = requireAction(enemyActionId);

  if (!isActionLegal(playerActionId, state.playerQi)) {
    throw new Error(`Player cannot afford ${playerActionId}`);
  }

  if (!isActionLegal(enemyActionId, state.enemyQi)) {
    throw new Error(`Enemy cannot afford ${enemyActionId}`);
  }

  const playerHits = doesAttackHit(playerAction, enemyAction);
  const enemyHits = doesAttackHit(enemyAction, playerAction);
  const winner = resolveWinner(playerHits, enemyHits);
  const nextState =
    winner === "none"
      ? advanceNeutralRound(state, playerAction, enemyAction)
      : scorePoint(state, winner);

  return {
    winner,
    playerAction,
    enemyAction,
    playerHits,
    enemyHits,
    nextState,
    summary: summarizeRound(winner, playerAction, enemyAction)
  };
}

function requireAction(actionId) {
  const action = ACTIONS[actionId];
  if (!action) {
    throw new Error(`Unknown action: ${actionId}`);
  }
  return action;
}

function doesAttackHit(attackAction, defenseAction) {
  if (attackAction.type !== "attack") {
    return false;
  }

  if (defenseAction.type === "attack") {
    return attackAction.power > defenseAction.power;
  }

  if (defenseAction.type === "defense") {
    return attackAction.unblockable || attackAction.blockKey !== defenseAction.blocks;
  }

  return defenseAction.type === "charge";
}

function resolveWinner(playerHits, enemyHits) {
  if (playerHits && !enemyHits) {
    return "player";
  }

  if (enemyHits && !playerHits) {
    return "enemy";
  }

  if (playerHits && enemyHits) {
    return "draw";
  }

  return "none";
}

function advanceNeutralRound(state, playerAction, enemyAction) {
  return {
    ...state,
    playerQi: updateQiAfterNoHit(state.playerQi, playerAction),
    enemyQi: updateQiAfterNoHit(state.enemyQi, enemyAction),
    round: state.round + 1
  };
}

function updateQiAfterNoHit(qi, action) {
  const spent = qi - action.cost;
  const gained = action.type === "charge" ? 1 : 0;
  return Math.max(0, Math.min(MAX_QI, spent + gained));
}

function scorePoint(state, winner) {
  const playerScore = state.playerScore + (winner === "player" ? 1 : 0);
  const enemyScore = state.enemyScore + (winner === "enemy" ? 1 : 0);

  return {
    ...state,
    playerQi: 0,
    enemyQi: 0,
    playerScore,
    enemyScore,
    round: state.round + 1,
    matchOver: playerScore >= state.matchTarget || enemyScore >= state.matchTarget
  };
}

function summarizeRound(winner, playerAction, enemyAction) {
  if (winner === "draw") {
    return "两边同时打中，算平手重来。";
  }

  if (winner === "player") {
    return summarizeHit(playerAction, enemyAction, "你");
  }

  if (winner === "enemy") {
    return summarizeHit(enemyAction, playerAction, "对手");
  }

  if (playerAction.type === "attack" && enemyAction.type === "attack") {
    return playerAction.power === enemyAction.power
      ? "两边的波在半空抵消。"
      : "强的波压过去，弱的波被打散。";
  }

  if (playerAction.type === "defense" || enemyAction.type === "defense") {
    return summarizeBlock(playerAction, enemyAction);
  }

  return "两边都在运气，下一拍更危险。";
}

function summarizeHit(attackAction, defenseAction, attackerName) {
  if (attackAction.id === "genki" && defenseAction.type === "defense") {
    return "无敌元气弹突破了防御。";
  }

  if (defenseAction.type === "charge") {
    return `${attackerName}抓到对方运气，${attackAction.shortLabel}命中。`;
  }

  if (defenseAction.type === "defense") {
    return `${defenseAction.shortLabel}防错了，${attackAction.shortLabel}命中。`;
  }

  return `${attackAction.shortLabel}压过了${defenseAction.shortLabel}。`;
}

function summarizeBlock(playerAction, enemyAction) {
  const attack = playerAction.type === "attack" ? playerAction : enemyAction;
  const defense = playerAction.type === "defense" ? playerAction : enemyAction;

  if (attack?.type === "attack" && defense?.type === "defense") {
    return `${defense.shortLabel}刚好挡住了${attack.shortLabel}。`;
  }

  return "有人防住了空气，另一边趁机调整节奏。";
}
