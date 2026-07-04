/**
 * Heave! - 打出时效果 (ON_PLAY)（重构版）
 *
 * 所有效果处理器为纯对象，通过 registerEffect 注册。
 */

import { registerEffect, calculateGrowAmount } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { drawCards, recordTimeline, addBattleLog } from '../core/battle-core.js';
import { createCardInstance } from '../data/index.js';

// ===== 1. 格子加成（学徒铸造/大师铸造/助锻矿等一次性加成） =====
registerEffect({
    id: 'slot_bonus',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER - 10,
    condition: (ctx) => ctx.slotIndex >= 0,
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 学徒铸造/大师铸造：给下一张同格矿石永久加点
        if (slot.apprenticeForgeBonus && slot.apprenticeForgeBonus > 0) {
            ctx.card.battleBonus = (ctx.card.battleBonus || 0) + slot.apprenticeForgeBonus;
            ctx.log(`学徒铸造生效：${ctx.card.name} 本场海战永久+${slot.apprenticeForgeBonus}`);
            slot.apprenticeForgeBonus = 0;
        }
        if (slot.masterForgeBonus && slot.masterForgeBonus > 0) {
            ctx.card.battleBonus = (ctx.card.battleBonus || 0) + slot.masterForgeBonus;
            ctx.log(`大师铸造生效：${ctx.card.name} 本场海战永久+${slot.masterForgeBonus}`);
            slot.masterForgeBonus = 0;
        }
        // 助锻矿：给下一块同格矿石淬火1
        if (slot.supportTrainingActive) {
            ctx.card.keywords = ctx.card.keywords || [];
            if (!ctx.card.keywords.includes('grow')) {
                ctx.card.keywords = [...ctx.card.keywords, 'grow'];
            }
            ctx.card.growAmount = (ctx.card.growAmount || 1);
            ctx.log(`助锻矿生效：${ctx.card.name} 获得淬火1`);
            slot.supportTrainingActive = false;
        }
    }
});

// ===== 2. 共生（chain）：抽取矿石 =====
registerEffect({
    id: 'chain',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 20,
    condition: (ctx) => ctx.card.keywords.includes('chain'),
    execute: (ctx) => {
        const count = ctx.card.chainCount || 1;
        drawCards(ctx.state, count);
        ctx.log(`${ctx.card.name} 共生效果触发，抽取${count}块矿石`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 共生：抽取${count}块矿石` });
    }
});

// ===== 3. 双晶（twin）：复制加入精炼盘（无双晶） =====
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
        // 复制矿石移除双晶词条，避免无限复制
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
        ctx.log(`${ctx.card.name} 双晶效果触发，复制加入精炼盘（已移除双晶）`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 双晶：复制加入精炼盘` });
    }
});

// ===== 4. 碎屑（spread）：加入矿渣 =====
registerEffect({
    id: 'spread',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 10,
    condition: (ctx) => ctx.card.keywords.includes('spread'),
    execute: (ctx) => {
        const diffusion = createCardInstance('slag');
        diffusion.isDerived = true;
        ctx.state.hand.push(diffusion);
        recordTimeline(ctx.state, 'create_card_in_hand', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            cardUuid: diffusion.uuid,
            cardDefId: diffusion.defId,
            reason: 'spread'
        });
        ctx.log(`${ctx.card.name} 碎屑效果触发，加入一块矿渣`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 碎屑：加入矿渣` });
    }
});

// ===== 5. 藤蔓号：缠海藻——中间格淬火1 =====
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
        ctx.log(`藤蔓号的缠海藻生效：${ctx.card.name} 淬火了！永久点数+1`);
        addBattleLog(ctx.state, 'monster_skill', { text: `缠海藻：${ctx.card.name} 永久+1` });
    }
});

// ===== 7. 淬火（grow）：永久加点 =====
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
        ctx.log(`${ctx.card.name} 淬火了！永久点数+${amount}`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 淬火：永久+${amount}` });
        if (typeof GameAudio !== 'undefined') GameAudio.playGrow();
        if (!ctx.state.pendingGrowthEffects) ctx.state.pendingGrowthEffects = [];
        ctx.state.pendingGrowthEffects.push({ slotIndex: ctx.slotIndex });
        // 记录本局打出的淬火矿石数量（用于淬火成果）
        if (ctx.state.runDataRef) {
            ctx.state.runDataRef.growthCardsPlayedThisRun = (ctx.state.runDataRef.growthCardsPlayedThisRun || 0) + 1;
        }
        // 锻伴：从矿舱投入到相同铸造台
        const partnerIdx = ctx.state.deck.findIndex(c => c.defId === 'forge_partner');
        if (partnerIdx >= 0) {
            const partner = ctx.state.deck.splice(partnerIdx, 1)[0];
            ctx.state.slots[ctx.slotIndex].cards.push(partner);
            ctx.log(`锻伴响应淬火，从矿舱投入到第${ctx.slotIndex + 1}铸造台`);
        }
    }
});

