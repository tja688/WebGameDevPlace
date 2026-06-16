import gameState from "../core/GameState.js";
import relicManager from "./RelicManager.js";
import skillManager from "./SkillManager.js";
import { HELP_CARDS } from "../data/HelpCardData.js";
import { rollRelics } from "../data/RelicData.js";
import { MENTOR_SKILLS, getSkill } from "../data/SkillData.js";

// ============================================================
// LevelManager — 层级/节点管理器 + 房间事件执行
// 3层 × 9节点 = 27关，通关后帮助卡三选一 → 房间卡二选一 → 下一节点
// ============================================================

class LevelManager {
  constructor() {
    /** @type {Phaser.Scene|null} */
    this.scene = null;
    this.currentLayer = 1;
    this.currentNode = 1;
    /** 玩家侧卡组 */
    this.playerCards = [];
    /** 每层卡组上限 */
    this.cardLimit = 12;
    /** 通关标记（防止重复弹出） */
    this._levelCleared = false;
    /** 房间卡已选标记 */
    this._roomChosen = false;
  }

  setScene(scene) {
    this.scene = scene;
  }

  // ============================================================
  // 卡组上限
  // ============================================================

  /** 初始化小丑初始牌组 */
  initStartingDeck() {
    this.playerCards = [];
    for (let i = 0; i < 3; i++) {
      this.playerCards.push({ ...HELP_CARDS.potion, type: "help", uid: `pd_p${i + 1}` });
      this.playerCards.push({ ...HELP_CARDS.dagger, type: "help", uid: `pd_d${i + 1}` });
    }
    this.playerCards.push({ ...HELP_CARDS.chestWhite, type: "help", uid: "pd_chest" });
    this.playerCards.push({ id: "statUp", name: "属性提升卡", type: "help", rarity: "gold",
      effect: { type: "statChoice" }, desc: "攻击+1/护甲+1/血量+2", uid: "pd_stat" });
    console.log(`[LevelManager] 初始牌组: ${this.playerCards.length}张`);
  }

  getCardLimit() {
    if (this.currentLayer >= 3) return 24;
    if (this.currentLayer >= 2) return 18;
    return 12;
  }

  /** 检查玩家侧卡组是否已满（含当前关卡中使用的卡） */
  _checkDeckFull() {
    const limit = this.getCardLimit();
    // 总数 = 已积累的 + 当前关卡中的
    const total = this.playerCards.length + (this._cardsInPlay || 0);
    if (total >= limit) {
      this._showToast(`卡组已满！(${total}/${limit})，无法再获取帮助卡`);
      return true;
    }
    return false;
  }

  /** 添加卡牌到玩家侧卡组（带上限检查） */
  _addToPlayerDeck(card) {
    if (this._checkDeckFull()) return false;
    this.playerCards.push(card);
    const limit = this.getCardLimit();
    console.log(`[LevelManager] 卡牌加入玩家侧: ${card.name} (${this.playerCards.length}/${limit})`);
    return true;
  }

  // ============================================================
  // 通关 → 帮助卡三选一
  // ============================================================

  /** 关卡通关触发 */
  onLevelClear() {
    if (this._levelCleared) return;
    this._levelCleared = true;
    console.log(`[LevelManager] 第${this.currentLayer}层 第${this.currentNode}节点 通关！`);

    if (!this.scene) return;

    // 第一步：常规帮助卡三选一（全品质，按概率）
    this._showHelpCardChoice(() => {
      // 第二步：轻车熟路 — 白色帮助卡三选一
      this._showWhiteHelpCardChoice(() => {
        // 第三步：房间卡二选一
        this._showRoomChoice();
      });
    });
  }

