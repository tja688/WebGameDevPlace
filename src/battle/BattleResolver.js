import EventBus, { GameEvents } from "../core/EventBus.js";
import gameState from "../core/GameState.js";
import { refreshMonsterCardDisplay } from "../cards/CardFactory.js";
import relicManager from "../systems/RelicManager.js";
import { HELP_CARDS } from "../data/HelpCardData.js";
import levelManager from "../systems/LevelManager.js";

// ============================================================
// BattleResolver — 战斗结算器（快速版）
// 所有延迟大幅缩短，确保即时响应
// ============================================================

export function resolveBattle(scene, gridManager, monsterSlot, monsterContainer) {
  if (gameState.isInputLocked()) return;

  const monsterData = monsterContainer.cardData;
  console.log(`[战斗] ${monsterData.name}(HP${monsterData.hp}/ATK${monsterData.atk}) vs 玩家(HP${gameState.hp}/ATK${gameState.getEffectiveAttack()})`);

  gameState.lockInput("combat");
  EventBus.emit(GameEvents.BATTLE_START, { monster: monsterData });

  let playerAtk = gameState.getEffectiveAttack();
  let monsterAtk = monsterData.atk;
  const monsterArmor = monsterData.armor;
  let playerFirst = true;
  const origAtk = monsterData.atk; // 记录原始攻击力

  // ---- 处理怪物技能 ----
  const skill = monsterData.skill;
  if (skill && skill.effects) {
    for (const eff of skill.effects) {
      if (eff.event === "onCombat") {
        switch (eff.action) {
          case "atkUp":
            monsterAtk += eff.amount || 0;
            console.log(`[技能] ${skill.name}: 攻击+${eff.amount} → ${monsterAtk}`);
            break;
          case "conditionalAtkUp":
            if ((eff.condition === "slot6" && monsterSlot === 6) ||
                (eff.condition === "evenSlot" && [2, 4, 6, 8].includes(monsterSlot))) {
              monsterAtk += eff.amount || 0;
              if (eff.extra === "firstStrike") playerFirst = false;
              console.log(`[技能] ${skill.name}: ${eff.condition}触发，攻击+${eff.amount}`);
            }
            break;
          case "armorLossDmg":
            if (eff.condition === "leftCol" && (monsterSlot === 1 || monsterSlot === 4 || monsterSlot === 7)) {
              const lost = monsterData.armor || 0;
              if (lost > 0) { monsterAtk += lost; console.log(`[技能] ${skill.name}: 左列护甲损失${lost}追加伤害`); }
            }
            break;
          case "firstStrike":
            playerFirst = false;
            console.log(`[技能] ${skill.name}: 先攻`);
            break;
          case "atkPerDamage":
            monsterAtk += Math.floor(monsterAtk / (eff.amount || 2));
            console.log(`[技能] ${skill.name}: 嗜血，攻击→${monsterAtk}`);
            break;
          case "healOnCombat":
            monsterData.hp = Math.min(monsterData.hp + (eff.amount || 1), monsterData.hp + (eff.amount || 1));
            console.log(`[技能] ${skill.name}: 战斗恢复+${eff.amount}`);
            break;
          case "reflectDmg":
            gameState.takeDamage(eff.amount || monsterAtk);
            console.log(`[技能] ${skill.name}: 反伤${eff.amount || monsterAtk}`);
            break;
        }
      }
    }
  }

  // 技能改变的攻击力/血量同步到卡面
  if (monsterAtk !== origAtk) monsterData.atk = monsterAtk;
  refreshMonsterCardDisplay(monsterContainer);

  // 阶段 1：立即结算伤害（近乎瞬时）
  scene.time.delayedCall(30, () => {
    if (playerFirst) {
      applyDamage(monsterData, playerAtk, monsterArmor);
      refreshMonsterCardDisplay(monsterContainer);
      flashDamage(scene, monsterContainer, playerAtk);

      if (monsterData.hp <= 0) {
        handleMonsterDeath(scene, gridManager, monsterSlot, monsterContainer, monsterData, true);
        return;
      }

      // 怪物反击（50ms 后）
      scene.time.delayedCall(50, () => {
        gameState.takeDamage(monsterAtk);
        if (gameState.hp <= 0) { handlePlayerDeath(scene); return; }
        finishBattle(scene, gridManager, false);
      });
    } else {
      gameState.takeDamage(monsterAtk);
      if (gameState.hp <= 0) { handlePlayerDeath(scene); return; }

      scene.time.delayedCall(50, () => {
        applyDamage(monsterData, playerAtk, monsterArmor);
        refreshMonsterCardDisplay(monsterContainer);
        flashDamage(scene, monsterContainer, playerAtk);

        if (monsterData.hp <= 0) {
          handleMonsterDeath(scene, gridManager, monsterSlot, monsterContainer, monsterData, true);
          return;
        }
        finishBattle(scene, gridManager, false);
      });
    }
  });
}

// ============================================================
// 伤害计算
// ============================================================

function applyDamage(targetData, attackerAtk, targetArmor) {
  const rawDmg = Math.max(0, attackerAtk);
  const armorLoss = Math.min(targetArmor, rawDmg);
  const hpLoss = rawDmg - armorLoss;
  targetData.armor = Math.max(0, targetArmor - armorLoss);
  targetData.hp = Math.max(0, targetData.hp - hpLoss);
}