// 遗物：对应铸造台矿石永久+1，累计到阈值后永久强化该铸造台倍率
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
                ctx.log(`${relic.name} 累计淬火达标，第${ctx.slotIndex + 1}铸造台倍率+${relic.effect.slotBonus || 1}`);
                addBattleLog(ctx.state, 'relic', { relicName: relic.name, text: `第${ctx.slotIndex + 1}铸造台倍率+${relic.effect.slotBonus || 1}` });
            }
            ctx.log(`${relic.name} 生效：${ctx.card.name} 永久+1`);
            addBattleLog(ctx.state, 'relic', { relicName: relic.name, text: `${ctx.card.name} 永久+1` });
        }
    }
});

// ===== 6. 传令矿（dispatch_ore）：从矿舱拿一块入手精炼盘 =====
registerEffect({
    id: 'messenger_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW,
    condition: (ctx) => ctx.card.defId === 'dispatch_ore',
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
            ctx.log(`${ctx.card.name} 传令矿效果触发，从矿舱抽来 ${card.name}`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 传令矿：抽来${card.name}` });
        } else {
            ctx.log(`${ctx.card.name} 传令矿效果触发，但矿舱已空`);
        }
    }
});

// ===== 7. 钢钻（steel_drill）：已在铸造台时相邻两侧倍率+1 =====
registerEffect({
    id: 'luxury_gear_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'steel_drill',
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
                ctx.log(`${ctx.card.name} 提升了第${s.index + 1}铸造台倍率！`);
                addBattleLog(ctx.state, 'other', { text: `${ctx.card.name}：第${s.index + 1}铸造台倍率+1` });
            }
        }
    }
});

// ===== 8. 我思故我在（cogito）：已在铸造台时所在铸造台点数x2 =====
registerEffect({
    id: 'cogito_ergo_sum_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL,
    condition: (ctx) => ctx.card.defId === 'cogito',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 防止同回合同铸造台多次叠加导致倍数不稳定
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
            ctx.log(`${ctx.card.name} 让第${ctx.slotIndex + 1}铸造台倍率翻倍！`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name}：第${ctx.slotIndex + 1}铸造台倍率翻倍` });
        } else {
            ctx.log(`${ctx.card.name} 效果未叠加（本回合同铸造台已翻倍过）`);
        }
    }
});

// ===== 9. 锻痕（forge_trace）：相邻两侧淬火效果多触发一次 =====
registerEffect({
    id: 'training_trace_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'forge_trace',
    execute: (ctx) => {
        ctx.log(`${ctx.card.name} 入场：相邻铸造台后续淬火效果多触发一次`);
    }
});

// ===== 10. 猛淬火（intense_forge）：后续同格淬火效果多触发一次 =====
registerEffect({
    id: 'intense_training_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'intense_forge',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.intenseTrainingActive = true;
        recordTimeline(ctx.state, 'slot_flag_enabled', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            slotIndex: ctx.slotIndex,
            flag: 'intenseTrainingActive'
        });
        ctx.log(`${ctx.card.name} 猛淬火效果激活！后续同格矿石淬火效果多触发一次`);
    }
});

// ===== 11. 批量淬火（batch_quench）：后续同格矿石获得淬火2 =====
registerEffect({
    id: 'group_training_mark',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'batch_quench',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.groupTrainingActive = true;
        recordTimeline(ctx.state, 'slot_flag_enabled', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            slotIndex: ctx.slotIndex,
            flag: 'groupTrainingActive'
        });
        ctx.log(`${ctx.card.name} 批量淬火效果激活！后续同格矿石获得淬火2`);
    }
});

