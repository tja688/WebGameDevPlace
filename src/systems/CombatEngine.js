// ==================== 深入地牢 — 战斗引擎 ====================
// 集中管理怪物词条、玩家技能、遗物效果、战斗结算

import { RELICS, RELIC_SETS, HELP_CARDS } from "../data/GameData.js";

/** 判断两个九宫格格位是否正交相邻 */
export function isAdjacent(a, b) {
  const ra = Math.floor((a - 1) / 3), ca = (a - 1) % 3;
  const rb = Math.floor((b - 1) / 3), cb = (b - 1) % 3;
  return (Math.abs(ra - rb) + Math.abs(ca - cb)) === 1;
}

/** 获取正交相邻格列表 */
export function getAdjacentGrids(gridNum) {
  const r = Math.floor((gridNum - 1) / 3), c = (gridNum - 1) % 3;
  const result = [];
  if (r > 0) result.push((r - 1) * 3 + c + 1);
  if (r < 2) result.push((r + 1) * 3 + c + 1);
  if (c > 0) result.push(r * 3 + (c - 1) + 1);
  if (c < 2) result.push(r * 3 + (c + 1) + 1);
  return result;
}

// ==================== 遗物效果计算 ====================

/** 从装备的遗物列表计算属性加成 */
export function calcRelicBonuses(equippedRelics, currentNode) {
  const bonus = { atk: 0, def: 0, maxHp: 0, thornDmg: 0, healOnKill: 0, eliteGold: 0 };
  const setCounts = {};

  for (const key of equippedRelics) {
    const relic = RELICS[key];
    if (!relic) continue;
    bonus.atk += relic.atk || 0;
    bonus.def += relic.def || 0;
    bonus.maxHp += relic.maxHp || 0;
    bonus.thornDmg += relic.thornDmg || 0;
    bonus.healOnKill += relic.healOnKill || 0;
    bonus.eliteGold += relic.eliteGold || 0;

    // 成长型遗物
    if (relic.perNodeAtk && relic.perNodeInterval) {
      bonus.atk += Math.floor(currentNode / relic.perNodeInterval) * relic.perNodeAtk;
    }

    // 套装计数
    if (relic.set) {
      setCounts[relic.set] = (setCounts[relic.set] || 0) + 1;
    }
  }

  // 套装加成
  for (const [setName, setDef] of Object.entries(RELIC_SETS)) {
    if ((setCounts[setName] || 0) >= setDef.pieces.length) {
      bonus.atk += setDef.bonus.atk || 0;
      bonus.def += setDef.bonus.def || 0;
      bonus.maxHp += setDef.bonus.maxHp || 0;
    }
  }

  return bonus;
}

/** 检查是否有凤凰羽毛（免死） */
export function hasDeathSave(equippedRelics) {
  return equippedRelics.some((k) => RELICS[k]?.deathSave);
}

/** 检查狂战士斧低血翻倍 */
export function isBerserkerActive(equippedRelics, hp, maxHp) {
  return equippedRelics.some((k) => RELICS[k]?.lowHpAtkDouble) && hp < maxHp * 0.5;
}

/** 消耗凤凰羽毛（返回 true 表示已消耗） */
export function consumeDeathSave(equippedRelics) {
  const idx = equippedRelics.findIndex((k) => RELICS[k]?.deathSave);
  if (idx !== -1) { equippedRelics.splice(idx, 1); return true; }
  return false;
}

/** 金色宝箱遗物：加入金色宝箱卡 */
export function applyGoldenChestRelic(equippedRelics, helpDeck, createHelpCard) {
  for (const key of equippedRelics) {
    const relic = RELICS[key];
    if (relic?.addCard) {
      const card = createHelpCard(relic.addCard);
      if (card) helpDeck.push(card);
    }
  }
}

// ==================== 怪物词条系统 ====================

/** 计算鼓舞加成：场上其他怪物攻击+1 */
export function calcInspireBonus(boardCards, excludeGrid) {
  let bonus = 0;
  for (const [gn, card] of boardCards) {
    if (gn !== excludeGrid && card.type === "monster" && card.data.traits?.includes("鼓舞")) {
      bonus += 1;
    }
  }
  return bonus;
}

/** 计算复仇加成：每移除一张怪物卡，本牌攻击+2 */
export function calcRevengeBonus(monsterData, totalKilledThisNode) {
  if (monsterData.traits?.includes("复仇")) {
    return totalKilledThisNode * 2;
  }
  return 0;
}

