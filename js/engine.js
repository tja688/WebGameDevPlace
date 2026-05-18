/**
 * 卡牌地下城 - 核心游戏引擎
 */

// ========== 工具函数 ==========
function generateUUID() {
    return 'c_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getAvailableSlotIndices(totalSlots, unlockedCount) {
    const center = Math.floor(totalSlots / 2);
    const half = Math.floor(unlockedCount / 2);
    const start = center - half;
    const end = start + unlockedCount - 1;
    const indices = [];
    for (let i = start; i <= end; i++) {
        if (i >= 0 && i < totalSlots) indices.push(i);
    }
    return indices;
}

// ========== 卡牌实例 ==========
function createCardInstance(defId) {
    const def = CARD_DEFS[defId];
    if (!def) return null;
    return {
        uuid: generateUUID(),
        defId: defId,
        baseValue: def.baseValue,
        permanentBonus: 0,
        currentValue: def.baseValue,
        size: def.size,
        keywords: [...def.keywords],
        description: def.description,
        name: def.name,
        color: def.color,
        accentColor: def.accentColor,
        iconType: def.iconType,
        hasBeenPlayed: false,
        growAmount: def.growAmount || 1,
        reuse: false
    };
}

function getSlotEffectiveMultiplier(slot, state) {
    let mul = slot.multiplier;
    for (const s of state.slots) {
        if (Math.abs(s.index - slot.index) === 1) {
            for (const c of s.cards) {
                if (c.defId === 'perfect_state') {
                    mul += 1;
                }
            }
        }
    }
    return mul;
}

function countTrainingCards(state) {
    const allCards = [
        ...state.deck,
        ...state.hand,
        ...state.discard,
        ...state.slots.flatMap(s => s.cards)
    ];
    return allCards.filter(c => c.name.includes('训练')).length;
}

function processExitEffect(card, slotIndex, state) {
    if (!card.keywords.includes('exit')) return;
    logCombat(state, `${card.name} 触发离场效果！`);
    if (card.defId === 're_training') {
        for (const s of state.slots) {
            if (Math.abs(s.index - slotIndex) === 1 && s.cards.length > 0) {
                const target = s.cards[s.cards.length - 1];
                if (target.keywords.includes('grow')) {
                    target.reuse = true;
                    logCombat(state, `${target.name} 获得复用！`);
                }
            }
        }
    }
    if (card.defId === 'extra_training') {
        for (const s of state.slots) {
            if (Math.abs(s.index - slotIndex) === 1 && s.cards.length > 0) {
                const target = s.cards[s.cards.length - 1];
                if (target.keywords.includes('grow') && !target.keywords.includes('remain')) {
                    target.keywords.push('remain');
                    logCombat(state, `${target.name} 获得留场！`);
                }
            }
        }
    }
}

function createDeck(classDef) {
    const deck = [];
    for (const entry of classDef.startingDeck) {
        for (let i = 0; i < entry.count; i++) {
            deck.push(createCardInstance(entry.defId));
        }
    }
    return deck;
}

// ========== 全局进度管理 (Run Data) ==========
function createRunData(classId) {
    const cls = CLASS_DEFS[classId];
    return {
        act: 1,
        stageIndex: 0,
        souls: 0,
        heartsLostInStage: 0,
        deck: shuffleArray(createDeck(cls)),
        relics: [cls.relic],
        slotCount: SLOT_COUNT, // 总格数 5
        unlockedSlots: MAX_UNLOCKED_SLOTS, // 可用格数 3
        classId: classId,
        completedStages: [],
        shopStock: null,
        blacksmithSlotCosts: [2, 3, 4], // 每个可用格子的强化费用，按顺序对应可用格
        pendingPostBattle: null,
        pendingSoulsGained: 0,
        firstUpgradeDiscount: true,
        firstBlacksmithRefreshFree: true
    };
}

function getCurrentStageKey(runData) {
    return `${runData.act}-${runData.stageIndex + 1}`;
}

function getStageConfig(runData) {
    return STAGE_CONFIG[getCurrentStageKey(runData)];
}

function isRunComplete(runData) {
    return runData.stageIndex >= 8;
}

// ========== 游戏状态机 ==========
function createGameState(screen) {
    return {
        screen: screen || 'title',
        animTime: 0,
        message: null,
        messageTimer: 0,
        data: {}
    };
}

