import gameState from "../core/GameState.js";
import EventBus, { GameEvents } from "../core/EventBus.js";
import { refreshMonsterCardDisplay } from "../cards/CardFactory.js";
import GridManager from "../grid/GridManager.js";
import relicManager from "../systems/RelicManager.js";
import { ensureCardRuntime } from "./CardRuntime.js";

// ============================================================
// HelpCardEffects — 帮助卡效果执行器
// 根据效果类型对目标执行伤害/恢复/护甲/金币等
// ============================================================

/**
 * 执行帮助卡效果
 * @param {Phaser.Scene} scene
 * @param {Object} cardData — 帮助卡数据（含 effect 字段）
 * @param {Object|null} targetContainer — 目标怪物容器（伤害类效果需要），null 表示无特定目标
 * @param {{ triggerRelics?: boolean }} [options]
 * @returns {string} 结果描述文本
 */
export function executeHelpCardEffect(scene, cardData, targetContainer, options = {}) {
  const { triggerRelics = true } = options;

  // 位置效果卡：使用时多数只“移除本卡”，实际位置规则由结算链处理
  // 但使用行为仍应触发遗物 onUseHelpCard（如废物利用机）。
  if (triggerRelics) relicManager.triggerEffects("onUseHelpCard", { scene });

  if (cardData?.id === "flame") {
    const dmg = 4;
    gameState.takeDamage(dmg);
    return `${cardData.name}：对玩家造成 ${dmg} 点伤害（烈焰永久移除）`;
  }

  if (["rollingRock", "bearTrap", "healingFountain", "lookoutTower", "multiplierTower"].includes(cardData?.id)) {
    return `${cardData.name}：移除本卡（无额外效果）`;
  }

  const effect = cardData?.effect;
  if (!effect) return "无效果";

  switch (effect.type) {
    case "damage": {
      if (!targetContainer) return "需要选择目标怪物";
      const dmg = resolveAmount(effect.amount);
      const monster = targetContainer.cardData;
      const armorLoss = Math.min(monster.armor, dmg);
      const hpLoss = dmg - armorLoss;
      monster.armor = Math.max(0, monster.armor - armorLoss);
      monster.hp = Math.max(0, monster.hp - hpLoss);
      refreshMonsterCardDisplay(targetContainer);

      // 伤害飘字
      showFloatText(scene, targetContainer, dmg);

      if (monster.hp <= 0) {
        // 怪物死亡：必须走 boardResolver.killMonster，确保 onKill/onRemove/金币规则一致
        const boardResolver = scene.boardResolver;
        const grid = scene.gridManager;
        const slot = grid?.getCurrentSlot?.(targetContainer);
        if (boardResolver && typeof slot === "number" && slot > 0) {
          boardResolver.killMonster(slot, targetContainer, {
            reason: "help_card_damage",
            wasKilledBy: "help_card_damage",
            animate: false,
          });
        } else {
          // 兜底：找不到格子时直接销毁（不走技能/遗物语义）
          if (grid && typeof slot === "number" && slot > 0) grid.slotContents[slot] = null;
          targetContainer.destroy();
        }

        // 补牌（不旋转：帮助卡使用是“直接效果”）
        grid?.refillEmptySlots();
        return `${cardData.name}：对 ${monster.name} 造成 ${dmg} 点伤害，击杀！+5💰`;
      }
      return `${cardData.name}：对 ${monster.name} 造成 ${dmg} 点伤害`;
    }

    case "aoe_damage": {
      const dmg = resolveAmount(effect.amount);
      let count = 0;
      for (let i = 1; i <= 9; i++) {
        const container = scene.gridManager?.slotContents[i];
        if (container && container.cardData?.type === "monster") {
          const monster = container.cardData;
          const armorLoss = Math.min(monster.armor, dmg);
          const hpLoss = dmg - armorLoss;
          monster.armor = Math.max(0, monster.armor - armorLoss);
          monster.hp = Math.max(0, monster.hp - hpLoss);
          refreshMonsterCardDisplay(container);
          showFloatText(scene, container, dmg);
          if (monster.hp <= 0) {
            const boardResolver = scene.boardResolver;
            if (boardResolver) {
              boardResolver.killMonster(i, container, {
                reason: "help_card_aoe_damage",
                wasKilledBy: "help_card_aoe_damage",
                animate: false,
              });
            } else {
              scene.gridManager.slotContents[i] = null;
              container.destroy();
            }
          }
          count++;
        }
      }
      // AOE 后补牌
      if (scene.gridManager) {
        scene.gridManager.refillEmptySlots();
      }
      return `${cardData.name}：对所有怪物造成 ${dmg} 点伤害（${count} 个目标）`;
    }

    case "dmgPlayer": {
      const amount = resolveAmount(effect.amount);
      const taken = gameState.takeDamage(amount);
      return `${cardData.name}：对玩家造成 ${taken} 点伤害`;
    }

    case "remove_self": {
      return `${cardData.name}：移除本卡（无额外效果）`;
    }

    case "heal": {
      const amount = resolveAmount(effect.amount);
      const healed = gameState.heal(amount);
      return `${cardData.name}：恢复 ${healed} 点血量`;
    }

    case "full_heal": {
      const healed = gameState.heal(999);
      return `${cardData.name}：血量回满（+${healed}）`;
    }

    case "shield": {
      const amount = resolveAmount(effect.amount);
      gameState.addArmor(amount);
      return `${cardData.name}：获得 ${amount} 点护甲`;
    }

    case "gold": {
      const amount = resolveAmount(effect.amount);
      gameState.addGold(amount);
      return `${cardData.name}：获得 ${amount} 金币`;
    }

    case "blessed": {
      // 庇佑：标记玩家下一次受伤免疫
      gameState._blessed = true;
      return `${cardData.name}：下一次受到伤害变为0`;
    }

    case "reduce_armor": {
      if (!targetContainer) return "需要选择目标怪物";
      const amount = resolveAmount(effect.amount);
      targetContainer.cardData.armor = Math.max(0, targetContainer.cardData.armor - amount);
      refreshMonsterCardDisplay(targetContainer);
      return `${cardData.name}：${targetContainer.cardData.name} 护甲 -${amount}`;
    }

    default:
      return `${cardData.name}：效果未实现（${effect.type}）`;
  }
}