/** 好战词条：检查点击计数是否触发 */
export function checkWarlikeTrigger(monster, clickCounter) {
  if (!monster.data.traits?.includes("好战")) return false;
  // 每只好战怪物独立计数
  const key = `warlike_${monster.data.id || monster.data.name}`;
  const count = (clickCounter[key] || 0) + 1;
  clickCounter[key] = count;
  return count % 3 === 0;
}

/** 伏击词条：点击相邻格时触发 */
export function checkAmbushTrigger(boardCards, clickedGrid) {
  const adjacent = getAdjacentGrids(clickedGrid);
  const ambushers = [];
  for (const [gn, card] of boardCards) {
    if (card.type === "monster" && card.data.traits?.includes("伏击") && adjacent.includes(gn)) {
      ambushers.push({ gridNum: gn, monster: card.data });
    }
  }
  return ambushers;
}

/** 紧握词条：玩家在相邻格时只能选该紧握怪物为战斗目标 */
export function checkGripLock(boardCards, playerGrid = 5) {
  const adjacent = getAdjacentGrids(playerGrid);
  const grippers = [];
  for (const [gn, card] of boardCards) {
    if (card.type === "monster" && card.data.traits?.includes("紧握") && adjacent.includes(gn)) {
      grippers.push(gn);
    }
  }
  return grippers;
}

/** 散子词条：累计损失血满10触发，返回应召唤的骷髅 */
export function checkScatterSpawn(monsterData, damageTaken) {
  if (!monsterData.traits?.includes("散子")) return [];
  const oldTriggers = monsterData._scatterTriggers || 0;
  monsterData._totalDamageTaken = (monsterData._totalDamageTaken || 0) + damageTaken;
  const newTriggers = Math.floor(monsterData._totalDamageTaken / 10);
  const spawns = [];
  for (let i = oldTriggers; i < newTriggers; i++) {
    spawns.push({
      name: "骷髅",
      hp: 6,
      attack: 2,
      defense: 0,
      traits: [],
      level: 1,
      goldDrop: 10,
      _scattered: true,
    });
  }
  monsterData._scatterTriggers = newTriggers;
  return spawns;
}

// ==================== 玩家技能系统 ====================

/** 先攻判定 */
export function hasFirstStrike(learnedSkills, monsterTraits) {
  // 通用技能先攻 vs 怪物先攻
  const playerFS = learnedSkills.includes("先攻");
  // 怪物暂时没有先攻词条，但预留接口
  return playerFS;
}

/** 刺皮：被攻击时反伤 */
export function calcThornsDamage(learnedSkills, monsterAttack) {
  if (learnedSkills.includes("刺皮")) return monsterAttack;
  return 0;
}

/** 硬皮：+10 血量上限 + 关卡结束回 10 血 */
export function calcHardSkinBonus(learnedSkills) {
  if (learnedSkills.includes("硬皮")) return { maxHp: 10, healPerNode: 10 };
  return { maxHp: 0, healPerNode: 0 };
}

/** 历战：每次战斗攻击+1，换目标复原 */
export function calcBattleVeteranAtk(learnedSkills, monsterId, battleVetState) {
  if (!learnedSkills.includes("历战")) return 0;
  if (battleVetState.lastTargetId !== undefined && battleVetState.lastTargetId !== monsterId) {
    battleVetState.stacks = 0;
  }
  battleVetState.lastTargetId = monsterId;
  battleVetState.stacks = (battleVetState.stacks || 0) + 1;
  return battleVetState.stacks;
}

// ==================== 完整有效属性计算 ====================

export function calcEffectiveStats(playerState, equippedRelics, learnedSkills, currentNode, battleVetState, monsterId) {
  const p = playerState;
  const relicBonus = calcRelicBonuses(equippedRelics, currentNode);
  const hsBonus = calcHardSkinBonus(learnedSkills);
  const vetAtk = monsterId ? calcBattleVeteranAtk(learnedSkills, monsterId, battleVetState) : 0;

  let atk = p.baseAttack + relicBonus.atk + vetAtk;
  const def = p.baseDefense + relicBonus.def;
  const maxHp = p.maxHp + relicBonus.maxHp + hsBonus.maxHp;

  // 狂战士斧：血<50% 攻击翻倍
  if (isBerserkerActive(equippedRelics, p.hp, maxHp)) {
    atk *= 2;
  }

  return { atk, def, maxHp, relicBonus, hsBonus, vetAtk };
}