function switchScreen(state, newScreen, data) {
    state.screen = newScreen;
    state.data = data || {};
    state.message = null;
    state.messageTimer = 0;
}

// ========== 战斗系统 ==========
function initBattleFromRun(runData) {
    const cls = CLASS_DEFS[runData.classId];
    const stageKey = getCurrentStageKey(runData);
    const config = STAGE_CONFIG[stageKey];
    const monsterDefId = pickRandom(config.monsterPool);
    const monsterDef = MONSTER_DEFS[monsterDefId];

    const availableIndices = getAvailableSlotIndices(runData.slotCount, runData.unlockedSlots);

    const slots = [];
    for (let i = 0; i < runData.slotCount; i++) {
        const isAvailable = availableIndices.includes(i);
        let mul = isAvailable ? 1 : 0;
        // 中间格（索引2）遗物加成
        if (isAvailable && cls.relic.effect.type === 'slot_multiplier' && cls.relic.effect.slotIndex === i) {
            mul += cls.relic.effect.bonus;
        }
        slots.push({
            index: i,
            multiplier: mul,
            baseMultiplier: mul,
            cards: [],
            locked: false,
            isStacking: false,
            available: isAvailable,
            nextCardBonus: 0
        });
    }

    const deck = [...runData.deck];
    shuffleArray(deck);

    const state = {
        screen: 'battle',
        phase: 'playing',
        player: {
            name: cls.name,
            maxHearts: cls.hearts,
            hearts: cls.hearts,
            relic: cls.relic
        },
        monster: {
            name: monsterDef.name,
            maxHp: monsterDef.hp,
            hp: monsterDef.hp,
            description: monsterDef.description,
            keywords: [...monsterDef.keywords],
            keywordDesc: monsterDef.keywordDesc,
            theme: monsterDef.theme,
            type: monsterDef.type,
            virusPenalty: 0
        },
        slots: slots,
        deck: deck,
        hand: [],
        discard: [],
        turn: 1,
        turnDamage: 0,
        totalDamage: 0,
        selectedCard: null,
        hoveredSlot: null,
        draggedCard: null,
        dragX: 0,
        dragY: 0,
        animatingCards: [],
        slotFlashes: [],
        monsterFlash: 0,
        message: null,
        messageTimer: 0,
        combatLog: [],
        runDataRef: runData,
        stageKey: stageKey,
        heartsLost: 0
    };

    drawCards(state, 4);
    return state;
}

// 获取卡牌在考虑永久成长后的基础值
function getCardBaseValue(card) {
    return card.baseValue + card.permanentBonus;
}

// 构建卡牌到格子的映射
function buildCardSlotMap(state) {
    const map = new Map();
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            map.set(card.uuid, slot.index);
        }
    }
    return map;
}

// 获取硬质皮肤惩罚
function getHardSkinPenalty(card, slotIndex, state) {
    if (!state.monster.keywords.includes('hard_skin')) return 0;
    const availableSlots = state.slots.filter(s => s.available);
    if (availableSlots.length === 0) return 0;
    const leftmost = availableSlots[0].index;
    const rightmost = availableSlots[availableSlots.length - 1].index;
    if (slotIndex === leftmost || slotIndex === rightmost) return 1;
    return 0;
}

// 获取卡牌在考虑光环后的有效点数（不含硬质皮肤）
function getCardEffectiveValue(card, boardCards, cardSlotMap, state) {
    const slotIndex = cardSlotMap.get(card.uuid);
    let val = getCardBaseValue(card);

    for (const bc of boardCards) {
        if (bc.uuid === card.uuid) continue;
        if (bc.keywords.includes('field')) {
            const bcSlot = cardSlotMap.get(bc.uuid);
            if (bcSlot === undefined) continue;
            const dist = Math.abs(bcSlot - slotIndex);
            if (bc.defId === 'feint' && dist === 1) {
                val += 2;
            }
            if (bc.defId === 'hone_skill' && dist === 1 && card.keywords.includes('grow')) {
                val += 4;
            }
            if (bc.defId === 'training_program' && dist === 1 && card.keywords.includes('grow')) {
                val += countTrainingCards(state);
            }
        }
    }
    return val;
}

