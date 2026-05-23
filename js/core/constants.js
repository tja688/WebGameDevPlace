/**
 * 卡牌地下城 - 全局常量
 */

export const SLOT_COUNT = 3;
export const MAX_UNLOCKED_SLOTS = 3;
export const HAND_LIMIT = 10;
export const DRAW_COUNT = 5;
export const RARITY_PRICE = { white: 1, blue: 2, gold: 3 };

// 效果触发时机（钩子点）
export const Trigger = {
    BEFORE_PLAY: 'before_play',     // 卡牌放置前校验
    ON_PLAY: 'on_play',             // 卡牌打出到格子时
    AFTER_PLAY: 'after_play',       // 卡牌放置后（响应链）
    ON_CALC_VALUE: 'on_calc_value', // 计算卡牌有效点数时（光环、加成）
    ON_CALC_FINAL: 'on_calc_final', // 计算最终点数时（伟力、硬质皮肤等）
    ON_TURN_START: 'on_turn_start', // 回合开始
    ON_TURN_END: 'on_turn_end',     // 回合结束
    ON_EXIT: 'on_exit',             // 卡牌离开牌桌
    ON_SLOT_CALC: 'on_slot_calc',   // 计算格子倍率时
};

// 效果优先级（数值小的先执行）
export const Priority = {
    SLOT_MODIFIER: 100,     // 格子倍率修改
    VALUE_AURA: 200,        // 驻场光环加点数
    VALUE_BONUS: 300,       // 临时/永久加成
    VALUE_MIGHTY: 400,      // 伟力翻倍
    VALUE_PENALTY: 500,     // 惩罚（硬质皮肤等）
    DRAW: 600,              // 抽牌
    GROW: 700,              // 生长
    SPECIAL: 800,           // 特殊效果
    CLEANUP: 900,           // 清理
};
