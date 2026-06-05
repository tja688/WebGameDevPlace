// 遗物数据

export const RELICS = {
  villageSword: {
    id: 'villageSword',
    name: '村好剑',
    type: 'passive',
    quality: 'initial',
    atk: 1,
    description: '攻击+1。每次击败精英或层主时，攻击永久+2。',
    effect: 'killEliteAtkUp',
  },
  livingFlesh: {
    id: 'livingFlesh',
    name: '活着的肉',
    type: 'passive',
    quality: 'white',
    atk: 1,
    description: '攻击+1。每进入三个房间攻击额外+1（最多+6额外攻击）。',
    effect: 'roomAtkUp',
  },
  woodenShield: {
    id: 'woodenShield',
    name: '木盾',
    type: 'passive',
    quality: 'white',
    def: 1,
    description: '防御+1。',
    effect: null,
  },
  ruleWand: {
    id: 'ruleWand',
    name: '法则魔杖',
    type: 'active',
    quality: 'white',
    atk: 1,
    description: '攻击+1。可将任意一张牌移动到任意一格（每房间一次）。',
    effect: 'teleportCard',
    cooldown: 'room',
  },
  endlessWater: {
    id: 'endlessWater',
    name: '无尽水袋',
    type: 'active',
    quality: 'white',
    hp: 2,
    description: '生命+2。主动使用恢复6点血量（每房间一次）。',
    effect: 'heal6',
    cooldown: 'room',
  },
};

export const RELIC_POOL = {
  white: ['livingFlesh', 'woodenShield', 'ruleWand', 'endlessWater'],
  blue: [],
  gold: [],
};

export function getRandomRelic() {
  const roll = Math.random();
  let quality;
  if (roll < 0.65) quality = 'white';
  else if (roll < 0.95) quality = 'blue';
  else quality = 'gold';

  const pool = RELIC_POOL[quality];
  if (!pool || pool.length === 0) {
    // fallback to white
    const fallback = RELIC_POOL.white;
    const id = fallback[Math.floor(Math.random() * fallback.length)];
    return createRelicInstance(RELICS[id]);
  }
  const id = pool[Math.floor(Math.random() * pool.length)];
  return createRelicInstance(RELICS[id]);
}

export function getRelicChoices() {
  const choices = [];
  for (let i = 0; i < 3; i++) {
    choices.push(getRandomRelic());
  }
  return choices;
}

export function createRelicInstance(template) {
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    quality: template.quality,
    atk: template.atk || 0,
    def: template.def || 0,
    hp: template.hp || 0,
    description: template.description,
    effect: template.effect,
    cooldown: template.cooldown || null,
    usedThisRoom: false,
  };
}
