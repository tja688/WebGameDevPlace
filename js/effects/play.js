/**
 * 卡牌地下城 - 打出时效果 (ON_PLAY)（第二版）
 */

import { EffectHandler, FX, calculateGrowAmount } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { drawCards } from '../core/battle-core.js';
import { createCardInstance } from '../data/index.js';

// ===== 1. 格子加成（奉献等） =====
FX.register(new EffectHandler({
    id: 'slot_bonus',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER - 10,
    condition: (ctx) => ctx.slotIndex >= 0,
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 奉献：格子中已有奉献牌，给新牌加点
        for (const c of slot.cards) {
            if (c.uuid !== ctx.card.uuid && c.keywords.includes('dedicate')) {
                const val = ctx.getCardBaseValue(c);
                const bonus = Math.floor(val / 2);
                if (bonus > 0) {
                    ctx.card.tempBonus = (ctx.card.tempBonus || 0) + bonus;
                    ctx.log(`${c.name} 奉献了 ${bonus} 点给 ${ctx.card.name}！`);
                }
            }
        }
    }
}));

// ===== 2. 连携（chain）：抽牌 =====
FX.register(new EffectHandler({
    id: 'chain',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 20,
    condition: (ctx) => ctx.card.keywords.includes('chain'),
    execute: (ctx) => {
        const count = ctx.card.chainCount || 1;
        drawCards(ctx.state, count);
        ctx.log(`${ctx.card.name} 连携效果触发，抽${count}张牌`);
    }
}));

// ===== 3. 双生（twin）：复制加入手牌（无双生） =====
FX.register(new EffectHandler({
    id: 'twin',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 15,
    condition: (ctx) => ctx.card.keywords.includes('twin'),
    execute: (ctx) => {
        const copy = createCardInstance(ctx.card.defId);
        copy.permanentBonus = ctx.card.permanentBonus;
        copy.baseValue = ctx.card.baseValue;
        // 复制牌移除双生词条，避免无限复制
        copy.keywords = copy.keywords.filter(k => k !== 'twin');
        ctx.state.hand.push(copy);
        ctx.log(`${ctx.card.name} 双生效果触发，复制加入手牌（已移除双生）`);
    }
}));

// ===== 4. 蔓延（spread）：加入扩散牌 =====
FX.register(new EffectHandler({
    id: 'spread',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 10,
    condition: (ctx) => ctx.card.keywords.includes('spread'),
    execute: (ctx) => {
        const diffusion = createCardInstance('diffusion');
        ctx.state.hand.push(diffusion);
        ctx.log(`${ctx.card.name} 蔓延效果触发，加入一张扩散牌`);
    }
}));

// ===== 5. 生长（grow）：永久加点 =====
FX.register(new EffectHandler({
    id: 'grow',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW,
    condition: (ctx) => ctx.card.keywords.includes('grow'),
    execute: (ctx) => {
        const amount = calculateGrowAmount(ctx.card, ctx.slotIndex, ctx.state);
        ctx.card.permanentBonus += amount;
        ctx.log(`${ctx.card.name} 成长了！永久点数+${amount}`);
        if (typeof GameAudio !== 'undefined') GameAudio.playGrow();
        if (!ctx.state.pendingGrowthEffects) ctx.state.pendingGrowthEffects = [];
        ctx.state.pendingGrowthEffects.push({ slotIndex: ctx.slotIndex });
    }
}));

// ===== 6. 传令（messenger）：从牌组拿一张入手牌 =====
FX.register(new EffectHandler({
    id: 'messenger_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW,
    condition: (ctx) => ctx.card.defId === 'messenger',
    execute: (ctx) => {
        if (ctx.state.deck.length > 0) {
            const card = ctx.state.deck.pop();
            ctx.state.hand.push(card);
            ctx.log(`${ctx.card.name} 传令效果触发，从牌组拿来 ${card.name}`);
        } else {
            ctx.log(`${ctx.card.name} 传令效果触发，但牌组已空`);
        }
    }
}));

// ===== 7. 豪华装备（luxury_gear）：已在倍率格时相邻两侧倍率+1 =====
FX.register(new EffectHandler({
    id: 'luxury_gear_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'luxury_gear',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 检查是否已在倍率格（即不是第一张打出的）
        if (slot.cards.length > 1) {
            for (const s of ctx.state.slots) {
                if (Math.abs(s.index - ctx.slotIndex) === 1) {
                    s.roundMultiplierBonus = (s.roundMultiplierBonus || 0) + 1;
                    ctx.log(`${ctx.card.name} 提升了第${s.index + 1}格倍率！`);
                }
            }
        }
    }
}));

// ===== 8. 我思故我在（cogito_ergo_sum）：已在倍率格时所在格点数x2 =====
FX.register(new EffectHandler({
    id: 'cogito_ergo_sum_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL,
    condition: (ctx) => ctx.card.defId === 'cogito_ergo_sum',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.cards.length > 1) {
            slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) + slot.multiplier;
            ctx.log(`${ctx.card.name} 让第${ctx.slotIndex + 1}格倍率翻倍！`);
        }
    }
}));

// ===== 9. 训练痕迹（training_trace）：相邻两侧成长效果多触发一次 =====
FX.register(new EffectHandler({
    id: 'training_trace_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'training_trace',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.cards.length > 1) {
            for (const s of ctx.state.slots) {
                if (Math.abs(s.index - ctx.slotIndex) === 1) {
                    for (const c of s.cards) {
                        if (c.keywords.includes('grow')) {
                            const amount = calculateGrowAmount(c, s.index, ctx.state);
                            c.permanentBonus += amount;
                            ctx.log(`${c.name} 受到训练痕迹加持，额外成长+${amount}！`);
                        }
                    }
                }
            }
        }
    }
}));

// ===== 10. 猛训练（intense_training）：后续同格成长效果多触发一次 =====
// 此效果通过在 calculateGrowAmount 中检测来实现
FX.register(new EffectHandler({
    id: 'intense_training_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'intense_training',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.cards.length > 1) {
            slot.intenseTrainingActive = true;
            ctx.log(`${ctx.card.name} 猛训练效果激活！后续同格卡牌成长效果多触发一次`);
        }
    }
}));

// ===== 11. 集体训练（group_training）：后续同格卡牌获得成长2 =====
FX.register(new EffectHandler({
    id: 'group_training_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'group_training',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.cards.length > 1) {
            slot.groupTrainingActive = true;
            ctx.log(`${ctx.card.name} 集体训练效果激活！后续同格卡牌获得成长2`);
        }
    }
}));