/** 解析效果数值（支持固定数字或 "playerAtk" 等动态值） */
function resolveAmount(amount) {
  if (amount === "playerAtk") return gameState.getEffectiveAttack();
  return amount || 0;
}

/** 伤害飘字 */
function showFloatText(scene, container, dmg) {
  const txt = scene.add.text(0, -30, `-${dmg}`, {
    fontFamily: "Arial, sans-serif",
    fontSize: "18px",
    fontStyle: "bold",
    color: "#ff4444",
    stroke: "#000",
    strokeThickness: 2,
  }).setOrigin(0.5);
  container.add(txt);
  scene.tweens.add({
    targets: txt, y: -70, alpha: 0, duration: 600,
    onComplete: () => txt.destroy(),
  });
}

// ============================================================
// 位置信号：帮助卡在九宫格上的移动/补牌触发
// ============================================================

/**
 * 处理帮助卡移动触发
 * @param {import("./BoardActionResolver.js").BoardActionResolver} ctx
 * @param {{ card: any, cardData: object, fromSlot: number, toSlot: number }} move
 */
export function processHelpMoveEffects(ctx, move) {
  const cardData = move?.cardData;
  if (!cardData || cardData.type !== "help") return;

  const grid = ctx.grid;
  const toSlot = move.toSlot;

  // 滚石：移动到格3，且格6为普通怪物 → 移除格6怪物，并移除本卡
  if (cardData.id === "rollingRock" && toSlot === 3) {
    const target = grid.slotContents[6];
    const targetData = target?.cardData;
    if (targetData?.type === "monster" && !targetData.isElite && !targetData.isBoss) {
      ctx.logEvent?.("helpRollingRockRemoveMonster", { from: move.fromSlot, to: move.toSlot, targetSlot: 6 });
      ctx.removeCard(6, target, { reason: "help_rollingRock_remove_monster", animate: false });
      ctx.removeCard(toSlot, move.card, { reason: "help_rollingRock_remove_self", animate: false });
    }
    return;
  }

  // 治疗泉：移动到玩家正交相邻格 → 恢复2HP
  if (cardData.id === "healingFountain" && GridManager.isOrthogonalAdjacent(grid.getPlayerSlot(), toSlot)) {
    const healed = gameState.heal(2);
    ctx.logEvent?.("helpHealingFountainHeal", { slot: toSlot, healed });
    return;
  }

  // 瞭望塔：移动到格1/3/7/9 → 随机对怪物造成3点伤害（触发4次后移除）
  if (cardData.id === "lookoutTower" && [1, 3, 7, 9].includes(toSlot)) {
    const rt = ensureCardRuntime(cardData);
    if (rt.lookoutRemaining === undefined) rt.lookoutRemaining = 4;
    if (rt.lookoutRemaining <= 0) return;

    const candidates = [];
    for (let s = 1; s <= 9; s++) {
      const c = grid.slotContents[s];
      if (c?.cardData?.type === "monster" && c.cardData.hp > 0) candidates.push({ slot: s, container: c });
    }

    const dmg = 3;
    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      applyFixedDamageToMonster(ctx, picked.slot, picked.container, dmg, "help_lookoutTower_damage");
    }

    rt.lookoutRemaining -= 1;
    ctx.logEvent?.("helpLookoutTowerTrigger", { slot: toSlot, remaining: rt.lookoutRemaining, targetCount: candidates.length });

    if (rt.lookoutRemaining <= 0) {
      ctx.removeCard(toSlot, move.card, { reason: "help_lookoutTower_remove_self", animate: false });
    }
    return;
  }

  // 烈焰：移动到玩家正交相邻格 → 对玩家造成2点伤害
  if (cardData.id === "flame" && GridManager.isOrthogonalAdjacent(grid.getPlayerSlot(), toSlot)) {
    const taken = gameState.takeDamage(2);
    ctx.logEvent?.("helpFlameDamagePlayer", { slot: toSlot, taken });
    return;
  }
}

