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

  spinWheel: {
    id: "spinWheel", name: "旋转轮", rarity: "white", price: 20,
    effect: { type: "reverse_rotate" },
    desc: "逆时针旋转一次",
  },

  violenceCard: {
    id: "violenceCard", name: "暴力卡", rarity: "white", price: 30,
    effect: { type: "double_atk_temp" },
    desc: "攻击翻倍，互动一次后复原",
  },

  teleportCard: {
    id: "teleportCard", name: "传送卡", rarity: "white", price: 30,
    effect: { type: "shuffle_back", target: "any_non_player" },
    desc: "选择一张非玩家卡洗回战斗卡组",
  },

  swapCard: {
    id: "swapCard", name: "交换卡", rarity: "white", price: 50,
    effect: { type: "swap_two_cards", target: "two_non_player" },
    desc: "选择两张非玩家卡互换位置",
  },

  kidnapCard: {
    id: "kidnapCard", name: "绑票", rarity: "blue", price: 100,
    effect: { type: "kidnap", target: "non_elite_monster" },
    desc: "移除一张普通怪物并获得其护甲值",
  },

  bloodConvert: {
    id: "bloodConvert", name: "血液转换", rarity: "white", price: 50,
    effect: { type: "blood_convert" },
    desc: "扣除5点血量上限，随机获得一种奖励",
  },

  healSpring: {
    id: "healSpring", name: "治疗泉", rarity: "blue", price: 80,
    effect: { type: "heal", amount: 3 },
    desc: "恢复3点血量（场上移动至相邻时恢复2）",
    onFieldSkill: { id: "healSpring", name: "治疗泉涌", desc: "", effects: [
      { event: "onMoveToAdjacent", action: "healPlayer", amount: 2 }
    ] },
  },

  ramTutorial: {
    id: "ramTutorial", name: "撞击教程", rarity: "blue", price: 80,
    effect: { type: "damage_hp_based", target: "monster" },
    desc: "对目标造成等同于玩家当前血量的伤害",
  },

  shieldTutorial: {
    id: "shieldTutorial", name: "盾击教程", rarity: "blue", price: 80,
    effect: { type: "damage_armor_based", target: "monster" },
    desc: "对目标造成等同于玩家当前护甲的伤害",
  },

  rollingStone: {
    id: "rollingStone", name: "滚石", rarity: "white", price: 50,
    effect: { type: "remove_self" },
    desc: "移动到格3时移除格6普通怪物，后移除本卡",
    onFieldSkill: { id: "rollingStone", name: "滚石碾压", desc: "", effects: [
      { event: "onMoveToSlot", action: "killSlot6Monster", slot: 3 }
    ] },
  },

  bearTrap: {
    id: "bearTrap", name: "捕熊陷阱", rarity: "white", price: 50,
    effect: { type: "remove_self" },
    desc: "正交相邻格补牌时若为怪物造成10伤害后移除",
  },

  watchTower: {
    id: "watchTower", name: "瞭望塔", rarity: "gold", price: 150,
    effect: { type: "remove_self" },
    desc: "移动到角落格时对随机怪物造成3伤害（4次后移除）",
  },

  doubleTower: {
    id: "doubleTower", name: "倍增塔", rarity: "gold", price: 150,
    effect: { type: "remove_self" },
    desc: "在格1时对怪物使用的帮助卡触发两次",
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

  flame: {
    id: "flame", name: "烈焰", rarity: "red", price: 400,
    effect: { type: "damage_to_player", amount: 4 },
    desc: "使用时对玩家造成4点伤害并永久移除",
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
