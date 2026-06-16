// ============================================================
// HelpCardData — 帮助卡完整数据（效果结构化，可被代码解析执行）
// ============================================================

/**
 * 效果类型枚举：
 *   damage      — 对目标怪物造成伤害
 *   aoe_damage  — 对所有怪物造成伤害
 *   heal        — 恢复玩家血量
 *   shield      — 获得当前护甲
 *   gold        — 获得金币
 *   buff_atk    — 临时攻击翻倍（暴力卡）
 *   full_heal   — 回满血量（食品卡）
 *   blessed     — 下一次伤害变为0（庇佑）
 *   reduce_armor — 降低目标护甲（破击锤）
 */

/** 全部帮助卡数据 */
export const HELP_CARDS = {

  // ===== 白色 =====

  potion: {
    id: "potion", name: "恢复药水", rarity: "white", price: 30,
    effect: { type: "heal", amount: 10 },
    desc: "恢复10点血量",
  },

  dagger: {
    id: "dagger", name: "飞刀", rarity: "white", price: 20,
    effect: { type: "damage", amount: 6 },
    desc: "对目标造成6点伤害",
  },

  fireball: {
    id: "fireball", name: "火球术", rarity: "white", price: 30,
    effect: { type: "damage", amount: "playerAtk" },
    desc: "对目标造成等同于玩家攻击的伤害",
  },

  bomb: {
    id: "bomb", name: "爆弹", rarity: "white", price: 50,
    effect: { type: "aoe_damage", amount: 4 },
    desc: "对所有怪物造成4点伤害",
  },

  blessing: {
    id: "blessing", name: "庇佑魔法卡", rarity: "white", price: 20,
    effect: { type: "blessed" },
    desc: "下一次受伤变为0",
  },

  // ===== 蓝色 =====

  goldCard: {
    id: "goldCard", name: "金币卡", rarity: "blue", price: 30,
    effect: { type: "gold", amount: 50 },
    desc: "获得50金币",
  },

  food: {
    id: "food", name: "食品卡", rarity: "blue", price: 50,
    effect: { type: "full_heal" },
    desc: "血量回满",
  },

  shieldCard: {
    id: "shieldCard", name: "耐用盾牌", rarity: "blue", price: 50,
    effect: { type: "shield", amount: 5 },
    desc: "获得5点护甲",
  },

  armorsmash: {
    id: "armorsmash", name: "破击锤", rarity: "blue", price: 50,
    effect: { type: "reduce_armor", amount: 10 },
    desc: "目标护甲降低10点",
  },

  chestWhite: {
    id: "chestWhite", name: "普通宝箱卡", rarity: "blue", price: 100,
    effect: { type: "chest", rarityPool: { white: 0.65, blue: 0.30, gold: 0.05 } },
    desc: "三选一遗物",
  },
};

/**
 * 按品质筛选帮助卡 ID 列表
 */
export function getHelpCardsByRarity(rarity) {
  return Object.values(HELP_CARDS).filter((c) => c.rarity === rarity).map((c) => c.id);
}

/**
 * 按概率随机选品质，返回品质字符串
 */
export function rollRarity() {
  const r = Math.random();
  if (r < 0.65) return "white";
  if (r < 0.95) return "blue";
  return "gold";
}

/**
 * 随机获取一张帮助卡的深拷贝数据
 */
export function getRandomHelpCard(rarity) {
  const cards = Object.values(HELP_CARDS).filter((c) => c.rarity === rarity);
  if (cards.length === 0) return null;
  const picked = cards[Math.floor(Math.random() * cards.length)];
  return { ...picked, uid: `h${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
}

/**
 * 随机生成 N 张帮助卡用于三选一等场景
 */
export function rollHelpCards(count = 3) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity();
    const card = getRandomHelpCard(rarity);
    if (card) result.push(card);
  }
  return result;
}
