import GridManager from "../grid/GridManager.js";
import gameState from "../core/GameState.js";
import { MoveReason } from "../core/MoveReason.js";
import {
  incrementMoveCount,
  nextCardUid,
  addPermanentArmor,
  addPermanentAtk,
  clearTempBonuses,
  addTempAtkBonus,
} from "./CardRuntime.js";
import { resolveBattle } from "../battle/BattleResolver.js";
import { createHelpCard, createMonsterCard, refreshMonsterCardDisplay } from "../cards/CardFactory.js";

// ============================================================
// SkillRuntime — 怪物技能事件分发（第一段代表性技能）
// ============================================================

/**
 * 处理单张卡的移动后技能
 * @param {object} ctx — BoardActionResolver 上下文
 * @param {{ card: object, cardData: object, fromSlot: number, toSlot: number, reason: string }} move
 * @returns {{ extraMoves: Array, autoBattleSlots: number[] }}
 */
export async function processMoveSkillEffects(ctx, move) {
  const { grid } = ctx;
  const cardData = move.cardData;
  if (!cardData || cardData.type !== "monster" || !cardData.skill?.effects) {
    return { extraMoves: [], autoBattleSlots: [] };
  }

  const moveCount = incrementMoveCount(cardData);
  const extraMoves = [];
  const autoBattleSlots = [];
  const playerSlot = grid.getPlayerSlot();

  for (const eff of cardData.skill.effects) {
    // 移动到格 X
    if (eff.event === "onMoveToSlot" && eff.slots?.includes(move.toSlot)) {
      if (eff.action === "dmgPlayer") {
        gameState.takeDamage(eff.amount || 1);
        console.log(`[技能] ${cardData.skill.name}: 移动到格${move.toSlot}，对玩家造成${eff.amount}伤害`);
        ctx.logEvent("onMoveToSlot", { card: cardData.name, slot: move.toSlot, dmg: eff.amount });
      }
    }

    // 每移动 N 次
    if (eff.event === "onMoveEveryN" && eff.n > 0 && moveCount % eff.n === 0) {
      if (eff.action === "swapRandomMonster") extraMoves.push(...swapWithRandomMonster(grid, move.toSlot, MoveReason.SKILL_SWAP));
      // rotateGrid 是异步动画，因此必须等待其 moveRecords 再进入“下一轮派生移动”
      if (eff.action === "rotateBoard") {
        const rotateMoves = await new Promise((resolve) => {
          ctx.grid.rotateGrid({
            reason: MoveReason.SKILL_MOVE,
            onComplete: (moves) => resolve(moves || []),
          });
        });
        extraMoves.push(...rotateMoves);
      }
      if (eff.action === "swapRandomHelp") extraMoves.push(...swapWithRandomHelp(grid, move.toSlot));
      if (eff.action === "buffRandomOtherMonster") buffRandomOtherMonster(grid, move.toSlot, eff);
      if (eff.action === "stealAdjacentArmor") stealAdjacentArmor(grid, move.toSlot, eff.amount || 1, cardData);
      if (eff.action === "selfArmorToPlayerDamage") armorToPlayerDamage(cardData, eff.amount || 2);
      if (eff.action === "spawnToDeck" && eff.cards?.length) spawnCardsToDeck(eff.cards);
      if (eff.action === "sacrificeById") sacrificeById(ctx, eff.targetId || "dragonFollower");
      if (eff.action === "removeAdjacentHelp") removeAdjacentHelp(ctx, move.toSlot, 1);
      if (eff.action === "moveAdjacentHelpToDeckAndReplace") moveAdjacentHelpToDeckAndReplace(ctx, move.toSlot);
      if (eff.action === "gainAtk") addPermanentAtk(cardData, eff.amount || 1);
      if (eff.action === "selfArmorUp") addPermanentArmor(cardData, eff.amount || 1);
      ctx.logEvent("onMoveEveryN", { card: cardData.name, n: eff.n, action: eff.action });
      refreshMonsterCardDisplay(move.card);
    }

    // 移动到玩家正交相邻格
    if (eff.event === "onMoveToPlayerAdjacent") {
      if (GridManager.isOrthogonalAdjacent(move.toSlot, playerSlot)) {
        if (eff.action === "autoBattle") {
          autoBattleSlots.push(move.toSlot);
          console.log(`[技能] ${cardData.skill.name}: 移动到玩家相邻格${move.toSlot}，触发自动战斗`);
          ctx.logEvent("onMoveToPlayerAdjacent", { card: cardData.name, slot: move.toSlot });
        }
      }
    }
  }

  return { extraMoves, autoBattleSlots };
}

