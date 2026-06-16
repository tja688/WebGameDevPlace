import EventBus, { GameEvents } from "../core/EventBus.js";
import gameState from "../core/GameState.js";
import { refreshMonsterCardDisplay } from "../cards/CardFactory.js";
import { getBoardResolver } from "../systems/BoardActionResolver.js";
import { incrementCombatCount } from "../systems/CardRuntime.js";
import { processCombatSkillEffects, refreshAuraEffects } from "../systems/SkillRuntime.js";

// ============================================================
// BattleResolver — 战斗结算器
// 击杀走 killMonster → removeCard；战后走统一结算链
// ============================================================

/**
 * @param {Phaser.Scene} scene
 * @param {import('../grid/GridManager.js').default} gridManager
 * @param {number} monsterSlot
 * @param {Phaser.GameObjects.Container} monsterContainer
 * @param {{ isDerived?: boolean, onComplete?: () => void }} [options]
 */
export function resolveBattle(scene, gridManager, monsterSlot, monsterContainer, options = {}) {
  if (gameState.isInputLocked() && !options.isDerived) return;

  const { isDerived = false, onComplete } = options;
  const boardResolver = getBoardResolver(scene);
  const monsterData = monsterContainer.cardData;

  console.log(`[战斗] ${monsterData.name}(HP${monsterData.hp}/ATK${monsterData.atk}) vs 玩家(HP${gameState.hp}/ATK${gameState.getEffectiveAttack()})${isDerived ? " [派生]" : ""}`);

  if (!isDerived) gameState.lockInput("combat");
  EventBus.emit(GameEvents.BATTLE_START, { monster: monsterData });
  incrementCombatCount(monsterData);

  let playerAtk = gameState.getEffectiveAttack();
  let monsterAtk = monsterData.atk;
  const monsterArmor = monsterData.armor;
  let playerFirst = true;
  const combatEffects = processCombatSkillEffects(monsterData, monsterSlot);
  monsterAtk += combatEffects.atkDelta || 0;
  if (combatEffects.firstStrike) playerFirst = false;
  if (combatEffects.heal > 0) monsterData.hp += combatEffects.heal;
  if (combatEffects.reflectDmg > 0) gameState.takeDamage(combatEffects.reflectDmg);
  monsterData.atk = monsterAtk;
  refreshMonsterCardDisplay(monsterContainer);

  scene.time.delayedCall(30, () => {
    if (playerFirst) {
      applyDamage(monsterData, playerAtk, monsterArmor);
      refreshMonsterCardDisplay(monsterContainer);
      flashDamage(scene, monsterContainer, playerAtk);

      if (monsterData.hp <= 0) {
        handleMonsterDeath(scene, gridManager, boardResolver, monsterSlot, monsterContainer, monsterData, true, isDerived, onComplete);
        return;
      }

      scene.time.delayedCall(50, () => {
        gameState.takeDamage(monsterAtk);
        if (gameState.hp <= 0) { handlePlayerDeath(scene, isDerived); if (onComplete) onComplete(); return; }
        finishBattle(scene, gridManager, boardResolver, false, isDerived, onComplete);
      });
    } else {
      gameState.takeDamage(monsterAtk);
      if (gameState.hp <= 0) { handlePlayerDeath(scene, isDerived); if (onComplete) onComplete(); return; }

      scene.time.delayedCall(50, () => {
        applyDamage(monsterData, playerAtk, monsterArmor);
        refreshMonsterCardDisplay(monsterContainer);
        flashDamage(scene, monsterContainer, playerAtk);

        if (monsterData.hp <= 0) {
          handleMonsterDeath(scene, gridManager, boardResolver, monsterSlot, monsterContainer, monsterData, true, isDerived, onComplete);
          return;
        }
        finishBattle(scene, gridManager, boardResolver, false, isDerived, onComplete);
      });
    }
  });
}

function applyDamage(targetData, attackerAtk, targetArmor) {
  const rawDmg = Math.max(0, attackerAtk);
  const armorLoss = Math.min(targetArmor, rawDmg);
  const hpLoss = rawDmg - armorLoss;
  targetData.armor = Math.max(0, targetArmor - armorLoss);
  targetData.hp = Math.max(0, targetData.hp - hpLoss);
}

function handleMonsterDeath(scene, gridManager, boardResolver, slot, container, monsterData, shouldRotate, isDerived, onComplete) {
  console.log(`[战斗] ${monsterData.name} 被击杀！`);

  if (boardResolver) {
    boardResolver.killMonster(slot, container, { reason: isDerived ? "derived_battle" : "battle" });
  } else {
    container.destroy();
    gridManager.slotContents[slot] = null;
  }

  finishBattle(scene, gridManager, boardResolver, shouldRotate, isDerived, onComplete);
}

function handlePlayerDeath(scene, isDerived) {
  console.log("[战斗] 💀 玩家死亡！");
  EventBus.emit(GameEvents.PLAYER_DIED);
  if (!isDerived) gameState.unlockInput("combat");
}

function finishBattle(scene, gridManager, boardResolver, shouldRotate, isDerived, onComplete) {
  EventBus.emit(GameEvents.BATTLE_END);
  refreshAuraEffects(gridManager);
  if (!isDerived) gameState.unlockInput("combat");

  if (isDerived) {
    if (boardResolver) boardResolver.continueAfterDerivedBattle();
    if (onComplete) onComplete();
    return;
  }

  scene.time.delayedCall(50, () => {
    if (boardResolver) {
      boardResolver.runSettlementChain({ shouldRotate });
    } else {
      gridManager.refillEmptySlots(() => {
        if (shouldRotate) gridManager.rotateGrid();
      });
    }
    if (onComplete) onComplete();
  });
}

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

  scene.tweens.add({
    targets: container,
    x: container.x + 3,
    duration: 40,
    yoyo: true,
    repeat: 2,
  });
}
