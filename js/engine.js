/**
 * 卡牌地下城 - 核心游戏引擎
 */

function generateUUID() {
    return 'c_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

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
        hasBeenPlayed: false
    };
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

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function createInitialState() {
    const cls = CLASS_DEFS.soldier;
    const deck = shuffleArray(createDeck(cls));
    const monster = MONSTER_DEFS.lone_rat;

    const slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
        let mul = 1;
        if (cls.relic.effect.type === 'slot_multiplier' && cls.relic.effect.slotIndex === i) {
            mul += cls.relic.effect.bonus;
        }
        slots.push({
            index: i,
            multiplier: mul,
            baseMultiplier: mul,
            cards: [],
            locked: false,
            isStacking: false
        });
    }

    return {
        phase: 'playing', // playing, animating, resolving, ended
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
            color: monster.color,
            eyeColor: monster.eyeColor,
            virusPenalty: 0 // 病毒之源累计惩罚
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
        combatLog: []
    };
}

// 获取卡牌在考虑永久成长后的基础值
function getCardBaseValue(card) {
    return card.baseValue + card.permanentBonus;
}

// 构建卡牌到格子的映射（避免使用临时属性覆盖）
function buildCardSlotMap(state) {
    const map = new Map();
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            map.set(card.uuid, slot.index);
        }
    }
    return map;
}

// 获取卡牌在考虑光环后的有效点数
function getCardEffectiveValue(card, boardCards, cardSlotMap) {
    const slotIndex = cardSlotMap.get(card.uuid);
    let val = getCardBaseValue(card);
    // 驻场光环加成
    for (const bc of boardCards) {
        if (bc.uuid === card.uuid) continue;
        if (bc.keywords.includes('field')) {
            // 佯攻：临近卡牌+2
            if (bc.defId === 'feint') {
                const bcSlot = cardSlotMap.get(bc.uuid);
                if (bcSlot !== undefined && Math.abs(bcSlot - slotIndex) === 1) {
                    val += 2;
                }
            }
        }
    }
    return val;
}

// 获取卡牌在考虑伟力后的最终点数（不含倍率）
function getCardFinalValue(card, boardCards, cardSlotMap) {
    let val = getCardEffectiveValue(card, boardCards, cardSlotMap);
    // 伟力
    if (card.keywords.includes('mighty')) {
        const myEff = getCardEffectiveValue(card, boardCards, cardSlotMap);
        let hasLarger = false;
        for (const bc of boardCards) {
            if (bc.uuid === card.uuid) continue;
            const bcEff = getCardEffectiveValue(bc, boardCards, cardSlotMap);
            if (bcEff > myEff) {
                hasLarger = true;
                break;
            }
        }
        if (!hasLarger) {
            val *= 2;
        }
    }
    return val;
}

// 计算单张卡牌在某个格子上的产出
function calculateCardOutput(card, slot, state) {
    const boardCards = state.slots.flatMap(s => s.cards);
    const cardSlotMap = buildCardSlotMap(state);
    const val = getCardFinalValue(card, boardCards, cardSlotMap);
    return val * slot.multiplier;
}

// 计算整个牌桌当前总伤害
function calculateTotalBoardDamage(state) {
    let total = 0;
    const cardSlotMap = buildCardSlotMap(state);
    const boardCards = state.slots.flatMap(s => s.cards);
    for (const slot of state.slots) {
        for (const card of slot.cards) {
            const val = getCardFinalValue(card, boardCards, cardSlotMap);
            total += val * slot.multiplier;
        }
    }
    return total;
}

// 检查是否可以放置卡牌到某个格子
function canPlaceCard(card, slot, state) {
    if (card.size > 1) {
        return { ok: false, reason: '多格卡暂未实现' };
    }
    if (slot.cards.length === 0) {
        return { ok: true };
    }
    // 格子已有卡，只有顶层卡带堆叠时才允许继续放置
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

    // 从手牌移除
    const handIdx = state.hand.findIndex(c => c.uuid === card.uuid);
    if (handIdx === -1) return false;
    state.hand.splice(handIdx, 1);

    // 放置到格子
    slot.cards.push(card);

    // 处理保养装备效果：倍率格+1
    if (card.defId === 'maintain_gear') {
        slot.multiplier += 1;
        logCombat(state, `保养装备提升了第${slotIndex + 1}格倍率至 ${slot.multiplier}X`);
    }

    // 处理吞噬
    if (card.keywords.includes('devour')) {
        processDevour(card, slotIndex, state);
    }

    // 处理吸收
    if (card.keywords.includes('absorb')) {
        processAbsorb(card, slotIndex, state);
    }

    // 处理生长
    if (card.keywords.includes('grow')) {
        card.permanentBonus += 1;
        logCombat(state, `${card.name} 生长了！永久点数+1`);
    }

    // 灵动：效果结算后立即进入弃牌堆，不留在格子上
    if (card.keywords.includes('agile')) {
        const idx = slot.cards.indexOf(card);
        if (idx !== -1) slot.cards.splice(idx, 1);
        state.discard.push(card);
        logCombat(state, `${card.name} 灵动效果触发，进入弃牌堆`);
    }

    card.hasBeenPlayed = true;

    // 添加格子闪烁动画
    state.slotFlashes.push({ slotIndex, timer: 20 });
    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();

    return true;
}

