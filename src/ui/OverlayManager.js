// ==================== 深入地牢 — 覆盖层管理器 ====================
// 所有模态覆盖层的创建、展示和销毁（帮助卡选择/商店/导师卡/宝箱/删卡/弹窗）

import { HELP_CARDS, RELICS, RELICS_BY_QUALITY } from "../data/GameData.js";
import { calcRelicBonuses, calcHardSkinBonus } from "../systems/CombatEngine.js";
import { GAME_W, GAME_H, COLOR, getGridCenter } from "../config/LayoutConfig.js";

/** 品质字符串→十六进制颜色值 */
const QUALITY_HEX = { 白: "0xbdc3c7", 蓝: "0x3498db", 金: "0xf5c86a", 红: "0xe74c3c" };

export class OverlayManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
  }

  // ==================== 覆盖层工具 ====================

  createOverlay(title) {
    const scene = this.scene;
    const bg = scene.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, COLOR.OVERLAY_BG, 0.85)
      .setOrigin(0.5).setDepth(90).setInteractive();
    const container = scene.add
      .text(GAME_W / 2, 30, title, {
        fontFamily: "serif", fontSize: "18px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 0).setDepth(91);
    return { bg, container };
  }

  destroyOverlay() {
    const scene = this.scene;
    if (scene.overlayObjects) {
      for (const obj of scene.overlayObjects) {
        if (obj && obj.active) obj.destroy();
      }
      scene.overlayObjects = null;
    }
  }

  destroyPopup() {
    const scene = this.scene;
    if (scene.popupObjects) {
      for (const obj of scene.popupObjects) {
        if (obj && obj.active) obj.destroy();
      }
      scene.popupObjects = null;
    }
  }

  showPopup(message) {
    this.destroyPopup();
    const scene = this.scene;
    const popupW = 360, popupH = 90;
    const bg = scene.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6)
      .setOrigin(0.5).setDepth(200).setInteractive();
    const box = scene.add
      .rectangle(GAME_W / 2, GAME_H / 2, popupW, popupH, 0x2a2020)
      .setOrigin(0.5).setStrokeStyle(2, 0xc0392b).setDepth(201).setInteractive();
    const text = scene.add
      .text(GAME_W / 2, GAME_H / 2, message, {
        fontFamily: "serif", fontSize: "14px", fontStyle: "bold",
        color: COLOR.TEXT_DANGER, align: "center",
        wordWrap: { width: popupW - 30 },
      }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

    const dismiss = () => this.destroyPopup();
    bg.on("pointerdown", dismiss);
    box.on("pointerdown", dismiss);
    text.on("pointerdown", dismiss);

    scene.popupObjects = [bg, box, text];
  }

  // ==================== 通用卡牌渲染 ====================

  createSelectionCard(x, y, def, onClick) {
    const scene = this.scene;
    const cardW = 160, cardH = 200;
    const qColor = parseInt(QUALITY_HEX[def.quality] || "0xbdc3c7");

    const cardBg = scene.add
      .rectangle(x, y, cardW, cardH, 0x252830)
      .setOrigin(0.5).setStrokeStyle(2, qColor)
      .setInteractive({ useHandCursor: true }).setDepth(92);

    const nameText = scene.add
      .text(x, y - cardH / 2 + 16, def.name, {
        fontFamily: "serif", fontSize: "14px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
      }).setOrigin(0.5, 0).setDepth(93);

    const qualText = scene.add
      .text(x, y - cardH / 2 + 36, `品质: ${def.quality}`, {
        fontFamily: "monospace", fontSize: "10px",
        color: COLOR.QUALITY_COLORS[def.quality],
      }).setOrigin(0.5, 0).setDepth(93);

    const descText = scene.add
      .text(x, y + 10, def.effectDesc, {
        fontFamily: "sans-serif", fontSize: "11px", color: COLOR.TEXT_PRIMARY,
        wordWrap: { width: cardW - 20 }, align: "center",
      }).setOrigin(0.5, 0).setDepth(93);

    const pickText = scene.add
      .text(x, y + cardH / 2 - 18, "👆 点击选择", {
        fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 1).setDepth(93);

    cardBg.on("pointerdown", onClick);
    cardBg.on("pointerover", () => cardBg.setStrokeStyle(3, qColor));
    cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, qColor));

    return [cardBg, nameText, qualText, descText, pickText];
  }

  createShopCard(x, y, card, mode, onClick) {
    const scene = this.scene;
    const cardW = 100, cardH = 110;
    const objs = [];
    const qColorStr = COLOR.QUALITY_COLORS[card.quality] || "#bdc3c7";
    const qColor = parseInt(QUALITY_HEX[card.quality] || "0xbdc3c7");

    const bg = scene.add
      .rectangle(x, y, cardW, cardH, mode === "buy" ? 0x252830 : 0x302020)
      .setOrigin(0.5).setStrokeStyle(1, qColor)
      .setInteractive({ useHandCursor: true }).setDepth(92);
    objs.push(bg);

    objs.push(scene.add.text(x, y - cardH / 2 + 10, card.name, {
      fontFamily: "serif", fontSize: "10px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
    }).setOrigin(0.5, 0).setDepth(93));

    objs.push(scene.add.text(x, y - cardH / 2 + 24, `[${card.quality}]`, {
      fontFamily: "monospace", fontSize: "8px", color: qColorStr,
    }).setOrigin(0.5, 0).setDepth(93));

    if (card.effectDesc) {
      objs.push(scene.add.text(x, y + 8, card.effectDesc, {
        fontFamily: "sans-serif", fontSize: "8px", color: COLOR.TEXT_DIM,
        wordWrap: { width: cardW - 12 }, align: "center",
      }).setOrigin(0.5, 0).setDepth(93));
    }

    const label = mode === "buy" ? "💰100 购买" : "🗑️ +20 删除";
    const labelColor = mode === "buy" ? COLOR.TEXT_GOLD : COLOR.TEXT_DANGER;
    objs.push(scene.add.text(x, y + cardH / 2 - 14, label, {
      fontFamily: "sans-serif", fontSize: "9px", color: labelColor,
    }).setOrigin(0.5, 1).setDepth(93));

    bg.on("pointerdown", onClick);
    bg.on("pointerover", () => bg.setStrokeStyle(2, qColor));
    bg.on("pointerout", () => bg.setStrokeStyle(1, qColor));

    return objs;
  }

  // ==================== 帮助卡选择 ====================

  /**
   * @param {string[]} choices - 卡 key 列表
   * @param {Function} onPick - (cardKey) => void
   * @param {Function} onSkip - () => void
   */
  showHelpCardSelection(choices, onPick, onSkip) {
    const scene = this.scene;
    const { bg, container } = this.createOverlay("🎴 选择一张帮助卡加入卡组");
    const startX = GAME_W / 2 - 180;
    const y = GAME_H / 2;

    const choiceCards = [];
    choices.forEach((cardKey, i) => {
      const def = HELP_CARDS[cardKey];
      const x = startX + i * 180;
      const card = this.createSelectionCard(x, y, def, () => onPick(cardKey, def));
      choiceCards.push(card);
    });

    // 跳过按钮
    const skipX = GAME_W / 2;
    const skipY = GAME_H / 2 + 130;
    const skipBg = scene.add
      .rectangle(skipX, skipY, 160, 32, 0x353535)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER)
      .setInteractive({ useHandCursor: true }).setDepth(92);
    const skipText = scene.add
      .text(skipX, skipY, "跳过 → +10💰", {
        fontFamily: "serif", fontSize: "13px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5).setDepth(93);
    skipBg.on("pointerdown", () => onSkip());
    skipBg.on("pointerover", () => skipBg.setFillStyle(0x4a4a4a));
    skipBg.on("pointerout", () => skipBg.setFillStyle(0x353535));
    choiceCards.push([skipBg, skipText]);

    scene.overlayObjects = [bg, container, ...choiceCards.flat()];
  }

  // ==================== 商店 ====================

  /**
   * @param {object} shopSession
   * @param {number} playerGold
   * @param {Function} onBuy - (offer) => void
   * @param {Function} onDelete - () => void
   * @param {Function} onLeave - () => void
   */
  showShop(shopSession, playerGold, onBuy, onDelete, onLeave) {
    this.destroyOverlay();
    const scene = this.scene;
    const { bg, container } = this.createOverlay(`🛒 商店 — 金币: ${playerGold}`);
    scene.overlayObjects = [bg, container];

    const startX = GAME_W / 2 - 280;
    const buyY = GAME_H / 2 - 50;

    // 购买区
    shopSession.offers.forEach((offer, i) => {
      const x = startX + i * 110;
      if (!offer || offer.sold) {
        const emptyBg = scene.add.rectangle(x, buyY, 100, 110, 0x15181b)
          .setOrigin(0.5).setStrokeStyle(1, 0x2a2a2a).setDepth(92);
        const emptyText = scene.add.text(x, buyY, offer ? "已售出" : "暂无候选", {
          fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_DIM,
        }).setOrigin(0.5).setDepth(93);
        scene.overlayObjects.push(emptyBg, emptyText);
      } else {
        const objs = this.createShopCard(x, buyY, offer.card, "buy", () => onBuy(offer));
        scene.overlayObjects.push(...objs);
      }
    });

    // 删卡按钮
    const delBtnX = GAME_W / 2 - 100;
    const delBtnY = buyY + 140;
    const delBtnBg = scene.add
      .rectangle(delBtnX, delBtnY, 180, 36, 0x302020)
      .setOrigin(0.5).setStrokeStyle(2, 0xc0392b)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const delBtnText = scene.add
      .text(delBtnX, delBtnY, "🗑️ 删除帮助卡 (+10💰)", {
        fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_DANGER,
      }).setOrigin(0.5).setDepth(101);
    delBtnBg.on("pointerdown", () => onDelete());
    delBtnBg.on("pointerover", () => delBtnBg.setFillStyle(0x4a3030));
    delBtnBg.on("pointerout", () => delBtnBg.setFillStyle(0x302020));
    scene.overlayObjects.push(delBtnBg, delBtnText);

    // 离开按钮
    const leaveX = GAME_W / 2 + 100;
    const leaveY = buyY + 140;
    const leaveBg = scene.add
      .rectangle(leaveX, leaveY, 180, 36, 0x4a3520)
      .setOrigin(0.5).setStrokeStyle(2, 0xf5c86a)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const leaveText = scene.add
      .text(leaveX, leaveY, "▶ 前往下一节点", {
        fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5).setDepth(101);
    leaveBg.on("pointerdown", () => onLeave());
    leaveBg.on("pointerover", () => leaveBg.setFillStyle(0x6a5530));
    leaveBg.on("pointerout", () => leaveBg.setFillStyle(0x4a3520));
    scene.overlayObjects.push(leaveBg, leaveText);
  }

  // ==================== 导师卡 ====================

  /**
   * @param {object[]} skills
   * @param {Function} onPick - (skill) => void
   */
  showMentorCard(skills, onPick) {
    this.destroyOverlay();
    const scene = this.scene;
    const { bg, container } = this.createOverlay("🎓 导师卡 — 选择一项技能永久习得");
    scene.overlayObjects = [bg, container];

    const choices = scene.shuffle(skills).slice(0, 3);
    const startX = GAME_W / 2 - 180;

    choices.forEach((skill, i) => {
      const x = startX + i * 180, y = GAME_H / 2;
      const cardW = 160, cardH = 180;

      const cardBg = scene.add
        .rectangle(x, y, cardW, cardH, 0x252830)
        .setOrigin(0.5).setStrokeStyle(2, 0x9b59b6)
        .setInteractive({ useHandCursor: true }).setDepth(92);

      const nameText = scene.add.text(x, y - cardH / 2 + 16, skill.name, {
        fontFamily: "serif", fontSize: "16px", fontStyle: "bold", color: "#9b59b6",
      }).setOrigin(0.5, 0).setDepth(93);

      const descText = scene.add.text(x, y + 10, skill.desc, {
        fontFamily: "sans-serif", fontSize: "11px", color: COLOR.TEXT_PRIMARY,
        wordWrap: { width: cardW - 20 }, align: "center",
      }).setOrigin(0.5, 0).setDepth(93);

      const pickText = scene.add.text(x, y + cardH / 2 - 18, "👆 选择", {
        fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 1).setDepth(93);

      cardBg.on("pointerdown", () => onPick(skill));
      cardBg.on("pointerover", () => cardBg.setStrokeStyle(3, 0x9b59b6));
      cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, 0x9b59b6));

      scene.overlayObjects.push(cardBg, nameText, descText, pickText);
    });
  }

  // ==================== 删卡界面 ====================

  /**
   * @param {object[]} allCards
   * @param {number} playerGold
   * @param {Function} onDelete - (card) => void
   * @param {Function} onBack - () => void
   */
  showDeleteScreen(allCards, playerGold, onDelete, onBack) {
    this.destroyOverlay();
    const scene = this.scene;
    const { bg, container } = this.createOverlay(`🗑️ 删除帮助卡 — 金币: ${playerGold}`);
    scene.overlayObjects = [bg, container];

    const cols = 4, cardW = 140, cardH = 120, gapX = 16, gapY = 16;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (GAME_W - totalW) / 2 + cardW / 2;
    const startY = 100;

    if (allCards.length === 0) {
      const emptyText = scene.add
        .text(GAME_W / 2, GAME_H / 2, "帮助卡组为空", {
          fontFamily: "serif", fontSize: "18px", color: COLOR.TEXT_DIM,
        }).setOrigin(0.5).setDepth(91);
      scene.overlayObjects.push(emptyText);
    } else {
      allCards.forEach((card, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        const qColor = parseInt(QUALITY_HEX[card.quality] || "0xbdc3c7");
        const cardBg = scene.add
          .rectangle(x, y, cardW, cardH, 0x252830)
          .setOrigin(0.5).setStrokeStyle(1, qColor).setDepth(92);
        const nameText = scene.add
          .text(x, y - cardH / 2 + 12, card.name, {
            fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
          }).setOrigin(0.5, 0).setDepth(93);
        const qualText = scene.add
          .text(x, y - cardH / 2 + 30, `[${card.quality}] ${card.effectDesc || ""}`, {
            fontFamily: "sans-serif", fontSize: "9px",
            color: COLOR.QUALITY_COLORS[card.quality] || COLOR.TEXT_DIM,
            wordWrap: { width: cardW - 16 }, align: "center",
          }).setOrigin(0.5, 0).setDepth(93);

        const delBg = scene.add
          .rectangle(x, y + cardH / 2 - 16, cardW - 20, 22, 0x4a2020)
          .setOrigin(0.5).setStrokeStyle(1, 0xc0392b)
          .setInteractive({ useHandCursor: true }).setDepth(93);
        const delLabel = scene.add
          .text(x, y + cardH / 2 - 16, "删除 +10💰", {
            fontFamily: "sans-serif", fontSize: "10px", fontStyle: "bold", color: COLOR.TEXT_DANGER,
          }).setOrigin(0.5).setDepth(94);

        delBg.on("pointerdown", () => onDelete(card));
        delBg.on("pointerover", () => delBg.setFillStyle(0x6a3030));
        delBg.on("pointerout", () => delBg.setFillStyle(0x4a2020));

        scene.overlayObjects.push(cardBg, nameText, qualText, delBg, delLabel);
      });
    }

    const backX = GAME_W / 2;
    const backY = GAME_H - 80;
    const backBg = scene.add
      .rectangle(backX, backY, 180, 36, 0x353535)
      .setOrigin(0.5).setStrokeStyle(2, COLOR.PANEL_BORDER)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    const backText = scene.add
      .text(backX, backY, "↩ 返回商店", {
        fontFamily: "serif", fontSize: "13px", color: COLOR.TEXT_PRIMARY,
      }).setOrigin(0.5).setDepth(101);
    backBg.on("pointerdown", () => onBack());
    backBg.on("pointerover", () => backBg.setFillStyle(0x454545));
    backBg.on("pointerout", () => backBg.setFillStyle(0x353535));
    scene.overlayObjects.push(backBg, backText);
  }

  // ==================== 宝箱选择 ====================

  /**
   * @param {string[]} relicKeys
   * @param {Function} onPick - (relicKey) => void
   * @param {Function} onSkip - () => void
   */
  showChestSelection(relicKeys, onPick, onSkip) {
    this.destroyOverlay();
    const scene = this.scene;
    const { bg, container } = this.createOverlay("📦 宝箱 — 三选一遗物");
    scene.overlayObjects = [bg, container];

    const startX = GAME_W / 2 - 180;

    relicKeys.forEach((relicKey, i) => {
      const relic = RELICS[relicKey];
      if (!relic) return;
      const x = startX + i * 180, y = GAME_H / 2;
      const cardW = 160, cardH = 180;
      const qColor = parseInt(QUALITY_HEX[relic.quality] || "0xbdc3c7");

      const cardBg = scene.add
        .rectangle(x, y, cardW, cardH, 0x252830)
        .setOrigin(0.5).setStrokeStyle(2, qColor)
        .setInteractive({ useHandCursor: true }).setDepth(92);

      const nameText = scene.add
        .text(x, y - cardH / 2 + 16, relic.name, {
          fontFamily: "serif", fontSize: "14px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
        }).setOrigin(0.5, 0).setDepth(93);

      const qualText = scene.add
        .text(x, y - cardH / 2 + 36, `[${relic.quality}] ${relic.effect}`, {
          fontFamily: "sans-serif", fontSize: "9px",
          color: COLOR.QUALITY_COLORS[relic.quality],
          wordWrap: { width: cardW - 20 }, align: "center",
        }).setOrigin(0.5, 0).setDepth(93);

      const pickText = scene.add
        .text(x, y + cardH / 2 - 18, "👆 选择", {
          fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_GOLD,
        }).setOrigin(0.5, 1).setDepth(93);

      cardBg.on("pointerdown", () => onPick(relicKey));
      cardBg.on("pointerover", () => cardBg.setStrokeStyle(3, qColor));
      cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, qColor));

      scene.overlayObjects.push(cardBg, nameText, qualText, pickText);
    });

    // 跳过按钮
    const skipX = GAME_W / 2;
    const skipY = GAME_H / 2 + 130;
    const skipBg = scene.add
      .rectangle(skipX, skipY, 160, 32, 0x353535)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER)
      .setInteractive({ useHandCursor: true }).setDepth(92);
    const skipText = scene.add
      .text(skipX, skipY, "跳过 → +20💰", {
        fontFamily: "serif", fontSize: "13px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5).setDepth(93);
    skipBg.on("pointerdown", () => onSkip());
    skipBg.on("pointerover", () => skipBg.setFillStyle(0x4a4a4a));
    skipBg.on("pointerout", () => skipBg.setFillStyle(0x353535));
    scene.overlayObjects.push(skipBg, skipText);
  }

  // ==================== 属性提升选择 ====================

  /**
   * @param {object[]} options - [{label, action}]
   */
  showAttributeBoost(options) {
    this.destroyOverlay();
    const scene = this.scene;
    const { bg, container } = this.createOverlay("📈 属性提升 — 选择一项");
    scene.overlayObjects = [bg, container];

    options.forEach((opt, i) => {
      const y = 160 + i * 70;
      const btnBg = scene.add
        .rectangle(GAME_W / 2, y, 300, 50, 0x252830)
        .setOrigin(0.5).setStrokeStyle(2, COLOR.PANEL_BORDER)
        .setInteractive({ useHandCursor: true }).setDepth(92);
      const btnText = scene.add
        .text(GAME_W / 2, y, opt.label, {
          fontFamily: "serif", fontSize: "14px", color: COLOR.TEXT_PRIMARY,
        }).setOrigin(0.5).setDepth(93);
      btnBg.on("pointerdown", () => {
        opt.action();
        this.destroyOverlay();
      });
      btnBg.on("pointerover", () => btnBg.setFillStyle(0x353840));
      btnBg.on("pointerout", () => btnBg.setFillStyle(0x252830));
      scene.overlayObjects.push(btnBg, btnText);
    });
  }

  // ==================== 通关提示 ====================

  showLayerComplete() {
    const scene = this.scene;
    const { bg, container } = this.createOverlay("🏆 第一层通关！");
    const text = scene.add
      .text(GAME_W / 2, GAME_H / 2, "恭喜！第一层 9 个节点已全部通过\n完整三层游戏将在阶段五实现", {
        fontFamily: "serif", fontSize: "18px", color: COLOR.TEXT_GOLD, align: "center",
      }).setOrigin(0.5).setDepth(100);
    scene.overlayObjects = [bg, container, text];
  }

  // ==================== 遗物选择生成 ====================

  /**
   * @param {object} probs - 品质概率
   * @param {string[]} equippedRelics - 已拥有遗物
   * @returns {string[]}
   */
  generateRelicChoices(probs, equippedRelics) {
    const owned = new Set(equippedRelics);
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
    while (choices.length < 3) {
      const all = Object.keys(RELICS).filter((k) => !owned.has(k) && RELICS[k].quality !== "初始");
      if (all.length === 0) break;
      const r = all[Math.floor(Math.random() * all.length)];
      if (!choices.includes(r)) choices.push(r);
    }
    return choices;
  }
}
