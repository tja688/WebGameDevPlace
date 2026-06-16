import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS, DEPTH } from "../../config/GameConfig.js";
import gameState from "../../core/GameState.js";

// ============================================================
// SelectionOverlay — 通用选择覆盖层
// 半透明黑底 + 选项卡片/按钮 + 跳过按钮
// ============================================================

/**
 * 创建选择覆盖层
 * @param {Phaser.Scene} scene
 * @param {Object} config
 * @param {string} config.title — 标题文字
 * @param {Array<{key: string, label: string, subLabel?: string, color?: number}>} config.options — 选项列表
 * @param {string} config.skipLabel — 跳过按钮文字（如 "跳过 → +10💰"）
 * @param {Function} config.onSelect — 选中回调 (key)
 * @param {Function} config.onSkip — 跳过回调
 * @returns {{ container: Phaser.GameObjects.Container, destroy: Function }}
 */
export function showSelectionOverlay(scene, config) {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;

  // 输入锁
  gameState.lockInput("overlay");

  // 容器
  const container = scene.add.container(0, 0).setDepth(DEPTH.OVERLAY);

  // 半透明黑底（阻止下层点击）
  const dimBg = scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORS.BG_OVERLAY, 0.7)
    .setInteractive() // 吃掉所有点击
    .setOrigin(0.5);
  container.add(dimBg);

  // 标题背景
  const titleBg = scene.add.rectangle(cx, cy - 140, 400, 40, COLORS.BG_PANEL, 0.9)
    .setStrokeStyle(1, COLORS.CELL_BORDER);
  container.add(titleBg);

  // 标题
  const titleText = scene.add.text(cx, cy - 140, config.title, {
    fontFamily: FONTS.FAMILY,
    fontSize: "18px",
    fontStyle: "bold",
    color: COLORS.TEXT_PRIMARY,
  }).setOrigin(0.5);
  container.add(titleText);

  // 选项卡片
  const optCount = config.options.length;
  const cardW = 110;
  const cardH = 140;
  const gap = 20;
  const totalW = optCount * cardW + (optCount - 1) * gap;
  const startX = cx - totalW / 2 + cardW / 2;
  const optY = cy - 10;

  config.options.forEach((opt, i) => {
    const ox = startX + i * (cardW + gap);

    // 卡片背景
    const card = scene.add.rectangle(ox, optY, cardW, cardH, opt.color || 0x3b6fb6, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true });
    container.add(card);

    // 卡片名
    const name = scene.add.text(ox, optY - 30, opt.label, {
      fontFamily: FONTS.FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: COLORS.TEXT_WHITE,
      align: "center",
      wordWrap: { width: cardW - 10 },
    }).setOrigin(0.5);
    container.add(name);

    // 副标题
    if (opt.subLabel) {
      const sub = scene.add.text(ox, optY + 20, opt.subLabel, {
        fontFamily: FONTS.FAMILY,
        fontSize: "10px",
        color: COLORS.TEXT_SECONDARY,
        align: "center",
        wordWrap: { width: cardW - 10 },
      }).setOrigin(0.5, 0);
      container.add(sub);
    }

    // 点击事件
    card.on("pointerover", () => card.setStrokeStyle(2, 0xffdd77, 1));
    card.on("pointerout", () => card.setStrokeStyle(2, 0xffffff, 0.3));
    card.on("pointerdown", () => {
      destroy();
      if (config.onSelect) config.onSelect(opt.key, opt);
    });
  });

  // 跳过按钮
  const skipY = cy + 110;
  const skipBg = scene.add.rectangle(cx, skipY, 180, 36, 0x444444, 0.8)
    .setStrokeStyle(1, 0x888888)
    .setInteractive({ useHandCursor: true });
  container.add(skipBg);

  const skipText = scene.add.text(cx, skipY, config.skipLabel || "跳过", {
    fontFamily: FONTS.FAMILY,
    fontSize: "14px",
    color: COLORS.TEXT_SECONDARY,
  }).setOrigin(0.5);
  container.add(skipText);

  skipBg.on("pointerover", () => skipBg.setFillStyle(0x555555));
  skipBg.on("pointerout", () => skipBg.setFillStyle(0x444444));
  skipBg.on("pointerdown", () => {
    destroy();
    if (config.onSkip) config.onSkip();
  });

  function destroy() {
    container.destroy();
    gameState.unlockInput("overlay");
  }

  return { container, destroy };
}
