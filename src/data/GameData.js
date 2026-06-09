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
  name: "小鬼",
  hp: 10,
  maxHp: 10,
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
  { name: "飞刀", quantity: 3 },
];

// ==================== 怪物定义 ====================

export const MONSTERS = {
  // === 等级 1 — 扑克幼崽系列 ===
  colorless: {
    name: "无色卡", hp: 6, attack: 2, defense: 0,
    traits: [], level: 1, goldDrop: 5,
  },
  spade2: {
    name: "黑桃2", hp: 4, attack: 2, defense: 0,
    traits: ["黑桃幼崽"], level: 1, goldDrop: 5,
  },
  heart2: {
    name: "红桃2", hp: 6, attack: 2, defense: 0,
    traits: ["红桃幼崽"], level: 1, goldDrop: 5,
  },
  diamond2: {
    name: "方块2", hp: 4, attack: 2, defense: 0,
    traits: ["方块幼崽"], level: 1, goldDrop: 5,
  },
  club2: {
    name: "梅花2", hp: 4, attack: 2, defense: 0,
    traits: ["梅花幼崽", "先攻"], level: 1, goldDrop: 5,
  },
  // === 等级 2 — 扑克进阶系列 ===
  spade3: {
    name: "黑桃3", hp: 9, attack: 3, defense: 1,
    traits: ["破防专家"], level: 2, goldDrop: 5,
  },
  heart3: {
    name: "红桃3", hp: 12, attack: 3, defense: 1,
    traits: ["爱之躯"], level: 2, goldDrop: 5,
  },
  diamond3: {
    name: "方块3", hp: 9, attack: 1, defense: 3,
    traits: ["尖盾"], level: 2, goldDrop: 5,
  },
  club3: {
    name: "梅花3", hp: 9, attack: 3, defense: 1,
    traits: ["叫人！"], level: 2, goldDrop: 5,
  },
  // === 等级 3 — 扑克进阶系列 ===
  spade4: {
    name: "黑桃4", hp: 16, attack: 4, defense: 2,
    traits: ["复仇"], level: 3, goldDrop: 5,
  },
  heart4: {
    name: "红桃4", hp: 20, attack: 4, defense: 2,
    traits: ["医疗兵"], level: 3, goldDrop: 5,
  },
  diamond4: {
    name: "方块4", hp: 16, attack: 2, defense: 4,
    traits: ["防护光环"], level: 3, goldDrop: 5,
  },
  club4: {
    name: "梅花4", hp: 16, attack: 4, defense: 2,
    traits: ["不休追击"], level: 3, goldDrop: 5,
  },
  // === 等级 4 — 扑克高阶系列 ===
  spade5: {
    name: "黑桃5", hp: 25, attack: 5, defense: 3,
    traits: ["侧方打击"], level: 4, goldDrop: 5,
  },
  heart5: {
    name: "红桃5", hp: 30, attack: 5, defense: 3,
    traits: ["红桃之母"], level: 4, goldDrop: 5,
  },
  diamond5: {
    name: "方块5", hp: 25, attack: 3, defense: 5,
    traits: ["牢不可破"], level: 4, goldDrop: 5,
  },
  club5: {
    name: "梅花5", hp: 25, attack: 5, defense: 3,
    traits: ["竖向拉杆"], level: 4, goldDrop: 5,
  },
};

// 精英怪物
export const ELITE_MONSTER = {
  name: "黑桃A", hp: 44, attack: 1, defense: 1,
  traits: ["决斗", "战舞"],
  level: "精英", goldDrop: 5,
  eliteDrop: ["蓝色宝箱卡", "金币卡", "属性提升卡"],
};

// 层主
export const BOSS_MONSTER = {
  name: "黑桃J", hp: 121, attack: 11, defense: 0,
  traits: ["暴力", "黑桃皇室"],
  level: "层主", goldDrop: 5,
  bossDrop: ["金色宝箱卡", "金币卡", "金币卡", "属性提升卡"],
};

// ==================== 帮助卡定义（全部 20 种） ====================

