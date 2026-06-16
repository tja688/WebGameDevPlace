// ============================================================
// CardRuntime — 卡牌运行时状态（移动/战斗计数等）
// ============================================================

const RUNTIME_KEY = "_runtime";

/** @returns {{ moveCount: number, combatCount: number }} */
export function ensureCardRuntime(cardData) {
  if (!cardData) return { moveCount: 0, combatCount: 0 };
  if (!cardData[RUNTIME_KEY]) {
    cardData[RUNTIME_KEY] = { moveCount: 0, combatCount: 0 };
  }
  return cardData[RUNTIME_KEY];
}

/** 本卡移动次数 +1，返回新计数 */
export function incrementMoveCount(cardData) {
  const rt = ensureCardRuntime(cardData);
  rt.moveCount += 1;
  return rt.moveCount;
}

/** 本卡战斗次数 +1 */
export function incrementCombatCount(cardData) {
  const rt = ensureCardRuntime(cardData);
  rt.combatCount += 1;
  return rt.combatCount;
}

/** 为洗入卡组生成唯一 uid */
export function nextCardUid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
