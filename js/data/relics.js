/**
 * 卡牌地下城 - 遗物与事件数据（第二版）
 *
 * 遗物稀有度：common(低级) / rare(中级) / epic(高级) / boss(BOSS)
 */

export const EVENT_NAMES = [
    { name: '散落的金币', desc: '地上散落着一些金币，闪闪发光...' },
    { name: '遗落的兵书', desc: '一本古老的兵书躺在地上，似乎记载着某种战术...' },
    { name: '好心的小画家', desc: '一个背着画板的小画家正在路边写生，看到你后热情地打招呼...' },
    { name: '自助铁匠锤', desc: '路边放着一把铁匠锤，旁边有个投币箱...' },
    { name: '及时的帮助', desc: '一位神秘的商人从阴影中走出，提供了一些货物...' },
    { name: '神秘肌肉男', desc: '一位浑身肌肉的神秘人递给你一张奇怪的牌...' },
    { name: '抵御怪物', desc: '前方的道路上突然跳出一只怪物！' },
    { name: '出土遗物', desc: '地面裂开，露出一个古老的宝箱...' },
    { name: '预言家', desc: '预言家指出了下一次商店会出现的卡牌体系...' },
    { name: '魔镜', desc: '一面散发着诡异光芒的镜子立在路边...' },
    { name: '轻语岩壁', desc: '岩壁上传来低语声，似乎在诉说着某种秘密...' },
    { name: '挑战强敌', desc: '一个巨大的身影挡在前方，散发着危险的气息...' }
];

