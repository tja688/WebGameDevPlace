// 怪物设计数据

export const MONSTERS = {
  // 第一层
  skeleton: {
    id: 'skeleton',
    name: '骷髅',
    hp: 6, atk: 2, def: 0,
    level: 1,
    keywords: [],
    description: '最普通的骷髅，摇摇晃晃。',
  },
  armoredSkeleton: {
    id: 'armoredSkeleton',
    name: '带甲骷髅',
    hp: 8, atk: 3, def: 1,
    level: 2,
    keywords: [],
    description: '穿戴了锈蚀铠甲的骷髅。',
  },
  bannerSkeleton: {
    id: 'bannerSkeleton',
    name: '旗兵骷髅',
    hp: 8, atk: 3, def: 2,
    level: 3,
    keywords: ['inspire'],
    description: '挥舞旗帜，鼓舞同伴。',
  },
  vengefulSkeleton: {
    id: 'vengefulSkeleton',
    name: '复仇骷髅',
    hp: 7, atk: 4, def: 0,
    level: 3,
    keywords: ['vengeance'],
    description: '同伴的倒下让它更加愤怒。',
  },
  trackerSkeleton: {
    id: 'trackerSkeleton',
    name: '追踪者骷髅',
    hp: 10, atk: 5, def: 1,
    level: 4,
    keywords: ['aggressive'],
    description: '好战的骷髅，会主动追踪猎物。',
  },
  ambusherSkeleton: {
    id: 'ambusherSkeleton',
    name: '伏击者骷髅',
    hp: 8, atk: 4, def: 1,
    level: 4,
    keywords: ['ambush'],
    description: '潜伏在阴影中等待时机。',
  },
  armedSkeleton: {
    id: 'armedSkeleton',
    name: '武装骷髅',
    hp: 10, atk: 4, def: 3,
    level: 4,
    keywords: ['armorBreak'],
    description: '全副武装，每次攻击削弱你的防御。',
  },
  // 层主
  bigSkeletonLord: {
    id: 'bigSkeletonLord',
    name: '大骷髅老爷',
    hp: 50, atk: 4, def: 3,
    level: 'boss',
    keywords: ['spawn'],
    description: '骷髅们的统领，受伤时会召唤手下。',
  },
};

// 怪物分配规则（按节点索引 0-8，0-based）
export const NODE_MONSTER_RULES = [
  // 节点1 (index 0): 6~7只等级1, 2~3只等级2
  { level1: [6, 7], level2: [2, 3], level3: [0, 0], level4: [0, 0] },
  // 节点2
  { level1: [5, 6], level2: [3, 4], level3: [0, 0], level4: [0, 0] },
  // 节点3
  { level1: [2, 3], level2: [3, 4], level3: [2, 3], level4: [0, 0] },
  // 节点4
  { level1: [1, 2], level2: [3, 4], level3: [3, 4], level4: [0, 0] },
  // 节点5
  { level1: [1, 1], level2: [3, 4], level3: [3, 4], level4: [1, 1] },
  // 节点6
  { level1: [0, 1], level2: [2, 3], level3: [3, 4], level4: [1, 4] },
  // 节点7
  { level1: [0, 0], level2: [1, 2], level3: [3, 4], level4: [3, 5] },
  // 节点8 (餐厅，无怪物)
  null,
  // 节点9 (层主)
  { level1: [0, 0], level2: [1, 2], level3: [3, 4], level4: [3, 5] },
];

export function getMonstersByLevel(level) {
  return Object.values(MONSTERS).filter(m => m.level === level);
}

export function randomMonsterByLevel(level) {
  const pool = getMonstersByLevel(level);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateMonstersForNode(nodeIndex, layer) {
  const rule = NODE_MONSTER_RULES[nodeIndex];
  if (!rule) return [];

  const monsters = [];
  const x = layer; // 每层额外X只
  let total = 9 + x;

  const counts = {
    1: randInt(rule.level1[0], rule.level1[1]),
    2: randInt(rule.level2[0], rule.level2[1]),
    3: randInt(rule.level3[0], rule.level3[1]),
    4: randInt(rule.level4[0], rule.level4[1]),
  };

  let sum = counts[1] + counts[2] + counts[3] + counts[4];
  // 补足总数
  while (sum < total) {
    for (let lv = 4; lv >= 1 && sum < total; lv--) {
      counts[lv]++;
      sum++;
    }
  }

  for (let lv = 1; lv <= 4; lv++) {
    for (let i = 0; i < counts[lv]; i++) {
      const template = randomMonsterByLevel(lv);
      if (template) {
        monsters.push(createMonsterInstance(template));
      }
    }
  }

  return monsters;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createMonsterInstance(template) {
  return {
    type: 'monster',
    templateId: template.id,
    name: template.name,
    hp: template.hp,
    maxHp: template.hp,
    atk: template.atk,
    def: template.def,
    level: template.level,
    keywords: [...template.keywords],
    description: template.description,
    revealed: false,
    // 运行时状态
    vengeanceStacks: 0,
    aggressiveCounter: 0,
    armorBreakStacks: 0,
    spawnTriggered: [],
  };
}

export function createBossInstance() {
  const template = MONSTERS.bigSkeletonLord;
  return createMonsterInstance(template);
}