/**
 * 卡牌被移除时技能（[被移除时]）
 * @param {object} ctx
 * @param {number} slot
 * @param {object} container
 * @param {object} meta
 */
export function processRemoveSkillEffects(ctx, slot, container, meta) {
  const cardData = container?.cardData;
  if (!cardData?.skill?.effects) return;

  for (const eff of cardData.skill.effects) {
    if (eff.event !== "onRemove") continue;

    if (eff.action === "dmgPlayer") {
      if (eff.condition === "armorZero") {
        if ((cardData.armor || 0) > 0) continue;
      }
      gameState.takeDamage(eff.amount || 1);
      console.log(`[技能] ${cardData.skill.name}: 被移除，对玩家造成${eff.amount}伤害`);
      ctx.logEvent("onRemove", { card: cardData.name, action: "dmgPlayer" });
    }

    if (eff.action === "spawnToDeck" && eff.cards?.length) {
      for (const template of eff.cards) {
        const spawned = { ...template, uid: nextCardUid(template.id || "spawn") };
        gameState.shuffleCardToDeck(spawned);
        console.log(`[技能] ${cardData.skill.name}: 被移除，洗入 ${spawned.name}`);
      }
      ctx.logEvent("onRemove", { card: cardData.name, action: "spawnToDeck", count: eff.cards.length });
    }
  }
}

/** 怪物登场触发 */
export function processEnterSkillEffects(ctx, slot, container) {
  const cardData = container?.cardData;
  if (!cardData?.skill?.effects) return;

  for (const eff of cardData.skill.effects) {
    if (eff.event !== "onEnter") continue;
    if (eff.action === "dmgPlayer") {
      const ok = !eff.condition || (eff.condition === "evenSlot" && [2, 4, 6, 8].includes(slot));
      if (ok) gameState.takeDamage(eff.amount || 1);
    }
    if (eff.action === "rotateBoard") {
      ctx.grid.rotateGrid({ reason: MoveReason.SKILL_MOVE, onComplete: () => {} });
    }
  }
}

/** 处理战斗技能，返回战斗临时结果 */
export function processCombatSkillEffects(monsterData, slot) {
  const result = {
    atkDelta: 0,
    firstStrike: false,
    reflectDmg: 0,
    heal: 0,
    // 在战斗中根据“护甲损失/造成伤害”动态产生的后置效果（BattleResolver 负责真正落地）
    armorLossDmg: false,
    atkPerDamageAmount: 0,
  };
  const skill = monsterData.skill;
  if (!skill?.effects) return result;

  for (const eff of skill.effects) {
    if (eff.event !== "onCombat") continue;
    if (eff.action === "atkUp") result.atkDelta += eff.amount || 0;
    if (eff.action === "conditionalAtkUp") {
      const hitSlot6 = eff.condition === "slot6" && slot === 6;
      const hitEven = eff.condition === "evenSlot" && [2, 4, 6, 8].includes(slot);
      if (hitSlot6 || hitEven) {
        result.atkDelta += eff.amount || 0;
        if (eff.extra === "firstStrike") result.firstStrike = true;
      }
    }
    if (eff.action === "firstStrike") result.firstStrike = true;
    if (eff.action === "reflectDmg") result.reflectDmg += eff.amount || 0;
    if (eff.action === "healOnCombat") result.heal += eff.amount || 0;

    // 护甲损失等量伤害：把“护甲被打掉的量”转为对玩家的伤害（由 BattleResolver 在计算 applyDamage 后落地）
    if (eff.action === "armorLossDmg") {
      if (!eff.condition) result.armorLossDmg = true;
      if (eff.condition === "leftCol" && isOnLeftCol(slot)) result.armorLossDmg = true;
    }

    // 嗜血：按造成给玩家的实际伤害，获得攻击增量（由 BattleResolver 在 takeDamage 后落地）
    if (eff.action === "atkPerDamage") {
      result.atkPerDamageAmount = Math.max(0, eff.amount || 0);
    }
  }
  return result;
}

