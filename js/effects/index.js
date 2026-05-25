/**
 * 卡牌地下城 - 效果系统统一入口
 *
 * 导入此文件即完成所有效果处理器的自动注册。
 * 新增效果文件后，只需在此添加 import 即可。
 */

// 核心（必须先导入）
export {
    createEffectContext,
    registerEffect,
    fireEffects,
    getCardEffectIds,
    calculateGrowAmount,
    // 兼容旧接口
    EffectContext,
    EffectHandler,
    EffectSystem,
    FX
} from './core.js';

// 各时机效果（副作用：自动注册到全局注册表）
import './play.js';
import './calc.js';
import './turn.js';
import './exit.js';
import './slot.js';
import './relics.js';
