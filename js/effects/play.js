/**
 * 卡牌地下城 - 打出时效果 (ON_PLAY)
 * 
 * 所有"卡牌打出到格子时"触发的效果定义
 * 新增效果只需在此文件添加一个 EffectHandler 并注册到 FX
 * 
 * 对接指南（给后续开发者）：
 * 1. 复制一个现有的 EffectHandler 模板
 * 2. 修改 id / triggers / priority / condition / execute
 * 3. 在 execute 中通过 ctx 读取/修改游戏状态
 * 4. 调用 FX.register(handler) 注册
 */

import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { drawCards } from '../core/battle-core.js';

// ===== 1. 格子临时加成（怒意上涌等设置的 nextCardBonus）=====
FX.register(new EffectHandler({
    id: 'slot_bonus',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER - 10,
    condition: (ctx) => ctx.slotIndex >= 0 && ctx.state.slots[ctx.slotIndex].nextCardBonus,
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.nextCardBonus) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + slot.nextCardBonus;
            ctx.log(`${ctx.card.name} 受到怒意加持，本回合点数+${slot.nextCardBonus}`);
            slot.nextCardBonus = 0;
        }
    }
}));

// ===== 2. 征收（levy）：从牌组拉一张堆叠牌 =====
FX.register(new EffectHandler({
    id: 'levy',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 10,
    condition: (ctx) => ctx.card.keywords.includes('levy'),
    execute: (ctx) => {
        const stackIdx = ctx.state.deck.findIndex(c => c.keywords.includes('stack'));
        if (stackIdx !== -1) {
            const stackCard = ctx.state.deck.splice(stackIdx, 1)[0];
            ctx.state.slots[ctx.slotIndex].cards.push(stackCard);
            ctx.log(`${ctx.card.name} 征收效果触发，从牌组打出 ${stackCard.name}！`);
            // 征收打出的牌也触发 ON_PLAY（递归）
            const levyCtx = new ctx.constructor({
                state: ctx.state,
                trigger: Trigger.ON_PLAY,
                card: stackCard,
                slotIndex: ctx.slotIndex
            });
            FX.fire(Trigger.ON_PLAY, levyCtx);
        } else {
            ctx.log(`${ctx.card.name} 征收效果触发，但牌组中没有堆叠牌`);
        }
    }
}));

// ===== 3. 合理训练（proper_training）：同格卡牌打出时+1 =====
FX.register(new EffectHandler({
    id: 'proper_training',
    triggers: Trigger.ON_PLAY,
    priority: Priority.VALUE_BONUS - 10,
    condition: (ctx) => ctx.slotIndex >= 0,
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        for (const c of slot.cards) {
            if (c.defId === 'proper_training' && c.uuid !== ctx.card.uuid) {
                ctx.card.permanentBonus += 1;
                ctx.log(`${ctx.card.name} 受到合理训练加持，点数+1`);
            }
        }
    }
}));

// ===== 4. 生长（grow）：永久加点 =====
FX.register(new EffectHandler({
    id: 'grow',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW,
    condition: (ctx) => ctx.card.keywords.includes('grow'),
    execute: (ctx) => {
        let amount = ctx.card.growAmount || 1;
        const slot = ctx.state.slots[ctx.slotIndex];
        
        // 30小时训练：同一格生长效果触发两次
        for (const c of slot.cards) {
            if (c.defId === 'thirty_hour_training' && c.uuid !== ctx.card.uuid) {
                amount += ctx.card.growAmount || 1;
            }
        }
        // 训练激素：相邻格生长效果触发两次
        for (const s of ctx.state.slots) {
            if (Math.abs(s.index - ctx.slotIndex) === 1) {
                for (const c of s.cards) {
                    if (c.defId === 'training_hormone') {
                        amount += ctx.card.growAmount || 1;
                    }
                }
            }
        }
        
        ctx.card.permanentBonus += amount;
        ctx.log(`${ctx.card.name} 生长了！永久点数+${amount}`);
    }
}));

