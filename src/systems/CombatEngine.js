// ==================== 深入地牢 — 战斗引擎 ====================
// 集中管理怪物词条、玩家技能、遗物效果、战斗结算

import { RELICS, RELIC_SETS, HELP_CARDS, MONSTERS } from "../data/GameData.js";

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

export function calcRelicBonuses(equippedRelics, currentNode, killedThisNode = 0) {
  const bonus = { atk: 0, def: 0, maxHp: 0, thornDmg: 0, healOnKill: 0, eliteGold: 0, monsterAtkDebuff: 0, damageReduction: 0, healOnHelpUse: 0 };
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
    bonus.monsterAtkDebuff += relic.monsterAtkDebuff || 0;
    bonus.damageReduction += relic.damageReduction || 0;
    bonus.healOnHelpUse += relic.healOnHelpUse || 0;

    if (relic.battleAtkDecay && relic._remainingAtk === undefined) {
      relic._remainingAtk = relic.atk || 0;
    }
    if (relic._remainingAtk !== undefined) {
      bonus.atk += relic._remainingAtk;
    }

    if (relic.killAtkStack) {
      bonus.atk += killedThisNode * relic.killAtkStack;
    }

    if (relic.set) { setCounts[relic.set] = (setCounts[relic.set] || 0) + 1; }
  }

  for (const [setName, setDef] of Object.entries(RELIC_SETS)) {
    if ((setCounts[setName] || 0) >= setDef.pieces.length) {
      bonus.atk += setDef.bonus.atk || 0;
      bonus.def += setDef.bonus.def || 0;
      bonus.maxHp += setDef.bonus.maxHp || 0;
    }
  }
  return bonus;
}

export function hasDeathSave(equippedRelics) { return equippedRelics.some((k) => RELICS[k]?.deathSave); }
export function getBerserkerBonus(equippedRelics, hp, maxHp) {
  if (hp >= maxHp * 0.5) return 0;
  for (const key of equippedRelics) {
    if (RELICS[key]?.lowHpAtkBonus) return RELICS[key].lowHpAtkBonus;
  }
  return 0;
}
export function consumeDeathSave(equippedRelics) { const idx = equippedRelics.findIndex((k) => RELICS[k]?.deathSave); if (idx !== -1) { equippedRelics.splice(idx, 1); return true; } return false; }

export function applyGoldenChestRelic(equippedRelics, helpDeck, createHelpCard) {
  for (const key of equippedRelics) {
    const relic = RELICS[key];
    if (relic?.addCards) {
      for (const [cardKey, count] of Object.entries(relic.addCards)) {
        for (let i = 0; i < count; i++) { const card = createHelpCard(cardKey); if (card) helpDeck.push(card); }
      }
    }
  }
}

export function triggerLuckyCoin(equippedRelics, battleDeck) {
  for (const key of equippedRelics) {
    const relic = RELICS[key];
    if (relic?.spawnGoldCard) {
      const def = HELP_CARDS[relic.spawnGoldCard];
      if (def) battleDeck.push({ type: "help", data: { key: relic.spawnGoldCard, ...def }, _fromHelpDeck: true });
    }
  }
}

export function removeNodeExpiredRelics(equippedRelics) {
  const toRemove = [];
  for (const key of equippedRelics) { if (RELICS[key]?.removeAfterNode) toRemove.push(key); }
  for (const key of toRemove) { const idx = equippedRelics.indexOf(key); if (idx !== -1) equippedRelics.splice(idx, 1); }
  return toRemove;
}

// ==================== 旧怪物词条 ====================

export function calcInspireBonus(boardCards, excludeGrid) {
  let bonus = 0;
  for (const [gn, card] of boardCards) {
    if (gn !== excludeGrid && card.type === "monster" && card.data.traits?.includes("鼓舞")) bonus += 1;
  }
  return bonus;
}

export function calcRevengeBonus(monsterData, totalKilledThisNode) {
  if (!monsterData.traits?.includes("复仇")) return 0;
  // 首次计算时记录该怪物上场时的击杀基数，后续只统计上场后发生的击杀
  if (monsterData._revengeBaseKills === undefined) {
    monsterData._revengeBaseKills = totalKilledThisNode;
  }
  return Math.max(0, totalKilledThisNode - monsterData._revengeBaseKills) * 4;
}

