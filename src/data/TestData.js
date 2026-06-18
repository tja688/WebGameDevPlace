// ============================================================
// TestData — 怪物池（按设计文档严格填写属性）
// ============================================================

import { HELP_CARDS } from "./HelpCardData.js";

// ============================================================
// 怪物模板池（供技能生成用）
// ============================================================
export const MONSTER_TEMPLATES = {
  beggar: { id: "beggar", name: "乞丐", hp: 4, atk: 2, armor: 0, type: "monster",
    skill: { id: "beggarGang", name: "丐帮同心", desc: "每移动5次将一只乞丐洗入战斗卡组", effects: [
      { event: "onMoveCount", action: "shuffleMonster", every: 5, monsterId: "beggar" }
    ] } },
  skullHead: { id: "skull", name: "骷髅头", hp: 3, atk: 2, armor: 3, type: "monster" },
  headlessBone: { id: "headlessBone", name: "无头骷髅", hp: 6, atk: 2, armor: 0, type: "monster" },
  bigBone: { id: "bigBone", name: "大骷髅", hp: 10, atk: 2, armor: 0, type: "monster" },
  multiBone: { id: "multiBone", name: "多骨虫", hp: 3, atk: 2, armor: 6, type: "monster" },
  hugeBone: { id: "hugeBone", name: "巨大骷髅", hp: 12, atk: 3, armor: 0, type: "monster" },
  dragonFollower: { id: "dragonFollower", name: "龙信徒", hp: 6, atk: 2, armor: 0, type: "monster",
    skill: { id: "devotion", name: "献身", desc: "被移除时烈焰洗入卡组", effects: [
      { event: "onRemove", action: "shuffleMonster", monsterId: "flame" }
    ] } },
  flame: { id: "flame", name: "烈焰", type: "help", rarity: "red", price: 400,
    effect: { type: "damage_to_player", amount: 4 }, desc: "使用时对玩家造成4点伤害",
    onFieldSkill: { id: "flameTouch", name: "烈焰灼烧", desc: "移动到玩家相邻格时对玩家造成2伤害", effects: [
      { event: "onMoveToAdjacent", action: "dmgPlayer", amount: 2 }
    ] } },
  randomTier2: { id: "randomTier2", name: "随机T2", hp: 8, atk: 2, armor: 2, type: "monster" },
};

// ============================================================
// 怪物牌组（严格按设计文档属性）
// ============================================================

