// ============================================================
// 深入地牢 - 全局游戏状态管理
// ============================================================
import {
  CLASSES, RELICS, TRAITS, ROOM_TYPES, ITEMS, ITEM_LIST,
  MONSTERS, MONSTERS_BY_LEVEL, NODE_MONSTER_CONFIG, NODE_FIXED,
  NODE_CHOICES_EARLY, NODE_CHOICES_LATE, CARD_TYPES,
  shuffle, randomInt, getAdjacentCells
} from './constants.js';

class GameStateClass {
  constructor() {
    this.reset();
  }

  reset() {
    // 玩家属性
    this.player = null;
    // 遗物 (最多6个)
    this.relics = [];
    // 主动遗物冷却
    this.activeRelicCooldowns = {};
    // 道具卡槽 (最多2个)
    this.itemSlots = [null, null];
    // 金币
    this.gold = 0;
    // 当前楼层
    this.floor = 1;
    // 当前节点 (0-based, -1 表示还没开始)
    this.currentNode = -1;
    // 已经过的节点数
    this.nodesVisited = 0;
    // 进入的房间数 (for 活着的肉)
    this.roomsEntered = 0;
    // 活着的肉 累计攻击加成
    this.livingFleshBonus = 0;
    // 村好剑 永久攻击加成
    this.villageSwordBonus = 0;
    // 商店/属性卡 永久加成 (不会被recalcStats覆盖)
    this.shopAtkBonus = 0;
    this.shopDefBonus = 0;
    this.shopHpBonus = 0;
    // 房间内临时状态
    this.roomState = null;
  }

  initGame(classId = 'soldier') {
    const cls = CLASSES[classId];
    this.player = {
      className: cls.name,
      baseHp: cls.hp,
      baseAtk: cls.atk,
      baseDef: cls.def,
      hp: cls.hp,
      maxHp: cls.hp,
      atk: cls.atk,
      def: cls.def,
      traits: [],
      // 临时状态
      blessActive: false,
      violenceActive: false,
      firstStrikeActive: false,
      veteranTarget: null,
      veteranBonus: 0,
      armorBreakReduction: 0,
    };
    this.relics = [];
    this.itemSlots = [null, null];
    this.gold = 0;
    this.floor = 1;
    this.currentNode = -1;
    this.nodesVisited = 0;
    this.roomsEntered = 0;
    this.livingFleshBonus = 0;
    this.villageSwordBonus = 0;
    this.shopAtkBonus = 0;
    this.shopDefBonus = 0;
    this.shopHpBonus = 0;
    this.roomState = null;

    // 给予初始遗物
    if (cls.startRelic) {
      this.addRelic(cls.startRelic);
    }
  }

  addRelic(relicId) {
    if (this.relics.length >= 6) return false;
    const relic = RELICS[relicId];
    if (!relic) return false;
    // 不可重复获取
    if (this.relics.find(r => r.id === relicId)) return false;
    this.relics.push({ ...relic });
    // 应用被动加成
    this.recalcStats();
    return true;
  }

  recalcStats() {
    if (!this.player) return;
    const cls = CLASSES.soldier; // TODO: support multiple classes
    let atk = cls.atk;
    let def = cls.def;
    let maxHp = cls.hp;

    // 遗物加成
    for (const r of this.relics) {
      if (r.atkBonus) atk += r.atkBonus;
      if (r.defBonus) def += r.defBonus;
      if (r.hpBonus) maxHp += r.hpBonus;
    }

    // 活着的肉 效果加成
    atk += this.livingFleshBonus;
    // 村好剑 永久加成
    atk += this.villageSwordBonus;
    // 商店/属性卡 永久加成
    atk += this.shopAtkBonus;
    def += this.shopDefBonus;
    maxHp += this.shopHpBonus;

    // 硬皮词条
    if (this.player.traits.includes(TRAITS.THICK_HIDE)) {
      maxHp += 10;
    }

    // 历战加成
    atk += this.player.veteranBonus || 0;

    this.player.baseAtk = atk;
    this.player.baseDef = def;
    this.player.atk = atk;
    this.player.def = def;
    this.player.maxHp = maxHp;
    if (this.player.hp > maxHp) this.player.hp = maxHp;
  }