export function checkWarlikeTrigger(monster, clickCounter) {
  if (!monster.data.traits?.includes("好战")) return false;
  const key = `warlike_${monster.data.id || monster.data.name}`;
  const count = (clickCounter[key] || 0) + 1;
  clickCounter[key] = count;
  return count % 3 === 0;
}

export function checkAmbushTrigger(boardCards, clickedGrid) {
  const adjacent = getAdjacentGrids(clickedGrid);
  const ambushers = [];
  for (const [gn, card] of boardCards) {
    if (card.type === "monster" && card.data.traits?.includes("伏击") && adjacent.includes(gn)) ambushers.push({ gridNum: gn, monster: card.data });
  }
  return ambushers;
}

export function checkGripLock(boardCards, playerGrid = 5) {
  const adjacent = getAdjacentGrids(playerGrid);
  const grippers = [];
  for (const [gn, card] of boardCards) {
    if (card.type === "monster" && card.data.traits?.includes("紧握") && adjacent.includes(gn)) grippers.push(gn);
  }
  return grippers;
}

export function checkScatterSpawn(monsterData, damageTaken) {
  if (!monsterData.traits?.includes("散子")) return [];
  const oldTriggers = monsterData._scatterTriggers || 0;
  monsterData._totalDamageTaken = (monsterData._totalDamageTaken || 0) + damageTaken;
  const newTriggers = Math.floor(monsterData._totalDamageTaken / 10);
  const spawns = [];
  for (let i = oldTriggers; i < newTriggers; i++) {
    spawns.push({ name: "骷髅", hp: 6, attack: 2, defense: 0, traits: [], level: 1, goldDrop: 5, _scattered: true });
  }
  monsterData._scatterTriggers = newTriggers;
  return spawns;
}

// ==================== 新怪物词条（位置相关） ====================

export function calcSpadeYoungBonus(boardCards, excludeGrid) {
  for (const [gn, card] of boardCards) {
    if (gn !== excludeGrid && card.type === "monster" && card.data.traits?.includes("黑桃幼崽") && gn >= 1 && gn <= 3) return 2;
  }
  return 0;
}

export function calcHeartYoungBonus(monsterData, gridNum) {
  return (monsterData.traits?.includes("红桃幼崽") && gridNum >= 7 && gridNum <= 9) ? 2 : 0;
}

export function calcDiamondYoungBonus(monsterData, gridNum) {
  return (monsterData.traits?.includes("方块幼崽") && gridNum === 4) ? 2 : 0;
}

export function calcClubYoungBonus(monsterData, gridNum) {
  return (monsterData.traits?.includes("梅花幼崽") && gridNum === 6) ? 2 : 0;
}

export function calcSharpShieldDamage(monsterData, gridNum) {
  return (monsterData.traits?.includes("尖盾") && gridNum >= 1 && gridNum <= 3) ? 2 : 0;
}

export function calcLoveBodyHeal(monsterData) {
  return monsterData.traits?.includes("爱之躯") ? 2 : 0;
}

export function checkDefenseBreaker(monsterData, gridNum) {
  return monsterData.traits?.includes("破防专家") && [1, 4, 7].includes(gridNum);
}

export function checkCallFriends(monster, clickCounter) {
  if (!monster.data.traits?.includes("叫人！")) return false;
  const key = `callfriends_${monster.data.id || monster.data.name}`;
  const count = (clickCounter[key] || 0) + 1;
  clickCounter[key] = count;
  return count % 3 === 0;
}

// ==================== Lv3-4 新词条 ====================

/** 医疗兵：处于格7/8/9时，玩家每行动一次恢复全体怪物4血（返回应恢复的血量列表） */
export function calcMedicHeal(boardCards, clickCounter) {
  const heals = [];
  for (const [gn, card] of boardCards) {
    if (card.type === "monster" && card.data.traits?.includes("医疗兵") && gn >= 7 && gn <= 9) {
      for (const [gn2, card2] of boardCards) {
        if (card2.type === "monster" && gn2 !== gn) {
          heals.push({ gridNum: gn2, amount: 4 });
        }
      }
    }
  }
  return heals;
}

