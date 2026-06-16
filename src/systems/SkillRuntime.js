import GridManager from "../grid/GridManager.js";
import gameState from "../core/GameState.js";
import { MoveReason } from "../core/MoveReason.js";
import { incrementMoveCount, nextCardUid } from "./CardRuntime.js";
import { resolveBattle } from "../battle/BattleResolver.js";

// ============================================================
// SkillRuntime — 怪物技能事件分发（第一段代表性技能）
// ============================================================

/**
 * 处理单张卡的移动后技能
 * @param {object} ctx — BoardActionResolver 上下文
 * @param {{ card: object, cardData: object, fromSlot: number, toSlot: number, reason: string }} move
 * @returns {{ extraMoves: Array, autoBattleSlots: number[] }}
 */
export function processMoveSkillEffects(ctx, move) {
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
      if (eff.action === "swapRandomMonster") {
        const swaps = swapWithRandomMonster(grid, move.toSlot, MoveReason.SKILL_SWAP);
        extraMoves.push(...swaps);
        console.log(`[技能] ${cardData.skill.name}: 第${moveCount}次移动，与随机怪物换位`);
        ctx.logEvent("onMoveEveryN", { card: cardData.name, n: eff.n, action: "swapRandomMonster" });
      }
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

/**
 * 执行派生自动战斗（不触发系统旋转）
 * @param {object} ctx
 * @param {number[]} slots
 * @param {Function} onAllDone
 */
export function runDerivedAutoBattles(ctx, slots, onAllDone) {
  const unique = [...new Set(slots)].filter((s) => s > 0 && s !== 5);
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