  getEffectiveAtk() {
    if (!this.player) return 0;
    let atk = this.player.baseAtk;
    if (this.player.violenceActive) atk *= 2;
    return atk;
  }

  getEffectiveDef() {
    if (!this.player) return 0;
    return Math.max(0, this.player.baseDef - (this.player.armorBreakReduction || 0));
  }

  healPlayer(amount) {
    if (!this.player) return;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
  }

  damagePlayer(amount) {
    if (!this.player) return 0;
    if (this.player.blessActive && amount > 0) {
      this.player.blessActive = false;
      return 0;
    }
    const actual = Math.max(0, amount);
    this.player.hp = Math.max(0, this.player.hp - actual);
    return actual;
  }

  enterRoom() {
    this.roomsEntered++;
    // 活着的肉 效果检查
    if (this.roomsEntered % 3 === 0 && this.livingFleshBonus < 6) {
      this.livingFleshBonus++;
    }
    // 重置房间临时状态
    if (this.player) {
      this.player.blessActive = false;
      this.player.violenceActive = false;
      this.player.firstStrikeActive = false;
      this.player.veteranTarget = null;
      this.player.veteranBonus = 0;
      this.player.armorBreakReduction = 0;
    }
    // 重置主动遗物冷却
    this.activeRelicCooldowns = {};
    this.recalcStats();
  }

  clearRoom() {
    // 硬皮恢复
    if (this.player && this.player.traits.includes(TRAITS.THICK_HIDE)) {
      this.healPlayer(10);
    }
    // 每个怪物击杀给10金 (在combat中处理)
  }

  canUseActiveRelic(relicId) {
    if (this.activeRelicCooldowns[relicId]) return false;
    return this.relics.some(r => r.id === relicId && r.active);
  }

  useActiveRelic(relicId) {
    if (!this.canUseActiveRelic(relicId)) return false;
    this.activeRelicCooldowns[relicId] = true;
    return true;
  }

  setItem(slotIndex, itemId) {
    if (slotIndex < 0 || slotIndex > 1) return false;
    this.itemSlots[slotIndex] = itemId;
    return true;
  }

  useItem(slotIndex) {
    if (slotIndex < 0 || slotIndex > 1) return null;
    const item = this.itemSlots[slotIndex];
    this.itemSlots[slotIndex] = null;
    return item;
  }

