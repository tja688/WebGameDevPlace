// ============================================================
// SkillData — 技能数据定义
// 包含玩家技能、怪物技能数据结构（怪物技能60+后续挂载）
// ============================================================

export const SKILLS = {

  // ===== 玩家初始技能 =====

  lightCarriage: {
    id: "lightCarriage", name: "轻车熟路", type: "player",
    desc: "每关卡结束时，进行一次白色帮助卡三选一",
    // 效果在第五阶段关卡进程时接入
  },

  // ===== 玩家可选技能（导师卡）=====

  thornSkin: {
    id: "thornSkin", name: "刺皮", type: "player",
    desc: "战斗时对怪物造成等同于其攻击的伤害",
    effects: [{ event: "onCombat", action: "counterByMonsterAtk" }],
  },

  hardenedSkin: {
    id: "hardenedSkin", name: "硬皮", type: "player",
    attr: { maxHp: 10 },
    desc: "血量上限+10",
  },

  veteran: {
    id: "veteran", name: "历战", type: "player",
    desc: "战斗时攻击+2（仅对当前敌人有效）",
    effects: [{ event: "onCombat", action: "tempAtk", amount: 2 }],
  },

  // ===== 通用技能 =====

  firstStrike: {
    id: "firstStrike", name: "先攻", type: "universal",
    desc: "战斗中优先造成伤害",
    effects: [{ event: "onCombat", action: "firstStrike" }],
  },

  blessed: {
    id: "blessed", name: "庇佑", type: "universal",
    desc: "下一次受到伤害变为0（不可叠加）",
    effects: [{ event: "onDamage", action: "nullifyOnce", consumable: true }],
  },
};

/** 玩家导师卡可选技能列表 */
export const MENTOR_SKILLS = ["thornSkin", "hardenedSkin", "veteran"];

/** 按 ID 获取技能深拷贝 */
export function getSkill(id) {
  const sk = SKILLS[id];
  return sk ? { ...sk } : null;
}

/** 随机选取 N 个导师卡技能 */
export function rollMentorSkills(count = 3) {
  const pool = [...MENTOR_SKILLS];
  const picked = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(getSkill(pool.splice(idx, 1)[0]));
  }
  return picked;
}
