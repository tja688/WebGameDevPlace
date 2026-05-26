/**
 * 新手教程控制器
 *
 * 教程数据集中放在顶部，运行时只读取当前纯对象状态并显示 DOM 遮罩。
 */

import {
    getEndTurnButtonRect,
    getHandCardRect,
    getSlotRect
} from './render/renderer.js';

const STORAGE_KEY = 'cardDungeonTutorialSeen.v1';

export const TUTORIAL_GROUPS = {
    intro: {
        steps: [
            {
                title: '欢迎来到烛局原型',
                body: [
                    '欢迎来到游戏：生死烛局的原型验证测试，非常感谢你用宝贵的时间点开这个链接，我们是来自重庆的游戏开发双人小团队巴鼠兄弟，这是我们尝试制作的第一款游戏',
                    '背景设定：在王国某个偏远的村庄处发生了异变，村民们赖以生存的农田上冒出了地下城，地下城中冒出的白雾包围住村庄，侵蚀着村民的理智与身体，为了不坐以待毙，村民们在优秀的领袖带领下开始推演攻克地下城的办法。目前版本仅为玩法验证，因此画面表现上会跟正式demo有很大差距，做得有点粗糙还请多多包涵QAQ，正式版本的demo正在引擎内进行努力开发，你的意见将是我们最宝贵的财富，祝你游玩愉快！'
                ],
                panel: 'center',
                wide: true
            }
        ]
    },
    battle_turn_1: {
        steps: [
            {
                title: '战斗教程：',
                body: [
                    '屏幕中下方是我们的手牌，每回合会抽5张。屏幕正中是倍率格，将手牌点数乘以倍率格的点数就获得了单次打牌的点数。屏幕正上方是我们需要击败的怪物。',
                    '只要我们累积的点数能够超越血条的点数就能赢下这一关。但要注意怪物的技能，每个怪物会给我们带来不同的麻烦。如果看到不认识的词条，可以点击右上角的书来查看。'
                ],
                targets: ['hand', 'board', 'monster'],
                panel: 'left'
            },
            {
                title: '手牌：',
                body: [
                    '在未拥有其他抽牌方法的初期，我们只能利用每回合抽上来的5张手牌。来想办法用这五张牌获得单回合最大的点数。'
                ],
                targets: ['hand'],
                panel: 'top'
            },
            {
                title: '计策是打高分的关键',
                body: [
                    '屏幕的左侧可以看到可用的计策阵型。不同的阵型允许你打出牌的数量和提供的倍率格点数加成是不同的。而阵型就是我们能够打出更高点数的关键。如果回合结束时不是任何计策阵型，则吃不到任何计策加成。现在来试试参照左侧给出的阵型来摆放吧！'
                ],
                targets: ['strategy_panel', 'board'],
                panel: 'right'
            }
        ]
    },
    battle_turn_2: {
        steps: [
            {
                title: '没击败时会被反击',
                body: [
                    '可以看到我们上回合的伤害没有超过怪物的血量，但也对它造成了相应的伤害，而它也反击了我们。屏幕左上方摆放着我们收集的遗物与我们剩余的生命（出牌次数）。正常来说，怪物每回合会造成1格生命值伤害。所以请好好利用你的三次机会吧。'
                ],
                targets: ['player_panel', 'relics'],
                panel: 'bottom'
            },
            {
                title: '基础教程结束',
                body: [
                    '教程到此为止，就不多废话了，欢迎通过右上方的：点我反馈 赐予我们珍贵的建议啊啊啊啊QAQ'
                ],
                targets: ['end_turn'],
                panel: 'center'
            }
        ]
    },
    shop_first: {
        steps: [
            {
                title: '商店用于战后强化',
                body: [
                    '击败普通怪物后总是会进入商店，这里提供各种方面的强化手段（目前遗物没有效果请不要买）。',
                    '合理安排自己获得的金币强化自己是取胜的关键。'
                ],
                targets: ['shop_goods', 'shop_services'],
                panel: 'bottom'
            }
        ]
    },
    event_first: {
        steps: [
            {
                title: '事件选择',
                body: [
                    '在商店结束后，还会有一次事件选择，选择你喜欢的强化来就可以了。'
                ],
                targets: ['event_options'],
                panel: 'bottom'
            }
        ]
    }
};

