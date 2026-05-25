/**
 * 卡牌地下城 - 打出时效果 (ON_PLAY)（重构版）
 *
 * 所有效果处理器为纯对象，通过 registerEffect 注册。
 */

import { registerEffect, calculateGrowAmount } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { drawCards, recordTimeline } from '../core/battle-core.js';
import { createCardInstance } from '../data/index.js';

// ===== 1. 格子加成（奉献等） =====
registerEffect({
    id: 'slot_bonus',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER - 10,
    condition: (ctx) => ctx.slotIndex >= 0,
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 奉献：格子中已有奉献牌，给新牌加点（只对下一张生效）
        if (!ctx.state.monster.disableDedicate) {
            for (const c of slot.cards) {
                if (c.uuid !== ctx.card.uuid && c.keywords.includes('dedicate') && !c.dedicateTriggered) {
                    const val = ctx.getCardBaseValue(c);
                    const bonus = Math.floor(val / 2);
                    if (bonus > 0) {
                        ctx.card.tempBonus = (ctx.card.tempBonus || 0) + bonus;
                        c.dedicateTriggered = true;
                        recordTimeline(ctx.state, 'card_temp_bonus', {
                            sourceUuid: c.uuid,
                            sourceDefId: c.defId,
                            targetUuid: ctx.card.uuid,
                            targetDefId: ctx.card.defId,
                            amount: bonus,
                            reason: 'dedicate',
                            slotIndex: ctx.slotIndex
                        });
                        ctx.log(`${c.name} 奉献了 ${bonus} 点给 ${ctx.card.name}！`);
                    }
                }
            }
        }
        // 黄色领域：格子中已有无奉献卡牌的反向奉献，给新牌减点
        if (ctx.state.monster.yellowDomain) {
            for (const c of slot.cards) {
                if (c.uuid !== ctx.card.uuid && c.yellowDomainActive && !c.yellowDomainTriggered) {
                    const val = ctx.getCardBaseValue(c);
                    const penalty = Math.floor(val / 2);
                    if (penalty > 0) {
                        ctx.card.tempBonus = (ctx.card.tempBonus || 0) - penalty;
                        c.yellowDomainTriggered = true;
                        recordTimeline(ctx.state, 'card_temp_bonus', {
                            sourceUuid: c.uuid,
                            sourceDefId: c.defId,
                            targetUuid: ctx.card.uuid,
                            targetDefId: ctx.card.defId,
                            amount: -penalty,
                            reason: 'yellow_domain',
                            slotIndex: ctx.slotIndex
                        });
                        ctx.log(`黄色领域生效：${c.name} 使 ${ctx.card.name} 点数-${penalty}`);
                    }
                }
            }
        }
    }
});

// ===== 2. 连携（chain）：抽牌 =====
registerEffect({
    id: 'chain',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 20,
    condition: (ctx) => ctx.card.keywords.includes('chain'),
    execute: (ctx) => {
        const count = ctx.card.chainCount || 1;
        drawCards(ctx.state, count);
        ctx.log(`${ctx.card.name} 连携效果触发，抽${count}张牌`);
    }
});

// ===== 3. 双生（twin）：复制加入手牌（无双生） =====
registerEffect({
    id: 'twin',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 15,
    condition: (ctx) => ctx.card.keywords.includes('twin'),
    execute: (ctx) => {
        const copy = createCardInstance(ctx.card.defId);
        copy.permanentBonus = ctx.card.permanentBonus;
        copy.baseValue = ctx.card.baseValue;
        copy.growAmount = ctx.card.growAmount;
        copy.chainCount = ctx.card.chainCount;
        copy.isDerived = true;
        // 复制牌移除双生词条，避免无限复制
        // 从实例keywords过滤，保留运行时添加的词条
        copy.keywords = (ctx.card.keywords || []).filter(k => k !== 'twin');
        ctx.state.hand.push(copy);
        recordTimeline(ctx.state, 'create_card_in_hand', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            cardUuid: copy.uuid,
            cardDefId: copy.defId,
            reason: 'twin'
        });
        ctx.log(`${ctx.card.name} 双生效果触发，复制加入手牌（已移除双生）`);
    }
});

// ===== 4. 蔓延（spread）：加入扩散牌 =====
registerEffect({
    id: 'spread',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 10,
    condition: (ctx) => ctx.card.keywords.includes('spread'),
    execute: (ctx) => {
        const diffusion = createCardInstance('diffusion');
        diffusion.isDerived = true;
        ctx.state.hand.push(diffusion);
        recordTimeline(ctx.state, 'create_card_in_hand', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            cardUuid: diffusion.uuid,
            cardDefId: diffusion.defId,
            reason: 'spread'
        });
        ctx.log(`${ctx.card.name} 蔓延效果触发，加入一张扩散牌`);
    }
});

// ===== 5. 人面草：香甜诱饵——中间格成长1 =====
registerEffect({
    id: 'center_grow_1',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW + 5,
    condition: (ctx) => ctx.state.monster.centerGrow1 && ctx.slotIndex === 1,
    execute: (ctx) => {
        ctx.card.permanentBonus += 1;
        recordTimeline(ctx.state, 'card_permanent_bonus', {
            cardUuid: ctx.card.uuid,
            cardDefId: ctx.card.defId,
            amount: 1,
            reason: 'center_grow_1',
            slotIndex: ctx.slotIndex
        });
        ctx.log(`人面草的香甜诱饵生效：${ctx.card.name} 成长了！永久点数+1`);
    }
});

// ===== 6. 黄色领域标记 =====
registerEffect({
    id: 'yellow_domain_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER - 5,
    condition: (ctx) => ctx.state.monster.yellowDomain && !ctx.card.keywords.includes('dedicate'),
    execute: (ctx) => {
        ctx.card.yellowDomainActive = true;
        ctx.card.yellowDomainTriggered = false;
    }
});

