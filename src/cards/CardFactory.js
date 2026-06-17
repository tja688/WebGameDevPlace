import Phaser from "phaser";
import { COLORS, FONTS, GRID, DEPTH } from "../config/GameConfig.js";
import { CRT_THEME } from "../style/crtTheme.js";

// ============================================================
// CardFactory — 卡牌工厂
// 在九宫格上生成怪物卡/帮助卡的视觉对象（Container）
// ============================================================

/**
 * 创建怪物卡视觉对象
 * @param {Phaser.Scene} scene
 * @param {Object} cardData — { id, name, hp, atk, armor, type, uid }
 * @param {number} x — 像素坐标 X
 * @param {number} y — 像素坐标 Y
 * @returns {Phaser.GameObjects.Container}
 */
export function createMonsterCard(scene, cardData, x, y) {
  const { CELL_WIDTH, CELL_HEIGHT } = GRID;
  const style = getMonsterStyle(cardData);

  // 容器
  const container = scene.add.container(x, y);
  container.cardData = cardData;
  container.setSize(CELL_WIDTH, CELL_HEIGHT);
  container.setDepth(DEPTH.CARDS);

  // 背景贴图 — 作为可点击的交互区
  const bg = scene.add.image(0, 0, style.bgKey).setOrigin(0.5);
  bg.setInteractive(
    new Phaser.Geom.Rectangle(-CELL_WIDTH / 2, -CELL_HEIGHT / 2, CELL_WIDTH, CELL_HEIGHT),
    Phaser.Geom.Rectangle.Contains
  );
  container.add(bg);
  bg._cardContainer = container; // 直接引用：bg → container（替换不可靠的 parentContainer 遍历）

  // 名签条（顶部）
  const isEliteOrBoss = cardData.isElite || cardData.isBoss;
  const nameBarColor = isEliteOrBoss ? (cardData.isBoss ? COLORS.HELP_GOLD : COLORS.HELP_RED) : COLORS.BG_DARK;
  const nameBarAlpha = isEliteOrBoss ? 0.7 : 0.5;
  const nameBar = scene.add
    .rectangle(0, -CELL_HEIGHT / 2 + 11, CELL_WIDTH - 4, 18, nameBarColor, nameBarAlpha)
    .setOrigin(0.5);
  container.add(nameBar);

  // 精英/层主标签
  const tag = cardData.isBoss ? "BOSS " : cardData.isElite ? "ELT " : "MOB ";
  const displayName = `${tag}${cardData.name}`;

  // 名称文字
  const nameText = scene.add
    .text(0, -CELL_HEIGHT / 2 + 11, displayName, {
      fontFamily: FONTS.FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: COLORS.TEXT_ACCENT,
      shadow: { offsetX: 0, offsetY: 0, color: CRT_THEME.palette.amberLow, blur: 4, fill: true },
    })
    .setOrigin(0.5);
  container.add(nameText);

  // 技能名
  const skillLabel = scene.add
    .text(0, -CELL_HEIGHT / 2 + 26, cardData.skill ? cardData.skill.name : "", {
      fontFamily: FONTS.FAMILY,
      fontSize: "8px",
      color: COLORS.TEXT_ACCENT,
    })
    .setOrigin(0.5);
  container.add(skillLabel);

  // 属性数值（底部）
  const statY = CELL_HEIGHT / 2 - 28;
  const stats = [
    { icon: "HP", value: cardData.hp, color: CRT_THEME.palette.danger, x: -24 },
    { icon: "AT", value: cardData.atk, color: CRT_THEME.palette.amberBright, x: 0 },
    { icon: "AR", value: cardData.armor, color: CRT_THEME.palette.amberMid, x: 24 },
  ];

  stats.forEach((s) => {
    const statText = scene.add
      .text(s.x, statY, `${s.icon}\n${String(s.value).padStart(2, "0")}`, {
        fontFamily: FONTS.FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: s.color,
        align: "center",
        shadow: { offsetX: 0, offsetY: 0, color: CRT_THEME.palette.amberLow, blur: 3, fill: true },
      })
      .setOrigin(0.5);
    container.add(statText);
  });

  return container;
}

