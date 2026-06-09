// ==================== 深入地牢 — 布局常量与颜色配置 ====================

// ==================== 画布尺寸 ====================
export const GAME_W = 960;
export const GAME_H = 640;

// ==================== 九宫格布局 ====================
export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const CELL_W = 110;
export const CELL_H = 120;
export const CELL_GAP = 6;
export const GRID_TOTAL_W = CELL_W * GRID_COLS + CELL_GAP * (GRID_COLS - 1);
export const GRID_TOTAL_H = CELL_H * GRID_ROWS + CELL_GAP * (GRID_ROWS - 1);
export const CENTER_LEFT = 200;
export const CENTER_W = GAME_W - 400;
export const GRID_LEFT = CENTER_LEFT + (CENTER_W - GRID_TOTAL_W) / 2;
export const GRID_TOP = 50;

// ==================== 道具牌格布局 ====================
export const ITEM_SLOT_COUNT = 5;
export const ITEM_SLOT_W = 80;
export const ITEM_SLOT_H = 90;
export const ITEM_SLOT_GAP = 8;
export const ITEM_TOTAL_W = ITEM_SLOT_COUNT * ITEM_SLOT_W + (ITEM_SLOT_COUNT - 1) * ITEM_SLOT_GAP;
export const ITEM_START_X = (GAME_W - ITEM_TOTAL_W) / 2;
export const ITEM_Y = GAME_H - 80;

// ==================== 颜色配置 ====================
export const COLOR = {
  BG_DARK: 0x1a1c20,
  GRID_NORMAL: 0x2d3035,
  GRID_NORMAL_BORDER: 0x4a5058,
  GRID_PLAYER: 0x3a3520,
  GRID_PLAYER_BORDER: 0xf5c86a,
  GRID_TARGET: 0x4a2020,
  GRID_TARGET_BORDER: 0xff4444,
  CARD_PLAYER: 0x2a4a6b,
  CARD_PLAYER_BORDER: 0x5b9bd5,
  CARD_MONSTER: 0x4a1a1a,
  CARD_MONSTER_BORDER: 0xc0392b,
  CARD_HELP: 0x1a3a28,
  CARD_HELP_BORDER: 0x27ae60,
  PANEL_BG: 0x252830,
  PANEL_BORDER: 0x3a3d44,
  SLOT_EMPTY: 0x1e2025,
  SLOT_BORDER: 0x3a3d44,
  SLOT_FILLED: 0x1a2a1a,
  SLOT_FILLED_BORDER: 0x27ae60,
  OVERLAY_BG: 0x000000,
  TEXT_PRIMARY: "#e0d8c0",
  TEXT_GOLD: "#f5c86a",
  TEXT_DIM: "#7a7e85",
  TEXT_DANGER: "#e74c3c",
  TEXT_HEAL: "#2ecc71",
  TEXT_DAMAGE: "#e67e22",
  QUALITY_COLORS: { 白: "#bdc3c7", 蓝: "#3498db", 金: "#f5c86a", 红: "#e74c3c" },
};

// ==================== 坐标工具函数 ====================

/** 根据九宫格格号 (1-9) 计算格子中心坐标 */
export function getGridCenter(gridNum) {
  const idx = gridNum - 1;
  return {
    x: GRID_LEFT + (idx % GRID_COLS) * (CELL_W + CELL_GAP) + CELL_W / 2,
    y: GRID_TOP + Math.floor(idx / GRID_COLS) * (CELL_H + CELL_GAP) + CELL_H / 2,
  };
}

/** 根据道具牌格索引 (0-4) 计算格子中心坐标 */
export function getItemSlotCenter(index) {
  return {
    x: ITEM_START_X + index * (ITEM_SLOT_W + ITEM_SLOT_GAP) + ITEM_SLOT_W / 2,
    y: ITEM_Y,
  };
}
