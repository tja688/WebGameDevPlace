/**
 * 生死烛局 - 打出时效果 (ON_PLAY)（重构版）
 *
 * 所有效果处理器为纯对象，通过 registerEffect 注册。
 */

import { registerEffect, calculateGrowAmount } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { drawCards, recordTimeline } from '../core/battle-core.js';
import { createCardInstance } from '../data/index.js';
import { detectStrategy } from '../systems/strategy.js';
import { getCardFinalValue } from '../systems/board.js';

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
                    const val = getCardFinalValue(c, ctx.state);
                    const disabledKey = ctx.state.monster?.disabledRelicKey;
                    const hasYellowBone = ctx.state.runDataRef?.relics?.some(r => r.effect?.type === 'dedicate_1_5x' && (!disabledKey || (r.id || r.name) !== disabledKey));
                    const bonus = hasYellowBone ? Math.floor(val * 1.5) : Math.floor(val / 2);
                    if (bonus > 0) {
                        const isPermanentDedicate = ctx.state.runDataRef?.relics?.some(r => r.effect?.type === 'dedicate_permanent' && (!disabledKey || (r.id || r.name) !== disabledKey));
                        if (isPermanentDedicate) {
                            ctx.card.permanentBonus = (ctx.card.permanentBonus || 0) + bonus;
                        } else {
                            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + bonus;
                        }
                        c.dedicateTriggered = true;
                        recordTimeline(ctx.state, 'card_temp_bonus', {
                            sourceUuid: c.uuid,
                            sourceDefId: c.defId,
                            targetUuid: ctx.card.uuid,
                            targetDefId: ctx.card.defId,
                            amount: bonus,
                            reason: isPermanentDedicate ? 'dedicate_permanent' : 'dedicate',
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
        // 学徒铸造/大师铸造：给下一张同格卡牌永久加点
        if (slot.apprenticeForgeBonus && slot.apprenticeForgeBonus > 0) {
            ctx.card.battleBonus = (ctx.card.battleBonus || 0) + slot.apprenticeForgeBonus;
            ctx.log(`学徒铸造生效：${ctx.card.name} 本场战斗永久+${slot.apprenticeForgeBonus}`);
            slot.apprenticeForgeBonus = 0;
        }
        if (slot.masterForgeBonus && slot.masterForgeBonus > 0) {
            ctx.card.battleBonus = (ctx.card.battleBonus || 0) + slot.masterForgeBonus;
            ctx.log(`大师铸造生效：${ctx.card.name} 本场战斗永久+${slot.masterForgeBonus}`);
            slot.masterForgeBonus = 0;
        }
        // 辅助训练：给下一张同格卡牌成长1
        if (slot.supportTrainingActive) {
            ctx.card.keywords = ctx.card.keywords || [];
            if (!ctx.card.keywords.includes('grow')) {
                ctx.card.keywords = [...ctx.card.keywords, 'grow'];
            }
            ctx.card.growAmount = (ctx.card.growAmount || 1);
            ctx.log(`辅助训练生效：${ctx.card.name} 获得成长1`);
            slot.supportTrainingActive = false;
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
        copy.battleBonus = ctx.card.battleBonus || 0;
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
        // 记录本局打出的成长牌数量（用于训练成果）
        if (ctx.state.runDataRef) {
            ctx.state.runDataRef.growthCardsPlayedThisRun = (ctx.state.runDataRef.growthCardsPlayedThisRun || 0) + 1;
        }
        // 训练搭子：从牌组打出到相同倍率格
        const partnerIdx = ctx.state.deck.findIndex(c => c.defId === 'training_partner');
        if (partnerIdx >= 0) {
            const partner = ctx.state.deck.splice(partnerIdx, 1)[0];
            ctx.state.slots[ctx.slotIndex].cards.push(partner);
            ctx.log(`训练搭子响应成长，从牌组打出到第${ctx.slotIndex + 1}格`);
        }
    }
});

// 遗物：对应倍率格卡牌永久+1，累计到阈值后永久强化该格倍率
registerEffect({
    id: 'relic_slot_grow',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW + 8,
    condition: (ctx) => {
        if (!ctx.card || !ctx.state.runDataRef) return false;
        const disabledKey = ctx.state.monster?.disabledRelicKey;
        return ctx.state.runDataRef.relics?.some(r => r.effect?.type === 'slot_grow' && r.effect.slotIndex === ctx.slotIndex && (!disabledKey || (r.id || r.name) !== disabledKey));
    },
    execute: (ctx) => {
        const disabledKey = ctx.state.monster?.disabledRelicKey;
        const relics = ctx.state.runDataRef.relics.filter(r => r.effect?.type === 'slot_grow' && r.effect.slotIndex === ctx.slotIndex && (!disabledKey || (r.id || r.name) !== disabledKey));
        for (const relic of relics) {
            ctx.card.permanentBonus = (ctx.card.permanentBonus || 0) + 1;
            if (!ctx.state.runDataRef.relicSlotGrowth) ctx.state.runDataRef.relicSlotGrowth = {};
            const key = String(ctx.slotIndex);
            ctx.state.runDataRef.relicSlotGrowth[key] = (ctx.state.runDataRef.relicSlotGrowth[key] || 0) + 1;
            recordTimeline(ctx.state, 'card_permanent_bonus', {
                cardUuid: ctx.card.uuid,
                cardDefId: ctx.card.defId,
                amount: 1,
                reason: 'relic_slot_grow',
                slotIndex: ctx.slotIndex
            });
            const growPer = relic.effect.growPer || 50;
            while (ctx.state.runDataRef.relicSlotGrowth[key] >= growPer) {
                ctx.state.runDataRef.relicSlotGrowth[key] -= growPer;
                ctx.state.runDataRef.slotUpgrades[ctx.slotIndex] = (ctx.state.runDataRef.slotUpgrades[ctx.slotIndex] || 0) + (relic.effect.slotBonus || 1);
                ctx.state.slots[ctx.slotIndex].multiplier += (relic.effect.slotBonus || 1);
                ctx.log(`${relic.name} 累计成长达标，第${ctx.slotIndex + 1}格倍率+${relic.effect.slotBonus || 1}`);
            }
            ctx.log(`${relic.name} 生效：${ctx.card.name} 永久+1`);
        }
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

// ===== 新增卡牌效果 =====

// 先手优势：本回合第一张牌，点数+5并获得留场
registerEffect({
    id: 'first_advantage_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'first_advantage',
    execute: (ctx) => {
        if (ctx.card === ctx.state.firstCardPlayedThisTurn) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + 5;
            ctx.card.keywords = ctx.card.keywords || [];
            if (!ctx.card.keywords.includes('remain')) {
                ctx.card.keywords = [...ctx.card.keywords, 'remain'];
                ctx.card._tempRemainAdded = true;
            }
            ctx.log(`${ctx.card.name} 先手优势触发！点数+5并获得留场`);
        }
    }
});

// 殿后：打出后手牌为空时，点数+10
registerEffect({
    id: 'rear_guard_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'rear_guard',
    execute: (ctx) => {
        if (ctx.state.hand.length === 0) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + 10;
            ctx.log(`${ctx.card.name} 殿后触发！手牌为空，点数+10`);
        }
    }
});

// 锦上添花：任意倍率格有3张牌时，从牌组移到手牌
registerEffect({
    id: 'icing_on_cake_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 5,
    condition: (ctx) => true,
    execute: (ctx) => {
        const hasThree = ctx.state.slots.some(s => s.cards.length >= 3);
        if (hasThree && ctx.state.deck.length > 0) {
            const idx = ctx.state.deck.findIndex(c => c.defId === 'icing_on_cake');
            if (idx < 0) return;
            const card = ctx.state.deck.splice(idx, 1)[0];
            ctx.state.hand.push(card);
            recordTimeline(ctx.state, 'deck_to_hand', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                cardUuid: card.uuid,
                cardDefId: card.defId,
                reason: 'icing_on_cake'
            });
            ctx.log(`锦上添花触发，${card.name} 从牌组移到手牌`);
        }
    }
});

// 顺手的事：获得1金币
registerEffect({
    id: 'easy_money_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'easy_money',
    execute: (ctx) => {
        if (ctx.state.runDataRef) {
            ctx.state.runDataRef.gold = (ctx.state.runDataRef.gold || 0) + 1;
            ctx.log(`${ctx.card.name} 顺手的事触发，获得1金币`);
        }
    }
});

// 灵活调度：如果触发计策，所在倍率格点数+1
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
            ctx.log(`${ctx.card.name} 灵活调度触发，第${ctx.slotIndex + 1}格倍率+1`);
        }
    }
});

