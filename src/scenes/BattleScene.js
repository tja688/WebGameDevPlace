import Phaser from "phaser";
import {
  PLAYER_INIT, INITIAL_HELP_DECK, HELP_CARDS, HELP_CARDS_BY_QUALITY,
  QUALITY_PROB, RELICS, RELICS_BY_QUALITY, HELP_DECK_CAPACITY,
  getNodeConfig,
} from "../data/GameData.js";
import {
  isAdjacent, getAdjacentGrids, calcRelicBonuses, calcEffectiveStats,
  hasDeathSave, consumeDeathSave, applyGoldenChestRelic,
  calcInspireBonus, calcRevengeBonus, checkWarlikeTrigger,
  checkAmbushTrigger, checkGripLock, checkScatterSpawn,
  calcThornsDamage, calcHardSkinBonus, calcBattleVeteranAtk,
} from "../systems/CombatEngine.js";

// ==================== 布局常量 ====================
const GAME_W = 960;
const GAME_H = 640;

const GRID_COLS = 3;
const GRID_ROWS = 3;
const CELL_W = 110;
const CELL_H = 120;
const CELL_GAP = 6;
const GRID_TOTAL_W = CELL_W * GRID_COLS + CELL_GAP * (GRID_COLS - 1);
const GRID_TOTAL_H = CELL_H * GRID_ROWS + CELL_GAP * (GRID_ROWS - 1);
const CENTER_LEFT = 200;
const CENTER_W = GAME_W - 400;
const GRID_LEFT = CENTER_LEFT + (CENTER_W - GRID_TOTAL_W) / 2;
const GRID_TOP = 50;

const ITEM_SLOT_COUNT = 5;
const ITEM_SLOT_W = 80;
const ITEM_SLOT_H = 90;
const ITEM_SLOT_GAP = 8;
const ITEM_TOTAL_W = ITEM_SLOT_COUNT * ITEM_SLOT_W + (ITEM_SLOT_COUNT - 1) * ITEM_SLOT_GAP;
const ITEM_START_X = (GAME_W - ITEM_TOTAL_W) / 2;
const ITEM_Y = GAME_H - 80;

const COLOR = {
  BG_DARK: 0x1a1c20, GRID_NORMAL: 0x2d3035, GRID_NORMAL_BORDER: 0x4a5058,
  GRID_PLAYER: 0x3a3520, GRID_PLAYER_BORDER: 0xf5c86a,
  GRID_TARGET: 0x4a2020, GRID_TARGET_BORDER: 0xff4444,
  CARD_PLAYER: 0x2a4a6b, CARD_PLAYER_BORDER: 0x5b9bd5,
  CARD_MONSTER: 0x4a1a1a, CARD_MONSTER_BORDER: 0xc0392b,
  CARD_HELP: 0x1a3a28, CARD_HELP_BORDER: 0x27ae60,
  PANEL_BG: 0x252830, PANEL_BORDER: 0x3a3d44,
  SLOT_EMPTY: 0x1e2025, SLOT_BORDER: 0x3a3d44,
  SLOT_FILLED: 0x1a2a1a, SLOT_FILLED_BORDER: 0x27ae60,
  OVERLAY_BG: 0x000000,
  TEXT_PRIMARY: "#e0d8c0", TEXT_GOLD: "#f5c86a", TEXT_DIM: "#7a7e85",
  TEXT_DANGER: "#e74c3c", TEXT_HEAL: "#2ecc71", TEXT_DAMAGE: "#e67e22",
  QUALITY_COLORS: { 白: "#bdc3c7", 蓝: "#3498db", 金: "#f5c86a", 红: "#e74c3c" },
};

function getGridCenter(gridNum) {
  const idx = gridNum - 1;
  return {
    x: GRID_LEFT + (idx % GRID_COLS) * (CELL_W + CELL_GAP) + CELL_W / 2,
    y: GRID_TOP + Math.floor(idx / GRID_COLS) * (CELL_H + CELL_GAP) + CELL_H / 2,
  };
}

function getItemSlotCenter(index) {
  return { x: ITEM_START_X + index * (ITEM_SLOT_W + ITEM_SLOT_GAP) + ITEM_SLOT_W / 2, y: ITEM_Y };
}

// ==================== 战斗场景 ====================