/**
 * 处理帮助卡补牌触发（例如捕熊陷阱）
 * @param {import("./BoardActionResolver.js").BoardActionResolver} ctx
 * @param {number} filledSlot
 */
export function processHelpRefillEffects(ctx, filledSlot) {
  const filled = ctx.grid.slotContents[filledSlot];
  const filledData = filled?.cardData;
  if (!filled || filledData?.type !== "monster") return;

  // 捕熊陷阱：当正交相邻格补牌时，若为怪物卡 → 对其造成10点伤害，并移除本卡
  const dmg = 10;
  for (let trapSlot = 1; trapSlot <= 9; trapSlot++) {
    if (!GridManager.isOrthogonalAdjacent(trapSlot, filledSlot)) continue;
    const trap = ctx.grid.slotContents[trapSlot];
    const trapData = trap?.cardData;
    if (!trap || trapData?.type !== "help" || trapData.id !== "bearTrap") continue;

    // 目标可能被上一张陷阱击杀并移除：每次取最新容器
    const currentTarget = ctx.grid.slotContents[filledSlot];
    if (currentTarget?.cardData && currentTarget.cardData.type === "monster") {
      applyFixedDamageToMonster(ctx, filledSlot, currentTarget, dmg, "help_bearTrap_damage");
    }
    ctx.removeCard(trapSlot, trap, { reason: "help_bearTrap_remove_self", animate: false });
  }
}

function applyFixedDamageToMonster(ctx, slot, container, dmg, reason) {
  const monster = container.cardData;
  const armorLoss = Math.min(monster.armor || 0, dmg);
  const hpLoss = dmg - armorLoss;
  monster.armor = Math.max(0, (monster.armor || 0) - armorLoss);
  monster.hp = Math.max(0, (monster.hp || 0) - hpLoss);
  refreshMonsterCardDisplay(container);

  ctx.logEvent?.("helpDamageToMonster", { reason, slot, dmg, armorLoss, hpLoss, remainHp: monster.hp });

  if (monster.hp <= 0) {
    ctx.killMonster(slot, container, { reason, wasKilledBy: reason, animate: false });
  }
}
