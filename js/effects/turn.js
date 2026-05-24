/**
 * 卡牌地下城 - 回合效果 (ON_TURN_START / ON_TURN_END)（第二版）
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

// ===== ON_TURN_START：回合开始 =====

// 留场牌获得标记（下回合可继续堆叠）
FX.register(new EffectHandler({
    id: 'remain_persist',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.CLEANUP,
    condition: (ctx) => true,
    execute: (ctx) => {
        // 留场牌保留在场上，无需额外处理
        // 回合开始时的其他效果可在此添加
    }
}));

// 怪物每回合恢复血量
FX.register(new EffectHandler({
    id: 'monster_heal',
    triggers: Trigger.ON_TURN_START,
    priority: Priority.SLOT_MODIFIER - 20,
    condition: (ctx) => ctx.state.monster.healPerTurn > 0,
    execute: (ctx) => {
        const heal = ctx.state.monster.healPerTurn;
        ctx.state.monster.hp = Math.min(ctx.state.monster.maxHp, ctx.state.monster.hp + heal);
        ctx.log(`${ctx.state.monster.name} 恢复了 ${heal} 点血量`);
    }
}));