// 获取卡牌在考虑伟力和硬质皮肤后的最终点数
function getCardFinalValue(card, boardCards, cardSlotMap, state) {
    let val = getCardEffectiveValue(card, boardCards, cardSlotMap, state);
    if (card.keywords.includes('mighty')) {
        const myEff = getCardEffectiveValue(card, boardCards, cardSlotMap, state);
        let hasLarger = false;
        for (const bc of boardCards) {
            if (bc.uuid === card.uuid) continue;
            const bcEff = getCardEffectiveValue(bc, boardCards, cardSlotMap, state);
            if (bcEff > myEff) {
                hasLarger = true;
                break;
            }
        }
        if (!hasLarger) {
            val *= 2;
        }
    }
    // 硬质皮肤在伟力之后生效
    if (state && cardSlotMap) {
        const slotIndex = cardSlotMap.get(card.uuid);
        if (slotIndex !== undefined) {
            val -= getHardSkinPenalty(card, slotIndex, state);
            val = Math.max(0, val);
        }
    }
    return val;
}

// 计算单张卡牌在某个格子上的产出
function calculateCardOutput(card, slot, state) {
    const boardCards = state.slots.flatMap(s => s.cards);
    const cardSlotMap = buildCardSlotMap(state);
    const val = getCardFinalValue(card, boardCards, cardSlotMap, state);
    return val * getSlotEffectiveMultiplier(slot, state);
}

// 计算整个牌桌当前总伤害
function calculateTotalBoardDamage(state) {
    let total = 0;
    const cardSlotMap = buildCardSlotMap(state);
    const boardCards = state.slots.flatMap(s => s.cards);
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            const val = getCardFinalValue(card, boardCards, cardSlotMap, state);
            total += val * getSlotEffectiveMultiplier(slot, state);
        }
    }
    return total;
}

// 检查是否可以放置卡牌到某个格子
function canPlaceCard(card, slot, state) {
    if (!slot.available) {
        return { ok: false, reason: '该格子尚未解锁' };
    }
    if (card.size > 1) {
        return { ok: false, reason: '多格卡暂未实现' };
    }
    if (slot.cards.length === 0) {
        return { ok: true };
    }
    const topCard = slot.cards[slot.cards.length - 1];
    if (topCard.keywords.includes('stack')) {
        return { ok: true };
    }
    return { ok: false, reason: '该格子已被锁定' };
}

