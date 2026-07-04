/**
 * Heave! - 全局常量（第二版）
 */

export const SLOT_COUNT = 3;
export const MAX_UNLOCKED_SLOTS = 3;
export const HAND_LIMIT = 10;
export const DRAW_COUNT = 5;

// 矿石精炼厂价格（银元）
export const RARITY_PRICE = { white: 2, blue: 4, gold: 8 };

// 效果触发时机（钩子点）
export const Trigger = {
    BEFORE_PLAY: 'before_play',     // 矿石放置前校验
    ON_PLAY: 'on_play',             // 矿石投出到格子时
    AFTER_PLAY: 'after_play',       // 矿石放置后（响应链）
    ON_CALC_VALUE: 'on_calc_value', // 计算矿石有效强度时（光环、加成）
    ON_CALC_FINAL: 'on_calc_final', // 计算最终强度时（熔核、惩罚等）
    ON_TURN_START: 'on_turn_start', // 回合开始
    ON_TURN_END: 'on_turn_end',     // 回合结束
    ON_EXIT: 'on_exit',             // 矿石离开格子
    ON_SLOT_CALC: 'on_slot_calc',   // 计算格子倍率时
};

// 效果优先级（数值小的先执行）
export const Priority = {
    SLOT_MODIFIER: 100,     // 格子倍率修改
    VALUE_AURA: 200,        // 驻台光环加强度
    VALUE_BONUS: 300,       // 临时/永久加成
    VALUE_MIGHTY: 400,      // 熔核翻倍
    VALUE_PENALTY: 500,     // 惩罚（敌舰技能等）
    DRAW: 600,              // 抽取矿石
    GROW: 700,              // 淬火
    SPECIAL: 800,           // 特殊效果
    CLEANUP: 900,           // 清理
};
