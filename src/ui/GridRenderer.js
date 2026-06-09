// ==================== 深入地牢 — 九宫格与卡牌渲染器 ====================
// 纯渲染层：负责九宫格、卡牌显示、道具牌格、通关按钮、视觉特效
// 通过 scene 引用访问游戏状态

import {
  GAME_W, GAME_H, CELL_W, CELL_H, CELL_GAP,
  GRID_LEFT, GRID_TOP, GRID_TOTAL_W, GRID_TOTAL_H,
  ITEM_SLOT_COUNT, ITEM_SLOT_W, ITEM_SLOT_H,
  COLOR, getGridCenter, getItemSlotCenter,
} from "../config/LayoutConfig.js";
import {
  calcInspireBonus, calcRevengeBonus,
  calcSpadeYoungBonus, calcHeartYoungBonus,
  calcDiamondYoungBonus, calcClubYoungBonus,
  calcProtectAuraBonus,
} from "../systems/CombatEngine.js";

export class GridRenderer {
  /**
   * @param {Phaser.Scene} scene — BattleScene 引用
   */
  constructor(scene) {
    this.scene = scene;
  }

  // ==================== 九宫格渲染 ====================

  createGrid() {
    const scene = this.scene;
    scene.gridCells = {};

    const gridBgX = GRID_LEFT - 12, gridBgY = GRID_TOP - 12;
    const gridBgW = GRID_TOTAL_W + 24, gridBgH = GRID_TOTAL_H + 24;
    const gridBg = scene.add
      .rectangle(gridBgX + gridBgW / 2, gridBgY + gridBgH / 2, gridBgW, gridBgH, 0x1e2025)
      .setOrigin(0.5).setStrokeStyle(1, 0x3a3d44).setInteractive({ useHandCursor: false });

    gridBg.on("pointerdown", () => {
      if (scene.isBattleInputLocked()) return;
      if (scene.targeting) scene.exitTargeting(false);
    });

    scene.add.text(gridBgX + gridBgW / 2, gridBgY - 16, "⚔ 作战场地 ⚔", {
      fontFamily: "serif", fontSize: "14px", color: COLOR.TEXT_DIM,
    }).setOrigin(0.5, 1);

    for (let i = 1; i <= 9; i++) {
      const { x, y } = getGridCenter(i);
      const isPlayerCell = i === 5;
      const fc = isPlayerCell ? COLOR.GRID_PLAYER : COLOR.GRID_NORMAL;
      const bc = isPlayerCell ? COLOR.GRID_PLAYER_BORDER : COLOR.GRID_NORMAL_BORDER;

      const cell = scene.add.rectangle(x, y, CELL_W, CELL_H, fc)
        .setOrigin(0.5).setStrokeStyle(1, bc);
      const label = scene.add.text(x - CELL_W / 2 + 4, y - CELL_H / 2 + 2, `${i}`, {
        fontFamily: "monospace", fontSize: "10px",
        color: isPlayerCell ? COLOR.TEXT_GOLD : COLOR.TEXT_DIM,
      });
      scene.gridCells[i] = { rect: cell, label, x, y, isPlayerCell };

      // 空格子可点击：有卡牌在上层时卡牌拦截点击，无卡时格子响应
      if (!isPlayerCell) {
        cell.setInteractive({ useHandCursor: true });
        cell.on("pointerdown", () => {
          // 仅当该格无卡牌时才作为空格点击处理
          if (!scene.boardCards.has(i)) {
            scene.handleEmptyCellClick(i);
          }
        });
      }
    }
  }

  setGridHighlight(gridNum, on) {
    const cell = this.scene.gridCells[gridNum];
    if (!cell || cell.isPlayerCell) return;
    cell.rect.setFillStyle(on ? COLOR.GRID_TARGET : COLOR.GRID_NORMAL);
    cell.rect.setStrokeStyle(on ? 2 : 1, on ? COLOR.GRID_TARGET_BORDER : COLOR.GRID_NORMAL_BORDER);
  }

  // ==================== 通关按钮 ====================

  showPassButton() {
    this.hidePassButton();
    const scene = this.scene;
    const btnX = GRID_LEFT + GRID_TOTAL_W / 2;
    const btnY = GRID_TOP + GRID_TOTAL_H + 24;

    const btnBg = scene.add
      .rectangle(btnX, btnY, 140, 32, 0x2a5a1a)
      .setOrigin(0.5).setStrokeStyle(2, 0x4ae04a)
      .setInteractive({ useHandCursor: true }).setDepth(20);

    const btnText = scene.add
      .text(btnX, btnY, "🏆 通 关", {
        fontFamily: "serif", fontSize: "16px", fontStyle: "bold", color: "#4ae04a",
      }).setOrigin(0.5).setDepth(21);

    btnBg.on("pointerdown", () => scene.completeNode());
    btnBg.on("pointerover", () => btnBg.setFillStyle(0x3a7a2a));
    btnBg.on("pointerout", () => btnBg.setFillStyle(0x2a5a1a));

    scene.passButton = { bg: btnBg, text: btnText };
    scene.setLog("🎉 所有怪物已清除！点击「通关」进入奖励环节");
  }

