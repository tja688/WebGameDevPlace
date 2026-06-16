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
 *   dmgPlayer   — 对玩家造成伤害（如烈焰）
 *   remove_self — 仅移除本卡（位置效果由代码系统处理）
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

  // ===== 白色（位置效果）=====
  rollingRock: {
    id: "rollingRock",
    name: "滚石",
    rarity: "white",
    price: 50,
    effect: { type: "remove_self" },
    desc: " [场上] 移动到格3且格6为普通怪物时，移除格6怪物并移除本卡。",
  },

  bearTrap: {
    id: "bearTrap",
    name: "捕熊陷阱",
    rarity: "white",
    price: 50,
    effect: { type: "remove_self" },
    desc: " [场上] 当正交相邻格补牌且为怪物卡时，造成10点伤害并移除本卡。",
  },

  // ===== 蓝色（位置效果）=====
  healingFountain: {
    id: "healingFountain",
    name: "治疗泉",
    rarity: "blue",
    price: 80,
    effect: { type: "remove_self" },
    desc: " [场上] 移动到玩家正交相邻格时为玩家恢复2点血量；[道具牌格] 战斗时恢复1点血量。",
  },

  // ===== 金色（位置效果）=====
  lookoutTower: {
    id: "lookoutTower",
    name: "瞭望塔",
    rarity: "gold",
    price: 150,
    effect: { type: "remove_self" },
    desc: " [场上] 移动到格1/3/7/9时对随机怪物造成3点伤害（触发4次后移除）；[道具牌格] 战斗时造成2点随机伤害。",
  },

  multiplierTower: {
    id: "multiplierTower",
    name: "倍增塔",
    rarity: "gold",
    price: 150,
    effect: { type: "remove_self" },
    desc: " [场上] 位于格1时，对怪物使用的帮助卡触发两次；[道具牌格] 对玩家使用的帮助卡生效两次并永久移除本卡。",
  },

  // ===== 红色（位置效果）=====
  flame: {
    id: "flame",
    name: "烈焰",
    rarity: "red",
    price: 400,
    effect: { type: "dmgPlayer", amount: 4 },
    desc: " [场上] 移动到玩家正交相邻格时对玩家造成2点伤害；[使用时] 对玩家造成4点伤害并永久移除；[关卡结束] 若未使用则永久移除。",
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
