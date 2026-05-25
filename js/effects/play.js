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
        // 辅助训练：下一张同格卡牌获得成长1
        if (slot.auxiliaryTrainingActive) {
            if (!ctx.card.keywords.includes('grow')) {
                ctx.card.keywords = [...ctx.card.keywords, 'grow'];
                ctx.card.growAmount = 1;
            }
            slot.auxiliaryTrainingActive = false;
            recordTimeline(ctx.state, 'card_keyword_added', {
                cardUuid: ctx.card.uuid,
                cardDefId: ctx.card.defId,
                keyword: 'grow',
                reason: 'auxiliary_training',
                slotIndex: ctx.slotIndex
            });
            ctx.log(`辅助训练生效：${ctx.card.name} 获得成长1！`);
        }
        // 学徒铸造/大师铸造：下一张同格卡牌永久加点
        if (slot.forgeBonus && slot.forgeBonus > 0) {
            ctx.card.permanentBonus += slot.forgeBonus;
            recordTimeline(ctx.state, 'card_permanent_bonus', {
                cardUuid: ctx.card.uuid,
                cardDefId: ctx.card.defId,
                amount: slot.forgeBonus,
                reason: 'forge',
                slotIndex: ctx.slotIndex
            });
            ctx.log(`铸造生效：${ctx.card.name} 永久点数+${slot.forgeBonus}！`);
            slot.forgeBonus = 0;
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
        // 全局成长计数（训练成果用）
        if (ctx.state.runDataRef) {
            ctx.state.runDataRef.growCardsPlayedThisRun = (ctx.state.runDataRef.growCardsPlayedThisRun || 0) + 1;
        }
        recordTimeline(ctx.state, 'card_permanent_bonus', {
            cardUuid: ctx.card.uuid,
            cardDefId: ctx.card.defId,
            amount,
            reason: 'grow',
            slotIndex: ctx.slotIndex
        });
        ctx.log(`${ctx.card.name} 成长了！永久点数+${amount}`);
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
            const card = ctx.state.deck.pop();
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
        // 检查是否已在倍率格（即不是第一张打出的）
        if (slot.cards.length > 1) {
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
        if (slot.cards.length > 1) {
            slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) + slot.multiplier;
            recordTimeline(ctx.state, 'slot_round_multiplier_bonus', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                slotIndex: ctx.slotIndex,
                amount: slot.multiplier,
                reason: 'cogito_ergo_sum'
            });
            ctx.log(`${ctx.card.name} 让第${ctx.slotIndex + 1}格倍率翻倍！`);
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

// ===== 12. 训练搭子（training_buddy）：打出成长牌时自动从牌组打出 =====
registerEffect({
    id: 'training_buddy_global',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 25,
    condition: (ctx) => ctx.card.keywords.includes('grow') && ctx.card.defId !== 'training_buddy',
    execute: (ctx) => {
        const buddy = ctx.state.deck.find(c => c.defId === 'training_buddy');
        if (buddy) {
            const idx = ctx.state.deck.indexOf(buddy);
            ctx.state.deck.splice(idx, 1);
            ctx.state.slots[ctx.slotIndex].cards.push(buddy);
            recordTimeline(ctx.state, 'play_card_to_slot', {
                cardUuid: buddy.uuid,
                cardDefId: buddy.defId,
                cardName: buddy.name,
                slotIndex: ctx.slotIndex,
                reason: 'training_buddy'
            });
            ctx.log(`${ctx.card.name} 触发训练搭子！${buddy.name} 自动打出到同格`);
            // 触发 buddy 的 ON_PLAY
            const buddyCtx = new EffectContext({
                state: ctx.state, trigger: Trigger.ON_PLAY,
                card: buddy, slotIndex: ctx.slotIndex
            });
            FX.fire(Trigger.ON_PLAY, buddyCtx);
        }
    }
});

// ===== 13. 辅助训练（auxiliary_training）：激活下一张成长 =====
registerEffect({
    id: 'auxiliary_training_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'auxiliary_training',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.cards.length > 1) {
            slot.auxiliaryTrainingActive = true;
            recordTimeline(ctx.state, 'slot_flag_enabled', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                slotIndex: ctx.slotIndex,
                flag: 'auxiliaryTrainingActive'
            });
            ctx.log(`${ctx.card.name} 辅助训练效果激活！下一张同格卡牌获得成长1`);
        }
    }
});

// ===== 14. 30小时训练（training_30h）：成长数+1 =====
registerEffect({
    id: 'training_30h_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'training_30h',
    execute: (ctx) => {
        ctx.card.growAmount = (ctx.card.growAmount || 1) + 1;
        recordTimeline(ctx.state, 'card_permanent_bonus', {
            cardUuid: ctx.card.uuid,
            cardDefId: ctx.card.defId,
            amount: 0,
            reason: 'grow_increase',
            slotIndex: ctx.slotIndex
        });
        ctx.log(`${ctx.card.name} 成长数提升至 ${ctx.card.growAmount}！`);
    }
});

