// ==================== 深入地牢 — 游戏数据定义 ====================
// 所有卡牌、节点配置、常量数据集中管理

// ==================== 品质与概率 ====================

export const QUALITY = {
  WHITE: "白",
  BLUE: "蓝",
  GOLD: "金",
  RED: "红",
};

export const QUALITY_PROB = {
  白: 0.65,
  蓝: 0.30,
  金: 0.05,
  红: 0.00,
};

// 帮助卡选择时品质概率（白 65% / 蓝 30% / 金 5% / 红 0%）
// 红色仅通过特定遗物效果加入

// ==================== 帮助卡组容量 ====================
export const HELP_DECK_CAPACITY = { 1: 12, 2: 18, 3: 24 };

// ==================== 玩家初始数据 ====================

export const PLAYER_INIT = {
  name: "兵大哥",
  hp: 8,
  maxHp: 8,
  attack: 3,
  baseAttack: 3,
  defense: 1,
  baseDefense: 1,
  gold: 0,
};

// 初始帮助卡组
export const INITIAL_HELP_DECK = [
  { name: "恢复药水", quantity: 3 },
  { name: "普通宝箱卡", quantity: 1 },
  { name: "属性提升卡", quantity: 1 },
  { name: "暴力卡", quantity: 1 },
  { name: "飞刀", quantity: 2 },
];

// ==================== 怪物定义（第一层 — 无词条版本） ====================

export const MONSTERS = {
  // 等级 1
  skeleton: {
    name: "骷髅",
    hp: 6,
    attack: 2,
    defense: 0,
    traits: [],
    level: 1,
    goldDrop: 10,
  },
  // 等级 2
  armoredSkeleton: {
    name: "带甲骷髅",
    hp: 8,
    attack: 3,
    defense: 1,
    traits: [],
    level: 2,
    goldDrop: 10,
  },
};

// 后续含词条怪物（阶段四启用）
export const MONSTERS_ADVANCED = {
  flagSkeleton: {
    name: "旗兵骷髅",
    hp: 8,
    attack: 3,
    defense: 2,
    traits: ["鼓舞"],
    level: 3,
    goldDrop: 10,
  },
  revengeSkeleton: {
    name: "复仇骷髅",
    hp: 7,
    attack: 4,
    defense: 0,
    traits: ["复仇"],
    level: 3,
    goldDrop: 10,
  },
  trackerSkeleton: {
    name: "追踪者骷髅",
    hp: 10,
    attack: 5,
    defense: 1,
    traits: ["好战"],
    level: 4,
    goldDrop: 10,
  },
  ambushSkeleton: {
    name: "伏击者骷髅",
    hp: 8,
    attack: 4,
    defense: 1,
    traits: ["伏击"],
    level: 4,
    goldDrop: 10,
  },
  armoredSkeleton2: {
    name: "武装骷髅",
    hp: 10,
    attack: 4,
    defense: 3,
    traits: ["破甲"],
    level: 4,
    goldDrop: 10,
  },
};

// 精英怪物
export const ELITE_MONSTER = {
  name: "多手",
  hp: 30,
  attack: 10,
  defense: 0,
  traits: ["紧握"],
  level: "精英",
  goldDrop: 10,
  eliteDrop: ["蓝色宝箱卡", "金币卡", "属性提升卡"],
};

// 层主
export const BOSS_MONSTER = {
  name: "大骷髅老爷",
  hp: 50,
  attack: 4,
  defense: 3,
  traits: ["散子"],
  level: "层主",
  goldDrop: 10,
  bossDrop: ["金色宝箱卡", "金币卡", "金币卡", "属性提升卡"],
};

// ==================== 帮助卡定义（全部 10 种） ====================