export const Tutorial = {
    overlay: null,
    panel: null,
    counter: null,
    title: null,
    body: null,
    highlights: null,
    active: null,
    inputReadyAt: 0,
    seen: {},
    lastState: null,
    lastRenderer: null,

    init(renderer) {
        this.lastRenderer = renderer;
        this.seen = loadSeenFlags();
        this.createOverlay();
        if (shouldResetFromUrl()) {
            this.reset();
        }
    },

    isActive() {
        return !!this.active;
    },

    advance() {
        if (!this.active) return;
        if (!this.canAcceptAdvance()) return;

        const group = TUTORIAL_GROUPS[this.active.groupId];
        if (!group) {
            this.finishActiveGroup();
            return;
        }

        if (this.active.stepIndex < group.steps.length - 1) {
            this.active.stepIndex++;
            this.inputReadyAt = getNow() + 120;
            this.renderActiveStep();
            return;
        }

        this.finishActiveGroup();
    },

    update(state, renderer) {
        this.lastState = state;
        this.lastRenderer = renderer || this.lastRenderer;
        if (!this.overlay) return;

        if (this.active) {
            this.renderActiveStep();
            return;
        }

        const groupId = getPendingTutorialGroup(state, this.seen);
        if (!groupId) {
            this.hideOverlay();
            return;
        }

        this.active = { groupId, stepIndex: 0 };
        this.inputReadyAt = getNow() + 350;
        this.renderActiveStep();
    },

    canAcceptAdvance() {
        return getNow() >= this.inputReadyAt;
    },

    reset() {
        this.seen = {};
        saveSeenFlags(this.seen);
    },

    createOverlay() {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById('tutorial-overlay');
        if (existing) {
            this.overlay = existing;
            this.panel = existing.querySelector('.tutorial-panel');
            this.counter = existing.querySelector('.tutorial-counter');
            this.title = existing.querySelector('.tutorial-title');
            this.body = existing.querySelector('.tutorial-body');
            this.highlights = existing.querySelector('.tutorial-highlights');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'hidden';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = [
            '<div class="tutorial-scrim"></div>',
            '<div class="tutorial-highlights"></div>',
            '<section class="tutorial-panel" aria-live="polite">',
            '<div class="tutorial-counter"></div>',
            '<h2 class="tutorial-title"></h2>',
            '<div class="tutorial-body"></div>',
            '<div class="tutorial-continue">点击任意位置继续</div>',
            '</section>'
        ].join('');

        overlay.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.canAcceptAdvance()) {
                this.advance();
            }
        }, true);
        overlay.addEventListener('pointerdown', event => {
            event.preventDefault();
            event.stopPropagation();
        }, true);
        overlay.addEventListener('wheel', event => {
            event.preventDefault();
            event.stopPropagation();
        }, { passive: false, capture: true });

        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.panel = overlay.querySelector('.tutorial-panel');
        this.counter = overlay.querySelector('.tutorial-counter');
        this.title = overlay.querySelector('.tutorial-title');
        this.body = overlay.querySelector('.tutorial-body');
        this.highlights = overlay.querySelector('.tutorial-highlights');
    },

    renderActiveStep() {
        if (!this.active || !this.overlay || !this.lastState || !this.lastRenderer) return;

        const group = TUTORIAL_GROUPS[this.active.groupId];
        const step = group && group.steps[this.active.stepIndex];
        if (!step) return;

        this.overlay.classList.remove('hidden');
        this.panel.className = `tutorial-panel tutorial-panel-${step.panel || 'center'}${step.wide ? ' tutorial-panel-wide' : ''}`;
        this.counter.textContent = `${this.active.stepIndex + 1} / ${group.steps.length}`;
        this.title.textContent = step.title;

        this.body.innerHTML = '';
        for (const line of step.body || []) {
            const p = document.createElement('p');
            p.textContent = line;
            this.body.appendChild(p);
        }

        this.renderHighlights(step);
    },

    renderHighlights(step) {
        this.highlights.innerHTML = '';
        const rects = resolveTargetRects(step.targets || [], this.lastState, this.lastRenderer);
        for (const rect of rects) {
            const box = document.createElement('div');
            box.className = 'tutorial-highlight';
            box.style.left = `${rect.left}px`;
            box.style.top = `${rect.top}px`;
            box.style.width = `${rect.width}px`;
            box.style.height = `${rect.height}px`;
            this.highlights.appendChild(box);
        }
    },

    finishActiveGroup() {
        if (this.active) {
            this.seen[this.active.groupId] = true;
            saveSeenFlags(this.seen);
        }
        this.active = null;
        this.hideOverlay();
    },

    hideOverlay() {
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
        if (this.highlights) this.highlights.innerHTML = '';
    }
};

function getPendingTutorialGroup(state, seen) {
    if (!state || state.screen === 'playground' || state._playgroundBattle) return null;
    if (state.data && state.data.viewingDeck) return null;

    if (state.screen === 'title' && !seen.intro) return 'intro';

    if (state.screen === 'battle' && state.stageKey === '1-1' && state.phase === 'playing') {
        if (state.turn === 1 && !seen.battle_turn_1) return 'battle_turn_1';
        if (state.turn === 2 && !seen.battle_turn_2) return 'battle_turn_2';
    }

    if (state.screen === 'shop' && !seen.shop_first) return 'shop_first';
    if (state.screen === 'event' && !seen.event_first) return 'event_first';

    return null;
}

