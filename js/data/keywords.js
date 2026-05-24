/**
 * 卡牌地下城 - 关键词定义（第二版）
 *
 * 词条出现概率：
 * - 高级词条 5%
 * - 中级词条 35%
 * - 低级词条 60%
 *
 * 词条上限：每张卡牌最多2个词条
 * 词条带数字表示触发次数（如成长2）
 */

export const KEYWORDS = {
    // 高级词条（5%出现概率）
    mighty: { name: '伟力', desc: '打出时，将本牌点数翻倍', color: '#FF6B6B', tier: 'advanced' },
    echo: { name: '回响', desc: '本牌的其他词条效果再触发一次（回响不触发自身）', color: '#9B59B6', tier: 'advanced' },

    // 中级词条（35%出现概率）
    dedicate: { name: '奉献', desc: '在场上时：下一张打出在本牌所在倍率格的卡牌获得本牌一半的点数（向下取整）', color: '#E67E22', tier: 'medium' },
    chain: { name: '连携', desc: '打出时，抽一张牌', color: '#3498DB', tier: 'medium' },
    twin: { name: '双生', desc: '打出时，将一张本牌的无双生词条复制加入手牌', color: '#1ABC9C', tier: 'medium' },

    // 低级词条（60%出现概率）
    remain: { name: '留场', desc: '回合结束时本牌不移入弃牌堆，继续留在倍率格上', color: '#3498DB', tier: 'basic' },
    spread: { name: '蔓延', desc: '打出时，将一张点数为0的【扩散】加入你的手牌', color: '#FFD93D', tier: 'basic' },
    grow: { name: '成长', desc: '每次打出后永久+1点数（跨战斗保留）', color: '#2ECC71', tier: 'basic' },
    retain: { name: '保留', desc: '回合结束时，本牌保留在手牌中不返回牌组', color: '#E74C3C', tier: 'basic' },
    social: { name: '合群', desc: '在场上时：本牌相邻倍率格每有一张其他卡牌，则本牌点数+1', color: '#F39C12', tier: 'basic' },
    unison: { name: '齐心', desc: '在场上时：本牌所在倍率格每有一张其他卡牌，则本牌点数+1', color: '#00CED1', tier: 'basic' }
};
