import EventBus, { GameEvents } from "../core/EventBus.js";
import gameState from "../core/GameState.js";
import relicManager from "./RelicManager.js";
import { HELP_CARDS } from "../data/HelpCardData.js";
import levelManager from "./LevelManager.js";
import {
  processMoveSkillEffects,
  processRemoveSkillEffects,
  runDerivedAutoBattles,
  processSkillMoveGlobalEffects,
  refreshAuraEffects,
} from "./SkillRuntime.js";

// ============================================================
// BoardActionResolver — 统一结算链
// 补牌 → 旋转 → 移动触发 → 二次移除 → 二次补牌 → 通关检查
// ============================================================

const MAX_CHAIN_DEPTH = 32;

export class BoardActionResolver {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.grid = scene.gridManager;
    /** @type {Array<object>} 最近一次结算链事件日志 */
    this.lastChainLog = [];
    this._chainDepth = 0;
    this._actionActive = false;
  }

  logEvent(type, detail) {
    this.lastChainLog.push({ type, ...detail, t: Date.now() });
  }

  // ============================================================
  // killMonster / removeCard — 一等概念
  // ============================================================

  /**
   * 怪物因伤害血量归零被击杀
   * 顺序：killMonster → [击杀怪物时]遗物 → removeCard
   */
  killMonster(slot, container, meta = {}) {
    const monsterData = container.cardData;
    console.log(`[killMonster] ${monsterData.name} @格${slot}`);

    EventBus.emit(GameEvents.MONSTER_KILLED, { monster: monsterData, slot });
    this.logEvent("killMonster", { name: monsterData.name, slot });

    gameState.addGold(5);

    if (monsterData.isElite) {
      gameState.shuffleCardToDeck({ ...HELP_CARDS.chestWhite, type: "help", uid: `rew_elite_chest_${Date.now()}` });
      gameState.shuffleCardToDeck({ ...HELP_CARDS.goldCard, type: "help", uid: `rew_elite_gold_${Date.now()}` });
      gameState.shuffleCardToDeck({
        id: "statUp", name: "属性提升卡", type: "help", rarity: "gold",
        effect: { type: "statChoice" }, desc: "攻击+1/护甲+1/血量+2", uid: `rew_elite_stat_${Date.now()}`,
      });
      if (levelManager.currentNode >= 4) {
        EventBus.emit(GameEvents.ELITE_KILLED, { monster: monsterData, slot });
      }
    }
    if (monsterData.isBoss) {
      gameState.shuffleCardToDeck({
        id: "chestGold", name: "金色宝箱卡", type: "help", rarity: "gold",
        effect: { type: "chest", rarityPool: { white: 0, blue: 0.5, gold: 0.5 } },
        uid: `rew_boss_gchest_${Date.now()}`,
      });
      gameState.shuffleCardToDeck({ ...HELP_CARDS.goldCard, type: "help", uid: `rew_boss_gold1_${Date.now()}` });
      gameState.shuffleCardToDeck({ ...HELP_CARDS.goldCard, type: "help", uid: `rew_boss_gold2_${Date.now()}` });
      gameState.shuffleCardToDeck({
        id: "statUp", name: "属性提升卡", type: "help", rarity: "gold",
        effect: { type: "statChoice" }, desc: "攻击+1/护甲+1/血量+2", uid: `rew_boss_stat_${Date.now()}`,
      });
    }

    relicManager.triggerEffects("onKill", { scene: this.scene, gridManager: this.grid });

    this.removeCard(slot, container, { ...meta, wasKilled: true });
  }

  /**
   * 任意卡离开九宫格
   * 顺序：[被移除时]技能 → 销毁视觉
   */
  removeCard(slot, container, meta = {}) {
    const cardData = container?.cardData;
    if (!cardData) return;

    console.log(`[removeCard] ${cardData.name} @格${slot} reason=${meta.reason || "unknown"}`);
    this.logEvent("removeCard", { name: cardData.name, slot, wasKilled: !!meta.wasKilled });

    if (cardData.type === "monster") {
      processRemoveSkillEffects(this, slot, container, meta);
      EventBus.emit(GameEvents.MONSTER_REMOVED, { monster: cardData, slot, meta });
    } else {
      EventBus.emit(GameEvents.CARD_REMOVED, { card: cardData, slot, meta });
    }

    this.grid.slotContents[slot] = null;

    if (meta.animate !== false) {
      this.scene.tweens.add({
        targets: container,
        scaleX: 0.1, scaleY: 0.1, alpha: 0,
        duration: 150,
        ease: "Power2",
        onComplete: () => container.destroy(),
      });
    } else {
      container.destroy();
    }
  }

  // ============================================================
  // 玩家九宫格互动 → 统一结算链
  // ============================================================

  /**
   * 三类入口统一调用：战斗击杀后 / 拾取帮助卡 / 点击相邻空格
   * @param {{ shouldRotate: boolean, preDelay?: number }} options
   */
  runSettlementChain(options = {}) {
    const { shouldRotate, preDelay = 50 } = options;

    if (this._actionActive) {
      console.warn("[BoardActionResolver] 结算链已在执行中");
      return;
    }

    this._actionActive = true;
    this._chainDepth = 0;
    this.lastChainLog = [];
    gameState.lockInput("action");
    this.logEvent("chainStart", { shouldRotate });

    this.scene.time.delayedCall(preDelay, () => {
      this._refillThenRotate(shouldRotate, () => {
        this._actionActive = false;
        gameState.unlockInput("action");
        this.logEvent("chainEnd", {});
        console.log("[BoardActionResolver] 结算链完成");
      });
    });
  }

  /** 派生战斗结束后仅二次补牌，不旋转 */
  continueAfterDerivedBattle() {
    this.grid.refillEmptySlots(() => {
      this.grid.checkLevelClear();
    });
  }

  _refillThenRotate(shouldRotate, onDone) {
    this.grid.refillEmptySlots(() => {
      const afterMoves = (moves) => {
        this._processMoveChain(moves, 0, () => {
          this.grid.refillEmptySlots(() => {
            this.grid.checkLevelClear();
            onDone();
          });
        });
      };

      if (shouldRotate) {
        this.grid.rotateGrid({ onComplete: afterMoves });
      } else {
        afterMoves([]);
      }
    });
  }

  /**
   * 递归处理移动触发（含技能换位产生的额外移动）
   */
  _processMoveChain(moves, depth, onDone) {
    if (depth >= MAX_CHAIN_DEPTH) {
      console.warn(`[BoardActionResolver] 结算链深度超过 ${MAX_CHAIN_DEPTH}，强制停止`);
      onDone();
      return;
    }

    if (!moves || moves.length === 0) {
      onDone();
      return;
    }

    let extraMoves = [];
    const autoBattleSlots = [];

    for (const move of moves) {
      if (!move.card?.cardData || move.card.scene == null) continue;
      processSkillMoveGlobalEffects(this, move);
      const result = processMoveSkillEffects(this, move);
      extraMoves = extraMoves.concat(result.extraMoves);
      autoBattleSlots.push(...result.autoBattleSlots);
    }
    refreshAuraEffects(this.grid);

    const finishMovePhase = () => {
      if (extraMoves.length > 0) {
        this._processMoveChain(extraMoves, depth + 1, onDone);
      } else {
        onDone();
      }
    };

    if (autoBattleSlots.length > 0) {
      runDerivedAutoBattles(this, autoBattleSlots, finishMovePhase);
    } else {
      finishMovePhase();
    }
  }
}

/** 在 GameScene.create 后初始化 */
export function initBoardResolver(scene) {
  const resolver = new BoardActionResolver(scene);
  scene.boardResolver = resolver;
  return resolver;
}

/** @param {Phaser.Scene} scene */
export function getBoardResolver(scene) {
  return scene.boardResolver;
}
