// ============================================================
// 深入地牢 - 常量与卡牌数据定义
// ============================================================

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// 网格配置
export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const CARD_W = 128;
export const CARD_H = 180;
export const CARD_GAP = 14;
export const GRID_X = (GAME_WIDTH - (GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP)) / 2;
export const GRID_Y = (GAME_HEIGHT - (GRID_ROWS * CARD_H + (GRID_ROWS - 1) * CARD_GAP)) / 2 + 10;
export const PLAYER_START_CELL = 7; // 0-indexed, 第8格

// 颜色
export const COLORS = {
  bg: 0x12101e,
  panelBg: 0x1c1930,
  panelBorder: 0x3a3460,
  cardBack: 0x2a2545,
  cardBackBorder: 0x4a4475,
  cardBackPattern: 0x3a3560,
  playerCard: 0x1a5fb4,
  playerBorder: 0x3584e4,
  monsterCard: 0xa51d2d,
  monsterBorder: 0xe66100,
  trapCard: 0xc64600,
  trapBorder: 0xe5a50a,
  itemCard: 0x1a8a5a,
  itemBorder: 0x33d17a,
  goldCard: 0xb8860b,
  goldBorder: 0xf5c211,
  treasureCard: 0x613583,
  treasureBorder: 0x9141ac,
  foodCard: 0xd4145a,
  foodBorder: 0xf66151,
  shopCard: 0x2a9d8f,
  shopBorder: 0x43b89c,
  mentorCard: 0x6c5ce7,
  mentorBorder: 0xa29bfe,
  attributeCard: 0x0984e3,
  attributeBorder: 0x74b9ff,
  emptyCell: 0x18152a,
  emptyCellBorder: 0x2a2550,
  highlight: 0xf5c211,
  danger: 0xe01b24,
  success: 0x33d17a,
  textWhite: '#ffffff',
  textGray: '#a0a0b8',
  textGold: '#f5c211',
  textRed: '#ff6b6b',
  textGreen: '#33d17a',
  textBlue: '#62b6ff',
  textOrange: '#ffa348',
  hpBar: 0xe01b24,
  hpBarBg: 0x3d1520,
};

// 卡牌类型
export const CARD_TYPES = {
  PLAYER: 'player',
  MONSTER: 'monster',
  TRAP: 'trap',
  ITEM: 'item',
  GOLD: 'gold',
  TREASURE: 'treasure',
  FOOD: 'food',
  SHOP: 'shop',
  MENTOR: 'mentor',
  ATTRIBUTE: 'attribute',
};

// 词条类型
export const TRAITS = {
  // 怪物词条
  INSPIRE: 'inspire',      // 鼓舞
  REVENGE: 'revenge',      // 复仇
  WARLIKE: 'warlike',      // 好战
  AMBUSH: 'ambush',        // 伏击
  ARMOR_BREAK: 'armor_break', // 破甲
  SPAWNER: 'spawner',      // 散子
  GRIP: 'grip',            // 紧握
  // 玩家词条
  THORNS: 'thorns',        // 刺皮
  THICK_HIDE: 'thick_hide', // 硬皮
  VETERAN: 'veteran',      // 历战
  // 通用
  FIRST_STRIKE: 'first_strike', // 先攻
};

export const TRAIT_NAMES = {
  [TRAITS.INSPIRE]: '鼓舞',
  [TRAITS.REVENGE]: '复仇',
  [TRAITS.WARLIKE]: '好战',
  [TRAITS.AMBUSH]: '伏击',
  [TRAITS.ARMOR_BREAK]: '破甲',
  [TRAITS.SPAWNER]: '散子',
  [TRAITS.GRIP]: '紧握',
  [TRAITS.THORNS]: '刺皮',
  [TRAITS.THICK_HIDE]: '硬皮',
  [TRAITS.VETERAN]: '历战',
  [TRAITS.FIRST_STRIKE]: '先攻',
};