/** 防护光环：处于格1/4/7时，其他怪物防御+2 */
export function calcProtectAuraBonus(boardCards, excludeGrid) {
  for (const [gn, card] of boardCards) {
    if (gn !== excludeGrid && card.type === "monster" && card.data.traits?.includes("防护光环") && [1, 4, 7].includes(gn)) return 2;
  }
  return 0;
}

/** 不休追击：移动到玩家正交相邻格时触发战斗（返回应触发战斗的怪物列表） */
export function checkRelentlessPursuit(boardCards, movedMonsters) {
  const pursuits = [];
  for (const [gn, card] of boardCards) {
    if (card.type === "monster" && card.data.traits?.includes("不休追击") && isAdjacent(gn, 5) && movedMonsters.includes(gn)) {
      pursuits.push({ gridNum: gn, monster: card.data, card });
    }
  }
  return pursuits;
}

/** 侧方打击：移动到格1/3/7/9时，对玩家造成3伤害 */
export function calcSideStrike(boardCards, movedToGrids) {
  let totalDmg = 0;
  const corners = [1, 3, 7, 9];
  for (const gn of movedToGrids) {
    const card = boardCards.get(gn);
    if (card?.type === "monster" && card.data.traits?.includes("侧方打击") && corners.includes(gn)) {
      totalDmg += 3;
    }
  }
  return totalDmg;
}

/** 红桃之母：累计损失满10血触发，召唤随机红桃怪物 */
export function checkHeartMotherSpawn(monsterData, damageTaken) {
  if (!monsterData.traits?.includes("红桃之母")) return [];
  const oldTriggers = monsterData._hmTriggers || 0;
  monsterData._hmTotalDamage = (monsterData._hmTotalDamage || 0) + damageTaken;
  const newTriggers = Math.floor(monsterData._hmTotalDamage / 10);
  const spawns = [];
  // 红桃池（仅限红桃怪物）
  const heartPool = Object.entries(MONSTERS).filter(([k, m]) => k.startsWith("heart") && m.level <= 4 && !m.traits?.includes("红桃之母"));
  for (let i = oldTriggers; i < newTriggers; i++) {
    if (heartPool.length > 0) {
      const [key, template] = heartPool[Math.floor(Math.random() * heartPool.length)];
      spawns.push({ ...template, id: `${template.name}_hm_${Date.now()}_${i}`, _hmSpawn: true });
    }
  }
  monsterData._hmTriggers = newTriggers;
  return spawns;
}

/** 牢不可破：移动到格1/3/7/9时，场上随机怪物获得庇佑（返回获得庇佑的怪物gridNum） */
export function checkUnbreakable(boardCards, movedToGrids) {
  const corners = [1, 3, 7, 9];
  let triggered = false;
  for (const gn of movedToGrids) {
    const card = boardCards.get(gn);
    if (card?.type === "monster" && card.data.traits?.includes("牢不可破") && corners.includes(gn)) {
      triggered = true; break;
    }
  }
  if (!triggered) return -1;
  // 随机选一只其他怪物获得庇佑
  const candidates = [];
  for (const [gn, card] of boardCards) {
    if (card.type === "monster" && !card.data.traits?.includes("牢不可破") && !card.data._hasBlessing) {
      candidates.push(gn);
    }
  }
  if (candidates.length === 0) return -1;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const targetCard = boardCards.get(picked);
  if (targetCard) targetCard.data._hasBlessing = true;
  return picked;
}

/** 竖向拉杆：移动到格7时竖列1-4-7轮换；移动到格3时竖列3-6-9轮换（返回需要交换的位置映射） */
export function checkVerticalLever(boardCards, movedToGrids) {
  const swaps = {};
  for (const gn of movedToGrids) {
    const card = boardCards.get(gn);
    if (!card || card.type !== "monster" || !card.data.traits?.includes("竖向拉杆")) continue;
    if (gn === 7) {
      // 列1: 1→7, 7→4, 4→1
      const c1 = boardCards.get(1); const c4 = boardCards.get(4); const c7 = boardCards.get(7);
      swaps[1] = c4 || null; swaps[4] = c7 || null; swaps[7] = c1 || null;
    } else if (gn === 3) {
      // 列2: 3→6, 6→9, 9→3
      const c3 = boardCards.get(3); const c6 = boardCards.get(6); const c9 = boardCards.get(9);
      swaps[3] = c9 || null; swaps[6] = c3 || null; swaps[9] = c6 || null;
    }
  }
  return swaps;
}