export class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  // ============ 生命周期 ============

  create() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, COLOR.BG_DARK).setOrigin(0.5);

    // 禁用浏览器右键菜单（装备栏右键丢弃用）
    this.input.mouse.disableContextMenu();

    this.initGameState();
    this.createGrid();
    this.createStaticUI();

    // 底部日志
    this.logText = this.add
      .text(GAME_W / 2, GAME_H - 12, "🖱️ 点击怪物战斗 | 点击帮助卡拾取", {
        fontFamily: "monospace", fontSize: "12px", color: COLOR.TEXT_DIM,
      })
      .setOrigin(0.5, 1);
    this.logTimer = null;

    // 通关按钮（隐藏）
    this.passButton = null;

    // 覆盖层容器（帮助卡选择/商店等）
    this.overlayContainer = null;

    // 启动第一个节点
    this.startNewNode(1);
  }

  update() {
    if (this.targeting && this.escKey) {
      if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this.exitTargeting(false);
      }
    }
  }

  // ============ 游戏状态初始化 ============

  initGameState() {
    // 玩家属性（深拷贝初始值）
    const p = PLAYER_INIT;
    this.playerState = {
      name: p.name, hp: p.hp, maxHp: p.maxHp,
      attack: p.attack, baseAttack: p.baseAttack,
      defense: p.defense, baseDefense: p.baseDefense,
      gold: p.gold, isViolenceActive: false, shieldActive: false,
    };

    // uid 计数器（必须在 buildInitialHelpDeck 之前初始化）
    this.nextUid = 0;

    // 卡组
    this.helpDeck = this.buildInitialHelpDeck();
    this.battleDeck = [];
    this.demonDeck = [];
    this.boardCards = new Map();  // gridNum -> cardData (非显示对象)
    this.itemSlots = new Array(ITEM_SLOT_COUNT).fill(null);
    this.cardDisplays = new Map();
    this.itemSlotDisplays = new Array(ITEM_SLOT_COUNT).fill(null);
    this.targeting = null;
    this.escKey = this.input.keyboard.addKey("ESC");

    // 节点状态
    this.currentNode = 0;
    this.currentLayer = 1;
    this.nodeComplete = false;
    this.nodeDrawnHelpUids = []; // 本节点从帮助卡组抽出的卡 uid
    this.nodeUsedHelpUids = [];  // 本节点已使用的帮助卡 uid

    // 装备/遗物
    this.equippedRelics = ["村好剑"];
    this.relicBonuses = { atk: 0, def: 0, maxHp: 0, thornDmg: 0, healOnKill: 0, eliteGold: 0 };

    // 已习得技能
    this.learnedSkills = [];
    this.battleVetState = { lastTargetId: null, stacks: 0 };

    // 节点追踪
    this.totalKilledThisNode = 0;
    this.clickCounter = {};
  }

  /** 创建一张带唯一 uid 的帮助卡 */
  createHelpCard(key) {
    const def = HELP_CARDS[key];
    if (!def) return null;
    return { key, uid: this.nextUid++, ...def };
  }

  buildInitialHelpDeck() {
    const deck = [];
    for (const item of INITIAL_HELP_DECK) {
      for (let i = 0; i < item.quantity; i++) {
        const card = this.createHelpCard(item.name);
        if (card) deck.push(card);
      }
    }
    return this.shuffle(deck);
  }

  // ============ 九宫格渲染 ============

  createGrid() {
    this.gridCells = {};
    const gridBgX = GRID_LEFT - 12, gridBgY = GRID_TOP - 12;
    const gridBgW = GRID_TOTAL_W + 24, gridBgH = GRID_TOTAL_H + 24;
    const gridBg = this.add
      .rectangle(gridBgX + gridBgW / 2, gridBgY + gridBgH / 2, gridBgW, gridBgH, 0x1e2025)
      .setOrigin(0.5).setStrokeStyle(1, 0x3a3d44).setInteractive({ useHandCursor: false });

    gridBg.on("pointerdown", () => {
      if (this.targeting) this.exitTargeting(false);
    });

    this.add.text(gridBgX + gridBgW / 2, gridBgY - 16, "⚔ 作战场地 ⚔", {
      fontFamily: "serif", fontSize: "14px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 1);

    for (let i = 1; i <= 9; i++) {
      const { x, y } = getGridCenter(i);
      const isPlayerCell = i === 5;
      const fc = isPlayerCell ? COLOR.GRID_PLAYER : COLOR.GRID_NORMAL;
      const bc = isPlayerCell ? COLOR.GRID_PLAYER_BORDER : COLOR.GRID_NORMAL_BORDER;

      const cell = this.add.rectangle(x, y, CELL_W, CELL_H, fc).setOrigin(0.5).setStrokeStyle(1, bc);
      const label = this.add.text(x - CELL_W / 2 + 4, y - CELL_H / 2 + 2, `${i}`, {
        fontFamily: "monospace", fontSize: "10px",
        color: isPlayerCell ? COLOR.TEXT_GOLD : COLOR.TEXT_DIM,
      });
      this.gridCells[i] = { rect: cell, label, x, y, isPlayerCell };
    }
  }

  setGridHighlight(gridNum, on) {
    const cell = this.gridCells[gridNum];
    if (!cell || cell.isPlayerCell) return;
    cell.rect.setFillStyle(on ? COLOR.GRID_TARGET : COLOR.GRID_NORMAL);
    cell.rect.setStrokeStyle(on ? 2 : 1, on ? COLOR.GRID_TARGET_BORDER : COLOR.GRID_NORMAL_BORDER);
  }

  // ============ 节点与卡组管理 ============

  startNewNode(nodeNum) {
    this.currentNode = nodeNum;
    this.nodeComplete = false;
    this.nodeDrawnHelpUids = [];
    this.nodeUsedHelpUids = [];

    // 重置玩家战斗状态
    this.playerState.isViolenceActive = false;
    this.playerState.shieldActive = false;
    this.playerState.attack = this.playerState.baseAttack;
    this.playerState.defense = this.playerState.baseDefense;

    // 清空棋盘
    for (const [gn] of this.boardCards) this.destroyCardDisplay(gn);
    this.boardCards.clear();
    for (let i = 0; i < ITEM_SLOT_COUNT; i++) this.itemSlots[i] = null;

    // 玩家卡固定在格5
    this.boardCards.set(5, { type: "player", data: null });

    // ★ 快照保存节点前的帮助卡组（用于复盘原样恢复）
    this._preNodeHelpDeck = JSON.parse(JSON.stringify(this.helpDeck));

    // 重置节点计数器
    this.totalKilledThisNode = 0;
    this.clickCounter = {};
    this.battleVetState = { lastTargetId: null, stacks: 0 };
    this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode);

    // 金色宝箱遗物效果
    applyGoldenChestRelic(this.equippedRelics, this.helpDeck, (k) => this.createHelpCard(k));

    // 生成恶魔卡组
    const config = getNodeConfig(nodeNum);
    this.demonDeck = [];
    if (config.monsters) {
      for (const m of config.monsters) this.demonDeck.push({ type: "monster", data: m });
    }
    // 精英/层主作为额外卡加入基础恶魔卡组
    if (config.isElite && config.eliteMonster) {
      this.demonDeck.push({ type: "monster", data: config.eliteMonster, isElite: true,
        eliteDrop: config.eliteMonster.eliteDrop });
    }
    if (config.isBoss && config.bossMonster) {
      this.demonDeck.push({ type: "monster", data: config.bossMonster, isBoss: true,
        bossDrop: config.bossMonster.bossDrop });
    }
    this.demonDeck = this.shuffle(this.demonDeck);

    // 发牌
    this.dealInitialCards();

    // 渲染棋盘
    this.renderAllCards();
    this.renderAllItemSlots();
    this.updateAllUI();
    this.hidePassButton();

    const info = config.isElite ? "💀 精英战！" : config.isBoss ? "👑 层主战！" : "";
    this.setLog(`📍 第 ${nodeNum} 节点 ${info}战斗卡组: ${this.battleDeck.length} 张`);
  }

  dealInitialCards() {
    const emptySlots = [1, 2, 3, 4, 6, 7, 8, 9];
    const shuffled = this.shuffle(emptySlots);

    // 从帮助卡组抽 3 张
    const helpCount = Math.min(3, this.helpDeck.length);
    this.nodeDrawnHelpUids = [];
    for (let i = 0; i < helpCount; i++) {
      const card = this.helpDeck.pop();
      const slot = shuffled.pop();
      card._slot = slot;
      this.boardCards.set(slot, { type: "help", data: { ...card }, _fromHelpDeck: true });
      this.nodeDrawnHelpUids.push(card.uid);
    }

    // 从恶魔卡组抽 3 张
    const demonCount = Math.min(3, this.demonDeck.length);
    for (let i = 0; i < demonCount; i++) {
      const card = this.demonDeck.pop();
      const slot = shuffled.pop();
      card._slot = slot;
      this.boardCards.set(slot, card);
    }

    // 剩余帮助卡 + 全部恶魔卡 → 战斗卡组
    const remainingHelp = this.helpDeck.splice(0).map((c) => ({
      type: "help",
      data: { ...c },
      _fromHelpDeck: true,
    }));
    this.helpCardsInBattleDeck = remainingHelp;
    this.battleDeck = this.shuffle([...remainingHelp, ...this.demonDeck]);
    this.demonDeck = [];

    // 从战斗卡组抽 2 张
    for (let i = 0; i < 2 && shuffled.length > 0; i++) {
      this.drawFromBattleDeck(shuffled.pop());
    }
  }

  drawFromBattleDeck(slot) {
    if (!slot) {
      const empty = [1, 2, 3, 4, 6, 7, 8, 9].find(
        (gn) => !this.boardCards.has(gn)
      );
      if (empty === undefined) return null;
      slot = empty;
    }

    if (this.battleDeck.length === 0) return null;

    const card = this.battleDeck.pop();
    this.boardCards.set(slot, card);
    this.renderCard(slot);
    this.updateDeckUI();

    this.time.delayedCall(200, () => this.checkNodeComplete());
    return card;
  }

  checkNodeComplete() {
    if (this.nodeComplete) return;

    let hasMonsters = false;
    for (const [, card] of this.boardCards) {
      if (card.type === "monster") { hasMonsters = true; break; }
    }

    if (!hasMonsters && this.battleDeck.length === 0) {
      this.nodeComplete = true;
      this.showPassButton();
    }
  }

  showPassButton() {
    this.hidePassButton();
    const btnX = GRID_LEFT + GRID_TOTAL_W / 2;
    const btnY = GRID_TOP + GRID_TOTAL_H + 24;

    const btnBg = this.add
      .rectangle(btnX, btnY, 140, 32, 0x2a5a1a)
      .setOrigin(0.5).setStrokeStyle(2, 0x4ae04a)
      .setInteractive({ useHandCursor: true }).setDepth(20);

    const btnText = this.add
      .text(btnX, btnY, "🏆 通 关", {
        fontFamily: "serif", fontSize: "16px", fontStyle: "bold", color: "#4ae04a",
      }).setOrigin(0.5).setDepth(21);

    btnBg.on("pointerdown", () => this.completeNode());
    btnBg.on("pointerover", () => btnBg.setFillStyle(0x3a7a2a));
    btnBg.on("pointerout", () => btnBg.setFillStyle(0x2a5a1a));

    this.passButton = { bg: btnBg, text: btnText };
    this.setLog("🎉 所有怪物已清除！点击「通关」进入奖励环节");
  }

  hidePassButton() {
    if (this.passButton) {
      this.passButton.bg.destroy();
      this.passButton.text.destroy();
      this.passButton = null;
    }
  }

  completeNode() {
    this.hidePassButton();

    // ★ 计算未使用帮助卡金币（基于 uid 精确匹配，同名卡各自独立计算）
    let unusedGold = 0;
    let debugCount = 0;
    const debugLines = [];
    for (const [gn, card] of this.boardCards) {
      if (card.type === "help") {
        const isFromDeck = !!card._fromHelpDeck;
        const hasUid = card.data?.uid !== undefined;
        const wasUsed = hasUid && this.nodeUsedHelpUids.includes(card.data.uid);
        const counted = isFromDeck && hasUid && !wasUsed;
        if (counted) { unusedGold += 20; debugCount++; }
        debugLines.push(
          `  格${gn}「${card.data?.name}」uid=${card.data?.uid} fromDeck=${isFromDeck} used=${wasUsed} → ${counted ? "+20" : "跳过"}`
        );
      }
    }
    for (let i = 0; i < this.itemSlots.length; i++) {
      const slot = this.itemSlots[i];
      if (slot && slot.type === "help") {
        const isFromDeck = !!slot._fromHelpDeck;
        const hasUid = slot.data?.uid !== undefined;
        const wasUsed = hasUid && this.nodeUsedHelpUids.includes(slot.data.uid);
        const counted = isFromDeck && hasUid && !wasUsed;
        if (counted) { unusedGold += 20; debugCount++; }
        debugLines.push(
          `  牌格#${i+1}「${slot.data?.name}」uid=${slot.data?.uid} fromDeck=${isFromDeck} used=${wasUsed} → ${counted ? "+20" : "跳过"}`
        );
      }
    }
    console.log(
      `[金币结算] 棋盘帮助卡: ${[...this.boardCards.entries()].filter(([_,c]) => c.type === 'help').length}张, ` +
      `已使用uid: [${this.nodeUsedHelpUids.join(',')}]\n` +
      debugLines.join('\n') +
      `\n  未使用: ${debugCount}张 = +${unusedGold}金币`
    );

    // ★ 快照恢复帮助卡组（简单可靠）
    this.helpDeck = JSON.parse(JSON.stringify(this._preNodeHelpDeck));
    this.helpCardsInBattleDeck = null;
    this.battleDeck = [];
    this.nodeDrawnHelpUids = [];
    this.nodeUsedHelpUids = [];

    // 节点结束遗物/技能恢复
    let healAmt = 0;
    // 活力护符
    const vhRelic = this.equippedRelics.find((k) => RELICS[k]?.healPerNode);
    if (vhRelic) healAmt += RELICS[vhRelic].healPerNode;
    // 硬皮技能
    const hs = calcHardSkinBonus(this.learnedSkills);
    healAmt += hs.healPerNode;
    if (healAmt > 0) {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + healAmt);
    }
    // 破甲恢复：防御复原到基础值
    this.playerState.defense = this.playerState.baseDefense;
    this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode);

    this.playerState.gold += unusedGold;
    if (unusedGold > 0) {
      this.setLog(`💰 未使用帮助卡奖励: +${unusedGold} 金币`);
    }
    this.updatePlayerUI();
    this.updateSkillUI();

    // 显示帮助卡选择
    this.time.delayedCall(800, () => this.showHelpCardSelection());
  }

  // ============ 帮助卡选择 ============

  showHelpCardSelection() {
    // 生成 3 张随机帮助卡
    const choices = this.generateRandomHelpCards(3);

    const { bg, container } = this.createOverlay("🎴 选择一张帮助卡加入卡组");
    const startX = GAME_W / 2 - 180;
    const y = GAME_H / 2;

    const choiceCards = [];
    choices.forEach((cardKey, i) => {
      const def = HELP_CARDS[cardKey];
      const x = startX + i * 180;
      const card = this.createSelectionCard(x, y, def, () => {
        // 检查种类容量
        if (!this.canAddHelpCard()) {
          this.setLog("⚠️ 帮助卡组种类已达上限，无法加入！");
          return;
        }
        // 检查同名堆叠上限
        if (!this.canAddHelpCardStack(cardKey)) {
          this.showPopup(`⚠️「${def.name}」已达卡组上限（最多 3 张），无法加入！`);
          return;
        }
        const newCard = this.createHelpCard(cardKey);
        if (newCard) this.helpDeck.push(newCard);
        this.setLog(`✨ 获得「${def.name}」（${def.quality}）`);
        this.destroyOverlay();

        // 进入商店
        this.time.delayedCall(600, () => this.showShop());
      });
      choiceCards.push(card);
    });

    // 跳过按钮
    const skipX = GAME_W / 2;
    const skipY = GAME_H / 2 + 130;
    const skipBg = this.add
      .rectangle(skipX, skipY, 160, 32, 0x353535)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER)
      .setInteractive({ useHandCursor: true }).setDepth(92);
    const skipText = this.add
      .text(skipX, skipY, "跳过 → +20💰", {
        fontFamily: "serif", fontSize: "13px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5).setDepth(93);
    skipBg.on("pointerdown", () => {
      this.playerState.gold += 20;
      this.setLog("↩ 跳过选牌，获得 20 金币");
      this.destroyOverlay();
      this.time.delayedCall(600, () => this.showShop());
    });
    skipBg.on("pointerover", () => skipBg.setFillStyle(0x4a4a4a));
    skipBg.on("pointerout", () => skipBg.setFillStyle(0x353535));
    choiceCards.push([skipBg, skipText]);

    this.overlayObjects = [bg, container, ...choiceCards.flat()];
  }

  generateRandomHelpCards(count) {
    const result = [];
    const pool = [];
    for (const [quality, cards] of Object.entries(HELP_CARDS_BY_QUALITY)) {
      if (quality === "红") continue; // 红色不随机出现
      pool.push(...cards);
    }

    const shuffled = this.shuffle(pool);
    // 按品质概率筛选
    const filtered = shuffled.filter(() => {
      const r = Math.random();
      return r < 0.95; // 95% 概率保留（简化品质筛选）
    });

    for (let i = 0; i < count && i < filtered.length; i++) {
      result.push(filtered[i]);
    }
    // 补足
    while (result.length < count) {
      const r = shuffled[Math.floor(Math.random() * shuffled.length)];
      if (!result.includes(r)) result.push(r);
    }
    return result;
  }

  /** 检查同名帮助卡是否已达 3 张上限 */
  canAddHelpCardStack(key) {
    const count = this.helpDeck.filter((c) => c.key === key).length;
    return count < 3;
  }

  canAddHelpCard() {
    const uniqueKeys = new Set();
    for (const c of this.helpDeck) uniqueKeys.add(c.key);
    const cap = HELP_DECK_CAPACITY[this.currentLayer] || 12;
    return uniqueKeys.size < cap;
  }

  // ============ 商店 ============

  showShop(boughtUids = new Set()) {
    this.destroyOverlay();
    this._shopBoughtUids = boughtUids;

    const { bg, container } = this.createOverlay(
      `🛒 商店 — 金币: ${this.playerState.gold}`
    );
    this.overlayObjects = [bg, container];

    const startX = GAME_W / 2 - 280;
    const buyY = GAME_H / 2 - 50;

    // ===== 购买区：6 张随机帮助卡 =====
    const buyCards = this.shuffle([...this.helpDeck]).slice(0, 6);

    buyCards.forEach((card, i) => {
      const x = startX + i * 110;
      // 已被购买的显示空白
      if (boughtUids.has(card.uid)) {
        const emptyBg = this.add.rectangle(x, buyY, 100, 110, 0x15181b)
          .setOrigin(0.5).setStrokeStyle(1, 0x2a2a2a).setDepth(92);
        const emptyText = this.add.text(x, buyY, "已售出", {
          fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_DIM,
        }).setOrigin(0.5).setDepth(93);
        this.overlayObjects.push(emptyBg, emptyText);
      } else {
        const objs = this.createShopCard(x, buyY, card, "buy", () => {
          if (this.playerState.gold < 100) {
            this.setLog("⚠️ 金币不足！（需要 100 金币）"); return;
          }
          if (!this.canAddHelpCardStack(card.key)) {
            this.showPopup(`⚠️「${card.name}」已达卡组上限（最多 3 张），无法购买！`); return;
          }
          this.playerState.gold -= 100;
          const newCard = this.createHelpCard(card.key);
          if (newCard) this.helpDeck.push(newCard);
          this.setLog(`🛒 购买「${card.name}」-100💰`);
          this.updatePlayerUI();
          const next = new Set(boughtUids);
          next.add(card.uid);
          this.showShop(next);
        });
        this.overlayObjects.push(...objs);
      }
    });

    // ===== 删卡按钮 =====
    const delBtnX = GAME_W / 2 - 100;
    const delBtnY = buyY + 140;
    const delBtnBg = this.add
      .rectangle(delBtnX, delBtnY, 180, 36, 0x302020)
      .setOrigin(0.5).setStrokeStyle(2, 0xc0392b)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const delBtnText = this.add
      .text(delBtnX, delBtnY, "🗑️ 删除帮助卡 (+20💰)", {
        fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_DANGER,
      }).setOrigin(0.5).setDepth(101);
    delBtnBg.on("pointerdown", () => this.showDeleteScreen());
    delBtnBg.on("pointerover", () => delBtnBg.setFillStyle(0x4a3030));
    delBtnBg.on("pointerout", () => delBtnBg.setFillStyle(0x302020));
    this.overlayObjects.push(delBtnBg, delBtnText);

    // ===== 离开按钮 =====
    const leaveX = GAME_W / 2 + 100;
    const leaveY = buyY + 140;
    const leaveBg = this.add
      .rectangle(leaveX, leaveY, 180, 36, 0x4a3520)
      .setOrigin(0.5).setStrokeStyle(2, 0xf5c86a)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const leaveText = this.add
      .text(leaveX, leaveY, "▶ 前往下一节点", {
        fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5).setDepth(101);
    leaveBg.on("pointerdown", () => {
      this.destroyOverlay();
      this.time.delayedCall(300, () => {
        if (this.currentNode >= 9) {
          this.showLayerComplete();
        } else {
          this.startNewNode(this.currentNode + 1);
        }
      });
    });
    leaveBg.on("pointerover", () => leaveBg.setFillStyle(0x6a5530));
    leaveBg.on("pointerout", () => leaveBg.setFillStyle(0x4a3520));
    this.overlayObjects.push(leaveBg, leaveText);
  }

  /** 导师卡：击败精英后三选一技能 */
  showMentorCard() {
    this.destroyOverlay();
    const { bg, container } = this.createOverlay("🎓 导师卡 — 选择一项技能永久习得");
    this.overlayObjects = [bg, container];

    const skills = [
      {
        name: "刺皮", desc: "每次被攻击，对攻击者造成等同于其攻击力的反伤",
        action: () => {
          this.learnedSkills.push("刺皮");
          this.setLog("🎓 习得「刺皮」：受伤时反伤攻击者");
        },
      },
      {
        name: "硬皮", desc: "血量上限 +10，每关结束恢复 10 血",
        action: () => {
          this.learnedSkills.push("硬皮");
          const hs = calcHardSkinBonus(this.learnedSkills);
          this.playerState.maxHp += hs.maxHp;
          this.playerState.hp += hs.maxHp;
          this.setLog(`🎓 习得「硬皮」：血量上限 +${hs.maxHp}`);
        },
      },
      {
        name: "历战", desc: "每次与同一敌人战斗攻击+1，换目标复原",
        action: () => {
          this.learnedSkills.push("历战");
          this.setLog("🎓 习得「历战」：连续攻击同目标递增攻击力");
        },
      },
      {
        name: "先攻", desc: "优先造成伤害（双方均有先攻则玩家先）",
        action: () => {
          this.learnedSkills.push("先攻");
          this.setLog("🎓 习得「先攻」：战斗时优先攻击");
        },
      },
    ];

    // 随机选 3 个
    const choices = this.shuffle(skills).slice(0, 3);
    const startX = GAME_W / 2 - 180;

    choices.forEach((skill, i) => {
      const x = startX + i * 180, y = GAME_H / 2;
      const cardW = 160, cardH = 180;

      const cardBg = this.add
        .rectangle(x, y, cardW, cardH, 0x252830)
        .setOrigin(0.5).setStrokeStyle(2, 0x9b59b6)
        .setInteractive({ useHandCursor: true }).setDepth(92);

      const nameText = this.add.text(x, y - cardH / 2 + 16, skill.name, {
        fontFamily: "serif", fontSize: "16px", fontStyle: "bold", color: "#9b59b6",
      }).setOrigin(0.5, 0).setDepth(93);

      const descText = this.add.text(x, y + 10, skill.desc, {
        fontFamily: "sans-serif", fontSize: "11px", color: COLOR.TEXT_PRIMARY,
        wordWrap: { width: cardW - 20 }, align: "center",
      }).setOrigin(0.5, 0).setDepth(93);

      const pickText = this.add.text(x, y + cardH / 2 - 18, "👆 选择", {
        fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 1).setDepth(93);

      cardBg.on("pointerdown", () => {
        skill.action();
        this.destroyOverlay();
        this.updatePlayerUI();
        this.updateEquipmentUI();
        // 继续通关流程（检查是否需要显示通关按钮）
        this.checkNodeComplete();
      });
      cardBg.on("pointerover", () => cardBg.setStrokeStyle(3, 0x9b59b6));
      cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, 0x9b59b6));

      this.overlayObjects.push(cardBg, nameText, descText, pickText);
    });
  }

  /** 独立删卡界面：展示帮助卡组所有卡牌 */
  showDeleteScreen() {
    this.destroyOverlay();
    const { bg, container } = this.createOverlay(
      `🗑️ 删除帮助卡 — 金币: ${this.playerState.gold}`
    );
    this.overlayObjects = [bg, container];

    const allCards = [...this.helpDeck];
    const cols = 4;
    const cardW = 140, cardH = 120, gapX = 16, gapY = 16;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (GAME_W - totalW) / 2 + cardW / 2;
    const startY = 100;

    if (allCards.length === 0) {
      const emptyText = this.add
        .text(GAME_W / 2, GAME_H / 2, "帮助卡组为空", {
          fontFamily: "serif", fontSize: "18px", color: COLOR.TEXT_DIM,
        }).setOrigin(0.5).setDepth(91);
      this.overlayObjects.push(emptyText);
    } else {
      allCards.forEach((card, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        const qColor = parseInt(
          ({ 白: "0xbdc3c7", 蓝: "0x3498db", 金: "0xf5c86a", 红: "0xe74c3c" })[card.quality] || "0xbdc3c7"
        );
        const cardBg = this.add
          .rectangle(x, y, cardW, cardH, 0x252830)
          .setOrigin(0.5).setStrokeStyle(1, qColor).setDepth(92);
        const nameText = this.add
          .text(x, y - cardH / 2 + 12, card.name, {
            fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
          }).setOrigin(0.5, 0).setDepth(93);
        const qualText = this.add
          .text(x, y - cardH / 2 + 30, `[${card.quality}] ${card.effectDesc || ""}`, {
            fontFamily: "sans-serif", fontSize: "9px",
            color: COLOR.QUALITY_COLORS[card.quality] || COLOR.TEXT_DIM,
            wordWrap: { width: cardW - 16 }, align: "center",
          }).setOrigin(0.5, 0).setDepth(93);

        const delBg = this.add
          .rectangle(x, y + cardH / 2 - 16, cardW - 20, 22, 0x4a2020)
          .setOrigin(0.5).setStrokeStyle(1, 0xc0392b)
          .setInteractive({ useHandCursor: true }).setDepth(93);
        const delLabel = this.add
          .text(x, y + cardH / 2 - 16, "删除 +20💰", {
            fontFamily: "sans-serif", fontSize: "10px", fontStyle: "bold", color: COLOR.TEXT_DANGER,
          }).setOrigin(0.5).setDepth(94);

        delBg.on("pointerdown", () => {
          const idx = this.helpDeck.findIndex((c) => c.uid === card.uid);
          if (idx !== -1) {
            this.helpDeck.splice(idx, 1);
            this.playerState.gold += 20;
            this.setLog(`🗑️ 删除「${card.name}」+20💰`);
            this.updatePlayerUI();
            // 刷新删除界面
            this.showDeleteScreen();
          }
        });
        delBg.on("pointerover", () => delBg.setFillStyle(0x6a3030));
        delBg.on("pointerout", () => delBg.setFillStyle(0x4a2020));

        this.overlayObjects.push(cardBg, nameText, qualText, delBg, delLabel);
      });
    }

    // 返回按钮
    const backX = GAME_W / 2;
    const backY = GAME_H - 80;
    const backBg = this.add
      .rectangle(backX, backY, 180, 36, 0x353535)
      .setOrigin(0.5).setStrokeStyle(2, COLOR.PANEL_BORDER)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const backText = this.add
      .text(backX, backY, "↩ 返回商店", {
        fontFamily: "serif", fontSize: "13px", color: COLOR.TEXT_PRIMARY,
      }).setOrigin(0.5).setDepth(101);
    backBg.on("pointerdown", () => this.showShop(this._shopBoughtUids || new Set()));
    backBg.on("pointerover", () => backBg.setFillStyle(0x454545));
    backBg.on("pointerout", () => backBg.setFillStyle(0x353535));
    this.overlayObjects.push(backBg, backText);
  }

  showLayerComplete() {
    this.setLog("🏆 第一层通关！完整游戏将在阶段五实现");
    const { bg, container } = this.createOverlay("🏆 第一层通关！");
    const text = this.add
      .text(GAME_W / 2, GAME_H / 2, "恭喜！第一层 9 个节点已全部通过\n完整三层游戏将在阶段五实现", {
        fontFamily: "serif", fontSize: "18px", color: COLOR.TEXT_GOLD, align: "center",
      }).setOrigin(0.5).setDepth(100);
    this.overlayObjects = [bg, container, text];
  }

  // ============ 覆盖层工具 ============

  createOverlay(title) {
    const bg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, COLOR.OVERLAY_BG, 0.85)
      .setOrigin(0.5).setDepth(90).setInteractive();

    const container = this.add
      .text(GAME_W / 2, 30, title, {
        fontFamily: "serif", fontSize: "18px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 0).setDepth(91);

    return { bg, container };
  }

  destroyOverlay() {
    if (this.overlayObjects) {
      for (const obj of this.overlayObjects) {
        if (obj && obj.active) obj.destroy();
      }
      this.overlayObjects = null;
    }
  }

  /** 弹出提示窗口，点击任意位置关闭 */
  showPopup(message) {
    const popupW = 360, popupH = 90;
    const bg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6)
      .setOrigin(0.5).setDepth(200).setInteractive();
    const box = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, popupW, popupH, 0x2a2020)
      .setOrigin(0.5).setStrokeStyle(2, 0xc0392b).setDepth(201);
    const text = this.add
      .text(GAME_W / 2, GAME_H / 2, message, {
        fontFamily: "serif", fontSize: "14px", fontStyle: "bold",
        color: COLOR.TEXT_DANGER, align: "center",
        wordWrap: { width: popupW - 30 },
      }).setOrigin(0.5).setDepth(202);

    const dismiss = () => { bg.destroy(); box.destroy(); text.destroy(); };
    bg.on("pointerdown", dismiss);
    box.on("pointerdown", dismiss);
    text.on("pointerdown", dismiss);
  }

  createSelectionCard(x, y, def, onClick) {
    const cardW = 160, cardH = 200;
    const qColor = parseInt(
      ({ 白: "0xbdc3c7", 蓝: "0x3498db", 金: "0xf5c86a", 红: "0xe74c3c" })[def.quality]
    );

    const cardBg = this.add
      .rectangle(x, y, cardW, cardH, 0x252830)
      .setOrigin(0.5).setStrokeStyle(2, qColor)
      .setInteractive({ useHandCursor: true }).setDepth(92);

    const nameText = this.add
      .text(x, y - cardH / 2 + 16, def.name, {
        fontFamily: "serif", fontSize: "14px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
      }).setOrigin(0.5, 0).setDepth(93);

    const qualText = this.add
      .text(x, y - cardH / 2 + 36, `品质: ${def.quality}`, {
        fontFamily: "monospace", fontSize: "10px",
        color: COLOR.QUALITY_COLORS[def.quality],
      }).setOrigin(0.5, 0).setDepth(93);

    const descText = this.add
      .text(x, y + 10, def.effectDesc, {
        fontFamily: "sans-serif", fontSize: "11px", color: COLOR.TEXT_PRIMARY,
        wordWrap: { width: cardW - 20 }, align: "center",
      }).setOrigin(0.5, 0).setDepth(93);

    const pickText = this.add
      .text(x, y + cardH / 2 - 18, "👆 点击选择", {
        fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 1).setDepth(93);

    cardBg.on("pointerdown", onClick);
    cardBg.on("pointerover", () => cardBg.setStrokeStyle(3, qColor));
    cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, qColor));

    return [cardBg, nameText, qualText, descText, pickText];
  }

  createShopCard(x, y, card, mode, onClick) {
    const cardW = 100, cardH = 110;
    const objs = [];
    const qColorStr = COLOR.QUALITY_COLORS[card.quality] || "#bdc3c7";
    const qColor = parseInt(
      ({ 白: "0xbdc3c7", 蓝: "0x3498db", 金: "0xf5c86a", 红: "0xe74c3c" })[card.quality]
    );

    const bg = this.add
      .rectangle(x, y, cardW, cardH, mode === "buy" ? 0x252830 : 0x302020)
      .setOrigin(0.5).setStrokeStyle(1, qColor)
      .setInteractive({ useHandCursor: true }).setDepth(92);

    objs.push(bg);

    objs.push(this.add.text(x, y - cardH / 2 + 10, card.name, {
      fontFamily: "serif", fontSize: "10px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
    }).setOrigin(0.5, 0).setDepth(93));

    objs.push(this.add.text(x, y - cardH / 2 + 24, `[${card.quality}]`, {
      fontFamily: "monospace", fontSize: "8px", color: qColorStr,
    }).setOrigin(0.5, 0).setDepth(93));

    if (card.effectDesc) {
      objs.push(this.add.text(x, y + 8, card.effectDesc, {
        fontFamily: "sans-serif", fontSize: "8px", color: COLOR.TEXT_DIM,
        wordWrap: { width: cardW - 12 }, align: "center",
      }).setOrigin(0.5, 0).setDepth(93));
    }

    const label = mode === "buy" ? "💰100 购买" : "🗑️ +20 删除";
    const labelColor = mode === "buy" ? COLOR.TEXT_GOLD : COLOR.TEXT_DANGER;
    objs.push(this.add.text(x, y + cardH / 2 - 14, label, {
      fontFamily: "sans-serif", fontSize: "9px", color: labelColor,
    }).setOrigin(0.5, 1).setDepth(93));

    bg.on("pointerdown", onClick);
    bg.on("pointerover", () => bg.setStrokeStyle(2, qColor));
    bg.on("pointerout", () => bg.setStrokeStyle(1, qColor));

    return objs;
  }

  // ============ 卡牌显示 ============

  renderCard(gridNum) {
    const card = this.boardCards.get(gridNum);
    if (!card) return;

    this.destroyCardDisplay(gridNum);

    const { x, y } = getGridCenter(gridNum);
    const cardW = CELL_W - 12, cardH = CELL_H - 12;
    const texts = [];

    let fillColor, borderColor;
    if (card.type === "player") {
      fillColor = COLOR.CARD_PLAYER; borderColor = COLOR.CARD_PLAYER_BORDER;
    } else if (card.type === "monster") {
      fillColor = COLOR.CARD_MONSTER; borderColor = COLOR.CARD_MONSTER_BORDER;
    } else {
      fillColor = COLOR.CARD_HELP; borderColor = COLOR.CARD_HELP_BORDER;
    }

    const bg = this.add
      .rectangle(x, y, cardW, cardH, fillColor)
      .setOrigin(0.5).setStrokeStyle(2, borderColor).setDepth(1);

    // 名称
    const displayName = card.type === "player" ? this.playerState.name : card.data.name;
    let namePrefix = "";
    if (card.isElite) namePrefix = "💀";
    else if (card.isBoss) namePrefix = "👑";
    texts.push(this.add.text(x, y - cardH / 2 + 12, namePrefix + displayName, {
      fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
    }).setOrigin(0.5, 0).setDepth(2));

    // 属性
    if (card.type === "player") {
      const p = this.playerState;
      const eff = this.getEffectiveStats();
      const stats = [
        `♥ ${p.hp}/${p.maxHp}${p.shieldActive ? "🛡️" : ""}`,
        `⚔ ${eff.atk}${p.isViolenceActive ? "💪" : ""}`,
        `🛡 ${eff.def}`,
      ];
      stats.forEach((s, i) => {
        texts.push(this.add.text(x, y - 3 + i * 15, s, {
          fontFamily: "monospace", fontSize: "10px",
          color: [COLOR.TEXT_DANGER, COLOR.TEXT_DAMAGE, "#3498db"][i],
        }).setOrigin(0.5, 0).setDepth(2));
      });
    } else if (card.type === "monster") {
      const m = card.data;
      const inspireBonus = calcInspireBonus(this.boardCards, gridNum);
      const revengeBonus = calcRevengeBonus(m, this.totalKilledThisNode);
      const effAtk = m.attack + inspireBonus + revengeBonus;
      const stats = [
        `♥ ${m.hp}/${m.maxHp || m.hp}`,
        `⚔ ${effAtk}${inspireBonus > 0 ? "📯" : ""}${revengeBonus > 0 ? "💢" : ""}`,
        `🛡 ${m.defense}`,
      ];
      if (m.traits && m.traits.length > 0) {
        stats.push(`词条: ${m.traits.join(",")}`);
      }
      if (m.level) stats.push(`Lv.${m.level}`);
      stats.forEach((s, i) => {
        texts.push(this.add.text(x, y - 3 + i * 15, s, {
          fontFamily: "monospace", fontSize: "10px",
          color: [COLOR.TEXT_DANGER, COLOR.TEXT_DAMAGE, "#3498db", "#9b59b6", COLOR.TEXT_DIM][i] || COLOR.TEXT_PRIMARY,
        }).setOrigin(0.5, 0).setDepth(2));
      });
    } else if (card.type === "help") {
      const h = card.data;
      const qColor = COLOR.QUALITY_COLORS[h.quality] || "#bdc3c7";
      texts.push(this.add.text(x, y - 3, `品质: ${h.quality}`, {
        fontFamily: "monospace", fontSize: "10px", color: qColor,
      }).setOrigin(0.5, 0).setDepth(2));
      texts.push(this.add.text(x, y + cardH / 2 - 24, h.effectDesc, {
        fontFamily: "sans-serif", fontSize: "9px", color: COLOR.TEXT_DIM,
        wordWrap: { width: cardW - 12 }, align: "center",
      }).setOrigin(0.5, 1).setDepth(2));
    }

    // 类型图标
    const iconMap = { player: "👤", monster: "👹", help: "✨" };
    texts.push(this.add.text(x + cardW / 2 - 14, y - cardH / 2 + 2, iconMap[card.type], {
      fontFamily: "monospace", fontSize: "9px",
    }).setOrigin(1, 0).setDepth(2));

    // 交互
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.handleGridClick(gridNum, card));
    bg.on("pointerover", () => {
      if (this.targeting && card.type === "monster") bg.setStrokeStyle(3, COLOR.GRID_TARGET_BORDER);
      else bg.setStrokeStyle(3, borderColor);
    });
    bg.on("pointerout", () => bg.setStrokeStyle(2, borderColor));

    this.cardDisplays.set(gridNum, { bg, texts, type: card.type });
  }

  destroyCardDisplay(gridNum) {
    const d = this.cardDisplays.get(gridNum);
    if (d) {
      d.bg.destroy();
      d.texts.forEach((t) => t.destroy());
      this.cardDisplays.delete(gridNum);
    }
  }

  refreshCardTexts(gridNum) {
    this.destroyCardDisplay(gridNum);
    this.renderCard(gridNum);
  }

  renderAllCards() {
    for (const [gn] of this.boardCards) this.renderCard(gn);
  }

  // ============ 道具牌格 ============

  renderItemSlot(index) {
    this._clearItemSlotDisplay(index);
    const item = this.itemSlots[index];
    const { x, y } = getItemSlotCenter(index);
    const objs = [];

    let fill = COLOR.SLOT_EMPTY, border = COLOR.SLOT_BORDER;
    if (item) {
      fill = COLOR.SLOT_FILLED; border = COLOR.SLOT_FILLED_BORDER;
      objs.push(this.add.text(x, y - ITEM_SLOT_H / 2 + 8, item.data.name, {
        fontFamily: "serif", fontSize: "11px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
      }).setOrigin(0.5, 0).setDepth(2));
      objs.push(this.add.text(x, y + ITEM_SLOT_H / 2 - 18, item.data.effectDesc, {
        fontFamily: "sans-serif", fontSize: "8px", color: COLOR.TEXT_DIM,
        wordWrap: { width: ITEM_SLOT_W - 10 }, align: "center",
      }).setOrigin(0.5, 1).setDepth(2));
      objs.push(this.add.text(x, y + ITEM_SLOT_H / 2 - 6, "点击使用", {
        fontFamily: "sans-serif", fontSize: "7px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 1).setDepth(2));
    } else {
      objs.push(this.add.text(x, y + ITEM_SLOT_H / 2 - 12, `${index + 1}`, {
        fontFamily: "monospace", fontSize: "9px", color: COLOR.TEXT_DIM,
      }).setOrigin(0.5).setDepth(2));
    }

    const slotBg = this.add
      .rectangle(x, y, ITEM_SLOT_W, ITEM_SLOT_H, fill)
      .setOrigin(0.5).setStrokeStyle(item ? 2 : 1, border).setDepth(1);
    slotBg.setInteractive({ useHandCursor: item != null });
    slotBg.on("pointerdown", () => {
      if (this.itemSlots[index]) this.handleItemSlotClick(index);
    });
    slotBg.on("pointerover", () => {
      if (this.itemSlots[index]) slotBg.setStrokeStyle(3, COLOR.TEXT_GOLD);
    });
    slotBg.on("pointerout", () => {
      slotBg.setStrokeStyle(item ? 2 : 1, border);
    });

    objs.unshift(slotBg);
    this.itemSlotDisplays[index] = objs;
  }

  _clearItemSlotDisplay(index) {
    const d = this.itemSlotDisplays[index];
    if (d) { d.forEach((o) => o.destroy()); this.itemSlotDisplays[index] = null; }
  }

  renderAllItemSlots() {
    for (let i = 0; i < ITEM_SLOT_COUNT; i++) this.renderItemSlot(i);
  }

  // ============ 点击处理 ============

  handleGridClick(gridNum, card) {
    // 节点通关后只允许与帮助卡交互（拾取到道具牌格使用）
    if (this.nodeComplete) {
      if (card.type === "help") {
        this.pickupHelpCard(gridNum);
      }
      return;
    }

    if (this.targeting) {
      this.handleTargetedClick(gridNum, card);
      return;
    }
    if (card.type === "player") {
      this.setLog("👤 兵大哥坚守阵地！"); return;
    }
    if (card.type === "monster") {
      // 紧握词条检查：玩家在相邻格时只能攻击紧握怪物
      const grippers = checkGripLock(this.boardCards, 5);
      if (grippers.length > 0 && !grippers.includes(gridNum)) {
        this.setLog("🔒 紧握：必须优先攻击相邻的紧握怪物！");
        return;
      }
      // 好战词条：点击计数
      if (checkWarlikeTrigger(card, this.clickCounter)) {
        this.setLog(`⚡ 好战触发！${card.data.name} 主动攻击！`);
      }
      this.initiateCombat(gridNum); return;
    }
    if (card.type === "help") {
      this.pickupHelpCard(gridNum); return;
    }
  }

  handleTargetedClick(gridNum, card) {
    const t = this.targeting;
    if (card.type !== "monster") {
      this.exitTargeting(false);
      this.handleGridClick(gridNum, card);
      return;
    }
    if (t.type === "flyingDagger") {
      const m = card.data;
      const dmg = t.amount;
      m.hp -= dmg;
      if (m.hp < 0) m.hp = 0;
      this.setLog(`🔪 飞刀命中 ${m.name}，造成 ${dmg} 点伤害！`);
      this.flashCard(gridNum, 0xff4444);
      this.refreshCardTexts(gridNum);
      if (m.hp <= 0) this.time.delayedCall(400, () => this.killMonster(gridNum, m, card));
      this.consumeItemSlot(t.sourceSlot);
      this.exitTargeting();
    }
  }

  handleItemSlotClick(index) {
    if (this.targeting) {
      if (this.targeting.sourceSlot === index) { this.exitTargeting(false); return; }
      this.exitTargeting(false);
    }
    const item = this.itemSlots[index];
    if (!item || item.type !== "help") return;
    const h = item.data;
    switch (h.effectType) {
      case "heal": this.useHealItem(index, h); break;
      case "shield": this.useShieldItem(index, h); break;
      case "flyingDagger": this.enterTargeting("flyingDagger", index, h); break;
      case "violence": this.useViolenceItem(index, h); break;
      case "attributeBoost": this.useAttributeBoostItem(index, h); break;
      case "goldGain": this.useGoldGainItem(index, h); break;
      case "fullHeal": this.useFullHealItem(index, h); break;
      case "chest_normal": case "chest_blue": case "chest_gold":
        this.useChestItem(index, h); break;
      default: this.setLog(`⚠️ 未知帮助卡: ${h.effectType}`);
    }
  }

  // ============ 帮助卡效果 ============

  pickupHelpCard(gridNum) {
    const card = this.boardCards.get(gridNum);
    if (!card || card.type !== "help") return;
    const slot = this.itemSlots.findIndex((s) => s === null);
    if (slot === -1) { this.setLog("⚠️ 道具牌格已满！"); return; }
    this.itemSlots[slot] = { type: "help", data: { ...card.data }, _fromHelpDeck: card._fromHelpDeck };
    this.renderItemSlot(slot);
    this.destroyCardDisplay(gridNum);
    this.boardCards.delete(gridNum);
    this.setLog(`✨ 拾取「${card.data.name}」→ 牌格 #${slot + 1}`);

    // 空格从战斗卡组补牌（450ms 延迟降低连点吞卡概率）
    if (this.battleDeck.length > 0) {
      this.time.delayedCall(450, () => {
        if (this._drawLocked) return;
        this._drawLocked = true;
        this.drawFromBattleDeck();
        this.time.delayedCall(100, () => { this._drawLocked = false; });
      });
    }
  }

  useHealItem(index, h) {
    const p = this.playerState;
    const old = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + h.amount);
    this.setLog(`🧪 ${h.name}: +${p.hp - old}HP (${old}→${p.hp})`);
    this.showFloatingText(getGridCenter(5).x, getGridCenter(5).y - 40, `+${p.hp - old}♥`, COLOR.TEXT_HEAL);
    this.flashCard(5, 0x00ff00);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
    this.refreshCardTexts(5);
    this.updatePlayerUI();
  }

  useShieldItem(index, h) {
    this.playerState.shieldActive = true;
    this.setLog(`🛡️ ${h.name}: 下次受伤变为 0！`);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
    this.refreshCardTexts(5);
    this.updatePlayerUI();
  }

  useViolenceItem(index, h) {
    if (this.playerState.isViolenceActive) {
      this.setLog("⚠️ 暴力卡已激活，请先战斗！"); return;
    }
    this.playerState.attack = this.playerState.baseAttack * 2;
    this.playerState.isViolenceActive = true;
    this.setLog(`💪 ${h.name}: 攻击翻倍 → ${this.playerState.attack}`);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
    this.refreshCardTexts(5);
    this.updatePlayerUI();
  }

  useAttributeBoostItem(index, h) {
    // 弹出属性选择框
    this.destroyOverlay();
    const { bg, container } = this.createOverlay("📈 属性提升 — 选择一项");
    const p = this.playerState;

    const options = [
      { label: `⚔ 攻击 +1（当前: ${p.attack}）`, action: () => {
          p.baseAttack += 1; p.attack += 1;
          this.setLog(`📈 攻击 +1 → ${p.attack}`);
        }},
      { label: `🛡 防御 +1（当前: ${p.defense}）`, action: () => {
          p.baseDefense += 1; p.defense += 1;
          this.setLog(`📈 防御 +1 → ${p.defense}`);
        }},
      { label: `♥ 血量 +2（当前: ${p.maxHp}）`, action: () => {
          p.maxHp += 2; p.hp += 2;
          this.setLog(`📈 血量上限 +2 → ${p.maxHp}`);
        }},
    ];

    this.overlayObjects = [bg, container];
    options.forEach((opt, i) => {
      const y = 160 + i * 70;
      const btnBg = this.add
        .rectangle(GAME_W / 2, y, 300, 50, 0x252830)
        .setOrigin(0.5).setStrokeStyle(2, COLOR.PANEL_BORDER)
        .setInteractive({ useHandCursor: true }).setDepth(92);
      const btnText = this.add
        .text(GAME_W / 2, y, opt.label, {
          fontFamily: "serif", fontSize: "14px", color: COLOR.TEXT_PRIMARY,
        }).setOrigin(0.5).setDepth(93);
      btnBg.on("pointerdown", () => {
        opt.action();
        this._markHelpUsed(index);
        this.consumeItemSlot(index);
        this.refreshCardTexts(5);
        this.updatePlayerUI();
        this.destroyOverlay();
      });
      btnBg.on("pointerover", () => btnBg.setFillStyle(0x353840));
      btnBg.on("pointerout", () => btnBg.setFillStyle(0x252830));
      this.overlayObjects.push(btnBg, btnText);
    });
  }

  useGoldGainItem(index, h) {
    this.playerState.gold += h.amount;
    this.setLog(`💰 ${h.name}: +${h.amount} 金币 → ${this.playerState.gold}`);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
    this.updatePlayerUI();
  }

  useFullHealItem(index, h) {
    const p = this.playerState;
    const old = p.hp;
    p.hp = p.maxHp;
    this.setLog(`🍖 ${h.name}: 血量回满 (${old}→${p.hp})`);
    this.showFloatingText(getGridCenter(5).x, getGridCenter(5).y - 40, "FULL ♥", COLOR.TEXT_HEAL);
    this.flashCard(5, 0x00ff00);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
    this.refreshCardTexts(5);
    this.updatePlayerUI();
  }

  useChestItem(index, h) {
    this.destroyOverlay();
    const { bg, container } = this.createOverlay("📦 宝箱 — 三选一遗物");
    this.overlayObjects = [bg, container];

    // 生成三个遗物选项
    const relics = this.generateRelicChoices(h.chestProbs || { 白: 0.65, 蓝: 0.30, 金: 0.05 });
    const startX = GAME_W / 2 - 180;

    relics.forEach((relicKey, i) => {
      const relic = RELICS[relicKey];
      if (!relic) return;
      const x = startX + i * 180, y = GAME_H / 2;
      const cardW = 160, cardH = 180;
      const qColor = parseInt(
        ({ 白: "0xbdc3c7", 蓝: "0x3498db", 金: "0xf5c86a" })[relic.quality]
      );

      const cardBg = this.add
        .rectangle(x, y, cardW, cardH, 0x252830)
        .setOrigin(0.5).setStrokeStyle(2, qColor)
        .setInteractive({ useHandCursor: true }).setDepth(92);

      const nameText = this.add
        .text(x, y - cardH / 2 + 16, relic.name, {
          fontFamily: "serif", fontSize: "14px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
        }).setOrigin(0.5, 0).setDepth(93);

      const qualText = this.add
        .text(x, y - cardH / 2 + 36, `[${relic.quality}] ${relic.effect}`, {
          fontFamily: "sans-serif", fontSize: "9px",
          color: COLOR.QUALITY_COLORS[relic.quality],
          wordWrap: { width: cardW - 20 }, align: "center",
        }).setOrigin(0.5, 0).setDepth(93);

      const pickText = this.add
        .text(x, y + cardH / 2 - 18, "👆 选择", {
          fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_GOLD,
        }).setOrigin(0.5, 1).setDepth(93);

      cardBg.on("pointerdown", () => {
        // 检查遗物格子是否已满
        if (this.equippedRelics.length >= 12) {
          this.showPopup("⚠️ 遗物格子已满（最多 12 件），请先右键丢弃遗物！");
          return;
        }
        this.equippedRelics.push(relicKey);
        this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode);
        this.setLog(`📦 获得遗物「${relic.name}」（${relic.quality}）`);
        this._markHelpUsed(index);
        this.consumeItemSlot(index);
        this.destroyOverlay();
        this.updatePlayerUI();
        this.updateEquipmentUI();
      });
      cardBg.on("pointerover", () => cardBg.setStrokeStyle(3, qColor));
      cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, qColor));

      this.overlayObjects.push(cardBg, nameText, qualText, pickText);
    });

    // 跳过按钮
    const skipX = GAME_W / 2;
    const skipY = GAME_H / 2 + 130;
    const skipBg = this.add
      .rectangle(skipX, skipY, 160, 32, 0x353535)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER)
      .setInteractive({ useHandCursor: true }).setDepth(92);
    const skipText = this.add
      .text(skipX, skipY, "跳过 → +20💰", {
        fontFamily: "serif", fontSize: "13px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5).setDepth(93);
    skipBg.on("pointerdown", () => {
      this.playerState.gold += 20;
      this.setLog("↩ 跳过宝箱，获得 20 金币");
      this._markHelpUsed(index);
      this.consumeItemSlot(index);
      this.destroyOverlay();
      this.updatePlayerUI();
    });
    skipBg.on("pointerover", () => skipBg.setFillStyle(0x4a4a4a));
    skipBg.on("pointerout", () => skipBg.setFillStyle(0x353535));
    this.overlayObjects.push(skipBg, skipText);
  }

  generateRelicChoices(probs) {
    // 排除已拥有的遗物
    const owned = new Set(this.equippedRelics);
    const choices = [];
    for (let i = 0; i < 3; i++) {
      const r = Math.random();
      let quality;
      if (r < (probs["白"] || 0)) quality = "白";
      else if (r < (probs["白"] || 0) + (probs["蓝"] || 0)) quality = "蓝";
      else quality = "金";

      const pool = (RELICS_BY_QUALITY[quality] || RELICS_BY_QUALITY["白"])
        .filter((k) => !owned.has(k));
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (!choices.includes(pick)) choices.push(pick);
      }
    }
    // 补足
    while (choices.length < 3) {
      const all = Object.keys(RELICS).filter((k) => !owned.has(k) && RELICS[k].quality !== "初始");
      if (all.length === 0) break;
      const r = all[Math.floor(Math.random() * all.length)];
      if (!choices.includes(r)) choices.push(r);
    }
    return choices;
  }

  _markHelpUsed(index) {
    const item = this.itemSlots[index];
    if (item && item._fromHelpDeck && item.data.uid !== undefined) {
      this.nodeUsedHelpUids.push(item.data.uid);
    }
  }

  consumeItemSlot(index) {
    this.itemSlots[index] = null;
    this.renderItemSlot(index);
  }

  // ============ 瞄准系统 ============

  enterTargeting(type, sourceSlot, helpData) {
    let hasMonster = false;
    for (const [, c] of this.boardCards) {
      if (c.type === "monster") { hasMonster = true; break; }
    }
    if (!hasMonster) { this.setLog("⚠️ 棋盘上没有怪物！"); return; }
    if (this.targeting) this.exitTargeting(true);
    this.targeting = { type, sourceSlot, amount: helpData.amount };
    for (const [gn, c] of this.boardCards) {
      if (c.type === "monster") this.setGridHighlight(gn, true);
    }
    this.highlightItemSlot(sourceSlot, true);
    this.input.setDefaultCursor("crosshair");
    this.setLog("🎯 瞄准模式：点击怪物 | Esc/点其他取消");
  }

  exitTargeting(silent = true) {
    for (const [gn] of this.boardCards) this.setGridHighlight(gn, false);
    if (this.targeting) this.highlightItemSlot(this.targeting.sourceSlot, false);
    this.input.setDefaultCursor("default");
    this.targeting = null;
    if (!silent) this.setLog("❌ 已取消瞄准");
  }

  highlightItemSlot(index, active) {
    const d = this.itemSlotDisplays[index];
    if (!d || !d[0]) return;
    d[0].setStrokeStyle(active ? 3 : 2, active ? 0xf5c86a : COLOR.SLOT_FILLED_BORDER);
  }

  // ============ 战斗系统 ============

  /** 获取玩家有效属性（基础 + 遗物 + 技能） */
  getEffectiveStats(monsterId) {
    return calcEffectiveStats(
      this.playerState, this.equippedRelics, this.learnedSkills,
      this.currentNode, this.battleVetState, monsterId
    );
  }

  initiateCombat(gridNum) {
    const card = this.boardCards.get(gridNum);
    if (!card || card.type !== "monster") return;

    const m = card.data;
    const p = this.playerState;
    const eff = this.getEffectiveStats(m.id || m.name);

    // 怪物词条加成
    const inspireBonus = calcInspireBonus(this.boardCards, gridNum);
    const revengeBonus = calcRevengeBonus(m, this.totalKilledThisNode);
    const monsterAtk = m.attack + inspireBonus + revengeBonus;

    // 荆棘甲额外伤害
    const thornDmg = this.relicBonuses.thornDmg;

    // 玩家伤害 = 有效攻击 - 怪物防御
    let playerDmg = Math.max(0, eff.atk - m.defense) + thornDmg;
    // 暴力卡翻倍（在有效攻击基础上）
    if (p.isViolenceActive) playerDmg = Math.max(0, p.attack - m.defense) + thornDmg;

    m.hp -= playerDmg;
    if (m.hp < 0) m.hp = 0;

    // 散子词条追踪
    const scatterSpawns = checkScatterSpawn(m, playerDmg);

    this.flashCard(5, 0x5b9bd5);
    this.flashCard(gridNum, 0xff0000);
    const monPos = getGridCenter(gridNum);
    this.showFloatingText(monPos.x, monPos.y - 20, `-${playerDmg}`, COLOR.TEXT_DAMAGE);

    let logParts = [`⚔ 兵大哥(${eff.atk}攻) → ${m.name}：${playerDmg} 伤害`];
    if (inspireBonus > 0) logParts.push(`📯鼓舞+${inspireBonus}`);
    if (revengeBonus > 0) logParts.push(`💢复仇+${revengeBonus}`);
    if (p.isViolenceActive) logParts.push("💪暴力");
    if (thornDmg > 0) logParts.push("🌿荆棘");
    this.setLog(logParts.join(" | "));

    this.time.delayedCall(350, () => {
      // 散子：召唤骷髅加入战斗卡组
      if (scatterSpawns.length > 0) {
        for (const skel of scatterSpawns) {
          this.battleDeck.push({ type: "monster", data: skel });
        }
        this.updateDeckUI();
        this.setLog(`💀 散子触发！${scatterSpawns.length} 只骷髅加入战斗卡组`);
      }

      if (m.hp <= 0) {
        this.killMonster(gridNum, m, card);
        this.resetViolence();
        this.battleVetState.stacks = 0;
        this.refreshCardTexts(gridNum);
        this.updatePlayerUI();
        return;
      }

      // 怪物反击（含词条加成）
      let monsterDmg = Math.max(0, monsterAtk - eff.def);

      // 庇佑魔法卡
      if (p.shieldActive && monsterDmg > 0) {
        monsterDmg = 0;
        p.shieldActive = false;
        this.setLog(`🛡️ 庇佑魔法卡挡下 ${monsterAtk} 攻击！`);
      }

      p.hp -= monsterDmg;
      if (p.hp < 0) p.hp = 0;

      // 刺皮反伤
      const thornsDmg = calcThornsDamage(this.learnedSkills, monsterAtk);
      if (thornsDmg > 0 && monsterDmg > 0) {
        m.hp -= thornsDmg;
        if (m.hp < 0) m.hp = 0;
        this.showFloatingText(monPos.x, monPos.y + 10, `刺皮-${thornsDmg}`, "#9b59b6");
        this.setLog(`${logParts.join(" | ")} | 🦔刺皮反伤 ${thornsDmg}`);
      }

      // 破甲词条
      if (m.traits?.includes("破甲") && playerDmg > 0) {
        p.defense = Math.max(0, p.defense - 1);
        p.baseDefense = Math.max(0, p.baseDefense - 1);
      }

      this.flashCard(5, 0xff0000);
      const playerPos = getGridCenter(5);
      this.showFloatingText(playerPos.x, playerPos.y - 20, `-${monsterDmg}`, COLOR.TEXT_DANGER);

      this.setLog(`${logParts.join(" | ")} | ${m.name}(${monsterAtk}攻) → 兵大哥：${monsterDmg} 反击`);

      this.resetViolence();
      this.refreshCardTexts(gridNum);
      this.refreshCardTexts(5);
      this.updatePlayerUI();

      // 刺皮可能击杀怪物
      if (m.hp <= 0) {
        this.time.delayedCall(100, () => {
          this.killMonster(gridNum, m, card);
          this.refreshCardTexts(gridNum);
          this.updatePlayerUI();
        });
      }

      if (p.hp <= 0) {
        // 凤凰羽毛免死
        if (hasDeathSave(this.equippedRelics)) {
          p.hp = Math.floor(p.maxHp * 0.5);
          consumeDeathSave(this.equippedRelics);
          this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode);
          this.setLog("🔥 凤凰羽毛触发！恢复 50% 血量");
          this.updatePlayerUI();
          return;
        }
        this.time.delayedCall(400, () => this.gameOver());
      }
    });
  }

  killMonster(gridNum, monster, card) {
    this.totalKilledThisNode++;

    // 基础金币
    let goldGain = monster.goldDrop || 10;
    // 幸运硬币
    if (card.isElite || card.isBoss) {
      goldGain += this.relicBonuses.eliteGold;
    }
    // 村好剑：击败精英/层主攻+2
    if ((card.isElite || card.isBoss) && this.equippedRelics.includes("村好剑")) {
      this.playerState.baseAttack += 2;
      this.playerState.attack += 2;
    }

    this.playerState.gold += goldGain;

    let log = `💀 ${monster.name} 被击败！+${goldGain}💰`;
    this.showFloatingText(getGridCenter(gridNum).x, getGridCenter(gridNum).y + 20, `+${goldGain}💰`, COLOR.TEXT_GOLD);

    // 嗜血之牙回血
    const healAmount = this.relicBonuses.healOnKill;
    if (healAmount > 0) {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + healAmount);
      log += ` | 🩸+${healAmount}HP`;
    }

    // 精英/层主额外掉落
    if (card.isElite && card.eliteDrop) {
      for (const itemName of card.eliteDrop) {
        const newCard = this.createHelpCard(itemName);
        if (newCard) {
          this.helpDeck.push(newCard);
          log += ` | ✨ 掉落「${itemName}」`;
        }
      }
    }
    if (card.isBoss && card.bossDrop) {
      for (const itemName of card.bossDrop) {
        const newCard = this.createHelpCard(itemName);
        if (newCard) {
          this.helpDeck.push(newCard);
          log += ` | ✨ 掉落「${itemName}」`;
        }
      }
    }

    // 精英击杀 → 导师卡
    if (card.isElite) {
      log += " | 🎓 导师出现！";
      this.setLog(log);
      this.destroyCardDisplay(gridNum);
      this.boardCards.delete(gridNum);
      this.updatePlayerUI();
      this.time.delayedCall(600, () => this.showMentorCard());
      return;
    }

    this.setLog(log);
    this.destroyCardDisplay(gridNum);
    this.boardCards.delete(gridNum);
    this.updatePlayerUI();

    // 从战斗卡组补牌（500ms 延迟降低连点吞卡概率）
    if (this.battleDeck.length > 0) {
      this.time.delayedCall(500, () => {
        if (this._drawLocked || this.battleDeck.length === 0) return;
        this._drawLocked = true;
        this.drawFromBattleDeck();
        this.time.delayedCall(120, () => { this._drawLocked = false; });
      });
    } else {
      this.checkNodeComplete();
    }
  }

  resetViolence() {
    if (this.playerState.isViolenceActive) {
      this.playerState.attack = this.playerState.baseAttack;
      this.playerState.isViolenceActive = false;
    }
  }

  gameOver() {
    this.setLog("💀 兵大哥倒下了...");
    const overlay = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7)
      .setOrigin(0.5).setDepth(50);
    this.add.text(GAME_W / 2, GAME_H / 2 - 20, "💀 你死了", {
      fontFamily: "serif", fontSize: "36px", fontStyle: "bold", color: COLOR.TEXT_DANGER,
    }).setOrigin(0.5).setDepth(51);
    this.add.text(GAME_W / 2, GAME_H / 2 + 30, "刷新页面重新开始", {
      fontFamily: "sans-serif", fontSize: "14px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5).setDepth(51);
    this.input.enabled = false;
  }

  // ============ 静态 UI ============

  createStaticUI() {
    // 玩家信息面板
    const piX = 10, piY = 10, piW = 180, piH = 230;
    this.add.rectangle(piX + piW / 2, piY + piH / 2, piW, piH, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER);
    this.add.text(piX + piW / 2, piY + 8, "👤 玩家信息", {
      fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0);
    const lineY = piY + 28;
    this.add.line(piX + 8, lineY, 0, 0, piW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0);

    const infoX = piX + 14, infoStartY = lineY + 12, lineH = 20;
    const labels = ["姓名: ", "血量: ", "攻击: ", "防御: ", "金币: "];
    this.playerInfoLabels = [];
    labels.forEach((l, i) => {
      this.playerInfoLabels.push(this.add.text(infoX, infoStartY + i * lineH, l, {
        fontFamily: "monospace", fontSize: "11px", color: COLOR.TEXT_DIM,
      }).setOrigin(0, 0));
    });
    this.playerInfoValues = new Array(labels.length).fill(null);

    const barX = piX + 14, barY = infoStartY + 5 * lineH + 4;
    const barW = piW - 28, barH = 12;
    this.playerHpBarBg = this.add
      .rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x1a0000)
      .setOrigin(0.5).setStrokeStyle(1, 0x4a2020);
    this.playerHpBar = this.add
      .rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x27ae60)
      .setOrigin(0.5);
    this.playerHpBarParams = { barX, barY, barW, barH };

    // 节点信息
    this.nodeInfoText = this.add
      .text(piX + piW / 2, barY + barH + 10, "", {
        fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 0);

    // 道具牌格标题
    this.add.text(GAME_W / 2, ITEM_Y - ITEM_SLOT_H / 2 - 28, "🎒 道具牌格 (上限 5)", {
      fontFamily: "serif", fontSize: "12px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 1);

    // 装备栏
    this.createEquipmentSlots();
    // 技能栏
    this.createSkillArea();
    // 牌组区
    this.createDeckArea();
  }

  createEquipmentSlots() {
    const cols = 4, rows = 3, totalSlots = cols * rows;
    const slotW = 40, slotH = 40, gap = 4;
    const totalW = cols * slotW + (cols - 1) * gap;
    const areaX = 10, areaY = 260, areaW = 190, areaH = 310;
    this.add.rectangle(areaX + areaW / 2, areaY + areaH / 2, areaW, areaH, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER);
    this.add.text(areaX + areaW / 2, areaY + 8, "⚙ 装备栏 (12格)", {
      fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0);
    const lineY = areaY + 26;
    this.add.line(areaX + 8, lineY, 0, 0, areaW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0);
    const startX = areaX + (areaW - totalW) / 2;
    const startY = lineY + 10;

    this.equipSlotObjs = [];
    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = startX + col * (slotW + gap) + slotW / 2;
      const y = startY + row * (slotH + gap) + slotH / 2;
      const bg = this.add.rectangle(x, y, slotW, slotH, COLOR.SLOT_EMPTY)
        .setOrigin(0.5).setStrokeStyle(1, COLOR.SLOT_BORDER);
      const txt = this.add.text(x, y, "", { fontSize: "16px" }).setOrigin(0.5);
      bg.setInteractive();
      bg.on("pointerdown", (pointer) => {
        if (pointer.rightButtonDown() && i < this.equippedRelics.length) {
          const removed = this.equippedRelics.splice(i, 1)[0];
          this.playerState.gold += 20;
          this.setLog(`🗑️ 丢弃遗物「${RELICS[removed]?.name || removed}」+20💰`);
          this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode);
          this.updateEquipmentUI();
          this.updatePlayerUI();
        }
      });
      bg.on("pointerover", () => {
        if (i < this.equippedRelics.length) {
          const r = RELICS[this.equippedRelics[i]];
          bg.setStrokeStyle(2, 0xf5c86a);
          if (r) txt.setText(r.name.slice(0, 3));
        }
      });
      bg.on("pointerout", () => {
        if (i < this.equippedRelics.length) {
          bg.setStrokeStyle(1, COLOR.SLOT_BORDER);
          txt.setText("🗡️");
        }
      });
      this.equipSlotObjs.push({ bg, txt });
    }
  }

  createSkillArea() {
    const x = 770, areaW = 180;
    this.add.rectangle(x + areaW / 2, GAME_H - 155, areaW, 290, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER);
    this.add.text(x + areaW / 2, GAME_H - 300, "📜 技能栏", {
      fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0);
    const lineY = GAME_H - 282;
    this.add.line(x + 8, lineY, 0, 0, areaW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0);
    this.skillText = this.add.text(x + areaW / 2, GAME_H - 260, "暂无技能", {
      fontFamily: "sans-serif", fontSize: "11px", color: COLOR.TEXT_DIM, align: "center",
      wordWrap: { width: areaW - 10 },
    }).setOrigin(0.5, 0);
  }

  createDeckArea() {
    const x = 770, y = 10, areaW = 180, areaH = 230;
    this.add.rectangle(x + areaW / 2, y + areaH / 2, areaW, areaH, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER);
    this.add.text(x + areaW / 2, y + 8, "🂠 牌组区", {
      fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0);
    const lineY = y + 26;
    this.add.line(x + 8, lineY, 0, 0, areaW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0);

    // "下一张抽牌" 标题
    this.add.text(x + areaW / 2, lineY + 12, "下一张抽牌", {
      fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 0);

    // 牌组区中心坐标
    this.deckPreviewX = x + areaW / 2;
    this.deckPreviewY = lineY + 78;

    // 牌背占位（初始）
    this.deckPreviewBg = this.add
      .rectangle(this.deckPreviewX, this.deckPreviewY, 70, 90, 0x2d3035)
      .setOrigin(0.5).setStrokeStyle(2, COLOR.PANEL_BORDER).setDepth(1);

    // 预览文本（动态更新）
    this.deckPreviewType = this.add
      .text(this.deckPreviewX, this.deckPreviewY - 30, "空", {
        fontFamily: "sans-serif", fontSize: "11px", color: COLOR.TEXT_DIM,
      }).setOrigin(0.5).setDepth(2);

    this.deckPreviewName = this.add
      .text(this.deckPreviewX, this.deckPreviewY - 10, "", {
        fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
      }).setOrigin(0.5).setDepth(2);

    this.deckPreviewStat = this.add
      .text(this.deckPreviewX, this.deckPreviewY + 18, "", {
        fontFamily: "monospace", fontSize: "9px", color: COLOR.TEXT_DIM,
      }).setOrigin(0.5).setDepth(2);

    // 数量文本
    this.deckCountText = this.add.text(x + areaW / 2, lineY + 138, "战斗卡组: 0 张", {
      fontFamily: "monospace", fontSize: "10px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 0);

    this.deckHelpCountText = this.add.text(x + areaW / 2, lineY + 158, "", {
      fontFamily: "monospace", fontSize: "9px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 0);
  }

  // ============ UI 更新 ============

  updateAllUI() {
    this.updatePlayerUI();
    this.updateNodeUI();
    this.updateDeckUI();
    this.updateEquipmentUI();
    this.updateSkillUI();
  }

  updateSkillUI() {
    if (!this.skillText) return;
    if (this.learnedSkills.length > 0) {
      this.skillText.setText("技能:\n" + this.learnedSkills.join("\n"));
      this.skillText.setColor("#9b59b6");
    } else {
      this.skillText.setText("暂无技能\n（击败精英后获取）");
      this.skillText.setColor(COLOR.TEXT_DIM);
    }
  }

  updatePlayerUI() {
    const p = this.playerState;
    const eff = this.getEffectiveStats();
    const piX = 10, piY = 10, lineY = piY + 28, lineH = 20, infoX = piX + 14, infoStartY = lineY + 12;

    const values = [
      { text: p.name, color: COLOR.TEXT_GOLD },
      { text: `${p.hp}/${p.maxHp}${p.shieldActive ? " 🛡️" : ""}`, color: "#e74c3c" },
      { text: `${eff.atk}${p.isViolenceActive ? " 💪" : ""}`, color: "#e67e22" },
      { text: `${eff.def}`, color: "#3498db" },
      { text: `${p.gold}`, color: "#f5c86a" },
    ];

    values.forEach((v, i) => {
      if (this.playerInfoValues[i]) this.playerInfoValues[i].destroy();
      this.playerInfoValues[i] = this.add.text(infoX + 48, infoStartY + i * lineH, v.text, {
        fontFamily: "monospace", fontSize: "11px", fontStyle: "bold", color: v.color,
      }).setOrigin(0, 0);
    });

    // 血条
    const { barX, barY, barW, barH } = this.playerHpBarParams;
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    if (this.playerHpBar && this.playerHpBar.active) this.playerHpBar.destroy();
    let barColor = hpRatio > 0.5 ? 0x27ae60 : hpRatio > 0.25 ? 0xe67e22 : 0xc0392b;
    this.playerHpBar = this.add
      .rectangle(barX + (barW * hpRatio) / 2, barY + barH / 2, barW * hpRatio, barH, barColor)
      .setOrigin(0.5);
  }

  updateNodeUI() {
    const ec = getNodeConfig(this.currentNode);
    const isElite = ec.isElite, isBoss = ec.isBoss;
    let info = `第${this.currentLayer}层 · 节点${this.currentNode}/9`;
    if (isElite) info += " ⚡精英";
    if (isBoss) info += " 👑层主";
    this.nodeInfoText.setText(info);
  }

  updateDeckUI() {
    this.deckCountText.setText(`战斗卡组: ${this.battleDeck.length} 张`);

    // 统计帮助卡组种类数
    const uniqueKeys = new Set(this.helpDeck.map((c) => c.key));
    this.deckHelpCountText.setText(`帮助卡组: ${uniqueKeys.size} 种 ${this.helpDeck.length} 张`);

    // 更新下一张卡牌预览
    if (this.battleDeck.length > 0) {
      const nextCard = this.battleDeck[this.battleDeck.length - 1];

      if (nextCard.type === "monster") {
        const m = nextCard.data;
        this.deckPreviewBg.setFillStyle(COLOR.CARD_MONSTER);
        this.deckPreviewBg.setStrokeStyle(2, COLOR.CARD_MONSTER_BORDER);
        this.deckPreviewType.setText("👹 怪物卡");
        this.deckPreviewType.setColor(COLOR.TEXT_DANGER);
        this.deckPreviewName.setText(m.name);
        this.deckPreviewName.setColor(COLOR.TEXT_PRIMARY);
        const lvStr = m.level ? `Lv.${m.level} ` : "";
        this.deckPreviewStat.setText(`${lvStr}♥${m.hp} ⚔${m.attack} 🛡${m.defense}`);
        this.deckPreviewStat.setColor(COLOR.TEXT_DIM);
      } else if (nextCard.type === "help") {
        const h = nextCard.data;
        this.deckPreviewBg.setFillStyle(COLOR.CARD_HELP);
        this.deckPreviewBg.setStrokeStyle(2, COLOR.CARD_HELP_BORDER);
        this.deckPreviewType.setText("✨ 帮助卡");
        this.deckPreviewType.setColor(COLOR.TEXT_HEAL);
        this.deckPreviewName.setText(h.name);
        this.deckPreviewName.setColor(COLOR.TEXT_PRIMARY);
        this.deckPreviewStat.setText(`[${h.quality || "?"}] ${h.effectDesc || ""}`);
        this.deckPreviewStat.setColor(COLOR.QUALITY_COLORS[h.quality] || COLOR.TEXT_DIM);
      }
    } else {
      // 牌组为空
      this.deckPreviewBg.setFillStyle(0x1a1c20);
      this.deckPreviewBg.setStrokeStyle(1, COLOR.PANEL_BORDER);
      this.deckPreviewType.setText("牌组已空");
      this.deckPreviewType.setColor(COLOR.TEXT_DIM);
      this.deckPreviewName.setText("");
      this.deckPreviewStat.setText("");
    }
  }

  updateEquipmentUI() {
    if (!this.equipSlotObjs) return;
    this.equipSlotObjs.forEach((slot, i) => {
      if (i < this.equippedRelics.length) {
        const r = RELICS[this.equippedRelics[i]];
        slot.bg.setFillStyle(0x2a3520);
        const shortName = r?.name ? r.name.slice(0, 3) : "🗡️";
        slot.txt.setText(shortName);
        slot.txt.setFontSize(10);
      } else {
        slot.bg.setFillStyle(COLOR.SLOT_EMPTY);
        slot.txt.setText("");
      }
    });
  }

  // ============ 视觉特效 ============

  flashCard(gridNum, color) {
    const d = this.cardDisplays.get(gridNum);
    if (!d) return;
    const orig = d.bg.fillColor;
    d.bg.setFillStyle(color);
    this.time.delayedCall(150, () => {
      if (d.bg && d.bg.active) d.bg.setFillStyle(orig);
    });
  }

  showFloatingText(x, y, text, color) {
    const ft = this.add.text(x, y, text, {
      fontFamily: "monospace", fontSize: "14px", fontStyle: "bold",
      color, stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: ft, y: y - 30, alpha: 0, duration: 800, ease: "Power2",
      onComplete: () => ft.destroy() });
  }

  // ============ 工具 ============

  setLog(msg) {
    if (this.logTimer) { this.logTimer.destroy(); this.logTimer = null; }
    this.logText.setText(`📋 ${msg}`);
    this.logText.setColor(COLOR.TEXT_PRIMARY);
    console.log(`[深入地牢] ${msg}`);
    this.logTimer = this.time.delayedCall(5000, () => {
      if (this.logText && this.logText.active) {
        this.logText.setText("🖱️ 点击怪物战斗 | 点击帮助卡拾取");
        this.logText.setColor(COLOR.TEXT_DIM);
      }
    });
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
