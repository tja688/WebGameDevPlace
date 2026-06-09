// ==================== 深入地牢 — 卡组状态管理器 ====================
// 三大卡池（帮助卡组/战斗卡组/恶魔卡组）的全部数据操作
// 纯数据层，不依赖 Phaser Scene（定时器相关由 BattleScene 协调）

import { HELP_CARDS, HELP_CARDS_BY_QUALITY, HELP_DECK_CAPACITY, INITIAL_HELP_DECK } from "../data/GameData.js";

export class DeckManager {
  constructor() {
    // ===== uid 计数器 =====
    this.nextUid = 0;

    // ===== 三大卡池 =====
    /** @type {Array} 帮助卡组 — 玩家持久持有 */
    this.helpDeck = [];
    /** @type {Array} 战斗卡组 — 当前节点抽牌堆 */
    this.battleDeck = [];
    /** @type {Array} 恶魔卡组 — 当前节点怪物池 */
    this.demonDeck = [];

    // ===== 棋盘状态 =====
    /** @type {Map<number, object>} gridNum -> cardData */
    this.boardCards = new Map();
    /** @type {Array} 道具牌格 (5格) */
    this.itemSlots = new Array(5).fill(null);

    // ===== 节点追踪 =====
    /** @type {Array<number>} 本节点从帮助卡组抽出的卡 uid */
    this.nodeDrawnHelpUids = [];
    /** @type {Array<number>} 本节点已使用的帮助卡 uid */
    this.nodeUsedHelpUids = [];
    /** @type {Array<number>} 本节点永久移除的帮助卡 uid */
    this.nodePermaRemovedUids = [];
    /** @type {Array|null} 节点前帮助卡组快照（JSON 深拷贝） */
    this._preNodeHelpDeck = null;
    /** @type {Array|null} 战斗卡组中的帮助卡追踪 */
    this.helpCardsInBattleDeck = null;

    // ===== 商店 =====
    /** @type {object|null} 商店会话 */
    this.shopSession = null;

    // ===== 补牌状态标志 =====
    this.boardRefillScheduled = false;
    this.boardRefillRunning = false;
  }

  // ==================== 卡牌创建 ====================

  /** 创建一张带唯一 uid 的帮助卡 */
  createHelpCard(key) {
    const def = HELP_CARDS[key];
    if (!def) return null;
    return { key, uid: this.nextUid++, ...def };
  }

  /** 构建初始帮助卡组 */
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

  // ==================== 棋盘查询 ====================

  /** 获取棋盘上的空格位号列表 */
  getEmptyBoardSlots() {
    return [1, 2, 3, 4, 6, 7, 8, 9].filter((gridNum) => !this.boardCards.has(gridNum));
  }

  /** 检查是否有待处理的补牌 */
  hasPendingBoardRefill() {
    return this.boardRefillScheduled || this.boardRefillRunning;
  }

  // ==================== 发牌与补牌 ====================

