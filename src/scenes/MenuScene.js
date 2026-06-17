import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from "../config/GameConfig.js";
import { CRT_THEME, hexToNumber } from "../style/crtTheme.js";
import CrtScreen from "../effects/CrtScreen.js";
import TerminalAudio from "../audio/TerminalAudio.js";
import TerminalFactory from "../ui/TerminalFactory.js";

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
    const palette = CRT_THEME.palette;

    this.terminalAudio = new TerminalAudio(this);
    this.crt = new CrtScreen(this, { intensity: "high" });
    this.terminal = new TerminalFactory(this, { audio: this.terminalAudio, crt: this.crt });

    // 深色背景
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORS.BG_DARK);
    this.terminalAudio.screenOn();
    this.crt.screenOn();

    // 装饰线（顶部）
    this.add.rectangle(cx, 0, GAME_WIDTH, 3, COLORS.CELL_BORDER, 0.8).setOrigin(0.5, 0);
    this.terminal.panel(cx, cy + 5, 740, 390, "TERMINAL / INIT MENU");
    this.terminal.bigGlyph(cx - 255, cy - 70, "A7");

    // 游戏标题
    this.add
      .text(cx, cy - 92, "九 宫 牌 局", {
        fontFamily: FONTS.FAMILY,
        fontSize: "46px",
        fontStyle: "bold",
        color: palette.amberHot,
        stroke: palette.amberLow,
        strokeThickness: 2,
        shadow: { offsetX: 0, offsetY: 0, color: palette.amber, blur: 10, fill: true },
      })
      .setOrigin(0.5);

    // 副标题
    this.add
      .text(cx, cy - 36, "BAGGAGE GRID / 3x3 CARD ROGUELIKE", {
        fontFamily: FONTS.FAMILY,
        fontSize: "16px",
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 10, "手荷物受取ご案内 / SIGNAL ROUTE ONLINE", {
        fontFamily: FONTS.FAMILY,
        fontSize: "12px",
        color: palette.amber,
      })
      .setOrigin(0.5);

    // --- 开始游戏按钮 ---
    const btnW = 200;
    const btnH = 42;
    const btnY = cy + 68;

    this.terminal.button(cx, btnY, btnW, btnH, "> INIT RUN", () => {
      this.terminalAudio.glitch(120);
      this.crt.glitch(120);
      this.scene.start("GameScene");
    });
    this.terminal.button(cx, btnY + 54, btnW, 34, "> STYLE TEST", () => {
      this.terminalAudio.glitch(120);
      this.crt.glitch(120);
      this.scene.start("StyleTestScene");
    });

    // 底部信息
    this.add
      .text(cx, GAME_HEIGHT - 25, "v0.1 / JOKER OPERATOR / AMBER CRT BUILD", {
        fontFamily: FONTS.FAMILY,
        fontSize: "12px",
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 装饰线（底部）
    this.add
      .rectangle(cx, GAME_HEIGHT, GAME_WIDTH, 3, COLORS.CELL_BORDER, 0.8)
      .setOrigin(0.5, 1);
  }
}