// 打出卡牌到格子
function playCardToSlot(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    const check = canPlaceCard(card, slot, state);
    if (!check.ok) {
        logCombat(state, `无法放置: ${check.reason}`);
        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
        return false;
    }

    const handIdx = state.hand.findIndex(c => c.uuid === card.uuid);
    if (handIdx === -1) return false;
    state.hand.splice(handIdx, 1);
    slot.cards.push(card);

    // 应用格子的 nextCardBonus（怒意上涌等）
    if (slot.nextCardBonus) {
        card.permanentBonus += slot.nextCardBonus;
        logCombat(state, `${card.name} 受到怒意加持，点数+${slot.nextCardBonus}`);
        slot.nextCardBonus = 0;
    }

    // ========== 打出时词条结算（按优先级） ==========

    // 1. 征收：从牌组拉一张堆叠牌到同格
    if (card.keywords.includes('levy')) {
        processLevy(card, slotIndex, state);
    }

    // 2. 合理训练：同格卡牌打出时+1（无论是否有生长）
    for (const c of slot.cards) {
        if (c.defId === 'proper_training' && c.uuid !== card.uuid) {
            card.permanentBonus += 1;
            logCombat(state, `${card.name} 受到合理训练加持，点数+1`);
        }
    }

    // 3. 生长
    if (card.keywords.includes('grow')) {
        let amount = card.growAmount || 1;
        // 30小时训练：同一格生长效果触发两次
        for (const c of slot.cards) {
            if (c.defId === 'thirty_hour_training' && c.uuid !== card.uuid) {
                amount += card.growAmount || 1;
            }
        }
        // 训练激素：相邻格生长效果触发两次
        for (const s of state.slots) {
            if (Math.abs(s.index - slotIndex) === 1) {
                for (const c of s.cards) {
                    if (c.defId === 'training_hormone') {
                        amount += card.growAmount || 1;
                    }
                }
            }
        }
        card.permanentBonus += amount;
        logCombat(state, `${card.name} 生长了！永久点数+${amount}`);
    }

    // 3. 训练痕迹：点数达到3时连锁打出
    if (card.defId === 'training_trace') {
        const currentVal = getCardBaseValue(card);
        if (currentVal >= 3) {
            const traces = state.deck.filter(c => c.defId === 'training_trace');
            for (const t of traces) {
                const deckIdx = state.deck.findIndex(c => c.uuid === t.uuid);
                if (deckIdx !== -1) {
                    state.deck.splice(deckIdx, 1);
                    slot.cards.push(t);
                    logCombat(state, `${card.name} 触发连锁！从牌组打出 ${t.name}`);
                    if (t.keywords.includes('grow')) {
                        let tAmount = t.growAmount || 1;
                        for (const c of slot.cards) {
                            if (c.defId === 'proper_training' && c.uuid !== t.uuid) {
                                tAmount += 1;
                            }
                        }
                        for (const c of slot.cards) {
                            if (c.defId === 'thirty_hour_training' && c.uuid !== t.uuid) {
                                tAmount += t.growAmount || 1;
                            }
                        }
                        for (const s of state.slots) {
                            if (Math.abs(s.index - slotIndex) === 1) {
                                for (const c of s.cards) {
                                    if (c.defId === 'training_hormone') {
                                        tAmount += t.growAmount || 1;
                                    }
                                }
                            }
                        }
                        t.permanentBonus += tAmount;
                        logCombat(state, `${t.name} 生长了！永久点数+${tAmount}`);
                    }
                    t.hasBeenPlayed = true;
                }
            }
        }
    }

    // 4. 团结：检查同名牌
    if (card.keywords.includes('unity')) {
        processUnity(card, slotIndex, state);
    }

    // 5. 奉献：给左侧相邻格牌加点数
    if (card.keywords.includes('dedicate')) {
        processDedicate(card, slotIndex, state);
    }

    // 6. 叠叠乐：检查叠放数量
    if (card.keywords.includes('stackjoy')) {
        processStackJoy(card, slotIndex, state);
    }

    // 7. 吞噬：吃掉左右格
    if (card.keywords.includes('devour')) {
        processDevour(card, slotIndex, state);
    }

    // 8. 吸收：获得两侧数值
    if (card.keywords.includes('absorb')) {
        processAbsorb(card, slotIndex, state);
    }

    // 9. 保养装备特殊处理
    if (card.defId === 'maintain_gear') {
        slot.multiplier += 1;
        logCombat(state, `保养装备提升了第${slotIndex + 1}格倍率至 ${slot.multiplier}X`);
    }

    // 10. 炫耀肌肉：伟力触发时，相邻卡牌永久+1
    if (card.defId === 'show_muscle') {
        const boardCards = state.slots.flatMap(s => s.cards);
        const cardSlotMap = buildCardSlotMap(state);
        const myEff = getCardEffectiveValue(card, boardCards, cardSlotMap, state);
        let hasLarger = false;
        for (const bc of boardCards) {
            if (bc.uuid === card.uuid) continue;
            const bcEff = getCardEffectiveValue(bc, boardCards, cardSlotMap, state);
            if (bcEff > myEff) {
                hasLarger = true;
                break;
            }
        }
        if (!hasLarger) {
            for (const s of state.slots) {
                if (Math.abs(s.index - slotIndex) === 1 && s.cards.length > 0) {
                    const target = s.cards[s.cards.length - 1];
                    target.permanentBonus += 1;
                    logCombat(state, `${card.name} 伟力触发！${target.name} 永久+1`);
                }
            }
        }
    }

    // 11. 理清头绪：抽两张牌，左侧卡牌-1
    if (card.defId === 'clear_mind') {
        drawCards(state, 2);
        const leftSlot = slotIndex > 0 ? state.slots[slotIndex - 1] : null;
        if (leftSlot && leftSlot.cards.length > 0) {
            const target = leftSlot.cards[leftSlot.cards.length - 1];
            target.permanentBonus -= 1;
            logCombat(state, `${card.name} 理清头绪！左侧 ${target.name} 点数-1`);
        }
    }

    // 12. 忆往昔：从弃牌堆拿回一张卡牌
    if (card.defId === 'recall_past') {
        if (state.discard.length > 0) {
            const recalled = state.discard.splice(Math.floor(Math.random() * state.discard.length), 1)[0];
            state.hand.push(recalled);
            logCombat(state, `${card.name} 回忆往昔，从弃牌堆拿回 ${recalled.name}`);
        } else {
            logCombat(state, `${card.name} 回忆往昔，但弃牌堆为空`);
        }
    }

    // 13. 怒意上涌：设置下一张卡加成
    if (card.defId === 'surging_anger') {
        slot.nextCardBonus = (slot.nextCardBonus || 0) + 5;
        logCombat(state, `${card.name} 怒意上涌！下一张同格卡牌+5`);
    }

    // 14. 灵动：不锁定，进入弃牌堆
    if (card.keywords.includes('agile')) {
        const idx = slot.cards.indexOf(card);
        if (idx !== -1) slot.cards.splice(idx, 1);
        processExitEffect(card, slotIndex, state);
        if (card.reuse) {
            state.deck.push(card);
            logCombat(state, `${card.name} 复用效果触发，回到牌组`);
        } else {
            state.discard.push(card);
        }
        logCombat(state, `${card.name} 灵动效果触发，进入弃牌堆`);
    }

    card.hasBeenPlayed = true;
    state.slotFlashes.push({ slotIndex, timer: 20 });
    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
    return true;
}

