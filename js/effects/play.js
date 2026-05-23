/**
 * 卡牌地下城 - 打出时效果 (ON_PLAY)（第二版）
 */

import { EffectHandler, FX, calculateGrowAmount } from './core.js';
import { Trigger, Priority } from '../core/constants.js';
import { drawCards } from '../core/battle-core.js';
import { CARD_DEFS } from '../data/index.js';
import { createCardInstance } from '../data/index.js';

// ===== 1. 格子加成（爱护装备、奉献等） =====
FX.register(new EffectHandler({
    id: 'slot_bonus',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER - 10,
    condition: (ctx) => ctx.slotIndex >= 0,
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        // 爱护装备等设置的 nextCardBonus
        if (slot.nextCardBonus) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + slot.nextCardBonus;
            ctx.log(`${ctx.card.name} 受到装备爱护加持，本回合点数+${slot.nextCardBonus}`);
            slot.nextCardBonus = 0;
        }
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

// ===== 2. 连携（chain）：抽一张牌 =====
FX.register(new EffectHandler({
    id: 'chain',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 20,
    condition: (ctx) => ctx.card.keywords.includes('chain'),
    execute: (ctx) => {
        drawCards(ctx.state, 1);
        ctx.log(`${ctx.card.name} 连携效果触发，抽一张牌`);
    }
}));

// ===== 3. 双生（twin）：复制加入手牌 =====
FX.register(new EffectHandler({
    id: 'twin',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 15,
    condition: (ctx) => ctx.card.keywords.includes('twin'),
    execute: (ctx) => {
        const copy = createCardInstance(ctx.card.defId);
        copy.permanentBonus = ctx.card.permanentBonus;
        copy.baseValue = ctx.card.baseValue;
        ctx.state.hand.push(copy);
        ctx.log(`${ctx.card.name} 双生效果触发，复制加入手牌`);
    }
}));

// ===== 4. 蔓延（spread）：加入扩散牌 =====
FX.register(new EffectHandler({
    id: 'spread',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW - 10,
    condition: (ctx) => ctx.card.keywords.includes('spread'),
    execute: (ctx) => {
        const diffusion = {
            uuid: 'diff_' + Math.random().toString(36).substr(2, 9),
            defId: 'diffusion',
            name: '扩散',
            baseValue: 0,
            permanentBonus: 0,
            tempBonus: 0,
            size: 1,
            keywords: [],
            description: '点数为0的扩散牌',
            color: '#888888',
            accentColor: '#aaaaaa',
            iconType: 'shadow',
            hasBeenPlayed: false,
            rarity: 'white'
        };
        ctx.state.hand.push(diffusion);
        ctx.log(`${ctx.card.name} 蔓延效果触发，加入一张扩散牌`);
    }
}));

// ===== 5. 合理训练（proper_training）：同格卡牌获得生长2 =====
FX.register(new EffectHandler({
    id: 'proper_training',
    triggers: Trigger.ON_PLAY,
    priority: Priority.VALUE_BONUS - 10,
    condition: (ctx) => ctx.card.defId === 'proper_training',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        for (const c of slot.cards) {
            if (c.uuid !== ctx.card.uuid && !c.keywords.includes('grow')) {
                c.keywords.push('grow');
                c.growAmount = 2;
                ctx.log(`${c.name} 受到合理训练加持，获得生长2！`);
            } else if (c.uuid !== ctx.card.uuid && c.keywords.includes('grow') && (c.growAmount || 1) < 2) {
                c.growAmount = 2;
                ctx.log(`${c.name} 受到合理训练加持，生长提升至2！`);
            }
        }
    }
}));

// ===== 6. 生长（grow）：永久加点 =====
FX.register(new EffectHandler({
    id: 'grow',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW,
    condition: (ctx) => ctx.card.keywords.includes('grow'),
    execute: (ctx) => {
        const amount = calculateGrowAmount(ctx.card, ctx.slotIndex, ctx.state);
        ctx.card.permanentBonus += amount;
        ctx.log(`${ctx.card.name} 生长了！永久点数+${amount}`);
        if (typeof GameAudio !== 'undefined') GameAudio.playGrow();
        if (!ctx.state.pendingGrowthEffects) ctx.state.pendingGrowthEffects = [];
        ctx.state.pendingGrowthEffects.push({ slotIndex: ctx.slotIndex });
    }
}));

// ===== 7. 训练痕迹（training_trace）：点数>3连锁打出 =====
FX.register(new EffectHandler({
    id: 'training_trace',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL - 10,
    condition: (ctx) => ctx.card.defId === 'training_trace',
    execute: (ctx) => {
        const currentVal = ctx.getCardBaseValue(ctx.card);
        if (currentVal > 3) {
            const traces = ctx.state.deck.filter(c => c.defId === 'training_trace');
            for (const t of traces) {
                const deckIdx = ctx.state.deck.findIndex(c => c.uuid === t.uuid);
                if (deckIdx !== -1) {
                    ctx.state.deck.splice(deckIdx, 1);
                    ctx.state.slots[ctx.slotIndex].cards.push(t);
                    ctx.log(`${ctx.card.name} 触发连锁！从牌组打出 ${t.name}`);
                    if (t.keywords.includes('grow')) {
                        let tAmount = calculateGrowAmount(t, ctx.slotIndex, ctx.state);
                        t.permanentBonus += tAmount;
                        ctx.log(`${t.name} 生长了！永久点数+${tAmount}`);
                    }
                    t.hasBeenPlayed = true;
                }
            }
        }
    }
}));

// ===== 8. 保养装备（maintain_gear）：格子倍率+1（单回合） =====
FX.register(new EffectHandler({
    id: 'maintain_gear',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SLOT_MODIFIER,
    condition: (ctx) => ctx.card.defId === 'maintain_gear',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.roundMultiplierBonus = (slot.roundMultiplierBonus || 0) + 1;
        ctx.log(`保养装备提升了第${ctx.slotIndex + 1}格倍率至 ${slot.multiplier + slot.roundMultiplierBonus}X（单回合）`);
    }
}));

