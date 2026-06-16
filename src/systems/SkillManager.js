// ============================================================
// SkillManager — 技能管理器（单例）
// 管理玩家技能的获取/叠加/移除
// ============================================================

class SkillManager {
  constructor() {
    /** @type {Array<object>} 玩家已习得技能 */
    this.playerSkills = [];
  }

  /** 添加技能（玩家技能不可叠加同名） */
  addSkill(skillData) {
    const existing = this.playerSkills.find((s) => s.id === skillData.id);
    if (existing) {
      console.log(`[SkillManager] 技能已存在: ${skillData.name}，不重复添加`);
      return false;
    }
    this.playerSkills.push({ ...skillData });
    console.log(`[SkillManager] 习得技能: ${skillData.name}`);
    return true;
  }

  /** 移除技能 */
  removeSkill(id) {
    const idx = this.playerSkills.findIndex((s) => s.id === id);
    if (idx >= 0) {
      const removed = this.playerSkills.splice(idx, 1)[0];
      console.log(`[SkillManager] 技能移除: ${removed.name}`);
      return removed;
    }
    return null;
  }

  /** 是否拥有某技能 */
  hasSkill(id) {
    return this.playerSkills.some((s) => s.id === id);
  }

  /** 获取所有技能 */
  getAllSkills() {
    return [...this.playerSkills];
  }

  /** 获取技能提供的总属性加成 */
  getAttrBonuses() {
    let atk = 0, maxHp = 0;
    for (const sk of this.playerSkills) {
      if (sk.attr) {
        if (sk.attr.atk) atk += sk.attr.atk;
        if (sk.attr.maxHp) maxHp += sk.attr.maxHp;
      }
    }
    return { atk, maxHp };
  }

  /** 查询战斗相关技能效果 */
  getCombatEffects() {
    const effects = [];
    for (const sk of this.playerSkills) {
      if (sk.effects) effects.push(...sk.effects);
    }
    return effects;
  }

  /** 重置 */
  reset() {
    this.playerSkills = [];
  }
}

const skillManager = new SkillManager();
export default skillManager;