/**
 * 刷新怪物卡的属性显示（战斗后调用，不销毁容器）
 * @param {Phaser.GameObjects.Container} container
 */
export function refreshMonsterCardDisplay(container) {
  const cardData = container.cardData;
  if (!cardData || cardData.type !== "monster") return;

  // 容器子元素结构：0=bg, 1=nameBar, 2=nameText, 3=skillLabel, 4=hp, 5=atk, 6=armor
  if (container.length < 7) return;

  const hpText = container.getAt(4);
  const atkText = container.getAt(5);
  const armorText = container.getAt(6);

  if (hpText && hpText.setText) hpText.setText(`HP\n${String(cardData.hp).padStart(2, "0")}`);
  if (atkText && atkText.setText) atkText.setText(`AT\n${String(cardData.atk).padStart(2, "0")}`);
  if (armorText && armorText.setText) armorText.setText(`AR\n${String(cardData.armor).padStart(2, "0")}`);
}

/**
 * 创建帮助卡视觉对象
 * @param {Phaser.Scene} scene
 * @param {Object} cardData — { id, name, type, rarity, effect, uid }
 * @param {number} x
 * @param {number} y
 * @returns {Phaser.GameObjects.Container}
 */
export function createHelpCard(scene, cardData, x, y) {
  const { CELL_WIDTH, CELL_HEIGHT } = GRID;
  const bgKey = getHelpBgKey(cardData.rarity);

  const container = scene.add.container(x, y);
  container.cardData = cardData;
  container.setSize(CELL_WIDTH, CELL_HEIGHT);
  container.setDepth(DEPTH.CARDS);

  // 背景 — 作为可点击的交互区
  const bg = scene.add.image(0, 0, bgKey).setOrigin(0.5);
  bg.setInteractive(
    new Phaser.Geom.Rectangle(-CELL_WIDTH / 2, -CELL_HEIGHT / 2, CELL_WIDTH, CELL_HEIGHT),
    Phaser.Geom.Rectangle.Contains
  );
  container.add(bg);
  bg._cardContainer = container;

  // 名称
  const nameText = scene.add
    .text(0, -CELL_HEIGHT / 2 + 24, cardData.name, {
      fontFamily: FONTS.FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: COLORS.TEXT_ACCENT,
      align: "center",
      wordWrap: { width: CELL_WIDTH - 10 },
      shadow: { offsetX: 0, offsetY: 0, color: CRT_THEME.palette.amberLow, blur: 4, fill: true },
    })
    .setOrigin(0.5);
  container.add(nameText);

  // 类型标签
  const typeLabel = scene.add
    .text(0, -4, "[ITEM]", {
      fontFamily: FONTS.FAMILY,
      fontSize: "10px",
      color: COLORS.TEXT_SECONDARY,
    })
    .setOrigin(0.5);
  container.add(typeLabel);

  // 效果简述
  const effectText = scene.add
    .text(0, CELL_HEIGHT / 2 - 30, cardData.desc || "PROC READY", {
      fontFamily: FONTS.FAMILY,
      fontSize: "9px",
      color: COLORS.TEXT_ACCENT,
      align: "center",
      wordWrap: { width: CELL_WIDTH - 12 },
    })
    .setOrigin(0.5, 0);
  container.add(effectText);

  return container;
}

// ============================================================
// 内部工具
// ============================================================

function getMonsterStyle(cardData) {
  // 根据怪物强度选择风格（后续可根据等级扩展）
  if (cardData.atk >= 3 || cardData.hp >= 10) {
    return { bgKey: "card-bg-monster" };
  }
  return { bgKey: "card-bg-monster" };
}

function getHelpBgKey(rarity) {
  const map = {
    white: "card-bg-help-white",
    blue: "card-bg-help-blue",
    gold: "card-bg-help-gold",
    red: "card-bg-help-red",
  };
  return map[rarity] || "card-bg-help-white";
}