// ===== 9. 炫耀肌肉（show_muscle）：打出时相邻两侧卡牌获得生长1 =====
FX.register(new EffectHandler({
    id: 'show_muscle_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 10,
    condition: (ctx) => ctx.card.defId === 'show_muscle',
    execute: (ctx) => {
        for (const s of ctx.state.slots) {
            if (Math.abs(s.index - ctx.slotIndex) === 1 && s.cards.length > 0) {
                const target = s.cards[s.cards.length - 1];
                if (!target.keywords.includes('grow')) {
                    target.keywords.push('grow');
                    target.growAmount = 1;
                    ctx.log(`${ctx.card.name} 让 ${target.name} 获得了生长1！`);
                }
            }
        }
    }
}));

// ===== 10. 理清头绪（clear_mind）：抽两张牌 =====
FX.register(new EffectHandler({
    id: 'clear_mind',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW,
    condition: (ctx) => ctx.card.defId === 'clear_mind',
    execute: (ctx) => {
        drawCards(ctx.state, 2);
        ctx.log(`${ctx.card.name} 理清头绪！抽两张牌`);
    }
}));

// ===== 11. 忆往昔（recall_past）：从弃牌堆选定拿回一张卡牌 =====
FX.register(new EffectHandler({
    id: 'recall_past',
    triggers: Trigger.ON_PLAY,
    priority: Priority.DRAW + 10,
    condition: (ctx) => ctx.card.defId === 'recall_past',
    execute: (ctx) => {
        if (ctx.state.discard.length > 0) {
            ctx.state.draggedCard = null;
            ctx.state.selectedCard = null;
            ctx.state.hoveredSlot = null;
            ctx.state.pendingRecall = {
                message: '请选择弃牌堆中的一张卡牌拿回手牌',
                cards: [...ctx.state.discard],
                hoverIndex: -1
            };
            ctx.log(`${ctx.card.name} 回忆往昔，等待选择弃牌堆中的卡牌...`);
        } else {
            ctx.log(`${ctx.card.name} 回忆往昔，但弃牌堆为空`);
        }
    }
}));

// ===== 12. 训练纲领（training_program）：打出时根据训练牌数量生长 =====
FX.register(new EffectHandler({
    id: 'training_program_effect',
    triggers: Trigger.ON_PLAY,
    priority: Priority.GROW - 10,
    condition: (ctx) => ctx.card.defId === 'training_program',
    execute: (ctx) => {
        const runData = ctx.state.runDataRef;
        let count = 0;
        if (runData && runData.startingDeck) {
            for (const entry of runData.startingDeck) {
                const def = CARD_DEFS[entry.defId];
                if (def && def.name && def.name.includes('训练')) {
                    count += entry.count;
                }
            }
        }
        if (count > 0) {
            ctx.card.growAmount = count;
            const amount = calculateGrowAmount(ctx.card, ctx.slotIndex, ctx.state);
            ctx.card.permanentBonus += amount;
            ctx.log(`${ctx.card.name} 训练纲领生效！检测到 ${count} 张训练牌，生长+${amount}`);
        } else {
            ctx.log(`${ctx.card.name} 训练纲领触发，但牌组中没有训练牌`);
        }
    }
}));

// ===== 13. 爱护装备（surging_anger）：设置下一张同格加成+4 =====
FX.register(new EffectHandler({
    id: 'surging_anger',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL + 20,
    condition: (ctx) => ctx.card.defId === 'surging_anger',
    execute: (ctx) => {
        const slot = ctx.state.slots[ctx.slotIndex];
        slot.nextCardBonus = (slot.nextCardBonus || 0) + 4;
        ctx.log(`${ctx.card.name} 爱护装备就绪！下一张同格卡牌+4`);
    }
}));