function processDevour(card, slotIndex, state) {
    const leftSlot = slotIndex > 0 ? state.slots[slotIndex - 1] : null;
    const rightSlot = slotIndex < state.slots.length - 1 ? state.slots[slotIndex + 1] : null;
    let absorbed = 0;
    const cardSlotMap = buildCardSlotMap(state);
    const boardCards = state.slots.flatMap(s => s.cards);

    if (leftSlot && leftSlot.cards.length > 0) {
        for (const c of leftSlot.cards) {
            if (c.keywords.includes('exit')) {
                logCombat(state, `${c.name} 触发离场效果！`);
            }
            absorbed += getCardFinalValue(c, boardCards, cardSlotMap);
        }
        leftSlot.cards = [];
        leftSlot.locked = false;
        leftSlot.isStacking = false;
    }

    if (rightSlot && rightSlot.cards.length > 0) {
        for (const c of rightSlot.cards) {
            if (c.keywords.includes('exit')) {
                logCombat(state, `${c.name} 触发离场效果！`);
            }
            absorbed += getCardFinalValue(c, boardCards, cardSlotMap);
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
            gained += getCardFinalValue(c, boardCards, cardSlotMap);
        }
    }
    if (rightSlot && rightSlot.cards.length > 0) {
        for (const c of rightSlot.cards) {
            gained += getCardFinalValue(c, boardCards, cardSlotMap);
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
    if (typeof GameAudio !== 'undefined') GameAudio.playHeartLoss();
    logCombat(state, `失去 ${heartLoss} 颗心！剩余 ${state.player.hearts} 颗`);

    // 病毒之源：下次多扣
    state.monster.virusPenalty += 1;

    if (state.player.hearts <= 0) {
        state.phase = 'ended';
        state.result = 'lose';
        return;
    }

    // 清理牌桌（留场牌保留）
    for (const slot of state.slots) {
        const remaining = [];
        for (const card of slot.cards) {
            if (card.keywords.includes('remain')) {
                remaining.push(card);
            } else {
                state.discard.push(card);
            }
        }
        slot.cards = remaining;
        slot.locked = remaining.length > 0 && !remaining[remaining.length - 1].keywords.includes('stack');
        slot.isStacking = remaining.length > 0 && remaining[remaining.length - 1].keywords.includes('stack');
    }

    // 抽牌到5张
    drawCards(state, 5 - state.hand.length);
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

function startBattle() {
    const state = createInitialState();
    drawCards(state, 5);
    return state;
}

function resetBattle() {
    return startBattle();
}

// 获取某张牌放置到某格的预览信息
function getPlacementPreview(card, slotIndex, state) {
    const slot = state.slots[slotIndex];
    const check = canPlaceCard(card, slot, state);
    if (!check.ok) return null;

    // 模拟放置计算伤害
    const tempSlot = {
        ...slot,
        cards: [...slot.cards, card],
        multiplier: slot.multiplier + (card.defId === 'maintain_gear' ? 1 : 0)
    };
    const tempState = {
        ...state,
        slots: state.slots.map((s, i) => i === slotIndex ? tempSlot : s)
    };

    const cardSlotMap = buildCardSlotMap(tempState);
    const boardCards = tempState.slots.flatMap(s => s.cards);
    const val = getCardFinalValue(card, boardCards, cardSlotMap);
    const output = val * tempSlot.multiplier;
    const total = calculateTotalBoardDamage(tempState);

    return {
        cardOutput: output,
        totalDamage: total,
        monsterRemaining: Math.max(0, state.monster.hp - total),
        willKill: total >= state.monster.hp,
        slotMultiplier: tempSlot.multiplier
    };
}