// ===== 新增卡牌效果 =====

// 先手矿：本回合第一张矿石，点数+5并获得驻台
registerEffect({
    id: 'first_advantage_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'first_ore',
    execute: (ctx) => {
        if (ctx.card === ctx.state.firstCardPlayedThisTurn) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + 5;
            ctx.card.keywords = ctx.card.keywords || [];
            if (!ctx.card.keywords.includes('remain')) {
                ctx.card.keywords = [...ctx.card.keywords, 'remain'];
                ctx.card._tempRemainAdded = true;
            }
            ctx.log(`${ctx.card.name} 先手矿触发！点数+5并获得驻台`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 先手矿：+5并获得驻台` });
        }
    }
});

// 殿后矿：打出后精炼盘为空时，点数+10
registerEffect({
    id: 'rear_guard_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'rear_ore',
    execute: (ctx) => {
        if (ctx.state.hand.length === 0) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + 10;
            ctx.log(`${ctx.card.name} 殿后矿触发！精炼盘为空，点数+10`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 殿后矿：+10` });
        }
    }
});

// 镀银：任意铸造台有3块矿石时，从矿舱移到精炼盘
registerEffect({
    id: 'icing_on_cake_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 5,
    condition: (ctx) => true,
    execute: (ctx) => {
        const hasThree = ctx.state.slots.some(s => s.cards.length >= 3);
        if (hasThree && ctx.state.deck.length > 0) {
            const idx = ctx.state.deck.findIndex(c => c.defId === 'silver_plate');
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
            ctx.log(`镀银触发，${card.name} 从矿舱移到精炼盘`);
            addBattleLog(ctx.state, 'other', { text: `镀银：${card.name}移入精炼盘` });
        }
    }
});

// 压舱石：获得1银元
registerEffect({
    id: 'easy_money_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'ballast_stone',
    execute: (ctx) => {
        if (ctx.state.runDataRef) {
            ctx.state.runDataRef.gold = (ctx.state.runDataRef.gold || 0) + 1;
            ctx.log(`${ctx.card.name} 压舱石触发，获得1银元`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 压舱石：+1银元` });
        }
    }
});

// 灵活调度矿：所在铸造台点数+1（计策系统已废弃，改为常驻效果）
registerEffect({
    id: 'flexible_dispatch_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'flexible_ore',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) + 1;
        recordTimeline(ctx.state, 'slot_round_multiplier_bonus', {
            sourceUuid: ctx.card.uuid,
            sourceDefId: ctx.card.defId,
            slotIndex: ctx.slotIndex,
            amount: 1,
            reason: 'flexible_dispatch'
        });
        ctx.log(`${ctx.card.name} 灵活调度矿触发，第${ctx.slotIndex + 1}铸造台倍率+1`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 灵活调度矿：第${ctx.slotIndex + 1}铸造台倍率+1` });
    }
});

// 丑陋炫耀：所在铸造台基础点数之和超过100，抽取一块矿石
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
            ctx.log(`${ctx.card.name} 丑陋炫耀触发，铸造台基础点数${totalBase}超过100，抽取一块矿石`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 丑陋炫耀：抽取一块矿石` });
        }
    }
});

// 何需谋略：已在铸造台，所在铸造台点数-1
registerEffect({
    id: 'no_wisdom_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'no_strategy',
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
        ctx.log(`${ctx.card.name} 何需谋略触发，第${ctx.slotIndex + 1}铸造台倍率-1`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 何需谋略：第${ctx.slotIndex + 1}铸造台倍率-1` });
    }
});

