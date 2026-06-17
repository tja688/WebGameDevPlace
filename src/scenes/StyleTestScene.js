import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from "../config/GameConfig.js";
import { CRT_THEME, hexToNumber } from "../style/crtTheme.js";
import CrtScreen from "../effects/CrtScreen.js";
import TerminalFactory from "../ui/TerminalFactory.js";
import TerminalAudio from "../audio/TerminalAudio.js";

export default class StyleTestScene extends Phaser.Scene {
  constructor() {
    super("StyleTestScene");
  }

  create() {
    this.terminalAudio = new TerminalAudio(this);
    this.crt = new CrtScreen(this, { intensity: "high" });
    this.terminal = new TerminalFactory(this, { audio: this.terminalAudio, crt: this.crt });
    this.terminalAudio.screenOn();
    this.crt.screenOn();

    const palette = CRT_THEME.palette;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, hexToNumber(palette.bgDeep))
      .setDepth(DEPTH.BG);

    this.terminal.panel(GAME_WIDTH / 2, GAME_HEIGHT / 2, 900, 492, "CRT-04 / BAGGAGE CLAIM STATUS", { depth: DEPTH.UI_PANELS });
    this.terminal.bigGlyph(82, 104, "B");
    this.terminal.label(136, 48, "手荷物受取ご案内", "title");
    this.terminal.label(136, 70, "BAGGAGE CLAIM / TERMINAL STATUS", "body");

    this.terminal.table(125, 108, ["ID", "ROUTE", "STATUS", "GATE"], [
      ["A01", "HKG-332", "CLAIMING", "B-04"],
      ["A02", "NRT-118", "DELAYED", "B-07"],
      ["A03", "SIN-902", "LOADING", "C-01"],
      ["A04", "TPE-515", "SORTING", "A-09"],
      ["A05", "SHA-027", "READY", "B-11"],
    ], {
      width: 470,
      colWidths: [58, 132, 150, 76],
      rowHeight: 28,
      title: "ARRIVAL LIST",
      depth: DEPTH.UI_PANELS + 2,
    });

    this.terminal.panel(650, 165, 210, 188, "SIGNAL BANK", { depth: DEPTH.UI_PANELS + 2 });
    ["SYNC", "BELT", "SCAN", "LINK", "WARN"].forEach((label, i) => {
      const y = 100 + i * 28;
      this.terminal.statusLight(585, y, i === 4 ? "danger" : i % 2 ? "idle" : "on");
      this.terminal.label(604, y - 7, `${label} / ${String(i + 3).padStart(2, "0")}`, i === 4 ? "warning" : "body");
    });

    this.terminal.button(704, 318, 148, 30, "> REFRESH ROW", () => {
      this.terminalAudio.rowRefresh();
      this.crt.glitch(120);
    }, { depth: DEPTH.UI_TEXT + 10 });
    this.terminal.button(704, 360, 148, 30, "> GAME GRID", () => {
      this.terminalAudio.glitch(120);
      this.crt.glitch(120);
      this.scene.start("GameScene");
    }, { depth: DEPTH.UI_TEXT + 10 });

    this.terminal.ticker(84, 488, 790, [
      "CLAIM BELT B-04 NOW ACTIVE",
      "LOW-FI SIGNAL CHECK PASSED",
      "AMBER DISPLAY READABILITY NORMAL",
      "NOISE REDUCTION READY",
    ], { depth: DEPTH.UI_TEXT + 2 });

    this.time.delayedCall(520, () => {
      this.terminalAudio.glitch(120);
      this.crt.glitch(120);
    });

    this.input.keyboard.on("keydown-ESC", () => {
      this.terminalAudio.screenOff();
      this.crt.screenOff();
      this.time.delayedCall(180, () => this.scene.start("MenuScene"));
    });
  }
}
