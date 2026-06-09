// ==================== 深入地牢 — 静态 UI 面板 ====================
// 玩家信息面板、装备栏、技能栏、牌组区的创建与更新

import { RELICS, getNodeConfig } from "../data/GameData.js";
import { calcRelicBonuses } from "../systems/CombatEngine.js";
import {
  GAME_W, GAME_H, ITEM_Y, ITEM_SLOT_H, COLOR,
} from "../config/LayoutConfig.js";

export class HUD {
  /**
   * @param {Phaser.Scene} scene — BattleScene 引用
   */
  constructor(scene) {
    this.scene = scene;
  }

  // ==================== 创建全部静态 UI ====================

  createAll() {
    this.createPlayerPanel();
    this.createEquipmentSlots();
    this.createSkillArea();
    this.createDeckArea();

    // 道具牌格标题
    this.scene.add.text(GAME_W / 2, ITEM_Y - ITEM_SLOT_H / 2 - 28, "🎒 道具牌格 (上限 5)", {
      fontFamily: "serif", fontSize: "12px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 1);
  }

  // ==================== 玩家信息面板 ====================

  createPlayerPanel() {
    const scene = this.scene;
    const piX = 10, piY = 10, piW = 180, piH = 230;
    scene.add.rectangle(piX + piW / 2, piY + piH / 2, piW, piH, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER);
    scene.add.text(piX + piW / 2, piY + 8, "👤 玩家信息", {
      fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0);
    const lineY = piY + 28;
    scene.add.line(piX + 8, lineY, 0, 0, piW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0);

    const infoX = piX + 14, infoStartY = lineY + 12, lineH = 20;
    const labels = ["姓名: ", "血量: ", "攻击: ", "防御: ", "金币: "];
    this.playerInfoLabels = [];
    labels.forEach((l, i) => {
      this.playerInfoLabels.push(scene.add.text(infoX, infoStartY + i * lineH, l, {
        fontFamily: "monospace", fontSize: "11px", color: COLOR.TEXT_DIM,
      }).setOrigin(0, 0));
    });
    this.playerInfoValues = new Array(labels.length).fill(null);

    const barX = piX + 14, barY = infoStartY + 5 * lineH + 4;
    const barW = piW - 28, barH = 12;
    this.playerHpBarBg = scene.add
      .rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x1a0000)
      .setOrigin(0.5).setStrokeStyle(1, 0x4a2020);
    this.playerHpBar = scene.add
      .rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x27ae60)
      .setOrigin(0.5);
    this.playerHpBarParams = { barX, barY, barW, barH };

    // 节点信息
    this.nodeInfoText = scene.add
      .text(piX + piW / 2, barY + barH + 10, "", {
        fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 0);
  }

  // ==================== 装备栏 ====================

  createEquipmentSlots() {
    const scene = this.scene;
    const cols = 4, rows = 3, totalSlots = cols * rows;
    const slotW = 40, slotH = 40, gap = 4;
    const totalW = cols * slotW + (cols - 1) * gap;
    const areaX = 10, areaY = 260, areaW = 190, areaH = 310;
    scene.add.rectangle(areaX + areaW / 2, areaY + areaH / 2, areaW, areaH, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER);
    scene.add.text(areaX + areaW / 2, areaY + 8, "⚙ 装备栏 (12格)", {
      fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0);
    const lineY = areaY + 26;
    scene.add.line(areaX + 8, lineY, 0, 0, areaW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0);
    const startX = areaX + (areaW - totalW) / 2;
    const startY = lineY + 10;

    this.equipSlotObjs = [];
    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = startX + col * (slotW + gap) + slotW / 2;
      const y = startY + row * (slotH + gap) + slotH / 2;
      const bg = scene.add.rectangle(x, y, slotW, slotH, COLOR.SLOT_EMPTY)
        .setOrigin(0.5).setStrokeStyle(1, COLOR.SLOT_BORDER);
      const txt = scene.add.text(x, y, "", { fontSize: "16px" }).setOrigin(0.5);
      bg.setInteractive();
      bg.on("pointerdown", (pointer) => {
        if (pointer.rightButtonDown() && i < scene.equippedRelics.length) {
          const removed = scene.equippedRelics.splice(i, 1)[0];
          scene.playerState.gold += 20;
          scene.setLog(`🗑️ 丢弃遗物「${RELICS[removed]?.name || removed}」+20💰`);
          scene.relicBonuses = calcRelicBonuses(scene.equippedRelics, scene.currentNode, scene.totalKilledThisNode);
          this.updateEquipmentUI();
          this.updatePlayerUI();
        }
      });
      bg.on("pointerover", () => {
        if (i < scene.equippedRelics.length) {
          const r = RELICS[scene.equippedRelics[i]];
          bg.setStrokeStyle(2, 0xf5c86a);
          if (r) txt.setText(r.name.slice(0, 3));
        }
      });
      bg.on("pointerout", () => {
        if (i < scene.equippedRelics.length) {
          bg.setStrokeStyle(1, COLOR.SLOT_BORDER);
          txt.setText("🗡️");
        }
      });
      this.equipSlotObjs.push({ bg, txt });
    }
  }

  // ==================== 技能栏 ====================

  createSkillArea() {
    const scene = this.scene;
    const x = 770, areaW = 180;
    scene.add.rectangle(x + areaW / 2, GAME_H - 155, areaW, 290, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER);
    scene.add.text(x + areaW / 2, GAME_H - 300, "📜 技能栏", {
      fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0);
    const lineY = GAME_H - 282;
    scene.add.line(x + 8, lineY, 0, 0, areaW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0);
    this.skillText = scene.add.text(x + areaW / 2, GAME_H - 260, "暂无技能", {
      fontFamily: "sans-serif", fontSize: "11px", color: COLOR.TEXT_DIM, align: "center",
      wordWrap: { width: areaW - 10 },
    }).setOrigin(0.5, 0);
  }

  // ==================== 牌组区 ====================

  createDeckArea() {
    const scene = this.scene;
    const x = 770, y = 10, areaW = 180, areaH = 230;
    scene.add.rectangle(x + areaW / 2, y + areaH / 2, areaW, areaH, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, COLOR.PANEL_BORDER);
    scene.add.text(x + areaW / 2, y + 8, "🂠 牌组区", {
      fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0);
    const lineY = y + 26;
    scene.add.line(x + 8, lineY, 0, 0, areaW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0);

    scene.add.text(x + areaW / 2, lineY + 12, "下一张抽牌", {
      fontFamily: "sans-serif", fontSize: "10px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 0);

    this.deckPreviewX = x + areaW / 2;
    this.deckPreviewY = lineY + 78;

    this.deckPreviewBg = scene.add
      .rectangle(this.deckPreviewX, this.deckPreviewY, 70, 90, 0x2d3035)
      .setOrigin(0.5).setStrokeStyle(2, COLOR.PANEL_BORDER).setDepth(1);

    this.deckPreviewType = scene.add
      .text(this.deckPreviewX, this.deckPreviewY - 30, "空", {
        fontFamily: "sans-serif", fontSize: "11px", color: COLOR.TEXT_DIM,
      }).setOrigin(0.5).setDepth(2);

    this.deckPreviewName = scene.add
      .text(this.deckPreviewX, this.deckPreviewY - 10, "", {
        fontFamily: "serif", fontSize: "12px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
      }).setOrigin(0.5).setDepth(2);

    this.deckPreviewStat = scene.add
      .text(this.deckPreviewX, this.deckPreviewY + 18, "", {
        fontFamily: "monospace", fontSize: "9px", color: COLOR.TEXT_DIM,
      }).setOrigin(0.5).setDepth(2);

    this.deckCountText = scene.add.text(x + areaW / 2, lineY + 138, "战斗卡组: 0 张", {
      fontFamily: "monospace", fontSize: "10px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 0);

    this.deckHelpCountText = scene.add.text(x + areaW / 2, lineY + 158, "", {
      fontFamily: "monospace", fontSize: "9px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 0);
  }

  // ==================== UI 更新 ====================

  updateAll() {
    this.updatePlayerUI();
    this.updateNodeUI();
    this.updateDeckUI();
    this.updateEquipmentUI();
    this.updateSkillUI();
  }

  updateSkillUI() {
    const scene = this.scene;
    if (!this.skillText) return;
    if (scene.learnedSkills.length > 0) {
      this.skillText.setText("技能:\n" + scene.learnedSkills.join("\n"));
      this.skillText.setColor("#9b59b6");
    } else {
      this.skillText.setText("暂无技能\n（击败精英后获取）");
      this.skillText.setColor(COLOR.TEXT_DIM);
    }
  }

  updatePlayerUI() {
    const scene = this.scene;
    const p = scene.playerState;
    const eff = scene.getEffectiveStats();
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
      this.playerInfoValues[i] = scene.add.text(infoX + 48, infoStartY + i * lineH, v.text, {
        fontFamily: "monospace", fontSize: "11px", fontStyle: "bold", color: v.color,
      }).setOrigin(0, 0);
    });

    // 血条
    const { barX, barY, barW, barH } = this.playerHpBarParams;
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    if (this.playerHpBar && this.playerHpBar.active) this.playerHpBar.destroy();
    let barColor = hpRatio > 0.5 ? 0x27ae60 : hpRatio > 0.25 ? 0xe67e22 : 0xc0392b;
    this.playerHpBar = scene.add
      .rectangle(barX + (barW * hpRatio) / 2, barY + barH / 2, barW * hpRatio, barH, barColor)
      .setOrigin(0.5);
  }

  updateNodeUI() {
    const scene = this.scene;
    const ec = getNodeConfig(scene.currentNode);
    const isElite = ec.isElite, isBoss = ec.isBoss;
    let info = `第${scene.currentLayer}层 · 节点${scene.currentNode}/9`;
    if (isElite) info += " ⚡精英";
    if (isBoss) info += " 👑层主";
    this.nodeInfoText.setText(info);
  }

  updateDeckUI() {
    const scene = this.scene;
    const battleDeck = scene.battleDeck;
    const helpDeck = scene.helpDeck;

    this.deckCountText.setText(`战斗卡组: ${battleDeck.length} 张`);

    const uniqueKeys = new Set(helpDeck.map((c) => c.key));
    this.deckHelpCountText.setText(`帮助卡组: ${uniqueKeys.size} 种 ${helpDeck.length} 张`);

    if (battleDeck.length > 0) {
      const nextCard = battleDeck[battleDeck.length - 1];

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
      this.deckPreviewBg.setFillStyle(0x1a1c20);
      this.deckPreviewBg.setStrokeStyle(1, COLOR.PANEL_BORDER);
      this.deckPreviewType.setText("牌组已空");
      this.deckPreviewType.setColor(COLOR.TEXT_DIM);
      this.deckPreviewName.setText("");
      this.deckPreviewStat.setText("");
    }
  }

  updateEquipmentUI() {
    const scene = this.scene;
    if (!this.equipSlotObjs) return;
    this.equipSlotObjs.forEach((slot, i) => {
      if (i < scene.equippedRelics.length) {
        const r = RELICS[scene.equippedRelics[i]];
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
}