function processLevy(card, slotIndex, state) {
    // 从牌组中找一张堆叠牌
    const stackIdx = state.deck.findIndex(c => c.keywords.includes('stack'));
    if (stackIdx !== -1) {
        const stackCard = state.deck.splice(stackIdx, 1)[0];
        state.slots[slotIndex].cards.push(stackCard);
        logCombat(state, `${card.name} 征收效果触发，从牌组打出 ${stackCard.name}！`);
        // 征收打出的牌也结算其效果
        if (stackCard.defId === 'maintain_gear') {
            state.slots[slotIndex].multiplier += 1;
            logCombat(state, `保养装备提升了第${slotIndex + 1}格倍率至 ${state.slots[slotIndex].multiplier}X`);
        }
        if (stackCard.keywords.includes('grow')) {
            stackCard.permanentBonus += 1;
            logCombat(state, `${stackCard.name} 生长了！永久点数+1`);
        }
    } else {
        logCombat(state, `${card.name} 征收效果触发，但牌组中没有堆叠牌`);
    }
}

function processDedicate(card, slotIndex, state) {
    const leftSlot = slotIndex > 0 ? state.slots[slotIndex - 1] : null;
    if (leftSlot && leftSlot.cards.length > 0) {
        const val = getCardBaseValue(card);
        const bonus = Math.floor(val / 2);
        if (bonus > 0) {
            // 给左侧格子的最上面一张牌加点数
            const target = leftSlot.cards[leftSlot.cards.length - 1];
            target.permanentBonus += bonus;
            logCombat(state, `${card.name} 奉献了 ${bonus} 点给 ${target.name}！`);
        }
    }
}

function processUnity(card, slotIndex, state) {
    const boardCards = state.slots.flatMap(s => s.cards);
    const hasSameName = boardCards.some(c => c.uuid !== card.uuid && c.defId === card.defId);
    if (hasSameName) {
        // 团结效果：当前实现为+2点数
        card.permanentBonus += 2;
        logCombat(state, `${card.name} 团结效果触发！点数+2`);
    }
}

function processStackJoy(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    if (slot.cards.length > 3) {
        // 叠叠乐效果：当前实现为+3点数
        card.permanentBonus += 3;
        logCombat(state, `${card.name} 叠叠乐触发！叠放超过3张，点数+3`);
    }
}

