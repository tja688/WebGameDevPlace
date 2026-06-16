import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from "../config/GameConfig.js";

/**
 * MenuScene — 主菜单场景
 * 显示游戏标题和开始按钮
 */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 深色背景
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORS.BG_DARK);

    // 装饰线（顶部）
    this.add.rectangle(cx, 0, GAME_WIDTH, 3, COLORS.CELL_BORDER).setOrigin(0.5, 0);

    // 游戏标题
    this.add
      .text(cx, cy - 80, "九 宫 牌 局", {
        fontFamily: FONTS.FAMILY,
        fontSize: "48px",
        fontStyle: "bold",
        color: COLORS.TEXT_ACCENT,
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // 副标题
    this.add
      .text(cx, cy - 25, "3×3 卡牌 Roguelike", {
        fontFamily: FONTS.FAMILY,
        fontSize: "18px",
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // --- 开始游戏按钮 ---
    const btnW = 200;
    const btnH = 50;
    const btnY = cy + 60;

    // 用 Graphics 绘制圆角按钮底层
    const btnGfx = this.add.graphics();
    const drawBtn = (color) => {
      btnGfx.clear();
      btnGfx.fillStyle(color, 1);
      btnGfx.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    };
    drawBtn(COLORS.BTN_BG);

    // 透明可点击区域（置于 Graphics 之上）
    const btnHit = this.add
      .rectangle(cx, btnY, btnW, btnH)
      .setFillStyle() // 无填充，透明
      .setInteractive({ useHandCursor: true })
      .setDepth(1); // 确保在 Graphics 上层接收事件

    // 按钮文字（置于最上层）
    const btnText = this.add
      .text(cx, btnY, "开 始 游 戏", {
        fontFamily: FONTS.FAMILY,
        fontSize: "20px",
        fontStyle: "bold",
        color: COLORS.TEXT_WHITE,
      })
      .setOrigin(0.5)
      .setDepth(2);

    btnHit.on("pointerover", () => drawBtn(COLORS.BTN_HOVER));
    btnHit.on("pointerout", () => drawBtn(COLORS.BTN_BG));
    btnHit.on("pointerdown", () => this.scene.start("GameScene"));

    // 底部信息
    this.add
      .text(cx, GAME_HEIGHT - 25, "v0.1 — 小丑职业", {
        fontFamily: FONTS.FAMILY,
        fontSize: "12px",
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 装饰线（底部）
    this.add
      .rectangle(cx, GAME_HEIGHT, GAME_WIDTH, 3, COLORS.CELL_BORDER)
      .setOrigin(0.5, 1);
  }
}