  /** 常规帮助卡三选一（全品质按概率 65%/30%/5%） */
  _showHelpCardChoice(onDone) {
    const cards = [];
    const used = new Set();
    for (let i = 0; i < 3; i++) {
      const r = Math.random();
      const rarity = r < 0.65 ? "white" : r < 0.95 ? "blue" : "gold";
      const pool = Object.values(HELP_CARDS).filter((c) => c.rarity === rarity && !used.has(c.id));
      if (pool.length === 0) continue;
      const c = pool[Math.floor(Math.random() * pool.length)];
      used.add(c.id);
      cards.push({ ...c, type: "help", uid: `pick_${Date.now()}_${i}` });
    }

    const rarityColor = { white: 0x6b7280, blue: 0x4a8fc9, gold: 0xd4a830 };
    const options = cards.map((c) => ({
      key: c.id,
      label: c.name,
      subLabel: c.desc || "",
      color: rarityColor[c.rarity] || 0x6b7280,
      _card: c,
    }));

    import("../ui/overlays/SelectionOverlay.js").then(({ showSelectionOverlay }) => {
      showSelectionOverlay(this.scene, {
        title: `🎉 第${this.currentLayer}层-节点${this.currentNode} 通关！\n选择一张帮助卡`,
        options,
        skipLabel: "跳过 → +10💰",
        onSelect: (key, opt) => {
          if (opt._card) this._addToPlayerDeck(opt._card);
          if (onDone) this.scene?.time.delayedCall(200, onDone);
        },
        onSkip: () => {
          gameState.addGold(10);
          if (onDone) this.scene?.time.delayedCall(200, onDone);
        },
      });
    });
  }

  /** 轻车熟路：白色帮助卡三选一 */
  _showWhiteHelpCardChoice(onDone) {
    const whiteCards = Object.values(HELP_CARDS).filter((c) => c.rarity === "white");
    const picked = [];
    const used = new Set();
    for (let i = 0; i < 3 && used.size < whiteCards.length; i++) {
      let c;
      do { c = whiteCards[Math.floor(Math.random() * whiteCards.length)]; }
      while (used.has(c.id));
      used.add(c.id);
      picked.push({ ...c, type: "help", uid: `wht_${Date.now()}_${i}` });
    }

    const options = picked.map((c) => ({
      key: c.id,
      label: c.name,
      subLabel: c.desc || "",
      color: 0x6b7280,
      _card: c,
    }));

    import("../ui/overlays/SelectionOverlay.js").then(({ showSelectionOverlay }) => {
      showSelectionOverlay(this.scene, {
        title: `🃏 轻车熟路\n选择一张白色帮助卡`,
        options,
        skipLabel: "跳过 → +10💰",
        onSelect: (key, opt) => {
          if (opt._card) this._addToPlayerDeck(opt._card);
          if (onDone) this.scene?.time.delayedCall(200, onDone);
        },
        onSkip: () => {
          gameState.addGold(10);
          if (onDone) this.scene?.time.delayedCall(200, onDone);
        },
      });
    });
  }

  // ============================================================
  // 房间卡二选一
  // ============================================================

  _showRoomChoice() {
    // 防止重复调用
    if (this._roomChosen) return;
    this._roomChosen = true;

    // 随机两个房间类型
    const roomTypes = ["shop", "gold", "treasure", "hotspring", "tavern"];
    const shuffled = [...roomTypes].sort(() => Math.random() - 0.5);
    this._pendingRooms = shuffled.slice(0, 2);

    const roomLabels = {
      shop: { name: "商店", desc: "购买帮助卡 / 删除卡牌", color: 0x4a8fc9 },
      gold: { name: "金币房", desc: "获得 50 💰", color: 0xd4a830 },
      treasure: { name: "宝箱房", desc: "三选一遗物", color: 0xc9a02e },
      hotspring: { name: "温泉房", desc: "血量上限+4 并回满血", color: 0x66cc88 },
      tavern: { name: "酒馆", desc: "多种消费选择", color: 0xcc8844 },
    };

    if (!this.scene) return;

    // 发出事件让 GameScene 绘制非阻断式房间按钮
    this.scene.events.emit("show-room-buttons", {
      rooms: this._pendingRooms.map((r) => ({
        key: r,
        label: roomLabels[r].name,
        color: roomLabels[r].color,
      })),
    });

    console.log(`[LevelManager] 房间卡按钮已显示: ${this._pendingRooms.map((r) => roomLabels[r].name).join(" / ")}`);
  }

  // ============================================================
  // 房间事件
  // ============================================================

  executeRoom(type) {
    console.log(`[LevelManager] 进入房间: ${type}`);
    switch (type) {
      case "shop":
        this._openShop();
        break;
      case "gold":
        gameState.addGold(50);
        console.log("[金币房] +50💰");
        this.advanceNode();
        break;
      case "treasure":
        this._openTreasure();
        break;
      case "hotspring":
        gameState.addMaxHp(4);
        gameState.heal(999);
        console.log("[温泉房] 血量上限+4，回满血");
        this.advanceNode();
        break;
      case "tavern":
        this._openTavern();
        break;
      default:
        this.advanceNode();
    }
  }

