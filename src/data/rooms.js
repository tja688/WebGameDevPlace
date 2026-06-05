// 房间类型配置

export const ROOM_TYPES = {
  normal: {
    id: 'normal',
    name: '普通战斗',
    description: '普通的怪物房间。',
    extraCards: [],
  },
  elite: {
    id: 'elite',
    name: '精英战斗',
    description: '更强的怪物，更好的奖励。',
    extraCards: [{ type: 'eliteMarker' }],
  },
  boss: {
    id: 'boss',
    name: '层主战斗',
    description: '这一层的最终挑战。',
    extraCards: [{ type: 'bossMarker' }],
  },
  shop: {
    id: 'shop',
    name: '商店',
    description: '可以购买强化和道具。',
    extraCards: [{ type: 'shopItems', count: 5 }],
  },
  gold: {
    id: 'gold',
    name: '金币房',
    description: '额外出现金币。',
    extraCards: [{ type: 'goldCard' }],
  },
  chest: {
    id: 'chest',
    name: '宝箱房',
    description: '额外出现宝箱。',
    extraCards: [{ type: 'chestCard' }],
  },
  attr: {
    id: 'attr',
    name: '属性房',
    description: '可以提升属性。',
    extraCards: [{ type: 'attrCard' }],
  },
  reward: {
    id: 'reward',
    name: '奖励房',
    description: '宝箱+属性提升。',
    extraCards: [{ type: 'chestCard' }, { type: 'attrCard' }],
  },
  restaurant: {
    id: 'restaurant',
    name: '餐厅',
    description: '休息、恢复、学习技能。',
    extraCards: [
      { type: 'foodCard' },
      { type: 'mentorCard' },
      { type: 'mentorCard' },
      { type: 'mentorCard' },
    ],
  },
};

// 节点1固定奖励房，节点8固定餐厅，节点9固定层主
export const FIXED_NODES = {
  0: 'reward',
  7: 'restaurant',
  8: 'boss',
};

// 路线选择可选房间（按节点范围）
export const ROUTE_CHOICES = {
  early: ['gold', 'chest', 'attr'], // 节点1-3战后
  mid: ['gold', 'chest', 'attr', 'shop', 'elite'], // 节点4-6战后
};

export function getRouteChoices(nodeIndex) {
  if (nodeIndex < 3) return ROUTE_CHOICES.early;
  return ROUTE_CHOICES.mid;
}