// ===== 7. 成长（grow）：永久加点 =====
registerEffect({
    id: 'grow',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW,
    condition: (ctx) => ctx.card.keywords.includes('grow') || ctx.state.slots[ctx.slotIndex]?.groupTrainingActive,
    execute: (ctx) => {
        const amount = calculateGrowAmount(ctx.card, ctx.slotIndex, ctx.state);
        if (amount <= 0) return;
        ctx.card.permanentBonus += amount;
        recordTimeline(ctx.state, 'card_permanent_bonus', {
            cardUuid: ctx.card.uuid,
            cardDefId: ctx.card.defId,
            amount,
            reason: 'grow',
            slotIndex: ctx.slotIndex
        });
        ctx.log(`${ctx.card.name} 成长了！永久点数+${amount}`);
        if (typeof GameAudio !== 'undefined') GameAudio.playGrow();
        if (!ctx.state.pendingGrowthEffects) ctx.state.pendingGrowthEffects = [];
        ctx.state.pendingGrowthEffects.push({ slotIndex: ctx.slotIndex });
    }
});

// ===== 6. 传令（messenger）：从牌组拿一张入手牌 =====
registerEffect({
    id: 'messenger_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW,
    condition: (ctx) => ctx.card.defId === 'messenger',
    execute: (ctx) => {
        if (ctx.state.deck.length > 0) {
            const idx = Math.floor(Math.random() * ctx.state.deck.length);
            const card = ctx.state.deck.splice(idx, 1)[0];
            ctx.state.hand.push(card);
            recordTimeline(ctx.state, 'deck_to_hand', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                cardUuid: card.uuid,
                cardDefId: card.defId,
                reason: 'messenger'
            });
            ctx.log(`${ctx.card.name} 传令效果触发，从牌组抽来 ${card.name}`);
        } else {
            ctx.log(`${ctx.card.name} 传令效果触发，但牌组已空`);
        }
    }
});

// ===== 7. 豪华装备（luxury_gear）：已在倍率格时相邻两侧倍率+1 =====
registerEffect({
    id: 'luxury_gear_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'luxury_gear',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 只在“已在倍率格”时生效（格子里已有其他牌）
        if (slot.cards.length <= 1) {
            ctx.log(`${ctx.card.name} 打出时倍率格为空，效果未触发`);
            return;
        }
        for (const s of ctx.state.slots) {
            if (Math.abs(s.index - ctx.slotIndex) === 1) {
                s.roundMultiplierBonus = (s.roundMultiplierBonus || 0) + 1;
                recordTimeline(ctx.state, 'slot_round_multiplier_bonus', {
                    sourceUuid: ctx.card.uuid,
                    sourceDefId: ctx.card.defId,
                    slotIndex: s.index,
                    amount: 1,
                    reason: 'luxury_gear'
                });
                ctx.log(`${ctx.card.name} 提升了第${s.index + 1}格倍率！`);
            }
        }
    }
});

// ===== 8. 我思故我在（cogito_ergo_sum）：已在倍率格时所在格点数x2 =====
registerEffect({
    id: 'cogito_ergo_sum_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL,
    condition: (ctx) => ctx.card.defId === 'cogito_ergo_sum',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 只在“已在倍率格”时生效（格子里已有其他牌）
        if (slot.cards.length <= 1) {
            ctx.log(`${ctx.card.name} 打出时倍率格为空，效果未触发`);
            return;
        }
        // 防止同回合同格多次叠加导致倍数不稳定
        if (!slot.cogitoAppliedThisTurn) {
            slot.cogitoAppliedThisTurn = true;
            slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) + slot.multiplier;
            recordTimeline(ctx.state, 'slot_round_multiplier_bonus', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                slotIndex: ctx.slotIndex,
                amount: slot.multiplier,
                reason: 'cogito_ergo_sum'
            });
            ctx.log(`${ctx.card.name} 让第${ctx.slotIndex + 1}格倍率翻倍！`);
        } else {
            ctx.log(`${ctx.card.name} 效果未叠加（本回合同格已翻倍过）`);
        }
    }
});

// ===== 9. 训练痕迹（training_trace）：相邻两侧成长效果多触发一次 =====
registerEffect({
    id: 'training_trace_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'training_trace',
    execute: (ctx) => {
        ctx.log(`${ctx.card.name} 入场：相邻倍率格后续成长效果多触发一次`);
    }
});

// ===== 10. 猛训练（intense_training）：后续同格成长效果多触发一次 =====
registerEffect({
    id: 'intense_training_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'intense_training',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 只在“已在倍率格”时生效（格子里已有其他牌）
        if (slot.cards.length <= 1) {
            ctx.log(`${ctx.card.name} 打出时倍率格为空，猛训练未激活`);
            return;
        }
        slot.intenseTrainingActive = true;
        recordTimeline(ctx.state, 'slot_flag_enabled', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            slotIndex: ctx.slotIndex,
            flag: 'intenseTrainingActive'
        });
        ctx.log(`${ctx.card.name} 猛训练效果激活！后续同格卡牌成长效果多触发一次`);
    }
});

// ===== 11. 集体训练（group_training）：后续同格卡牌获得成长2 =====
registerEffect({
    id: 'group_training_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'group_training',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.groupTrainingActive = true;
        recordTimeline(ctx.state, 'slot_flag_enabled', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            slotIndex: ctx.slotIndex,
            flag: 'groupTrainingActive'
        });
        ctx.log(`${ctx.card.name} 集体训练效果激活！后续同格卡牌获得成长2`);
    }
});
