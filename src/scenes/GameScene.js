import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, GRID, COLORS, FONTS, LAYOUT, DEPTH,
} from "../config/GameConfig.js";
import GridManager from "../grid/GridManager.js";
import EventBus, { GameEvents } from "../core/EventBus.js";
import gameState from "../core/GameState.js";
import { createMonsterCard, createHelpCard, refreshMonsterCardDisplay } from "../cards/CardFactory.js";
import { resolveBattle } from "../battle/BattleResolver.js";
import { HELP_CARDS, rollHelpCards } from "../data/HelpCardData.js";
import { executeHelpCardEffect } from "../systems/HelpCardEffects.js";
import { showSelectionOverlay } from "../ui/overlays/SelectionOverlay.js";
import relicManager from "../systems/RelicManager.js";
import skillManager from "../systems/SkillManager.js";
import { rollRelics } from "../data/RelicData.js";
import levelManager from "../systems/LevelManager.js";
import { initBoardResolver } from "../systems/BoardActionResolver.js";
import { processEnterSkillEffects } from "../systems/SkillRuntime.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    gameState.resetAll();

    // 初始化管理器
    relicManager.setScene(this);
    relicManager.onUpdate(() => this.renderEquipmentBar());
    levelManager.setScene(this);
    levelManager.reset();
    levelManager.initStartingDeck();

    // 监听节点推进事件
    this.events.on("advance-node", () => {
      this.rebuildLevel();
    });

    // 监听房间按钮显示事件
    this.events.on("show-room-buttons", (data) => {
      this.showRoomButtons(data.rooms);
    });

    // 背景
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BG_DARK).setDepth(DEPTH.BG);

    // 道具牌格状态
    this._itemSlots = new Array(5).fill(null);
    this._itemSlotContainers = [];

    // 瞄准模式状态
    /** @type {{ cardData: object, itemIdx: number, highlights: Array }|null } */
    this._targetingMode = null;

    // 构建 UI
    this.buildPlayerInfo();
    this.buildEquipmentBar();
    this.buildBattlefield();
    this.buildItemSlots();
    this.buildDeckArea();
    this.buildSkillPanel();

    // 底层点击处理
    this.input.on("pointerdown", (pointer) => {
      this.handlePointerClick(pointer);
    });

    // 鼠标移动 → 悬停检测怪物技能
    this.input.on("pointermove", (pointer) => {
      this.handlePointerHover(pointer);
    });

    // ---- 开发者修改器（键盘快捷键） ----
    this.input.keyboard.on("keydown", (event) => {
      switch (event.key) {
        case "1": gameState.atk = 99; this.gridManager.updatePlayerCardStats(); this.updatePlayerInfoPanel(); console.log("[修改器] 攻击设为99"); break;
        case "2": gameState.addGold(999); console.log("[修改器] +999💰"); break;
        case "3": gameState.heal(999); gameState.addArmor(99); this.gridManager.updatePlayerCardStats(); this.updatePlayerInfoPanel(); console.log("[修改器] 满血+99护甲"); break;
        case "0": // 清空场上所有怪物
          for (let i = 1; i <= 9; i++) {
            const c = this.gridManager.slotContents[i];
            if (c && c.cardData?.type === "monster") {
              c.destroy();
              this.gridManager.slotContents[i] = null;
            }
          }
          console.log("[修改器] 清空所有怪物");
          break;
        case "4": {
          const monsterId = window.prompt("dev：输入要生成的怪物 id（例如 spikeStone）") || "";
          const slotStr = window.prompt("dev：输入目标格子（1-9，不能为5）") || "";
          const slot = parseInt(slotStr, 10);
          if (!monsterId) break;
          this.devSpawnMonsterToSlot(monsterId, slot);
          break;
        }
        case "5":
          this.devTriggerRotationOnce();
          break;
        case "6":
          this.devDumpLastChainLog();
          break;
        case "7":
          this.devPrintCardRuntime();
          break;
        case "8":
          this.devRunThirdPhaseValidation();
          break;
      }
    });

    // 设置测试关卡
    this.setupTestLevel();

    // 事件监听
    this.setupEventListeners();
  }

  // ============================================================
  // 场景级点击处理（核心改动）
  // ============================================================

  handlePointerClick(pointer) {
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    console.log(`[点击] (${Math.round(wx)},${Math.round(wy)}) locked=${gameState.isInputLocked()} aim=${!!this._targetingMode}`);

    // ---- 装备栏右键丢弃 ----
    if (pointer.rightButtonDown()) {
      const relicIdx = this.getEquipSlotAt(wx, wy);
      if (relicIdx >= 0 && relicManager.slots[relicIdx]) {
        relicManager.discard(relicIdx);
        this.gridManager.updatePlayerCardStats();
        this.updatePlayerInfoPanel();
        return;
      }
    }

    // ---- 瞄准模式下：只响应怪物点击 ----
    if (this._targetingMode) {
      if (gameState.isInputLocked()) return;
      const slot = this.gridManager.getSlotAt(wx, wy);
      if (slot < 1 || slot > 9) return;
      const container = this.gridManager.slotContents[slot];
      if (!container || container.cardData?.type !== "monster") return;

      // 执行帮助卡效果
      const { cardData, itemIdx } = this._targetingMode;
      const effectCard = HELP_CARDS[cardData.id] || cardData;
      const hasGridMultiplierTower = this.gridManager.slotContents[1]?.cardData?.id === "multiplierTower";
      const result = hasGridMultiplierTower
        ? `${executeHelpCardEffect(this, effectCard, container, { triggerRelics: true })}\n${executeHelpCardEffect(this, effectCard, container, { triggerRelics: false })}`
        : executeHelpCardEffect(this, effectCard, container, { triggerRelics: true });
      console.log(`[帮助卡] ${result}`);

      // 更新 UI
      this.gridManager.updatePlayerCardStats();
      this.updatePlayerInfoPanel();

      // 移除道具槽中的卡
      this.removeItemCardVisual(itemIdx);
      this._itemSlots[itemIdx] = null;
      this.exitTargetingMode();
      return;
    }

    if (gameState.isInputLocked()) return;

    // 1. 检查道具牌格
    const itemIdx = this.getItemSlotAt(wx, wy);
    if (itemIdx >= 0 && this._itemSlots[itemIdx]) {
      console.log(`[点击] 道具槽${itemIdx + 1}`);
      this.useItemCard(itemIdx);
      return;
    }

    // 2. 检查九宫格
    const slot = this.gridManager.getSlotAt(wx, wy);
    if (slot < 1 || slot > 9) return;

    console.log(`[点击] 格${slot}`);

    const playerSlot = this.gridManager.getPlayerSlot();
    if (!GridManager.isOrthogonalAdjacent(playerSlot, slot)) {
      console.log(`[点击] 格${slot} 不与玩家相邻`);
      return;
    }

    // 2a. 空格子 → 触发旋转
    if (this.gridManager.isEmpty(slot)) {
      console.log(`[点击] 空格: 格${slot} → 旋转`);
      gameState.interactionCount++;
      this.boardResolver.runSettlementChain({ shouldRotate: true, preDelay: 250 });
      return;
    }

    const container = this.gridManager.slotContents[slot];
    console.log(`[点击] container=${!!container}, cardData=${!!(container && container.cardData)}, type=${container?.cardData?.type}`);
    if (!container || !container.cardData) return;

    const cardData = container.cardData;
    if (cardData.type === "monster") {
      console.log(`[点击] 怪物: 格${slot} — ${cardData.name}`);
      EventBus.emit(GameEvents.CARD_CLICKED, { type: "monster", slot, card: cardData });
      // 嘲讽：若相邻格存在“嘲讽怪物”，则玩家手动点其它怪物无效（只能开战嘲讽怪物）
      let tauntSlot = null;
      for (let s = 1; s <= 9; s++) {
        if (!GridManager.isOrthogonalAdjacent(playerSlot, s)) continue;
        const c = this.gridManager.slotContents[s];
        if (c?.cardData?.type === "monster" && c.cardData.hp > 0 && c.cardData.skill?.id === "taunt") {
          tauntSlot = s;
          break;
        }
      }
      if (tauntSlot !== null && tauntSlot !== slot) return;
      resolveBattle(this, this.gridManager, slot, container);
    } else if (cardData.type === "help") {
      console.log(`[点击] 帮助卡: 格${slot} — ${cardData.name}`);
      this.pickupHelpCard(slot, container);
    }
  }

  /** 鼠标悬停检测 → 显示怪物技能 */
  handlePointerHover(pointer) {
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    const slot = this.gridManager.getSlotAt(wx, wy);
    if (slot < 1 || slot > 9) {
      this._updateTooltip(null);
      return;
    }
    const container = this.gridManager.slotContents[slot];
    if (container && container.cardData?.type === "monster") {
      this._updateTooltip(container.cardData);
    } else {
      this._updateTooltip(null);
    }
  }

  /** 更新介绍区 tooltip */
  _updateTooltip(monsterData) {
    if (this._tooltipText) { this._tooltipText.destroy(); this._tooltipText = null; }
    if (this._tooltipBg) { this._tooltipBg.destroy(); this._tooltipBg = null; }

    const { RIGHT_PANEL_X, RIGHT_PANEL_W, TOOLTIP_Y, TOOLTIP_H } = LAYOUT;
    const cx = RIGHT_PANEL_X + RIGHT_PANEL_W / 2;
    const cy = TOOLTIP_Y + TOOLTIP_H / 2;

    if (monsterData) {
      const skill = monsterData.skill;
      const skillText = skill
        ? `【${skill.name}】\n${skill.desc}`
        : "无特殊技能";
      const info = `${monsterData.name}\nHP:${monsterData.hp} ATK:${monsterData.atk} ARM:${monsterData.armor}\n\n${skillText}`;

      this._tooltipBg = this.add.rectangle(cx, cy, RIGHT_PANEL_W - 4, TOOLTIP_H - 4, COLORS.BG_PANEL, 0.9)
        .setDepth(DEPTH.UI_PANELS).setOrigin(0.5)
        .setStrokeStyle(1, COLORS.TEXT_ACCENT, 0.6);
      this._tooltipText = this.add.text(cx, TOOLTIP_Y + 20, info, {
        fontFamily: FONTS.FAMILY, fontSize: "11px", color: COLORS.TEXT_PRIMARY,
        align: "center", wordWrap: { width: RIGHT_PANEL_W - 20 },
      }).setOrigin(0.5, 0).setDepth(DEPTH.UI_TEXT);
    } else {
      this._tooltipBg = this.add.rectangle(cx, cy, RIGHT_PANEL_W - 4, TOOLTIP_H - 4, COLORS.BG_PANEL, 0.7)
        .setDepth(DEPTH.UI_PANELS).setOrigin(0.5)
        .setStrokeStyle(1, COLORS.CELL_BORDER, 0.3);
      this._tooltipText = this.add.text(cx, cy, "鼠标悬停怪物卡\n查看技能详情", {
        fontFamily: FONTS.FAMILY, fontSize: "11px", color: COLORS.TEXT_SECONDARY, align: "center",
      }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    }
  }

  /** 检测装备栏坐标 */
  getEquipSlotAt(wx, wy) {
    const { LEFT_PANEL_X, EQUIPMENT_Y } = LAYOUT;
    const sz = 28, gap = 4, cols = 4;
    for (let i = 0; i < 12; i++) {
      const sx = LEFT_PANEL_X + 14 + (i % cols) * (sz + gap);
      const sy = EQUIPMENT_Y + 40 + Math.floor(i / cols) * (sz + gap);
      if (wx >= sx && wx <= sx + sz && wy >= sy && wy <= sy + sz) return i;
    }
    return -1;
  }

  /** 检测道具牌格坐标 */
  getItemSlotAt(wx, wy) {
    const { CENTER_X, CENTER_W, ITEM_SLOTS_Y } = LAYOUT;
    const cx = CENTER_X + CENTER_W / 2;
    const slotW = 50, gap = 12, totalW = 5 * slotW + 4 * gap;
    const startX = cx - totalW / 2;
    const sy = ITEM_SLOTS_Y + 55 - 35;
    const sh = 70;
    for (let i = 0; i < 5; i++) {
      const sx = startX + i * (slotW + gap);
      if (wx >= sx && wx <= sx + slotW && wy >= sy && wy <= sy + sh) return i;
    }
    return -1;
  }

  // ============================================================
  // 帮助卡拾取
  // ============================================================

  pickupHelpCard(slotIndex, container) {
    // 查找空道具槽
    const emptyIdx = this._itemSlots.findIndex((s) => s === null);
    if (emptyIdx < 0) {
      this._showToast("道具牌格已满！(5/5)");
      return;
    }

    const cardData = container.cardData;
    console.log(`[道具牌格] 拾取 ${cardData.name} → 槽${emptyIdx + 1}`);

    // 存入道具槽数据
    this._itemSlots[emptyIdx] = { cardData, slot: slotIndex };

    // 从九宫格移除（走 removeCard，不触发击杀金币）
    this.boardResolver.removeCard(slotIndex, container, { reason: "pickup_help", animate: false });

    // 视觉：创建小卡牌放入道具牌格
    this.renderItemSlotCard(emptyIdx, cardData);

    // 补牌 + 旋转（统一结算链）
    gameState.interactionCount++;
    this.time.delayedCall(80, () => {
      this.boardResolver.runSettlementChain({ shouldRotate: true });
    });
  }

  /**
   * 在道具牌格区域渲染一张帮助卡小图
   */
  renderItemSlotCard(index, cardData) {
    const { CENTER_X, CENTER_W, ITEM_SLOTS_Y } = LAYOUT;
    const cx = CENTER_X + CENTER_W / 2;
    const slotW = 50, gap = 12, totalW = 5 * slotW + 4 * gap;
    const startX = cx - totalW / 2 + slotW / 2;
    const sy = ITEM_SLOTS_Y + 55;

    const x = startX + index * (slotW + gap);
    const y = sy;

    // 小背景
    const bg = this.add.image(x, y, "item-slot-bg").setDepth(DEPTH.UI_PANELS + 1);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(-25, -35, 50, 70),
      Phaser.Geom.Rectangle.Contains
    );

    // 卡名
    const name = this.add.text(x, y - 18, cardData.name, {
      fontFamily: FONTS.FAMILY,
      fontSize: "9px",
      fontStyle: "bold",
      color: COLORS.TEXT_WHITE,
      align: "center",
      wordWrap: { width: 44 },
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);

    // 类型标签
    const label = this.add.text(x, y + 8, "[帮助卡]", {
      fontFamily: FONTS.FAMILY,
      fontSize: "7px",
      color: COLORS.TEXT_ACCENT,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);

    // 存入引用
    this._itemSlotContainers[index] = bg;

    // 存储元素以便后续清理
    if (!this._itemSlotElements) this._itemSlotElements = [];
    this._itemSlotElements.push({ bg, name, label, index });
  }

  /**
   * 使用道具牌格中的帮助卡
   */
  useItemCard(index) {
    const item = this._itemSlots[index];
    if (!item) return;

    const effectCard = HELP_CARDS[item.cardData.id] || item.cardData;
    const effect = effectCard.effect;
    console.log(`[道具牌格] 使用 ${effectCard.name} (type=${effect?.type})`);

    // 属性提升卡 → 弹出属性选择
    if (effect && effect.type === "statChoice") {
      const options = [
        { key: "atk", label: "攻击 +1", subLabel: "永久提升攻击力", color: 0xffdd77 },
        { key: "armor", label: "护甲 +1", subLabel: "永久提升基础护甲", color: 0x77bbff },
        { key: "hp", label: "血量 +2", subLabel: "提升血量上限", color: 0xff7777 },
      ];
      showSelectionOverlay(this, {
        title: "选择属性提升",
        options,
        skipLabel: "",
        onSelect: (key) => {
          if (key === "atk") gameState.addAttack(1);
          if (key === "armor") gameState.baseArmor += 1;
          if (key === "hp") gameState.addMaxHp(2);
          this.gridManager.updatePlayerCardStats();
          this.updatePlayerInfoPanel();
          this.removeItemCardVisual(index);
          this._itemSlots[index] = null;
        },
        onSkip: () => {},
      });
      return;
    }

    // 宝箱卡 → 弹出遗物三选一
    if (effect && effect.type === "chest") {
      const relics = rollRelics(3, relicManager.getEquippedIds());
      if (relics.length === 0) {
        console.log("[宝箱] 无可选遗物（已全部拥有）");
        return;
      }
      const options = relics.map((r) => ({
        key: r.id,
        label: r.name,
        subLabel: r.desc,
        color: { white: 0x6b7280, blue: 0x4a8fc9, gold: 0xd4a830 }[r.rarity] || 0x6b7280,
      }));
      showSelectionOverlay(this, {
        title: "选择一件遗物",
        options,
        skipLabel: "跳过 → +20💰",
        onSelect: (key) => {
          const picked = relics.find((r) => r.id === key);
          if (picked) {
            if (relicManager.hasFreeSlot()) {
              relicManager.equip(picked);
              this.gridManager.updatePlayerCardStats();
              this.updatePlayerInfoPanel();
            } else {
              console.log("[宝箱] 装备栏已满！");
            }
          }
          this.removeItemCardVisual(index);
          this._itemSlots[index] = null;
        },
        onSkip: () => {
          gameState.addGold(20);
          this.removeItemCardVisual(index);
          this._itemSlots[index] = null;
        },
      });
      return;
    }

    // 需要瞄准目标怪物的效果 → 进瞄准模式
    if (effect && (effect.type === "damage" || effect.type === "reduce_armor")) {
      this.enterTargetingMode(effectCard, index);
      return;
    }

    // 无需瞄准 → 立即执行
    const effectType = effect?.type;
    const isPlayerTargetHelp = ["heal", "full_heal", "shield", "gold", "blessed"].includes(effectType);
    const itemMultiplierTowerIdx = this._itemSlots.findIndex((it, i) => (
      i !== index && it?.cardData?.type === "help" && it.cardData.id === "multiplierTower"
    ));

    const result = (itemMultiplierTowerIdx >= 0 && isPlayerTargetHelp)
      ? `${executeHelpCardEffect(this, effectCard, null, { triggerRelics: true })}\n${executeHelpCardEffect(this, effectCard, null, { triggerRelics: false })}`
      : executeHelpCardEffect(this, effectCard, null, { triggerRelics: true });

    console.log(`[帮助卡] ${result}`);
    this.gridManager.updatePlayerCardStats();
    this.updatePlayerInfoPanel();

    // 移除道具槽
    this.removeItemCardVisual(index);
    this._itemSlots[index] = null;

    // 倍增塔：[道具牌格] 对玩家目标帮助卡生效两次后，永久移除本卡
    if (itemMultiplierTowerIdx >= 0 && isPlayerTargetHelp) {
      this.removeItemCardVisual(itemMultiplierTowerIdx);
      this._itemSlots[itemMultiplierTowerIdx] = null;
    }
  }

  /** 进入瞄准模式 */
  enterTargetingMode(cardData, itemIdx) {
    this._targetingMode = { cardData, itemIdx, highlights: [] };
    console.log(`[瞄准] 进入瞄准模式 — 选择 ${cardData.name} 的目标`);

    // 高亮所有怪物
    for (let i = 1; i <= 9; i++) {
      const c = this.gridManager.slotContents[i];
      if (c && c.cardData?.type === "monster") {
        const hl = this.add.rectangle(c.x, c.y, GRID.CELL_WIDTH + 4, GRID.CELL_HEIGHT + 4)
          .setStrokeStyle(3, 0xffdd44, 0.8)
          .setDepth(DEPTH.CARDS + 5)
          .setOrigin(0.5);
        this._targetingMode.highlights.push(hl);

        // 脉冲动画
        this.tweens.add({
          targets: hl, alpha: 0.4, duration: 400, yoyo: true, repeat: -1,
        });
      }
    }
  }

  /** 弹出提示消息 */
  _showToast(msg) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const bg = this.add.rectangle(cx, cy + 80, 280, 36, 0x000000, 0.85)
      .setDepth(200).setStrokeStyle(1, 0xff6644);
    const txt = this.add.text(cx, cy + 80, msg, {
      fontFamily: FONTS.FAMILY, fontSize: "14px", color: "#ff8866",
    }).setOrigin(0.5).setDepth(201);
    this.tweens.add({
      targets: [bg, txt], alpha: 0, y: cy + 55, duration: 500, delay: 1200,
      onComplete: () => { bg.destroy(); txt.destroy(); },
    });
  }

  /** 退出瞄准模式 */
  exitTargetingMode() {
    if (!this._targetingMode) return;
    this._targetingMode.highlights.forEach((hl) => hl.destroy());
    this._targetingMode = null;
    console.log("[瞄准] 退出瞄准模式");
  }

  /** 移除道具槽视觉 */
  removeItemCardVisual(index) {
    const elems = this._itemSlotElements?.filter((e) => e.index === index) || [];
    elems.forEach((e) => {
      if (e.bg) e.bg.destroy();
      if (e.name) e.name.destroy();
      if (e.label) e.label.destroy();
    });
    this._itemSlotContainers[index] = null;
  }

  // ============================================================
  // 测试关卡初始化
  // ============================================================

  setupTestLevel() {
    console.log(`[GameScene] 初始化第${levelManager.currentLayer}层 第${levelManager.currentNode}节点...`);

    // 0. 从 LevelManager 获取玩家侧卡组
    const limit = levelManager.getCardLimit();
    levelManager._cardsInPlay = levelManager.playerCards.length; // 记录本关使用的卡数
    gameState.playerDeck = levelManager.playerCards.map((c) => ({ ...c }));
    levelManager.playerCards = [];
    console.log(`[玩家卡组] 本关开始: ${gameState.playerDeck.length}/${limit}`);

    // 1. 生成怪物侧卡组
    gameState.buildMonsterDeck(levelManager.currentLayer, levelManager.currentNode);
    console.log(`[发牌] 怪物侧: ${gameState.monsterDeck.length}张`);

    // 2. 从两侧各抽最多3张
    const playerDraw = [];
    const monsterDraw = [];
    for (let i = 0; i < 3 && gameState.playerDeck.length > 0; i++) {
      playerDraw.push(gameState.playerDeck.shift());
    }
    for (let i = 0; i < 3 && gameState.monsterDeck.length > 0; i++) {
      monsterDraw.push(gameState.monsterDeck.shift());
    }
    console.log(`[发牌] 玩家侧抽${playerDraw.length}张, 怪物侧抽${monsterDraw.length}张`);

    // 3. 剩余洗混成战斗卡组
    gameState.buildBattleDeck();
    console.log(`[发牌] 战斗卡组: ${gameState.battleDeck.length}张`);

    // 4. 将抽出的卡随机放到 8 个空格中
    const allDraws = [...playerDraw, ...monsterDraw];
    this._shuffleArray(allDraws);
    const slots = [1, 2, 3, 4, 6, 7, 8, 9];
    const usedSlots = [];
    for (const cardData of allDraws) {
      const avail = slots.filter((s) => !usedSlots.includes(s));
      if (avail.length === 0) break;
      const slot = avail[Math.floor(Math.random() * avail.length)];
      usedSlots.push(slot);
      this._placeCardOnGrid(slot, cardData);
    }

    // 5. 从战斗卡组补满剩余空格
    const remaining = slots.filter((s) => !usedSlots.includes(s));
    for (const slot of remaining) {
      const cardData = gameState.drawFromBattleDeck();
      if (!cardData) break;
      this._placeCardOnGrid(slot, cardData);
    }

    this.gridManager.updatePlayerCardStats();
    this.updatePlayerInfoPanel();
    this.updateDeckPreview();
  }

  _placeCardOnGrid(slot, cardData) {
    const pos = this.gridManager.getSlotXY(slot);
    const card = cardData.type === "monster"
      ? createMonsterCard(this, cardData, pos.x, pos.y)
      : createHelpCard(this, cardData, pos.x, pos.y);
    this.gridManager.slotContents[slot] = card;

    // 处理怪物登场技能
    if (cardData.type === "monster" && cardData.skill && cardData.skill.effects) {
      processEnterSkillEffects(this.boardResolver, slot, card);
    }
  }

  _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ============================================================
  // 第三段开发验证工具（dev）
  // ============================================================

  devSpawnMonsterToSlot(monsterId, slot) {
    if (!this.gridManager) return;
    const s = parseInt(slot, 10);
    if (!Number.isFinite(s) || s < 1 || s > 9 || s === 5) {
      console.log(`[devSpawn] 无效 slot=${slot}`);
      return;
    }

    // 优先从战斗卡组/怪物侧卡组找同 id
    let found =
      gameState.battleDeck.find((c) => c?.type === "monster" && c.id === monsterId) ||
      gameState.monsterDeck.find((c) => c?.type === "monster" && c.id === monsterId);

    if (found) {
      // 从对应数组移除一份用于生成
      const idx = gameState.battleDeck.indexOf(found);
      if (idx >= 0) gameState.battleDeck.splice(idx, 1);
      const idx2 = gameState.monsterDeck.indexOf(found);
      if (idx2 >= 0) gameState.monsterDeck.splice(idx2, 1);
      found = { ...found };
    } else {
      found = { id: monsterId, name: monsterId, hp: 8, atk: 2, armor: 0, type: "monster" };
    }

    found.uid = found.uid || `dev_${monsterId}_${Date.now()}`;
    found.atk = found.atk ?? 2;
    found.hp = found.hp ?? 8;
    found.armor = found.armor ?? 0;

    // 替换目标格已有卡
    const existing = this.gridManager.slotContents[s];
    if (existing) {
      existing.destroy();
      this.gridManager.slotContents[s] = null;
    }

    const pos = this.gridManager.getSlotXY(s);
    const card = createMonsterCard(this, found, pos.x, pos.y);
    this.gridManager.slotContents[s] = card;
    this.gridManager.updatePlayerCardStats();
    this.updateDeckPreview();
    console.log(`[devSpawn] ${found.name} → 格${s}`);
  }

  devTriggerRotationOnce() {
    if (gameState.isInputLocked()) return;
    if (!this.boardResolver) return;
    gameState.interactionCount++;
    this.boardResolver.runSettlementChain({ shouldRotate: true, preDelay: 0 });
  }

  devDumpLastChainLog() {
    const log = this.boardResolver?.lastChainLog || [];
    console.log("[dev] 最近一次结算链事件日志：", log);
  }

  devPrintCardRuntime() {
    if (!this.gridManager) return;
    const rows = [];
    for (let i = 1; i <= 9; i++) {
      const c = this.gridManager.slotContents[i];
      const d = c?.cardData;
      if (!d) continue;
      const rt = d._runtime || {};
      rows.push({
        slot: i,
        type: d.type,
        id: d.id,
        name: d.name,
        moveCount: rt.moveCount || 0,
        combatCount: rt.combatCount || 0,
        tempAtkBonus: rt.tempAtkBonus || 0,
        tempArmorBonus: rt.tempArmorBonus || 0,
        atk: d.atk,
        armor: d.armor,
        hp: d.hp,
      });
    }
    console.log("[dev] 卡牌移动计数/临时修正：");
    console.table?.(rows);
  }

  devRunThirdPhaseValidation() {
    if (!this.boardResolver || !this.gridManager) return;
    console.log("[devValidate] 第三段最小自动验证开始…");

    // 去除外部变量：清空遗物/导师技能（避免干扰断言）
    relicManager.slots = new Array(12).fill(null);
    skillManager.reset();
    gameState.hp = 10;
    gameState.currentArmor = 0;
    this.gridManager.updatePlayerCardStats();
    this.updatePlayerInfoPanel();

    const clearNonPlayerSlots = () => {
      for (let i = 1; i <= 9; i++) {
        if (i === 5) continue;
        const c = this.gridManager.slotContents[i];
        if (c) c.destroy();
        this.gridManager.slotContents[i] = null;
      }
    };

    const fillDummyMonsters = () => {
      for (let i = 1; i <= 9; i++) {
        if (i === 5) continue;
        const dummy = { id: `dummy_${i}_${Date.now()}`, name: `Dummy${i}`, hp: 10, atk: 1, armor: 0, type: "monster" };
        const pos = this.gridManager.getSlotXY(i);
        this.gridManager.slotContents[i] = createMonsterCard(this, dummy, pos.x, pos.y);
      }
    };

    const runTest1 = () => {
      // 战斗卡组清空：避免第二次补牌把空位再填满
      gameState.battleDeck = [];
      clearNonPlayerSlots();
      fillDummyMonsters();

      // slot2：滚石
      const rolling = { ...HELP_CARDS.rollingRock, type: "help", uid: `dev_roll_${Date.now()}` };
      {
        const pos = this.gridManager.getSlotXY(2);
        this.gridManager.slotContents[2] = createHelpCard(this, rolling, pos.x, pos.y);
      }

      // slot3：尖石（移除时触发 dmgPlayer，且 armor=0 满足条件）
      const spike = {
        id: "dev_spike",
        name: "尖石(验证)",
        hp: 10,
        atk: 1,
        armor: 0,
        type: "monster",
        skill: {
          id: "dev_spikeSkill",
          name: "尖石(验证)",
          desc: "",
          effects: [
            { event: "onRemove", action: "dmgPlayer", amount: 1, condition: "armorZero" },
          ],
        },
      };
      {
        const pos = this.gridManager.getSlotXY(3);
        this.gridManager.slotContents[3] = createMonsterCard(this, spike, pos.x, pos.y);
      }

      // slot4：移动计数 + 邻接目标（最终落到 slot1，会吃到光环）
      const auraTarget = { id: "dev_auraTarget", name: "AuraTarget", hp: 10, atk: 1, armor: 0, type: "monster" };
      {
        const pos = this.gridManager.getSlotXY(4);
        this.gridManager.slotContents[4] = createMonsterCard(this, auraTarget, pos.x, pos.y);
      }

      // slot7：光环怪物（最终落到 slot4，给 slot1 的目标+2临时攻击）
      const auraOwner = {
        id: "dev_auraOwner",
        name: "AuraOwner",
        hp: 10,
        atk: 1,
        armor: 0,
        type: "monster",
        skill: {
          id: "dev_auraOwnerSkill",
          name: "devAura",
          desc: "",
          effects: [{ event: "auraAdjacentAtk", amount: 2, condition: "always" }],
        },
      };
      {
        const pos = this.gridManager.getSlotXY(7);
        this.gridManager.slotContents[7] = createMonsterCard(this, auraOwner, pos.x, pos.y);
      }

      const startHp = gameState.hp;
      const startArmor = gameState.currentArmor;

      this.boardResolver.runSettlementChain({
        shouldRotate: true,
        preDelay: 0,
        onComplete: () => {
          const rollingRemoved = this.gridManager.slotContents[3] == null;
          const spikeRemoved = this.gridManager.slotContents[6] == null;
          const hpOk = gameState.hp === startHp - 1; // onRemove dmgPlayer(1)，且玩家护甲=0
          const moveCountOk = (auraTarget._runtime?.moveCount || 0) > 0;
          const auraOk = (auraTarget._runtime?.tempAtkBonus || 0) === 2 && auraTarget.atk === 3;

          console.log("[devValidate][Test1] rollingRemoved=", rollingRemoved,
            " spikeRemoved=", spikeRemoved,
            " hpOk=", hpOk,
            " moveCountOk=", moveCountOk,
            " auraOk=", auraOk,
          );

          runTest2(hpOk && rollingRemoved && spikeRemoved);
        },
      });
    };

    const runTest2 = (t1Ok) => {
      if (!t1Ok) console.log("[devValidate][Test2] Test1 未通过，仍继续跑以便观察日志。");

      gameState.battleDeck = [];
      clearNonPlayerSlots();
      fillDummyMonsters();

      // slot1：捕熊陷阱
      const trap = { ...HELP_CARDS.bearTrap, type: "help", uid: `dev_trap_${Date.now()}` };
      {
        const pos = this.gridManager.getSlotXY(1);
        this.gridManager.slotContents[1] = createHelpCard(this, trap, pos.x, pos.y);
      }

      // slot2：留空，准备补牌
      const old2 = this.gridManager.slotContents[2];
      if (old2) old2.destroy();
      this.gridManager.slotContents[2] = null;

      // 补牌时放入一个 hp<10 的普通怪物，保证陷阱能击杀
      gameState.battleDeck = [
        { id: "dev_trapTarget", name: "TrapTarget", hp: 5, atk: 1, armor: 0, type: "monster", uid: `dev_tt_${Date.now()}` },
      ];

      this.boardResolver.runSettlementChain({
        shouldRotate: false,
        preDelay: 0,
        onComplete: () => {
          const trapRemoved = this.gridManager.slotContents[1] == null;
          const targetEmpty = this.gridManager.slotContents[2] == null;
          console.log("[devValidate][Test2] trapRemoved=", trapRemoved, " targetEmpty=", targetEmpty);
          runTest3();
        },
      });
    };

    // Test3：自动战斗派生战斗 + 二次补牌不递归死循环
    const runTest3 = () => {
      gameState.battleDeck = [];
      clearNonPlayerSlots();
      fillDummyMonsters();

      // slot1：派生自动战斗怪物（旋转后到 slot2）
      const autoMonster = {
        id: "dev_autoBattle",
        name: "AutoBattle(验证)",
        hp: 1,
        atk: 0,
        armor: 0,
        type: "monster",
        skill: {
          id: "dev_autoSkill",
          name: "devAutoSkill",
          desc: "",
          effects: [{ event: "onMoveToPlayerAdjacent", action: "autoBattle" }],
        },
      };
      {
        const pos = this.gridManager.getSlotXY(1);
        this.gridManager.slotContents[1] = createMonsterCard(this, autoMonster, pos.x, pos.y);
      }

      // 作为派生战斗后补牌目标：slot2 需要被补上
      gameState.battleDeck = [
        { id: "dev_autoRefillTarget", name: "AutoRefillTarget", hp: 6, atk: 1, armor: 0, type: "monster", uid: `dev_art_${Date.now()}` },
      ];

      this.boardResolver.runSettlementChain({
        shouldRotate: true,
        preDelay: 0,
        onComplete: () => {
          const killed = this.boardResolver.lastChainLog.some((e) => e.type === "killMonster");
          const refilled = this.gridManager.slotContents[2]?.cardData?.id === "dev_autoRefillTarget";
          const deckEmpty = gameState.battleDeck.length === 0;
          console.log("[devValidate][Test3] killed=", killed, " refilled=", refilled, " deckEmpty=", deckEmpty);
          console.log("[devValidate] 第三段最小自动验证结束。");
        },
      });
    };

    runTest1();
  }

  // ============================================================
  // 事件监听
  // ============================================================

  setupEventListeners() {
    EventBus.on(GameEvents.PLAYER_HP_CHANGED, () => {
      this.gridManager.updatePlayerCardStats();
      this.updatePlayerInfoPanel();
    });
    EventBus.on(GameEvents.PLAYER_ATK_CHANGED, () => {
      this.gridManager.updatePlayerCardStats();
      this.updatePlayerInfoPanel();
    });
    EventBus.on(GameEvents.PLAYER_ARMOR_CHANGED, () => {
      this.gridManager.updatePlayerCardStats();
      this.updatePlayerInfoPanel();
    });
    EventBus.on(GameEvents.GOLD_CHANGED, () => this.updatePlayerInfoPanel());
    EventBus.on(GameEvents.MONSTER_REMOVED, () => this.updateDeckPreview());
    EventBus.on(GameEvents.SLOT_FILLED, () => this.updateDeckPreview());
    EventBus.on(GameEvents.REFILL_END, () => this.updateDeckPreview());
    EventBus.on(GameEvents.LEVEL_CLEAR, () => this.showLevelClearMessage());
    EventBus.on(GameEvents.PLAYER_DIED, () => this.showPlayerDeathMessage());
    EventBus.on(GameEvents.ELITE_KILLED, () => {
      this.time.delayedCall(500, () => levelManager.showMentorChoice());
    });
  }

  // ============================================================
  // UI 更新
  // ============================================================

  updatePlayerInfoPanel() {
    if (this._playerInfoTexts) this._playerInfoTexts.forEach((t) => t.destroy());
    const { LEFT_PANEL_X, LEFT_PANEL_W, PLAYER_INFO_Y } = LAYOUT;
    const cx = LEFT_PANEL_X + LEFT_PANEL_W / 2;
    const statStartY = PLAYER_INFO_Y + 45;
    const stats = [
      { l: "血量 (HP)", v: `${gameState.hp} / ${gameState.getEffectiveMaxHp()}`, c: "#ff7777" },
      { l: "攻击 (ATK)", v: `${gameState.getEffectiveAttack()}`, c: "#ffdd77" },
      { l: "护甲 (ARMOR)", v: `${gameState.getEffectiveArmor()} / ${gameState.getEffectiveBaseArmor()}`, c: "#77bbff" },
      { l: "金币 (GOLD)", v: `${gameState.gold} 💰`, c: "#ffe680" },
    ];
    this._playerInfoTexts = [];
    stats.forEach((s, i) => {
      const y = statStartY + i * 26;
      this._playerInfoTexts.push(
        this.add.text(cx - LEFT_PANEL_W / 2 + 16, y, s.l, { fontFamily: FONTS.FAMILY, fontSize: "12px", color: COLORS.TEXT_PRIMARY }).setDepth(DEPTH.UI_TEXT),
        this.add.text(cx + LEFT_PANEL_W / 2 - 16, y, s.v, { fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: s.c }).setOrigin(1, 0).setDepth(DEPTH.UI_TEXT)
      );
    });
  }

  updateDeckPreview() {
    if (this._deckPreviewText) this._deckPreviewText.destroy();
    const { RIGHT_PANEL_X, RIGHT_PANEL_W, DECK_AREA_Y } = LAYOUT;
    const cx = RIGHT_PANEL_X + RIGHT_PANEL_W / 2;
    const count = gameState.getBattleDeckCount();
    const next = gameState.battleDeck[0];
    const info = next ? `剩余: ${count} 张\n下一张: ${next.name}` : `剩余: ${count} 张\n牌组已空`;
    this._deckPreviewText = this.add.text(cx, DECK_AREA_Y + 65, info, {
      fontFamily: FONTS.FAMILY, fontSize: "11px", color: COLORS.TEXT_SECONDARY, align: "center",
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
  }

  showLevelClearMessage() {
    this.exitTargetingMode();
    levelManager.onLevelClear();
  }

  /** 显示非阻断式房间按钮 */
  showRoomButtons(rooms) {
    this.hideRoomButtons();
    this._roomButtons = [];

    const btnW = 140, btnH = 36, gap = 20;
    const totalW = rooms.length * btnW + (rooms.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + btnW / 2;
    const btnY = GAME_HEIGHT - 25;

    rooms.forEach((room, i) => {
      const bx = startX + i * (btnW + gap);

      const bg = this.add.rectangle(bx, btnY, btnW, btnH, room.color, 0.9)
        .setDepth(DEPTH.OVERLAY - 1)
        .setStrokeStyle(2, 0xffffff, 0.5)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(bx, btnY, room.label, {
        fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: "#ffffff",
      }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

      bg.on("pointerover", () => bg.setStrokeStyle(2, 0xffdd77, 1));
      bg.on("pointerout", () => bg.setStrokeStyle(2, 0xffffff, 0.5));
      bg.on("pointerdown", () => {
        this.hideRoomButtons();
        levelManager.executeRoom(room.key);
      });

      this._roomButtons.push(bg, label);
    });

    console.log("[GameScene] 房间按钮已显示（不阻断九宫格互动）");
  }

  /** 隐藏房间按钮 */
  hideRoomButtons() {
    if (this._roomButtons) {
      this._roomButtons.forEach((o) => o.destroy());
      this._roomButtons = null;
    }
  }

  /** 节点推进后重建关卡 */
  rebuildLevel() {
    this.hideRoomButtons();
    // 未使用的帮助卡回到玩家侧卡组
    let recycled = 0;
    // 道具牌格中的帮助卡（回收时走直接 push，不计上限检查）
    for (const item of this._itemSlots) {
      if (item && item.cardData && item.cardData.type === "help") {
        // 烈焰：若本回合未使用，在关卡结束时永久移除
        if (item.cardData.id !== "flame") {
          levelManager.playerCards.push(item.cardData);
          recycled++;
        }
      }
    }
    // 九宫格上未拾取的帮助卡
    for (let i = 1; i <= 9; i++) {
      const c = this.gridManager.slotContents[i];
      if (c && c.cardData && c.cardData.type === "help" && i !== 5) {
        if (c.cardData.id !== "flame") {
          levelManager.playerCards.push(c.cardData);
          recycled++;
        }
      }
    }
    // 战斗卡组中未被抽到的帮助卡也回收（不计上限，是玩家自己本来的卡）
    for (const card of gameState.battleDeck) {
      if (card && card.type === "help") {
        if (card.id !== "flame") {
          levelManager.playerCards.push(card);
          recycled++;
        }
      }
    }
    if (recycled > 0) {
      gameState.addGold(recycled * 10);
      console.log(`[关卡结束] 回收${recycled}张帮助卡，+${recycled * 10}💰`);
    }

    // 关卡结束，清除本关卡牌计数
    levelManager._cardsInPlay = 0;

    // 玩家侧卡组总数
    const total = levelManager.playerCards.length;
    const limit = levelManager.getCardLimit();
    if (total > limit) {
      console.log(`[关卡结束] 卡组超上限！${total} → ${limit}，丢弃多余卡`);
      levelManager.playerCards = levelManager.playerCards.slice(0, limit);
    }
    // 复制给 gameState 供下关发牌
    gameState.playerDeck = levelManager.playerCards.map((c) => ({ ...c }));
    console.log(`[玩家卡组] ${gameState.playerDeck.length}/${limit}`);

    // 清除道具牌格
    this._itemSlots = new Array(5).fill(null);
    this._itemSlotContainers = [];
    if (this._itemSlotElements) {
      this._itemSlotElements.forEach((e) => {
        if (e.bg) e.bg.destroy();
        if (e.name) e.name.destroy();
        if (e.label) e.label.destroy();
      });
      this._itemSlotElements = [];
    }

    // 清除场上所有卡牌（玩家卡除外）
    for (let i = 1; i <= 9; i++) {
      const c = this.gridManager.slotContents[i];
      if (c && i !== 5) {
        c.destroy();
        this.gridManager.slotContents[i] = null;
      }
    }

    // 重新发牌
    this.setupTestLevel();
  }

  showPlayerDeathMessage() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(DEPTH.OVERLAY);
    this.add.text(cx, cy - 30, "💀 玩家死亡\n游戏结束", {
      fontFamily: FONTS.FAMILY, fontSize: "36px", fontStyle: "bold", color: "#ff4444", align: "center",
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 1);

    // 重新开始按钮
    const btnW = 180, btnH = 42, btnY = cy + 70;
    const btnBg = this.add.rectangle(cx, btnY, btnW, btnH, 0xcc4444, 0.9)
      .setDepth(DEPTH.OVERLAY + 1).setStrokeStyle(2, 0xff8888)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(cx, btnY, "重新开始", {
      fontFamily: FONTS.FAMILY, fontSize: "18px", fontStyle: "bold", color: "#ffffff",
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 2);

    btnBg.on("pointerover", () => btnBg.setFillStyle(0xee5555));
    btnBg.on("pointerout", () => btnBg.setFillStyle(0xcc4444));
    btnBg.on("pointerdown", () => {
      this.scene.restart();
    });
  }

  // ============================================================
  // 六大区域构建
  // ============================================================

  buildPlayerInfo() {
    const { LEFT_PANEL_X, LEFT_PANEL_W, PLAYER_INFO_Y, PLAYER_INFO_H } = LAYOUT;
    const cx = LEFT_PANEL_X + LEFT_PANEL_W / 2;
    this.drawPanel(cx, PLAYER_INFO_Y + PLAYER_INFO_H / 2, LEFT_PANEL_W, PLAYER_INFO_H);
    this.add.text(cx, PLAYER_INFO_Y + 14, "玩家信息", {
      fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: COLORS.TEXT_PRIMARY,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    this.updatePlayerInfoPanel();
  }

  buildEquipmentBar() {
    const { LEFT_PANEL_X, LEFT_PANEL_W, EQUIPMENT_Y, EQUIPMENT_H } = LAYOUT;
    const cx = LEFT_PANEL_X + LEFT_PANEL_W / 2, cy = EQUIPMENT_Y + EQUIPMENT_H / 2;
    this.drawPanel(cx, cy, LEFT_PANEL_W, EQUIPMENT_H);
    this._equipTitle = this.add.text(cx, EQUIPMENT_Y + 14, "装备栏 (12)", {
      fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: COLORS.TEXT_PRIMARY,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    this._equipTip = this.add.text(cx, EQUIPMENT_Y + EQUIPMENT_H - 14, "右键丢弃 → +20💰", {
      fontFamily: FONTS.FAMILY, fontSize: "10px", color: COLORS.TEXT_SECONDARY,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    this._equipSlotsGfx = [];
    this.renderEquipmentBar();
  }

  /** 渲染装备栏（响应遗物变更） */
  renderEquipmentBar() {
    // 清除旧格子
    this._equipSlotsGfx.forEach((g) => g.forEach((e) => e.destroy()));
    this._equipSlotsGfx = [];

    const { LEFT_PANEL_X, EQUIPMENT_Y } = LAYOUT;
    const sz = 28, gap = 4, cols = 4;
    const relics = relicManager.slots;

    for (let i = 0; i < 12; i++) {
      const sx = LEFT_PANEL_X + 14 + (i % cols) * (sz + gap) + sz / 2;
      const sy = EQUIPMENT_Y + 40 + Math.floor(i / cols) * (sz + gap) + sz / 2;
      const group = [];

      const relic = relics[i];
      const bgColor = relic
        ? ({ white: 0x6b7280, blue: 0x4a8fc9, gold: 0xd4a830 }[relic.rarity] || 0x6b7280)
        : COLORS.CELL_EMPTY;

      const bg = this.add.rectangle(sx, sy, sz, sz, bgColor, 0.9)
        .setStrokeStyle(1, relic ? 0xffffff : COLORS.CELL_BORDER, relic ? 0.4 : 0.3)
        .setDepth(DEPTH.UI_PANELS);
      group.push(bg);

      if (relic) {
        // 右键丢弃
        bg.setInteractive(
          new Phaser.Geom.Rectangle(-sz / 2, -sz / 2, sz, sz),
          Phaser.Geom.Rectangle.Contains
        );
        bg.on("pointerdown", (pointer) => {
          if (pointer.rightButtonDown()) {
            relicManager.discard(i);
            this.gridManager.updatePlayerCardStats();
            this.updatePlayerInfoPanel();
          }
        });

        // 遗物名缩写
        const label = this.add.text(sx, sy, relic.name.slice(0, 2), {
          fontFamily: FONTS.FAMILY, fontSize: "9px", fontStyle: "bold", color: COLORS.TEXT_WHITE,
        }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
        group.push(label);
      } else {
        // 空格编号
        const label = this.add.text(sx, sy, `${i + 1}`, {
          fontFamily: FONTS.FAMILY, fontSize: "8px", color: COLORS.TEXT_SECONDARY,
        }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
        group.push(label);
      }

      this._equipSlotsGfx.push(group);
    }
  }

  buildBattlefield() {
    const { CENTER_X, CENTER_W, BATTLEFIELD_Y, BATTLEFIELD_H } = LAYOUT;
    const cx = CENTER_X + CENTER_W / 2, cy = BATTLEFIELD_Y + BATTLEFIELD_H / 2;
    this.drawPanel(cx, cy, CENTER_W, BATTLEFIELD_H);
    this.add.text(cx, BATTLEFIELD_Y + 14, "九宫格战场", {
      fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: COLORS.TEXT_PRIMARY,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    this.gridManager = new GridManager(this);
    this.gridManager.render();
    initBoardResolver(this);
  }

  buildItemSlots() {
    const { CENTER_X, CENTER_W, ITEM_SLOTS_Y, ITEM_SLOTS_H } = LAYOUT;
    const cx = CENTER_X + CENTER_W / 2, cy = ITEM_SLOTS_Y + ITEM_SLOTS_H / 2;
    this.drawPanel(cx, cy, CENTER_W, ITEM_SLOTS_H);
    this.add.text(cx, ITEM_SLOTS_Y + 14, "道具牌格 (5)", {
      fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: COLORS.TEXT_PRIMARY,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    const slotW = 50, gap = 12, totalW = 5 * slotW + 4 * gap;
    const startX = cx - totalW / 2 + slotW / 2, sy = ITEM_SLOTS_Y + 55;
    for (let i = 0; i < 5; i++) {
      const sx = startX + i * (slotW + gap);
      this.add.image(sx, sy, "item-slot-bg").setDepth(DEPTH.UI_PANELS).setOrigin(0.5);
      this.add.text(sx, sy, `${i + 1}`, {
        fontFamily: FONTS.FAMILY, fontSize: "10px", color: COLORS.TEXT_SECONDARY,
      }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    }
  }

  buildDeckArea() {
    const { RIGHT_PANEL_X, RIGHT_PANEL_W, DECK_AREA_Y, DECK_AREA_H } = LAYOUT;
    const cx = RIGHT_PANEL_X + RIGHT_PANEL_W / 2, cy = DECK_AREA_Y + DECK_AREA_H / 2;
    this.drawPanel(cx, cy, RIGHT_PANEL_W, DECK_AREA_H);
    this.add.text(cx, DECK_AREA_Y + 14, "牌组区", {
      fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: COLORS.TEXT_PRIMARY,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    this.updateDeckPreview();
  }

  buildSkillPanel() {
    const { RIGHT_PANEL_X, RIGHT_PANEL_W, TOOLTIP_Y, TOOLTIP_H, SKILLS_Y, SKILLS_H } = LAYOUT;
    const cx = RIGHT_PANEL_X + RIGHT_PANEL_W / 2;
    this.drawPanel(cx, TOOLTIP_Y + TOOLTIP_H / 2, RIGHT_PANEL_W, TOOLTIP_H);
    this.add.text(cx, TOOLTIP_Y + 14, "介绍区", {
      fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: COLORS.TEXT_PRIMARY,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    this._updateTooltip(null);
    this.drawPanel(cx, SKILLS_Y + SKILLS_H / 2, RIGHT_PANEL_W, SKILLS_H);
    this.add.text(cx, SKILLS_Y + 14, "技能栏", {
      fontFamily: FONTS.FAMILY, fontSize: "14px", fontStyle: "bold", color: COLORS.TEXT_PRIMARY,
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    this.renderSkillPanel();

    // 技能更新监听
    this.events.on("skills-updated", () => this.renderSkillPanel());
  }

  renderSkillPanel() {
    const { RIGHT_PANEL_X, RIGHT_PANEL_W, SKILLS_Y } = LAYOUT;
    const cx = RIGHT_PANEL_X + RIGHT_PANEL_W / 2;
    // 清除旧技能文字
    if (this._skillTexts) { this._skillTexts.forEach((t) => t.destroy()); }
    this._skillTexts = [];

    const skills = skillManager.getAllSkills();
    if (skills.length === 0) {
      this._skillTexts.push(this.add.text(cx, SKILLS_Y + 50, "(无)", {
        fontFamily: FONTS.FAMILY, fontSize: "11px", color: COLORS.TEXT_SECONDARY,
      }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT));
    } else {
      skills.forEach((s, i) => {
        const y = SKILLS_Y + 42 + i * 42;
        this._skillTexts.push(this.add.text(cx, y, s.name, {
          fontFamily: FONTS.FAMILY, fontSize: "12px", fontStyle: "bold", color: COLORS.TEXT_ACCENT,
        }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT));
        this._skillTexts.push(this.add.text(cx, y + 16, s.desc, {
          fontFamily: FONTS.FAMILY, fontSize: "9px", color: COLORS.TEXT_SECONDARY, align: "center",
          wordWrap: { width: RIGHT_PANEL_W - 10 },
        }).setOrigin(0.5, 0).setDepth(DEPTH.UI_TEXT));
      });
    }
  }

  drawPanel(cx, cy, w, h) {
    this.add.rectangle(cx, cy, w - 2, h - 2, COLORS.BG_PANEL, 0.75)
      .setDepth(DEPTH.UI_PANELS).setOrigin(0.5)
      .setStrokeStyle(1, COLORS.CELL_BORDER, 0.4);
  }
}