function processDevour(card, slotIndex, state) {
    const leftSlot = slotIndex > 0 ? state.slots[slotIndex - 1] : null;
    const rightSlot = slotIndex < state.slots.length - 1 ? state.slots[slotIndex + 1] : null;
    let absorbed = 0;
    const cardSlotMap = buildCardSlotMap(state);
    const boardCards = state.slots.flatMap(s => s.cards);

    if (leftSlot && leftSlot.cards.length > 0) {
        for (const c of leftSlot.cards) {
            processExitEffect(c, leftSlot.index, state);
            absorbed += getCardFinalValue(c, boardCards, cardSlotMap, state);
        }
        leftSlot.cards = [];
        leftSlot.locked = false;
        leftSlot.isStacking = false;
    }
    if (rightSlot && rightSlot.cards.length > 0) {
        for (const c of rightSlot.cards) {
            processExitEffect(c, rightSlot.index, state);
            absorbed += getCardFinalValue(c, boardCards, cardSlotMap, state);
        }
        rightSlot.cards = [];
        rightSlot.locked = false;
        rightSlot.isStacking = false;
    }
    if (absorbed > 0) {
        card.permanentBonus += absorbed;
        logCombat(state, `${card.name} 吞噬了两侧，吸收了 ${absorbed} 点数值！`);
    }
}

function processAbsorb(card, slotIndex, state) {
    const leftSlot = slotIndex > 0 ? state.slots[slotIndex - 1] : null;
    const rightSlot = slotIndex < state.slots.length - 1 ? state.slots[slotIndex + 1] : null;
    let gained = 0;
    const cardSlotMap = buildCardSlotMap(state);
    const boardCards = state.slots.flatMap(s => s.cards);

    if (leftSlot && leftSlot.cards.length > 0) {
        for (const c of leftSlot.cards) {
            gained += getCardFinalValue(c, boardCards, cardSlotMap, state);
        }
    }
    if (rightSlot && rightSlot.cards.length > 0) {
        for (const c of rightSlot.cards) {
            gained += getCardFinalValue(c, boardCards, cardSlotMap, state);
        }
    }
    if (gained > 0) {
        card.permanentBonus += gained;
        logCombat(state, `${card.name} 吸收了两侧 ${gained} 点数值！`);
    }
}

function logCombat(state, msg) {
    state.combatLog.push(`[T${state.turn}] ${msg}`);
    if (state.combatLog.length > 50) state.combatLog.shift();
}

// 结束回合
function endTurn(state) {
    if (state.phase !== 'playing') return;
    if (typeof GameAudio !== 'undefined') GameAudio.playEndTurn();

    // 救兵：结束回合时，若牌桌有空位，将手牌中的救兵牌自动打出到空位
    const reinforceCards = state.hand.filter(c => c.keywords.includes('reinforce'));
    for (const rCard of reinforceCards) {
        const emptySlots = state.slots.filter(s => s.available && s.cards.length === 0);
        if (emptySlots.length > 0) {
            const targetSlot = emptySlots[0];
            const handIdx = state.hand.findIndex(c => c.uuid === rCard.uuid);
            if (handIdx !== -1) {
                state.hand.splice(handIdx, 1);
                targetSlot.cards.push(rCard);
                logCombat(state, `${rCard.name} 救兵效果触发！自动打出到空位`);
                state.slotFlashes.push({ slotIndex: targetSlot.index, timer: 20 });
            }
        }
    }

    const totalDmg = calculateTotalBoardDamage(state);
    state.turnDamage = totalDmg;
    state.totalDamage += totalDmg;
    state.monster.hp = Math.max(0, state.monster.hp - totalDmg);

    if (totalDmg > 0) {
        state.monsterFlash = 15;
        if (typeof GameAudio !== 'undefined') GameAudio.playDamage();
    }

    logCombat(state, `第${state.turn}回合造成 ${totalDmg} 伤害，怪物剩余 ${state.monster.hp} HP`);

    if (state.monster.hp <= 0) {
        state.phase = 'ended';
        state.result = 'win';
        return;
    }

    // 扣心
    let heartLoss = 1 + state.monster.virusPenalty;
    state.player.hearts -= heartLoss;
    state.heartsLost += heartLoss;
    if (typeof GameAudio !== 'undefined') GameAudio.playHeartLoss();
    logCombat(state, `失去 ${heartLoss} 颗心！剩余 ${state.player.hearts} 颗`);

    state.monster.virusPenalty += 1;

    if (state.player.hearts <= 0) {
        state.phase = 'ended';
        state.result = 'lose';
        return;
    }

    // 先触发所有非留场牌的离场效果
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            if (!card.keywords.includes('remain') && card.keywords.includes('exit')) {
                processExitEffect(card, slot.index, state);
            }
        }
    }

    // 清理牌桌（留场牌保留，其他根据复用状态决定去向）
    for (const slot of state.slots) {
        const remaining = [];
        for (const card of slot.cards) {
            if (card.keywords.includes('remain')) {
                remaining.push(card);
            } else {
                if (card.reuse) {
                    state.deck.push(card);
                    logCombat(state, `${card.name} 复用效果触发，回到牌组`);
                } else {
                    state.discard.push(card);
                }
            }
        }
        slot.cards = remaining;
        slot.locked = remaining.length > 0 && !remaining[remaining.length - 1].keywords.includes('stack');
        slot.isStacking = remaining.length > 0 && remaining[remaining.length - 1].keywords.includes('stack');
        slot.nextCardBonus = 0;
    }

    drawCards(state, 4);

    // 留场牌下回合开始时获得【堆叠】
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            if (card.keywords.includes('remain') && !card.keywords.includes('stack')) {
                card.keywords.push('stack');
                logCombat(state, `${card.name} 留场效果：获得【堆叠】`);
            }
        }
    }

    state.turn++;
    state.turnDamage = 0;
}

