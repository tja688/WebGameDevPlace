/**
 * Heave! - 船体改造与事件数据（第二版）
 *
 * 船体改造稀有度：common(低级) / rare(中级) / epic(高级) / boss(BOSS)
 */

export const EVENT_NAMES = [
    { name: '漂流银箱', desc: '海面上漂浮着一个银箱，闪着银光...' },
    { name: '海战图残卷', desc: '一卷残破的海战图纸，似乎记载着某种战术...' },
    { name: '船首像画家', desc: '一位雕刻船首像的工匠正在忙碌，看到你后热情地打招呼...' },
    { name: '自助船坞', desc: '路边放着一台小型船坞设备，旁边有个投币箱...' },
    { name: '及时的帮助', desc: '一位神秘的走私商人从暗处走出，提供了一些货物...' },
    { name: '走私大副', desc: '一位魁梧的走私大副递给你一块奇怪的矿石...' },
    { name: '遭遇巡逻舰', desc: '前方海域突然出现一艘巡逻舰！' },
    { name: '沉船宝藏', desc: '海底裂开，露出一个古老的宝箱...' },
    { name: '走私掮客', desc: '走私掮客指出了下一次精炼厂会出现的矿石矿脉...' },
    { name: '海神遗物', desc: '一件散发着诡异光芒的海神遗物漂浮在海上...' },
    { name: '古锚祝福', desc: '古锚上传来低语声，似乎在诉说着某种秘密...' },
    { name: '悬赏私掠舰', desc: '一艘巨大的私掠舰挡在前方，散发着危险的气息...' }
];

