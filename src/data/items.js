// 道具卡数据

export const ITEMS = {
  grapplingHook: {
    id: 'grapplingHook',
    name: '勾绳',
    description: '将目标卡牌移动到相邻格子。',
    effect: 'moveCard',
  },
  healingPotion: {
    id: 'healingPotion',
    name: '恢复药水',
    description: '恢复6点生命值。',
    effect: 'heal',
    value: 6,
  },
  throwingKnife: {
    id: 'throwingKnife',
    name: '飞刀',
    description: '对怪物造成6点伤害。',
    effect: 'damage',
    value: 6,
  },
  blessing: {
    id: 'blessing',
    name: '庇佑魔法',
    description: '下一次受到伤害时，该次伤害变为0。',
    effect: 'shield',
    value: 1,
  },
  flipCard: {
    id: 'flipCard',
    name: '翻转卡',
    description: '将一张正面朝上的非玩家卡与一张正面朝下的卡牌互换位置。',
    effect: 'swap',
  },
  lightCard: {
    id: 'lightCard',
    name: '照明卡',
    description: '使目标格子正交相邻的格子最上方卡牌正面朝上。',
    effect: 'revealAdjacent',
  },
  violenceCard: {
    id: 'violenceCard',
    name: '暴力卡',
    description: '玩家攻击翻倍，与怪物互动一次后复原。',
    effect: 'doubleAtk',
  },
};

export const SHOP_ITEMS = [
  { type: 'attrAtk', name: '攻击强化', description: '攻击+1', cost: 50, effect: 'atk+1' },
  { type: 'attrDef', name: '防御强化', description: '防御+1', cost: 50, effect: 'def+1' },
  { type: 'attrHp', name: '生命强化', description: '血量+2', cost: 50, effect: 'hp+2' },
  { type: 'randomItem', name: '随机道具', description: '获得一张随机道具卡', cost: 30, effect: 'randomItem' },
  { type: 'chest', name: '宝箱卡', description: '一张宝箱卡', cost: 100, effect: 'chest' },
];

export function getRandomItems(count) {
  const pool = Object.values(ITEMS);
  const result = [];
  for (let i = 0; i < count; i++) {
    const template = pool[Math.floor(Math.random() * pool.length)];
    result.push(createItemInstance(template));
  }
  return result;
}

export function createItemInstance(template) {
  return {
    type: 'item',
    templateId: template.id,
    name: template.name,
    description: template.description,
    effect: template.effect,
    value: template.value ?? 0,
    revealed: true,
  };
}

export function createShopItem(shopDef) {
  return {
    type: 'shopItem',
    name: shopDef.name,
    description: shopDef.description,
    cost: shopDef.cost,
    effect: shopDef.effect,
    revealed: true,
  };
}