// ============================================================
// 怪物死亡
// ============================================================

function handleMonsterDeath(scene, gridManager, slot, container, monsterData, shouldRotate) {
  console.log(`[战斗] ${monsterData.name} 被击杀！+5💰`);
  EventBus.emit(GameEvents.MONSTER_KILLED, { monster: monsterData, slot });
  // 处理怪物 onRemove 技能（护甲归零时等）
  if (monsterData.skill && monsterData.skill.effects) {
    for (const eff of monsterData.skill.effects) {
      if (eff.event === "onRemove" && eff.action === "dmgPlayer") {
        if (eff.condition === "armorZero" || !eff.condition) {
          gameState.takeDamage(eff.amount || 1);
          console.log(`[技能] ${monsterData.skill.name}: 被移除，对玩家造成${eff.amount}伤害`);
        }
      }
    }
  }

  gameState.addGold(5);
  EventBus.emit(GameEvents.MONSTER_REMOVED, { monster: monsterData, slot });

  // 精英/层主击杀奖励
  if (monsterData.isElite) {
    gameState.shuffleCardToDeck({ ...HELP_CARDS.chestWhite, type: "help", uid: `rew_elite_chest_${Date.now()}` });
    gameState.shuffleCardToDeck({ ...HELP_CARDS.goldCard, type: "help", uid: `rew_elite_gold_${Date.now()}` });
    gameState.shuffleCardToDeck({ id: "statUp", name: "属性提升卡", type: "help", rarity: "gold", effect: { type: "statChoice" }, desc: "攻击+1/护甲+1/血量+2", uid: `rew_elite_stat_${Date.now()}` });
    console.log("[精英奖励] 蓝色宝箱卡+金币卡+属性提升卡 洗入战斗卡组");
    // 导师卡三选一（仅强精英，节点>=4）
    if (levelManager.currentNode >= 4) {
      EventBus.emit(GameEvents.ELITE_KILLED, { monster: monsterData, slot });
    }
  }
  if (monsterData.isBoss) {
    // 层主：金色宝箱卡+2金币卡+属性提升卡
    gameState.shuffleCardToDeck({ id: "chestGold", name: "金色宝箱卡", type: "help", rarity: "gold", effect: { type: "chest", rarityPool: { white: 0, blue: 0.5, gold: 0.5 } }, uid: `rew_boss_gchest_${Date.now()}` });
    gameState.shuffleCardToDeck({ ...HELP_CARDS.goldCard, type: "help", uid: `rew_boss_gold1_${Date.now()}` });
    gameState.shuffleCardToDeck({ ...HELP_CARDS.goldCard, type: "help", uid: `rew_boss_gold2_${Date.now()}` });
    gameState.shuffleCardToDeck({ id: "statUp", name: "属性提升卡", type: "help", rarity: "gold", effect: { type: "statChoice" }, desc: "攻击+1/护甲+1/血量+2", uid: `rew_boss_stat_${Date.now()}` });
    console.log("[层主奖励] 金色宝箱卡+2金币卡+属性提升卡 洗入战斗卡组");
  }

  // 触发遗物 onKill 效果
  relicManager.triggerEffects("onKill", { scene, gridManager });

  // 死亡动画（缩小消失，150ms）
  scene.tweens.add({
    targets: container,
    scaleX: 0.1, scaleY: 0.1, alpha: 0,
    duration: 150,
    ease: "Power2",
    onComplete: () => container.destroy(),
  });
  gridManager.slotContents[slot] = null;

  finishBattle(scene, gridManager, shouldRotate);
}

// ============================================================
// 玩家死亡
// ============================================================

function handlePlayerDeath(scene) {
  console.log("[战斗] 💀 玩家死亡！");
  EventBus.emit(GameEvents.PLAYER_DIED);
  gameState.unlockInput("combat");
}

// ============================================================
// 战斗结束 → 补牌 → 旋转
// ============================================================

function finishBattle(scene, gridManager, shouldRotate) {
  EventBus.emit(GameEvents.BATTLE_END);
  gameState.unlockInput("combat");

  // 立即补牌（极短延迟）
  scene.time.delayedCall(50, () => {
    gridManager.refillEmptySlots(() => {
      if (shouldRotate) {
        gridManager.rotateGrid();
      }
    });
  });
}

// ============================================================
// 视觉辅助
// ============================================================

function flashDamage(scene, container, damage) {
  const text = scene.add.text(0, -30, `-${damage}`, {
    fontFamily: "Arial, sans-serif",
    fontSize: "20px",
    fontStyle: "bold",
    color: "#ff4444",
    stroke: "#000",
    strokeThickness: 2,
  }).setOrigin(0.5);
  container.add(text);

  scene.tweens.add({
    targets: text,
    y: -70, alpha: 0,
    duration: 600,
    ease: "Power2",
    onComplete: () => text.destroy(),
  });

  // 受击晃动
  scene.tweens.add({
    targets: container,
    x: container.x + 3,
    duration: 40,
    yoyo: true,
    repeat: 2,
  });
}
