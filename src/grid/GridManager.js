import Phaser from "phaser";
import { GRID, COLORS, DEPTH, FONTS } from "../config/GameConfig.js";
import EventBus, { GameEvents } from "../core/EventBus.js";
import gameState from "../core/GameState.js";
import { createMonsterCard, createHelpCard, refreshMonsterCardDisplay } from "../cards/CardFactory.js";
import { MONSTER_TEMPLATES } from "../data/TestData.js";
import { resolveBattle } from "../battle/BattleResolver.js";

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
    return (GridManager._getAdjacentSlots(a) || []).includes(b);
  }

  /** 获取指定格子的正交相邻格列表 */
  static _getAdjacentSlots(slot) {
    const adj = {
      1: [2, 4], 2: [1, 3, 5], 3: [2, 6],
      4: [1, 5, 7], 5: [2, 4, 6, 8], 6: [3, 5, 9],
      7: [4, 8], 8: [5, 7, 9], 9: [6, 8],
    };
    return adj[slot] || [];
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

  // ============================================================
  // 九宫格旋转（顺时针）
  // ============================================================

  /**
   * 除格5外，其余8格按顺时针路径旋转
   * @param {Function} [onComplete] — 旋转完成回调
   */
  rotateGrid(onComplete) {
    const { CELL_WIDTH, CELL_HEIGHT } = GRID;
    const movingCards = [];

    // 按旋转顺序收集非空格子上的卡牌和目标位置
    for (let i = 0; i < ROTATION_ORDER.length; i++) {
      const fromSlot = ROTATION_ORDER[i];
      const toSlot = ROTATION_ORDER[(i + 1) % ROTATION_ORDER.length];

      if (!this.isEmpty(fromSlot)) {
        const card = this.slotContents[fromSlot];
        const targetPos = this.slotPositions[toSlot];
        movingCards.push({ card, fromSlot, toSlot, targetX: targetPos.x, targetY: targetPos.y });
      }
    }

    this._isRotating = true;
    console.log(`[GridManager] 旋转开始 — ${movingCards.length} 张卡牌移动`);

    // 暂时清空所有参与旋转的格子（视觉上卡牌正在移动中）
    const srcSlots = new Set(movingCards.map((m) => m.fromSlot));
    srcSlots.forEach((s) => {
      this.slotContents[s] = null;
    });

    // 并发 tween 所有卡牌
    let completed = 0;
    const total = movingCards.length;

    if (total === 0) {
      this._isRotating = false;
      if (onComplete) onComplete();
      EventBus.emit(GameEvents.GRID_ROTATED);
      return;
    }

    // 记录本回合移动的怪物UUID集合（防止同一怪物多次计数）
    const movedUids = new Set();

    movingCards.forEach(({ card, toSlot, targetX, targetY }) => {
      this.scene.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        duration: 200,
        ease: "Power2",
        onComplete: () => {
          this.slotContents[toSlot] = card;
          // 移动计数
          if (card && card.cardData) {
            card.cardData._moveCount = (card.cardData._moveCount || 0) + 1;
            movedUids.add(card.cardData.uid);
          }
          completed++;
          if (completed >= total) {
            this._isRotating = false;
            console.log("[GridManager] 旋转完成");
            // 处理移动触发技能
            this.processOnMoveSkills(movedUids);
            EventBus.emit(GameEvents.GRID_ROTATED);
            if (onComplete) onComplete();
          }
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
  // 棋盘操作（技能系统用）
  // ============================================================

  /** 交换两个格子上的卡牌 */
  swapCards(slotA, slotB) {
    const cardA = this.slotContents[slotA];
    const cardB = this.slotContents[slotB];
    if (slotA === slotB) return;
    // 视觉位置交换
    if (cardA) {
      const posB = this.slotPositions[slotB];
      this.scene.tweens.add({ targets: cardA, x: posB.x, y: posB.y, duration: 200, ease: "Power2" });
    }
    if (cardB) {
      const posA = this.slotPositions[slotA];
      this.scene.tweens.add({ targets: cardB, x: posA.x, y: posA.y, duration: 200, ease: "Power2" });
    }
    // 数据交换
    this.slotContents[slotA] = cardB;
    this.slotContents[slotB] = cardA;
    console.log(`[棋盘操作] 交换格${slotA}↔格${slotB}`);
  }

  /** 技能驱动移除卡牌（不触发击杀奖励，但触发被移除技能） */
  removeCardFromGrid(slot) {
    const card = this.slotContents[slot];
    if (!card) return;
    const cardData = card.cardData;
    // 先触发被移除技能（如献身→烈焰洗入）
    if (cardData && cardData.skill && cardData.skill.effects) {
      for (const eff of cardData.skill.effects) {
        if (eff.event === "onRemove" && eff.action === "shuffleMonster") {
          const template = MONSTER_TEMPLATES[eff.monsterId];
          if (template) {
            this.shuffleMonsterToDeck(template);
            console.log(`[被移除技能] ${cardData.skill.name}: ${template.name} 洗入战斗卡组`);
          }
        }
      }
    }
    this.slotContents[slot] = null;
    card.destroy();
    console.log(`[棋盘操作] 技能移除格${slot}的${cardData?.name || '卡牌'}`);
  }

  /** 生成怪物洗入战斗卡组 */
  shuffleMonsterToDeck(monsterTemplate, uid = null) {
    const copy = { ...monsterTemplate, uid: uid || `gen_${Date.now()}_${Math.random().toString(36).slice(2,6)}` };
    gameState.shuffleCardToDeck(copy);
    console.log(`[棋盘操作] ${copy.name} 洗入战斗卡组`);
    return copy;
  }

  // ============================================================
  // 移动触发技能
  // ============================================================

  /** 旋转完成后处理所有卡牌的移动触发技能 + 被动技能刷新 */
  processOnMoveSkills(movedUids) {
    // 先检查被动技能（如恋火）
    this._refreshPassiveSkills();

    for (let s = 1; s <= 9; s++) {
      const card = this.slotContents[s];
      if (!card || !card.cardData) continue;
      const data = card.cardData;
      // 怪物技能
      const skill = data.skill;
      // 帮助卡场上技能（如烈焰）
      const fieldSkill = data.onFieldSkill;

      const allEffects = [
        ...(skill && skill.effects ? skill.effects : []),
        ...(fieldSkill && fieldSkill.effects ? fieldSkill.effects : []),
      ];

      for (const eff of allEffects) {
        // 移动到上排时
        if (eff.event === "onMoveToTopRow" && [1, 2, 3].includes(s)) {
          this._executeSkillEffect(eff, s, card);
        }
        // 移动到下排时
        if (eff.event === "onMoveToBotRow" && [7, 8, 9].includes(s)) {
          this._executeSkillEffect(eff, s, card);
        }
        // 移动到玩家正交相邻格时
        if (eff.event === "onMoveToAdjacent") {
          if (GridManager._getAdjacentSlots(5).includes(s)) {
            this._executeSkillEffect(eff, s, card);
          }
        }
        // 移动到格X时
        if (eff.event === "onMoveToSlot") {
          if (eff.slot === s) {
            this._executeSkillEffect(eff, s, card);
          }
        }
        // 移动到角落格
        if (eff.event === "onMoveToCorner") {
          if ([1, 3, 7, 9].includes(s)) {
            this._executeSkillEffect(eff, s, card);
          }
        }
        // 每移动N次触发
        if (eff.event === "onMoveCount") {
          const count = data._moveCount || 0;
          if (count > 0 && count % (eff.every || 1) === 0 && movedUids.has(data.uid)) {
            this._executeSkillEffect(eff, s, card);
          }
        }
      }
    }
  }

  /** 刷新所有被动技能（每旋转后调用） */
  _refreshPassiveSkills() {
    // 检查场上+道具牌格是否有烈焰
    let hasFlame = false;
    for (let s = 1; s <= 9; s++) {
      const c = this.slotContents[s];
      if (c && c.cardData && (c.cardData.id === "flame" || c.cardData.name === "烈焰")) { hasFlame = true; break; }
    }
    if (!hasFlame && this.scene._itemSlots) {
      for (const item of this.scene._itemSlots) {
        if (item && item.cardData && (item.cardData.id === "flame" || item.cardData.name === "烈焰")) { hasFlame = true; break; }
      }
    }
    // 更新所有带被动技能的怪物卡面
    for (let s = 1; s <= 9; s++) {
      const c = this.slotContents[s];
      if (!c || !c.cardData || !c.cardData.skill) continue;
      const skill = c.cardData.skill;
      if (skill._passive && skill._passiveCheck === "hasFlame") {
        if (hasFlame) {
          c.cardData.atk = skill._passiveBaseAtk + skill._passiveAtk;
        } else {
          c.cardData.atk = skill._passiveBaseAtk;
        }
        refreshMonsterCardDisplay(c);
      }
    }
  }

  /** 执行单个技能效果 */
  _executeSkillEffect(eff, slot, card) {
    const data = card.cardData;
    const name = data.skill ? data.skill.name : data.name;
    switch (eff.action) {
      case "dmgPlayer":
        gameState.takeDamage(eff.amount || 1);
        console.log(`[移动技能] ${name}: 对玩家造成${eff.amount || 1}伤害 (格${slot})`);
        break;
      case "reduceOwnArmor":
        data.armor = Math.max(0, data.armor - (eff.amount || 1));
        console.log(`[移动技能] ${name}: 自身护甲-${eff.amount || 1} (格${slot})`);
        break;
      case "reducePlayerArmor":
        gameState.currentArmor = Math.max(0, gameState.currentArmor - (eff.amount || 1));
        console.log(`[移动技能] ${name}: 玩家护甲-${eff.amount || 1}`);
        break;
      case "rotateBoard":
        console.log(`[移动技能] ${name}: 触发旋转`);
        this.scene.time.delayedCall(100, () => this.rotateGrid());
        break;
      case "atkUp":
        data.atk += eff.amount || 1;
        console.log(`[移动技能] ${name}: 攻击+${eff.amount || 1} (格${slot})`);
        break;
      case "swapWithRandom":
        // 随机与另一张怪物卡换位
        const targets = [];
        for (let i = 1; i <= 9; i++) {
          if (i !== slot && this.slotContents[i] && this.slotContents[i].cardData?.type === "monster") {
            targets.push(i);
          }
        }
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          this.swapCards(slot, t);
          console.log(`[移动技能] ${name}: 随机换位 格${slot}↔格${t}`);
        }
        break;
      case "swapWithHelp":
        // 随机与一张帮助卡换位
        const helpTargets = [];
        for (let i = 1; i <= 9; i++) {
          if (i !== slot && this.slotContents[i] && this.slotContents[i].cardData?.type === "help") {
            helpTargets.push(i);
          }
        }
        if (helpTargets.length > 0) {
          const t = helpTargets[Math.floor(Math.random() * helpTargets.length)];
          this.swapCards(slot, t);
          console.log(`[移动技能] ${name}: 与帮助卡换位 格${slot}↔格${t}`);
        }
        break;
      case "removeAdjacentHelp":
        // 移除正交相邻的帮助卡
        const adj = GridManager._getAdjacentSlots(slot);
        for (const a of adj) {
          const c = this.slotContents[a];
          if (c && c.cardData?.type === "help") {
            this.removeCardFromGrid(a);
            console.log(`[移动技能] ${name}: 移除格${a}帮助卡`);
          }
        }
        break;
      case "buffOtherMonsters":
        // 其他怪物获得护甲
        for (let i = 1; i <= 9; i++) {
          if (i !== slot && this.slotContents[i] && this.slotContents[i].cardData?.type === "monster") {
            this.slotContents[i].cardData.armor += eff.amount || 2;
          }
        }
        console.log(`[移动技能] ${name}: 其他怪物护甲+${eff.amount || 2}`);
        break;
      case "buffAdjacentMonsters":
        // 相邻怪物攻击+1
        const adjSlots = GridManager._getAdjacentSlots(slot);
        for (const a of adjSlots) {
          const c = this.slotContents[a];
          if (c && c.cardData?.type === "monster") {
            c.cardData.atk += eff.amount || 1;
            console.log(`[移动技能] ${name}: 格${a}攻击+${eff.amount || 1}`);
          }
        }
        break;
      case "healAllMonsters":
        for (let i = 1; i <= 9; i++) {
          const c = this.slotContents[i];
          if (c && c.cardData?.type === "monster") {
            c.cardData.hp += eff.amount || 4;
          }
        }
        console.log(`[移动技能] ${name}: 所有怪物恢复${eff.amount || 4}HP`);
        break;
      case "shuffleMonster":
        if (eff.monsterId) {
          const template = MONSTER_TEMPLATES[eff.monsterId];
          if (template) this.shuffleMonsterToDeck(template);
        }
        break;
      case "removeAllMonsters":
        for (let i = 1; i <= 9; i++) {
          const c = this.slotContents[i];
          if (c && c.cardData && c.cardData.id === eff.monsterId) {
            this.removeCardFromGrid(i);
            console.log(`[移动技能] ${name}: 移除格${i}的${c.cardData.name}`);
          }
        }
        break;
      case "removeAdjacent":
        // 移除正交相邻的所有卡牌
        const rmAdj = GridManager._getAdjacentSlots(slot);
        for (const a of rmAdj) {
          if (this.slotContents[a] && a !== 5) { this.removeCardFromGrid(a); }
        }
        console.log(`[移动技能] ${name}: 移除相邻卡牌`);
        break;
      case "drainArmor":
        // 扣除相邻怪物护甲并使本卡获得等量护甲
        const drainAdj = GridManager._getAdjacentSlots(slot);
        for (const a of drainAdj) {
          const c = this.slotContents[a];
          if (c && c.cardData?.type === "monster" && c.cardData.armor >= (eff.amount || 1)) {
            c.cardData.armor -= eff.amount || 1;
            data.armor += eff.amount || 1;
            console.log(`[移动技能] ${name}: 从格${a}吸取${eff.amount}护甲`);
            break;
          }
        }
        break;
      case "autoBattle":
        // 不休追击：自动与玩家战斗
        console.log(`[自动战斗] ${name}: 移动到相邻格，触发自动战斗 (格${slot})`);
        this.scene.time.delayedCall(200, () => {
          resolveBattle(this.scene, this, slot, card);
        });
        break;
      case "giftItem":
        // 将烈焰/旋转轮等放入道具牌格（通过场景事件）
        this.scene.events.emit("skill-gift-item", { itemId: eff.itemId || "flame" });
        console.log(`[移动技能] ${name}: ${eff.itemId || "flame"} 放入道具牌格`);
        break;
      case "killSlot6Monster":
        // 滚石：移除格6的普通怪物
        if (slot === 3) {
          const c6 = this.slotContents[6];
          if (c6 && c6.cardData?.type === "monster" && !c6.cardData.isElite && !c6.cardData.isBoss) {
            this.removeCardFromGrid(6);
            this.removeCardFromGrid(slot); // 移除自身
            console.log(`[场上技能] ${name}: 滚石碾压格6怪物，移除自身`);
          }
        }
        break;
      case "removeSelf":
        this.removeCardFromGrid(slot);
        console.log(`[场上技能] ${name}: 移除自身`);
        break;
      case "healPlayer":
        gameState.heal(eff.amount || 2);
        console.log(`[场上技能] ${name}: 恢复玩家${eff.amount || 2}HP`);
        break;
      case "stoneShelter":
        // 石庇护：其他怪物伤害-1（标记在 cardData 上）
        data._dmgReduction = (data._dmgReduction || 0) + 1;
        console.log(`[技能] ${name}: 其他怪物伤害-1`);
        break;
      case "postCombatRotate":
        // 空间掌握：战斗后旋转（标记，由 BattleResolver 处理）
        data._postCombatRotate = true;
        break;
    }
    // 刷新卡面
    refreshMonsterCardDisplay(card);
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
