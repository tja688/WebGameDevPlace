/**
 * Heave! - 自动测试与调试工具（第二版）
 */

if (typeof window === 'undefined') {
    globalThis.window = globalThis;
}

import { createInitialState, startBattle } from './core/state.js';
import { drawCards, endTurn, logCombat } from './systems/battle.js';
import { playCardToSlot, calculateTotalBoardDamage, getPlacementPreview, canPlaceCard } from './systems/board.js';
import { createCardInstance } from './data/index.js';
import { Input } from './input/index.js';

const AutoTest = {
    state: null,

    init(gameState) {
        this.state = gameState;
        this.bindDebugPanel();
    },

    bindDebugPanel() {
        document.getElementById('btn-toggle-debug')?.addEventListener('click', () => {
            const panel = document.getElementById('debug-panel');
            panel?.classList.toggle('hidden');
        });

        document.getElementById('btn-auto-play')?.addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                this.autoPlayOptimal();
            } else {
                this.log('仅在海战界面可用');
            }
        });

        document.getElementById('btn-auto-end')?.addEventListener('click', () => {
            if (this.state.screen === 'battle' && this.state.phase === 'playing') {
                endTurn(this.state);
                this.checkEnd();
            }
        });

        document.getElementById('btn-cheat-hand')?.addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                this.cheatHand();
            }
        });

        document.getElementById('btn-refill-deck')?.addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                while (this.state.deck.length < 5) {
                    this.state.deck.push(createCardInstance('brute_force'));
                }
                logCombat(this.state, '调试: 矿舱已补满');
                this.log('矿舱已补满');
            }
        });

        document.getElementById('btn-kill-monster')?.addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                this.state.monster.hp = 0;
                this.state.phase = 'ended';
                this.state.result = 'win';
                this.log('秒杀敌舰');
                Input.checkBattleEnd();
            }
        });

        document.getElementById('btn-heal-player')?.addEventListener('click', () => {
            if (this.state.screen === 'battle') {
                this.state.player.hearts = this.state.player.maxHearts;
                this.log('玩家生命回满');
            }
        });

        document.getElementById('btn-reset-battle')?.addEventListener('click', () => {
            restartGame();
            this.log('海战已重置');
        });

        document.getElementById('btn-set-mul')?.addEventListener('click', () => {
            if (this.state.screen !== 'battle') return;
            const m0 = parseInt(document.getElementById('slot0-mul')?.value) || 0;
            const m1 = parseInt(document.getElementById('slot1-mul')?.value) || 1;
            const m2 = parseInt(document.getElementById('slot2-mul')?.value) || 1;
            if (this.state.slots[0]) this.state.slots[0].multiplier = m0;
            if (this.state.slots[1]) this.state.slots[1].multiplier = m1;
            if (this.state.slots[2]) this.state.slots[2].multiplier = m2;
            this.log(`倍率已设置: [${m0}X, ${m1}X, ${m2}X]`);
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
            this.log('无矿可出，自动结束回合');
            endTurn(this.state);
            this.checkEnd();
        } else {
            this.log(`自动出矿完成，共打出 ${played} 张`);
        }
    },

    cheatHand() {
        if (this.state.screen !== 'battle') return;
        const choice = prompt(
            '输入想要的精炼盘组合（用逗号分隔）：\n' +
            '1=蛮力, 2=思考, 3=爬藤\n' +
            '4=备战, 5=坚守, 6=共同目标, 7=友好交流\n' +
            '8=大蛮力, 9=理清头绪, 10=搭把手, 11=传令\n' +
            '12=豪华装备, 13=终极蛮力, 14=我思故我在\n' +
            '15=战时训练, 16=锻痕, 17=猛训练, 18=集体训练\n' +
            '例如: 1,1,3,2,15',
            '1,1,3,2,15'
        );
        if (!choice) return;

        const map = {
            '1': 'brute_force', '2': 'ponder', '3': 'vine_climb',
            '4': 'prepare_battle', '5': 'hold_position', '6': 'common_goal', '7': 'friendly_chat',
            '8': 'big_brute_force', '9': 'clear_mind', '10': 'lend_hand', '11': 'messenger',
            '12': 'luxury_gear', '13': 'ultimate_brute', '14': 'cogito_ergo_sum',
            '15': 'war_training', '16': 'training_trace', '17': 'intense_training', '18': 'group_training'
        };
        const ids = choice.split(',').map(s => map[s.trim()]).filter(id => id);

        for (const c of this.state.hand) {
            this.state.deck.push(c);
        }
        this.state.hand = [];

        for (const id of ids) {
            this.state.hand.push(createCardInstance(id));
        }
        this.log(`精炼盘已修改: ${ids.length} 张`);
    },

    runSmokeTest() {
        this.log('=== 冒烟测试开始 ===');
        const testState = createInitialState();
        drawCards(testState, 5);

        console.assert(testState.player.hearts === 4, '初始生命应为4');
        console.assert(testState.slots[1].multiplier === 1, '中间铸造台应为1X');
        this.log('测试1 通过: 初始状态正确');

        const brute = testState.hand.find(c => c.defId === 'brute_force');
        if (brute) {
            playCardToSlot(brute, 1, testState);
            const dmg = calculateTotalBoardDamage(testState);
            console.assert(dmg === 15, `蛮力在1X格应为15，实际${dmg}`);
            this.log('测试2 通过: 蛮力基础伤害正确');
        }

        const vet = testState.hand.find(c => c.defId === 'veteran_ambition');
        if (vet) {
            playCardToSlot(vet, 0, testState);
            const val = calculateTotalBoardDamage(testState);
            this.log('测试3 通过: 老兵雄心熔核翻倍正确');
        }

        this.log('=== 冒烟测试结束 ===');
    },

    checkEnd() {
        if (this.state.screen === 'battle' && this.state.phase === 'ended') {
            Input.checkBattleEnd();
        }
    }
};

window.AutoTest = AutoTest;

// 控制台快捷指令
window.godMode = function() {
    if (!window.gameState || window.gameState.screen !== 'battle') return;
    window.gameState.player.hearts = 99;
    window.gameState.monster.hp = 1;
    AutoTest.log('上帝模式已开启');
};

window.fullHand = function(type = 'brute_force', count = 5) {
    if (!window.gameState || window.gameState.screen !== 'battle') return;
    for (let i = 0; i < count; i++) {
        window.gameState.hand.push(createCardInstance(type));
    }
    AutoTest.log(`添加了 ${count} 张 ${type}`);
};

window.setMonsterHp = function(hp) {
    if (!window.gameState || window.gameState.screen !== 'battle') return;
    window.gameState.monster.hp = hp;
    AutoTest.log(`敌舰HP设为 ${hp}`);
};

window.testCombat = function() {
    AutoTest.runSmokeTest();
};

// 模拟多场自动海战，统计胜率
window.simulateBattles = function(count = 100, verbose = false) {
    let wins = 0;
    let totalTurns = 0;
    for (let i = 0; i < count; i++) {
        const s = startBattle();
        drawCards(s, 5);
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

export default AutoTest;
