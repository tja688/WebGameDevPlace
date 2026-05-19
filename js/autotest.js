/**
 * 卡牌地下城 - 自动测试与调试工具
 */

const AutoTest = {
    state: null,

    init(gameState) {
        this.state = gameState;
        this.bindDebugPanel();
    },

    bindDebugPanel() {
        document.getElementById('btn-toggle-debug').addEventListener('click', () => {
            const panel = document.getElementById('debug-panel');
            panel.classList.toggle('hidden');
        });

        document.getElementById('btn-auto-play').addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                this.autoPlayOptimal();
            } else {
                this.log('仅在战斗界面可用');
            }
        });

        document.getElementById('btn-auto-end').addEventListener('click', () => {
            if (this.state.screen === 'battle' && this.state.phase === 'playing') {
                endTurn(this.state);
                this.checkEnd();
            }
        });

        document.getElementById('btn-cheat-hand').addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                this.cheatHand();
            }
        });

        document.getElementById('btn-refill-deck').addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                while (this.state.deck.length < 5) {
                    this.state.deck.push(createCardInstance('precise_strike'));
                }
                logCombat(this.state, '调试: 牌库已补满');
                this.log('牌库已补满');
            }
        });

        document.getElementById('btn-kill-monster').addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                this.state.monster.hp = 0;
                this.state.totalDamage += 999;
                this.state.phase = 'ended';
                this.state.result = 'win';
                this.log('秒杀怪物');
                Input.checkBattleEnd();
            }
        });

        document.getElementById('btn-heal-player').addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                this.state.player.hearts = this.state.player.maxHearts;
                this.log('玩家生命回满');
            }
        });

        document.getElementById('btn-reset-battle').addEventListener('click', () => {
            restartGame();
            this.log('战斗已重置');
        });

        document.getElementById('btn-set-mul').addEventListener('click', () => {
            if (this.state.screen !== 'battle') return;
            const m0 = parseInt(document.getElementById('slot0-mul').value) || 0;
            const m1 = parseInt(document.getElementById('slot1-mul').value) || 1;
            const m2 = parseInt(document.getElementById('slot2-mul').value) || 2;
            const m3 = parseInt(document.getElementById('slot3-mul').value) || 1;
            const m4 = parseInt(document.getElementById('slot4-mul').value) || 0;
            if (this.state.slots[0]) this.state.slots[0].multiplier = m0;
            if (this.state.slots[1]) this.state.slots[1].multiplier = m1;
            if (this.state.slots[2]) this.state.slots[2].multiplier = m2;
            if (this.state.slots[3]) this.state.slots[3].multiplier = m3;
            if (this.state.slots[4]) this.state.slots[4].multiplier = m4;
            this.log(`倍率已设置: [${m0}X, ${m1}X, ${m2}X, ${m3}X, ${m4}X]`);
        });
    },

    log(msg) {
        const time = new Date().toLocaleTimeString();
        const line = `[${time}] ${msg}`;
        console.log(line);
        if (typeof document !== 'undefined') {
            const logEl = document.getElementById('debug-log');
            if (logEl) logEl.textContent = line + '\n' + logEl.textContent;
        }
    },

    autoPlayOptimal() {
        if (this.state.screen !== 'battle' || this.state.phase !== 'playing') return;

        let played = 0;
        let safety = 20;

        while (safety-- > 0) {
            const candidates = [];
            for (const card of this.state.hand) {
                for (let i = 0; i < this.state.slots.length; i++) {
                    const slot = this.state.slots[i];
                    const check = canPlaceCard(card, slot, this.state);
                    if (check.ok) {
                        const preview = getPlacementPreview(card, i, this.state);
                        if (preview) {
                            candidates.push({ card, slotIndex: i, output: preview.cardOutput, total: preview.totalDamage });
                        }
                    }
                }
            }

            if (candidates.length === 0) break;

            const killMove = candidates.find(c => c.total >= this.state.monster.hp);
            if (killMove) {
                playCardToSlot(killMove.card, killMove.slotIndex, this.state);
                played++;
                this.state.turnDamage = calculateTotalBoardDamage(this.state);
                this.log(`自动打出 ${killMove.card.name} → 格${killMove.slotIndex + 1} (击杀!)`);
                break;
            }

            candidates.sort((a, b) => b.output - a.output);
            const best = candidates[0];
            playCardToSlot(best.card, best.slotIndex, this.state);
            played++;
            this.state.turnDamage = calculateTotalBoardDamage(this.state);
            this.log(`自动打出 ${best.card.name} → 格${best.slotIndex + 1} (+${best.output})`);
        }

        if (played === 0) {
            this.log('无牌可出，自动结束回合');
            endTurn(this.state);
            this.checkEnd();
        } else {
            this.log(`自动出牌完成，共打出 ${played} 张`);
        }
    },

    cheatHand() {
        if (this.state.screen !== 'battle') return;
        const choice = prompt(
            '输入想要的手牌组合（用逗号分隔）：\n' +
            '1=精确打击, 2=佯攻, 3=保养装备\n' +
            '6=战时训练, 7=炫耀肌肉, 8=训练痕迹, 9=磨练技巧, 10=再训练\n' +
            '11=30小时训练, 12=加练！, 13=训练激素, 14=训练纲领, 15=合理训练\n' +
            '16=肌肉不会背叛你, 17=怒意上涌, 18=理清头绪, 19=忆往昔, 20=完美境界\n' +
            '例如: 1,1,3,2,6',
            '1,1,3,2,6'
        );
        if (!choice) return;

        const map = {
            '1': 'precise_strike', '2': 'feint', '3': 'maintain_gear',
            '4': 'wild_strike', '5': 'shield_bash',
            '6': 'war_training', '7': 'show_muscle', '8': 'training_trace',
            '9': 'hone_skill', '10': 're_training', '11': 'thirty_hour_training',
            '12': 'extra_training', '13': 'training_hormone', '14': 'training_program',
            '15': 'proper_training', '16': 'muscle_never_betrays', '17': 'surging_anger',
            '18': 'clear_mind', '19': 'recall_past', '20': 'perfect_state'
        };
        const ids = choice.split(',').map(s => map[s.trim()]).filter(id => id);

        for (const c of this.state.hand) {
            this.state.deck.push(c);
        }
        this.state.hand = [];

        for (const id of ids) {
            this.state.hand.push(createCardInstance(id));
        }
        this.log(`手牌已修改: ${ids.length} 张`);
    },

    runSmokeTest() {
        this.log('=== 冒烟测试开始 ===');
        const testState = createInitialState();
        drawCards(testState, 4);

        console.assert(testState.player.hearts === 3, '初始生命应为3');
        console.assert(testState.slots[2].multiplier === 2, '中间格应为2X');
        this.log('测试1 通过: 初始状态正确');

        const strike = testState.hand.find(c => c.defId === 'precise_strike');
        if (strike) {
            playCardToSlot(strike, 2, testState);
            const dmg = calculateTotalBoardDamage(testState);
            console.assert(dmg === 10, `精确打击在2X格应为10，实际${dmg}`);
            this.log('测试2 通过: 精确打击基础伤害正确');
        }

        const feint = testState.hand.find(c => c.defId === 'feint');
        if (feint) {
            playCardToSlot(feint, 1, testState);
            const strikeOnBoard = testState.slots[2].cards.find(c => c.defId === 'precise_strike');
            if (strikeOnBoard) {
                const val = getCardEffectiveValue(strikeOnBoard, testState.slots.flatMap(s => s.cards), buildCardSlotMap(testState), testState);
                console.assert(val === 7, `佯攻光环后精确打击应为7，实际${val}`);
                this.log('测试3 通过: 驻场光环正确');
            }
        }

        const strike2 = testState.hand.find(c => c.defId === 'precise_strike');
        if (strike2) {
            playCardToSlot(strike2, 3, testState);
            const val = getCardFinalValue(strike2, testState.slots.flatMap(s => s.cards), buildCardSlotMap(testState), testState);
            console.assert(val === 10, `伟力应翻倍为10，实际${val}`);
            this.log('测试4 通过: 伟力翻倍正确');
        }

        this.log('=== 冒烟测试结束 ===');
    },

    checkEnd() {
        if (this.state.screen === 'battle' && this.state.phase === 'ended') {
            Input.checkBattleEnd();
        }
    }
};

