/**
 * Heave! - 职业定义（第二版）
 *
 * 目前仅开放"老兵"职业（老船长）
 */

export const CLASS_DEFS = {
    veteran: {
        id: 'veteran',
        name: '老兵',
        hearts: 3,
        startingDeck: [
            { defId: 'teamwork_ore', count: 5 },
            { defId: 'assist_ore', count: 4 },
            { defId: 'veteran_ore', count: 1 }
        ],
        startingRelic: { id: 'relic_veteran_route', name: '老兵航路', desc: '每场海战首回合多抽取一块矿石', effect: { type: 'first_turn_extra_draw', bonus: 1 } }
    }
};