  // ===== 商店 =====
  _openShop(boughtUids = []) {
    // 首次进入时生成 6 张卡（缓存，不重复生成）
    if (!this._shopCards) {
      const pool = Object.values(HELP_CARDS).filter((c) => c.price > 0);
      this._shopCards = [];
      const used = new Set();
      for (let i = 0; i < 6 && used.size < pool.length; i++) {
        let c;
        do { c = pool[Math.floor(Math.random() * pool.length)]; }
        while (used.has(c.id));
        used.add(c.id);
        this._shopCards.push({ ...c, type: "help", uid: `shop_${Date.now()}_${i}` });
      }
    }

    // 过滤已购买的卡
    const available = this._shopCards.filter((c) => !boughtUids.includes(c.uid));

    if (available.length === 0) {
      console.log("[商店] 全部售罄，离开");
      this._shopCards = null;
      this.advanceNode();
      return;
    }

    const options = available.map((c) => ({
      key: c.uid,
      label: `${c.name}`,
      subLabel: `${c.desc}\n💰${c.price}`,
      color: { white: 0x6b7280, blue: 0x4a8fc9, gold: 0xd4a830, red: 0xc94a3b }[c.rarity] || 0x6b7280,
      _card: c,
    }));

    if (!this.scene) return;

    import("../ui/overlays/SelectionOverlay.js").then(({ showSelectionOverlay }) => {
      showSelectionOverlay(this.scene, {
        title: `🛒 商店（余额: ${gameState.gold}💰）`,
        options,
        skipLabel: "离开商店",
        onSelect: (key, opt) => {
          if (!opt._card) return;
          const card = opt._card;
          if (gameState.gold < card.price) {
            this._showToast(`金币不足！需要 ${card.price}💰`);
            this.scene?.time.delayedCall(500, () => this._openShop(boughtUids));
            return;
          }
          if (this._checkDeckFull()) {
            this.scene?.time.delayedCall(500, () => this._openShop(boughtUids));
            return;
          }
          gameState.spendGold(card.price);
          this._addToPlayerDeck(card);
          console.log(`[商店] 购买 ${card.name}，-${card.price}💰`);
          // 重新打开，买过的不会再出现
          const newBought = [...boughtUids, card.uid];
          this.scene?.time.delayedCall(300, () => this._openShop(newBought));
        },
        onSkip: () => {
          this._shopCards = null;
          this.advanceNode();
        },
      });
    });
  }

  // ===== 宝箱房 =====
  _openTreasure() {
    const relics = rollRelics(3, relicManager.getEquippedIds());
    const options = relics.map((r) => ({
      key: r.id,
      label: r.name,
      subLabel: r.desc,
      color: { white: 0x6b7280, blue: 0x4a8fc9, gold: 0xd4a830 }[r.rarity] || 0x6b7280,
      _relic: r,
    }));

    if (!this.scene) return;

    import("../ui/overlays/SelectionOverlay.js").then(({ showSelectionOverlay }) => {
      showSelectionOverlay(this.scene, {
        title: "🎁 宝箱房 — 选择一件遗物",
        options,
        skipLabel: "跳过 → +20💰",
        onSelect: (key, opt) => {
          if (opt._relic && relicManager.hasFreeSlot()) {
            relicManager.equip(opt._relic);
          }
          this.advanceNode();
        },
        onSkip: () => {
          gameState.addGold(20);
          this.advanceNode();
        },
      });
    });
  }

