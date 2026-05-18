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
        slotCount: SLOT_COUNT,
        classId: classId,
        completedStages: [],
        shopStock: null, // 懒加载
        blacksmithSlotCosts: [2, 2, 2], // 每个格子的强化费用
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
        // 各屏幕专有数据挂载在 state.data 上
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

    const slots = [];
    for (let i = 0; i < runData.slotCount; i++) {
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
        // 保留runData引用用于战后结算
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

// 获取卡牌在考虑光环后的有效点数
function getCardEffectiveValue(card, boardCards, cardSlotMap) {
    const slotIndex = cardSlotMap.get(card.uuid);
    let val = getCardBaseValue(card);
    for (const bc of boardCards) {
        if (bc.uuid === card.uuid) continue;
        if (bc.keywords.includes('field')) {
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

// 获取卡牌在考虑伟力后的最终点数
function getCardFinalValue(card, boardCards, cardSlotMap) {
    let val = getCardEffectiveValue(card, boardCards, cardSlotMap);
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

    if (card.defId === 'maintain_gear') {
        slot.multiplier += 1;
        logCombat(state, `保养装备提升了第${slotIndex + 1}格倍率至 ${slot.multiplier}X`);
    }

    if (card.keywords.includes('devour')) {
        processDevour(card, slotIndex, state);
    }
    if (card.keywords.includes('absorb')) {
        processAbsorb(card, slotIndex, state);
    }
    if (card.keywords.includes('grow')) {
        card.permanentBonus += 1;
        logCombat(state, `${card.name} 生长了！永久点数+1`);
    }

    if (card.keywords.includes('agile')) {
        const idx = slot.cards.indexOf(card);
        if (idx !== -1) slot.cards.splice(idx, 1);
        state.discard.push(card);
        logCombat(state, `${card.name} 灵动效果触发，进入弃牌堆`);
    }

    card.hasBeenPlayed = true;
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
    state.heartsLost += heartLoss;
    if (typeof GameAudio !== 'undefined') GameAudio.playHeartLoss();
    logCombat(state, `失去 ${heartLoss} 颗心！剩余 ${state.player.hearts} 颗`);

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

    drawCards(state, 4);
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

// ========== 战后结算 ==========
function resolveBattleEnd(battleState) {
    const runData = battleState.runDataRef;
    if (!runData) {
        // 调试/测试模式，无 runData，直接返回胜利
        return { result: 'win', soulsGained: 0, postBattleType: 'act_clear', postBattleData: { reward: '测试奖励', desc: '调试模式' }, nextStage: null };
    }
    const config = STAGE_CONFIG[battleState.stageKey];

    if (battleState.result === 'win') {
        // 计算魂收益
        const soulGain = Math.max(0, config.baseSouls - battleState.heartsLost);
        runData.souls += soulGain;
        runData.heartsLostInStage = battleState.heartsLost;
        runData.completedStages.push(battleState.stageKey);

        // 同步卡组（战斗中的永久变化保留到runData）
        // 合并deck、hand、discard、board上的卡牌回到runData.deck
        const allCards = [
            ...battleState.deck,
            ...battleState.hand,
            ...battleState.discard,
            ...battleState.slots.flatMap(s => s.cards)
        ];
        runData.deck = allCards;

        // 准备战后数据
        const postBattleData = generatePostBattleData(config.postBattle, runData);

        return {
            result: 'win',
            soulsGained: soulGain,
            postBattleType: config.postBattle,
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
    // 创建一个独立的战斗状态（用于测试）
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
