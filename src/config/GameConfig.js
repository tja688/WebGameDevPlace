// ============================================================
// 游戏常量配置 — 九宫牌局
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
  BG_DARK: 0x1e2a38,
  BG_PANEL: 0x263445,
  BG_OVERLAY: 0x000000,

  // 格子
  CELL_EMPTY: 0x334155,
  CELL_BORDER: 0x4a5568,
  CELL_HIGHLIGHT: 0x5a6a80,

  // 卡牌底色
  PLAYER_CARD: 0x4a90d9,
  PLAYER_CARD_LIGHT: 0x6aafe8,
  MONSTER_CARD: 0xc94a3b,
  MONSTER_CARD_LIGHT: 0xe85a4b,
  HELP_WHITE: 0x6b7280,
  HELP_BLUE: 0x4a8fc9,
  HELP_GOLD: 0xd4a830,
  HELP_RED: 0xc94a3b,

  // 文字
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#ccd6e0',
  TEXT_ACCENT: '#ffe680',
  TEXT_WHITE: '#ffffff',

  // 按钮
  BTN_BG: 0x4a90d9,
  BTN_HOVER: 0x6aafe8,

  // 道具牌格
  ITEM_SLOT: 0x2a3a50,
  ITEM_SLOT_BORDER: 0x4a5568,
};

/** 字体配置 */
export const FONTS = {
  FAMILY: 'Arial, "Microsoft YaHei", sans-serif',
  TITLE: 'bold 32px Arial, "Microsoft YaHei", sans-serif',
  SUBTITLE: '18px Arial, "Microsoft YaHei", sans-serif',
  PANEL_HEADER: 'bold 14px Arial, "Microsoft YaHei", sans-serif',
  PANEL_TEXT: '12px Arial, "Microsoft YaHei", sans-serif',
  CARD_NAME: 'bold 13px Arial, "Microsoft YaHei", sans-serif',
  CARD_STAT: '11px Arial, "Microsoft YaHei", sans-serif',
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