/** 刷新光环（离开相邻格后失效） */
export function refreshAuraEffects(grid) {
  const monsters = [];
  for (let i = 1; i <= 9; i++) {
    const c = grid.slotContents[i];
    if (c?.cardData?.type === "monster") monsters.push({ slot: i, container: c, card: c.cardData });
  }

  monsters.forEach(({ card }) => clearTempBonuses(card));
  monsters.forEach(({ slot, card }) => {
    const effects = card.skill?.effects || [];
    for (const eff of effects) {
      if (eff.event === "auraAdjacentAtk" && (eff.condition === "always" || isOnLeftCol(slot))) {
        for (const target of monsters) {
          if (target.card === card) continue;
          if (GridManager.isOrthogonalAdjacent(slot, target.slot)) addTempAtkBonus(target.card, eff.amount || 1);
        }
      }
    }
  });

  monsters.forEach(({ container }) => refreshMonsterCardDisplay(container));
}

/** 技能位移导致位置变化时（灼热观察） */
export function processSkillMoveGlobalEffects(ctx, move) {
  if (![MoveReason.SKILL_MOVE, MoveReason.SKILL_SWAP].includes(move.reason)) return;
  for (let i = 1; i <= 9; i++) {
    const c = ctx.grid.slotContents[i];
    const skillName = c?.cardData?.skill?.name;
    if (skillName === "灼热观察") {
      gameState.takeDamage(1);
      ctx.logEvent("hotObserve", { observerSlot: i, dmg: 1 });
    }
  }
}

/** 与随机怪物换位，返回产生的移动记录 */
function swapWithRandomMonster(grid, selfSlot, reason) {
  const candidates = [];
  for (let i = 1; i <= 9; i++) {
    if (i === 5 || i === selfSlot) continue;
    const c = grid.slotContents[i];
    if (c?.cardData?.type === "monster") candidates.push(i);
  }
  if (candidates.length === 0) return [];

  const targetSlot = candidates[Math.floor(Math.random() * candidates.length)];
  return grid.swapSlotsInstant(selfSlot, targetSlot, reason);
}

function swapWithRandomHelp(grid, selfSlot) {
  const candidates = [];
  for (let i = 1; i <= 9; i++) {
    if (i === 5 || i === selfSlot) continue;
    const c = grid.slotContents[i];
    if (c?.cardData?.type === "help") candidates.push(i);
  }
  if (candidates.length === 0) return [];
  const targetSlot = candidates[Math.floor(Math.random() * candidates.length)];
  return grid.swapSlotsInstant(selfSlot, targetSlot, MoveReason.SKILL_SWAP);
}

function buffRandomOtherMonster(grid, selfSlot, eff) {
  const others = [];
  for (let i = 1; i <= 9; i++) {
    if (i === 5 || i === selfSlot) continue;
    const c = grid.slotContents[i];
    if (c?.cardData?.type === "monster") others.push(c);
  }
  if (others.length === 0) return;
  const target = others[Math.floor(Math.random() * others.length)];
  if (Math.random() < 0.5) addPermanentAtk(target.cardData, eff.atkAmount || 1);
  else addPermanentArmor(target.cardData, eff.armorAmount || 2);
  refreshMonsterCardDisplay(target);
}

function stealAdjacentArmor(grid, selfSlot, amount, selfCard) {
  let total = 0;
  for (let i = 1; i <= 9; i++) {
    if (!GridManager.isOrthogonalAdjacent(selfSlot, i)) continue;
    const c = grid.slotContents[i];
    if (!c?.cardData || c.cardData.type !== "monster") continue;
    const take = Math.min(c.cardData.armor || 0, amount);
    if (take <= 0) continue;
    c.cardData.armor -= take;
    total += take;
    refreshMonsterCardDisplay(c);
  }
  if (total > 0) addPermanentArmor(selfCard, total);
}

