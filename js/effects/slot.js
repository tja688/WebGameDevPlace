/**
 * 生死烛局 - 格子效果 (ON_SLOT_CALC)（重构版）
 *
 * 所有效果处理器为纯对象，通过 registerEffect 注册。
 */

import { registerEffect } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// 豪华装备（luxury_gear）：相邻格倍率+1（可叠加，通过roundMultiplierBonus实现）
// 此效果已在 play.js 的 luxury_gear_effect 中处理（打出时设置roundMultiplierBonus）
// 此处保留空文件结构，如需其他格子效果可在此添加