// 控制台快捷指令
window.godMode = function() {
    if (!window.gameState || window.gameState.screen !== 'battle') return;
    window.gameState.player.hearts = 99;
    window.gameState.monster.hp = 1;
    AutoTest.log('上帝模式已开启');
};

window.fullHand = function(type = 'precise_strike', count = 5) {
    if (!window.gameState || window.gameState.screen !== 'battle') return;
    for (let i = 0; i < count; i++) {
        window.gameState.hand.push(createCardInstance(type));
    }
    AutoTest.log(`添加了 ${count} 张 ${type}`);
};

window.setMonsterHp = function(hp) {
    if (!window.gameState || window.gameState.screen !== 'battle') return;
    window.gameState.monster.hp = hp;
    AutoTest.log(`怪物HP设为 ${hp}`);
};

window.testCombat = function() {
    AutoTest.runSmokeTest();
};

// 模拟多场自动战斗，统计胜率
window.simulateBattles = function(count = 100, verbose = false) {
    let wins = 0;
    let totalTurns = 0;
    for (let i = 0; i < count; i++) {
        const s = startBattle();
        let safety = 50;
        while (s.phase !== 'ended' && safety-- > 0) {
            let played = 0;
            let innerSafety = 20;
            while (innerSafety-- > 0) {
                const candidates = [];
                for (const card of s.hand) {
                    for (let si = 0; si < s.slots.length; si++) {
                        const slot = s.slots[si];
                        const check = canPlaceCard(card, slot, s);
                        if (check.ok) {
                            const preview = getPlacementPreview(card, si, s);
                            if (preview) {
                                candidates.push({ card, slotIndex: si, total: preview.totalDamage });
                            }
                        }
                    }
                }
                if (candidates.length === 0) break;
                candidates.sort((a, b) => b.total - a.total);
                const best = candidates[0];
                playCardToSlot(best.card, best.slotIndex, s);
                played++;
                if (calculateTotalBoardDamage(s) >= s.monster.hp) break;
            }
            endTurn(s);
        }
        if (s.result === 'win') wins++;
        totalTurns += s.turn;
    }
    const avgTurns = (totalTurns / count).toFixed(2);
    const msg = `模拟 ${count} 场: 胜率 ${wins}/${count} (${(wins/count*100).toFixed(1)}%), 平均回合 ${avgTurns}`;
    console.log(msg);
    if (typeof AutoTest !== 'undefined') AutoTest.log(msg);
    return { wins, count, avgTurns };
};