// ==================== 精英/层主词条 ====================

/** 决斗：战斗后禁止所有卡牌移动（旋转锁定） */
export function checkDuelLock(equippedRelicsOrBoard, cardData) {
  return cardData?.traits?.includes("决斗");
}

/** 战舞：每移动1次，本牌攻击+1或防御+1 */
export function applyBattleDance(cardData, moveCount) {
  if (!cardData?.traits?.includes("战舞")) return { atk: 0, def: 0 };
  const bonus = moveCount || 0;
  // 交替：奇数次+攻，偶数次+防
  const atkBonus = Math.ceil(bonus / 2);
  const defBonus = Math.floor(bonus / 2);
  return { atk: atkBonus, def: defBonus };
}

/** 暴力（层主）：每移动4次，若处于格2/4/6/8则与玩家战斗 */
export function checkBossViolence(cardData, gridNum, moveCount) {
  if (!cardData?.traits?.includes("暴力")) return false;
  return moveCount > 0 && moveCount % 4 === 0 && [2, 4, 6, 8].includes(gridNum);
}

/** 黑桃皇室：每移动4次，所有黑桃卡攻击+1 */
export function calcSpadeRoyalBonus(boardCards, moveCount) {
  if (moveCount <= 0 || moveCount % 4 !== 0) return 0;
  let hasRoyal = false;
  for (const [, card] of boardCards) {
    if (card.type === "monster" && card.data.traits?.includes("黑桃皇室")) { hasRoyal = true; break; }
  }
  if (!hasRoyal) return 0;
  // 给所有黑桃怪物累积加成
  let bonus = 0;
  for (const [, card] of boardCards) {
    if (card.type === "monster" && card.data.name?.startsWith("黑桃")) {
      card.data._royalAtk = (card.data._royalAtk || 0) + 1;
    }
  }
  return 1; // 返回本次增量
}

// ==================== 玩家技能系统 ====================

/** 先攻判定：玩家有先攻则玩家先手，怪物有先攻则怪物先手 */
export function hasFirstStrike(learnedSkills, monsterTraits) {
  const playerFS = learnedSkills.includes("先攻");
  const monsterFS = monsterTraits?.includes("先攻");
  if (playerFS && !monsterFS) return "player";
  if (!playerFS && monsterFS) return "monster";
  return "player"; // 双方都有或都没有时，玩家先
}

export function calcThornsDamage(learnedSkills, monsterAttack) {
  return learnedSkills.includes("刺皮") ? monsterAttack : 0;
}

export function calcHardSkinBonus(learnedSkills) {
  return learnedSkills.includes("硬皮") ? { maxHp: 10, healPerNode: 10 } : { maxHp: 0, healPerNode: 0 };
}

export function calcBattleVeteranAtk(learnedSkills, monsterId, battleVetState) {
  if (!learnedSkills.includes("历战")) return 0;
  if (battleVetState.lastTargetId !== undefined && battleVetState.lastTargetId !== monsterId) battleVetState.stacks = 0;
  battleVetState.lastTargetId = monsterId;
  battleVetState.stacks = (battleVetState.stacks || 0) + 1;
  return battleVetState.stacks;
}

export function calcEffectiveStats(playerState, equippedRelics, learnedSkills, currentNode, battleVetState, monsterId) {
  const p = playerState;
  const relicBonus = calcRelicBonuses(equippedRelics, currentNode);
  const hsBonus = calcHardSkinBonus(learnedSkills);
  const vetAtk = monsterId ? calcBattleVeteranAtk(learnedSkills, monsterId, battleVetState) : 0;
  let atk = p.baseAttack + relicBonus.atk + vetAtk;
  const def = p.baseDefense + relicBonus.def;
  const maxHp = p.maxHp + relicBonus.maxHp + hsBonus.maxHp;
  atk += getBerserkerBonus(equippedRelics, p.hp, maxHp);
  return { atk, def, maxHp, relicBonus, hsBonus, vetAtk };
}