  // ===== 酒馆 =====
  _openTavern(usedKeys = []) {
    const allOptions = [
      { key: "drink", label: "狂饮", subLabel: "恢复10点血量\n💰20", color: 0xcc6644, cost: 20 },
      { key: "forge", label: "打铁", subLabel: "基础护甲+1\n💰30", color: 0x6688cc, cost: 30 },
      { key: "shop2", label: "购物", subLabel: "随机获得一张帮助卡\n💰50", color: 0x88aa44, cost: 50 },
      { key: "leave", label: "离开", subLabel: "进入下一节点", color: 0x666666, cost: 0 },
    ];

    // 过滤掉已使用的选项（离开除外）
    const available = allOptions.filter((o) => o.key === "leave" || !usedKeys.includes(o.key));

    const options = available.map((o) => ({
      key: o.key,
      label: o.label,
      subLabel: o.subLabel,
      color: o.color,
      _cost: o.cost,
    }));

    if (!this.scene) return;

    import("../ui/overlays/SelectionOverlay.js").then(({ showSelectionOverlay }) => {
      showSelectionOverlay(this.scene, {
        title: `🍺 酒馆（余额: ${gameState.gold}💰）`,
        options,
        skipLabel: "",
        onSelect: (key, opt) => {
          if (key === "leave") {
            this.advanceNode();
            return;
          }
          const cost = opt._cost || 0;
          const newUsed = [...usedKeys, key];

          if (cost > 0 && !gameState.spendGold(cost)) {
            // 金币不足 → 弹提示后重新打开
            this._showToast(`金币不足！需要 ${cost}💰，当前 ${gameState.gold}💰`);
            this.scene?.time.delayedCall(800, () => this._openTavern(usedKeys));
            return;
          }

          switch (key) {
            case "drink": gameState.heal(10); console.log("[酒馆] 狂饮：+10HP，-20💰"); break;
            case "forge": gameState.baseArmor += 1; console.log("[酒馆] 打铁：护甲+1，-30💰"); break;
            case "shop2": {
              const pool = Object.values(HELP_CARDS);
              const card = { ...pool[Math.floor(Math.random() * pool.length)], type: "help", uid: `tavern_${Date.now()}` };
              this._addToPlayerDeck(card);
              console.log(`[酒馆] 购物：获得 ${card.name}，-50💰`);
              break;
            }
          }
          this.scene?.time.delayedCall(400, () => this._openTavern(newUsed));
        },
        onSkip: () => this.advanceNode(),
      });
    });
  }

  /** 显示导师卡三选一 */
  showMentorChoice() {
    if (!this.scene) return;
    // 排除已拥有的技能
    const skills = MENTOR_SKILLS
      .map((id) => getSkill(id))
      .filter((s) => s && !skillManager.hasSkill(s.id));

    if (skills.length === 0) {
      console.log("[导师卡] 已拥有全部可选技能");
      return;
    }

    const options = skills.map((s) => ({
      key: s.id,
      label: s.name,
      subLabel: s.desc || "",
      color: 0xd4a830,
      _skill: s,
    }));

    import("../ui/overlays/SelectionOverlay.js").then(({ showSelectionOverlay }) => {
      showSelectionOverlay(this.scene, {
        title: "📜 导师卡 — 选择永久技能",
        options,
        skipLabel: "",
        onSelect: (key, opt) => {
          if (opt._skill) {
            skillManager.addSkill(opt._skill);
            this.scene?.events.emit("skills-updated");
            console.log(`[导师卡] 习得技能: ${opt._skill.name}`);
          }
        },
        onSkip: () => {},
      });
    });
  }

  /** 简单 toast 提示 */
  _showToast(msg) {
    if (!this.scene) return;
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const bg = this.scene.add.rectangle(cx, cy + 80, 300, 40, 0x000000, 0.85)
      .setDepth(200).setStrokeStyle(1, 0xff4444);
    const txt = this.scene.add.text(cx, cy + 80, msg, {
      fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#ff6666",
    }).setOrigin(0.5).setDepth(201);
    this.scene.tweens.add({
      targets: [bg, txt], alpha: 0, y: cy + 60, duration: 600, delay: 1200,
      onComplete: () => { bg.destroy(); txt.destroy(); },
    });
  }

  // ============================================================
  // 节点推进
  // ============================================================

  advanceNode() {
    this._levelCleared = false;
    this._roomChosen = false;
    this._shopCards = null; // 清商店缓存

    if (this.currentNode >= 9) {
      // 进入下一层
      if (this.currentLayer >= 3) {
        console.log("[LevelManager] 🏆 游戏通关！3层27节点全部完成！");
        // 游戏胜利
        return;
      }
      this.currentLayer++;
      this.currentNode = 1;
      console.log(`[LevelManager] 进入第${this.currentLayer}层`);
    } else {
      this.currentNode++;
    }

    // 重置玩家位置 + 更新护甲
    gameState.currentArmor = gameState.getEffectiveBaseArmor();
    gameState.resetNodeState();

    console.log(`[LevelManager] → 第${this.currentLayer}层 第${this.currentNode}节点`);

    // 触发场景重建
    if (this.scene) {
      this.scene.events.emit("advance-node");
    }
  }

  // ============================================================
  // 重置
  // ============================================================

  reset() {
    this.currentLayer = 1;
    this.currentNode = 1;
    this.playerCards = [];
    this.cardLimit = 12;
    this._levelCleared = false;
    this._roomChosen = false;
  }
}

const levelManager = new LevelManager();
export default levelManager;