export const HELP_CARDS = {
  // === 白色 ===
  恢复药水: {
    name: "恢复药水", quality: "白", effectType: "heal", price: 30,
    effectDesc: "恢复 10 点生命，使用后永久移除", amount: 10, permanentRemove: true,
  },
  庇佑魔法卡: {
    name: "庇佑魔法卡", quality: "白", effectType: "shield", price: 20,
    effectDesc: "下次受伤变为 0，使用后永久移除", permanentRemove: true,
  },
  飞刀: {
    name: "飞刀", quality: "白", effectType: "flyingDagger", price: 20,
    effectDesc: "对目标怪物造成 6 点伤害，使用后永久移除", amount: 6, permanentRemove: true,
  },
  火球术: {
    name: "火球术", quality: "白", effectType: "fireball", price: 30,
    effectDesc: "对目标怪物造成等于玩家攻击的伤害，使用后永久移除", permanentRemove: true,
  },
  旋转轮: {
    name: "旋转轮", quality: "白", effectType: "reverseRotation", price: 20,
    effectDesc: "除格5外逆时针旋转一格，使用后永久移除", permanentRemove: true,
  },
  暴力卡: {
    name: "暴力卡", quality: "白", effectType: "violence", price: 30,
    effectDesc: "攻击翻倍，战斗一次后复原，使用后永久移除", multiplier: 2, permanentRemove: true,
  },
  滚石: {
    name: "滚石", quality: "白", effectType: "rollingStone", price: 50,
    effectDesc: "当在九宫格上移动到格3时，移除格6的非精英/层主怪物，使用后永久移除", permanentRemove: true,
  },
  爆弹: {
    name: "爆弹", quality: "白", effectType: "bomb", price: 50,
    effectDesc: "对所有怪物造成 4 点伤害，使用后永久移除", amount: 4, permanentRemove: true,
  },
  交换卡: {
    name: "交换卡", quality: "白", effectType: "exchange", price: 50,
    effectDesc: "选择两张卡牌互换所在格位置，使用后永久移除", permanentRemove: true,
  },
  破击锤: {
    name: "破击锤", quality: "白", effectType: "armorBreak", price: 50,
    effectDesc: "将目标怪物的防御力降低 5 点，使用后永久移除", amount: 5, permanentRemove: true,
  },
  // === 蓝色 ===
  属性提升卡: {
    name: "属性提升卡", quality: "蓝", effectType: "attributeBoost", price: 100,
    effectDesc: "选一项：攻+1 / 防+1 / 血+2，使用后永久移除", permanentRemove: true,
  },
  金币卡: {
    name: "金币卡", quality: "蓝", effectType: "goldGain", price: 30,
    effectDesc: "获得 50 金币，使用后永久移除", amount: 50, permanentRemove: true,
  },
  食品卡: {
    name: "食品卡", quality: "蓝", effectType: "fullHeal", price: 50,
    effectDesc: "血量回满，使用后永久移除", permanentRemove: true,
  },
  治疗泉: {
    name: "治疗泉", quality: "蓝", effectType: "healingSpring", price: 80,
    effectDesc: "在九宫格上：移到玩家相邻格时回2血；在道具牌格：每战斗1次回1血。点击后永久移除", permanentRemove: true,
  },
  撞击教程: {
    name: "撞击教程", quality: "蓝", effectType: "ram", price: 80,
    effectDesc: "对目标怪物造成等于玩家当前血量的伤害，使用后永久移除", permanentRemove: true,
  },
  普通宝箱卡: {
    name: "普通宝箱卡", quality: "蓝", effectType: "chest_normal", price: 100,
    effectDesc: "三选一遗物（白65%/蓝30%/金5%），使用后永久移除",
    chestProbs: { 白: 0.65, 蓝: 0.30, 金: 0.05 }, permanentRemove: true,
  },
  // === 金色 ===
  蓝色宝箱卡: {
    name: "蓝色宝箱卡", quality: "金", effectType: "chest_blue", price: 150,
    effectDesc: "三选一遗物（白50%/蓝50%/金10%），使用后永久移除",
    chestProbs: { 白: 0.50, 蓝: 0.50, 金: 0.10 }, permanentRemove: true,
  },
  瞭望塔: {
    name: "瞭望塔", quality: "金", effectType: "watchtower", price: 150,
    effectDesc: "在九宫格上：移到角格时对随机怪物3伤(4次后移除)；在道具牌格：每战斗1次2伤。点击后永久移除", permanentRemove: true,
  },
  倍增塔: {
    name: "倍增塔", quality: "金", effectType: "doubleTower", price: 150,
    effectDesc: "在九宫格格1时：怪物帮助卡效果×2；在道具牌格：玩家帮助卡效果×2（触发后移除）。点击后永久移除", permanentRemove: true,
  },
  // === 红色 ===
  金色宝箱卡: {
    name: "金色宝箱卡", quality: "红", effectType: "chest_gold", price: 400,
    effectDesc: "三选一遗物（蓝50%/金50%），使用后永久移除",
    chestProbs: { 蓝: 0.50, 金: 0.50 }, permanentRemove: true,
  },
};

// 帮助卡按品质分组（用于随机生成）
export const HELP_CARDS_BY_QUALITY = { 白: [], 蓝: [], 金: [], 红: [] };
for (const [key, card] of Object.entries(HELP_CARDS)) {
  HELP_CARDS_BY_QUALITY[card.quality].push(key);
}

// ==================== 遗物定义 ====================