// ===== 5. 训练痕迹（training_trace）：点数≥3连锁打出 =====
FX.register(new EffectHandler({
    id: 'training_trace',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL - 10,
    condition: (ctx) => ctx.card.defId === 'training_trace',
    execute: (ctx) => {
        const currentVal = ctx.getCardBaseValue(ctx.card);
        if (currentVal >= 3) {
            const traces = ctx.state.deck.filter(c => c.defId === 'training_trace');
            for (const t of traces) {
                const deckIdx = ctx.state.deck.findIndex(c => c.uuid === t.uuid);
                if (deckIdx !== -1) {
                    ctx.state.deck.splice(deckIdx, 1);
                    ctx.state.slots[ctx.slotIndex].cards.push(t);
                    ctx.log(`${ctx.card.name} 触发连锁！从牌组打出 ${t.name}`);
                    
                    if (t.keywords.includes('grow')) {
                        let tAmount = t.growAmount || 1;
                        const slot = ctx.state.slots[ctx.slotIndex];
                        for (const c of slot.cards) {
                            if (c.defId === 'proper_training' && c.uuid !== t.uuid) tAmount += 1;
                            if (c.defId === 'thirty_hour_training' && c.uuid !== t.uuid) tAmount += t.growAmount || 1;
                        }
                        for (const s of ctx.state.slots) {
                            if (Math.abs(s.index - ctx.slotIndex) === 1) {
                                for (const c of s.cards) {
                                    if (c.defId === 'training_hormone') tAmount += t.growAmount || 1;
                                }
                            }
                        }
                        t.permanentBonus += tAmount;
                        ctx.log(`${t.name} 生长了！永久点数+${tAmount}`);
                    }
                    t.hasBeenPlayed = true;
                }
            }
        }
    }
}));

// ===== 6. 团结（unity）：同名牌在场+2 =====
FX.register(new EffectHandler({
    id: 'unity',
    triggers: Trigger.ON_PLAY,
    priority: Priority.VALUE_BONUS,
    condition: (ctx) => ctx.card.keywords.includes('unity'),
    execute: (ctx) => {
        const boardCards = ctx.getBoardCards();
        const hasSameName = boardCards.some(c => c.uuid !== ctx.card.uuid && c.defId === ctx.card.defId);
        if (hasSameName) {
            ctx.card.permanentBonus += 2;
            ctx.log(`${ctx.card.name} 团结效果触发！点数+2`);
        }
    }
}));

// ===== 7. 奉献（dedicate）：给左侧相邻格牌加自身一半点数 =====
FX.register(new EffectHandler({
    id: 'dedicate',
    triggers: Trigger.ON_PLAY,
    priority: Priority.VALUE_BONUS + 10,
    condition: (ctx) => ctx.card.keywords.includes('dedicate') && ctx.slotIndex > 0,
    execute: (ctx) => {
        const leftSlot = ctx.state.slots[ctx.slotIndex - 1];
        if (leftSlot && leftSlot.cards.length > 0) {
            const val = ctx.getCardBaseValue(ctx.card);
            const bonus = Math.floor(val / 2);
            if (bonus > 0) {
                const target = leftSlot.cards[leftSlot.cards.length - 1];
                target.permanentBonus += bonus;
                ctx.log(`${ctx.card.name} 奉献了 ${bonus} 点给 ${target.name}！`);
            }
        }
    }
}));

// ===== 8. 叠叠乐（stackjoy）：叠放超3张+3 =====
FX.register(new EffectHandler({
    id: 'stackjoy',
    triggers: Trigger.ON_PLAY,
    priority: Priority.VALUE_BONUS + 20,
    condition: (ctx) => ctx.card.keywords.includes('stackjoy'),
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        if (slot.cards.length > 3) {
            ctx.card.permanentBonus += 3;
            ctx.log(`${ctx.card.name} 叠叠乐触发！叠放超过3张，点数+3`);
        }
    }
}));

// ===== 9. 吞噬（devour）：清空两侧，吸收数值 =====
FX.register(new EffectHandler({
    id: 'devour',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL,
    condition: (ctx) => ctx.card.keywords.includes('devour'),
    execute: (ctx) => {
        const leftSlot = ctx.slotIndex > 0 ? ctx.state.slots[ctx.slotIndex - 1] : null;
        const rightSlot = ctx.slotIndex < ctx.state.slots.length - 1 ? ctx.state.slots[ctx.slotIndex + 1] : null;
        let absorbed = 0;

        const getFinal = (c) => c.baseValue + c.permanentBonus + (c.tempBonus || 0);

        if (leftSlot && leftSlot.cards.length > 0) {
            for (const c of leftSlot.cards) {
                FX.fire(Trigger.ON_EXIT, new ctx.constructor({
                    state: ctx.state, trigger: Trigger.ON_EXIT, card: c, slotIndex: leftSlot.index
                }));
                absorbed += getFinal(c);
            }
            leftSlot.cards = [];
            leftSlot.locked = false;
            leftSlot.isStacking = false;
        }
        if (rightSlot && rightSlot.cards.length > 0) {
            for (const c of rightSlot.cards) {
                FX.fire(Trigger.ON_EXIT, new ctx.constructor({
                    state: ctx.state, trigger: Trigger.ON_EXIT, card: c, slotIndex: rightSlot.index
                }));
                absorbed += getFinal(c);
            }
            rightSlot.cards = [];
            rightSlot.locked = false;
            rightSlot.isStacking = false;
        }
        if (absorbed > 0) {
            ctx.card.permanentBonus += absorbed;
            ctx.log(`${ctx.card.name} 吞噬了两侧，吸收了 ${absorbed} 点数值！`);
        }
    }
}));

