/**
 * 卡牌地下城 - 遗物与事件数据（第二版）
 *
 * 遗物稀有度：common(低级) / rare(中级) / epic(高级) / boss(BOSS)
 */

export const EVENT_NAMES = [
    { name: '神秘祭坛', desc: '一座散发着微光的古老祭坛，似乎在等待某种献祭...' },
    { name: '古老石碑', desc: '刻满看不懂符文的石碑，触碰时传来微弱的震动...' },
    { name: '迷失旅人', desc: '一个衣衫褴褛的旅人坐在路边，眼神中透着疯狂...' },
    { name: '地下泉水', desc: '一汪清澈的泉水从石缝中涌出，水面倒映着奇异的光芒...' },
    { name: '暗影低语', desc: '黑暗中传来若有若无的低语，听不清在说什么...' },
    { name: '精灵赌局', desc: '一个笑嘻嘻的元素精灵摆出了三杯晃动的液体...' },
    { name: '遗忘宝库', desc: '半掩的石门后面透出金光，但门口有奇怪的符文陷阱...' },
    { name: '契约之环', desc: '地面上画着一个发光的圆环，中间漂浮着一张羊皮纸...' }
];

export const RELIC_DEFS = [
    // 低级遗物（单回合收益~20，多回合~40）
    { id: 'relic_starter_1', name: '先锋徽章', desc: '每次战斗第一张打出的卡牌点数+20', rarity: 'common' },
    { id: 'relic_starter_2', name: '锻体护符', desc: '牌组里所有卡牌点数+2', rarity: 'common' },
    { id: 'relic_starter_3', name: '成长种子', desc: '每场战斗第一张打出的卡牌点数永久+5', rarity: 'common' },
    { id: 'relic_starter_4', name: '疾风卷轴', desc: '每场战斗第一回合多抽一张牌', rarity: 'common' },
    { id: 'relic_starter_5', name: '焦点透镜', desc: '最中倍率格点数+2', rarity: 'common' },
    { id: 'relic_econ', name: '折扣券', desc: '每场战斗后获得一次免费刷新次数', rarity: 'common' },

    // 中级遗物（单回合收益~40，多回合~80）
    { id: 'relic_core_1', name: '连击手套', desc: '每次战斗首次将倍率格填满，倍率格上每张卡牌点数+10', rarity: 'rare' },
    { id: 'relic_core_2', name: '赏金袋', desc: '每次倍率格上卡牌点数超过50，获得一魂', rarity: 'rare' },
    { id: 'relic_core_3', name: '拥挤雕像', desc: '倍率格上每有两张卡牌倍率点数+1', rarity: 'rare' },
    { id: 'relic_exp_1', name: '首击放大器', desc: '每次战斗首回合，总伤害X2', rarity: 'rare' },

    // 高级遗物（单回合收益~80，多回合~160）
    { id: 'relic_ult_1', name: '三重共鸣', desc: '每个倍率格上都有三张卡牌时，总伤害X3', rarity: 'epic' },
    { id: 'relic_ult_2', name: '镜像核心', desc: '一回合内，打出两张同名的卡牌，使两张卡牌点数翻倍', rarity: 'epic' },

    // BOSS遗物（带负面，收益40~80）
    { id: 'relic_boss_1', name: '巨鼠之牙', desc: '所有卡牌点数+5，但每回合开始时失去1心', rarity: 'boss' }
];

export function pickRandomEvent() {
    return { name: '神秘力量', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card' };
}