export const RELIC_DEFS = [
    // ===== 低级遗物 =====
    // 1. 卡牌点数类
    { id: 'relic_excellent_center', name: '优秀中心', desc: '打出在中间倍率格上的卡牌点数+5', rarity: 'common', effect: { type: 'slot_card_bonus', slotIndex: 1, bonus: 5 }, price: 4 },
    { id: 'relic_excellent_right', name: '优秀右翼', desc: '打出在最右侧倍率格上的卡牌点数+5', rarity: 'common', effect: { type: 'slot_card_bonus', slotIndex: 2, bonus: 5 }, price: 4 },
    { id: 'relic_excellent_left', name: '优秀左翼', desc: '打出在最左侧倍率格上的卡牌点数+5', rarity: 'common', effect: { type: 'slot_card_bonus', slotIndex: 0, bonus: 5 }, price: 4 },
    { id: 'relic_retain_focus', name: '保留重心', desc: '每场战斗打出的第一张带有保留词条的卡牌点数+20', rarity: 'common', effect: { type: 'first_retain_bonus', bonus: 20 }, price: 2 },
    { id: 'relic_sustained_combat', name: '持续作战', desc: '每回合打出的第一张卡牌点数+10', rarity: 'common', effect: { type: 'first_card_per_turn_bonus', bonus: 10 }, price: 3 },
    { id: 'relic_blitz', name: '闪电战', desc: '每场战斗打出的第一张卡牌点数+20', rarity: 'common', effect: { type: 'first_card_per_battle_bonus', bonus: 20 }, price: 2 },

    // 2. 倍率格点数类
    { id: 'relic_center_tactic', name: '中心战术', desc: '如果中间倍率格上堆叠大于两张牌，最中间倍率格点数+1', rarity: 'common', effect: { type: 'crowd_slot_bonus_single', slotIndex: 1, threshold: 2, bonus: 1 }, price: 2 },
    { id: 'relic_right_tactic', name: '右翼战术', desc: '如果最右侧倍率格上堆叠大于两张牌，最右侧倍率格点数+1', rarity: 'common', effect: { type: 'crowd_slot_bonus_single', slotIndex: 2, threshold: 2, bonus: 1 }, price: 2 },
    { id: 'relic_left_tactic', name: '左翼战术', desc: '如果最左侧倍率格上堆叠大于两张牌，最左侧倍率格点数+1', rarity: 'common', effect: { type: 'crowd_slot_bonus_single', slotIndex: 0, threshold: 2, bonus: 1 }, price: 2 },
    { id: 'relic_brainless_tactic', name: '无脑战术', desc: '如果未触发任何计策，则所有倍率格点数+2', rarity: 'common', effect: { type: 'no_strategy_slot_bonus', bonus: 2 }, price: 4 },
    { id: 'relic_stable_center', name: '稳固中心', desc: '最左侧倍率格点数+1', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 0, bonus: 1 }, price: 4 },
    { id: 'relic_stable_right', name: '稳固右翼', desc: '最右侧倍率格点数+1', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 2, bonus: 1 }, price: 4 },
    { id: 'relic_stable_left', name: '稳固左翼', desc: '中间倍率格点数+1', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 1, bonus: 1 }, price: 4 },

    // 3. 经济类
    { id: 'relic_retain_quality', name: '保留品质', desc: '两回合内击杀怪物，获得2金币', rarity: 'common', effect: { type: 'fast_kill_gold', turns: 2, gold: 2 }, price: 4 },
    { id: 'relic_stealing_skill', name: '偷窃技巧', desc: '每场战斗开始获得1金币', rarity: 'common', effect: { type: 'battle_start_gold', gold: 1 }, price: 2 },
    { id: 'relic_friend_card', name: '朋友证', desc: '每次进入商店和铁匠的第一次刷新免费', rarity: 'common', effect: { type: 'first_refresh_free' }, price: 4 },
    { id: 'relic_alchemy', name: '点金术', desc: '回合结束时，手牌每有一张牌获得1金币', rarity: 'common', effect: { type: 'hand_gold_per_turn', gold: 1 }, price: 4 },

    // 4. 运转类
    { id: 'relic_small_luck', name: '小幸运', desc: '每回合开始，10%概率抽一张牌', rarity: 'common', effect: { type: 'luck_draw', chance: 10 }, price: 4 },
    { id: 'relic_thrift', name: '省吃俭用', desc: '每场战斗打出的第一张卡牌获得留场词条', rarity: 'common', effect: { type: 'first_card_remain' }, price: 4 },
    { id: 'relic_desperate_strength', name: '绝境发力', desc: '每场战斗第三回合开始，抽一张牌', rarity: 'common', effect: { type: 'third_turn_draw', turn: 3 }, price: 4 },

    // 5. 长线成长类
    { id: 'relic_center_growth', name: '中间成长', desc: '打出在最右侧倍率格的卡牌永久+1点数，依靠此效果每获得50点数后为最右侧倍率格点数+1', rarity: 'common', effect: { type: 'slot_grow', slotIndex: 2, growPer: 50, slotBonus: 1 }, price: 4 },
    { id: 'relic_right_growth', name: '右翼成长', desc: '打出在中间倍率格的卡牌永久+1点数，依靠此效果每获得50点数后为中间倍率格点数+1', rarity: 'common', effect: { type: 'slot_grow', slotIndex: 1, growPer: 50, slotBonus: 1 }, price: 4 },
    { id: 'relic_left_growth', name: '左翼成长', desc: '打出在最左侧倍率格的卡牌永久+1点数，依靠此效果每获得50点数后为最左侧倍率格点数+1', rarity: 'common', effect: { type: 'slot_grow', slotIndex: 0, growPer: 50, slotBonus: 1 }, price: 4 },
    { id: 'relic_training_core', name: '训练核心', desc: '成长效果多触发一次', rarity: 'common', effect: { type: 'grow_double' }, price: 4 },

    // 6. 特殊类
    { id: 'relic_advanced_laser', name: '高级镭射枪', desc: '每回合减少怪物血量50', rarity: 'common', effect: { type: 'turn_monster_damage', damage: 50 }, price: 2 },

    // ===== 中级遗物 =====
    // 1. 卡牌点数类
    { id: 'relic_print_card', name: '印卡', desc: '每场战斗开始将一张作弊卡加入手牌', rarity: 'rare', effect: { type: 'print_cheat_card' }, price: 4 },

    // 5. 长线成长类
    { id: 'relic_multi_stack', name: '多叠', desc: '每回合减少怪物血量50', rarity: 'rare', effect: { type: 'turn_monster_damage', damage: 50 }, price: 8 },

    // ===== 高级遗物 =====
    // 4. 运转类
    { id: 'relic_draw_one', name: '抽一张', desc: '每回合多抽一张牌', rarity: 'epic', effect: { type: 'extra_draw', bonus: 1 }, price: 10 },

    // ===== BOSS遗物 =====
    // 第一层BOSS遗物（黄之王）
    { id: 'relic_boss_yellow_bone', name: '黄之骨', desc: '奉献词条现在提供1.5倍自身点数给下一张牌', rarity: 'boss', effect: { type: 'dedicate_1_5x' } },
    { id: 'relic_boss_yellow_heart', name: '黄之心', desc: '每场战斗开始赋予牌组内随机一张卡牌奉献词条，奉献提供的点数变为永久', rarity: 'boss', effect: { type: 'dedicate_permanent' } },
    { id: 'relic_boss_yellow_flesh', name: '黄之肉', desc: '牌组内所有带有奉献词条的卡牌获得连携词条', rarity: 'boss', effect: { type: 'dedicate_chain' } },

    // 通用BOSS遗物
    { id: 'relic_boss_draw_one', name: '抽牌一号', desc: '每回合多抽一张牌，每场战斗第一回合多抽一张牌', rarity: 'boss', effect: { type: 'extra_draw_first_turn', bonus: 1 } },
    { id: 'relic_boss_free_purchase', name: '收缴证', desc: '购买卡牌不再需要金币', rarity: 'boss', effect: { type: 'free_card_purchase' } },
    { id: 'relic_boss_small_deck', name: '我爱玩小卡组', desc: '选择牌组内4张卡牌删除', rarity: 'boss', effect: { type: 'remove_four_cards' } },
    { id: 'relic_boss_big_deck', name: '我要玩大卡组', desc: '选择牌组内一张卡牌复制4张加入牌组', rarity: 'boss', effect: { type: 'copy_card_four' } }
];

export function pickRandomEvent() {
    return { name: '神秘力量', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card', param: 2 };
}