// 丑陋炫耀：所在倍率格基础点数之和超过100，抽一张牌
registerEffect({
    id: 'ugly_showoff_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 5,
    condition: (ctx) => ctx.card.defId === 'ugly_showoff',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        const totalBase = slot.cards.reduce((sum, c) => sum + (c.baseValue || 0), 0);
        if (totalBase > 100) {
            drawCards(ctx.state, 1);
            ctx.log(`${ctx.card.name} 丑陋炫耀触发，倍率格基础点数${totalBase}超过100，抽一张牌`);
        }
    }
});

// 何须智慧：已在倍率格，所在倍率格点数-1
registerEffect({
    id: 'no_wisdom_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'no_wisdom',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) - 1;
        recordTimeline(ctx.state, 'slot_round_multiplier_bonus', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            slotIndex: ctx.slotIndex,
            amount: -1,
            reason: 'no_wisdom'
        });
        ctx.log(`${ctx.card.name} 何须智慧触发，第${ctx.slotIndex + 1}格倍率-1`);
    }
});

// 合力：将手牌一张随机卡牌放回牌组
registerEffect({
    id: 'combined_force_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'combined_force',
    execute: (ctx) => {
        if (ctx.state.hand.length > 0) {
            const idx = Math.floor(Math.random() * ctx.state.hand.length);
            const card = ctx.state.hand.splice(idx, 1)[0];
            ctx.state.deck.push(card);
            ctx.log(`${ctx.card.name} 合力触发，将 ${card.name} 放回牌组`);
        }
    }
});

