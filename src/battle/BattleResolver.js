import EventBus, { GameEvents } from "../core/EventBus.js";
import gameState from "../core/GameState.js";
import { refreshMonsterCardDisplay } from "../cards/CardFactory.js";
import relicManager from "../systems/RelicManager.js";
import { HELP_CARDS } from "../data/HelpCardData.js";
import levelManager from "../systems/LevelManager.js";
import skillManager from "../systems/SkillManager.js";
import { MONSTER_TEMPLATES } from "../data/TestData.js";

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
  const origAtk = monsterData.atk;
  let shouldRotate = false;

  // ---- 处理玩家技能 ----
  // 历战：攻击+2
  if (skillManager.hasSkill("veteran")) {
    playerAtk += 2;
    console.log(`[玩家技能] 历战：攻击+2 → ${playerAtk}`);
  }

  // 石庇护：场上有庇护石时，其他怪物受到伤害-1
  let stoneShelterActive = false;
  for (let s = 1; s <= 9; s++) {
    const c = gridManager.slotContents[s];
    if (c && c.cardData?.skill?.id === "stoneShelter") { stoneShelterActive = true; break; }
  }
  if (stoneShelterActive && !monsterData.skill?.id?.includes("stoneShelter")) {
    playerAtk = Math.max(0, playerAtk - 1);
    console.log(`[石庇护] 玩家攻击-1（→${playerAtk}）`);
  }

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
            if (eff.condition === "hasFlame") {
              let hasFlame = false;
              // 检查场上
              for (let s = 1; s <= 9; s++) {
                const c = gridManager.slotContents[s];
                const cd = c && c.cardData;
                if (cd && (cd.id === "flame" || cd.name === "烈焰")) { hasFlame = true; break; }
              }
              // 检查道具牌格
              if (!hasFlame && scene._itemSlots) {
                for (const item of scene._itemSlots) {
                  if (item && item.cardData && (item.cardData.id === "flame" || item.cardData.name === "烈焰")) { hasFlame = true; break; }
                }
              }
              if (hasFlame) { monsterAtk += eff.amount || 0; console.log(`[技能-恋火] 发现烈焰，攻击+${eff.amount}`); }
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
          case "countFlameAtk":
            // 火之力：数烈焰数量（场上 + 道具牌格）×2
            let flameCount = 0;
            for (let s = 1; s <= 9; s++) {
              const c = gridManager.slotContents[s];
              if (c && c.cardData && (c.cardData.id === "flame" || c.cardData.name === "烈焰")) flameCount++;
            }
            // 道具牌格中的烈焰
            if (scene._itemSlots) {
              for (const item of scene._itemSlots) {
                if (item && item.cardData && (item.cardData.id === "flame" || item.cardData.name === "烈焰")) flameCount++;
              }
            }
            if (flameCount > 0) { monsterAtk += flameCount * (eff.amount || 2); console.log(`[技能] ${skill.name}: ${flameCount}张烈焰(含道具牌格)，攻击+${flameCount * 2}`); }
            break;
          case "armorLossAtk":
            // 石头爱好者：护甲损失时攻击+1（简化：战斗中攻击+1）
            if (monsterData.armor > 0) { monsterAtk += 1; console.log(`[技能] ${skill.name}: 护甲尚存，攻击+1`); }
            break;
          case "chainAtk":
            // 大聪明/学习成长：简化实现(攻击+1)
            monsterAtk += eff.amount || 1;
            console.log(`[技能] ${skill.name}: 连锁增长，攻击+${eff.amount || 1}`);
            break;
        }
      }
    }
  }

  // 刺皮：对怪物造成等同于其攻击的额外伤害
  if (skillManager.hasSkill("thornSkin")) {
    const thornDmg = monsterAtk;
    monsterData.hp = Math.max(0, monsterData.hp - thornDmg);
    console.log(`[玩家技能] 刺皮：反伤${thornDmg} → 怪物HP:${monsterData.hp}`);
  }

  // 技能改变的攻击力/血量同步到卡面
  if (monsterAtk !== origAtk) monsterData.atk = monsterAtk;
  refreshMonsterCardDisplay(monsterContainer);

  // 空间掌握：战斗后强制旋转
  if (skill && skill.effects) {
    for (const eff of skill.effects) {
      if (eff.event === "postCombat" && eff.action === "rotateBoard") {
        shouldRotate = true;
        console.log(`[空间掌握] 战斗后将触发旋转`);
        break;
      }
    }
  }

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
        finishBattle(scene, gridManager, shouldRotate);
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
        finishBattle(scene, gridManager, shouldRotate);
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
  // 处理怪物 onRemove 技能
  if (monsterData.skill && monsterData.skill.effects) {
    for (const eff of monsterData.skill.effects) {
      if (eff.event === "onRemove") {
        if (eff.action === "dmgPlayer") {
          if (eff.condition === "armorZero" || !eff.condition) {
            gameState.takeDamage(eff.amount || 1);
            console.log(`[技能] ${monsterData.skill.name}: 被移除，对玩家造成${eff.amount}伤害`);
          }
        }
        if (eff.action === "shuffleMonster") {
          const template = MONSTER_TEMPLATES[eff.monsterId];
          if (template) {
            gameState.shuffleCardToDeck({ ...template, uid: `gen_${Date.now()}_${Math.random().toString(36).slice(2,6)}` });
            console.log(`[技能] ${monsterData.skill.name}: ${template.name} 洗入战斗卡组`);
          }
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
  // 暴力卡：攻击翻倍后复原
  if (gameState._doubleAtkActive) {
    gameState.atk = Math.ceil(gameState.atk / 2);
    gameState._doubleAtkActive = false;
    console.log(`[暴力卡] 攻击复原 → ${gameState.atk}`);
  }

  EventBus.emit(GameEvents.BATTLE_END);
  gameState.unlockInput("combat");

  // 和我打：相邻怪物有该技能时自动触发战斗
  const adjTo5 = [2, 4, 6, 8];
  for (const a of adjTo5) {
    const c = gridManager.slotContents[a];
    if (c && c.cardData?.type === "monster" && c.cardData.hp > 0 && c.scene) {
      const sk = c.cardData.skill;
      if (sk && sk.effects) {
        for (const eff of sk.effects) {
          if (eff.event === "onAllyFight" && eff.action === "autoBattle") {
            console.log(`[和我打] ${sk.name}: 格${a}自动战斗`);
            scene.time.delayedCall(400, () => resolveBattle(scene, gridManager, a, c));
            return; // 只触发一次，先打完这个再说
          }
        }
      }
    }
  }

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