export const HELP_CARDS = {
  恢复药水: {
    name: "恢复药水",
    quality: "白",
    effectType: "heal",
    effectDesc: "恢复 10 点生命",
    amount: 10,
  },
  庇佑魔法卡: {
    name: "庇佑魔法卡",
    quality: "白",
    effectType: "shield",
    effectDesc: "下次受伤变为 0",
  },
  飞刀: {
    name: "飞刀",
    quality: "白",
    effectType: "flyingDagger",
    effectDesc: "对目标怪物造成 6 点伤害",
    amount: 6,
  },
  暴力卡: {
    name: "暴力卡",
    quality: "白",
    effectType: "violence",
    effectDesc: "攻击翻倍，战斗一次后复原",
    multiplier: 2,
  },
  属性提升卡: {
    name: "属性提升卡",
    quality: "蓝",
    effectType: "attributeBoost",
    effectDesc: "选一项：攻+1 / 防+1 / 血+2",
  },
  金币卡: {
    name: "金币卡",
    quality: "蓝",
    effectType: "goldGain",
    effectDesc: "获得 50 金币",
    amount: 50,
  },
  食品卡: {
    name: "食品卡",
    quality: "蓝",
    effectType: "fullHeal",
    effectDesc: "血量回满",
  },
  普通宝箱卡: {
    name: "普通宝箱卡",
    quality: "蓝",
    effectType: "chest_normal",
    effectDesc: "三选一遗物（白65%/蓝30%/金5%）",
    chestProbs: { 白: 0.65, 蓝: 0.30, 金: 0.05 },
  },
  蓝色宝箱卡: {
    name: "蓝色宝箱卡",
    quality: "金",
    effectType: "chest_blue",
    effectDesc: "三选一遗物（白30%/蓝50%/金20%）",
    chestProbs: { 白: 0.30, 蓝: 0.50, 金: 0.20 },
  },
  金色宝箱卡: {
    name: "金色宝箱卡",
    quality: "红",
    effectType: "chest_gold",
    effectDesc: "三选一遗物（蓝50%/金50%）",
    chestProbs: { 蓝: 0.50, 金: 0.50 },
  },
};

// 帮助卡按品质分组（用于随机生成）
export const HELP_CARDS_BY_QUALITY = { 白: [], 蓝: [], 金: [], 红: [] };
for (const [key, card] of Object.entries(HELP_CARDS)) {
  HELP_CARDS_BY_QUALITY[card.quality].push(key);
}

// ==================== 遗物定义（阶段四完整实现，阶段三仅存储） ====================

export const RELICS = {
  村好剑: { name: "村好剑", quality: "初始", atk: 1, effect: "攻+1，击败精英/层主时攻永久+2" },
  活着的肉: { name: "活着的肉", quality: "白", atk: 1, effect: "攻+1，每3关攻额外+1", perNodeAtk: 1, perNodeInterval: 3 },
  木盾: { name: "木盾", quality: "白", def: 2, effect: "防+2（木套组件）", set: "木套" },
  木剑: { name: "木剑", quality: "白", atk: 2, effect: "攻+2（木套组件）", set: "木套" },
  木甲: { name: "木甲", quality: "白", maxHp: 8, effect: "血上限+8（木套组件）", set: "木套" },
  幸运硬币: { name: "幸运硬币", quality: "白", effect: "击败精英/层主获25金币", eliteGold: 25 },
  铁盾: { name: "铁盾", quality: "蓝", def: 4, effect: "防+4" },
  锐利长剑: { name: "锐利长剑", quality: "蓝", atk: 4, effect: "攻+4" },
  活力护符: { name: "活力护符", quality: "蓝", maxHp: 6, healPerNode: 6, effect: "血上限+6，每关结束回6血" },
  荆棘甲: { name: "荆棘甲", quality: "蓝", def: 2, thornDmg: 2, effect: "防+2，每次战斗额外造成2伤害" },
  嗜血之牙: { name: "嗜血之牙", quality: "蓝", atk: 2, healOnKill: 2, effect: "攻+2，击杀怪物回2血" },
  金剑: { name: "金剑", quality: "金", atk: 8, effect: "攻+8" },
  龙鳞甲: { name: "龙鳞甲", quality: "金", def: 5, maxHp: 10, effect: "防+5，血上限+10" },
  金色宝箱: { name: "金色宝箱", quality: "金", effect: "加入一张金色宝箱卡到帮助卡组", addCard: "金色宝箱卡" },
  狂战士斧: { name: "狂战士斧", quality: "金", atk: 4, lowHpAtkDouble: true, effect: "攻+4，血<50%时攻击翻倍" },
  凤凰羽毛: { name: "凤凰羽毛", quality: "金", effect: "致命伤时回50%血并移除", deathSave: 0.5 },
};

// 套装定义
export const RELIC_SETS = {
  木套: { name: "木套", pieces: ["木盾", "木剑", "木甲"], bonus: { atk: 2, def: 2, maxHp: 8 } },
};