  /** 节点初始发牌：帮3+魔3→洗混→抽2 */
  dealInitialCards(demonDeckInput) {
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
    const demonDeckCopy = [...demonDeckInput];
    const demonCount = Math.min(3, demonDeckCopy.length);
    for (let i = 0; i < demonCount; i++) {
      const card = demonDeckCopy.pop();
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
    this.battleDeck = this.shuffle([...remainingHelp, ...demonDeckCopy]);
    this.demonDeck = [];

    // 从战斗卡组抽 2 张
    for (let i = 0; i < 2 && shuffled.length > 0; i++) {
      this.drawFromBattleDeck(shuffled.pop());
    }
  }

  /** 从战斗卡组抽一张到指定格位 */
  drawFromBattleDeck(slot) {
    if (!slot) {
      const empty = this.getEmptyBoardSlots()[0];
      if (empty === undefined) return null;
      slot = empty;
    }

    if (this.battleDeck.length === 0) return null;

    const card = this.battleDeck.pop();
    this.boardCards.set(slot, card);
    return card;
  }

  /** 棋盘补牌：尽可能从战斗卡组填充空格 */
  refillBoardFromBattleDeck() {
    while (this.battleDeck.length > 0) {
      const emptySlots = this.getEmptyBoardSlots();
      if (emptySlots.length === 0) break;
      this.drawFromBattleDeck(emptySlots[0]);
    }
  }

  /** 检查节点是否通关（棋盘无怪物 + 战斗卡组空 + 无待补牌） */
  isNodeComplete() {
    let hasMonsters = false;
    for (const [, card] of this.boardCards) {
      if (card.type === "monster") { hasMonsters = true; break; }
    }
    return !hasMonsters && this.battleDeck.length === 0 && !this.hasPendingBoardRefill();
  }

  // ==================== 帮助卡拾取 ====================

  /** 从棋盘拾取帮助卡到道具牌格 */
  pickupHelpCard(gridNum) {
    const card = this.boardCards.get(gridNum);
    if (!card || card.type !== "help") return null;
    const slot = this.itemSlots.findIndex((s) => s === null);
    if (slot === -1) return null; // 牌格已满
    this.itemSlots[slot] = { type: "help", data: { ...card.data }, _fromHelpDeck: card._fromHelpDeck };
    this.boardCards.delete(gridNum);
    return slot;
  }

  // ==================== 帮助卡使用追踪 ====================

  /** 标记帮助卡已使用 */
  markHelpUsed(index) {
    const item = this.itemSlots[index];
    if (item && item._fromHelpDeck && item.data.uid !== undefined) {
      this.nodeUsedHelpUids.push(item.data.uid);
      // 永久移除卡单独追踪
      if (item.data.permanentRemove) {
        this.nodePermaRemovedUids.push(item.data.uid);
      }
    }
  }

  /** 消耗道具牌格（清空指定格位） */
  consumeItemSlot(index) {
    this.itemSlots[index] = null;
  }

  // ==================== 节点快照与恢复 ====================

  /** 保存节点前帮助卡组快照 */
  savePreNodeSnapshot() {
    this._preNodeHelpDeck = JSON.parse(JSON.stringify(this.helpDeck));
  }

  /** 节点结束：快照恢复帮助卡组（过滤永久移除 + 合并节点新增） */
  restoreHelpDeckFromSnapshot() {
    const permaSet = new Set(this.nodePermaRemovedUids);
    const nodeAdditions = [...this.helpDeck]; // 节点内新增卡（掉落等）

    this.helpDeck = [
      ...JSON.parse(JSON.stringify(this._preNodeHelpDeck)).filter((c) => !permaSet.has(c.uid)),
      ...nodeAdditions,
    ];
    this.helpCardsInBattleDeck = null;
    this.battleDeck = [];
    this.nodeDrawnHelpUids = [];
    this.nodeUsedHelpUids = [];
    this.nodePermaRemovedUids = [];
  }

  /** 计算未使用帮助卡金币 */
  calcUnusedHelpGold() {
    let unusedGold = 0;
    for (const [, card] of this.boardCards) {
      if (card.type === "help" && card._fromHelpDeck && card.data?.uid !== undefined &&
          !this.nodeUsedHelpUids.includes(card.data.uid)) {
        unusedGold += 10;
      }
    }
    for (const slot of this.itemSlots) {
      if (slot && slot.type === "help" && slot._fromHelpDeck && slot.data?.uid !== undefined &&
          !this.nodeUsedHelpUids.includes(slot.data.uid)) {
        unusedGold += 10;
      }
    }
    return unusedGold;
  }

  // ==================== 商店 ====================

  /** 构建商店会话（独立固定卡池：所有非红品质帮助卡） */
  buildShopSession() {
    const shopPool = Object.entries(HELP_CARDS)
      .filter(([, def]) => def.quality !== "红")
      .map(([key, def]) => ({ key, ...def }));

    const shuffled = this.shuffle(shopPool);
    const offers = shuffled.slice(0, 6).map((card) => ({
      key: card.key,
      card,
      sold: false,
    }));

    while (offers.length < 6) offers.push(null);

    this.shopSession = { offers };
    return this.shopSession;
  }

  /** 获取或创建商店会话 */
  getShopSession() {
    return this.shopSession || this.buildShopSession();
  }

  // ==================== 帮助卡查询 ====================

  /** 检查同名帮助卡是否已达 3 张上限 */
  canAddHelpCardStack(key) {
    const count = this.helpDeck.filter((c) => c.key === key).length;
    return count < 3;
  }

  /** 检查帮助卡组总数量是否超限（含同名堆叠） */
  canAddHelpCard(currentLayer) {
    const cap = HELP_DECK_CAPACITY[currentLayer] || 12;
    return this.helpDeck.length < cap;
  }

  /** 生成随机帮助卡（用于三选一） */
  generateRandomHelpCards(count) {
    const result = [];
    const pool = [];
    for (const [quality, cards] of Object.entries(HELP_CARDS_BY_QUALITY)) {
      if (quality === "红") continue; // 红色不随机出现
      pool.push(...cards);
    }

    const shuffled = this.shuffle(pool);
    // 按品质概率筛选
    const filtered = shuffled.filter(() => Math.random() < 0.95);

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

  // ==================== 工具 ====================

  /** Fisher-Yates 洗牌 */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
