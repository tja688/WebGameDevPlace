/**
 * 卡牌地下城 - 关键词定义
 */

export const KEYWORDS = {
    agile: { name: '灵动', desc: '该卡牌放上倍率牌桌后不锁定，计算完数值后进入弃牌堆', color: '#4ECDC4' },
    stack: { name: '堆叠', desc: '该卡牌放上倍率牌桌后，可以继续将带有堆叠词条的卡牌打在该位置，或者再打一张没有堆叠词条的卡牌', color: '#FFD93D' },
    mighty: { name: '伟力', desc: '如果场上没有比该牌点数大的牌，触发效果', color: '#FF6B6B' },
    devour: { name: '吞噬', desc: '将左右两侧卡牌的数值加在该卡牌数值上后，将两侧卡牌移入弃牌堆', color: '#9B59B6' },
    exit: { name: '离场', desc: '当该卡牌离开倍率牌桌时，触发效果', color: '#E67E22' },
    remain: { name: '留场', desc: '在新的回合开始后，该卡牌不会离开倍率牌桌', color: '#3498DB' },
    field: { name: '驻场', desc: '当该卡牌已经在倍率牌桌上后，触发效果（持续光环）', color: '#1ABC9C' },
    unity: { name: '团结', desc: '当同名卡牌已经在倍率牌桌上后，触发效果', color: '#F39C12' },
    response: { name: '响应', desc: '当倍率牌桌数值已达到X，触发效果', color: '#E74C3C' },
    grow: { name: '生长', desc: '每次打出后数值永久加一', color: '#2ECC71' },
    echo: { name: '回响', desc: '本牌的其他词条效果触发时，再结算一次。回响不会触发自身', color: '#9B59B6' },
    dedicate: { name: '奉献', desc: '若左侧相邻格有牌，将自身点数一半（向下取整）加至该牌上。自身点数保留', color: '#E67E22' },
    levy: { name: '征收', desc: '从牌组中随机选择一张【堆叠】牌，将其打出到本牌所在格子', color: '#3498DB' },
    stackjoy: { name: '叠叠乐', desc: '当本牌所在格子叠放超过3张牌时，触发卡面所述效果', color: '#F39C12' },
    reinforce: { name: '救兵', desc: '结束回合时，若牌桌有空位，将本牌打出到空位上', color: '#6BCB77' },
    reuse: { name: '复用', desc: '该卡牌离开倍率牌桌后回到牌组', color: '#00CED1' }
};