// 合锻：将精炼盘一块随机矿石放回矿舱
registerEffect({
    id: 'combined_force_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'combined_forge',
    execute: (ctx) => {
        if (ctx.state.hand.length > 0) {
            const idx = Math.floor(Math.random() * ctx.state.hand.length);
            const card = ctx.state.hand.splice(idx, 1)[0];
            ctx.state.deck.push(card);
            ctx.log(`${ctx.card.name} 合锻触发，将 ${card.name} 放回矿舱`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 合锻：${card.name}放回矿舱` });
        }
    }
});

// 学徒铸造：下一张同格矿石本场海战永久+5
registerEffect({
    id: 'apprentice_forge_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'apprentice_cast',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.apprenticeForgeBonus = (slot.apprenticeForgeBonus || 0) + 5;
        ctx.log(`${ctx.card.name} 学徒铸造激活！下一张同格矿石本场海战永久+5`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 学徒铸造：下一张同格+5` });
    }
});

// 肉体智慧：所在铸造台基础点数之和超过100，所在铸造台点数+1
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
            ctx.log(`${ctx.card.name} 肉体智慧触发，第${ctx.slotIndex + 1}铸造台倍率+1`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 肉体智慧：第${ctx.slotIndex + 1}铸造台倍率+1` });
        }
    }
});

// 透支矿：本牌本次海战点数永久-10
registerEffect({
    id: 'borrow_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'overdraft',
    execute: (ctx) => {
        ctx.card.battleBonus = (ctx.card.battleBonus || 0) - 10;
        ctx.log(`${ctx.card.name} 透支矿触发，本次海战永久点数-10`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 透支矿：永久-10` });
    }
});

// 大师铸造：下一张同格矿石本场海战永久+10
registerEffect({
    id: 'master_forge_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'master_cast',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.masterForgeBonus = (slot.masterForgeBonus || 0) + 10;
        ctx.log(`${ctx.card.name} 大师铸造激活！下一张同格矿石本场海战永久+10`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 大师铸造：下一张同格+10` });
    }
});

// 熟练透支：本牌本次海战点数永久-5
registerEffect({
    id: 'skilled_borrow_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'skilled_overdraft',
    execute: (ctx) => {
        ctx.card.battleBonus = (ctx.card.battleBonus || 0) - 5;
        ctx.log(`${ctx.card.name} 熟练透支触发，本次海战永久点数-5`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 熟练透支：永久-5` });
    }
});

// 锻集：将矿舱内所有同名矿石打出在本牌所在铸造台
registerEffect({
    id: 'training_set_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'forge_set',
    execute: (ctx) => {
        const sameCards = ctx.state.deck.filter(c => c.defId === 'forge_set');
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
            ctx.log(`${ctx.card.name} 锻集触发，从矿舱打出${count}块同名矿石到第${ctx.slotIndex + 1}铸造台`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 锻集：打出${count}块到铸造台${ctx.slotIndex + 1}` });
        }
    }
});

// 助锻矿：已在铸造台，下一张同格矿石获得淬火1
registerEffect({
    id: 'support_training_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 5,
    condition: (ctx) => ctx.card.defId === 'assist_forge',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.supportTrainingActive = true;
        ctx.log(`${ctx.card.name} 助锻矿激活！下一张同格矿石获得淬火1`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 助锻矿：下一张同格获得淬火1` });
    }
});

// 三十次淬火：淬火数+1
registerEffect({
    id: 'training_30h_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW - 5,
    condition: (ctx) => ctx.card.defId === 'thirty_quench',
    execute: (ctx) => {
        ctx.card.growAmount = (ctx.card.growAmount || 1) + 1;
        ctx.log(`${ctx.card.name} 三十次淬火触发，淬火数+1`);
        addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 三十次淬火：淬火数+1` });
    }
});

// 激素淬火：每有10点数给所在铸造台点数+1
registerEffect({
    id: 'steroid_training_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'steroid_quench',
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
            ctx.log(`${ctx.card.name} 激素淬火触发，当前点数${val}，第${ctx.slotIndex + 1}铸造台倍率+${bonus}`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 激素淬火：第${ctx.slotIndex + 1}铸造台倍率+${bonus}` });
        }
    }
});

// 规律淬火：从矿舱拿一块淬火矿石入精炼盘
registerEffect({
    id: 'regular_training_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 5,
    condition: (ctx) => ctx.card.defId === 'regular_quench',
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
            ctx.log(`${ctx.card.name} 规律淬火触发，从矿舱抽来 ${card.name}`);
            addBattleLog(ctx.state, 'other', { text: `${ctx.card.name} 规律淬火：抽来${card.name}` });
        }
    }
});