export const RELICS = {
  村好剑: { name: "村好剑", quality: "初始", atk: 1, effect: "攻+1，击败精英/层主时攻永久+1", eliteKillAtk: 1 },
  活着的肉: { name: "活着的肉", quality: "白", effect: "使用帮助卡时，恢复1点生命", healOnHelpUse: 1 },
  木盾: { name: "木盾", quality: "白", def: 1, effect: "防+1（木套组件）", set: "木套" },
  木剑: { name: "木剑", quality: "白", atk: 1, effect: "攻+1（木套组件）", set: "木套" },
  木甲: { name: "木甲", quality: "白", maxHp: 4, effect: "血上限+4（木套组件）", set: "木套" },
  幸运硬币: { name: "幸运硬币", quality: "白", effect: "击败精英/层主时将金币卡加入战斗卡组", spawnGoldCard: "金币卡" },
  铁盾: { name: "铁盾", quality: "蓝", def: 1, effect: "防+1，受到的所有伤害减少1点", damageReduction: 1 },
  锐利长剑: { name: "锐利长剑", quality: "蓝", atk: 1, effect: "攻+1，本关卡每击杀怪物攻+1（关卡结束复原）", killAtkStack: 1 },
  活力护符: { name: "活力护符", quality: "蓝", maxHp: 6, healPerNode: 6, effect: "血上限+6，每关结束回6血" },
  荆棘甲: { name: "荆棘甲", quality: "蓝", def: 2, thornDmg: 2, effect: "防+2，每次战斗额外造成2伤害" },
  嗜血之牙: { name: "嗜血之牙", quality: "蓝", atk: 2, healOnKill: 2, effect: "攻+2，击杀怪物回2血" },
  金剑: { name: "金剑", quality: "金", atk: 8, effect: "攻+8，每进行一次战斗攻击-1", battleAtkDecay: 1 },
  龙鳞甲: { name: "龙鳞甲", quality: "金", def: 1, maxHp: 6, monsterAtkDebuff: 1, effect: "防+1，血上限+6，所有怪物攻击-1" },
  金色宝箱: { name: "金色宝箱", quality: "金", effect: "加入两张金色宝箱卡到帮助卡组", addCards: { "金色宝箱卡": 2 } },
  狂战士斧: { name: "狂战士斧", quality: "金", atk: 1, effect: "攻+1，血<50%时攻击额外+3", lowHpAtkBonus: 3 },
  凤凰羽毛: { name: "凤凰羽毛", quality: "金", maxHp: 8, effect: "生命+8，致命伤回50%血并移除", deathSave: 0.5 },
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

  let levelRanges;

  if (nodeNum === 1) {
    levelRanges = [{ level: 1, min: 6, max: 8 }, { level: 2, min: 2, max: 4 }];
  } else if (nodeNum === 2) {
    levelRanges = [{ level: 1, min: 5, max: 7 }, { level: 2, min: 3, max: 5 }];
  } else if (nodeNum === 3) {
    levelRanges = [
      { level: 1, min: 2, max: 4 }, { level: 2, min: 3, max: 5 }, { level: 3, min: 2, max: 4 },
    ];
  } else if (nodeNum === 4) {
    levelRanges = [
      { level: 1, min: 1, max: 3 }, { level: 2, min: 3, max: 7 }, { level: 3, min: 3, max: 6 },
    ];
  } else if (nodeNum === 5) {
    return {
      isElite: true,
      eliteMonster: { ...ELITE_MONSTER },
      monsters: generateNodeMinions(5, total - 1),
      total,
    };
  } else if (nodeNum === 6) {
    levelRanges = [
      { level: 1, min: 0, max: 1 }, { level: 2, min: 2, max: 5 },
      { level: 3, min: 3, max: 6 }, { level: 4, min: 1, max: 5 },
    ];
  } else if (nodeNum === 7) {
    levelRanges = [
      { level: 2, min: 1, max: 4 }, { level: 3, min: 3, max: 8 }, { level: 4, min: 3, max: 6 },
    ];
  } else if (nodeNum === 8) {
    levelRanges = [
      { level: 2, min: 1, max: 4 }, { level: 3, min: 3, max: 10 }, { level: 4, min: 3, max: 8 },
    ];
  } else if (nodeNum === 9) {
    return {
      isBoss: true,
      bossMonster: { ...BOSS_MONSTER },
      monsters: generateNodeMinions(9, total - 1),
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
    1: [
      { ...MONSTERS.colorless }, { ...MONSTERS.spade2 }, { ...MONSTERS.heart2 },
      { ...MONSTERS.diamond2 }, { ...MONSTERS.club2 },
    ],
    2: [
      { ...MONSTERS.spade3 }, { ...MONSTERS.heart3 },
      { ...MONSTERS.diamond3 }, { ...MONSTERS.club3 },
    ],
    3: [
      { ...MONSTERS.spade4 }, { ...MONSTERS.heart4 },
      { ...MONSTERS.diamond4 }, { ...MONSTERS.club4 },
    ],
    4: [
      { ...MONSTERS.spade5 }, { ...MONSTERS.heart5 },
      { ...MONSTERS.diamond5 }, { ...MONSTERS.club5 },
    ],
  };

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
      monsters.push({ ...template, id: `${template.name}_${level}_${i}` });
    }
  }
  return monsters;
}
