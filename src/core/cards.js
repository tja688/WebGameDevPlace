// 卡牌对象工厂 — 扁平化数据模型

export function createPlayerCard(playerName) {
  return { type: 'player', name: playerName || '你', revealed: true };
}

/**
 * 创建怪物卡 — 兼容模板对象和实例对象
 * 模板: { id, name, hp, atk, def, level, keywords, description }
 * 实例: { templateId, name, hp, maxHp, atk, def, level, keywords, ... }
 */
export function createMonsterCard(templateOrInstance) {
  const t = templateOrInstance;
  const templateId = t.templateId || t.id;
  return {
    type: 'monster',
    templateId,
    name: t.name,
    revealed: false,
    hp: t.hp,
    maxHp: t.maxHp ?? t.hp,
    atk: t.atk,
    def: t.def,
    level: t.level,
    keywords: [...(t.keywords || [])],
    description: t.description || '',
    vengeanceStacks: t.vengeanceStacks || 0,
    aggressiveCounter: t.aggressiveCounter || 0,
  };
}

export function createGoldCard() {
  return { type: 'goldCard', name: '金币', revealed: false, value: 20, description: '获得20金币' };
}

export function createChestCard(quality = 'white') {
  const names = { white: '宝箱', blue: '蓝色宝箱', gold: '金色宝箱' };
  return {
    type: 'chest', name: names[quality] || '宝箱',
    revealed: false, quality, description: '可以开出遗物。',
  };
}

export function createFoodCard() {
  return { type: 'food', name: '食物', revealed: true, description: '回满血量。' };
}

export function createMentorCard(skillId) {
  const skills = {
    thorns: { name: '刺皮', desc: '被攻击时对攻击者造成反击伤害。' },
    toughSkin: { name: '硬皮', desc: '生命上限+10，清空房间时恢复10点生命。' },
    veteran: { name: '历战', desc: '每次与敌人互动时攻击+1。' },
  };
  const skill = skills[skillId];
  return {
    type: 'mentor', name: '导师', revealed: true, skillId,
    skillName: skill?.name || '未知', description: skill?.desc || '教会你一项技能。',
  };
}

export function createAttrUpCard() {
  return { type: 'attrUp', name: '属性提升', revealed: true, description: '攻击+1 / 防御+1 / 生命+2' };
}

export function createTrapCard(trapType) {
  const traps = {
    crossbow: { name: '弩箭机关', hp: 2, atk: 0, def: 0, description: '摧毁后对同列上方所有翻开的卡造成6点伤害。' },
    spike: { name: '尖刺机关', hp: 4, atk: 6, def: 0, description: '翻开后，下一次玩家行动后对相邻卡牌造成6点伤害。' },
    teleport: { name: '传送机关', hp: 1, atk: 0, def: 0, description: '摧毁后洗牌重布，玩家随机移动。' },
  };
  const trap = traps[trapType];
  return {
    type: 'trap', name: trap.name, revealed: false, templateId: trapType,
    hp: trap.hp, maxHp: trap.hp, atk: trap.atk, def: trap.def,
    description: trap.description, triggered: false,
  };
}

export function createShopCard(shopDef) {
  return {
    type: 'shopItem', name: shopDef.name, revealed: true,
    cost: shopDef.cost, effect: shopDef.effect,
    description: `${shopDef.description} (${shopDef.cost}金币)`,
  };
}
