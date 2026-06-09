// ==================== 深入地牢 — 静态 UI 面板 ====================
// 玩家信息面板、装备栏、技能栏、牌组区的创建与更新

import { RELICS, getNodeConfig, HELP_DECK_CAPACITY } from "../data/GameData.js";
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
    this.createTooltipPanel();

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

    const cap = HELP_DECK_CAPACITY[scene.currentLayer] || 12;
    const uniqueKeys = new Set(helpDeck.map((c) => c.key));
    this.deckHelpCountText.setText(`帮助卡组: ${uniqueKeys.size}种 ${helpDeck.length}/${cap} 张`);

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

  // ==================== 怪物技能提示面板 ====================

  /** 在牌组区和技能栏之间的空白区域创建提示面板 */
  createTooltipPanel() {
    const scene = this.scene;
    const x = 770, areaW = 180;
    // 牌组区底部 ~240，技能区顶部 ~485，面板放在中间
    const panelY = 360, panelH = 230;
    this._tooltipBg = scene.add.rectangle(x + areaW / 2, panelY, areaW, panelH, COLOR.PANEL_BG)
      .setOrigin(0.5).setStrokeStyle(1, 0xf5c86a).setDepth(5).setVisible(false);
    this._tooltipTitle = scene.add.text(x + areaW / 2, panelY - panelH / 2 + 8, "", {
      fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_GOLD,
    }).setOrigin(0.5, 0).setDepth(6).setVisible(false);
    scene.add.line(x + 8, panelY - panelH / 2 + 26, 0, 0, areaW - 16, 0, COLOR.PANEL_BORDER).setOrigin(0).setDepth(6).setVisible(false);
    this._tooltipTexts = [];
  }

  /** 显示怪物技能详细描述 */
  showMonsterTooltip(cardData) {
    if (!cardData || !cardData.traits || cardData.traits.length === 0) return;
    this.hideTooltip();
    const scene = this.scene;
    const x = 770, areaW = 180;
    const panelY = 360, panelH = 230;
    const startY = panelY - panelH / 2 + 34;

    this._tooltipBg.setVisible(true);
    this._tooltipTitle.setText(`📋 ${cardData.name} 技能`).setVisible(true);

    const lines = [];
    for (const trait of cardData.traits) {
      const desc = SKILL_DESC[trait];
      if (desc) {
        lines.push({ text: `▪ ${trait}`, color: "#f5c86a", style: { fontFamily: "serif", fontSize: "11px", fontStyle: "bold" } });
        // 描述文字自动换行
        lines.push({ text: desc, color: COLOR.TEXT_PRIMARY, style: { fontFamily: "sans-serif", fontSize: "9px" } });
      }
    }
    // 额外显示动态加成
    if (cardData._danceAtk || cardData._danceDef) {
      lines.push({ text: `💃 战舞: 攻+${cardData._danceAtk||0} 防+${cardData._danceDef||0}`, color: "#e67e22", style: { fontFamily: "sans-serif", fontSize: "9px" } });
    }
    if (cardData._royalAtk) {
      lines.push({ text: `👑 皇室: 攻+${cardData._royalAtk}`, color: "#f5c86a", style: { fontFamily: "sans-serif", fontSize: "9px" } });
    }
    if (cardData._hasBlessing) {
      lines.push({ text: "🛡 庇佑: 下次受伤变为0", color: "#3498db", style: { fontFamily: "sans-serif", fontSize: "9px" } });
    }
    if (cardData._duelActive) {
      lines.push({ text: "⚔ 决斗: 已激活", color: "#e74c3c", style: { fontFamily: "sans-serif", fontSize: "9px" } });
    }

    let y = startY;
    for (const line of lines) {
      const t = scene.add.text(x + areaW / 2, y, line.text, {
        ...line.style, color: line.color,
        wordWrap: { width: areaW - 16 }, align: "left",
      }).setOrigin(0.5, 0).setDepth(6);
      this._tooltipTexts.push(t);
      y += t.height + 3;
    }
  }

  /** 隐藏技能提示 */
  hideTooltip() {
    if (this._tooltipBg) this._tooltipBg.setVisible(false);
    if (this._tooltipTitle) this._tooltipTitle.setVisible(false);
    if (this._tooltipTexts) {
      for (const t of this._tooltipTexts) { if (t && t.active) t.destroy(); }
      this._tooltipTexts = [];
    }
  }
}

// ==================== 技能描述映射表 ====================

const SKILL_DESC = {
  // 新怪物词条
  "黑桃幼崽": "处于格1/2/3时，场上所有其他怪物攻击+2（不可叠加）",
  "红桃幼崽": "处于格7/8/9时，本牌血量上限+2",
  "方块幼崽": "处于格4时，本牌防御+2",
  "梅花幼崽": "处于格6时，本牌攻击力+2",
  "尖盾": "处于格1/2/3时，每次战斗对玩家额外造成2点伤害（无视防御）",
  "爱之躯": "每次战斗时恢复2点血量",
  "破防专家": "处于格1/4/7时，战斗后玩家防御-2",
  "叫人！": "玩家每行动3次，将一张等级2怪物加入战斗牌组",
  "复仇": "在九宫格上时，每有一张怪物卡被移除，本牌攻击力+4",
  "医疗兵": "处于格7/8/9时，玩家每行动一次恢复全体怪物4血",
  "防护光环": "处于格1/4/7时，其他怪物防御+2",
  "不休追击": "移动到玩家正交相邻格时，自动与玩家战斗一次",
  "侧方打击": "移动到格1/3/7/9时，对玩家造成3点伤害（无视防御）",
  "红桃之母": "累计损失满10血触发，召唤随机红桃怪物加入战斗牌组",
  "牢不可破": "移动到格1/3/7/9时，场上随机怪物获得庇佑",
  "竖向拉杆": "移动到格7时竖列1-4-7轮换；移动到格3时竖列3-6-9轮换",
  "决斗": "与玩家战斗后锁定棋盘，禁止所有卡牌移动",
  "战舞": "棋盘每旋转1次，本牌攻击+1或防御+1（交替）",
  "暴力": "棋盘每旋转4次，若处于正交相邻格则与玩家战斗一次",
  "黑桃皇室": "棋盘每旋转4次，所有黑桃怪物攻击+1",
  "先攻": "怪物先手攻击（双方均有先攻时玩家优先）",
  // 旧词条（保留）
  "鼓舞": "场上所有其他怪物攻击+1，多个鼓舞可叠加",
  "好战": "玩家每点击3次，本牌与玩家战斗一次",
  "伏击": "玩家点击本怪相邻格时，本怪与玩家战斗一次",
  "破甲": "每次战斗后玩家防御-1（节点结束恢复）",
  "散子": "累计损失满10血触发，召唤骷髅加入战斗牌组",
  "紧握": "玩家在相邻格时只能选择本牌作为战斗目标",
};