function armorToPlayerDamage(cardData, cost) {
  if ((cardData.armor || 0) < cost) return;
  cardData.armor -= cost;
  gameState.takeDamage(cost);
}

function spawnCardsToDeck(cards) {
  for (const template of cards) {
    const spawned = { ...template, uid: nextCardUid(template.id || "spawn") };
    gameState.shuffleCardToDeck(spawned);
  }
}

function sacrificeById(ctx, targetId) {
  for (let i = 1; i <= 9; i++) {
    const c = ctx.grid.slotContents[i];
    if (!c?.cardData || c.cardData.id !== targetId) continue;
    ctx.removeCard(i, c, { reason: "skill_sacrifice", animate: true });
  }
}

function removeAdjacentHelp(ctx, slot, maxCount = 1) {
  let removed = 0;
  for (let i = 1; i <= 9; i++) {
    if (removed >= maxCount) break;
    if (!GridManager.isOrthogonalAdjacent(slot, i)) continue;
    const c = ctx.grid.slotContents[i];
    if (!c?.cardData || c.cardData.type !== "help") continue;
    ctx.removeCard(i, c, { reason: "skill_remove_adj_help", animate: true });
    removed++;
  }
}

function moveAdjacentHelpToDeckAndReplace(ctx, slot) {
  for (let i = 1; i <= 9; i++) {
    if (!GridManager.isOrthogonalAdjacent(slot, i)) continue;
    const c = ctx.grid.slotContents[i];
    if (!c?.cardData || c.cardData.type !== "help") continue;
    gameState.shuffleCardToDeck(c.cardData);
    ctx.removeCard(i, c, { reason: "skill_express_help_to_deck", animate: false });
    const deckCard = gameState.drawFromBattleDeck();
    if (!deckCard) return;
    const pos = ctx.grid.getSlotXY(i);
    const created = deckCard.type === "monster"
      ? createMonsterCard(ctx.scene, deckCard, pos.x, pos.y)
      : createHelpCard(ctx.scene, deckCard, pos.x, pos.y);
    ctx.grid.slotContents[i] = created;
    return;
  }
}

function isOnLeftCol(slot) {
  return slot === 1 || slot === 4 || slot === 7;
}

/**
 * 执行派生自动战斗（不触发系统旋转）
 * @param {object} ctx
 * @param {number[]} slots
 * @param {Function} onAllDone
 */
export function runDerivedAutoBattles(ctx, slots, onAllDone) {
  const playerSlot = ctx.grid.getPlayerSlot?.() ?? 5;
  // 嘲讽：若存在处于正交相邻格的“嘲讽怪物”，派生自动战斗只能打它
  const tauntSlots = [];
  for (let s = 1; s <= 9; s++) {
    if (!GridManager.isOrthogonalAdjacent(playerSlot, s)) continue;
    const c = ctx.grid.slotContents[s];
    if (c?.cardData?.type === "monster" && c.cardData.hp > 0 && c.cardData.skill?.id === "taunt") {
      tauntSlots.push(s);
    }
  }

  const unique = (tauntSlots.length > 0)
    ? [tauntSlots.sort((a, b) => a - b)[0]]
    : [...new Set(slots)].filter((s) => s > 0 && s !== 5);
  if (unique.length === 0) {
    onAllDone();
    return;
  }

  let idx = 0;
  const runNext = () => {
    if (idx >= unique.length) {
      onAllDone();
      return;
    }
    const slot = unique[idx++];
    const container = ctx.grid.slotContents[slot];
    if (!container || container.cardData?.type !== "monster" || container.cardData.hp <= 0) {
      runNext();
      return;
    }
    resolveBattle(ctx.scene, ctx.grid, slot, container, { isDerived: true, onComplete: runNext });
  };
  runNext();
}
