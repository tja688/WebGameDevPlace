import Phaser from "phaser";
import { COLORS } from "../config/GameConfig.js";

/**
 * BootScene — 游戏启动场景
 * 职责：用 Graphics 绘制所有卡牌贴图和 UI 素材，存入纹理管理器
 * 完成后自动跳转到主菜单
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    const { width, height } = this.scale;

    // 纯黑背景
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.BG_DARK);

    // 加载提示文字
    const loadingText = this.add
      .text(width / 2, height / 2, "加载中...", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 生成所有贴图（放在下一帧确保 loading 文字先渲染）
    this.time.delayedCall(50, () => {
      this.generateTextures();
      loadingText.destroy();
      // 跳转到主菜单
      this.scene.start("MenuScene");
    });
  }

  /**
   * 用 Graphics 绘制所有游戏需要的贴图
   */
  generateTextures() {
    const CW = 80;  // 卡牌宽度
    const CH = 110; // 卡牌高度
    const R = 6;    // 圆角半径

    // --- 玩家卡底色 ---
    this.drawCardTexture("card-bg-player", CW, CH, R, {
      fill: COLORS.PLAYER_CARD,
      stroke: COLORS.PLAYER_CARD_LIGHT,
      lineWidth: 2,
    });

    // --- 怪物卡底色 ---
    this.drawCardTexture("card-bg-monster", CW, CH, R, {
      fill: COLORS.MONSTER_CARD,
      stroke: COLORS.MONSTER_CARD_LIGHT,
      lineWidth: 2,
    });

    // --- 帮助卡底色（白/蓝/金/红四品质） ---
    this.drawCardTexture("card-bg-help-white", CW, CH, R, {
      fill: COLORS.HELP_WHITE,
      stroke: 0x8899aa,
      lineWidth: 2,
    });
    this.drawCardTexture("card-bg-help-blue", CW, CH, R, {
      fill: COLORS.HELP_BLUE,
      stroke: 0x6aafe8,
      lineWidth: 2,
    });
    this.drawCardTexture("card-bg-help-gold", CW, CH, R, {
      fill: COLORS.HELP_GOLD,
      stroke: 0xe8c840,
      lineWidth: 2,
    });
    this.drawCardTexture("card-bg-help-red", CW, CH, R, {
      fill: COLORS.HELP_RED,
      stroke: 0xe85a4b,
      lineWidth: 2,
    });

    // --- 空格子底色 ---
    this.drawCardTexture("card-bg-empty", CW, CH, R, {
      fill: COLORS.CELL_EMPTY,
      stroke: COLORS.CELL_BORDER,
      lineWidth: 1,
    });

    // --- 道具牌格小卡（50×70） ---
    this.drawCardTexture("item-slot-bg", 50, 70, 4, {
      fill: COLORS.ITEM_SLOT,
      stroke: COLORS.ITEM_SLOT_BORDER,
      lineWidth: 1,
    });

    // --- 遗物槽小格（30×30） ---
    this.drawCardTexture("relic-slot-bg", 30, 30, 3, {
      fill: COLORS.CELL_EMPTY,
      stroke: COLORS.CELL_BORDER,
      lineWidth: 1,
    });

    console.log("[BootScene] 所有贴图生成完毕");
  }

  /**
   * 绘制一张圆角矩形卡牌贴图
   */
  drawCardTexture(key, w, h, radius, style) {
    const gfx = this.add.graphics();

    // 填充
    gfx.fillStyle(style.fill, 1);
    gfx.fillRoundedRect(0, 0, w, h, radius);

    // 描边
    gfx.lineStyle(style.lineWidth || 1, style.stroke, 1);
    gfx.strokeRoundedRect(0, 0, w, h, radius);

    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }
}