// 学徒铸造：下一张同格卡牌本场战斗永久+5
registerEffect({
    id: 'apprentice_forge_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'apprentice_forge',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.apprenticeForgeBonus = (slot.apprenticeForgeBonus || 0) + 5;
        ctx.log(`${ctx.card.name} 学徒铸造激活！下一张同格卡牌本场战斗永久+5`);
    }
});

// 肉体智慧：所在倍率格基础点数之和超过100，所在格点数+1
registerEffect({
    id: 'body_wisdom_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'body_wisdom',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        const totalBase = slot.cards.reduce((sum, c) => sum + (c.baseValue || 0), 0);
        if (totalBase > 100) {
            slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) + 1;
            recordTimeline(ctx.state, 'slot_round_multiplier_bonus', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                slotIndex: ctx.slotIndex,
                amount: 1,
                reason: 'body_wisdom'
            });
            ctx.log(`${ctx.card.name} 肉体智慧触发，第${ctx.slotIndex + 1}格倍率+1`);
        }
    }
});

// 预借：本牌本次战斗点数永久-10
registerEffect({
    id: 'borrow_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'borrow',
    execute: (ctx) => {
        ctx.card.battleBonus = (ctx.card.battleBonus || 0) - 10;
        ctx.log(`${ctx.card.name} 预借触发，本次战斗永久点数-10`);
    }
});

// 大师铸造：下一张同格卡牌本场战斗永久+10
registerEffect({
    id: 'master_forge_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'master_forge',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.masterForgeBonus = (slot.masterForgeBonus || 0) + 10;
        ctx.log(`${ctx.card.name} 大师铸造激活！下一张同格卡牌本场战斗永久+10`);
    }
});

// 熟练预借：本牌本次战斗点数永久-5
registerEffect({
    id: 'skilled_borrow_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'skilled_borrow',
    execute: (ctx) => {
        ctx.card.battleBonus = (ctx.card.battleBonus || 0) - 5;
        ctx.log(`${ctx.card.name} 熟练预借触发，本次战斗永久点数-5`);
    }
});

// 训练集合：将牌组内所有同名牌打出在本牌所在倍率格
registerEffect({
    id: 'training_set_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'training_set',
    execute: (ctx) => {
        const sameCards = ctx.state.deck.filter(c => c.defId === 'training_set');
        let count = 0;
        for (const c of sameCards) {
            const idx = ctx.state.deck.indexOf(c);
            if (idx >= 0) {
                ctx.state.deck.splice(idx, 1);
                ctx.state.slots[ctx.slotIndex].cards.push(c);
                count++;
            }
        }
        if (count > 0) {
            ctx.log(`${ctx.card.name} 训练集合触发，从牌组打出${count}张同名卡牌到第${ctx.slotIndex + 1}格`);
        }
    }
});

// 辅助训练：已在倍率格，下一张同格卡牌获得成长1
registerEffect({
    id: 'support_training_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'support_training',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.supportTrainingActive = true;
        ctx.log(`${ctx.card.name} 辅助训练激活！下一张同格卡牌获得成长1`);
    }
});

// 30小时训练：成长数+1
registerEffect({
    id: 'training_30h_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW - 5,
    condition: (ctx) => ctx.card.defId === 'training_30h',
    execute: (ctx) => {
        ctx.card.growAmount = (ctx.card.growAmount || 1) + 1;
        ctx.log(`${ctx.card.name} 30小时训练触发，成长数+1`);
    }
});

// 激素训练：每有10点数给所在倍率格点数+1
registerEffect({
    id: 'steroid_training_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'steroid_training',
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
                reason: 'steroid_training'
            });
            ctx.log(`${ctx.card.name} 激素训练触发，当前点数${val}，第${ctx.slotIndex + 1}格倍率+${bonus}`);
        }
    }
});

// 规律训练：从牌组拿一张成长卡牌入手牌
registerEffect({
    id: 'regular_training_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 5,
    condition: (ctx) => ctx.card.defId === 'regular_training',
    execute: (ctx) => {
        const growCards = ctx.state.deck.filter(c => c.keywords && c.keywords.includes('grow'));
        if (growCards.length > 0) {
            const idx = Math.floor(Math.random() * growCards.length);
            const card = growCards[idx];
            const deckIdx = ctx.state.deck.indexOf(card);
            ctx.state.deck.splice(deckIdx, 1);
            ctx.state.hand.push(card);
            recordTimeline(ctx.state, 'deck_to_hand', {
                sourceUuid: ctx.card.uuid,
                sourceDefId: ctx.card.defId,
                cardUuid: card.uuid,
                cardDefId: card.defId,
                reason: 'regular_training'
            });
            ctx.log(`${ctx.card.name} 规律训练触发，从牌组抽来 ${card.name}`);
        }
    }
});
