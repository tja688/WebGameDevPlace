/**
 * 卡牌地下城 - 格子效果 (ON_SLOT_CALC)（第二版）
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// 豪华装备（luxury_gear）：相邻格倍率+1（可叠加，通过roundMultiplierBonus实现）
// 此效果已在 play.js 的 luxury_gear_effect 中处理（打出时设置roundMultiplierBonus）
// 此处保留空文件结构，如需其他格子效果可在此添加