function drawCards(state, count) {
    let drawn = 0;
    for (let i = 0; i < count; i++) {
        if (state.deck.length === 0) {
            if (state.discard.length === 0) break;
            state.deck = shuffleArray(state.discard);
            state.discard = [];
        }
        if (state.deck.length > 0) {
            state.hand.push(state.deck.pop());
            drawn++;
        }
    }
    if (drawn > 0) {
        logCombat(state, `抽了 ${drawn} 张牌`);
    }
}

// 获取某张牌放置到某格的预览信息
function getPlacementPreview(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    const check = canPlaceCard(card, slot, state);
    if (!check.ok) return null;

    // 创建临时状态来计算预览
    const tempHand = state.hand.filter(c => c.uuid !== card.uuid);
    const tempSlot = {
        ...slot,
        cards: [...slot.cards, card],
        multiplier: slot.multiplier + (card.defId === 'maintain_gear' ? 1 : 0)
    };
    const tempSlots = state.slots.map((s, i) => i === slotIndex ? tempSlot : s);

    const tempState = {
        ...state,
        hand: tempHand,
        slots: tempSlots
    };

    const cardSlotMap = buildCardSlotMap(tempState);
    const boardCards = tempState.slots.flatMap(s => s.cards);
    const val = getCardFinalValue(card, boardCards, cardSlotMap, tempState);
    const effMul = getSlotEffectiveMultiplier(tempSlot, tempState);
    const output = val * effMul;
    const total = calculateTotalBoardDamage(tempState);

    return {
        cardOutput: output,
        totalDamage: total,
        monsterRemaining: Math.max(0, state.monster.hp - total),
        willKill: total >= state.monster.hp,
        slotMultiplier: effMul
    };
}

// ========== 战后结算 ==========
function resolveBattleEnd(battleState) {
    const runData = battleState.runDataRef;
    if (!runData) {
        return { result: 'win', soulsGained: 0, postBattleType: 'act_clear', postBattleData: { reward: '测试奖励', desc: '调试模式' }, nextStage: null };
    }
    const config = STAGE_CONFIG[battleState.stageKey];

    if (battleState.result === 'win') {
        // 计算魂收益
        const soulGain = Math.max(0, config.baseSouls - battleState.heartsLost);
        runData.souls += soulGain;
        runData.heartsLostInStage = battleState.heartsLost;
        runData.completedStages.push(battleState.stageKey);

        // 同步卡组
        const allCards = [
            ...battleState.deck,
            ...battleState.hand,
            ...battleState.discard,
            ...battleState.slots.flatMap(s => s.cards)
        ];
        runData.deck = allCards;

        // 如果是普通怪，先给三选一牌，再进入战后奖励
        if (config.type === 'normal' && !runData.pendingPostBattle) {
            runData.pendingPostBattle = config.postBattle;
            runData.pendingSoulsGained = soulGain;
            return {
                result: 'win',
                soulsGained: soulGain,
                postBattleType: 'card_pick',
                postBattleData: { options: createCardRewardOptions() },
                nextStage: runData.stageIndex + 1
            };
        }

        // 清除pending（如果存在）
        const pendingType = runData.pendingPostBattle;
        const pendingSouls = runData.pendingSoulsGained;
        runData.pendingPostBattle = null;
        runData.pendingSoulsGained = 0;

        const postBattleType = pendingType || config.postBattle;
        const postBattleData = generatePostBattleData(postBattleType, runData);

        return {
            result: 'win',
            soulsGained: pendingSouls || soulGain,
            postBattleType: postBattleType,
            postBattleData: postBattleData,
            nextStage: battleState.stageKey === '1-8' ? null : runData.stageIndex + 1
        };
    } else {
        return { result: 'lose' };
    }
}