  hidePassButton() {
    const pb = this.scene.passButton;
    if (pb) {
      pb.bg.destroy();
      pb.text.destroy();
      this.scene.passButton = null;
    }
  }

  // ==================== 卡牌显示 ====================

  renderCard(gridNum) {
    const scene = this.scene;
    const card = scene.boardCards.get(gridNum);
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

    const bg = scene.add
      .rectangle(x, y, cardW, cardH, fillColor)
      .setOrigin(0.5).setStrokeStyle(2, borderColor).setDepth(1);

    // 名称
    const displayName = card.type === "player" ? scene.playerState.name : card.data.name;
    let namePrefix = "";
    if (card.isElite) namePrefix = "💀";
    else if (card.isBoss) namePrefix = "👑";
    texts.push(scene.add.text(x, y - cardH / 2 + 12, namePrefix + displayName, {
      fontFamily: "serif", fontSize: "13px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
    }).setOrigin(0.5, 0).setDepth(2));

    // 属性
    if (card.type === "player") {
      const p = scene.playerState;
      const eff = scene.getEffectiveStats();
      const stats = [
        `♥ ${p.hp}/${p.maxHp}${p.shieldActive ? "🛡️" : ""}`,
        `⚔ ${eff.atk}${p.isViolenceActive ? "💪" : ""}`,
        `🛡 ${eff.def}`,
      ];
      stats.forEach((s, i) => {
        texts.push(scene.add.text(x, y - 3 + i * 15, s, {
          fontFamily: "monospace", fontSize: "10px",
          color: [COLOR.TEXT_DANGER, COLOR.TEXT_DAMAGE, "#3498db"][i],
        }).setOrigin(0.5, 0).setDepth(2));
      });
    } else if (card.type === "monster") {
      const m = card.data;
      const inspireBonus = calcInspireBonus(scene.boardCards, gridNum);
      const revengeBonus = calcRevengeBonus(m, scene.totalKilledThisNode);
      const spadeYoungBonus = calcSpadeYoungBonus(scene.boardCards, gridNum);
      const clubYoungBonus = calcClubYoungBonus(m, gridNum);
      const diamondYoungBonus = calcDiamondYoungBonus(m, gridNum);
      const heartYoungBonus = calcHeartYoungBonus(m, gridNum);
      const protectAuraBonus = calcProtectAuraBonus(scene.boardCards, gridNum);
      const danceAtk = m._danceAtk || 0;
      const danceDef = m._danceDef || 0;
      const royalAtk = m._royalAtk || 0;
      const effAtk = m.attack + inspireBonus + revengeBonus + spadeYoungBonus + clubYoungBonus + danceAtk + royalAtk;
      const effDef = m.defense + diamondYoungBonus + protectAuraBonus + danceDef;
      const effHpBonus = heartYoungBonus;
      const stats = [
        `♥ ${m.hp}/${(m.maxHp || m.hp) + effHpBonus}${m._hasBlessing ? "🛡" : ""}`,
        `⚔ ${effAtk}${inspireBonus > 0 ? "📯" : ""}${revengeBonus > 0 ? "💢" : ""}${spadeYoungBonus > 0 ? "♠" : ""}${clubYoungBonus > 0 ? "♣" : ""}${danceAtk > 0 ? "💃" : ""}${royalAtk > 0 ? "👑" : ""}`,
        `🛡 ${effDef}${diamondYoungBonus > 0 ? "♦" : ""}${protectAuraBonus > 0 ? "🛡" : ""}${danceDef > 0 ? "💃" : ""}`,
      ];
      if (m.traits && m.traits.length > 0) { stats.push(`词条: ${m.traits.join(",")}`); }
      if (m.level) stats.push(`Lv.${m.level}`);
      stats.forEach((s, i) => {
        texts.push(scene.add.text(x, y - 3 + i * 15, s, {
          fontFamily: "monospace", fontSize: "10px",
          color: [COLOR.TEXT_DANGER, COLOR.TEXT_DAMAGE, "#3498db", "#9b59b6", COLOR.TEXT_DIM][i] || COLOR.TEXT_PRIMARY,
        }).setOrigin(0.5, 0).setDepth(2));
      });
    } else if (card.type === "help") {
      const h = card.data;
      const qColor = COLOR.QUALITY_COLORS[h.quality] || "#bdc3c7";
      texts.push(scene.add.text(x, y - 3, `品质: ${h.quality}`, {
        fontFamily: "monospace", fontSize: "10px", color: qColor,
      }).setOrigin(0.5, 0).setDepth(2));
      texts.push(scene.add.text(x, y + cardH / 2 - 24, h.effectDesc, {
        fontFamily: "sans-serif", fontSize: "9px", color: COLOR.TEXT_DIM,
        wordWrap: { width: cardW - 12 }, align: "center",
      }).setOrigin(0.5, 1).setDepth(2));
    }

    // 类型图标
    const iconMap = { player: "👤", monster: "👹", help: "✨" };
    texts.push(scene.add.text(x + cardW / 2 - 14, y - cardH / 2 + 2, iconMap[card.type], {
      fontFamily: "monospace", fontSize: "9px",
    }).setOrigin(1, 0).setDepth(2));

    // 交互
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => scene.handleGridClick(gridNum, card));
    bg.on("pointerover", () => {
      if (scene.targeting && card.type === "monster") bg.setStrokeStyle(3, COLOR.GRID_TARGET_BORDER);
      else bg.setStrokeStyle(3, borderColor);
      // 怪物卡悬停时显示技能详细描述
      if (card.type === "monster" && scene.hud) {
        scene.hud.showMonsterTooltip(card.data);
      }
    });
    bg.on("pointerout", () => {
      bg.setStrokeStyle(2, borderColor);
      if (card.type === "monster" && scene.hud) {
        scene.hud.hideTooltip();
      }
    });

