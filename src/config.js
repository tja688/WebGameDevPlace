// 深入地牢 — 全局配置与色卡

export const COLORS = {
  bg: 0x151618,
  panel: 0x202326,
  panelSoft: 0x292d31,
  text: 0xf2eee7,
  muted: 0xaeb5b6,
  line: 0x3a4045,
  gold: 0xf5c86a,
  red: 0xe76457,
  teal: 0x52c6b8,
  blue: 0x74a8ff,
  purple: 0x9b72cf,
  green: 0x7ec86a,
  ink: 0x0f1113,
  darkGold: 0x8a7440,
  orange: 0xd98e3e,
  white: 0xffffff,
  black: 0x000000,
};

export const COLOR_NAMES = {
  bg: '#151618',
  panel: '#202326',
  panelSoft: '#292d31',
  text: '#f2eee7',
  muted: '#aeb5b6',
  line: '#3a4045',
  gold: '#f5c86a',
  red: '#e76457',
  teal: '#52c6b8',
  blue: '#74a8ff',
  purple: '#9b72cf',
  green: '#7ec86a',
  ink: '#0f1113',
  darkGold: '#8a7440',
  orange: '#d98e3e',
};

// 对象类型对应的颜色
export const TYPE_COLORS = {
  player: COLORS.teal,
  monster: COLORS.red,
  elite: COLORS.red,
  boss: COLORS.red,
  chest: COLORS.gold,
  goldCard: COLORS.gold,
  item: COLORS.blue,
  trap: COLORS.orange,
  food: COLORS.green,
  mentor: COLORS.purple,
  shop: COLORS.gold,
  attrUp: COLORS.green,
  empty: COLORS.muted,
};

export const FONT = {
  family: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
  sizeSmall: '14px',
  sizeNormal: '18px',
  sizeLarge: '24px',
  sizeTitle: '36px',
  sizeHuge: '48px',
};

export const GAME_CONFIG = {
  width: 1280,
  height: 720,
  gridRows: 3,
  gridCols: 3,
  cellSize: 120,
  gridGap: 16,
  cardWidth: 100,
  cardHeight: 100,
  totalLayers: 3,
  nodesPerLayer: 9,
  playerStartIndex: 7, // 格8，0-based index
};

export const DIRECTIONS = [
  { dx: 0, dy: -1 }, // 上
  { dx: 1, dy: 0 },  // 右
  { dx: 0, dy: 1 },  // 下
  { dx: -1, dy: 0 }, // 左
];

export function hexToString(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

export function getGridX(col, centerX = GAME_CONFIG.width / 2) {
  const totalWidth = GAME_CONFIG.gridCols * GAME_CONFIG.cellSize + (GAME_CONFIG.gridCols - 1) * GAME_CONFIG.gridGap;
  return centerX - totalWidth / 2 + col * (GAME_CONFIG.cellSize + GAME_CONFIG.gridGap) + GAME_CONFIG.cellSize / 2;
}

export function getGridY(row, centerY = GAME_CONFIG.height / 2 - 20) {
  const totalHeight = GAME_CONFIG.gridRows * GAME_CONFIG.cellSize + (GAME_CONFIG.gridRows - 1) * GAME_CONFIG.gridGap;
  return centerY - totalHeight / 2 + row * (GAME_CONFIG.cellSize + GAME_CONFIG.gridGap) + GAME_CONFIG.cellSize / 2;
}

export function indexToRowCol(index) {
  return { row: Math.floor(index / 3), col: index % 3 };
}

export function rowColToIndex(row, col) {
  return row * 3 + col;
}

export function getAdjacentIndices(index) {
  const { row, col } = indexToRowCol(index);
  const adj = [];
  for (const d of DIRECTIONS) {
    const nr = row + d.dy;
    const nc = col + d.dx;
    if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
      adj.push(rowColToIndex(nr, nc));
    }
  }
  return adj;
}
