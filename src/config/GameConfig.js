import { CRT_THEME, hexToNumber } from "../style/crtTheme.js";

// ============================================================
// 游戏常量配置 - 九宫牌局
// ============================================================

/** 画布基础分辨率 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** 九宫格战场配置 */
export const GRID = {
  COLS: 3,
  ROWS: 3,
  CELL_WIDTH: 80,
  CELL_HEIGHT: 110,
  GAP: 6,
  // 九宫格左上角坐标（在战场区域内居中计算得出）
  X: 352,
  Y: 17,
};

/** UI 区域划分 */
export const LAYOUT = {
  // 左侧面板
  LEFT_PANEL_X: 0,
  LEFT_PANEL_W: 185,
  // 左侧上方 — 玩家信息
  PLAYER_INFO_Y: 0,
  PLAYER_INFO_H: 160,
  // 左侧下方 — 装备栏
  EQUIPMENT_Y: 165,
  EQUIPMENT_H: 375, // 到底部 540

  // 中央区域
  CENTER_X: 190,
  CENTER_W: 575,
  // 中央上方 — 作战场地
  BATTLEFIELD_Y: 0,
  BATTLEFIELD_H: 375,
  // 中央下方 — 道具牌格
  ITEM_SLOTS_Y: 380,
  ITEM_SLOTS_H: 160,

  // 右侧面板
  RIGHT_PANEL_X: 770,
  RIGHT_PANEL_W: 190,
  // 右侧上方 — 牌组区
  DECK_AREA_Y: 0,
  DECK_AREA_H: 130,
  // 右侧中间 — 介绍区
  TOOLTIP_Y: 135,
  TOOLTIP_H: 210,
  // 右侧下方 — 技能栏
  SKILLS_Y: 350,
  SKILLS_H: 190,
};

/** 色板 */
export const COLORS = {
  // 背景色系
  BG_DARK: hexToNumber(CRT_THEME.palette.bgDeep),
  BG_PANEL: hexToNumber(CRT_THEME.palette.bgPanel),
  BG_OVERLAY: hexToNumber(CRT_THEME.palette.shadow),

  // 格子
  CELL_EMPTY: hexToNumber(CRT_THEME.palette.bgScreen),
  CELL_BORDER: hexToNumber(CRT_THEME.palette.amberLow),
  CELL_HIGHLIGHT: hexToNumber(CRT_THEME.palette.amber),

  // 卡牌底色
  PLAYER_CARD: hexToNumber(CRT_THEME.palette.bgScreen),
  PLAYER_CARD_LIGHT: hexToNumber(CRT_THEME.palette.amberBright),
  MONSTER_CARD: hexToNumber(CRT_THEME.palette.bgPanel),
  MONSTER_CARD_LIGHT: hexToNumber(CRT_THEME.palette.danger),
  HELP_WHITE: hexToNumber(CRT_THEME.palette.amberDim),
  HELP_BLUE: hexToNumber(CRT_THEME.palette.amberLow),
  HELP_GOLD: hexToNumber(CRT_THEME.palette.amberMid),
  HELP_RED: hexToNumber(CRT_THEME.palette.danger),

  // 文字
  TEXT_PRIMARY: CRT_THEME.palette.amber,
  TEXT_SECONDARY: CRT_THEME.palette.amberMid,
  TEXT_ACCENT: CRT_THEME.palette.amberBright,
  TEXT_WHITE: CRT_THEME.palette.creamHot,

  // 按钮
  BTN_BG: hexToNumber(CRT_THEME.palette.bgPanel),
  BTN_HOVER: hexToNumber(CRT_THEME.palette.amberLow),

  // 道具牌格
  ITEM_SLOT: hexToNumber(CRT_THEME.palette.bgScreen),
  ITEM_SLOT_BORDER: hexToNumber(CRT_THEME.palette.amberLow),
};

/** 字体配置 */
export const FONTS = {
  FAMILY: CRT_THEME.typography.fontFamily,
  TITLE: `bold 32px ${CRT_THEME.typography.fontFamily}`,
  SUBTITLE: `18px ${CRT_THEME.typography.fontFamily}`,
  PANEL_HEADER: `bold 14px ${CRT_THEME.typography.fontFamily}`,
  PANEL_TEXT: `12px ${CRT_THEME.typography.fontFamily}`,
  CARD_NAME: `bold 13px ${CRT_THEME.typography.fontFamily}`,
  CARD_STAT: `11px ${CRT_THEME.typography.fontFamily}`,
};

/** 深度层级 */
export const DEPTH = {
  BG: 0,
  GRID: 10,
  CARDS: 20,
  UI_PANELS: 30,
  UI_TEXT: 40,
  OVERLAY: 100,
  POPUP: 110,
};
