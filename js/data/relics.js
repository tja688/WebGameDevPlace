/**
 * 卡牌地下城 - 遗物与事件数据
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
    { id: 'relic_1', name: '锈迹徽章', desc: '一枚生锈的士兵徽章，似乎曾属于某位英雄。', rarity: 'white' },
    { id: 'relic_2', name: '破损护符', desc: '裂成两半的魔法护符，仍残留着一丝魔力。', rarity: 'white' },
    { id: 'relic_3', name: '鼠尾挂坠', desc: '用硕鼠尾巴编织成的奇怪饰品。', rarity: 'blue' },
    { id: 'relic_4', name: '田鼠之牙', desc: '一颗巨大的硕鼠门牙，锋利无比。', rarity: 'blue' },
    { id: 'relic_5', name: '腐蚀钱币', desc: '一枚被地下城腐蚀的古旧钱币，上面刻着不认识的文字。', rarity: 'gold' }
];

export function pickRandomEvent() {
    return { name: '神秘力量', desc: '选择牌组内一张卡牌，使其数值永久+2', effect: 'buff_card' };
}
