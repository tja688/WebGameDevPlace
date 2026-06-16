import gameState from "../core/GameState.js";
import { refreshMonsterCardDisplay } from "../cards/CardFactory.js";

// ============================================================
// RelicManager — 遗物管理器（单例）
// 管理装备/丢弃/属性汇总/上限 12 件
// ============================================================

// 遗物事件注册式：event -> action -> handler
const RELIC_EVENT_ACTION_HANDLERS = {
  onKill: {
    aoe_damage: (eff, context) => {
      const { gridManager } = context || {};
      if (!gridManager) return;

      // 找一只存活且未被销毁的怪物
      for (let s = 1; s <= 9; s++) {
        const c = gridManager.slotContents[s];
        if (c && c.cardData?.type === "monster" && c.cardData.hp > 0 && c.scene) {
          const dmg = eff.amount || 0;
          c.cardData.hp = Math.max(0, c.cardData.hp - dmg);
          refreshMonsterCardDisplay(c);
          if (c.cardData.hp <= 0) {
            gridManager.slotContents[s] = null;
            c.destroy();
          }
          break;
        }
      }
    },
    addArmor: (eff) => gameState.addArmor(eff.amount || 0),
    gainGold: (eff) => gameState.addGold(eff.amount || 0),
  },

  onUseHelpCard: {
    heal: (eff) => gameState.heal(eff.amount || 0),
  },

  onFatalDamage: {
    revive: (eff, _context, api) => {
      if (gameState.hp > 0) return;
      gameState.hp = Math.ceil(gameState.getEffectiveMaxHp() * (eff.healPercent || 0.5));
      console.log(`[凤凰羽毛] 复活！恢复至 ${gameState.hp} HP`);
      if (eff.consumable) api?.consume?.();
    },
  },
};

class RelicManager {
  constructor() {
    /** @type {Array<object|null>} 12 格装备栏 */
    this.slots = new Array(12).fill(null);
    /** @type {Phaser.Scene|null} */
    this.scene = null;
    /** UI 更新回调 */
    this._onUpdate = null;
  }

  setScene(scene) { this.scene = scene; }
  onUpdate(fn) { this._onUpdate = fn; }

  // ============================================================
  // 装备 / 丢弃
  // ============================================================

  /** @returns {number} 装备到的格子索引，-1 表示失败 */
  equip(relicData) {
    const idx = this.slots.findIndex((s) => s === null);
    if (idx < 0) {
      console.log("[RelicManager] 装备栏已满！");
      return -1;
    }
    this.slots[idx] = { ...relicData };
    // 获得血量上限时立刻获得等量的血量
    if (relicData.attr && relicData.attr.maxHp) {
      gameState.hp += relicData.attr.maxHp;
    }
    console.log(`[RelicManager] 装备 ${relicData.name} → 槽${idx + 1}`);
    if (this._onUpdate) this._onUpdate();
    return idx;
  }

  /** 丢弃指定位置的遗物 */
  discard(index) {
    if (index < 0 || index >= 12 || !this.slots[index]) return null;
    const relic = this.slots[index];
    this.slots[index] = null;
    gameState.addGold(20);
    console.log(`[RelicManager] 丢弃 ${relic.name}，+20💰`);
    if (this._onUpdate) this._onUpdate();
    return relic;
  }

  // ============================================================
  // 属性汇总
  // ============================================================

  /** 获取所有遗物提供的属性加成 */
  getAttrBonuses() {
    let atk = 0, baseArmor = 0, maxHp = 0;
    for (const slot of this.slots) {
      if (!slot || !slot.attr) continue;
      if (slot.attr.atk) atk += slot.attr.atk;
      if (slot.attr.baseArmor) baseArmor += slot.attr.baseArmor;
      if (slot.attr.maxHp) maxHp += slot.attr.maxHp;

      // 套装加成
      if (slot.set === "wooden") {
        const wooden = this.slots.filter((s) => s && s.set === "wooden");
        if (wooden.length >= 3) {
          if (slot.id === "woodSword") atk += 2;
          if (slot.id === "woodShield") baseArmor += 2;
          if (slot.id === "woodArmor") maxHp += 8;
        }
      }
    }
    return { atk, baseArmor, maxHp };
  }

  /** 获取伤害减免值 */
  getDmgReduction() {
    let reduction = 0;
    for (const slot of this.slots) {
      if (!slot || !slot.effects) continue;
      for (const e of slot.effects) {
        if (e.type === "dmgReduction") reduction += e.amount;
      }
    }
    return reduction;
  }

  // ============================================================
  // 触发效果
  // ============================================================

  /**
   * 触发遗物的事件效果
   * @param {string} event - 事件名：onKill / onUseHelpCard / onFatalDamage
   * @param {object} context - 上下文（scene, gridManager, target等）
   * @returns {boolean} 是否触发了消耗性遗物（如凤凰羽毛）
   */
  triggerEffects(event, context) {
    let consumed = false;
    for (let i = 0; i < 12; i++) {
      const relic = this.slots[i];
      if (!relic || !relic.effects) continue;
      for (const eff of relic.effects) {
        if (eff.event !== event) continue;
        console.log(`[遗物触发] ${relic.name}: ${eff.action}`);

        const handler = RELIC_EVENT_ACTION_HANDLERS[event]?.[eff.action];
        if (!handler) {
          console.warn(`[RelicManager] 未实现遗物事件处理：event=${event} action=${eff.action}`);
          continue;
        }

        handler(eff, context, {
          consume: () => {
            this.slots[i] = null;
            consumed = true;
          },
        });
      }
    }
    if (consumed && this._onUpdate) this._onUpdate();
    return consumed;
  }

  // ============================================================
  // 查询
  // ============================================================

  hasRelic(id) {
    return this.slots.some((s) => s && s.id === id);
  }

  hasFreeSlot() {
    return this.slots.some((s) => s === null);
  }

  getAllRelics() {
    return this.slots.filter(Boolean);
  }

  getEquippedIds() {
    return this.slots.filter(Boolean).map((s) => s.id);
  }
}

const relicManager = new RelicManager();
export default relicManager;