// ===== 15. 激素训练（hormone_training）：每10点数给倍率格+1 =====
registerEffect({
    id: 'hormone_training_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'hormone_training',
    execute: (ctx) => {
        const val = ctx.getCardBaseValue(ctx.card);
        const bonus = Math.floor(val / 10);
        if (bonus > 0) {
            const slot = ctx.state.slots[ctx.slotIndex];
            slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) + bonus;
            recordTimeline(ctx.state, 'slot_round_multiplier_bonus', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                slotIndex: ctx.slotIndex,
                amount: bonus,
                reason: 'hormone_training'
            });
            ctx.log(`${ctx.card.name} 激素训练生效！第${ctx.slotIndex + 1}格倍率+${bonus}`);
        }
    }
});

// ===== 16. 规律训练（regular_training）：从牌组拿成长牌入手牌 =====
registerEffect({
    id: 'regular_training_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW,
    condition: (ctx) => ctx.card.defId === 'regular_training',
    execute: (ctx) => {
        const target = ctx.state.deck.find(c => c.keywords.includes('grow'));
        if (target) {
            const idx = ctx.state.deck.indexOf(target);
            ctx.state.deck.splice(idx, 1);
            ctx.state.hand.push(target);
            recordTimeline(ctx.state, 'deck_to_hand', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                cardUuid: target.uuid,
                cardDefId: target.defId,
                reason: 'regular_training'
            });
            ctx.log(`${ctx.card.name} 规律训练：从牌组抽来 ${target.name}`);
        } else {
            ctx.log(`${ctx.card.name} 规律训练：牌组中没有成长牌`);
        }
    }
});

// ===== 17. 丑陋炫耀（ugly_showoff）：所在格总点数>100则抽牌 =====
registerEffect({
    id: 'ugly_showoff_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW,
    condition: (ctx) => ctx.card.defId === 'ugly_showoff',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        let total = 0;
        for (const c of slot.cards) {
            total += ctx.getCardBaseValue(c);
        }
        if (total > 100) {
            drawCards(ctx.state, 1);
            ctx.log(`${ctx.card.name} 丑陋炫耀触发！所在格总点数 ${total} > 100，抽一张牌`);
        }
    }
});

// ===== 18. 学徒铸造（apprentice_forge）：下一张同格永久+5 =====
registerEffect({
    id: 'apprentice_forge_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'apprentice_forge',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.cards.length > 1) {
            slot.forgeBonus = 5;
            recordTimeline(ctx.state, 'slot_flag_enabled', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                slotIndex: ctx.slotIndex,
                flag: 'forgeBonus_5'
            });
            ctx.log(`${ctx.card.name} 学徒铸造激活！下一张同格卡牌永久+5`);
        }
    }
});

// ===== 19. 预借（borrow）：永久-10 =====
registerEffect({
    id: 'borrow_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'borrow',
    execute: (ctx) => {
        ctx.card.permanentBonus -= 10;
        recordTimeline(ctx.state, 'card_permanent_bonus', {
            cardUuid: ctx.card.uuid,
            cardDefId: ctx.card.defId,
            amount: -10,
            reason: 'borrow',
            slotIndex: ctx.slotIndex
        });
        ctx.log(`${ctx.card.name} 预借生效！永久点数-10`);
    }
});

// ===== 20. 大师铸造（master_forge）：下一张同格永久+10 =====
registerEffect({
    id: 'master_forge_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'master_forge',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.cards.length > 1) {
            slot.forgeBonus = 10;
            recordTimeline(ctx.state, 'slot_flag_enabled', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                slotIndex: ctx.slotIndex,
                flag: 'forgeBonus_10'
            });
            ctx.log(`${ctx.card.name} 大师铸造激活！下一张同格卡牌永久+10`);
        }
    }
});

// ===== 21. 完美借力（perfect_leverage）：获得相邻两侧最高点数之和 =====
registerEffect({
    id: 'perfect_leverage_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'perfect_leverage',
    execute: (ctx) => {
        let maxLeft = 0;
        let maxRight = 0;
        if (ctx.slotIndex > 0) {
            const leftSlot = ctx.state.slots[ctx.slotIndex - 1];
            for (const c of leftSlot.cards) {
                maxLeft = Math.max(maxLeft, ctx.getCardBaseValue(c));
            }
        }
        if (ctx.slotIndex < ctx.state.slots.length - 1) {
            const rightSlot = ctx.state.slots[ctx.slotIndex + 1];
            for (const c of rightSlot.cards) {
                maxRight = Math.max(maxRight, ctx.getCardBaseValue(c));
            }
        }
        const bonus = maxLeft + maxRight;
        if (bonus > 0) {
            ctx.card.permanentBonus += bonus;
            recordTimeline(ctx.state, 'card_permanent_bonus', {
                cardUuid: ctx.card.uuid,
                cardDefId: ctx.card.defId,
                amount: bonus,
                reason: 'perfect_leverage',
                slotIndex: ctx.slotIndex
            });
            ctx.log(`${ctx.card.name} 完美借力！获得 ${bonus} 点永久点数`);
        }
    }
});

