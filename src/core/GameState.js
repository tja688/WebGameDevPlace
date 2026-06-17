import EventBus, { GameEvents } from "./EventBus.js";
import relicManager from "../systems/RelicManager.js";
import skillManager from "../systems/SkillManager.js";
import { HELP_CARDS } from "../data/HelpCardData.js";
import { buildMonsterDeckByNode } from "../data/TestData.js";

// ============================================================
// GameState — 全局游戏状态管理器（单例）
// 管理：输入锁定、玩家属性（含遗物/技能管线）、卡组数据
// ============================================================

class GameState {
  constructor() {
    // ---- 输入锁定 ----
    this.isCombatResolving = false;
    this.isBoardRefilling = false;
    this.isOverlayOpen = false;

    // ---- 玩家基础属性 ----
    this.maxHp = 10;
    this.hp = 10;
    this.atk = 3;
    this.baseArmor = 1;
    this.currentArmor = 1;
    this.gold = 0;
    this.hasFirstStrike = false; // 玩家默认无先攻
    this._blessed = false; // 庇佑标记

    // ---- 卡组 ----
    /** @type {Array} 战斗卡组（顶部=索引0） */
    this.battleDeck = [];
    /** @type {Array} 玩家侧卡组 */
    this.playerDeck = [];
    /** @type {Array} 怪物侧卡组 */
    this.monsterDeck = [];

    // ---- 关卡 ----
    this.currentLayer = 1;
    this.currentNode = 1;
    this.interactionCount = 0;
  }

  // ============================================================
  // 输入锁定
  // ============================================================

  /** 任一锁定状态存在时返回 true */
  isInputLocked() {
    return this.isCombatResolving || this.isBoardRefilling || this.isOverlayOpen;
  }

  lockInput(reason = "combat") {
    if (reason === "combat") this.isCombatResolving = true;
    if (reason === "refill") this.isBoardRefilling = true;
    if (reason === "overlay") this.isOverlayOpen = true;
    EventBus.emit(GameEvents.INPUT_LOCKED, reason);
  }

  unlockInput(reason = "combat") {
    if (reason === "combat") this.isCombatResolving = false;
    if (reason === "refill") this.isBoardRefilling = false;
    if (reason === "overlay") this.isOverlayOpen = false;
    if (!this.isInputLocked()) {
      EventBus.emit(GameEvents.INPUT_UNLOCKED);
    }
  }

  // ============================================================
  // 玩家属性管线
  // ============================================================

  /** 获取有效攻击力（基础 + 遗物 + 技能） */
  getEffectiveAttack() {
    let value = this.atk;
    value += relicManager.getAttrBonuses().atk;
    value += skillManager.getAttrBonuses().atk;
    return Math.max(0, value);
  }

  /** 获取当前护甲值 */
  getEffectiveArmor() {
    return this.currentArmor;
  }

  /** 获取有效血量上限（基础 + 遗物 + 技能） */
  getEffectiveMaxHp() {
    let value = this.maxHp;
    value += relicManager.getAttrBonuses().maxHp;
    value += skillManager.getAttrBonuses().maxHp;
    return Math.max(1, value);
  }

  /** 获取基础护甲值（含遗物加成） */
  getEffectiveBaseArmor() {
    let value = this.baseArmor;
    value += relicManager.getAttrBonuses().baseArmor;
    return Math.max(0, value);
  }

  /** 获取伤害减免值（来自遗物等） */
  getDmgReduction() {
    return relicManager.getDmgReduction();
  }

  // ============================================================
  // 属性修改
  // ============================================================

  /** 对玩家造成伤害 — 返回实际扣血量 */
  takeDamage(damage) {
    if (damage <= 0) return 0;

    // 庇佑：免疫一次伤害
    if (this._blessed) {
      this._blessed = false;
      console.log("[GameState] 庇佑触发，伤害免疫");
      return 0;
    }

    // 伤害减免
    const reduction = this.getDmgReduction();
    const reducedDmg = Math.max(0, damage - reduction);
    let remaining = reducedDmg;

    // 先扣护甲
    const armorLoss = Math.min(this.currentArmor, remaining);
    this.currentArmor -= armorLoss;
    remaining -= armorLoss;

    // 再扣血量
    const hpLoss = Math.min(this.hp, remaining);
    this.hp -= hpLoss;
    remaining -= hpLoss;

    const totalTaken = armorLoss + hpLoss;
    // 金属血液：损失血量后获得等量护甲
    if (hpLoss > 0 && relicManager.hasRelic("metalBlood")) {
      this.currentArmor += hpLoss;
      console.log(`[金属血液] 损失${hpLoss}HP，获得${hpLoss}护甲`);
    }

    EventBus.emit(GameEvents.PLAYER_DAMAGED, {
      total: totalTaken, armorLoss, hpLoss,
      currentHp: this.hp, currentArmor: this.currentArmor,
    });
    EventBus.emit(GameEvents.PLAYER_HP_CHANGED, this.hp, this.maxHp);
    EventBus.emit(GameEvents.PLAYER_ARMOR_CHANGED, this.currentArmor);

    if (this.hp <= 0) {
      // 触发遗物 onFatalDamage 效果（如凤凰羽毛复活）
      relicManager.triggerEffects("onFatalDamage", {});
      if (this.hp > 0) return totalTaken; // 复活了，不死亡
      EventBus.emit(GameEvents.PLAYER_DIED);
    }

    return totalTaken;
  }

