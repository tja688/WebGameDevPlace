// ============================================================
// TestData — 怪物池（按牌组 + 等级） + 卡组生成
// ============================================================

import { HELP_CARDS } from "./HelpCardData.js";

// ============================================================
// 怪物牌组
// ============================================================

/** 弱精英牌组 — 流浪军团 + 石人军团 */
const WEAK_ELITE_DECKS = [
  { // 流浪军团
    t1: [
      { id: "beggar", name: "乞丐", hp: 4, atk: 2, armor: 0, type: "monster",
        skill: { id: "beggarBond", name: "丐帮同心", desc: "每移动5次，将一张乞丐洗入战斗卡组", effects: [
          { event: "onMoveEveryN", n: 5, action: "spawnToDeck", cards: [{ id: "beggar", name: "乞丐", hp: 4, atk: 2, armor: 0, type: "monster" }] }
        ] } },
      { id: "vagrantKid", name: "流浪孩童", hp: 1, atk: 1, armor: 3, type: "monster",
        skill: { id: "wanderKid", name: "流浪幼崽", desc: "处于格6时攻击+2并获得先攻", effects: [
          { event: "onCombat", action: "conditionalAtkUp", condition: "slot6", amount: 2, extra: "firstStrike" }
        ] } },
      { id: "pickpocket", name: "扒手", hp: 4, atk: 2, armor: 0, type: "monster",
        skill: { id: "stealStuff", name: "东西归我了！", desc: "每移动3次，移除相邻帮助卡", effects: [
          { event: "onMoveEveryN", n: 3, action: "removeAdjacentHelp" }
        ] } },
      { id: "vagrant", name: "流浪汉", hp: 6, atk: 2, armor: 0, type: "monster" },
    ],
    t2: [
      { id: "thug", name: "混混", hp: 8, atk: 2, armor: 0, type: "monster",
        skill: { id: "thugLife", name: "混的人", desc: "处于格2/4/6/8时攻击+2", effects: [
          { event: "onCombat", action: "conditionalAtkUp", condition: "evenSlot", amount: 2 }
        ] } },
      { id: "rogue", name: "流氓", hp: 2, atk: 2, armor: 6, type: "monster",
        skill: { id: "rogue", name: "痞气", desc: "战斗时攻击+1", effects: [
          { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
      { id: "fighter", name: "打手", hp: 8, atk: 2, armor: 0, type: "monster",
        skill: { id: "punch", name: "给你一拳", desc: "登场时若处于格2/4/6/8对玩家造成2伤害", effects: [
          { event: "onEnter", action: "dmgPlayer", condition: "evenSlot", amount: 2 }
        ] } },
    ],
    t3: [
      { id: "hitman", name: "杀手", hp: 12, atk: 3, armor: 0, type: "monster" },
      { id: "smuggler", name: "走私者", hp: 4, atk: 3, armor: 8, type: "monster" },
    ],
    elite: { id: "leader", name: "领头人", hp: 20, atk: 5, armor: 5, type: "monster", isElite: true,
      skill: { id: "guide", name: "引路+发现弱点", desc: "攻击+3，先攻", effects: [
        { event: "onCombat", action: "atkUp", amount: 3 },
        { event: "onCombat", action: "firstStrike" }
      ] } },
  },
  { // 石人军团
    t1: [
      { id: "spikeStone", name: "尖石", hp: 3, atk: 1, armor: 1, type: "monster",
        skill: { id: "spike", name: "尖石", desc: "护甲归零时对玩家造成1伤害", effects: [
          { event: "onRemove", action: "dmgPlayer", amount: 1, condition: "armorZero" }
        ] } },
      { id: "bigStone", name: "大石头", hp: 1, atk: 1, armor: 5, type: "monster",
        skill: { id: "tough", name: "坚硬", desc: "处于左列时造成护甲损失等量伤害", effects: [
          { event: "onCombat", action: "armorLossDmg", condition: "leftCol" }
        ] } },
      { id: "stoneEater", name: "吞石者", hp: 1, atk: 2, armor: 3, type: "monster",
        skill: { id: "eatStone", name: "吞石", desc: "每移动2次，吸收相邻怪物护甲", effects: [
          { event: "onMoveEveryN", n: 2, action: "stealAdjacentArmor", amount: 1 }
        ] } },
      { id: "stoneMan", name: "石头人", hp: 1, atk: 2, armor: 5, type: "monster" },
    ],
    t2: [
      { id: "rollingStone", name: "滚石人", hp: 4, atk: 2, armor: 4, type: "monster" },
      { id: "stoneShrimp", name: "石虾", hp: 2, atk: 2, armor: 6, type: "monster" },
      { id: "stoneThrower", name: "丢石人", hp: 4, atk: 2, armor: 4, type: "monster",
        skill: { id: "stoneThrow", name: "丢石头", desc: "战斗时攻击+2", effects: [
          { event: "onCombat", action: "atkUp", amount: 2 }
        ] } },
    ],
    t3: [
      { id: "growStone", name: "增生石块", hp: 16, atk: 4, armor: 0, type: "monster",
        skill: { id: "stoneGrowth", name: "石增长", desc: "左列时相邻怪物攻击光环", effects: [
          { event: "auraAdjacentAtk", amount: 2, condition: "leftCol" }
        ] } },
      { id: "shelterStone", name: "庇护石", hp: 8, atk: 4, armor: 8, type: "monster",
        skill: { id: "stoneShelter", name: "石庇护", desc: "相邻怪物攻击+1", effects: [
          { event: "auraAdjacentAtk", amount: 1, condition: "always" }
        ] } },
    ],
    elite: { id: "bigStoneMan", name: "巨石人", hp: 10, atk: 2, armor: 20, type: "monster", isElite: true,
      skill: { id: "absorbStone", name: "吸石+落石", desc: "左列时造成护甲损失等量伤害", effects: [
        { event: "onCombat", action: "armorLossDmg", condition: "leftCol" }
      ] } },
  },
];

/** 强精英牌组 — 兽人军团 + 骷髅军团 */
const STRONG_ELITE_DECKS = [
  { // 兽人军团
    t1: [
      { id: "oldOrc", name: "年迈兽人", hp: 14, atk: 1, armor: 0, type: "monster",
        skill: { id: "survival", name: "生存智慧", desc: "战斗恢复1HP，攻击+1", effects: [
          { event: "onCombat", action: "healOnCombat", amount: 1 },
          { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
      { id: "youngOrc", name: "年轻兽人", hp: 10, atk: 2, armor: 3, type: "monster",
        skill: { id: "learning", name: "学习成长", desc: "每移动1次攻击+1", effects: [
          { event: "onMoveEveryN", n: 1, action: "gainAtk", amount: 1 }
        ] } },
      { id: "brainless", name: "无脑兽人", hp: 14, atk: 1, armor: 0, type: "monster",
        skill: { id: "battleHardened", name: "历战怪物", desc: "战斗时攻击+2", effects: [
          { event: "onCombat", action: "atkUp", amount: 2 }
        ] } },
      { id: "battleOrc", name: "历战兽人", hp: 14, atk: 2, armor: 0, type: "monster" },
    ],
    t2: [
      { id: "orcWarrior", name: "兽人战士", hp: 15, atk: 3, armor: 0, type: "monster",
        skill: { id: "bloodthirst", name: "嗜血", desc: "每造成2点伤害攻击+1", effects: [
          { event: "onCombat", action: "atkPerDamage", amount: 2 }
        ] } },
      { id: "smartOrc", name: "聪明兽人", hp: 15, atk: 3, armor: 0, type: "monster",
        skill: { id: "bigBrain", name: "大聪明", desc: "每移动2次攻击+1", effects: [
          { event: "onMoveEveryN", n: 2, action: "gainAtk", amount: 1 }
        ] } },
      { id: "orcQuarter", name: "兽人军需官", hp: 12, atk: 2, armor: 4, type: "monster",
        skill: { id: "gearUp", name: "发装备了！", desc: "每移动2次增益随机其他怪物", effects: [
          { event: "onMoveEveryN", n: 2, action: "buffRandomOtherMonster", atkAmount: 1, armorAmount: 2 }
        ] } },
    ],
    t3: [
      { id: "orcBig", name: "兽人大只佬", hp: 21, atk: 4, armor: 0, type: "monster",
        skill: { id: "fightMe", name: "和我打！", desc: "战斗时先攻", effects: [
          { event: "onCombat", action: "firstStrike" },
          // 强制战斗：进入玩家正交相邻格时自动开战
          { event: "onMoveToPlayerAdjacent", action: "autoBattle" }
        ] } },
      { id: "orcCommander", name: "兽人指挥官", hp: 15, atk: 2, armor: 3, type: "monster",
        skill: { id: "orcTactics", name: "兽人战术", desc: "相邻怪物攻击+1（离开失效）", effects: [
          { event: "auraAdjacentAtk", amount: 1, condition: "always" }
        ] } },
      { id: "chaser", name: "追猎兽人", hp: 12, atk: 3, armor: 0, type: "monster",
        skill: { id: "relentless", name: "不休追击", desc: "[场上] 每次移动到玩家正交相邻格时，与玩家战斗一次", effects: [
          { event: "onMoveToPlayerAdjacent", action: "autoBattle" },
        ] } },
    ],
    elite: { id: "orcBoss", name: "兽人老大", hp: 30, atk: 5, armor: 5, type: "monster", isElite: true,
      skill: { id: "violence", name: "暴力狂+暴力即养分", desc: "攻击+5，先攻", effects: [
        { event: "onCombat", action: "atkUp", amount: 5 },
        { event: "onCombat", action: "firstStrike" }
      ] } },
  },
  { // 骷髅军团
    t1: [
      { id: "headlessBone", name: "无头骷髅", hp: 8, atk: 2, armor: 0, type: "monster",
        skill: { id: "reHead", name: "重新组合头", desc: "每移动1次，攻击+1", effects: [
          { event: "onMoveEveryN", n: 1, action: "gainAtk", amount: 1 }
        ] } },
      { id: "skull", name: "骷髅头", hp: 4, atk: 2, armor: 4, type: "monster",
        skill: { id: "reBody", name: "重新组合身", desc: "每移动1次，护甲+1", effects: [
          { event: "onMoveEveryN", n: 1, action: "selfArmorUp", amount: 1 }
        ] } },
      { id: "tauntBone", name: "骷髅嘲讽子", hp: 10, atk: 2, armor: 2, type: "monster",
        skill: { id: "taunt", name: "嘲讽", desc: "正交相邻时只能与本卡战斗", effects: [
          { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
      { id: "boneStick", name: "骨棒骷髅", hp: 10, atk: 3, armor: 2, type: "monster" },
    ],
    t2: [
      { id: "bigBone", name: "大骷髅", hp: 10, atk: 3, armor: 0, type: "monster",
        skill: { id: "collapse", name: "散架", desc: "[场上] 被移除时，将骷髅头和无头骷髅洗入战斗卡组", effects: [
          { event: "onRemove", action: "spawnToDeck", cards: [
            { id: "skull", name: "骷髅头", hp: 4, atk: 2, armor: 4, type: "monster" },
            { id: "headlessBone", name: "无头骷髅", hp: 8, atk: 2, armor: 0, type: "monster" },
          ] },
        ] } },
      { id: "unstableBone", name: "摇晃骷髅", hp: 6, atk: 2, armor: 0, type: "monster",
        skill: { id: "unstable", name: "不稳定", desc: "每移动3次，与九宫格上随机一张怪物卡交换位置", effects: [
          { event: "onMoveEveryN", n: 3, action: "swapRandomMonster" },
        ] } },
      { id: "multiBone", name: "多骨虫", hp: 3, atk: 3, armor: 9, type: "monster",
        skill: { id: "strongMix", name: "强力组合", desc: "每移动2次攻击+2", effects: [
          { event: "onMoveEveryN", n: 2, action: "gainAtk", amount: 2 }
        ] } },
      { id: "boneExpress", name: "骨头快递员", hp: 10, atk: 2, armor: 2, type: "monster",
        skill: { id: "express", name: "快递", desc: "每移动2次把相邻帮助卡换入牌组并补一张", effects: [
          { event: "onMoveEveryN", n: 2, action: "moveAdjacentHelpToDeckAndReplace" }
        ] } },
    ],
    t3: [
      { id: "hugeBone", name: "巨大骷髅", hp: 12, atk: 4, armor: 0, type: "monster",
        skill: { id: "atkUp3", name: "巨大化", desc: "战斗时攻击+2", effects: [
          { event: "onCombat", action: "atkUp", amount: 2 }
        ] } },
      { id: "boneMage", name: "骷髅法师", hp: 8, atk: 4, armor: 8, type: "monster",
        skill: { id: "firstStrike", name: "先攻", desc: "战斗中优先造成伤害", effects: [
          { event: "onCombat", action: "firstStrike" }
        ] } },
    ],
    elite: { id: "boneKing", name: "骷髅王", hp: 15, atk: 4, armor: 15, type: "monster", isElite: true,
      skill: { id: "absorbBone", name: "吸骨+混合骨头", desc: "护甲损失追加伤害，先攻", effects: [
        { event: "onCombat", action: "armorLossDmg", condition: "leftCol" },
        { event: "onCombat", action: "atkUp", amount: 2 }
      ] } },
  },
];

/** 层主牌组 — 巨龙 + 虚空 */
const BOSS_DECKS = [
  { // 巨龙
    t1: [
      { id: "dragonFollower", name: "龙信徒", hp: 10, atk: 2, armor: 0, type: "monster",
        skill: { id: "devotion", name: "献身", desc: "被移除时洗入一张烈焰", effects: [
          { event: "onRemove", action: "spawnToDeck", cards: [{ id: "flame", name: "烈焰", type: "help", rarity: "red", effect: { type: "damage", amount: 2 }, desc: "造成2点伤害" }] }
        ] } },
      { id: "fireBather", name: "浴火者", hp: 18, atk: 2, armor: 0, type: "monster",
        skill: { id: "fireLove", name: "恋火", desc: "战斗时攻击+4", effects: [
          { event: "onCombat", action: "atkUp", amount: 4 }
        ] } },
      { id: "fireLizard", name: "火蜥蜴", hp: 16, atk: 4, armor: 0, type: "monster" },
      { id: "stoneGolem", name: "石傀儡", hp: 10, atk: 3, armor: 10, type: "monster" },
    ],
    t2: [
      { id: "firePriest", name: "火焰祭司", hp: 25, atk: 0, armor: 5, type: "monster",
        skill: { id: "firePower", name: "火之力", desc: "战斗时攻击+3", effects: [
          { event: "onCombat", action: "atkUp", amount: 3 }
        ] } },
      { id: "fireEater", name: "吞火者", hp: 25, atk: 3, armor: 2, type: "monster",
        skill: { id: "spikeShield", name: "尖盾", desc: "左列时攻击+护甲", effects: [
          { event: "onCombat", action: "armorLossDmg", condition: "leftCol" }
        ] } },
      { id: "executioner", name: "刽子手", hp: 25, atk: 5, armor: 0, type: "monster",
        skill: { id: "sacrifice", name: "献祭", desc: "每移动2次移除全部龙信徒", effects: [
          { event: "onMoveEveryN", n: 2, action: "sacrificeById", targetId: "dragonFollower" }
        ] } },
    ],
    t3: [
      { id: "dragonLeader", name: "龙教主", hp: 30, atk: 5, armor: 5, type: "monster",
        skill: { id: "callFollower", name: "呼唤信徒", desc: "每移动3次洗入龙信徒", effects: [
          { event: "onMoveEveryN", n: 3, action: "spawnToDeck", cards: [{ id: "dragonFollower", name: "龙信徒", hp: 10, atk: 2, armor: 0, type: "monster" }] }
        ] } },
      { id: "fireLeader", name: "火教主", hp: 30, atk: 5, armor: 5, type: "monster" },
    ],
    boss: { id: "fireDragon", name: "火龙", hp: 100, atk: 10, armor: 10, type: "monster", isBoss: true,
      skill: { id: "fireBreath", name: "烈焰吐息+烈焰沸腾", desc: "攻击+5，先攻，每回合恢复2HP", effects: [
        { event: "onCombat", action: "atkUp", amount: 5 },
        { event: "onCombat", action: "firstStrike" },
        { event: "onCombat", action: "healOnCombat", amount: 2 }
      ] } },
  },
  { // 虚空
    t1: [
      { id: "voidKid", name: "虚空幼崽", hp: 18, atk: 2, armor: 0, type: "monster",
        skill: { id: "unstableVoid", name: "不稳定", desc: "每移动3次与随机怪物换位", effects: [
          { event: "onMoveEveryN", n: 3, action: "swapRandomMonster" }
        ] } },
      { id: "spinKid", name: "旋转幼崽", hp: 18, atk: 2, armor: 0, type: "monster",
        skill: { id: "spinHobby", name: "爱好旋转", desc: "每移动3次旋转一次", effects: [
          { event: "onMoveEveryN", n: 3, action: "rotateBoard" }
        ] } },
      { id: "walker", name: "踏步行者", hp: 18, atk: 2, armor: 0, type: "monster",
        skill: { id: "chaosStep", name: "乱步", desc: "每移动3次与随机帮助卡换位", effects: [
          { event: "onMoveEveryN", n: 3, action: "swapRandomHelp" }
        ] } },
      { id: "lostVoid", name: "误入虚空者", hp: 18, atk: 3, armor: 0, type: "monster" },
    ],
    t2: [
      { id: "skyEye", name: "空中巨眼", hp: 25, atk: 3, armor: 2, type: "monster",
        skill: { id: "airStrike", name: "空中打击", desc: "[场上] 每次移动到格1/3/7/9时，对玩家造成2点伤害", effects: [
          { event: "onMoveToSlot", slots: [1, 3, 7, 9], action: "dmgPlayer", amount: 2 },
        ] } },
      { id: "observer", name: "观察者", hp: 10, atk: 3, armor: 5, type: "monster",
        skill: { id: "hotObserve", name: "灼热观察", desc: "怪物技能导致位移时对玩家造成1点伤害", effects: [] } },
      { id: "worldSpinner", name: "转动世界的手", hp: 20, atk: 5, armor: 0, type: "monster",
        skill: { id: "spin", name: "转动", desc: "战斗时攻击+1", effects: [
          { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
    ],
    t3: [
      { id: "mist", name: "迷雾", hp: 15, atk: 1, armor: 0, type: "monster" },
      { id: "friendlyAncient", name: "友好的远古生物", hp: 30, atk: 3, armor: 10, type: "monster" },
    ],
    boss: { id: "spaceMaster", name: "空间大师", hp: 80, atk: 5, armor: 20, type: "monster", isBoss: true,
      skill: { id: "spaceControl", name: "空间掌握+异界帮助", desc: "攻击+3，先攻，反伤3", effects: [
        { event: "onCombat", action: "atkUp", amount: 3 },
        { event: "onCombat", action: "firstStrike" },
        { event: "onCombat", action: "reflectDmg", amount: 3 }
      ] } },
  },
];

// ============================================================
// 导出给 GameState 使用
// ============================================================

/** 从牌组数组中随机选一套 */
function pickDeck(decks) {
  return decks[Math.floor(Math.random() * decks.length)];
}

/**
 * 按设计文档节点规则生成怪物侧卡组
 * 每层随机选弱精英/强精英/层主各一套
 * @param {number} layer - 当前层 (1~3)
 * @param {number} node - 当前节点 (1~9)
 */
export function buildMonsterDeckByNode(layer, node) {
  // 每层随机选牌组（缓存）
  if (!buildMonsterDeckByNode._cache) buildMonsterDeckByNode._cache = {};
  if (!buildMonsterDeckByNode._cache[layer]) {
    buildMonsterDeckByNode._cache[layer] = {
      weak: pickDeck(WEAK_ELITE_DECKS),
      strong: pickDeck(STRONG_ELITE_DECKS),
      boss: pickDeck(BOSS_DECKS),
    };
  }
  const cache = buildMonsterDeckByNode._cache[layer];

  // 按节点决定使用哪个牌组和配额
  let deck, t1 = 0, t2 = 0, t3 = 0, addElite = false, addBoss = false;

  if (node <= 3) {
    deck = cache.weak;
    if (node === 1)      { t1 = 7 + Math.floor(Math.random() * 2); }
    else if (node === 2) { t1 = 5 + Math.floor(Math.random() * 2); t2 = 3 + Math.floor(Math.random() * 2); }
    else                 { t1 = 3 + Math.floor(Math.random() * 2); t2 = 5 + Math.floor(Math.random() * 2); t3 = 2 + Math.floor(Math.random() * 3); addElite = true; }
  } else if (node <= 6) {
    deck = cache.strong;
    if (node === 4)      { t1 = 8 + Math.floor(Math.random() * 2); }
    else if (node === 5) { t1 = 6 + Math.floor(Math.random() * 2); t2 = 4 + Math.floor(Math.random() * 2); }
    else                 { t1 = 4 + Math.floor(Math.random() * 2); t2 = 5 + Math.floor(Math.random() * 2); t3 = 3 + Math.floor(Math.random() * 3); addElite = true; }
  } else {
    deck = cache.boss;
    if (node === 7)      { t1 = 8 + Math.floor(Math.random() * 2); }
    else if (node === 8) { t1 = 6 + Math.floor(Math.random() * 2); t2 = 6 + Math.floor(Math.random() * 2); }
    else                 { t1 = 4 + Math.floor(Math.random() * 2); t2 = 7 + Math.floor(Math.random() * 2); t3 = 3 + Math.floor(Math.random() * 3); addBoss = true; }
  }

  const monsters = [];
  const add = (pool, count) => {
    for (let i = 0; i < count && pool.length > 0; i++) {
      const m = pool[Math.floor(Math.random() * pool.length)];
      monsters.push({ ...m, uid: `md_${monsters.length + 1}` });
    }
  };

  add(deck.t1 || [], t1);
  add(deck.t2 || [], t2);
  add(deck.t3 || [], t3);

  // 精英/层主额外加入（不计入常规配额）
  if (addElite && deck.elite) {
    monsters.push({ ...deck.elite, uid: `md_elite_${monsters.length + 1}` });
  }
  if (addBoss && deck.boss) {
    monsters.push({ ...deck.boss, uid: `md_boss_${monsters.length + 1}` });
  }

  // Fisher-Yates 洗牌
  for (let i = monsters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [monsters[i], monsters[j]] = [monsters[j], monsters[i]];
  }

  return monsters;
}

// ============================================================
// 帮助卡 ID 列表
// ============================================================
const HELP_IDS = ["potion", "dagger", "fireball", "bomb", "goldCard", "shieldCard", "chestWhite"];

// ============================================================
// 旧的简单怪物池（保留兼容）
// ============================================================
export const MONSTER_POOLS = {
  tier1: [{ id: "beggar", name: "乞丐", hp: 4, atk: 2, armor: 0, type: "monster" }],
  tier2: [{ id: "thug", name: "混混", hp: 8, atk: 2, armor: 0, type: "monster" }],
  tier3: [{ id: "hitman", name: "杀手", hp: 12, atk: 3, armor: 0, type: "monster" }],
};