function generatePostBattleData(type, runData) {
    switch (type) {
        case 'two_events':
            return {
                options: [pickRandomEvent(), pickRandomEvent()]
            };
        case 'three_events':
            return {
                options: [pickRandomEvent(), pickRandomEvent(), pickRandomEvent()]
            };
        case 'treasure':
            return {
                relic: pickRandom(RELIC_DEFS)
            };
        case 'shop_choice':
            return {
                options: [
                    { type: 'shop', name: '牌店', icon: '🏪', desc: '购买卡牌和遗物' },
                    { type: 'blacksmith', name: '铁匠铺', icon: '🔨', desc: '强化卡牌和倍率格' },
                    { type: 'event', name: '随机事件', icon: '❓', desc: '遇到意想不到的事' }
                ]
            };
        case 'act_clear':
            return {
                reward: '拓展效率牌桌',
                desc: '倍率牌桌上限增加一格'
            };
        default:
            return {};
    }
}

function pickRandomEvent() {
    const evt = pickRandom(EVENT_NAMES);
    return { ...evt };
}

// ========== 商店/铁匠/事件占位逻辑 ==========
function getOrCreateShopStock(runData) {
    if (!runData.shopStock) {
        runData.shopStock = createShopStock();
    }
    return runData.shopStock;
}

function refreshShopStock(runData) {
    runData.shopStock = createShopStock();
}

// ========== 占位提示统一函数 ==========
function showPlaceholderToast(msg) {
    if (window.gameState) {
        window.gameState.message = msg + '（占位）';
        window.gameState.messageTimer = 120;
    }
}

// ========== 调试/测试后备函数 ==========
function createInitialState() {
    const cls = CLASS_DEFS.soldier;
    const deck = shuffleArray(createDeck(cls));
    const monster = MONSTER_DEFS.lone_rat;

    const availableIndices = getAvailableSlotIndices(SLOT_COUNT, MAX_UNLOCKED_SLOTS);

    const slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
        const isAvailable = availableIndices.includes(i);
        let mul = isAvailable ? 1 : 0;
        if (isAvailable && cls.relic.effect.type === 'slot_multiplier' && cls.relic.effect.slotIndex === i) {
            mul += cls.relic.effect.bonus;
        }
        slots.push({
            index: i,
            multiplier: mul,
            baseMultiplier: mul,
            cards: [],
            locked: false,
            isStacking: false,
            available: isAvailable,
            nextCardBonus: 0
        });
    }

    return {
        screen: 'battle',
        phase: 'playing',
        player: {
            name: cls.name,
            maxHearts: cls.hearts,
            hearts: cls.hearts,
            relic: cls.relic
        },
        monster: {
            name: monster.name,
            maxHp: monster.hp,
            hp: monster.hp,
            description: monster.description,
            keywords: [...monster.keywords],
            keywordDesc: monster.keywordDesc,
            theme: monster.theme,
            type: monster.type,
            virusPenalty: 0
        },
        slots: slots,
        deck: deck,
        hand: [],
        discard: [],
        turn: 1,
        turnDamage: 0,
        totalDamage: 0,
        selectedCard: null,
        hoveredSlot: null,
        draggedCard: null,
        dragX: 0,
        dragY: 0,
        animatingCards: [],
        slotFlashes: [],
        monsterFlash: 0,
        message: null,
        messageTimer: 0,
        combatLog: [],
        runDataRef: null,
        stageKey: 'test',
        heartsLost: 0
    };
}

function startBattle() {
    const state = createInitialState();
    drawCards(state, 4);
    return state;
}
