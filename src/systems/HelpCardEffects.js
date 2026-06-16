import gameState from "../core/GameState.js";
import EventBus, { GameEvents } from "../core/EventBus.js";
import { refreshMonsterCardDisplay } from "../cards/CardFactory.js";
import relicManager from "../systems/RelicManager.js";

// ============================================================
// HelpCardEffects — 帮助卡效果执行器
// 根据效果类型对目标执行伤害/恢复/护甲/金币等
// ============================================================

/**
 * 执行帮助卡效果
 * @param {Phaser.Scene} scene
 * @param {Object} cardData — 帮助卡数据（含 effect 字段）
 * @param {Object|null} targetContainer — 目标怪物容器（伤害类效果需要），null 表示无特定目标
 * @returns {string} 结果描述文本
 */
export function executeHelpCardEffect(scene, cardData, targetContainer) {
  const effect = cardData.effect;
  if (!effect) return "无效果";

  // 触发遗物 onUseHelpCard 效果
  relicManager.triggerEffects("onUseHelpCard", { scene });

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
        // 怪物死亡
        EventBus.emit(GameEvents.MONSTER_KILLED, { monster, slot: -1 });
        gameState.addGold(5);
        EventBus.emit(GameEvents.MONSTER_REMOVED, { monster, slot: -1 });
        // 找到怪物所在格子并清空
        const grid = scene.gridManager;
        if (grid) {
          const slot = grid.getCurrentSlot(targetContainer);
          if (slot > 0) grid.slotContents[slot] = null;
        }
        // 移除视觉 + 补牌
        scene.tweens.add({
          targets: targetContainer,
          scaleX: 0.1, scaleY: 0.1, alpha: 0,
          duration: 150,
          onComplete: () => {
            targetContainer.destroy();
            if (grid) grid.refillEmptySlots();
          },
        });
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
            EventBus.emit(GameEvents.MONSTER_KILLED, { monster, slot: i });
            gameState.addGold(5);
            EventBus.emit(GameEvents.MONSTER_REMOVED, { monster, slot: i });
            scene.gridManager.slotContents[i] = null;
            container.destroy();
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
