// ============================================================
// RelicData — 遗物数据定义
// 属性加成 + 触发效果（效果暂存结构，后续接入事件系统）
// ============================================================

export const RELICS = {

  // ===== 白色 =====

  woodSword: {
    id: "woodSword", name: "木剑", rarity: "white",
    attr: { atk: 1 },
    effects: [],
    desc: "攻击+1",
    // 套装：木制套装（木剑+木盾+木甲→各额外+2）
    set: "wooden",
  },

  woodShield: {
    id: "woodShield", name: "木盾", rarity: "white",
    attr: { baseArmor: 1 },
    effects: [],
    desc: "基础护甲+1",
    set: "wooden",
  },

  woodArmor: {
    id: "woodArmor", name: "木甲", rarity: "white",
    attr: { maxHp: 2 },
    effects: [],
    desc: "血量上限+2",
    set: "wooden",
  },

  slingshot: {
    id: "slingshot", name: "弹弓", rarity: "white",
    attr: {},
    effects: [{ event: "onKill", action: "aoe_damage", amount: 4, target: "random_monster" }],
    desc: "击杀怪物时，对随机怪物造成4点伤害",
  },

  shieldBreaker: {
    id: "shieldBreaker", name: "打盾刀", rarity: "white",
    attr: {},
    effects: [{ event: "onKill", action: "addArmor", amount: 1 }],
    desc: "击杀怪物时，获得1点护甲",
  },

  goldBlade: {
    id: "goldBlade", name: "打金刀", rarity: "white",
    attr: {},
    effects: [{ event: "onKill", action: "gainGold", amount: 2 }],
    desc: "击杀怪物时，额外获得2金币",
  },

  recycler: {
    id: "recycler", name: "废物利用机", rarity: "white",
    attr: {},
    effects: [{ event: "onUseHelpCard", action: "heal", amount: 2 }],
    desc: "使用帮助卡时，恢复2点血量",
  },

  // ===== 蓝色 =====

  ironShield: {
    id: "ironShield", name: "铁盾", rarity: "blue",
    attr: { baseArmor: 2 },
    effects: [{ type: "dmgReduction", amount: 1 }],
    desc: "基础护甲+2，受到的所有伤害减少1点",
  },

  vitalityAmulet: {
    id: "vitalityAmulet", name: "活力护符", rarity: "blue",
    attr: { maxHp: 6 },
    effects: [],
    desc: "血量上限+6",
  },

  // ===== 金色 =====

  phoenixFeather: {
    id: "phoenixFeather", name: "凤凰羽毛", rarity: "gold",
    attr: { maxHp: 8 },
    effects: [{ event: "onFatalDamage", action: "revive", healPercent: 0.5, consumable: true }],
    desc: "受到致命伤害时，恢复50%血量并永久移除（一次性免死）",
  },

  crave: {
    id: "crave", name: "渴望", rarity: "gold",
    attr: { maxHp: 10 },
    effects: [],
    desc: "所有恢复血量效果翻倍",
  },

  metalBlood: {
    id: "metalBlood", name: "金属血液", rarity: "gold",
    attr: {},
    effects: [{ event: "onDamage", action: "armorFromHpLoss" }],
    desc: "损失血量后获得等量的当前护甲",
  },

  trader: {
    id: "trader", name: "操盘手", rarity: "blue",
    attr: {},
    effects: [],
    desc: "互动距离不再受限制",
  },
};

/** 按品质随机获取遗物列表 */
export function getRelicsByRarity(rarity) {
  return Object.values(RELICS).filter((r) => r.rarity === rarity);
}

/** 随机选取 N 个不重复遗物 */
export function rollRelics(count = 3, excludeIds = []) {
  const pool = Object.values(RELICS).filter((r) => !excludeIds.includes(r.id));
  const picked = [];
  const used = new Set();
  for (let i = 0; i < count && used.size < pool.length; i++) {
    let r;
    do { r = pool[Math.floor(Math.random() * pool.length)]; }
    while (used.has(r.id));
    used.add(r.id);
    picked.push({ ...r });
  }
  return picked;
}

/** 按概率 roll 品质 */
export function rollRelicRarity() {
  const r = Math.random();
  if (r < 0.65) return "white";
  if (r < 0.95) return "blue";
  return "gold";
}