  /** 恢复玩家血量（上限含遗物加成） */
  heal(amount) {
    const oldHp = this.hp;
    // 渴望遗物：恢复翻倍
    if (relicManager.hasRelic("crave")) amount *= 2;
    const effectiveMax = this.getEffectiveMaxHp();
    this.hp = Math.min(effectiveMax, this.hp + amount);
    const healed = this.hp - oldHp;
    if (healed > 0) {
      EventBus.emit(GameEvents.PLAYER_HP_CHANGED, this.hp, this.maxHp);
    }
    return healed;
  }

  /** 修改攻击力 */
  addAttack(amount) {
    this.atk += amount;
    EventBus.emit(GameEvents.PLAYER_ATK_CHANGED, this.atk);
  }

  /** 添加护甲 */
  addArmor(amount) {
    this.currentArmor += amount;
    EventBus.emit(GameEvents.PLAYER_ARMOR_CHANGED, this.currentArmor);
  }

  /** 修改血量上限 */
  addMaxHp(amount) {
    this.maxHp = Math.max(1, this.maxHp + amount);
    if (amount > 0) this.hp += amount;
    if (amount < 0) this.hp = Math.min(this.hp, this.maxHp);
    EventBus.emit(GameEvents.PLAYER_HP_CHANGED, this.hp, this.maxHp);
  }

  // ============================================================
  // 金币
  // ============================================================

  addGold(amount) {
    this.gold += amount;
    EventBus.emit(GameEvents.GOLD_CHANGED, this.gold);
  }

  spendGold(amount) {
    if (this.gold >= amount) {
      this.gold -= amount;
      EventBus.emit(GameEvents.GOLD_CHANGED, this.gold);
      return true;
    }
    return false;
  }

  // ============================================================
  // 卡组操作
  // ============================================================

  /** 初始化玩家侧卡组（小丑初始牌组）— 直接放入 playerDeck 供首关使用 */
  initPlayerDeck() {
    this.playerDeck = [];
    const initialCards = [];
    for (let i = 0; i < 3; i++) {
      initialCards.push({ ...HELP_CARDS.potion, type: "help", uid: `pd_p${i + 1}` });
      initialCards.push({ ...HELP_CARDS.dagger, type: "help", uid: `pd_d${i + 1}` });
    }
    initialCards.push({ ...HELP_CARDS.chestWhite, type: "help", uid: "pd_chest" });
    initialCards.push({ id: "statUp", name: "属性提升卡", type: "help", rarity: "gold",
      effect: { type: "statChoice" }, desc: "攻击+1/护甲+1/血量+2", uid: "pd_stat" });
    this.playerDeck = initialCards;
    console.log(`[GameState] 初始玩家卡组: ${this.playerDeck.length}张`);
  }

  /** 生成怪物侧卡组（按设计文档节点规则） */
  buildMonsterDeck(layer, node) {
    this.monsterDeck = buildMonsterDeckByNode(layer, node);
    this._shuffle(this.monsterDeck);
    console.log(`[怪物侧] 第${layer}层节点${node}: ${this.monsterDeck.length}张怪物`);
  }

  /** 构建战斗卡组（玩家侧 + 怪物侧 → 洗混） */
  buildBattleDeck() {
    this.battleDeck = [...this.playerDeck, ...this.monsterDeck];
    this._shuffle(this.battleDeck);
    this.playerDeck = [];
    this.monsterDeck = [];
  }

  /** 从战斗卡组顶部抽一张牌 */
  drawFromBattleDeck() {
    if (this.battleDeck.length === 0) return null;
    return this.battleDeck.shift();
  }

  /** 将卡牌洗入战斗卡组 */
  shuffleCardToDeck(cardData) {
    this.battleDeck.unshift(cardData);
  }

  /** 获取战斗卡组剩余数量 */
  getBattleDeckCount() {
    return this.battleDeck.length;
  }

  /** Fisher-Yates 洗牌 */
  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ============================================================
  // 重置
  // ============================================================

  /** 重置当前节点状态 */
  resetNodeState() {
    this.isCombatResolving = false;
    this.isBoardRefilling = false;
    this.isOverlayOpen = false;
    this.interactionCount = 0;
  }

  /** 重置整个游戏 */
  resetAll() {
    this.resetNodeState();
    this.maxHp = 10;
    this.hp = 10;
    this.atk = 3;
    this.baseArmor = 1;
    this.currentArmor = this.getEffectiveBaseArmor(); // 关卡开始时：当前护甲=有效护甲
    this.gold = 0;
    this.hasFirstStrike = false;
    this._blessed = false;
    this.battleDeck = [];
    this.playerDeck = [];
    this.monsterDeck = [];
    this.currentLayer = 1;
    this.currentNode = 1;
    // 重置遗物和技能
    relicManager.slots = new Array(12).fill(null);
    skillManager.reset();
    // 初始技能
    skillManager.addSkill({ id: "lightCarriage", name: "轻车熟路", type: "player", desc: "每关卡结束时，进行一次白色帮助卡三选一" });
  }
}

/** 全局游戏状态单例 */
const gameState = new GameState();

export default gameState;