// ===== 22. 熟练预借（skilled_borrow）：永久-5 =====
registerEffect({
    id: 'skilled_borrow_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'skilled_borrow',
    execute: (ctx) => {
        ctx.card.permanentBonus -= 5;
        recordTimeline(ctx.state, 'card_permanent_bonus', {
            cardUuid: ctx.card.uuid,
            cardDefId: ctx.card.defId,
            amount: -5,
            reason: 'skilled_borrow',
            slotIndex: ctx.slotIndex
        });
        ctx.log(`${ctx.card.name} 熟练预借生效！永久点数-5`);
    }
});

// ===== 23. 一人成军（one_man_army）：获得牌组总点数之和 =====
registerEffect({
    id: 'one_man_army_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'one_man_army',
    execute: (ctx) => {
        let total = 0;
        for (const c of ctx.state.deck) {
            total += ctx.getCardBaseValue(c);
        }
        if (total > 0) {
            ctx.card.permanentBonus += total;
            recordTimeline(ctx.state, 'card_permanent_bonus', {
                cardUuid: ctx.card.uuid,
                cardDefId: ctx.card.defId,
                amount: total,
                reason: 'one_man_army',
                slotIndex: ctx.slotIndex
            });
            ctx.log(`${ctx.card.name} 一人成军！获得牌组总点数 ${total} 的永久点数`);
        }
    }
});

// ===== 24. 先手优势（first_strike）：第一张打出+5并获得留场 =====
registerEffect({
    id: 'first_strike_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'first_strike',
    execute: (ctx) => {
        if (ctx.state.firstCardPlayedThisTurn === ctx.card) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + 5;
            if (!ctx.card.keywords.includes('remain')) {
                ctx.card.keywords = [...ctx.card.keywords, 'remain'];
            }
            recordTimeline(ctx.state, 'card_temp_bonus', {
                cardUuid: ctx.card.uuid,
                cardDefId: ctx.card.defId,
                amount: 5,
                reason: 'first_strike',
                slotIndex: ctx.slotIndex
            });
            ctx.log(`${ctx.card.name} 先手优势！点数+5并获得留场`);
        }
    }
});

// ===== 25. 殿后（rear_guard）：打出后手牌为空+10 =====
registerEffect({
    id: 'rear_guard_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'rear_guard',
    execute: (ctx) => {
        if (ctx.state.hand.length === 0) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + 10;
            recordTimeline(ctx.state, 'card_temp_bonus', {
                cardUuid: ctx.card.uuid,
                cardDefId: ctx.card.defId,
                amount: 10,
                reason: 'rear_guard',
                slotIndex: ctx.slotIndex
            });
            ctx.log(`${ctx.card.name} 殿后！手牌为空，点数+10`);
        }
    }
});

// ===== 26. 战旗（battle_banner）：相邻两侧卡牌点数+5 =====
registerEffect({
    id: 'battle_banner_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'battle_banner',
    execute: (ctx) => {
        const adjacent = ctx.getAdjacentSlots(ctx.slotIndex);
        for (const s of adjacent) {
            for (const c of s.cards) {
                c.tempBonus = (c.tempBonus || 0) + 5;
            }
            recordTimeline(ctx.state, 'card_temp_bonus', {
                cardUuid: ctx.card.uuid,
                cardDefId: ctx.card.defId,
                amount: 5,
                reason: 'battle_banner',
                slotIndex: s.index
            });
        }
        if (adjacent.length > 0) {
            ctx.log(`${ctx.card.name} 战旗飘扬！相邻两侧卡牌点数+5`);
        }
    }
});

// ===== 27. 顺手的事（easy_task）：获得1金币 =====
registerEffect({
    id: 'easy_task_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'easy_task',
    execute: (ctx) => {
        if (ctx.state.runDataRef) {
            ctx.state.runDataRef.gold += 1;
            ctx.log(`${ctx.card.name} 顺手的事：获得1金币`);
        }
    }
});

// ===== 28. 灵活调度（flexible_dispatch）：若已触发计策，本格倍率+1 =====
registerEffect({
    id: 'flexible_dispatch_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'flexible_dispatch',
    execute: (ctx) => {
        const strategy = detectStrategy(ctx.state.slots, ctx.state.runDataRef?.strategyLevels);
        if (strategy) {
            const slot = ctx.state.slots[ctx.slotIndex];
            slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) + 1;
            recordTimeline(ctx.state, 'slot_round_multiplier_bonus', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                slotIndex: ctx.slotIndex,
                amount: 1,
                reason: 'flexible_dispatch'
            });
            ctx.log(`${ctx.card.name} 灵活调度！计策已触发，本格倍率+1`);
        }
    }
});

import { detectStrategy } from '../systems/strategy.js';