    scene.cardDisplays.set(gridNum, { bg, texts, type: card.type });
  }

  destroyCardDisplay(gridNum) {
    const d = this.scene.cardDisplays.get(gridNum);
    if (d) {
      d.bg.destroy();
      d.texts.forEach((t) => t.destroy());
      this.scene.cardDisplays.delete(gridNum);
    }
  }

  refreshCardTexts(gridNum) {
    this.destroyCardDisplay(gridNum);
    this.renderCard(gridNum);
  }

  renderAllCards() {
    for (const [gn] of this.scene.boardCards) this.renderCard(gn);
  }

  // ==================== 道具牌格 ====================

  renderItemSlot(index) {
    this._clearItemSlotDisplay(index);
    const scene = this.scene;
    const item = scene.itemSlots[index];
    const { x, y } = getItemSlotCenter(index);
    const objs = [];

    let fill = COLOR.SLOT_EMPTY, border = COLOR.SLOT_BORDER;
    if (item) {
      fill = COLOR.SLOT_FILLED; border = COLOR.SLOT_FILLED_BORDER;
      objs.push(scene.add.text(x, y - ITEM_SLOT_H / 2 + 8, item.data.name, {
        fontFamily: "serif", fontSize: "11px", fontStyle: "bold", color: COLOR.TEXT_PRIMARY,
      }).setOrigin(0.5, 0).setDepth(2));
      objs.push(scene.add.text(x, y + ITEM_SLOT_H / 2 - 18, item.data.effectDesc, {
        fontFamily: "sans-serif", fontSize: "8px", color: COLOR.TEXT_DIM,
        wordWrap: { width: ITEM_SLOT_W - 10 }, align: "center",
      }).setOrigin(0.5, 1).setDepth(2));
      objs.push(scene.add.text(x, y + ITEM_SLOT_H / 2 - 6, "点击使用", {
        fontFamily: "sans-serif", fontSize: "7px", color: COLOR.TEXT_GOLD,
      }).setOrigin(0.5, 1).setDepth(2));
    } else {
      objs.push(scene.add.text(x, y + ITEM_SLOT_H / 2 - 12, `${index + 1}`, {
        fontFamily: "monospace", fontSize: "9px", color: COLOR.TEXT_DIM,
      }).setOrigin(0.5).setDepth(2));
    }

    const slotBg = scene.add
      .rectangle(x, y, ITEM_SLOT_W, ITEM_SLOT_H, fill)
      .setOrigin(0.5).setStrokeStyle(item ? 2 : 1, border).setDepth(1);
    slotBg.setInteractive({ useHandCursor: item != null });
    slotBg.on("pointerdown", () => {
      if (scene.itemSlots[index]) scene.handleItemSlotClick(index);
    });
    slotBg.on("pointerover", () => {
      if (scene.itemSlots[index]) slotBg.setStrokeStyle(3, COLOR.TEXT_GOLD);
    });
    slotBg.on("pointerout", () => {
      slotBg.setStrokeStyle(item ? 2 : 1, border);
    });

    objs.unshift(slotBg);
    scene.itemSlotDisplays[index] = objs;
  }

  _clearItemSlotDisplay(index) {
    const d = this.scene.itemSlotDisplays[index];
    if (d) { d.forEach((o) => o.destroy()); this.scene.itemSlotDisplays[index] = null; }
  }

  renderAllItemSlots() {
    for (let i = 0; i < ITEM_SLOT_COUNT; i++) this.renderItemSlot(i);
  }

  // ==================== 视觉特效 ====================

  flashCard(gridNum, color) {
    const d = this.scene.cardDisplays.get(gridNum);
    if (!d) return;
    const orig = d.bg.fillColor;
    d.bg.setFillStyle(color);
    this.scene.time.delayedCall(150, () => {
      if (d.bg && d.bg.active) d.bg.setFillStyle(orig);
    });
  }

  showFloatingText(x, y, text, color) {
    const ft = this.scene.add.text(x, y, text, {
      fontFamily: "monospace", fontSize: "14px", fontStyle: "bold",
      color, stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);
    this.scene.tweens.add({
      targets: ft, y: y - 30, alpha: 0, duration: 800, ease: "Power2",
      onComplete: () => ft.destroy(),
    });
  }
}
