// ============================================================
// CardRuntime — 卡牌运行时状态（移动/战斗计数等）
// ============================================================

const RUNTIME_KEY = "_runtime";

/** @returns {{ moveCount: number, combatCount: number, baseAtk: number, baseArmor: number, tempAtkBonus: number, tempArmorBonus: number }} */
export function ensureCardRuntime(cardData) {
  if (!cardData) return { moveCount: 0, combatCount: 0 };
  if (!cardData[RUNTIME_KEY]) {
    cardData[RUNTIME_KEY] = {
      moveCount: 0,
      combatCount: 0,
      baseAtk: cardData.atk || 0,
      baseArmor: cardData.armor || 0,
      tempAtkBonus: 0,
      tempArmorBonus: 0,
    };
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

/** 重置怪物临时光环修正（不影响永久成长） */
export function clearTempBonuses(cardData) {
  const rt = ensureCardRuntime(cardData);
  rt.tempAtkBonus = 0;
  rt.tempArmorBonus = 0;
}

/** 添加临时攻击修正 */
export function addTempAtkBonus(cardData, amount) {
  const rt = ensureCardRuntime(cardData);
  rt.tempAtkBonus += amount;
  cardData.atk = Math.max(0, (rt.baseAtk || 0) + rt.tempAtkBonus);
}

/** 添加临时护甲修正 */
export function addTempArmorBonus(cardData, amount) {
  const rt = ensureCardRuntime(cardData);
  rt.tempArmorBonus += amount;
  cardData.armor = Math.max(0, (rt.baseArmor || 0) + rt.tempArmorBonus);
}

/** 永久增加攻击（会更新基准值） */
export function addPermanentAtk(cardData, amount) {
  const rt = ensureCardRuntime(cardData);
  rt.baseAtk = Math.max(0, (rt.baseAtk || 0) + amount);
  cardData.atk = Math.max(0, rt.baseAtk + (rt.tempAtkBonus || 0));
}

/** 永久增加护甲（会更新基准值） */
export function addPermanentArmor(cardData, amount) {
  const rt = ensureCardRuntime(cardData);
  rt.baseArmor = Math.max(0, (rt.baseArmor || 0) + amount);
  cardData.armor = Math.max(0, rt.baseArmor + (rt.tempArmorBonus || 0));
}

/** 为洗入卡组生成唯一 uid */
export function nextCardUid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