// ===== 10. 保养装备（maintain_gear）：格子倍率+1 =====
FX.register(new EffectHandler({
    id: 'maintain_gear',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'maintain_gear',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.multiplier += 1;
        ctx.log(`保养装备提升了第${ctx.slotIndex + 1}格倍率至 ${slot.multiplier}X`);
    }
}));

// ===== 11. 炫耀肌肉（show_muscle）：伟力触发时相邻牌永久+1 =====
FX.register(new EffectHandler({
    id: 'show_muscle',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'show_muscle',
    execute: (ctx) => {
        const boardCards = ctx.getBoardCards();
        const myEff = ctx.getCardBaseValue(ctx.card);
        let hasLarger = false;
        for (const bc of boardCards) {
            if (bc.uuid === ctx.card.uuid) continue;
            const bcEff = bc.baseValue + bc.permanentBonus + (bc.tempBonus || 0);
            if (bcEff > myEff) {
                hasLarger = true;
                break;
            }
        }
        if (!hasLarger) {
            for (const s of ctx.state.slots) {
                if (Math.abs(s.index - ctx.slotIndex) === 1 && s.cards.length > 0) {
                    const target = s.cards[s.cards.length - 1];
                    target.permanentBonus += 1;
                    ctx.log(`${ctx.card.name} 伟力触发！${target.name} 永久+1`);
                }
            }
        }
    }
}));

// ===== 12. 理清头绪（clear_mind）：抽两张牌，左侧卡牌-1 =====
FX.register(new EffectHandler({
    id: 'clear_mind',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW,
    condition: (ctx) => ctx.card.defId === 'clear_mind',
    execute: (ctx) => {
        drawCards(ctx.state, 2);
        const leftSlot = ctx.slotIndex > 0 ? ctx.state.slots[ctx.slotIndex - 1] : null;
        if (leftSlot && leftSlot.cards.length > 0) {
            const target = leftSlot.cards[leftSlot.cards.length - 1];
            target.permanentBonus -= 1;
            ctx.log(`${ctx.card.name} 理清头绪！左侧 ${target.name} 点数-1`);
        }
    }
}));

// ===== 13. 忆往昔（recall_past）：从弃牌堆拿回一张卡牌 =====
FX.register(new EffectHandler({
    id: 'recall_past',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW + 10,
    condition: (ctx) => ctx.card.defId === 'recall_past',
    execute: (ctx) => {
        if (ctx.state.discard.length > 0) {
            const recalled = ctx.state.discard.splice(Math.floor(Math.random() * ctx.state.discard.length), 1)[0];
            ctx.state.hand.push(recalled);
            ctx.log(`${ctx.card.name} 回忆往昔，从弃牌堆拿回 ${recalled.name}`);
        } else {
            ctx.log(`${ctx.card.name} 回忆往昔，但弃牌堆为空`);
        }
    }
}));

// ===== 14. 怒意上涌（surging_anger）：设置下一张同格加成+5 =====
FX.register(new EffectHandler({
    id: 'surging_anger',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 20,
    condition: (ctx) => ctx.card.defId === 'surging_anger',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.nextCardBonus = (slot.nextCardBonus || 0) + 5;
        ctx.log(`${ctx.card.name} 怒意上涌！下一张同格卡牌+5`);
    }
}));

// ===== 15. 灵动（agile）：不锁定，直接进入弃牌堆 =====
FX.register(new EffectHandler({
    id: 'agile',
    triggers: Trigger.ON_PLAY,
    priority: Priority.CLEANUP,
    condition: (ctx) => ctx.card.keywords.includes('agile'),
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        const idx = slot.cards.indexOf(ctx.card);
        if (idx !== -1) slot.cards.splice(idx, 1);
        
        FX.fire(Trigger.ON_EXIT, new ctx.constructor({
            state: ctx.state, trigger: Trigger.ON_EXIT, card: ctx.card, slotIndex: ctx.slotIndex
        }));
        
        if (ctx.card.reuse) {
            ctx.state.deck.push(ctx.card);
            ctx.log(`${ctx.card.name} 复用效果触发，回到牌组`);
        } else {
            ctx.state.discard.push(ctx.card);
        }
        ctx.log(`${ctx.card.name} 灵动效果触发，进入弃牌堆`);
    }
}));