export const RELIC_DEFS = [
    // ===== 低级船体改造 =====
    // 1. 矿石强度类
    { id: 'relic_prow_armor_piercer', name: '船首破甲锥', desc: '投入在船首铸造台上的矿石强度+5', rarity: 'common', effect: { type: 'slot_card_bonus', slotIndex: 1, bonus: 5 }, price: 4 },
    { id: 'relic_right_armor_piercer', name: '右舷破甲锥', desc: '投入在右舷铸造台上的矿石强度+5', rarity: 'common', effect: { type: 'slot_card_bonus', slotIndex: 2, bonus: 5 }, price: 4 },
    { id: 'relic_left_armor_piercer', name: '左舷破甲锥', desc: '投入在左舷铸造台上的矿石强度+5', rarity: 'common', effect: { type: 'slot_card_bonus', slotIndex: 0, bonus: 5 }, price: 4 },
    { id: 'relic_ember_focus', name: '余烬准心', desc: '每场海战投入的第一块带有余烬特性的矿石强度+20', rarity: 'common', effect: { type: 'first_retain_bonus', bonus: 20 }, price: 2 },
    { id: 'relic_sustained_combat', name: '持续作战', desc: '每回合投入的第一块矿石强度+10', rarity: 'common', effect: { type: 'first_card_per_turn_bonus', bonus: 10 }, price: 3 },
    { id: 'relic_first_shot', name: '首炮', desc: '每场海战投入的第一块矿石强度+20', rarity: 'common', effect: { type: 'first_card_per_battle_bonus', bonus: 20 }, price: 2 },

    // 2. 铸造台倍率类
    { id: 'relic_prow_tactic', name: '船首战术', desc: '如果船首铸造台上熔炼超过两块矿石，船首铸造台倍率+1', rarity: 'common', effect: { type: 'crowd_slot_bonus_single', slotIndex: 1, threshold: 2, bonus: 1 }, price: 2 },
    { id: 'relic_right_tactic', name: '右舷战术', desc: '如果右舷铸造台上熔炼超过两块矿石，右舷铸造台倍率+1', rarity: 'common', effect: { type: 'crowd_slot_bonus_single', slotIndex: 2, threshold: 2, bonus: 1 }, price: 2 },
    { id: 'relic_left_tactic', name: '左舷战术', desc: '如果左舷铸造台上熔炼超过两块矿石，左舷铸造台倍率+1', rarity: 'common', effect: { type: 'crowd_slot_bonus_single', slotIndex: 0, threshold: 2, bonus: 1 }, price: 2 },
    { id: 'relic_ramming_tactic', name: '蛮撞战术', desc: '如果未触发任何叠牌，则所有铸造台倍率+2', rarity: 'common', effect: { type: 'no_strategy_slot_bonus', bonus: 2 }, price: 4 },
    { id: 'relic_prow_keel', name: '船首冲击龙骨', desc: '左舷铸造台倍率+1', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 0, bonus: 1 }, price: 4 },
    { id: 'relic_right_keel', name: '右舷冲击龙骨', desc: '右舷铸造台倍率+1', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 2, bonus: 1 }, price: 4 },
    { id: 'relic_left_keel', name: '左舷冲击龙骨', desc: '船首铸造台倍率+1', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 1, bonus: 1 }, price: 4 },

    // 3. 经济类
    { id: 'relic_bounty_hunter', name: '赏金猎人', desc: '两回合内击沉敌舰，获得2银元', rarity: 'common', effect: { type: 'fast_kill_gold', turns: 2, gold: 2 }, price: 4 },
    { id: 'relic_ship_looting', name: '扒船', desc: '每场海战开始获得1银元', rarity: 'common', effect: { type: 'battle_start_gold', gold: 1 }, price: 2 },
    { id: 'relic_regular_customer', name: '老主顾', desc: '每次进入精炼厂和船坞的第一次刷新免费', rarity: 'common', effect: { type: 'first_refresh_free' }, price: 4 },
    { id: 'relic_silver_palm', name: '掌中银元', desc: '回合结束时，精炼盘每有一块矿石获得1银元', rarity: 'common', effect: { type: 'hand_gold_per_turn', gold: 1 }, price: 4 },

    // 4. 运转类
    { id: 'relic_gambler', name: '赌徒', desc: '每回合开始，10%概率抽取一块矿石', rarity: 'common', effect: { type: 'luck_draw', chance: 10 }, price: 4 },
    { id: 'relic_ballast_reinforce', name: '压舱加固', desc: '每场海战投入的第一块矿石获得驻台特性', rarity: 'common', effect: { type: 'first_card_remain' }, price: 4 },
    { id: 'relic_last_stand', name: '背水', desc: '每场海战第三回合开始，抽取一块矿石', rarity: 'common', effect: { type: 'third_turn_draw', turn: 3 }, price: 4 },

    // 5. 长线淬火类
    { id: 'relic_prow_specialty', name: '船首专精', desc: '投入在右舷铸造台的矿石永久+1强度，依靠此效果每获得50强度后为右舷铸造台倍率+1', rarity: 'common', effect: { type: 'slot_grow', slotIndex: 2, growPer: 50, slotBonus: 1 }, price: 4 },
    { id: 'relic_right_specialty', name: '右舷专精', desc: '投入在船首铸造台的矿石永久+1强度，依靠此效果每获得50强度后为船首铸造台倍率+1', rarity: 'common', effect: { type: 'slot_grow', slotIndex: 1, growPer: 50, slotBonus: 1 }, price: 4 },
    { id: 'relic_left_specialty', name: '左舷专精', desc: '投入在左舷铸造台的矿石永久+1强度，依靠此效果每获得50强度后为左舷铸造台倍率+1', rarity: 'common', effect: { type: 'slot_grow', slotIndex: 0, growPer: 50, slotBonus: 1 }, price: 4 },
    { id: 'relic_quench_core', name: '淬火炉心', desc: '淬火效果多触发一次', rarity: 'common', effect: { type: 'grow_double' }, price: 4 },

    // 6. 特殊类
    { id: 'relic_small_ram', name: '小型撞角', desc: '每回合减少敌舰装甲值50', rarity: 'common', effect: { type: 'turn_monster_damage', damage: 50 }, price: 2 },

    // ===== 中级船体改造 =====
    // 1. 矿石强度类
    { id: 'relic_contraband_run', name: '私货夹带', desc: '每场海战开始将一块私货加入精炼盘', rarity: 'rare', effect: { type: 'print_cheat_card' }, price: 4 },

    // 5. 长线淬火类
    { id: 'relic_multi_smelt', name: '多层熔炼', desc: '每回合减少敌舰装甲值50', rarity: 'rare', effect: { type: 'turn_monster_damage', damage: 50 }, price: 8 },

    // ===== 高级船体改造 =====
    // 4. 运转类
    { id: 'relic_full_load', name: '满载', desc: '每回合多抽取一块矿石', rarity: 'epic', effect: { type: 'extra_draw', bonus: 1 }, price: 10 },

    // ===== BOSS船体改造 =====
    // 第一航段BOSS船体改造（金王）
    { id: 'relic_gold_king_bone', name: '金王之骨', desc: '预热特性现在提供1.5倍自身强度给上方矿石', rarity: 'boss', effect: { type: 'dedicate_1_5x' } },
    { id: 'relic_gold_king_heart', name: '金王之心', desc: '每场海战开始赋予矿舱内随机一块矿石预热特性，预热提供的强度变为永久', rarity: 'boss', effect: { type: 'dedicate_permanent' } },
    { id: 'relic_gold_king_flesh', name: '金王之肉', desc: '矿舱内所有带有预热特性的矿石获得共生特性', rarity: 'boss', effect: { type: 'dedicate_chain' } },

    // 通用BOSS船体改造
    { id: 'relic_captain_extra_draw', name: '船长锦囊·满载', desc: '每回合多抽取一块矿石，每场海战第一回合多抽取一块矿石', rarity: 'boss', effect: { type: 'extra_draw_first_turn', bonus: 1 } },
    { id: 'relic_captain_free_buy', name: '船长锦囊·免税', desc: '购买矿石不再需要银元', rarity: 'boss', effect: { type: 'free_card_purchase' } },
    { id: 'relic_captain_small_hold', name: '船长锦囊·精简', desc: '选择矿舱内4块矿石删除', rarity: 'boss', effect: { type: 'remove_four_cards' } },
    { id: 'relic_captain_big_hold', name: '船长锦囊·扩容', desc: '选择矿舱内一块矿石复制4块加入矿舱', rarity: 'boss', effect: { type: 'copy_card_four' } }
];

export function pickRandomEvent() {
    return { name: '神秘力量', desc: '选择矿舱内一块矿石，使其强度永久+2', effect: 'buff_card', param: 2 };
}