export const TRAIT_DESCRIPTIONS = {
  [TRAITS.INSPIRE]: '场上所有其他怪物卡攻击+1',
  [TRAITS.REVENGE]: '每次有怪物被消灭，此卡攻击+2',
  [TRAITS.WARLIKE]: '翻开时，每3次玩家行动向玩家移动一格并互动',
  [TRAITS.AMBUSH]: '翻开时若玩家相邻则立即互动一次',
  [TRAITS.ARMOR_BREAK]: '每次互动降低玩家1点防御（房间内）',
  [TRAITS.SPAWNER]: '每损失10HP召唤一个骷髅到相邻格',
  [TRAITS.GRIP]: '玩家相邻时只能与此卡互动',
  [TRAITS.THORNS]: '被攻击时反弹等同于攻击者攻击力的伤害',
  [TRAITS.THICK_HIDE]: '最大生命+10，清房后恢复10HP',
  [TRAITS.VETERAN]: '每次互动敌人+1攻击，换敌重置',
  [TRAITS.FIRST_STRIKE]: '先手造成伤害',
};

// 道具卡定义
export const ITEMS = {
  HOOK_ROPE: {
    id: 'hook_rope', name: '勾绳',
    desc: '拖到任意非玩家卡牌上，选择方向移动该卡到相邻格',
    color: 0x8b6914,
  },
  HEALING_POTION: {
    id: 'healing_potion', name: '恢复药水',
    desc: '恢复10点生命值',
    healAmount: 10,
    color: 0xe01b24,
  },
  THROWING_KNIFE: {
    id: 'throwing_knife', name: '飞刀',
    desc: '对怪物卡造成6点伤害',
    color: 0x888888,
  },
  BLESSING: {
    id: 'blessing', name: '庇佑魔法',
    desc: '下次受到的伤害变为0',
    color: 0xf5c211,
  },
  FLIP_CARD: {
    id: 'flip_card', name: '翻转卡',
    desc: '交换一张正面非玩家卡与一张背面卡',
    color: 0x6c5ce7,
  },
  LIGHT_CARD: {
    id: 'light_card', name: '照明卡',
    desc: '翻开目标格所有正交相邻格的顶卡',
    color: 0xffd700,
  },
  VIOLENCE_CARD: {
    id: 'violence_card', name: '暴力卡',
    desc: '攻击翻倍，一次怪物互动后恢复',
    color: 0xc0392b,
  },
  FIRST_STRIKE_CARD: {
    id: 'first_strike_card', name: '先攻卡',
    desc: '本房间获得先攻词条',
    color: 0x3498db,
  },
};

export const ITEM_LIST = Object.values(ITEMS);

// 怪物定义 (第一层 - 骷髅主题)
export const MONSTERS = {
  skeleton: {
    id: 'skeleton', name: '骷髅',
    hp: 6, atk: 2, def: 0, trait: null, level: 1,
  },
  armored_skeleton: {
    id: 'armored_skeleton', name: '带甲骷髅',
    hp: 8, atk: 3, def: 1, trait: null, level: 2,
  },
  banner_skeleton: {
    id: 'banner_skeleton', name: '旗兵骷髅',
    hp: 8, atk: 3, def: 2, trait: TRAITS.INSPIRE, level: 3,
  },
  revenge_skeleton: {
    id: 'revenge_skeleton', name: '复仇骷髅',
    hp: 7, atk: 4, def: 0, trait: TRAITS.REVENGE, level: 3,
  },
  tracker_skeleton: {
    id: 'tracker_skeleton', name: '追踪者骷髅',
    hp: 10, atk: 5, def: 1, trait: TRAITS.WARLIKE, level: 4,
  },
  ambusher_skeleton: {
    id: 'ambusher_skeleton', name: '伏击者骷髅',
    hp: 8, atk: 4, def: 1, trait: TRAITS.AMBUSH, level: 4,
  },
  armed_skeleton: {
    id: 'armed_skeleton', name: '武装骷髅',
    hp: 10, atk: 4, def: 3, trait: TRAITS.ARMOR_BREAK, level: 4,
  },
  boss_big_lord: {
    id: 'boss_big_lord', name: '大骷髅老爷',
    hp: 50, atk: 4, def: 3, trait: TRAITS.SPAWNER, level: 99,
    isBoss: true,
  },
  many_hands: {
    id: 'many_hands', name: '多手',
    hp: 30, atk: 10, def: 0, trait: TRAITS.GRIP, level: 4,
  },
};

// 按等级分组的怪物
export const MONSTERS_BY_LEVEL = {
  1: ['skeleton'],
  2: ['armored_skeleton'],
  3: ['banner_skeleton', 'revenge_skeleton'],
  4: ['tracker_skeleton', 'ambusher_skeleton', 'armed_skeleton'],
};