// 遗物按品质分组
export const RELICS_BY_QUALITY = { 白: [], 蓝: [], 金: [] };
for (const [key, relic] of Object.entries(RELICS)) {
  if (relic.quality !== "初始") {
    RELICS_BY_QUALITY[relic.quality].push(key);
  }
}

// ==================== 第一层节点配置 ====================

/**
 * 获取指定节点的恶魔卡组配置
 * 算法：总数 = 9 + nodeNum，按等级范围随机，最高等级补差
 */
export function getNodeConfig(nodeNum) {
  const total = 9 + nodeNum;

  // 各等级数量范围定义
  let levelRanges;

  if (nodeNum === 1) {
    levelRanges = [{ level: 1, min: 6, max: 8 }, { level: 2, min: 2, max: 4 }];
  } else if (nodeNum === 2) {
    levelRanges = [{ level: 1, min: 5, max: 7 }, { level: 2, min: 3, max: 5 }];
  } else if (nodeNum === 3) {
    levelRanges = [
      { level: 1, min: 2, max: 4 },
      { level: 2, min: 3, max: 5 },
      { level: 3, min: 2, max: 4 },
    ];
  } else if (nodeNum === 4) {
    levelRanges = [
      { level: 1, min: 1, max: 3 },
      { level: 2, min: 3, max: 7 },
      { level: 3, min: 3, max: 6 },
    ];
  } else if (nodeNum === 5) {
    // 精英节点
    return {
      isElite: true,
      eliteMonster: { ...ELITE_MONSTER },
      monsters: generateNodeMinions(5, total - 1), // 基础怪物 + 精英
      total,
    };
  } else if (nodeNum === 6) {
    levelRanges = [
      { level: 1, min: 0, max: 1 },
      { level: 2, min: 2, max: 5 },
      { level: 3, min: 3, max: 6 },
      { level: 4, min: 1, max: 5 },
    ];
  } else if (nodeNum === 7) {
    levelRanges = [
      { level: 2, min: 1, max: 4 },
      { level: 3, min: 3, max: 8 },
      { level: 4, min: 3, max: 6 },
    ];
  } else if (nodeNum === 8) {
    levelRanges = [
      { level: 2, min: 1, max: 4 },
      { level: 3, min: 3, max: 10 },
      { level: 4, min: 3, max: 8 },
    ];
  } else if (nodeNum === 9) {
    // 层主节点
    return {
      isBoss: true,
      bossMonster: { ...BOSS_MONSTER },
      monsters: generateNodeMinions(9, total - 1), // 基础怪物 + 层主
      total,
    };
  } else {
    levelRanges = [{ level: 1, min: 1, max: 1 }];
  }

  const monsters = generateNodeMinions(nodeNum, total);
  return { monsters, total, isElite: false, isBoss: false };
}

function generateNodeMinions(nodeNum, total) {
  const levelPool = {
    1: [{ ...MONSTERS.skeleton }],
    2: [{ ...MONSTERS.armoredSkeleton }],
    3: [
      { ...MONSTERS_ADVANCED.flagSkeleton },
      { ...MONSTERS_ADVANCED.revengeSkeleton },
    ],
    4: [
      { ...MONSTERS_ADVANCED.trackerSkeleton },
      { ...MONSTERS_ADVANCED.ambushSkeleton },
      { ...MONSTERS_ADVANCED.armoredSkeleton2 },
    ],
  };

  // 简化的等级分配（阶段三先不做随机，按固定比例分配）
  // 后续可升级为文档中的随机范围算法
  let levelCounts;
  if (nodeNum <= 2) {
    const l1 = Math.floor(total * 0.6);
    const l2 = total - l1;
    levelCounts = { 1: l1, 2: l2 };
  } else if (nodeNum <= 4) {
    const l1 = Math.floor(total * 0.3);
    const l2 = Math.floor(total * 0.4);
    const l3 = total - l1 - l2;
    levelCounts = { 1: l1, 2: l2, 3: l3 };
  } else {
    const l2 = Math.floor(total * 0.3);
    const l3 = Math.floor(total * 0.4);
    const l4 = total - l2 - l3;
    levelCounts = { 2: l2, 3: l3, 4: l4 };
  }

  const monsters = [];
  for (const [level, count] of Object.entries(levelCounts)) {
    const pool = levelPool[level] || levelPool[1];
    for (let i = 0; i < count; i++) {
      const template = pool[i % pool.length];
      monsters.push({
        ...template,
        id: `${template.name}_${level}_${i}`,
      });
    }
  }

  return monsters;
}