function resolveTargetRects(targets, state, renderer) {
    const rects = [];
    for (const target of targets) {
        const resolved = resolveTargetRect(target, state, renderer);
        if (!resolved) continue;
        if (Array.isArray(resolved)) rects.push(...resolved);
        else rects.push(resolved);
    }
    return rects
        .map(rect => rect.css ? padCssRect(rect, 8) : canvasRectToCss(renderer, rect, 8))
        .filter(Boolean);
}

function resolveTargetRect(target, state, renderer) {
    switch (target) {
        case 'monster':
            return { x: renderer.width * 0.5 - 230, y: 20, w: 460, h: 230 };
        case 'hand':
            return getHandGroupRect(renderer, state);
        case 'board':
            return getBoardGroupRect(renderer, state);
        case 'strategy_panel':
            return { x: 36, y: 232, w: 204, h: 308 };
        case 'player_panel':
            return { x: 35, y: 45, w: 170, h: 210 };
        case 'relics':
            return getRelicsRect(state, renderer);
        case 'end_turn':
            return getEndTurnButtonRect(renderer);
        case 'keyword_book':
            return getDomRect('#btn-toggle-keyword');
        case 'shop_goods':
            return combineCanvasRects((state.data?.shopItemRects || []).map(toCanvasRect));
        case 'shop_services':
            return combineCanvasRects((state.data?.shopServiceRects || []).map(toCanvasRect));
        case 'event_options':
            return combineCanvasRects((state.data?.optionRects || []).map(toCanvasRect));
        default:
            return null;
    }
}

function getHandGroupRect(renderer, state) {
    const total = state.hand ? state.hand.length : 0;
    if (total <= 0) return { x: 260, y: 475, w: 760, h: 210 };
    const rects = [];
    for (let i = 0; i < total; i++) {
        rects.push(getHandCardRect(renderer, i, total));
    }
    return combineCanvasRects(rects);
}

function getBoardGroupRect(renderer, state) {
    const slotCount = state.slots ? state.slots.length : 3;
    const rects = [];
    for (let i = 0; i < slotCount; i++) {
        const r = getSlotRect(renderer, i, slotCount);
        rects.push({ x: r.x, y: r.y - 35, w: r.w, h: r.h + 65 });
    }
    return combineCanvasRects(rects);
}

function getRelicsRect(state, renderer) {
    const relicRects = state.data?.relicRects || [];
    if (relicRects.length > 0) return combineCanvasRects(relicRects.map(toCanvasRect));
    return { x: renderer.width - 70, y: 15, w: 55, h: 150 };
}

function toCanvasRect(rect) {
    return rect ? { x: rect.x, y: rect.y, w: rect.w, h: rect.h } : null;
}

function combineCanvasRects(rects) {
    const usable = rects.filter(Boolean);
    if (usable.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const rect of usable) {
        minX = Math.min(minX, rect.x);
        minY = Math.min(minY, rect.y);
        maxX = Math.max(maxX, rect.x + rect.w);
        maxY = Math.max(maxY, rect.y + rect.h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function canvasRectToCss(renderer, rect, padding) {
    if (!renderer || !renderer.canvas || !rect) return null;
    const canvasBounds = renderer.canvas.getBoundingClientRect();
    const scaleX = canvasBounds.width / renderer.width;
    const scaleY = canvasBounds.height / renderer.height;
    const cssRect = {
        left: canvasBounds.left + rect.x * scaleX,
        top: canvasBounds.top + rect.y * scaleY,
        width: rect.w * scaleX,
        height: rect.h * scaleY
    };
    return padCssRect(cssRect, padding);
}

function getDomRect(selector) {
    const node = typeof document !== 'undefined' ? document.querySelector(selector) : null;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        css: true
    };
}

function padCssRect(rect, padding) {
    const left = Math.max(4, rect.left - padding);
    const top = Math.max(4, rect.top - padding);
    const right = Math.min(window.innerWidth - 4, rect.left + rect.width + padding);
    const bottom = Math.min(window.innerHeight - 4, rect.top + rect.height + padding);
    return {
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
    };
}

function shouldResetFromUrl() {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('tutorial') === 'reset';
}

function getNow() {
    if (typeof performance !== 'undefined' && performance.now) return performance.now();
    return Date.now();
}

function loadSeenFlags() {
    if (typeof localStorage === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
        return {};
    }
}

function saveSeenFlags(seen) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen || {}));
}

if (typeof window !== 'undefined') {
    window.Tutorial = Tutorial;
}
