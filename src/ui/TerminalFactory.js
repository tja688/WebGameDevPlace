import Phaser from "phaser";
import { CRT_THEME, hexToNumber } from "../style/crtTheme.js";
import { DEPTH } from "../config/GameConfig.js";

export default class TerminalFactory {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.theme = options.theme || CRT_THEME;
    this.audio = options.audio || scene.terminalAudio || null;
    this.crt = options.crt || scene.crt || null;
  }

  label(x, y, text, variant = "body", options = {}) {
    const style = this._textStyle(variant, options);
    return this.scene.add.text(x, y, text, style).setDepth(options.depth ?? DEPTH.UI_TEXT);
  }

  panel(x, y, w, h, title = "", options = {}) {
    const palette = this.theme.palette;
    const container = this.scene.add.container(x, y).setDepth(options.depth ?? DEPTH.UI_PANELS);
    const bg = this.scene.add.rectangle(0, 0, w, h, hexToNumber(palette.bgPanel), options.alpha ?? 0.84)
      .setStrokeStyle(1, hexToNumber(palette.amberLow), 0.62);
    const inner = this.scene.add.rectangle(0, 0, Math.max(2, w - 8), Math.max(2, h - 8), hexToNumber(palette.bgScreen), 0.18)
      .setStrokeStyle(1, hexToNumber(palette.amberDim), 0.45);
    container.add([bg, inner]);
    if (title) {
      const titleText = this.label(-w / 2 + 8, -h / 2 + 5, title, "small", { depth: (options.depth ?? DEPTH.UI_PANELS) + 1 });
      titleText.setColor(palette.amberBright);
      container.add(titleText);
    }
    return container;
  }

  button(x, y, w, h, label, callback, options = {}) {
    const palette = this.theme.palette;
    const container = this.scene.add.container(x, y).setDepth(options.depth ?? DEPTH.UI_TEXT);
    const bg = this.scene.add.rectangle(0, 0, w, h, hexToNumber(palette.bgPanel), 0.92)
      .setStrokeStyle(1, hexToNumber(palette.amber), 0.8);
    const text = this.scene.add.text(0, 0, label, this._textStyle("button", options))
      .setOrigin(0.5);
    const hit = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add([bg, text, hit]);

    hit.on("pointerover", () => {
      bg.setStrokeStyle(1, hexToNumber(palette.amberHot), 1);
      text.setColor(palette.creamHot);
      this.audio?.hover();
    });
    hit.on("pointerout", () => {
      bg.setStrokeStyle(1, hexToNumber(palette.amber), 0.8);
      text.setColor(palette.amberBright);
    });
    hit.on("pointerdown", () => {
      this.audio?.confirm();
      this.crt?.pulse();
      this.scene.tweens.add({
        targets: container,
        alpha: 0.75,
        duration: 70,
        yoyo: true,
        onComplete: () => callback?.(),
      });
    });
    return container;
  }

  table(x, y, columns, rows, options = {}) {
    const colWidths = options.colWidths || columns.map(() => Math.floor((options.width || 360) / columns.length));
    const rowH = options.rowHeight || 20;
    const width = colWidths.reduce((sum, w) => sum + w, 0);
    const height = rowH * (rows.length + 1) + 10;
    const container = this.panel(x + width / 2, y + height / 2, width + 14, height, options.title || "", options);
    const left = -width / 2;
    let cx = left;
    columns.forEach((col, i) => {
      const header = this.scene.add.text(cx + 4, -height / 2 + 8, col, this._textStyle("small", { color: this.theme.palette.amberBright }));
      container.add(header);
      cx += colWidths[i];
    });
    rows.forEach((row, rowIndex) => {
      const yPos = -height / 2 + 28 + rowIndex * rowH;
      const line = this.scene.add.rectangle(0, yPos - 3, width, 1, hexToNumber(this.theme.palette.amberLow), 0.35);
      container.add(line);
      let cellX = left;
      row.forEach((cell, colIndex) => {
        const text = this.scene.add.text(cellX + 4, yPos, String(cell), this._textStyle("body"));
        container.add(text);
        cellX += colWidths[colIndex];
      });
    });
    return container;
  }

  ticker(x, y, w, items, options = {}) {
    const text = this.label(x, y, items.join("  /  "), "small", options);
    text.setFixedSize(w, 16);
    let index = 0;
    const timer = this.scene.time.addEvent({
      delay: options.delay || 420,
      loop: true,
      callback: () => {
        index = (index + 1) % items.length;
        text.setText(`${items[index]}  /  ${items[(index + 1) % items.length]}`);
      },
    });
    text.once("destroy", () => timer.remove(false));
    return text;
  }

  statusLight(x, y, state = "idle") {
    const palette = this.theme.palette;
    const color = state === "danger" ? palette.danger : state === "on" ? palette.amberHot : palette.amberDim;
    const light = this.scene.add.circle(x, y, 4, hexToNumber(color), state === "idle" ? 0.45 : 0.9)
      .setStrokeStyle(1, hexToNumber(palette.amberLow), 0.7)
      .setDepth(DEPTH.UI_TEXT);
    if (state === "on" || state === "danger") {
      this.scene.tweens.add({ targets: light, alpha: 0.35, duration: 850, yoyo: true, repeat: -1 });
    }
    return light;
  }

  icon(x, y, key, state = "idle") {
    const glyphs = { player: "P", monster: "M", help: "+", deck: "#", warning: "!" };
    return this.label(x, y, glyphs[key] || key, state === "warning" ? "warning" : "body").setOrigin(0.5);
  }

  warning(x, y, text) {
    return this.label(x, y, text, "warning");
  }

  bigGlyph(x, y, glyph) {
    const text = this.label(x, y, glyph, "huge");
    text.setOrigin(0.5);
    return text;
  }

  _textStyle(variant, options = {}) {
    const palette = this.theme.palette;
    const type = this.theme.typography;
    const styles = {
      small: { fontSize: `${type.fontSizeSmall}px`, color: palette.amberMid },
      body: { fontSize: `${type.fontSizeBody}px`, color: palette.amber },
      title: { fontSize: `${type.fontSizeLarge}px`, color: palette.amberBright, fontStyle: "bold" },
      button: { fontSize: "14px", color: palette.amberBright, fontStyle: "bold" },
      huge: { fontSize: `${type.fontSizeHuge}px`, color: palette.amberHot, fontStyle: "bold" },
      warning: { fontSize: "12px", color: palette.danger, fontStyle: "bold" },
    };
    const base = styles[variant] || styles.body;
    return {
      fontFamily: type.fontFamily,
      fontSize: options.fontSize || base.fontSize,
      fontStyle: options.fontStyle || base.fontStyle || "",
      color: options.color || base.color,
      align: options.align || "left",
      wordWrap: options.wordWrap,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: palette.amberLow,
        blur: variant === "small" ? 2 : 5,
        fill: true,
      },
    };
  }
}
