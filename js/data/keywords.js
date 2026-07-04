/**
 * Heave! - 关键词定义（第二版）
 *
 * 词条出现概率：
 * - 高级词条 5%
 * - 中级词条 35%
 * - 低级词条 60%
 *
 * 词条上限：每块矿石最多3个词条
 * 词条带数字表示触发次数（如淬火2）
 */

export const KEYWORDS = {
    // 高级词条（5%出现概率）
    mighty: { name: '熔核', desc: '投入时，将本矿强度翻倍', color: '#FF6B6B', tier: 'advanced' },
    echo: { name: '重铸', desc: '本矿的其他词条效果再触发一次（重铸不触发自身）', color: '#9B59B6', tier: 'advanced' },

    // 中级词条（35%出现概率）
    dedicate: { name: '预热', desc: '在台上时：熔炼在它上方的第一块矿石获得本矿一半的强度（向下取整）', color: '#E67E22', tier: 'medium' },
    chain: { name: '共生', desc: '投入时，抽取一块矿石', color: '#3498DB', tier: 'medium' },
    twin: { name: '双晶', desc: '投入时，复制一块本矿的无双晶特性复制品加入精炼盘', color: '#1ABC9C', tier: 'medium' },

    // 低级词条（60%出现概率）
    remain: { name: '驻台', desc: '回合结束时本矿不移入矿渣堆，继续留在铸造台上', color: '#3498DB', tier: 'basic' },
    spread: { name: '碎屑', desc: '投入时，将一块强度为0的【矿渣】加入你的精炼盘', color: '#FFD93D', tier: 'basic' },
    grow: { name: '淬火', desc: '每次投入后永久+1强度（跨海战保留）', color: '#2ECC71', tier: 'basic' },
    retain: { name: '余烬', desc: '回合结束时，本矿保留在精炼盘中不返回矿舱', color: '#E74C3C', tier: 'basic' },
    social: { name: '合群', desc: '在台上时：本矿相邻铸造台每有一块其他矿石，则本矿强度+1', color: '#F39C12', tier: 'basic' },
    unison: { name: '齐心', desc: '在台上时：本矿所在铸造台每有一块其他矿石，则本矿强度+1', color: '#00CED1', tier: 'basic' }
};
