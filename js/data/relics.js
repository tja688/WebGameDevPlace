/**
 * 卡牌地下城 - 装备与事件数据（第二版）
 *
 * 装备稀有度：common(低级) / rare(中级) / epic(高级) / boss(BOSS)
 */

export const EVENT_NAMES = [
    { name: '散落的金币', desc: '地上散落着一些金币，闪闪发光...' },
    { name: '遗落的兵书', desc: '一本古老的兵书躺在地上，似乎记载着某种战术...' },
    { name: '好心的小画家', desc: '一个背着画板的小画家正在路边写生，看到你后热情地打招呼...' },
    { name: '自助铁匠锤', desc: '路边放着一把铁匠锤，旁边有个投币箱...' },
    { name: '及时的帮助', desc: '一位神秘的商人从阴影中走出，提供了一些货物...' },
    { name: '抵御怪物', desc: '前方的道路上突然跳出一只怪物！' },
    { name: '出土装备', desc: '地面裂开，露出一个古老的宝箱...' },
    { name: '魔镜', desc: '一面散发着诡异光芒的镜子立在路边...' },
    { name: '轻语岩壁', desc: '岩壁上传来低语声，似乎在诉说着某种秘密...' },
    { name: '挑战强敌', desc: '一个巨大的身影挡在前方，散发着危险的气息...' }
];

export const RELIC_DEFS = [
    // ===== 低级装备（单回合收益~20，多回合~40）=====
    { id: 'relic_starter_1', name: '先锋徽章', desc: '每次战斗第一张打出的卡牌点数+20', rarity: 'common', effect: { type: 'first_card_bonus', bonus: 20 } },
    { id: 'relic_starter_2', name: '锻体护符', desc: '牌组里所有卡牌点数+2', rarity: 'common', effect: { type: 'deck_bonus', bonus: 2 } },
    { id: 'relic_starter_3', name: '成长种子', desc: '每场战斗第一张打出的卡牌点数永久+5', rarity: 'common', effect: { type: 'first_card_permanent_grow', bonus: 5 } },
    { id: 'relic_starter_4', name: '疾风卷轴', desc: '每场战斗第一回合多抽一张牌', rarity: 'common', effect: { type: 'first_turn_extra_draw', bonus: 1 } },
    { id: 'relic_starter_5a', name: '左翼透镜', desc: '最左倍率格点数+2', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 0, bonus: 2 } },
    { id: 'relic_starter_5b', name: '焦点透镜', desc: '最中倍率格点数+2', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 1, bonus: 2 } },
    { id: 'relic_starter_5c', name: '右翼透镜', desc: '最右倍率格点数+2', rarity: 'common', effect: { type: 'slot_bonus', slotIndex: 2, bonus: 2 } },
    { id: 'relic_econ', name: '折扣券', desc: '每场战斗后获得一次免费刷新次数', rarity: 'common', effect: { type: 'free_refresh_per_battle' } },

    // ===== 中级装备（单回合收益~40，多回合~80）=====
    { id: 'relic_core_1', name: '连击手套', desc: '每次战斗首次将倍率格填满，倍率格上每张卡牌点数+10', rarity: 'rare', effect: { type: 'full_board_bonus', bonus: 10 } },
    { id: 'relic_core_2', name: '赏金袋', desc: '每次倍率格上卡牌点数超过50，获得2金币', rarity: 'rare', effect: { type: 'slot_value_gold', threshold: 50, gold: 2 } },
    { id: 'relic_core_3', name: '拥挤雕像', desc: '倍率格上每有两张卡牌倍率点数+1', rarity: 'rare', effect: { type: 'crowd_slot_bonus', threshold: 2, bonus: 1 } },
    { id: 'relic_exp_1', name: '首击放大器', desc: '每次战斗首回合，额外指数+2', rarity: 'rare', effect: { type: 'first_turn_extra_multiplier', bonus: 2 } },

    // ===== 高级装备（单回合收益~80，多回合~160）=====
    { id: 'relic_ult_1', name: '三重共鸣', desc: '每个倍率格上都有三张卡牌时，额外指数+3', rarity: 'epic', effect: { type: 'triple_crowd_bonus', threshold: 3, bonus: 3 } },
    { id: 'relic_ult_2', name: '超限核心', desc: '当触发任意超限计策时，额外指数+3', rarity: 'epic', effect: { type: 'overdrive_bonus', bonus: 3 } },

    // ===== BOSS装备（带负面，收益40~80）=====
    { id: 'relic_boss_dragon_heart', name: '龙心', desc: '所有卡牌点数+5，但每回合开始时失去1人群', rarity: 'boss', effect: { type: 'all_card_bonus_heart_penalty', bonus: 5, penalty: 1 } },
    { id: 'relic_boss_dragon_bone', name: '龙骨', desc: '倍率格点数+2，但怪物血量+20%', rarity: 'boss', effect: { type: 'all_slot_bonus_hp_increase', slotBonus: 2, hpPercent: 20 } },
    { id: 'relic_boss_dragon_eye', name: '龙眼', desc: '每回合额外抽2张牌，但手牌上限-2', rarity: 'boss', effect: { type: 'extra_draw_hand_limit', drawBonus: 2, handLimitPenalty: 2 } }
];

export function pickRandomEvent() {
    return { name: '神秘力量', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card', param: 2 };
}