// 每节点怪物配置 (floor 1)
// 格式: { total, levels: { level: [min, max] } }
// total 为基础数量，实际总数 = total + (floor - 1)，由 GameState 动态计算
export const NODE_MONSTER_CONFIG = [
  { total: 10, levels: { 1: [6, 7], 2: [2, 3] } },                  // Node 1 = 奖励房(战斗+奖励)
  { total: 10, levels: { 1: [5, 6], 2: [3, 4] } },                  // Node 2
  { total: 10, levels: { 1: [2, 3], 2: [3, 4], 3: [2, 3] } },      // Node 3
  { total: 10, levels: { 1: [1, 2], 2: [3, 4], 3: [3, 4] } },      // Node 4
  { total: 10, levels: { 1: [1, 1], 2: [3, 4], 3: [3, 4], 4: [1, 1] } }, // Node 5
  { total: 10, levels: { 1: [0, 1], 2: [2, 3], 3: [3, 4], 4: [1, 4] } }, // Node 6
  { total: 10, levels: { 2: [1, 2], 3: [3, 4], 4: [3, 5] } },      // Node 7 (通向餐厅)
  null, // Node 8 = 餐厅，无战斗
  { total: 10, levels: { 2: [1, 2], 3: [3, 4], 4: [3, 5] }, boss: 'boss_big_lord' }, // Node 9 (Boss)
];

// 遗物定义
export const RELICS = {
  // ── 白色被动遗物 ──
  living_flesh: {
    id: 'living_flesh', name: '活着的肉',
    desc: '攻击+1。每进入3个房间额外+1攻击',
    quality: 'white', atkBonus: 1, type: 'passive',
  },
  wooden_shield: {
    id: 'wooden_shield', name: '木盾',
    desc: '防御+2',
    quality: 'white', defBonus: 2, type: 'passive',
  },
  wooden_sword: {
    id: 'wooden_sword', name: '木剑',
    desc: '攻击+2',
    quality: 'white', atkBonus: 2, type: 'passive',
  },
  // ── 白色主动遗物 ──
  law_wand: {
    id: 'law_wand', name: '法则魔杖',
    desc: '主动：移动任意卡到任意格。每房间一次',
    quality: 'white', active: true, atkBonus: 1, type: 'active',
  },
  endless_water: {
    id: 'endless_water', name: '无尽水袋',
    desc: '主动：恢复6HP。每房间一次',
    quality: 'white', active: true, hpBonus: 4, type: 'active',
  },
  // ── 蓝色被动遗物 ──
  item_reserve: {
    id: 'item_reserve', name: '道具储备',
    desc: '进入非餐厅新房间时，额外添加2张道具卡',
    quality: 'blue', type: 'passive',
  },
  // ── 蓝色主动遗物 ──
  blood_shield: {
    id: 'blood_shield', name: '血盾',
    desc: '主动：本房间防御+2。每移除一张怪物卡刷新CD',
    quality: 'blue', active: true, defBonus: 2, type: 'active',
  },
  // ── 金色被动遗物（预留）─
  // ── 金色主动遗物（预留）─
  // ── 初始遗物 ─
  village_sword: {
    id: 'village_sword', name: '村好剑',
    desc: '攻击+1。击败精英/Boss永久+2攻击',
    quality: 'starter', atkBonus: 1, isStarter: true, type: 'passive',
  },
};

// 按品质分组的遗物（用于宝箱随机）
export const RELICS_BY_QUALITY = {
  white: Object.keys(RELICS).filter(k => RELICS[k].quality === 'white'),
  blue: Object.keys(RELICS).filter(k => RELICS[k].quality === 'blue'),
  gold: Object.keys(RELICS).filter(k => RELICS[k].quality === 'gold'),
};

// 宝箱品质概率配置
export const TREASURE_QUALITY_ROLL = {
  normal: { white: 0.65, blue: 0.30, gold: 0.05 },
  blue:   { white: 0.30, blue: 0.50, gold: 0.20 },
  gold:   { white: 0.00, blue: 0.50, gold: 0.50 },
};

// 商店商品列表（设计文档价格）
export const SHOP_ITEMS = [
  { id: 'atk_up', name: '攻击+1', cost: 80, effect: 'atk+1' },
  { id: 'def_up', name: '防御+1', cost: 80, effect: 'def+1' },
  { id: 'hp_up', name: '生命+2', cost: 80, effect: 'hp+2' },
  { id: 'buy_item', name: '随机道具', cost: 30, effect: 'random_item' },
  { id: 'buy_treasure', name: '普通宝箱', cost: 160, effect: 'treasure' },
];

