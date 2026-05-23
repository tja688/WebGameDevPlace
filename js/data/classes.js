/**
 * 卡牌地下城 - 职业定义（第二版）
 */

export const CLASS_DEFS = {
    soldier: {
        id: 'soldier',
        name: '兵大哥',
        hearts: 3,
        relic: {
            name: '兵团装备',
            description: '为倍率牌桌最中间一格提供1倍率',
            effect: { type: 'slot_multiplier', slotIndex: 1, bonus: 1 }
        },
        startingDeck: [
            { defId: 'precise_strike', count: 5 },
            { defId: 'feint', count: 5 },
            { defId: 'maintain_gear', count: 2 }
        ]
    },
    mage: {
        id: 'mage',
        name: '王国法师',
        hearts: 3,
        relic: {
            name: '奥术法典',
            description: '（暂未开放）',
            effect: { type: 'none' }
        },
        startingDeck: []
    },
    villager: {
        id: 'villager',
        name: '中年村民',
        hearts: 3,
        relic: {
            name: '家传锄头',
            description: '（暂未开放）',
            effect: { type: 'none' }
        },
        startingDeck: []
    }
};