  // 生成节点房间类型选择
  generateNodeChoices(nodeIndex) {
    const nodeNum = nodeIndex + 1; // 1-based
    // 固定节点
    if (NODE_FIXED[nodeNum]) {
      return [NODE_FIXED[nodeNum]];
    }
    // Node 7 通向餐厅
    if (nodeNum === 7) {
      return [ROOM_TYPES.RESTAURANT];
    }
    // 随机选择 2-3 个
    const pool = nodeNum <= 3 ? NODE_CHOICES_EARLY : NODE_CHOICES_LATE;
    const shuffled = shuffle(pool);
    const count = randomInt(2, 3);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // 生成节点怪物配置
  generateMonsterDeck(nodeIndex, roomType) {
    const config = NODE_MONSTER_CONFIG[nodeIndex];
    if (!config) return [];

    const monsters = [];

    // Boss
    if (config.boss) {
      const bossDef = MONSTERS[config.boss];
      monsters.push(this.createMonsterCard(bossDef));
    }

    // 楼层缩放: 总数 = config.total + (floor - 1)
    const targetTotal = (config.total || 10) + (this.floor - 1);
    let remaining = targetTotal - (config.boss ? 1 : 0);

    // 精英怪物 (精英战斗房)
    if (roomType === ROOM_TYPES.ELITE) {
      // TODO: 精英怪物池尚未设计，预留接口
      // const eliteId = ...;
      // const eliteDef = MONSTERS[eliteId];
      // const eliteCard = this.createMonsterCard(eliteDef);
      // eliteCard.isElite = true;
      // monsters.push(eliteCard);
      // remaining--;
    }

    // 按等级分配
    const levelEntries = Object.entries(config.levels).filter(([k]) => k !== 'boss');

    for (const [level, [min, max]] of levelEntries) {
      const count = randomInt(min, max);
      const levelMonsters = MONSTERS_BY_LEVEL[level] || [];
      for (let i = 0; i < count && remaining > 0; i++) {
        const mId = levelMonsters[randomInt(0, levelMonsters.length - 1)];
        const mDef = MONSTERS[mId];
        monsters.push(this.createMonsterCard(mDef));
        remaining--;
      }
    }

    // 如果还有剩余，用最高等级的填充
    if (remaining > 0) {
      const highestLevel = Math.max(...levelEntries.map(([l]) => parseInt(l)));
      const levelMonsters = MONSTERS_BY_LEVEL[highestLevel] || MONSTERS_BY_LEVEL[4];
      for (let i = 0; i < remaining; i++) {
        const mId = levelMonsters[randomInt(0, levelMonsters.length - 1)];
        const mDef = MONSTERS[mId];
        monsters.push(this.createMonsterCard(mDef));
      }
    }

    return shuffle(monsters);
  }

  createMonsterCard(def) {
    return {
      type: CARD_TYPES.MONSTER,
      id: def.id,
      name: def.name,
      hp: def.hp,
      maxHp: def.hp,
      atk: def.atk,
      def: def.def,
      trait: def.trait,
      level: def.level,
      isBoss: def.isBoss || false,
      isElite: def.isElite || false,
      faceUp: false,
      // 运行时状态
      warlikeStepCount: 0,
      spikeTriggered: false,
      spawnerLastThreshold: 0,
      atkBonusFromInspire: 0,
      atkBonusFromRevenge: 0,
    };
  }

  createTrapCard(trapId) {
    const traps = {
      crossbow: { id: 'crossbow', name: '弩箭机关', hp: 2, def: 0, fixedDmg: 4, effectId: 'crossbow' },
      spike: { id: 'spike', name: '尖刺机关', hp: 4, def: 0, fixedDmg: 6, effectId: 'spike' },
      teleport: { id: 'teleport', name: '传送机关', hp: 1, def: 0, fixedDmg: 3, effectId: 'teleport' },
    };
    const t = traps[trapId];
    return {
      type: CARD_TYPES.TRAP,
      id: t.id,
      name: t.name,
      hp: t.hp,
      maxHp: t.hp,
      def: t.def,
      fixedDmg: t.fixedDmg,
      effectId: t.effectId,
      faceUp: false,
      spikeTriggered: false,
    };
  }

  createItemCard(itemId) {
    const itemDef = Object.values(ITEMS).find(i => i.id === itemId);
    if (!itemDef) return null;
    return {
      type: CARD_TYPES.ITEM,
      id: itemDef.id,
      name: itemDef.name,
      desc: itemDef.desc,
      color: itemDef.color,
      faceUp: false,
    };
  }

  createGoldCard() {
    return {
      type: CARD_TYPES.GOLD,
      id: 'gold',
      name: '金币卡',
      goldAmount: 20,
      faceUp: false,
    };
  }

  createAttributeCard() {
    return {
      type: CARD_TYPES.ATTRIBUTE,
      id: 'attribute',
      name: '属性提升卡',
      faceUp: false,
    };
  }

  createFoodCard() {
    return {
      type: CARD_TYPES.FOOD,
      id: 'food',
      name: '食品卡',
      faceUp: false,
    };
  }

  createTreasureCard(quality = 'normal') {
    return {
      type: CARD_TYPES.TREASURE,
      id: 'treasure',
      name: quality === 'gold' ? '金宝箱' : quality === 'blue' ? '蓝宝箱' : '宝箱',
      quality: quality,
      faceUp: false,
    };
  }

  createShopCard(shopItem) {
    return {
      type: CARD_TYPES.SHOP,
      id: 'shop_' + shopItem.id,
      name: shopItem.name,
      cost: shopItem.cost,
      effect: shopItem.effect,
      shopItemId: shopItem.id,
      faceUp: false,
    };
  }

  createMentorCard(traitId) {
    const names = {
      [TRAITS.THORNS]: '刺皮导师',
      [TRAITS.THICK_HIDE]: '硬皮导师',
      [TRAITS.VETERAN]: '历战导师',
    };
    return {
      type: CARD_TYPES.MENTOR,
      id: 'mentor_' + traitId,
      name: names[traitId] || '导师',
      grantsTrait: traitId,
      faceUp: false,
    };
  }

  // 根据房间类型生成完整的卡牌组
  generateRoomCards(nodeIndex, roomType) {
    const cards = [];

    if (roomType === ROOM_TYPES.RESTAURANT) {
      // 餐厅：只有1张食品卡和3张导师卡（无怪物、无陷阱、无道具）
      const mentorTraits = shuffle([TRAITS.THORNS, TRAITS.THICK_HIDE, TRAITS.VETERAN]);
      for (const t of mentorTraits) {
        cards.push(this.createMentorCard(t));
      }
      cards.push(this.createFoodCard());
      return shuffle(cards);
    }

    // 除餐厅外，所有房间都是"在普通战斗房的基础上" + 额外卡牌
    const monsterDeck = this.generateMonsterDeck(nodeIndex, roomType);
    cards.push(...monsterDeck);

    // 陷阱卡 (2-4张)
    const trapIds = ['crossbow', 'spike', 'teleport'];
    const trapCount = randomInt(2, 4);
    for (let i = 0; i < trapCount; i++) {
      cards.push(this.createTrapCard(trapIds[randomInt(0, trapIds.length - 1)]));
    }

    // 道具卡 (4-6张)
    const itemCount = randomInt(4, 6);
    for (let i = 0; i < itemCount; i++) {
      const item = ITEM_LIST[randomInt(0, ITEM_LIST.length - 1)];
      cards.push(this.createItemCard(item.id));
    }

    // 房间特定卡牌（额外奖励，在战斗基础之上叠加）
    switch (roomType) {
      case ROOM_TYPES.GOLD:
        // 设计：额外出现1张金币卡
        cards.push(this.createGoldCard());
        break;
      case ROOM_TYPES.TREASURE:
        // 设计：额外出现1张普通宝箱卡
        cards.push(this.createTreasureCard('normal'));
        break;
      case ROOM_TYPES.ATTRIBUTE:
        // 设计：额外出现1张属性提升卡
        cards.push(this.createAttributeCard());
        break;
      case ROOM_TYPES.REWARD:
        // 设计：额外出现1张普通宝箱卡 + 1张属性提升卡
        cards.push(this.createTreasureCard('normal'));
        cards.push(this.createAttributeCard());
        break;
      case ROOM_TYPES.SHOP: {
        // 设计：额外出现4~6张商品卡
        const shopItems = [
          { id: 'atk_up', name: '攻击+1', cost: 50, effect: 'atk+1' },
          { id: 'def_up', name: '防御+1', cost: 50, effect: 'def+1' },
          { id: 'hp_up', name: '生命+2', cost: 50, effect: 'hp+2' },
          { id: 'buy_item', name: '随机道具', cost: 30, effect: 'random_item' },
          { id: 'buy_treasure', name: '宝箱', cost: 100, effect: 'treasure' },
        ];
        const shopCount = randomInt(4, 6);
        const selected = shuffle(shopItems).slice(0, Math.min(shopCount, shopItems.length));
        for (const si of selected) {
          cards.push(this.createShopCard(si));
        }
        break;
      }
      case ROOM_TYPES.ELITE:
        // 精英击杀奖励在 onMonsterKilled 中直接给予，不作为场上卡牌
        break;
      case ROOM_TYPES.BOSS:
        // Boss击杀奖励在 onMonsterKilled 中直接给予，不作为场上卡牌
        break;
      // NORMAL: 无额外卡牌
    }

    return shuffle(cards);
  }
}

// 全局单例
export const GameState = new GameStateClass();
