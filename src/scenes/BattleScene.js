import Phaser from "phaser";
import {
  PLAYER_INIT, INITIAL_HELP_DECK, HELP_CARDS, HELP_CARDS_BY_QUALITY,
  QUALITY_PROB, RELICS, RELICS_BY_QUALITY, HELP_DECK_CAPACITY,
  MONSTERS, getNodeConfig,
} from "../data/GameData.js";
import {
  isAdjacent, getAdjacentGrids, calcRelicBonuses, calcEffectiveStats,
  hasDeathSave, consumeDeathSave, applyGoldenChestRelic,
  triggerLuckyCoin, removeNodeExpiredRelics,
  calcInspireBonus, calcRevengeBonus, checkWarlikeTrigger,
  checkAmbushTrigger, checkGripLock, checkScatterSpawn,
  calcThornsDamage, calcHardSkinBonus, calcBattleVeteranAtk,
  calcSpadeYoungBonus, calcHeartYoungBonus, calcDiamondYoungBonus, calcClubYoungBonus,
  calcSharpShieldDamage, calcLoveBodyHeal, checkDefenseBreaker, checkCallFriends,
  calcProtectAuraBonus, calcMedicHeal, checkRelentlessPursuit, calcSideStrike,
  checkHeartMotherSpawn, checkUnbreakable, checkVerticalLever,
  checkDuelLock, applyBattleDance, checkBossViolence, calcSpadeRoyalBonus,
} from "../systems/CombatEngine.js";
import {
  GAME_W, GAME_H, GRID_COLS, GRID_ROWS, CELL_W, CELL_H, CELL_GAP,
  GRID_TOTAL_W, GRID_TOTAL_H, GRID_LEFT, GRID_TOP,
  ITEM_SLOT_COUNT, ITEM_SLOT_W, ITEM_SLOT_H, ITEM_SLOT_GAP,
  ITEM_TOTAL_W, ITEM_START_X, ITEM_Y,
  COLOR, getGridCenter, getItemSlotCenter,
} from "../config/LayoutConfig.js";
import { DeckManager } from "../systems/DeckManager.js";
import { GridRenderer } from "../ui/GridRenderer.js";
import { HUD } from "../ui/HUD.js";
import { OverlayManager } from "../ui/OverlayManager.js";

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

    // 渲染器
    this.grid = new GridRenderer(this);
    this.hud = new HUD(this);
    this.overlay = new OverlayManager(this);

    this.grid.createGrid();
    this.hud.createAll();

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
      name: p.name, hp: p.hp, maxHp: p.maxHp, baseMaxHp: p.maxHp,
      attack: p.attack, baseAttack: p.baseAttack,
      defense: p.defense, baseDefense: p.baseDefense,
      gold: p.gold, isViolenceActive: false, shieldActive: false,
    };

    // 卡组管理器（三大卡池 + 棋盘状态 + 节点追踪）
    this.deck = new DeckManager();
    this.deck.helpDeck = this.deck.buildInitialHelpDeck();
    // 道具牌格数量由 DeckManager 默认 5 格，与 ITEM_SLOT_COUNT 一致

    this.cardDisplays = new Map();
    this.itemSlotDisplays = new Array(ITEM_SLOT_COUNT).fill(null);
    this.overlayObjects = null;
    this.popupObjects = null;
    this.targeting = null;
    this.escKey = this.input.keyboard.addKey("ESC");
    this.pendingBoardRefillTimer = null;
    this.combatResolving = false;
    this._pendingRotation = false;  // 互动后是否需要旋转棋盘

    // 节点状态
    this.currentNode = 0;
    this.currentLayer = 1;
    this.nodeComplete = false;

    // 装备/遗物
    this.equippedRelics = [];
    this.relicBonuses = { atk: 0, def: 0, maxHp: 0, thornDmg: 0, healOnKill: 0, eliteGold: 0 };

    // 已习得技能（初始技能：轻车熟路）
    this.learnedSkills = ["轻车熟路"];
    this.battleVetState = { lastTargetId: null, stacks: 0 };

    // 节点追踪
    this.totalKilledThisNode = 0;
    this.clickCounter = {};
    this._lightCartUsed = false;
    this._moveCount = 0;
    this._pendingRoomType = null;
  }

  // ============ 卡组快捷访问（减少 this.deck. 重复） ============
  get helpDeck() { return this.deck.helpDeck; }
  set helpDeck(v) { this.deck.helpDeck = v; }
  get battleDeck() { return this.deck.battleDeck; }
  set battleDeck(v) { this.deck.battleDeck = v; }
  get demonDeck() { return this.deck.demonDeck; }
  set demonDeck(v) { this.deck.demonDeck = v; }
  get boardCards() { return this.deck.boardCards; }
  set boardCards(v) { this.deck.boardCards = v; }
  get itemSlots() { return this.deck.itemSlots; }
  set itemSlots(v) { this.deck.itemSlots = v; }

  // ============ 委托给 DeckManager 的方法 ============
  createHelpCard(key) { return this.deck.createHelpCard(key); }
  getEmptyBoardSlots() { return this.deck.getEmptyBoardSlots(); }
  canAddHelpCardStack(key) { return this.deck.canAddHelpCardStack(key); }
  canAddHelpCard() { return this.deck.canAddHelpCard(this.currentLayer); }
  generateRandomHelpCards(count) { return this.deck.generateRandomHelpCards(count); }
  shuffle(array) { return this.deck.shuffle(array); }
  buildShopSession() { return this.deck.buildShopSession(); }
  getShopSession() { return this.deck.getShopSession(); }

  hasActiveOverlay() {
    return !!(this.overlayObjects && this.overlayObjects.length > 0);
  }

  hasActivePopup() {
    return !!(this.popupObjects && this.popupObjects.length > 0);
  }

  hasPendingBoardRefill() {
    return this.deck.hasPendingBoardRefill();
  }

  isBattleInputLocked() {
    return (
      this.combatResolving ||
      this.hasPendingBoardRefill() ||
      this.hasActiveOverlay() ||
      this.hasActivePopup()
    );
  }

  cancelPendingBoardRefill() {
    if (this.pendingBoardRefillTimer) {
      this.pendingBoardRefillTimer.remove(false);
      this.pendingBoardRefillTimer = null;
    }
    this.deck.boardRefillScheduled = false;
    this.deck.boardRefillRunning = false;
  }

  requestBoardRefill(delay = 0) {
    if (this.battleDeck.length === 0 || this.getEmptyBoardSlots().length === 0) return false;
    if (this.deck.boardRefillRunning || this.pendingBoardRefillTimer) return true;

    const flush = () => {
      this.pendingBoardRefillTimer = null;
      this.deck.boardRefillScheduled = false;
      this.deck.boardRefillRunning = true;

      this.deck.refillBoardFromBattleDeck();

      this.deck.boardRefillRunning = false;
      this.checkNodeComplete();
    };

    this.deck.boardRefillScheduled = true;
    if (delay > 0) {
      this.pendingBoardRefillTimer = this.time.delayedCall(delay, flush);
    } else {
      flush();
    }
    return true;
  }

  settleBoardAfterMutation(delay = 0) {
    if (!this.requestBoardRefill(delay)) {
      this.checkNodeComplete();
    }
    // 互动后旋转棋盘（在补牌之后执行）
    this._scheduleBoardRotation(delay);
  }

  finishCombatResolution(delay = 0) {
    this.combatResolving = false;
    this.settleBoardAfterMutation(delay);
  }

  /** 在互动结算后触发棋盘顺时针旋转 */
  _scheduleBoardRotation(baseDelay = 0) {
    if (!this._pendingRotation) return;
    this._pendingRotation = false;
    const rotationDelay = baseDelay > 0 ? baseDelay + 120 : 10;
    this.time.delayedCall(rotationDelay, () => this.rotateBoardClockwise());
  }

  /**
   * 棋盘顺时针旋转：除格5（玩家）外，8个外圈格子顺时针移动一格
   * 旋转路径: 1→2→3→6→9→8→7→4→1
   */
  rotateBoardClockwise() {
    // ★ 决斗锁定检查：如果有怪物持有决斗且已触发过战斗，锁定旋转
    for (const [, card] of this.boardCards) {
      if (card.type === "monster" && card.data._duelActive) {
        this.setLog("⚔️ 决斗生效——棋盘被锁定，无法旋转！");
        return;
      }
    }

    const order = [1, 2, 3, 6, 9, 8, 7, 4];

    // 拍快照（用于追踪移动前后位置）
    const snapshot = {};
    for (const pos of order) {
      snapshot[pos] = this.boardCards.has(pos) ? this.boardCards.get(pos) : null;
    }

    // 顺时针旋转
    const movedToGrids = []; // 记录卡牌移动到的目标格
    for (let i = 0; i < order.length; i++) {
      const targetPos = order[i];
      const sourcePos = order[(i - 1 + order.length) % order.length];
      const card = snapshot[sourcePos];

      if (card) {
        if (card._slot !== undefined) card._slot = targetPos;
        this.boardCards.set(targetPos, card);
        // 追踪移动（仅怪物卡）
        if (card.type === "monster" && sourcePos !== targetPos) {
          movedToGrids.push(targetPos);
        }
      } else {
        this.boardCards.delete(targetPos);
      }
    }

    // 增量移动计数 + 战舞加成 + 黑桃皇室
    this._moveCount = (this._moveCount || 0) + 1;
    for (const [, card] of this.boardCards) {
      if (card.type === "monster") {
        const dance = applyBattleDance(card.data, this._moveCount);
        if (dance.atk > 0 || dance.def > 0) {
          card.data._danceAtk = dance.atk;
          card.data._danceDef = dance.def;
        }
      }
    }
    calcSpadeRoyalBonus(this.boardCards, this._moveCount);

    // 刷新渲染
    for (const pos of order) {
      this.destroyCardDisplay(pos);
      if (this.boardCards.has(pos)) { this.renderCard(pos); }
    }

    this.setLog("🔄 棋盘顺时针旋转！");

    // ★ 移动后技能触发
    this._afterRotationSkills(movedToGrids);
  }

  /** 旋转后触发移动相关技能 */
  _afterRotationSkills(movedToGrids) {
    // 侧方打击：对玩家造成伤害
    const sideDmg = calcSideStrike(this.boardCards, movedToGrids);
    if (sideDmg > 0) {
      this.playerState.hp = Math.max(0, this.playerState.hp - sideDmg);
      this.showFloatingText(getGridCenter(5).x, getGridCenter(5).y - 40, `侧方-${sideDmg}`, COLOR.TEXT_DANGER);
      this.setLog(`💥 侧方打击！玩家受到 ${sideDmg} 伤害`);
      this.updatePlayerUI();
      if (this.playerState.hp <= 0) { this.gameOver(); return; }
    }

    // 牢不可破：随机怪物获得庇佑
    const blessed = checkUnbreakable(this.boardCards, movedToGrids);
    if (blessed > 0) {
      this.setLog(`🛡️ 牢不可破：格${blessed} 怪物获得庇佑！`);
      this.refreshCardTexts(blessed);
    }

    // 竖向拉杆：竖列轮换
    const leverSwaps = checkVerticalLever(this.boardCards, movedToGrids);
    if (Object.keys(leverSwaps).length > 0) {
      for (const [pos, card] of Object.entries(leverSwaps)) {
        const p = parseInt(pos);
        if (card) { this.boardCards.set(p, card); }
        else { this.boardCards.delete(p); }
      }
      this.setLog("🎰 竖向拉杆触发！竖列轮换");
      this.renderAllCards();
    }

    // 不休追击：移动到玩家相邻格时自动战斗
    const pursuits = checkRelentlessPursuit(this.boardCards, movedToGrids);
    for (const p of pursuits) {
      this.setLog(`🏃 不休追击！${p.monster.name} 追击战斗`);
      this.initiateCombat(p.gridNum);
    }
  }

  // ============ 九宫格渲染（委托 GridRenderer） ============

  createGrid() { this.grid.createGrid(); }
  setGridHighlight(gridNum, on) { this.grid.setGridHighlight(gridNum, on); }

  // ============ 节点与卡组管理 ============

  startNewNode(nodeNum) {
    this.currentNode = nodeNum;
    this.nodeComplete = false;
    this.deck.shopSession = null;
    this.combatResolving = false;
    this._pendingRotation = false;
    this.cancelPendingBoardRefill();
    this.destroyPopup();

    // 重置玩家战斗状态
    this.playerState.isViolenceActive = false;
    this.playerState.shieldActive = false;
    this.playerState._healingSpring = false;
    this.playerState._watchtower = false;
    this.playerState._doubleTower = false;
    this.playerState.attack = this.playerState.baseAttack;
    this.playerState.defense = this.playerState.baseDefense;

    // 清空棋盘
    for (const [gn] of this.boardCards) this.destroyCardDisplay(gn);
    this.boardCards.clear();
    for (let i = 0; i < ITEM_SLOT_COUNT; i++) this.itemSlots[i] = null;

    // 玩家卡固定在格5
    this.boardCards.set(5, { type: "player", data: null });

    // ★ 快照保存节点前的帮助卡组
    this.deck.savePreNodeSnapshot();

    // 重置节点计数器
    this.totalKilledThisNode = 0;
    this.clickCounter = {};
    this._lightCartUsed = false;
    this._moveCount = 0;
    this._pendingRoomType = null;
    this.battleVetState = { lastTargetId: null, stacks: 0 };
    this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode, this.totalKilledThisNode);

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

    // 发牌（委托 DeckManager）
    this.deck.dealInitialCards(this.demonDeck);

    // 渲染棋盘
    this.renderAllCards();
    this.renderAllItemSlots();
    this.updateAllUI();
    this.hidePassButton();

    const info = config.isElite ? "💀 精英战！" : config.isBoss ? "👑 层主战！" : "";
    this.setLog(`📍 第 ${nodeNum} 节点 ${info}战斗卡组: ${this.battleDeck.length} 张`);
  }

  drawFromBattleDeck(slot) {
    const card = this.deck.drawFromBattleDeck(slot);
    if (card) {
      this.renderCard(slot);
      this.updateDeckUI();
    }
    return card;
  }

  checkNodeComplete() {
    if (this.nodeComplete) return;
    if (this.deck.isNodeComplete()) {
      this.nodeComplete = true;
      this.showPassButton();
    }
  }

  showPassButton() { this.grid.showPassButton(); }
  hidePassButton() { this.grid.hidePassButton(); }

  completeNode() {
    this.hidePassButton();
    this.deck.shopSession = null;
    this.combatResolving = false;
    this.cancelPendingBoardRefill();
    this.destroyPopup();

    // ★ 使用 DeckManager 计算未使用帮助卡金币 + 快照恢复
    const unusedGold = this.deck.calcUnusedHelpGold();
    this.deck.restoreHelpDeckFromSnapshot();

    // 破甲恢复：防御复原到基础值
    this.playerState.defense = this.playerState.baseDefense;
    // 金剑：节点结束后移除
    const removed = removeNodeExpiredRelics(this.equippedRelics);
    if (removed.length > 0) {
      this.setLog("⚔️ 金剑已破碎（节点结束自动移除）");
    }
    // 锐利长剑击杀加成重置 + 重算遗物属性
    this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode, 0);
    // 重算血量上限（基础 + 遗物 + 硬皮）
    const hsBonus = calcHardSkinBonus(this.learnedSkills);
    this.playerState.maxHp = this.playerState.baseMaxHp + this.relicBonuses.maxHp + hsBonus.maxHp;
    // 活力护符 + 硬皮恢复血量
    let healAmt = 0;
    const vhRelic = this.equippedRelics.find((k) => RELICS[k]?.healPerNode);
    if (vhRelic) healAmt += RELICS[vhRelic].healPerNode;
    healAmt += hsBonus.healPerNode;
    if (healAmt > 0) {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + healAmt);
    }

    this.playerState.gold += unusedGold;
    if (unusedGold > 0) {
      this.setLog(`💰 未使用帮助卡奖励: +${unusedGold} 金币`);
    }
    this.updatePlayerUI();
    this.updateSkillUI();

    // 显示房间卡选择（二选一）
    this.time.delayedCall(800, () => this.showRoomCardSelection());
  }

  // ============ 房间卡选择 ============

  showRoomCardSelection() {
    // 随机生成两个不同类型的房间
    const roomTypes = [
      { type: "shop", name: "商店", desc: "可从6张帮助卡中购买", icon: "🛒" },
      { type: "gold", name: "金币房", desc: "加入一张金币卡到战斗牌组", icon: "💰" },
      { type: "chest", name: "宝箱房", desc: "加入一张宝箱卡到战斗牌组", icon: "📦" },
      { type: "attribute", name: "属性房", desc: "加入一张属性卡到战斗牌组", icon: "📈" },
    ];
    const shuffled = this.shuffle(roomTypes);
    const choices = shuffled.slice(0, 2);

    this.overlay.showRoomCardSelection(choices, (roomType) => {
      this._pendingRoomType = roomType;
      this.destroyOverlay();
      this.time.delayedCall(400, () => this.showHelpCardSelection());
    });
  }

  /** 非商店房间：应用房间效果后进入下一节点 */
  _applyRoomEffectAndNext() {
    const roomType = this._pendingRoomType;
    this._pendingRoomType = null;
    if (roomType === "gold") {
      this.battleDeck.push({ type: "help", data: this.createHelpCard("金币卡"), _fromHelpDeck: false });
      this.setLog("💰 金币房：金币卡加入战斗牌组");
    } else if (roomType === "chest") {
      this.battleDeck.push({ type: "help", data: this.createHelpCard("普通宝箱卡"), _fromHelpDeck: false });
      this.setLog("📦 宝箱房：宝箱卡加入战斗牌组");
    } else if (roomType === "attribute") {
      this.battleDeck.push({ type: "help", data: this.createHelpCard("属性提升卡"), _fromHelpDeck: false });
      this.setLog("📈 属性房：属性卡加入战斗牌组");
    }
    this.time.delayedCall(300, () => {
      if (this.currentNode >= 9) {
        this.showLayerComplete();
      } else {
        this.startNewNode(this.currentNode + 1);
      }
    });
  }

  // ============ 帮助卡选择 ============

  showHelpCardSelection() {
    const choices = this.generateRandomHelpCards(3);
    // 轻车熟路：首次选牌后可以再选一次
    const hasDoublePick = this.learnedSkills.includes("轻车熟路") && !this._lightCartUsed;

    const afterPick = () => {
      if (hasDoublePick) {
        this._lightCartUsed = true;
        this.time.delayedCall(400, () => this.showHelpCardSelection());
      } else {
        // 检查房间类型：仅商店房间才进商店
        if (this._pendingRoomType === "shop") {
          this.time.delayedCall(600, () => this.showShop());
        } else {
          this._applyRoomEffectAndNext();
        }
      }
    };

    this.overlay.showHelpCardSelection(choices,
      // onPick
      (cardKey, def) => {
        if (!this.canAddHelpCard()) {
          this.setLog("⚠️ 帮助卡组种类已达上限，无法加入！");
          return;
        }
        if (!this.canAddHelpCardStack(cardKey)) {
          this.showPopup(`⚠️「${def.name}」已达卡组上限（最多 3 张），无法加入！`);
          return;
        }
        const newCard = this.createHelpCard(cardKey);
        if (newCard) this.helpDeck.push(newCard);
        this.setLog(`✨ 获得「${def.name}」（${def.quality}）`);
        this.updateDeckUI();
        this.destroyOverlay();
        afterPick();
      },
      // onSkip
      () => {
        this.playerState.gold += 10;
        this.setLog("↩ 跳过选牌，获得 10 金币");
        this.destroyOverlay();
        afterPick();
      }
    );
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

  // ============ 商店 ============

  showShop() {
    const shopSession = this.getShopSession();
    this.overlay.showShop(shopSession, this.playerState.gold,
      // onBuy
      (offer) => {
        const cardPrice = offer.card.price || 100;
        if (this.playerState.gold < cardPrice) {
          this.setLog(`⚠️ 金币不足！（需要 ${cardPrice} 金币）`); return;
        }
        if (!this.canAddHelpCardStack(offer.card.key)) {
          this.showPopup(`⚠️「${offer.card.name}」已达卡组上限（最多 3 张），无法购买！`); return;
        }
        if (!this.canAddHelpCard()) {
          this.showPopup("⚠️ 帮助卡组已达上限，无法购买！"); return;
        }
        this.playerState.gold -= cardPrice;
        const newCard = this.createHelpCard(offer.key);
        if (newCard) this.helpDeck.push(newCard);
        offer.sold = true;
        this.setLog(`🛒 购买「${offer.card.name}」-${cardPrice}💰`);
        this.updatePlayerUI();
        this.updateDeckUI();
        this.showShop();
      },
      // onDelete
      () => this.showDeleteScreen(),
      // onLeave
      () => {
        this.destroyOverlay();
        this.time.delayedCall(300, () => {
          if (this.currentNode >= 9) {
            this.showLayerComplete();
          } else {
            this.startNewNode(this.currentNode + 1);
          }
        });
      }
    );
  }

  /** 导师卡：击败精英后三选一技能 */
  showMentorCard() {
    const skills = [
      { name: "刺皮", desc: "每次被攻击，对攻击者造成等同于其攻击力的反伤",
        action: () => { this.learnedSkills.push("刺皮"); this.setLog("🎓 习得「刺皮」：受伤时反伤攻击者"); } },
      { name: "硬皮", desc: "血量上限 +10，每关结束恢复 10 血",
        action: () => {
          this.learnedSkills.push("硬皮");
          const hs = calcHardSkinBonus(this.learnedSkills);
          this.playerState.maxHp += hs.maxHp;
          this.playerState.hp += hs.maxHp;
          this.setLog(`🎓 习得「硬皮」：血量上限 +${hs.maxHp}`);
        } },
      { name: "历战", desc: "每次与同一敌人战斗攻击+1，换目标复原",
        action: () => { this.learnedSkills.push("历战"); this.setLog("🎓 习得「历战」：连续攻击同目标递增攻击力"); } },
      { name: "先攻", desc: "优先造成伤害（双方均有先攻则玩家先）",
        action: () => { this.learnedSkills.push("先攻"); this.setLog("🎓 习得「先攻」：战斗时优先攻击"); } },
    ];

    this.overlay.showMentorCard(skills, (skill) => {
      skill.action();
      this.destroyOverlay();
      this.updatePlayerUI();
      this.updateEquipmentUI();
      this.finishCombatResolution();
    });
  }

  showDeleteScreen() {
    this.overlay.showDeleteScreen([...this.helpDeck], this.playerState.gold,
      // onDelete
      (card) => {
        const idx = this.helpDeck.findIndex((c) => c.uid === card.uid);
        if (idx !== -1) {
          this.helpDeck.splice(idx, 1);
          this.playerState.gold += 10;
          this.setLog(`🗑️ 删除「${card.name}」+10💰`);
          this.updatePlayerUI();
          this.updateDeckUI();
          this.showDeleteScreen();
        }
      },
      // onBack
      () => this.showShop()
    );
  }

  showLayerComplete() {
    this.setLog("🏆 第一层通关！完整游戏将在阶段五实现");
    this.overlay.showLayerComplete();
  }

  // ============ 覆盖层工具 ============

  // ============ 覆盖层工具（委托 OverlayManager） ============

  createOverlay(title) { return this.overlay.createOverlay(title); }
  destroyOverlay() { this.overlay.destroyOverlay(); }
  destroyPopup() { this.overlay.destroyPopup(); }
  showPopup(message) { this.overlay.showPopup(message); }
  createSelectionCard(x, y, def, onClick) { return this.overlay.createSelectionCard(x, y, def, onClick); }
  createShopCard(x, y, card, mode, onClick) { return this.overlay.createShopCard(x, y, card, mode, onClick); }
  generateRelicChoices(probs) { return this.overlay.generateRelicChoices(probs, this.equippedRelics); }

  // ============ 卡牌显示（委托 GridRenderer） ============

  renderCard(gridNum) { this.grid.renderCard(gridNum); }
  destroyCardDisplay(gridNum) { this.grid.destroyCardDisplay(gridNum); }
  refreshCardTexts(gridNum) { this.grid.refreshCardTexts(gridNum); }
  renderAllCards() { this.grid.renderAllCards(); }

  // ============ 道具牌格（委托 GridRenderer） ============

  renderItemSlot(index) { this.grid.renderItemSlot(index); }
  _clearItemSlotDisplay(index) { this.grid._clearItemSlotDisplay(index); }
  renderAllItemSlots() { this.grid.renderAllItemSlots(); }

  // ============ 点击处理 ============

  /** 点击空格子：触发旋转并补牌 */
  handleEmptyCellClick(gridNum) {
    if (this.isBattleInputLocked()) return;
    // 仅允许正交相邻的空格子
    if (!isAdjacent(gridNum, 5)) return;
    if (this.nodeComplete) return;

    // 直接执行旋转（不通过 _pendingRotation 标志，避免双重旋转）
    this.rotateBoardClockwise();
    this.setLog(`👆 点击空格——棋盘顺时针旋转！`);

    // 旋转后补牌：从战斗卡组填充空格
    this.settleBoardAfterMutation(100);
  }

  handleGridClick(gridNum, card) {
    if (this.isBattleInputLocked()) return;

    // 医疗兵：每次玩家行动，位于下排的医疗兵恢复全体怪物4血
    const medicHeals = calcMedicHeal(this.boardCards, this.clickCounter);
    for (const { gridNum: hGn, amount } of medicHeals) {
      const targetCard = this.boardCards.get(hGn);
      if (targetCard && targetCard.type === "monster") {
        targetCard.data.hp = Math.min(targetCard.data.maxHp || targetCard.data.hp, targetCard.data.hp + amount);
        this.showFloatingText(getGridCenter(hGn).x, getGridCenter(hGn).y, `+${amount}💚`, COLOR.TEXT_HEAL);
      }
    }
    if (medicHeals.length > 0) {
      this.setLog(`💉 医疗兵恢复 ${medicHeals.length} 只怪物 4 血量`);
      this.renderAllCards();
    }

    // ★ 正交相邻检查：玩家只能与格5（玩家位置）正交相邻的卡牌互动
    if (!isAdjacent(gridNum, 5)) {
      this.setLog("🔒 只能与正交相邻格子上的卡牌互动！（对角位置不可达）");
      if (this.targeting) this.exitTargeting(false);
      return;
    }

    // 节点通关后只允许与帮助卡交互（拾取到道具牌格使用）
    if (this.nodeComplete) {
      if (card.type === "help") {
        if (this.pickupHelpCard(gridNum)) {
          this._pendingRotation = true;
        }
      }
      return;
    }

    if (this.targeting) {
      this.handleTargetedClick(gridNum, card);
      return;
    }
    if (card.type === "player") {
      this.setLog("👤 小鬼坚守阵地！"); return;
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
      // 叫人！词条：每3次行动将等级2怪物加入战斗牌组
      if (checkCallFriends(card, this.clickCounter)) {
        // 从等级2怪物池随机取一只加入战斗卡组
        const lv2Keys = Object.keys(MONSTERS).filter(k => MONSTERS[k].level === 2);
        if (lv2Keys.length > 0) {
          const key = lv2Keys[Math.floor(Math.random() * lv2Keys.length)];
          this.battleDeck.push({ type: "monster", data: { ...MONSTERS[key], id: `${MONSTERS[key].name}_call_${Date.now()}` } });
          this.setLog(`📞 叫人！触发——${MONSTERS[key].name} 加入战斗牌组`);
          this.updateDeckUI();
        }
      }
      this._pendingRotation = true;
      this.initiateCombat(gridNum); return;
    }
    if (card.type === "help") {
      if (this.pickupHelpCard(gridNum)) {
        this._pendingRotation = true;
      }
      return;
    }
  }

  handleTargetedClick(gridNum, card) {
    const t = this.targeting;
    if (card.type !== "monster") {
      this.exitTargeting(false);
      this.handleGridClick(gridNum, card);
      return;
    }
    if (t.type === "flyingDagger" || t.type === "fireball" || t.type === "ram") {
      this._pendingRotation = true;
      this.combatResolving = true;
      const m = card.data;
      let dmg;
      if (t.type === "fireball") dmg = this.playerState.attack;
      else if (t.type === "ram") dmg = this.playerState.hp;
      else dmg = t.amount;
      // 倍增塔效果
      if (this.playerState._doubleTower) { dmg *= 2; this.playerState._doubleTower = false; }
      m.hp -= dmg;
      if (m.hp < 0) m.hp = 0;
      const logIcon = t.type === "fireball" ? "🔥" : t.type === "ram" ? "💥" : "🔪";
      this.setLog(`${logIcon} ${t.type}命中 ${m.name}，造成 ${dmg} 伤害！`);
      this.flashCard(gridNum, 0xff4444);
      this.refreshCardTexts(gridNum);
      this.consumeItemSlot(t.sourceSlot);
      this.exitTargeting();
      if (m.hp <= 0) {
        this.time.delayedCall(400, () => this.killMonster(gridNum, m, card));
      } else {
        this.finishCombatResolution();
      }
    } else if (t.type === "armorBreak") {
      const m = card.data;
      m.defense = Math.max(0, m.defense - (t.amount || 5));
      this.setLog(`🔨 破击锤: ${m.name} 防御-${t.amount || 5}（剩余 ${m.defense}）`);
      this.refreshCardTexts(gridNum);
      this._markHelpUsed(t.sourceSlot);
      this.consumeItemSlot(t.sourceSlot);
      this.exitTargeting();
    } else if (t.type === "exchange") {
      this._exchangeTarget1 = { gridNum, card };
      this.exitTargeting(true);
      this.enterTargeting("exchange2", t.sourceSlot, {});
      return;
    } else if (t.type === "exchange2") {
      const g1 = this._exchangeTarget1;
      if (!g1) { this.exitTargeting(); return; }
      this._exchangeTarget1 = null;
      // 交换两张卡牌
      const c1 = this.boardCards.get(g1.gridNum);
      const c2 = this.boardCards.get(gridNum);
      if (c1) { c1._slot = gridNum; this.boardCards.set(gridNum, c1); } else { this.boardCards.delete(gridNum); }
      if (c2) { c2._slot = g1.gridNum; this.boardCards.set(g1.gridNum, c2); } else { this.boardCards.delete(g1.gridNum); }
      this.setLog(`🔄 交换卡: 格${g1.gridNum} ↔ 格${gridNum} 交换位置`);
      this.renderAllCards();
      this.consumeItemSlot(t.sourceSlot);
      this.exitTargeting();
    }
  }

  handleItemSlotClick(index) {
    if (this.isBattleInputLocked()) return;

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
      case "fireball": this.enterTargeting("fireball", index, h); break;
      case "reverseRotation": this.useReverseRotation(index, h); break;
      case "bomb": this.useBomb(index, h); break;
      case "exchange": this.enterTargeting("exchange", index, h); break;
      case "armorBreak": this.enterTargeting("armorBreak", index, h); break;
      case "ram": this.enterTargeting("ram", index, h); break;
      case "healingSpring": this.useHealingSpring(index, h); break;
      case "rollingStone": this.useRollingStone(index, h); break;
      case "watchtower": this.useWatchtower(index, h); break;
      case "doubleTower": this.useDoubleTower(index, h); break;
      default: this.setLog(`⚠️ 未知帮助卡: ${h.effectType}`);
    }
  }

  // ============ 帮助卡效果 ============

  pickupHelpCard(gridNum) {
    const card = this.boardCards.get(gridNum);
    if (!card || card.type !== "help") return false;
    const slot = this.itemSlots.findIndex((s) => s === null);
    if (slot === -1) { this.setLog("⚠️ 道具牌格已满！"); return false; }
    this.itemSlots[slot] = { type: "help", data: { ...card.data }, _fromHelpDeck: card._fromHelpDeck };
    this.renderItemSlot(slot);
    this.destroyCardDisplay(gridNum);
    this.boardCards.delete(gridNum);
    this.setLog(`✨ 拾取「${card.data.name}」→ 牌格 #${slot + 1}`);

    // 空格从战斗卡组补牌（保留短暂延迟，但不再丢弃重复请求）
    this.settleBoardAfterMutation(450);
    return true;
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
    // 给每个 option 的 action 添加收尾操作
    options.forEach(opt => {
      const origAction = opt.action;
      opt.action = () => {
        origAction();
        this._markHelpUsed(index);
        this.consumeItemSlot(index);
        this.refreshCardTexts(5);
        this.updatePlayerUI();
      };
    });
    this.overlay.showAttributeBoost(options);
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
    const relics = this.generateRelicChoices(h.chestProbs || { 白: 0.65, 蓝: 0.30, 金: 0.05 });
    this.overlay.showChestSelection(relics,
      // onPick
      (relicKey) => {
        if (this.equippedRelics.length >= 12) {
          this.showPopup("⚠️ 遗物格子已满（最多 12 件），请先右键丢弃遗物！");
          return;
        }
        this.equippedRelics.push(relicKey);
        this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode, this.totalKilledThisNode);
        this.setLog(`📦 获得遗物「${RELICS[relicKey].name}」（${RELICS[relicKey].quality}）`);
        this._markHelpUsed(index);
        this.consumeItemSlot(index);
        this.destroyOverlay();
        this.updatePlayerUI();
        this.updateEquipmentUI();
      },
      // onSkip
      () => {
        this.playerState.gold += 20;
        this.setLog("↩ 跳过宝箱，获得 20 金币");
        this._markHelpUsed(index);
        this.consumeItemSlot(index);
        this.destroyOverlay();
        this.updatePlayerUI();
      }
    );
  }

  // ============ 新帮助卡效果 ============

  useReverseRotation(index, h) {
    this.rotateBoardCounterClockwise();
    this.setLog(`🔄 ${h.name}: 棋盘逆时针旋转！`);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
  }

  useBomb(index, h) {
    const dmg = h.amount || 4;
    let count = 0;
    for (const [gn, card] of this.boardCards) {
      if (card.type === "monster") {
        card.data.hp = Math.max(0, card.data.hp - dmg);
        this.showFloatingText(getGridCenter(gn).x, getGridCenter(gn).y, `-${dmg}`, COLOR.TEXT_DAMAGE);
        this.flashCard(gn, 0xff4444);
        count++;
        if (card.data.hp <= 0) {
          this.time.delayedCall(200, () => this.killMonster(gn, card.data, card));
        }
      }
    }
    this.setLog(`💣 ${h.name}: 对 ${count} 只怪物造成 ${dmg} 伤害`);
    this.renderAllCards();
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
    this.settleBoardAfterMutation(500);
  }

  useHealingSpring(index, h) {
    this.playerState._healingSpring = true;
    this.setLog(`💧 ${h.name}: 放入道具牌格，每战斗一次恢复1血`);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
  }

  useRollingStone(index, h) {
    this._pendingRotation = false;
    const emptySlot = this.getEmptyBoardSlots()[0];
    if (emptySlot !== undefined) {
      this.boardCards.set(emptySlot, { type: "help", data: { ...h, _isRollingStone: true } });
      this.renderCard(emptySlot);
      this.setLog(`🪨 ${h.name}: 放置于格${emptySlot}，移至格3时触发`);
    }
    this.consumeItemSlot(index);
  }

  useWatchtower(index, h) {
    this.playerState._watchtower = true;
    this.setLog(`🔭 ${h.name}: 放入道具牌格，每战斗一次对随机怪物2伤害`);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
  }

  useDoubleTower(index, h) {
    this.playerState._doubleTower = true;
    this.setLog(`🏗 ${h.name}: 放入道具牌格，下次帮助卡效果×2后移除`);
    this._markHelpUsed(index);
    this.consumeItemSlot(index);
  }

  /** 逆时针旋转：8个外圈逆时针移动 */
  rotateBoardCounterClockwise() {
    const order = [1, 4, 7, 8, 9, 6, 3, 2];
    const snapshot = {};
    for (const pos of order) snapshot[pos] = this.boardCards.has(pos) ? this.boardCards.get(pos) : null;
    for (let i = 0; i < order.length; i++) {
      const targetPos = order[i];
      const sourcePos = order[(i - 1 + order.length) % order.length];
      const card = snapshot[sourcePos];
      if (card) { if (card._slot !== undefined) card._slot = targetPos; this.boardCards.set(targetPos, card); }
      else { this.boardCards.delete(targetPos); }
    }
    for (const pos of order) { this.destroyCardDisplay(pos); if (this.boardCards.has(pos)) this.renderCard(pos); }
    this._moveCount = (this._moveCount || 0) + 1;
    this._afterRotationSkills(order.filter(p => this.boardCards.has(p)));
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
    this.deck.markHelpUsed(index);
    // 活着的肉遗物：使用帮助卡时恢复1血
    const healAmt = this.relicBonuses.healOnHelpUse || 0;
    if (healAmt > 0 && this.playerState.hp < this.playerState.maxHp) {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + healAmt);
      this.showFloatingText(getGridCenter(5).x, getGridCenter(5).y - 40, `+${healAmt}♥`, COLOR.TEXT_HEAL);
    }
  }

  consumeItemSlot(index) {
    this.deck.consumeItemSlot(index);
    this.renderItemSlot(index);
  }

  // ============ 瞄准系统 ============

  enterTargeting(type, sourceSlot, helpData) {
    // 帮助牌可瞄准九宫格任意怪物（不受距离限制）
    let hasTargetableMonster = false;
    for (const [, c] of this.boardCards) {
      if (c.type === "monster") { hasTargetableMonster = true; break; }
    }
    if (!hasTargetableMonster) { this.setLog("⚠️ 棋盘上没有可瞄准的怪物！"); return; }
    if (this.targeting) this.exitTargeting(true);
    this.targeting = { type, sourceSlot, amount: helpData.amount };
    // 高亮所有怪物
    for (const [gn, c] of this.boardCards) {
      if (c.type === "monster") this.setGridHighlight(gn, true);
    }
    this.highlightItemSlot(sourceSlot, true);
    this.input.setDefaultCursor("crosshair");
    this.setLog("🎯 瞄准模式：点击任意怪物 | Esc/点其他取消");
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
    if (this.combatResolving) return;
    this.combatResolving = true;

    const m = card.data;
    const p = this.playerState;
    const eff = this.getEffectiveStats(m.id || m.name);

    // 怪物词条加成（旧词条 + 新位置词条）
    const inspireBonus = calcInspireBonus(this.boardCards, gridNum);
    const revengeBonus = calcRevengeBonus(m, this.totalKilledThisNode);
    const spadeYoungBonus = calcSpadeYoungBonus(this.boardCards, gridNum);
    const clubYoungBonus = calcClubYoungBonus(m, gridNum);
    const diamondYoungBonus = calcDiamondYoungBonus(m, gridNum);
    const protectAuraBonus = calcProtectAuraBonus(this.boardCards, gridNum);
    // 战舞加成
    const danceAtk = m._danceAtk || 0;
    const danceDef = m._danceDef || 0;
    // 黑桃皇室累加攻击
    const royalAtk = m._royalAtk || 0;
    // 怪物有效防御 = 基础 + 方块幼崽 + 防护光环 + 战舞防
    const monsterEffDef = m.defense + diamondYoungBonus + protectAuraBonus + danceDef;
    // 龙鳞甲减益 + 怪物有效攻击
    const monsterAtk = Math.max(0, m.attack + inspireBonus + revengeBonus + spadeYoungBonus + clubYoungBonus + danceAtk + royalAtk - this.relicBonuses.monsterAtkDebuff);

    // 荆棘甲额外伤害
    const thornDmg = this.relicBonuses.thornDmg;
    // 铁盾伤害减免
    const dmgReduction = this.relicBonuses.damageReduction || 0;

    // 玩家伤害 = 有效攻击 - 怪物有效防御
    let playerDmg = Math.max(0, eff.atk - monsterEffDef) + thornDmg;
    // 暴力卡翻倍（在有效攻击基础上）
    if (p.isViolenceActive) playerDmg = Math.max(0, p.attack - monsterEffDef) + thornDmg;

    // 提前声明 logParts（后续的庇佑检查和伤害日志都会用到）
    let logParts = [];

    // 怪物庇佑：下次受伤变为0
    if (m._hasBlessing && playerDmg > 0) {
      playerDmg = 0;
      m._hasBlessing = false;
      logParts.push("🛡庇佑");
    }

    m.hp -= playerDmg;
    if (m.hp < 0) m.hp = 0;

    // 散子词条追踪
    const scatterSpawns = checkScatterSpawn(m, playerDmg);

    this.flashCard(5, 0x5b9bd5);
    this.flashCard(gridNum, 0xff0000);
    const monPos = getGridCenter(gridNum);
    this.showFloatingText(monPos.x, monPos.y - 20, `-${playerDmg}`, COLOR.TEXT_DAMAGE);

    logParts = [`⚔ 小鬼(${eff.atk}攻) → ${m.name}：${playerDmg} 伤害`];
    if (inspireBonus > 0) logParts.push(`📯鼓舞+${inspireBonus}`);
    if (revengeBonus > 0) logParts.push(`💢复仇+${revengeBonus}`);
    if (spadeYoungBonus > 0) logParts.push(`♠黑桃+${spadeYoungBonus}`);
    if (clubYoungBonus > 0) logParts.push(`♣梅花+${clubYoungBonus}`);
    if (diamondYoungBonus > 0) logParts.push(`♦方块防+${diamondYoungBonus}`);
    if (protectAuraBonus > 0) logParts.push(`🛡防护+${protectAuraBonus}`);
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
      // 红桃之母：召唤红桃怪物
      const hmSpawns = checkHeartMotherSpawn(m, playerDmg);
      if (hmSpawns.length > 0) {
        for (const hm of hmSpawns) { this.battleDeck.push({ type: "monster", data: hm }); }
        this.updateDeckUI();
        this.setLog(`👩 红桃之母触发！${hmSpawns.length} 只红桃加入战斗卡组`);
      }
      // 决斗：触发后锁定后续旋转
      if (m.traits?.includes("决斗")) {
        m._duelActive = true;
        this.setLog("⚔️ 决斗生效——卡牌移动被禁止！");
      }

      if (m.hp <= 0) {
        this.killMonster(gridNum, m, card);
        this.resetViolence();
        this.battleVetState.stacks = 0;
        this.refreshCardTexts(gridNum);
        this.updatePlayerUI();
        return;
      }

      // 尖盾：处于上排时额外对玩家造成2伤害
      const sharpDmg = calcSharpShieldDamage(m, gridNum);
      // 爱之躯：每次战斗恢复2血
      const loveHeal = calcLoveBodyHeal(m);
      if (loveHeal > 0) {
        m.hp = Math.min((m.maxHp || m.hp), m.hp + loveHeal);
      }

      // 怪物反击（含词条加成 + 尖盾额外伤害）
      let monsterDmg = Math.max(0, monsterAtk - eff.def) + sharpDmg;
      // 铁盾伤害减免
      monsterDmg = Math.max(0, monsterDmg - dmgReduction);

      // 庇佑魔法卡
      if (p.shieldActive && monsterDmg > 0) {
        monsterDmg = 0;
        p.shieldActive = false;
        this.setLog(`🛡️ 庇佑魔法卡挡下 ${monsterAtk} 攻击！`);
      }

      p.hp -= monsterDmg;
      if (p.hp < 0) p.hp = 0;

      let counterLog = [];
      if (sharpDmg > 0) counterLog.push(`🛡尖盾+${sharpDmg}`);
      if (loveHeal > 0) counterLog.push(`💕爱之躯+${loveHeal}`);

      // 刺皮反伤
      const thornsDmg = calcThornsDamage(this.learnedSkills, monsterAtk);
      if (thornsDmg > 0 && monsterDmg > 0) {
        m.hp -= thornsDmg;
        if (m.hp < 0) m.hp = 0;
        this.showFloatingText(monPos.x, monPos.y + 10, `刺皮-${thornsDmg}`, "#9b59b6");
        counterLog.push(`🦔刺皮反伤 ${thornsDmg}`);
      }

      // 破甲词条（旧，防-1）+ 破防专家（新，防-2）
      if ((m.traits?.includes("破甲") || checkDefenseBreaker(m, gridNum)) && playerDmg > 0) {
        const defLoss = checkDefenseBreaker(m, gridNum) ? 2 : 1;
        p.defense = Math.max(0, p.defense - defLoss);
        p.baseDefense = Math.max(0, p.baseDefense - defLoss);
        if (checkDefenseBreaker(m, gridNum)) counterLog.push(`🔓破防-${defLoss}`);
      }

      this.flashCard(5, 0xff0000);
      const playerPos = getGridCenter(5);
      this.showFloatingText(playerPos.x, playerPos.y - 20, `-${monsterDmg}`, COLOR.TEXT_DANGER);

      this.setLog(`${logParts.join(" | ")} | ${m.name}(${monsterAtk}攻) → 小鬼：${monsterDmg} 反击${counterLog.length > 0 ? " | " + counterLog.join(" ") : ""}`);

      this.resetViolence();
      // 金剑战损：每次战斗攻击-1
      this._applyBattleAtkDecay();
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
        return;
      }

      if (p.hp <= 0) {
        // 凤凰羽毛免死
        if (hasDeathSave(this.equippedRelics)) {
          p.hp = Math.floor(p.maxHp * 0.5);
          consumeDeathSave(this.equippedRelics);
          this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode, this.totalKilledThisNode);
          this.setLog("🔥 凤凰羽毛触发！恢复 50% 血量");
          this.updatePlayerUI();
          this.combatResolving = false;
          return;
        }
        this.time.delayedCall(400, () => this.gameOver());
        return;
      }

      this.combatResolving = false;
      // 治疗泉/瞭望塔道具牌格效果
      this._applyItemSlotCombatEffects();
    });
  }

  killMonster(gridNum, monster, card) {
    this.totalKilledThisNode++;

    // 基础金币
    let goldGain = monster.goldDrop || 10;
    // 幸运硬币：击败精英/层主时将金币卡加入战斗卡组
    if (card.isElite || card.isBoss) {
      triggerLuckyCoin(this.equippedRelics, this.battleDeck);
    }
    // 村好剑：击败精英/层主攻永久+1
    if ((card.isElite || card.isBoss) && this.equippedRelics.includes("村好剑")) {
      const bonusAtk = RELICS["村好剑"].eliteKillAtk || 1;
      this.playerState.baseAttack += bonusAtk;
      this.playerState.attack += bonusAtk;
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

    // 精英/层主额外掉落 → 洗入战斗牌组
    if (card.isElite && card.eliteDrop) {
      for (const itemName of card.eliteDrop) {
        const newCard = this.createHelpCard(itemName);
        if (newCard) {
          this.battleDeck.push({ type: "help", data: newCard, _fromHelpDeck: false });
          log += ` | ✨ 掉落「${itemName}」→ 战斗牌组`;
        }
      }
      this.updateDeckUI();
    }
    if (card.isBoss && card.bossDrop) {
      for (const itemName of card.bossDrop) {
        const newCard = this.createHelpCard(itemName);
        if (newCard) {
          this.battleDeck.push({ type: "help", data: newCard, _fromHelpDeck: false });
          log += ` | ✨ 掉落「${itemName}」→ 战斗牌组`;
        }
      }
      this.updateDeckUI();
    }

    // 精英击杀 → 导师卡
    if (card.isElite) {
      log += " | 🎓 导师出现！";
      this.setLog(log);
      this.destroyCardDisplay(gridNum);
      this.boardCards.delete(gridNum);
      this.updatePlayerUI();
      this.updateDeckUI();
      this.time.delayedCall(600, () => this.showMentorCard());
      return;
    }

    this.setLog(log);
    this.destroyCardDisplay(gridNum);
    this.boardCards.delete(gridNum);
    this.updatePlayerUI();
    this.updateDeckUI();
    this.finishCombatResolution(500);
  }

  resetViolence() {
    if (this.playerState.isViolenceActive) {
      this.playerState.attack = this.playerState.baseAttack;
      this.playerState.isViolenceActive = false;
    }
  }

  /** 道具牌格持续效果：治疗泉回血、瞭望塔伤敌 */
  _applyItemSlotCombatEffects() {
    // 治疗泉：每战斗一次回1血
    if (this.playerState._healingSpring) {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 1);
    }
    // 瞭望塔：每战斗一次对随机怪物2伤害
    if (this.playerState._watchtower) {
      const monsters = [];
      for (const [gn, c] of this.boardCards) {
        if (c.type === "monster") monsters.push({ gn, card: c });
      }
      if (monsters.length > 0) {
        const target = monsters[Math.floor(Math.random() * monsters.length)];
        target.card.data.hp = Math.max(0, target.card.data.hp - 2);
        this.showFloatingText(getGridCenter(target.gn).x, getGridCenter(target.gn).y, "-2", COLOR.TEXT_DAMAGE);
        this.refreshCardTexts(target.gn);
        if (target.card.data.hp <= 0) {
          this.time.delayedCall(200, () => this.killMonster(target.gn, target.card.data, target.card));
        }
      }
    }
    this.updatePlayerUI();
  }

  /** 金剑战损：每次战斗后攻击-1，归零则移除 */
  _applyBattleAtkDecay() {
    for (const key of this.equippedRelics) {
      const relic = RELICS[key];
      if (relic?.battleAtkDecay && relic._remainingAtk !== undefined) {
        relic._remainingAtk = Math.max(0, relic._remainingAtk - relic.battleAtkDecay);
        if (relic._remainingAtk <= 0) {
          const idx = this.equippedRelics.indexOf(key);
          if (idx !== -1) this.equippedRelics.splice(idx, 1);
          this.setLog("⚔️ 金剑破碎！（攻击力耗尽）");
        }
        this.relicBonuses = calcRelicBonuses(this.equippedRelics, this.currentNode, this.totalKilledThisNode);
        this.updateEquipmentUI();
        break;
      }
    }
  }

  gameOver() {
    this.setLog("💀 小鬼倒下了...");
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

  // ============ 静态 UI（委托 HUD） ============

  createStaticUI() { this.hud.createAll(); }
  createEquipmentSlots() { this.hud.createEquipmentSlots(); }
  createSkillArea() { this.hud.createSkillArea(); }
  createDeckArea() { this.hud.createDeckArea(); }

  updateAllUI() { this.hud.updateAll(); }
  updateSkillUI() { this.hud.updateSkillUI(); }
  updatePlayerUI() { this.hud.updatePlayerUI(); }
  updateNodeUI() { this.hud.updateNodeUI(); }
  updateDeckUI() { this.hud.updateDeckUI(); }
  updateEquipmentUI() { this.hud.updateEquipmentUI(); }

  // ============ 视觉特效（委托 GridRenderer） ============

  flashCard(gridNum, color) { this.grid.flashCard(gridNum, color); }
  showFloatingText(x, y, text, color) { this.grid.showFloatingText(x, y, text, color); }

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
