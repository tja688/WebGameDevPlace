/**
 * 卡牌地下城 - 职业定义（第二版）
 *
 * 目前仅开放"老兵"职业
 */

export const CLASS_DEFS = {
    veteran: {
        id: 'veteran',
        name: '老兵',
        hearts: 4,  // 初始装备"老伙计们"：人群+1
        relic: {
            name: '老伙计们',
            description: '人群数+1（开局就有4人群，意味着有4次出牌机会）',
            effect: { type: 'extra_hearts', bonus: 1 }
        },
        startingDeck: [
            { defId: 'unity_strike', count: 5 },
            { defId: 'support_strike', count: 4 },
            { defId: 'veteran_ambition', count: 1 }
        ]
    }
};
