import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS, DEPTH } from "../../config/GameConfig.js";
import gameState from "../../core/GameState.js";
import { CRT_THEME } from "../../style/crtTheme.js";

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
  const palette = CRT_THEME.palette;
  scene.terminalAudio?.rowRefresh();
  scene.crt?.glitch(90);

  // 输入锁
  gameState.lockInput("overlay");

  // 容器
  const container = scene.add.container(0, 0).setDepth(DEPTH.OVERLAY);

  // 半透明黑底（阻止下层点击）
  const dimBg = scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORS.BG_OVERLAY, 0.72)
    .setInteractive() // 吃掉所有点击
    .setOrigin(0.5);
  container.add(dimBg);

  // 标题背景
  const titleBg = scene.add.rectangle(cx, cy - 140, 430, 44, COLORS.BG_PANEL, 0.92)
    .setStrokeStyle(1, COLORS.TEXT_ACCENT, 0.75);
  container.add(titleBg);

  // 标题
  const titleText = scene.add.text(cx, cy - 140, config.title, {
    fontFamily: FONTS.FAMILY,
    fontSize: "17px",
    fontStyle: "bold",
    color: COLORS.TEXT_ACCENT,
    align: "center",
    shadow: { offsetX: 0, offsetY: 0, color: palette.amberLow, blur: 5, fill: true },
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
    const card = scene.add.rectangle(ox, optY, cardW, cardH, opt.color || COLORS.BG_PANEL, 0.78)
      .setStrokeStyle(1, COLORS.TEXT_ACCENT, 0.45)
      .setInteractive({ useHandCursor: true });
    container.add(card);

    // 卡片名
    const name = scene.add.text(ox, optY - 30, opt.label, {
      fontFamily: FONTS.FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: COLORS.TEXT_ACCENT,
      align: "center",
      wordWrap: { width: cardW - 10 },
      shadow: { offsetX: 0, offsetY: 0, color: palette.amberLow, blur: 4, fill: true },
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
    card.on("pointerover", () => { card.setStrokeStyle(1, COLORS.TEXT_WHITE, 1); scene.terminalAudio?.hover(); });
    card.on("pointerout", () => card.setStrokeStyle(1, COLORS.TEXT_ACCENT, 0.45));
    card.on("pointerdown", () => {
      scene.terminalAudio?.confirm();
      scene.crt?.pulse(110);
      destroy();
      if (config.onSelect) config.onSelect(opt.key, opt);
    });
  });

  // 跳过按钮
  const skipY = cy + 110;
  const skipBg = scene.add.rectangle(cx, skipY, 190, 36, COLORS.BG_PANEL, 0.86)
    .setStrokeStyle(1, COLORS.CELL_BORDER, 0.7)
    .setInteractive({ useHandCursor: true });
  container.add(skipBg);

  const skipText = scene.add.text(cx, skipY, config.skipLabel || "SKIP", {
    fontFamily: FONTS.FAMILY,
    fontSize: "14px",
    color: COLORS.TEXT_SECONDARY,
  }).setOrigin(0.5);
  container.add(skipText);

  skipBg.on("pointerover", () => { skipBg.setStrokeStyle(1, COLORS.TEXT_ACCENT, 1); scene.terminalAudio?.hover(); });
  skipBg.on("pointerout", () => skipBg.setStrokeStyle(1, COLORS.CELL_BORDER, 0.7));
  skipBg.on("pointerdown", () => {
    scene.terminalAudio?.confirm();
    destroy();
    if (config.onSkip) config.onSkip();
  });

  function destroy() {
    container.destroy();
    gameState.unlockInput("overlay");
  }

  return { container, destroy };
}
