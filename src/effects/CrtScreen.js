import { CRT_THEME, FX_PRESETS, hexToNumber } from "../style/crtTheme.js";
import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from "../config/GameConfig.js";

const OVERLAY_DEPTH = DEPTH.POPUP + 500;

export default class CrtScreen {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.camera = options.camera || scene.cameras.main;
    this.theme = options.theme || CRT_THEME;
    this.fx = { ...this.theme.fx };
    this.objects = [];
    this.noiseTimer = null;
    this.filters = {};

    this._build();
    this._tryEnableCameraFilters();
    this.setIntensity(options.intensity || "normal");
    this.scene.events.once("shutdown", () => this.destroy());
  }

  pulse(duration = 120) {
    if (!this.flash) return;
    this.flash.setAlpha(0.22);
    this.scene.tweens.add({
      targets: this.flash,
      alpha: 0,
      duration,
      ease: "Quad.easeOut",
    });
  }

  glitch(duration = 160) {
    const palette = this.theme.palette;
    const bars = [];
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const y = Math.floor(Math.random() * GAME_HEIGHT);
      const h = 2 + Math.floor(Math.random() * 10);
      const color = Math.random() > 0.65 ? palette.danger : palette.amberHot;
      const bar = this.scene.add.rectangle(
        GAME_WIDTH / 2 + (Math.random() * 10 - 5),
        y,
        GAME_WIDTH + 30,
        h,
        hexToNumber(color),
        0.12 + Math.random() * 0.18
      ).setDepth(OVERLAY_DEPTH + 5).setOrigin(0.5);
      bars.push(bar);
    }
    this.scene.tweens.add({
      targets: bars,
      alpha: 0,
      x: `+=${Math.random() > 0.5 ? 10 : -10}`,
      duration,
      ease: "Stepped",
      onComplete: () => bars.forEach((bar) => bar.destroy()),
    });
    this.pulse(Math.min(140, duration));
  }

  screenOn() {
    if (!this.wakeShade) return;
    this.wakeShade.setAlpha(1);
    this.scene.tweens.add({
      targets: this.wakeShade,
      alpha: 0,
      duration: 520,
      ease: "Sine.easeOut",
    });
    this.pulse(180);
  }

  screenOff() {
    if (!this.wakeShade) return;
    this.scene.tweens.add({
      targets: this.wakeShade,
      alpha: 0.92,
      duration: 280,
      ease: "Quad.easeIn",
    });
  }

  setIntensity(level = "normal") {
    const preset = FX_PRESETS[level] || FX_PRESETS.normal;
    this.fx = { ...this.fx, ...preset };
    if (this.scanlines) this.scanlines.setAlpha(this.fx.scanlineAlpha);
    if (this.dotMask) this.dotMask.setAlpha(this.fx.dotMaskAlpha);
    if (this.noise) this.noise.setAlpha(this.fx.noiseAlpha);
    if (this.vignette) this.vignette.setAlpha(this.fx.vignetteAlpha);
  }

  setReadabilityMode(enabled) {
    this.setIntensity(enabled ? "readable" : "normal");
  }

  destroy() {
    if (this.noiseTimer) this.noiseTimer.remove(false);
    this.objects.forEach((obj) => obj?.destroy?.());
    this.objects = [];
    Object.values(this.filters).forEach((filter) => {
      try {
        filter?.destroy?.();
      } catch (_) {
        // Filter cleanup differs by renderer; scene shutdown also owns it.
      }
    });
  }

  _build() {
    const palette = this.theme.palette;
    this._makePatternTextures();

    this.glow = this.scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      hexToNumber(palette.amber),
      0.025
    ).setDepth(OVERLAY_DEPTH);

    this.scanlines = this.scene.add.tileSprite(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      "__crt_scanline"
    ).setDepth(OVERLAY_DEPTH + 1);

    this.dotMask = this.scene.add.tileSprite(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      "__crt_dotmask"
    ).setDepth(OVERLAY_DEPTH + 2);

    this.noise = this.scene.add.graphics().setDepth(OVERLAY_DEPTH + 3);
    this.vignette = this._makeVignette().setDepth(OVERLAY_DEPTH + 4);
    this.flash = this.scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      hexToNumber(palette.creamHot),
      0
    ).setDepth(OVERLAY_DEPTH + 6);
    this.wakeShade = this.scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      hexToNumber(palette.shadow),
      0
    ).setDepth(OVERLAY_DEPTH + 7);

    this.objects.push(this.glow, this.scanlines, this.dotMask, this.noise, this.vignette, this.flash, this.wakeShade);
    this.noiseTimer = this.scene.time.addEvent({
      delay: 85,
      loop: true,
      callback: () => this._redrawNoise(),
    });
    this._redrawNoise();
  }

  _makePatternTextures() {
    if (!this.scene.textures.exists("__crt_scanline")) {
      const scan = this.scene.add.graphics();
      scan.fillStyle(0x000000, 0);
      scan.fillRect(0, 0, 2, 4);
      scan.fillStyle(0x000000, 1);
      scan.fillRect(0, 0, 2, 1);
      scan.generateTexture("__crt_scanline", 2, 4);
      scan.destroy();
    }

    if (!this.scene.textures.exists("__crt_dotmask")) {
      const dot = this.scene.add.graphics();
      dot.fillStyle(0x000000, 0);
      dot.fillRect(0, 0, 4, 4);
      dot.fillStyle(0x000000, 1);
      dot.fillRect(1, 1, 1, 1);
      dot.generateTexture("__crt_dotmask", 4, 4);
      dot.destroy();
    }
  }

  _makeVignette() {
    const g = this.scene.add.graphics();
    const shadow = hexToNumber(this.theme.palette.shadow);
    g.fillStyle(shadow, 1);
    g.fillRect(0, 0, GAME_WIDTH, 18);
    g.fillRect(0, GAME_HEIGHT - 18, GAME_WIDTH, 18);
    g.fillRect(0, 0, 18, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - 18, 0, 18, GAME_HEIGHT);
    for (let i = 0; i < 12; i++) {
      const alpha = 0.035 + i * 0.006;
      g.lineStyle(2, shadow, alpha);
      g.strokeRoundedRect(10 + i * 4, 8 + i * 3, GAME_WIDTH - 20 - i * 8, GAME_HEIGHT - 16 - i * 6, 26);
    }
    return g;
  }

  _redrawNoise() {
    if (!this.noise) return;
    this.noise.clear();
    const amber = hexToNumber(this.theme.palette.amberBright);
    const shadow = hexToNumber(this.theme.palette.shadow);
    for (let i = 0; i < 46; i++) {
      const color = Math.random() > 0.5 ? amber : shadow;
      this.noise.fillStyle(color, 0.2 + Math.random() * 0.6);
      this.noise.fillRect(
        Math.floor(Math.random() * GAME_WIDTH),
        Math.floor(Math.random() * GAME_HEIGHT),
        1 + Math.floor(Math.random() * 3),
        1
      );
    }
  }

  _tryEnableCameraFilters() {
    const list = this.camera?.filters;
    if (!list) return;
    try {
      if (list.external?.addBarrel) {
        this.filters.barrel = list.external.addBarrel(1 + this.theme.fx.barrelAmount);
      }
      if (list.external?.addVignette) {
        this.filters.vignette = list.external.addVignette(0.5, 0.5, 0.92, 0.16);
      }
      if (list.internal?.addColorMatrix) {
        this.filters.color = list.internal.addColorMatrix();
        this.filters.color.colorMatrix?.brightness?.(0.02);
        this.filters.color.colorMatrix?.contrast?.(0.08);
      }
    } catch (err) {
      console.warn("[CrtScreen] Camera filters unavailable, overlay CRT remains active.", err);
    }
  }
}
