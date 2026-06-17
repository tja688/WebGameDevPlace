export const CRT_THEME = {
  resolution: {
    virtualWidth: 480,
    virtualHeight: 270,
    outputWidth: 960,
    outputHeight: 540,
    grid: 8,
  },

  palette: {
    bgDeep: "#120D08",
    bgScreen: "#21160E",
    bgPanel: "#2A1B10",
    amberDim: "#5C3A22",
    amberLow: "#76410F",
    amberMid: "#9D6511",
    amber: "#C99427",
    amberBright: "#F1C145",
    amberHot: "#FAE80F",
    creamHot: "#FFE9A3",
    danger: "#D85A27",
    shadow: "#050302",
  },

  typography: {
    fontFamily: '"Courier New", Consolas, "Microsoft YaHei", monospace',
    fontSizeSmall: 8,
    fontSizeBody: 10,
    fontSizeLarge: 16,
    fontSizeHuge: 42,
    letterSpacing: 1,
    lineHeight: 14,
  },

  panel: {
    border: 1,
    radius: 2,
    padding: 6,
    titleHeight: 14,
  },

  fx: {
    scanlineAlpha: 0.18,
    dotMaskAlpha: 0.12,
    noiseAlpha: 0.035,
    vignetteAlpha: 0.45,
    glowAlpha: 0.35,
    barrelAmount: 0.035,
    jitterPixels: 1,
    glitchChance: 0.006,
  },

  audio: {
    reduceAudioNoise: false,
    mute: false,
    masterVolume: 0.42,
  },

  accessibility: {
    reduceFlicker: false,
    highReadability: false,
  },
};

export const FX_PRESETS = {
  high: {
    scanlineAlpha: 0.24,
    dotMaskAlpha: 0.16,
    noiseAlpha: 0.05,
    glowAlpha: 0.45,
    glitchChance: 0.012,
  },
  normal: {
    scanlineAlpha: 0.18,
    dotMaskAlpha: 0.12,
    noiseAlpha: 0.035,
    glowAlpha: 0.35,
    glitchChance: 0.006,
  },
  readable: {
    scanlineAlpha: 0.08,
    dotMaskAlpha: 0.04,
    noiseAlpha: 0.015,
    glowAlpha: 0.18,
    glitchChance: 0.001,
  },
};

export function hexToNumber(hex) {
  if (typeof hex === "number") return hex;
  return Number.parseInt(hex.replace("#", ""), 16);
}

export function withAlpha(hex, alpha = 1) {
  return { color: hexToNumber(hex), alpha };
}