/** 弱精英牌组 — 流浪军团 + 石人军团 */
const WEAK_ELITE_DECKS = [
  { // 流浪军团
    t1: [
      { id: "beggar", name: "乞丐", hp: 4, atk: 2, armor: 0, type: "monster",
        skill: { id: "beggarGang", name: "丐帮同心", desc: "每移动5次将乞丐洗入战斗卡组", effects: [
          { event: "onMoveCount", action: "shuffleMonster", every: 5, monsterId: "beggar" }
        ] } },
      { id: "vagrantKid", name: "流浪孩童", hp: 1, atk: 1, armor: 3, type: "monster",
        skill: { id: "wanderKid", name: "流浪幼崽", desc: "格6时攻击+2获得先攻", effects: [
          { event: "onCombat", action: "conditionalAtkUp", condition: "slot6", amount: 2, extra: "firstStrike" }
        ] } },
      { id: "pickpocket", name: "扒手", hp: 4, atk: 1, armor: 0, type: "monster",
        skill: { id: "steal", name: "东西归我了", desc: "每移3次移除正交邻帮助卡", effects: [
          { event: "onMoveCount", action: "removeAdjacentHelp", every: 3 }
        ] } },
      { id: "vagrant", name: "流浪汉", hp: 5, atk: 2, armor: 0, type: "monster" },
    ],
    t2: [
      { id: "thug", name: "混混", hp: 6, atk: 2, armor: 0, type: "monster",
        skill: { id: "thugLife", name: "混的人", desc: "移到格1时对玩家2伤", effects: [
          { event: "onMoveToSlot", action: "dmgPlayer", slot: 1, amount: 2 }
        ] } },
      { id: "rogue", name: "流氓", hp: 2, atk: 2, armor: 6, type: "monster",
        skill: { id: "rogue", name: "痞气", desc: "战斗时攻击+1", effects: [
          { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
      { id: "fighter", name: "打手", hp: 6, atk: 2, armor: 0, type: "monster",
        skill: { id: "punch", name: "给你一拳", desc: "登场时格2/4/6/8对玩家2伤", effects: [
          { event: "onEnter", action: "dmgPlayer", condition: "evenSlot", amount: 2 }
        ] } },
    ],
    t3: [
      { id: "hitman", name: "杀手", hp: 6, atk: 3, armor: 4, type: "monster",
        skill: { id: "relentless", name: "不休追击", desc: "移到相邻格自动战斗", effects: [
          { event: "onMoveToAdjacent", action: "autoBattle" }
        ] } },
      { id: "smuggler", name: "走私者", hp: 4, atk: 2, armor: 5, type: "monster",
        skill: { id: "sideStrike", name: "进货", desc: "累积移到相邻3次时移除帮助卡+5护甲", effects: [] } },
    ],
    elite: { id: "leader", name: "领头人", hp: 14, atk: 3, armor: 4, type: "monster", isElite: true,
      skill: { id: "guide", name: "引路+发现弱点", desc: "攻击+3先攻", effects: [
        { event: "onCombat", action: "atkUp", amount: 3 }, { event: "onCombat", action: "firstStrike" }
      ] } },
  },
  { // 石人军团
    t1: [
      { id: "spikeStone", name: "尖石", hp: 3, atk: 1, armor: 1, type: "monster",
        skill: { id: "spike", name: "尖石", desc: "护甲归零对玩家1伤", effects: [
          { event: "onRemove", action: "dmgPlayer", amount: 1, condition: "armorZero" }
        ] } },
      { id: "bigStone", name: "大石头", hp: 1, atk: 1, armor: 5, type: "monster",
        skill: { id: "tough", name: "坚硬", desc: "左列时护甲损失追伤", effects: [
          { event: "onCombat", action: "armorLossDmg", condition: "leftCol" }
        ] } },
      { id: "stoneEater", name: "吞石者", hp: 1, atk: 2, armor: 3, type: "monster",
        skill: { id: "eatStone", name: "吞石", desc: "每移2次扣邻怪护甲自增", effects: [
          { event: "onMoveCount", action: "drainArmor", every: 2, amount: 1 }
        ] } },
      { id: "stoneMan", name: "石头人", hp: 1, atk: 2, armor: 4, type: "monster" },
    ],
    t2: [
      { id: "rollingStone", name: "滚石人", hp: 4, atk: 2, armor: 3, type: "monster",
        skill: { id: "rollCrush", name: "滚动碾压", desc: "移到格3时移除格6帮助卡", effects: [
          { event: "onMoveToSlot", action: "removeAdjacentHelp", slot: 3 }
        ] } },
      { id: "stoneShrimp", name: "石虾", hp: 2, atk: 2, armor: 6, type: "monster",
        skill: { id: "stoneLover", name: "石头爱好者", desc: "护甲损失时攻击+1", effects: [
          { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
      { id: "stoneThrower", name: "丢石人", hp: 2, atk: 1, armor: 6, type: "monster",
        skill: { id: "stoneThrow", name: "丢石头", desc: "每移2次扣2护甲对玩家2伤", effects: [
          { event: "onMoveCount", action: "dmgPlayer", every: 2, amount: 2 },
          { event: "onMoveCount", action: "reduceOwnArmor", every: 2, amount: 2 }
        ] } },
    ],
    t3: [
      { id: "growStone", name: "增生石块", hp: 10, atk: 3, armor: 0, type: "monster",
        skill: { id: "stoneGrowth", name: "石增长", desc: "移左列时其他怪护甲+2", effects: [
          { event: "onMoveToSlot", action: "buffOtherMonsters", amount: 2, slot: 1 },
          { event: "onMoveToSlot", action: "buffOtherMonsters", amount: 2, slot: 4 },
          { event: "onMoveToSlot", action: "buffOtherMonsters", amount: 2, slot: 7 }
        ] } },
      { id: "shelterStone", name: "庇护石", hp: 4, atk: 2, armor: 6, type: "monster",
        skill: { id: "stoneShelter", name: "石庇护", desc: "其他怪物受伤害-1", effects: [] } },
    ],
    elite: { id: "bigStoneMan", name: "巨石人", hp: 8, atk: 2, armor: 12, type: "monster", isElite: true,
      skill: { id: "absorbStone", name: "吸石+落石", desc: "移时吸邻护甲；累损10护甲洗石人", effects: [
        { event: "onMoveCount", action: "buffAdjacentMonsters", amount: 0, every: 1 }
      ] } },
  },
];

/** 强精英牌组 — 兽人军团 + 骷髅军团 */
const STRONG_ELITE_DECKS = [
  { // 兽人军团
    t1: [
      { id: "oldOrc", name: "年迈兽人", hp: 9, atk: 1, armor: 0, type: "monster",
        skill: { id: "survival", name: "生存智慧", desc: "战斗恢复1HP攻击+1", effects: [
          { event: "onCombat", action: "healOnCombat", amount: 1 },
          { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
      { id: "youngOrc", name: "年轻兽人", hp: 6, atk: 2, armor: 4, type: "monster" },
      { id: "brainless", name: "无脑兽人", hp: 9, atk: 1, armor: 0, type: "monster",
        skill: { id: "battleHardened", name: "历战怪物", desc: "战斗时攻击+2", effects: [
          { event: "onCombat", action: "atkUp", amount: 2 }
        ] } },
      { id: "battleOrc", name: "历战兽人", hp: 10, atk: 2, armor: 0, type: "monster" },
    ],
    t2: [
      { id: "orcWarrior", name: "兽人战士", hp: 10, atk: 2, armor: 0, type: "monster",
        skill: { id: "bloodthirst", name: "嗜血", desc: "每造成2伤攻击+1", effects: [
          { event: "onCombat", action: "atkPerDamage", amount: 2 }
        ] } },
      { id: "smartOrc", name: "聪明兽人", hp: 9, atk: 2, armor: 0, type: "monster",
        skill: { id: "bigBrain", name: "大聪明", desc: "获得攻击时额外+1", effects: [
          { event: "onCombat", action: "chainAtk", amount: 1 }
        ] } },
      { id: "orcQuarter", name: "兽人军需官", hp: 8, atk: 2, armor: 3, type: "monster",
        skill: { id: "giveGear", name: "发装备了", desc: "每移2次随机怪物+1攻或+2甲", effects: [
          { event: "onMoveCount", action: "buffOtherMonsters", amount: 1, every: 2 }
        ] } },
    ],
    t3: [
      { id: "orcBig", name: "兽人大只佬", hp: 14, atk: 3, armor: 0, type: "monster",
        skill: { id: "fightMe", name: "和我打", desc: "相邻时玩家战后自动本卡战斗", effects: [
          { event: "onAllyFight", action: "autoBattle" }
        ] } },
      { id: "orcCommander", name: "兽人指挥官", hp: 10, atk: 2, armor: 2, type: "monster",
        skill: { id: "orcTactic", name: "兽人战术", desc: "每移1次邻怪攻击+1", effects: [
          { event: "onMoveCount", action: "buffAdjacentMonsters", amount: 1, every: 1 }
        ] } },
    ],
    elite: { id: "orcBoss", name: "兽人老大", hp: 22, atk: 4, armor: 4, type: "monster", isElite: true,
      skill: { id: "violence", name: "暴力狂+暴力即养分", desc: "攻击+4先攻每2移除邻卡", effects: [
        { event: "onCombat", action: "atkUp", amount: 4 }, { event: "onCombat", action: "firstStrike" },
        { event: "onMoveCount", action: "removeAdjacent", every: 2 }
      ] } },
  },
  { // 骷髅军团
    t1: [
      { id: "headlessBone", name: "无头骷髅", hp: 6, atk: 2, armor: 0, type: "monster" },
      { id: "skull", name: "骷髅头", hp: 3, atk: 2, armor: 3, type: "monster" },
      { id: "tauntBone", name: "骷髅嘲讽子", hp: 7, atk: 2, armor: 1, type: "monster",
        skill: { id: "taunt", name: "嘲讽", desc: "相邻时只能与本卡战斗", effects: [
          { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
      { id: "boneStick", name: "骨棒骷髅", hp: 8, atk: 2, armor: 1, type: "monster" },
    ],
    t2: [
      { id: "bigBone", name: "大骷髅", hp: 10, atk: 2, armor: 0, type: "monster",
        skill: { id: "collapse", name: "散架", desc: "被移除时骷髅头+无头骷髅入组", effects: [
          { event: "onRemove", action: "shuffleMonster", monsterId: "skullHead" },
          { event: "onRemove", action: "shuffleMonster", monsterId: "headlessBone" }
        ] } },
      { id: "multiBone", name: "多骨虫", hp: 3, atk: 2, armor: 6, type: "monster" },
      { id: "boneExpress", name: "骨头快递员", hp: 7, atk: 2, armor: 1, type: "monster" },
    ],
    t3: [
      { id: "hugeBone", name: "巨大骷髅", hp: 12, atk: 3, armor: 0, type: "monster",
        skill: { id: "brokenCollapse", name: "折损散架", desc: "被移除时多骨虫+随机T2入组", effects: [
          { event: "onRemove", action: "shuffleMonster", monsterId: "multiBone" },
          { event: "onRemove", action: "shuffleMonster", monsterId: "randomTier2" }
        ] } },
      { id: "boneMage", name: "骷髅法师", hp: 6, atk: 3, armor: 5, type: "monster",
        skill: { id: "firstStrike", name: "范围扩大+先攻", desc: "所有怪视为相邻+先攻", effects: [
          { event: "onCombat", action: "firstStrike" }
        ] } },
    ],
    elite: { id: "boneKing", name: "骷髅王", hp: 12, atk: 3, armor: 10, type: "monster", isElite: true,
      skill: { id: "absorbBone", name: "吸骨+混合骨头", desc: "邻怪移除吸属性；每5移除2怪", effects: [
        { event: "onCombat", action: "atkUp", amount: 2 }
      ] } },
  },
];

/** 层主牌组 — 巨龙 + 虚空 */
const BOSS_DECKS = [
  { // 巨龙
    t1: [
      { id: "dragonFollower", name: "龙信徒", hp: 6, atk: 2, armor: 0, type: "monster",
        skill: { id: "devotion", name: "献身", desc: "被移除时烈焰入组", effects: [
          { event: "onRemove", action: "shuffleMonster", monsterId: "flame" }
        ] } },
      { id: "fireBather", name: "浴火者", hp: 10, atk: 2, armor: 0, type: "monster",
        skill: { id: "loveFire", name: "恋火", desc: "场上有烈焰攻击+4（被动常驻）", effects: [
          { event: "onCombat", action: "conditionalAtkUp", condition: "hasFlame", amount: 4 }
        ] }, _passive: true, _passiveCheck: "hasFlame", _passiveAtk: 4, _passiveBaseAtk: 2 },
      { id: "fireLizard", name: "火蜥蜴", hp: 9, atk: 3, armor: 0, type: "monster",
        skill: { id: "spitFire", name: "喷火", desc: "每移3次烈焰入道具牌格", effects: [
          { event: "onMoveCount", action: "giftItem", every: 3, itemId: "flame" }
        ] } },
      { id: "stoneGolem", name: "石傀儡", hp: 8, atk: 2, armor: 6, type: "monster" },
    ],
    t2: [
      { id: "firePriest", name: "火焰祭司", hp: 12, atk: 0, armor: 8, type: "monster",
        skill: { id: "firePower", name: "火之力", desc: "场上每烈焰攻击+2", effects: [
          { event: "onCombat", action: "countFlameAtk", amount: 2 }
        ] } },
      { id: "fireEater", name: "吞火者", hp: 8, atk: 2, armor: 8, type: "monster",
        skill: { id: "spikeShield", name: "尖盾", desc: "左列时护甲损失追伤", effects: [
          { event: "onCombat", action: "armorLossDmg", condition: "leftCol" }
        ] } },
      { id: "executioner", name: "刽子手", hp: 14, atk: 3, armor: 0, type: "monster",
        skill: { id: "sacrifice", name: "献祭", desc: "每移2次移除全龙信徒", effects: [
          { event: "onMoveCount", action: "removeAllMonsters", every: 2, monsterId: "dragonFollower" }
        ] } },
    ],
    t3: [
      { id: "dragonLeader", name: "龙教主", hp: 18, atk: 3, armor: 3, type: "monster",
        skill: { id: "callFollowers", name: "呼唤信徒", desc: "每移3次龙信徒入组", effects: [
          { event: "onMoveCount", action: "shuffleMonster", every: 3, monsterId: "dragonFollower" }
        ] } },
      { id: "fireLeader", name: "火教主", hp: 18, atk: 3, armor: 3, type: "monster",
        skill: { id: "medic", name: "医疗兵", desc: "移下排全体怪恢复4HP", effects: [
          { event: "onMoveToBotRow", action: "healAllMonsters", amount: 4 }
        ] } },
    ],
    boss: { id: "fireDragon", name: "火龙", hp: 50, atk: 5, armor: 5, type: "monster", isBoss: true,
      skill: { id: "fireBreath", name: "烈焰吐息+烈焰沸腾", desc: "攻击+5先攻每战恢复2HP", effects: [
        { event: "onCombat", action: "atkUp", amount: 5 }, { event: "onCombat", action: "firstStrike" },
        { event: "onCombat", action: "healOnCombat", amount: 2 }
      ] } },
  },
  { // 虚空
    t1: [
      { id: "voidKid", name: "虚空幼崽", hp: 10, atk: 2, armor: 0, type: "monster",
        skill: { id: "unstable", name: "不稳定", desc: "每移3次随机换位", effects: [
          { event: "onMoveCount", action: "swapWithRandom", every: 3 }
        ] } },
      { id: "spinKid", name: "旋转幼崽", hp: 10, atk: 2, armor: 0, type: "monster",
        skill: { id: "loveSpin", name: "爱好旋转", desc: "每移3次旋转一次", effects: [
          { event: "onMoveCount", action: "rotateBoard", every: 3 }
        ] } },
      { id: "walker", name: "踏步行者", hp: 9, atk: 2, armor: 0, type: "monster",
        skill: { id: "randomWalk", name: "乱步", desc: "每移3次随帮助卡换位", effects: [
          { event: "onMoveCount", action: "swapWithHelp", every: 3 }
        ] } },
      { id: "lostVoid", name: "误入虚空者", hp: 14, atk: 2, armor: 0, type: "monster" },
    ],
    t2: [
      { id: "skyEye", name: "空中巨眼", hp: 14, atk: 2, armor: 2, type: "monster",
        skill: { id: "airStrike", name: "空中打击", desc: "移角落格对玩家2伤先攻", effects: [
          { event: "onMoveToCorner", action: "dmgPlayer", amount: 2 },
          { event: "onCombat", action: "firstStrike" }
        ] } },
      { id: "observer", name: "观察者", hp: 8, atk: 2, armor: 3, type: "monster",
        skill: { id: "armorBreak", name: "破防专家", desc: "移上排减玩家护甲2", effects: [
          { event: "onMoveToTopRow", action: "reducePlayerArmor", amount: 2 }
        ] } },
      { id: "worldSpinner", name: "转动世界的手", hp: 12, atk: 3, armor: 0, type: "monster",
        skill: { id: "spin", name: "转动", desc: "登场旋转；战斗攻击+1", effects: [
          { event: "onEnter", action: "rotateBoard" }, { event: "onCombat", action: "atkUp", amount: 1 }
        ] } },
    ],
    t3: [
      { id: "mist", name: "迷雾", hp: 10, atk: 1, armor: 0, type: "monster",
        skill: { id: "wander", name: "漫步", desc: "每移1次攻击+2", effects: [
          { event: "onMoveCount", action: "atkUp", every: 1, amount: 2 }
        ] } },
      { id: "friendlyAncient", name: "友好的远古生物", hp: 18, atk: 2, armor: 5, type: "monster",
        skill: { id: "gift", name: "礼物", desc: "每移3次旋转轮入道具牌格", effects: [
          { event: "onMoveCount", action: "giftItem", every: 3, itemId: "spinWheel" }
        ] } },
    ],
    boss: { id: "spaceMaster", name: "空间大师", hp: 42, atk: 4, armor: 10, type: "monster", isBoss: true,
      skill: { id: "spaceControl", name: "空间掌握+异界帮助", desc: "攻击+3先攻反伤3战后旋转", effects: [
        { event: "onCombat", action: "atkUp", amount: 3 }, { event: "onCombat", action: "firstStrike" },
        { event: "onCombat", action: "reflectDmg", amount: 3 }, { event: "postCombat", action: "rotateBoard" }
      ] } },
  },
];

// ============================================================
// 导出给 GameState 使用
// ============================================================

function pickDeck(decks) { return decks[Math.floor(Math.random() * decks.length)]; }

export function buildMonsterDeckByNode(layer, node) {
  if (!buildMonsterDeckByNode._cache) buildMonsterDeckByNode._cache = {};
  if (!buildMonsterDeckByNode._cache[layer]) {
    buildMonsterDeckByNode._cache[layer] = {
      weak: pickDeck(WEAK_ELITE_DECKS), strong: pickDeck(STRONG_ELITE_DECKS), boss: pickDeck(BOSS_DECKS),
    };
  }
  const cache = buildMonsterDeckByNode._cache[layer];
  let deck, t1=0, t2=0, t3=0, addElite=false, addBoss=false;
  if (node <= 3) { deck = cache.weak;
    if (node===1) { t1=7+Math.floor(Math.random()*2); }
    else if (node===2) { t1=5+Math.floor(Math.random()*2); t2=3+Math.floor(Math.random()*2); }
    else { t1=3+Math.floor(Math.random()*2); t2=5+Math.floor(Math.random()*2); t3=2+Math.floor(Math.random()*3); addElite=true; }
  } else if (node <= 6) { deck = cache.strong;
    if (node===4) { t1=8+Math.floor(Math.random()*2); }
    else if (node===5) { t1=6+Math.floor(Math.random()*2); t2=4+Math.floor(Math.random()*2); }
    else { t1=4+Math.floor(Math.random()*2); t2=5+Math.floor(Math.random()*2); t3=3+Math.floor(Math.random()*3); addElite=true; }
  } else { deck = cache.boss;
    if (node===7) { t1=8+Math.floor(Math.random()*2); }
    else if (node===8) { t1=6+Math.floor(Math.random()*2); t2=6+Math.floor(Math.random()*2); }
    else { t1=4+Math.floor(Math.random()*2); t2=7+Math.floor(Math.random()*2); t3=3+Math.floor(Math.random()*3); addBoss=true; }
  }
  const monsters = [];
  const addWithVariety = (pool, count) => {
    if (count < pool.length) { for (let i=0;i<count;i++) { const m=pool[Math.floor(Math.random()*pool.length)]; monsters.push({...m,uid:`md_${monsters.length+1}`}); } }
    else { pool.forEach((m) => monsters.push({...m,uid:`md_${monsters.length+1}`})); for (let i=0;i<count-pool.length&&pool.length>0;i++) { const m=pool[Math.floor(Math.random()*pool.length)]; monsters.push({...m,uid:`md_${monsters.length+1}`}); } }
  };
  addWithVariety(deck.t1||[], t1); addWithVariety(deck.t2||[], t2); addWithVariety(deck.t3||[], t3);
  if (addElite && deck.elite) monsters.push({...deck.elite, uid:`md_elite_${monsters.length+1}`});
  if (addBoss && deck.boss) monsters.push({...deck.boss, uid:`md_boss_${monsters.length+1}`});
  for (let i=monsters.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [monsters[i],monsters[j]]=[monsters[j],monsters[i]]; }
  return monsters;
}

// 旧简单池（保留兼容）
export const MONSTER_POOLS = {
  tier1: [{ id: "beggar", name: "乞丐", hp: 4, atk: 2, armor: 0, type: "monster" }],
  tier2: [{ id: "thug", name: "混混", hp: 6, atk: 2, armor: 0, type: "monster" }],
  tier3: [{ id: "hitman", name: "杀手", hp: 6, atk: 3, armor: 4, type: "monster" }],
};
