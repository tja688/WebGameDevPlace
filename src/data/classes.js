// 职业数据

export const CLASSES = {
  soldier: {
    id: 'soldier',
    name: '兵大哥',
    hp: 8,
    maxHp: 8,
    atk: 3,
    def: 1,
    startingRelic: 'villageSword',
    description: '可靠的近战战士，攻守兼备。',
  },
};

export function createPlayer(classId) {
  const cls = CLASSES[classId];
  if (!cls) return null;
  return {
    type: 'player',
    name: cls.name,
    classId: cls.id,
    hp: cls.hp,
    maxHp: cls.maxHp,
    atk: cls.atk,
    def: cls.def,
    gold: 0,
    keywords: [],
    relics: cls.startingRelic ? [cls.startingRelic] : [],
    activeRelics: [],
    items: [],
    roomCount: 0,
    killCount: 0,
    tempAtkBonus: 0,
    tempDefBonus: 0,
    shield: 0,
    // 技能词条
    skills: {
      thorns: false,  // 刺皮
      toughSkin: false, // 硬皮
      veteran: false, // 历战
    },
  };
}