// 职业定义
export const CLASSES = {
  soldier: {
    id: 'soldier', name: '兵大哥',
    hp: 8, atk: 3, def: 1,
    startRelic: 'village_sword',
    desc: '标准战士，平衡的属性',
  },
};

// 房间类型
export const ROOM_TYPES = {
  REWARD: 'reward',         // 奖励房
  GOLD: 'gold',             // 金币房
  TREASURE: 'treasure',     // 宝箱房
  ATTRIBUTE: 'attribute',   // 属性房
  SHOP: 'shop',             // 商店
  RESTAURANT: 'restaurant', // 餐厅
  NORMAL: 'normal',         // 普通战斗
  ELITE: 'elite',           // 精英战斗
  BOSS: 'boss',             // Boss战斗
};

export const ROOM_NAMES = {
  [ROOM_TYPES.REWARD]: '奖励房',
  [ROOM_TYPES.GOLD]: '金币房',
  [ROOM_TYPES.TREASURE]: '宝箱房',
  [ROOM_TYPES.ATTRIBUTE]: '属性房',
  [ROOM_TYPES.SHOP]: '商店',
  [ROOM_TYPES.RESTAURANT]: '餐厅',
  [ROOM_TYPES.NORMAL]: '普通战斗',
  [ROOM_TYPES.ELITE]: '精英战斗',
  [ROOM_TYPES.BOSS]: 'Boss战',
};

// 节点固定配置
// Node 1: 奖励房, Node 8: 餐厅, Node 9: Boss
// Nodes 1-3: 可选 金币/宝箱/属性
// Nodes 4-6: 可选 金币/宝箱/属性/商店/精英
// Node 7: 通向餐厅

export const NODE_FIXED = {
  1: ROOM_TYPES.REWARD,
  8: ROOM_TYPES.RESTAURANT,
  9: ROOM_TYPES.BOSS,
};

export const NODE_CHOICES_EARLY = [
  ROOM_TYPES.GOLD, ROOM_TYPES.TREASURE, ROOM_TYPES.ATTRIBUTE,
];

export const NODE_CHOICES_LATE = [
  ROOM_TYPES.GOLD, ROOM_TYPES.TREASURE, ROOM_TYPES.ATTRIBUTE,
  ROOM_TYPES.SHOP, ROOM_TYPES.ELITE,
];

// 地图节点布局位置 (for map scene)
export const MAP_NODES = [
  { x: 0.15, y: 0.80 }, // Node 1
  { x: 0.25, y: 0.60 }, // Node 2
  { x: 0.15, y: 0.40 }, // Node 3
  { x: 0.35, y: 0.55 }, // Node 4
  { x: 0.50, y: 0.40 }, // Node 5
  { x: 0.45, y: 0.65 }, // Node 6
  { x: 0.65, y: 0.50 }, // Node 7
  { x: 0.80, y: 0.60 }, // Node 8
  { x: 0.90, y: 0.45 }, // Node 9
];

// 辅助函数
export function getAdjacentCells(cellIndex) {
  const row = Math.floor(cellIndex / 3);
  const col = cellIndex % 3;
  const adj = [];
  if (row > 0) adj.push(cellIndex - 3); // up
  if (row < 2) adj.push(cellIndex + 3); // down
  if (col > 0) adj.push(cellIndex - 1); // left
  if (col < 2) adj.push(cellIndex + 1); // right
  return adj;
}

export function getCellPos(cellIndex) {
  const row = Math.floor(cellIndex / 3);
  const col = cellIndex % 3;
  return {
    x: GRID_X + col * (CARD_W + CARD_GAP) + CARD_W / 2,
    y: GRID_Y + row * (CARD_H + CARD_GAP) + CARD_H / 2,
  };
}

export function getCellFromPos(x, y) {
  for (let i = 0; i < 9; i++) {
    const pos = getCellPos(i);
    const left = pos.x - CARD_W / 2;
    const right = pos.x + CARD_W / 2;
    const top = pos.y - CARD_H / 2;
    const bottom = pos.y + CARD_H / 2;
    if (x >= left && x <= right && y >= top && y <= bottom) {
      return i;
    }
  }
  return -1;
}

export function isOrthogonallyAdjacent(a, b) {
  return getAdjacentCells(a).includes(b);
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
