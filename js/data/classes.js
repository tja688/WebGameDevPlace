/**
 * 卡牌地下城 - 职业定义（第二版）
 *
 * 目前仅开放"老兵"职业
 */

export const CLASS_DEFS = {
    veteran: {
        id: 'veteran',
        name: '老兵',
        hearts: 3,
        relic: {
            name: '战场经验',
            description: '每场战斗首回合多抽一张牌',
            effect: { type: 'first_turn_extra_draw', bonus: 1 }
        },
        startingDeck: [
            { defId: 'unity_strike', count: 5 },
            { defId: 'support_strike', count: 4 },
            { defId: 'veteran_ambition', count: 1 }
        ]
    }
};
