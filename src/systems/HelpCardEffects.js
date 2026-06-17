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
      gameState._blessed = true;
      return `${cardData.name}：下一次受到伤害变为0`;
    }

    case "damage_to_player": {
      const dmg = resolveAmount(effect.amount);
      gameState.takeDamage(dmg);
      return `${cardData.name}：对玩家造成 ${dmg} 点伤害`;
    }

    case "reverse_rotate": {
      // 逆时针旋转 = 连续7次顺时针旋转
      if (scene.gridManager) {
        for (let i = 0; i < 7; i++) {
          scene.time.delayedCall(i * 50, () => scene.gridManager.rotateGrid());
        }
      }
      return `${cardData.name}：逆时针旋转一次`;
    }

    case "double_atk_temp": {
      gameState.atk *= 2;
      gameState._doubleAtkActive = true;
      return `${cardData.name}：攻击翻倍，战斗一次后复原`;
    }

    case "shuffle_back": {
      if (!targetContainer) return "需要选择目标";
      const target = targetContainer.cardData;
      gameState.shuffleCardToDeck(target);
      if (scene.gridManager) {
        const slot = scene.gridManager.getCurrentSlot(targetContainer);
        if (slot > 0) scene.gridManager.slotContents[slot] = null;
        targetContainer.destroy();
        scene.gridManager.refillEmptySlots();
      }
      return `${cardData.name}：${target.name} 洗回战斗卡组`;
    }

    case "swap_two_cards": {
      // 由 GameScene 处理两次瞄准
      return `${cardData.name}：已互换两张卡牌位置`;
    }

    case "kidnap": {
      if (!targetContainer) return "需要选择目标怪物";
      const target = targetContainer.cardData;
      if (target.isElite || target.isBoss) return "无法对精英/层主使用";
      const armorGain = target.armor || 0;
      if (scene.gridManager) {
        const slot = scene.gridManager.getCurrentSlot(targetContainer);
        if (slot > 0) scene.gridManager.slotContents[slot] = null;
        targetContainer.destroy();
        scene.gridManager.refillEmptySlots();
      }
      gameState.addArmor(armorGain);
      gameState.addGold(5);
      return `${cardData.name}：移除 ${target.name}，获得 ${armorGain} 护甲，+5💰`;
    }

    case "blood_convert": {
      gameState.addMaxHp(-5);
      const roll = Math.random();
      if (roll < 0.25) { gameState.addAttack(1); return `${cardData.name}：血量上限-5，攻击+1`; }
      if (roll < 0.5) { gameState.baseArmor += 1; return `${cardData.name}：血量上限-5，基础护甲+1`; }
      if (roll < 0.75) { gameState.addGold(50); return `${cardData.name}：血量上限-5，+50💰`; }
      // 随机遗物（简化：+2血量上限）
      gameState.addMaxHp(2);
      return `${cardData.name}：血量上限-5，+2血量上限`;
    }

    case "damage_hp_based": {
      if (!targetContainer) return "需要选择目标怪物";
      const dmg = gameState.hp;
      const monster = targetContainer.cardData;
      const armorLoss = Math.min(monster.armor, dmg);
      const hpLoss = dmg - armorLoss;
      monster.armor = Math.max(0, monster.armor - armorLoss);
      monster.hp = Math.max(0, monster.hp - hpLoss);
      refreshMonsterCardDisplay(targetContainer);
      showFloatText(scene, targetContainer, dmg);
      if (monster.hp <= 0) {
        killMonster(scene, targetContainer, monster);
      }
      return `${cardData.name}：造成 ${dmg} 点伤害（基于当前血量）`;
    }

    case "damage_armor_based": {
      if (!targetContainer) return "需要选择目标怪物";
      const dmg = gameState.getEffectiveArmor();
      const monster = targetContainer.cardData;
      const armorLoss = Math.min(monster.armor, dmg);
      const hpLoss = dmg - armorLoss;
      monster.armor = Math.max(0, monster.armor - armorLoss);
      monster.hp = Math.max(0, monster.hp - hpLoss);
      refreshMonsterCardDisplay(targetContainer);
      showFloatText(scene, targetContainer, dmg);
      if (monster.hp <= 0) {
        killMonster(scene, targetContainer, monster);
      }
      return `${cardData.name}：造成 ${dmg} 点伤害（基于当前护甲）`;
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

/** 帮助卡击杀怪物 */
function killMonster(scene, container, monsterData) {
  EventBus.emit(GameEvents.MONSTER_KILLED, { monster: monsterData, slot: -1 });
  gameState.addGold(5);
  EventBus.emit(GameEvents.MONSTER_REMOVED, { monster: monsterData, slot: -1 });
  if (scene.gridManager) {
    const slot = scene.gridManager.getCurrentSlot(container);
    if (slot > 0) scene.gridManager.slotContents[slot] = null;
    scene.gridManager.refillEmptySlots();
  }
  container.destroy();
}

/** 伤害飘字 */
function showFloatText(scene, container, dmg) {
  const txt = scene.add.text(0, -30, `-${dmg}`, {
    fontFamily: '"Courier New", Consolas, "Microsoft YaHei", monospace',
    fontSize: "18px",
    fontStyle: "bold",
    color: "#D85A27",
    stroke: "#120D08",
    strokeThickness: 1,
  }).setOrigin(0.5);
  container.add(txt);
  scene.tweens.add({
    targets: txt, y: -70, alpha: 0, duration: 600,
    onComplete: () => txt.destroy(),
  });
}
