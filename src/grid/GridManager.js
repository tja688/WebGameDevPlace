import Phaser from "phaser";
import { GRID, COLORS, DEPTH, FONTS } from "../config/GameConfig.js";
import EventBus, { GameEvents } from "../core/EventBus.js";
import gameState from "../core/GameState.js";
import { createMonsterCard, createHelpCard } from "../cards/CardFactory.js";
import { MoveReason } from "../core/MoveReason.js";

// ============================================================
// GridManager — 九宫格战场管理器
// 负责：坐标计算、渲染、卡牌放置/移除、旋转动画、补牌
//
// 格子编号（行优先）：
//   格1  格2  格3
//   格4  格5  格6
//   格7  格8  格9
// ============================================================

/** 顺时针旋转路径（除格5外）：1→2→3→6→9→8→7→4→1 */
const ROTATION_ORDER = [1, 2, 3, 6, 9, 8, 7, 4];

export default class GridManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    /** 9 个格子的世界坐标 */
    this.slotPositions = [];

    /** 格子上的卡牌引用 (Container|null) */
    this.slotContents = new Array(10).fill(null);

    /** 格子背景图引用 */
    this.slotBgs = new Array(10).fill(null);

    /** 格子标签引用 */
    this.slotLabels = new Array(10).fill(null);

    /** 玩家卡容器的子引用（用于动态更新属性显示） */
    this.playerStatTexts = null;

    /** 补牌防抖 */
    this._isRefilling = false;
    this._pendingRefill = false;

    this.initPositions();
  }

  // ============================================================
  // 坐标计算
  // ============================================================

  initPositions() {
    const { CELL_WIDTH, CELL_HEIGHT, GAP } = GRID;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col + 1;
        this.slotPositions[idx] = {
          x: GRID.X + col * (CELL_WIDTH + GAP) + CELL_WIDTH / 2,
          y: GRID.Y + row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2,
        };
      }
    }
  }

  getSlotXY(idx) {
    return this.slotPositions[idx];
  }

  getPlayerSlot() {
    return 5;
  }

  getSlotAt(px, py) {
    const { CELL_WIDTH, CELL_HEIGHT } = GRID;
    for (let i = 1; i <= 9; i++) {
      const p = this.slotPositions[i];
      if (
        px >= p.x - CELL_WIDTH / 2 &&
        px <= p.x + CELL_WIDTH / 2 &&
        py >= p.y - CELL_HEIGHT / 2 &&
        py <= p.y + CELL_HEIGHT / 2
      ) {
        return i;
      }
    }
    return null;
  }

  isEmpty(idx) {
    return this.slotContents[idx] === null;
  }

  /** 根据容器引用反查当前格子编号 */
  getCurrentSlot(container) {
    for (let i = 1; i <= 9; i++) {
      if (this.slotContents[i] === container) return i;
    }
    return -1;
  }

  getEmptySlots() {
    const e = [];
    for (let i = 1; i <= 9; i++) {
      if (this.isEmpty(i)) e.push(i);
    }
    return e;
  }

  /** 判断两个格子是否正交相邻 */
  static isOrthogonalAdjacent(a, b) {
    const adj = {
      1: [2, 4],
      2: [1, 3, 5],
      3: [2, 6],
      4: [1, 5, 7],
      5: [2, 4, 6, 8],
      6: [3, 5, 9],
      7: [4, 8],
      8: [5, 7, 9],
      9: [6, 8],
    };
    return (adj[a] || []).includes(b);
  }

  // ============================================================
  // 渲染
  // ============================================================

  render() {
    const { X, Y, COLS, ROWS, CELL_WIDTH, CELL_HEIGHT, GAP } = GRID;
    const areaW = COLS * CELL_WIDTH + (COLS - 1) * GAP + 12;
    const areaH = ROWS * CELL_HEIGHT + (ROWS - 1) * GAP + 12;

    this.scene.add
      .rectangle(X + areaW / 2 - 6, Y + areaH / 2 - 6, areaW, areaH, COLORS.BG_PANEL, 0.6)
      .setDepth(DEPTH.GRID)
      .setOrigin(0.5)
      .setStrokeStyle(1, COLORS.CELL_BORDER, 0.5);

    for (let i = 1; i <= 9; i++) {
      const pos = this.slotPositions[i];
      const isPlayerSlot = i === this.getPlayerSlot();

      const bgKey = isPlayerSlot ? "card-bg-player" : "card-bg-empty";
      const bg = this.scene.add
        .image(pos.x, pos.y, bgKey)
        .setDepth(DEPTH.GRID)
        .setOrigin(0.5);
      this.slotBgs[i] = bg;

      const label = this.scene.add
        .text(pos.x - CELL_WIDTH / 2 + 4, pos.y - CELL_HEIGHT / 2 + 2, `格${i}`, {
          fontFamily: FONTS.FAMILY,
          fontSize: "9px",
          color: COLORS.TEXT_SECONDARY,
        })
        .setDepth(DEPTH.UI_TEXT);
      this.slotLabels[i] = label;

      if (isPlayerSlot) {
        this.renderPlayerCard(pos);
      }
    }

    console.log("[GridManager] 九宫格渲染完成");
  }

  renderPlayerCard(pos) {
    const { CELL_WIDTH, CELL_HEIGHT } = GRID;

    const container = this.scene.add
      .container(pos.x, pos.y)
      .setDepth(DEPTH.CARDS);

    const nameBar = this.scene.add
      .rectangle(0, -CELL_HEIGHT / 2 + 11, CELL_WIDTH - 4, 18, 0x000000, 0.4)
      .setOrigin(0.5);

    const nameText = this.scene.add
      .text(0, -CELL_HEIGHT / 2 + 11, "玩家", {
        fontFamily: FONTS.FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    container.add([nameBar, nameText]);

    // 属性显示（使用 GameState 数值）
    const statY = CELL_HEIGHT / 2 - 30;
    const statTexts = this.createPlayerStatTexts(statY);
    statTexts.forEach((t) => container.add(t));

    this.slotContents[5] = container;
  }

  createPlayerStatTexts(statY) {
    const stats = [
      { key: "hp", icon: "❤️", value: `${gameState.hp}/${gameState.getEffectiveMaxHp()}`, x: -20, color: "#ff7777" },
      { key: "atk", icon: "⚔️", value: `${gameState.getEffectiveAttack()}`, x: 0, color: "#ffdd77" },
      { key: "armor", icon: "🛡️", value: `${gameState.getEffectiveArmor()}`, x: 20, color: "#77bbff" },
    ];

    return stats.map((s) =>
      this.scene.add
        .text(s.x, statY, `${s.icon}\n${s.value}`, {
          fontFamily: FONTS.FAMILY,
          fontSize: "12px",
          fontStyle: "bold",
          color: s.color,
          align: "center",
        })
        .setOrigin(0.5)
    );
  }

  /** 更新玩家卡上的属性显示 */
  updatePlayerCardStats() {
    const container = this.slotContents[5];
    if (!container) return;

    // 移除旧的属性文字（保留前两个是 nameBar + nameText）
    while (container.length > 2) {
      const child = container.getAt(container.length - 1);
      container.remove(child, true);
    }

    const { CELL_HEIGHT } = GRID;
    const statY = CELL_HEIGHT / 2 - 30;
    const statTexts = this.createPlayerStatTexts(statY);
    statTexts.forEach((t) => container.add(t));
  }

  // ============================================================
  // 卡牌放置
  // ============================================================

  placeAt(slotIndex, card) {
    const pos = this.slotPositions[slotIndex];
    if (!pos) return;
    card.setPosition(pos.x, pos.y);
    card.setDepth(DEPTH.CARDS);
    this.slotContents[slotIndex] = card;
  }

  removeAt(slotIndex) {
    const card = this.slotContents[slotIndex];
    if (card) {
      card.destroy();
      this.slotContents[slotIndex] = null;
    }
    return card;
  }

  /**
   * 逻辑换位（即时，无动画）— 技能用
   * @returns {Array<{ card, cardData, fromSlot, toSlot, reason }>}
   */
  swapSlotsInstant(slotA, slotB, reason = MoveReason.SKILL_SWAP) {
    const cardA = this.slotContents[slotA];
    const cardB = this.slotContents[slotB];
    const moves = [];

    this.slotContents[slotA] = cardB ?? null;
    this.slotContents[slotB] = cardA ?? null;

    if (cardA) {
      const pos = this.slotPositions[slotB];
      cardA.setPosition(pos.x, pos.y);
      moves.push({ card: cardA, cardData: cardA.cardData, fromSlot: slotA, toSlot: slotB, reason });
    }
    if (cardB) {
      const pos = this.slotPositions[slotA];
      cardB.setPosition(pos.x, pos.y);
      moves.push({ card: cardB, cardData: cardB.cardData, fromSlot: slotB, toSlot: slotA, reason });
    }

    return moves;
  }

  /**
   * 逻辑移动单卡（即时）
   * @returns {{ card, cardData, fromSlot, toSlot, reason }|null}
   */
  moveCardInstant(fromSlot, toSlot, reason = MoveReason.SKILL_MOVE) {
    const card = this.slotContents[fromSlot];
    if (!card || fromSlot === toSlot) return null;

    this.slotContents[fromSlot] = null;
    this.slotContents[toSlot] = card;
    const pos = this.slotPositions[toSlot];
    card.setPosition(pos.x, pos.y);

    return { card, cardData: card.cardData, fromSlot, toSlot, reason };
  }

  // ============================================================
  // 九宫格旋转（顺时针）
  // ============================================================

  /**
   * 除格5外，其余8格按顺时针路径旋转
   * @param {{ onComplete?: (moves: Array) => void, reason?: string }} [options]
   */
  rotateGrid(options = {}) {
    const onComplete = typeof options === "function" ? options : options.onComplete;
    const reason = (typeof options === "object" && options.reason) || MoveReason.SYSTEM_ROTATE;

    const movingCards = [];

    for (let i = 0; i < ROTATION_ORDER.length; i++) {
      const fromSlot = ROTATION_ORDER[i];
      const toSlot = ROTATION_ORDER[(i + 1) % ROTATION_ORDER.length];

      if (!this.isEmpty(fromSlot)) {
        const card = this.slotContents[fromSlot];
        const targetPos = this.slotPositions[toSlot];
        movingCards.push({
          card, cardData: card.cardData, fromSlot, toSlot, reason,
          targetX: targetPos.x, targetY: targetPos.y,
        });
      }
    }

    this._isRotating = true;
    console.log(`[GridManager] 旋转开始 — ${movingCards.length} 张卡牌移动`);

    const srcSlots = new Set(movingCards.map((m) => m.fromSlot));
    srcSlots.forEach((s) => {
      this.slotContents[s] = null;
    });

    let completed = 0;
    const total = movingCards.length;

    const finish = () => {
      this._isRotating = false;
      console.log("[GridManager] 旋转完成");
      EventBus.emit(GameEvents.GRID_ROTATED);
      const moveRecords = movingCards.map(({ card, cardData, fromSlot, toSlot }) => ({
        card, cardData, fromSlot, toSlot, reason,
      }));
      if (onComplete) onComplete(moveRecords);
    };

    if (total === 0) {
      finish();
      return;
    }

    movingCards.forEach(({ card, toSlot, targetX, targetY }) => {
      this.scene.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        duration: 200,
        ease: "Power2",
        onComplete: () => {
          this.slotContents[toSlot] = card;
          completed++;
          if (completed >= total) finish();
        },
      });
    });
  }

  // ============================================================
  // 空格补牌
  // ============================================================

  /**
   * 填充所有空格子（带防抖）
   * @param {Function} [onComplete]
   */
  refillEmptySlots(onComplete) {
    if (this._isRefilling) {
      this._pendingRefill = true;
      return;
    }

    const emptySlots = this.getEmptySlots();
    if (emptySlots.length === 0) {
      this.checkLevelClear();  // 先检测通关，再执行回调（避免旋转中阻断）
      if (onComplete) onComplete();
      return;
    }

    this._isRefilling = true;
    gameState.lockInput("refill");
    EventBus.emit(GameEvents.REFILL_START, { emptySlots });

    console.log(`[GridManager] 开始补牌 — ${emptySlots.length} 个空格`);

    this._refillStep(emptySlots, 0, () => {
      this._isRefilling = false;
      gameState.unlockInput("refill");
      EventBus.emit(GameEvents.REFILL_END);

      // 处理积压的补牌请求
      if (this._pendingRefill) {
        this._pendingRefill = false;
        this.refillEmptySlots();
      }

      // 先检测通关再触发旋转（避免旋转中 _isRotating 阻断检测）
      this.checkLevelClear();
      if (onComplete) onComplete();
    });
  }

  /**
   * 逐个补牌（递归 + 延迟）
   */
  _refillStep(slots, index, onDone) {
    if (index >= slots.length) {
      onDone();
      return;
    }

    const slotIndex = slots[index];
    const cardData = gameState.drawFromBattleDeck();

    if (!cardData) {
      // 卡组已空
      console.log("[GridManager] 战斗卡组为空，停止补牌");
      onDone();
      return;
    }

    // 创建卡牌视觉
    const pos = this.slotPositions[slotIndex];
    let card;
    if (cardData.type === "monster") {
      card = createMonsterCard(this.scene, cardData, pos.x, pos.y - 500); // 从上方飞入
    } else {
      card = createHelpCard(this.scene, cardData, pos.x, pos.y - 500);
    }

    this.slotContents[slotIndex] = card;
    EventBus.emit(GameEvents.SLOT_FILLED, { slot: slotIndex, card: cardData });

    // 飞入动画（200ms）
    this.scene.tweens.add({
      targets: card,
      y: pos.y,
      duration: 200,
      ease: "Bounce.easeOut",
    });

    // 下一张延迟 100ms
    this.scene.time.delayedCall(100, () => {
      this._refillStep(slots, index + 1, onDone);
    });
  }

  // ============================================================
  // 通关检查
  // ============================================================

  checkLevelClear() {
    // 旋转/补牌过程中不检测，避免临时空槽误判
    if (this._isRotating || this._isRefilling) return;
    if (gameState.getBattleDeckCount() > 0) return;

    // 检查场上是否还有怪物卡
    let hasMonster = false;
    for (let i = 1; i <= 9; i++) {
      const card = this.slotContents[i];
      if (card && card.cardData && card.cardData.type === "monster") {
        hasMonster = true;
        break;
      }
    }

    if (!hasMonster) {
      console.log("[GridManager] 🎉 关卡通关！战斗卡组空 + 场上无怪物");
      EventBus.emit(GameEvents.LEVEL_CLEAR);
    }
  }
}
