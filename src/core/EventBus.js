import Phaser from "phaser";

// ============================================================
// 事件总线 — 全局游戏事件中心
// 使用 Phaser EventEmitter，单例模式
// ============================================================

/** 事件名称常量 */
export const GameEvents = {
  // 战斗
  BATTLE_START: "battle-start",
  BATTLE_END: "battle-end",
  MONSTER_KILLED: "monster-killed",
  MONSTER_REMOVED: "monster-removed",
  CARD_REMOVED: "card-removed",
  PLAYER_DAMAGED: "player-damaged",
  PLAYER_DIED: "player-died",

  // 卡牌交互
  CARD_CLICKED: "card-clicked",
  CARD_PICKED_UP: "card-picked-up",
  CARD_USED: "card-used",

  // 棋盘
  GRID_ROTATED: "grid-rotated",
  REFILL_START: "refill-start",
  REFILL_END: "refill-end",
  SLOT_FILLED: "slot-filled",

  // 输入
  INPUT_LOCKED: "input-locked",
  INPUT_UNLOCKED: "input-unlocked",

  // 关卡
  LEVEL_START: "level-start",
  LEVEL_CLEAR: "level-clear",
  ELITE_KILLED: "elite-killed",

  // 玩家
  PLAYER_HP_CHANGED: "player-hp-changed",
  PLAYER_ATK_CHANGED: "player-atk-changed",
  PLAYER_ARMOR_CHANGED: "player-armor-changed",
  GOLD_CHANGED: "gold-changed",
};

/** 全局事件总线单例 */
const EventBus = new Phaser.Events.EventEmitter();

export default EventBus;
