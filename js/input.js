/**
 * 卡牌地下城 - 输入处理
 */

const Input = {
    state: null,
    renderer: null,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,

    init(gameState, renderer) {
        this.state = gameState;
        this.renderer = renderer;

        this.canvas = renderer.canvas;
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', e => this.onMouseUp(e));
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // 触摸支持
        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const t = e.touches[0];
            this.onMouseDown({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const t = e.touches[0];
            this.onMouseMove({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        this.canvas.addEventListener('touchend', e => {
            e.preventDefault();
            this.onMouseUp(e);
        }, { passive: false });
    },

    getCanvasPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.renderer.width / rect.width;
        const scaleY = this.renderer.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    },

    onMouseDown(e) {
        if (this.state.phase !== 'playing') return;
        const pos = this.getCanvasPos(e.clientX, e.clientY);

        // 检查结束回合按钮
        const btnRect = this.renderer.getEndTurnButtonRect();
        if (this.hitTest(pos, btnRect)) {
            endTurn(this.state);
            this.checkBattleEnd();
            return;
        }

        // 检查手牌
        const handIdx = this.renderer.getHandCardIndexAt(pos.x, pos.y, this.state.hand.length);
        if (handIdx !== null) {
            const card = this.state.hand[handIdx];
            this.state.selectedCard = card;
            this.state.draggedCard = card;
            this.state.dragX = pos.x;
            this.state.dragY = pos.y;
            this.isDragging = true;
        }
    },

    onMouseMove(e) {
        const pos = this.getCanvasPos(e.clientX, e.clientY);

        if (this.isDragging && this.state.draggedCard) {
            this.state.dragX = pos.x;
            this.state.dragY = pos.y;
            this.state.hoveredSlot = this.renderer.getSlotIndexAt(pos.x, pos.y);
        } else {
            // hover检测
            this.state.hoveredSlot = this.renderer.getSlotIndexAt(pos.x, pos.y);
            const handIdx = this.renderer.getHandCardIndexAt(pos.x, pos.y, this.state.hand.length);
            if (handIdx !== null) {
                this.state.selectedCard = this.state.hand[handIdx];
                this.updateTooltip(this.state.hand[handIdx], e.clientX, e.clientY);
            } else {
                this.state.selectedCard = null;
                this.hideTooltip();
            }
        }
    },

    onMouseUp(e) {
        if (!this.isDragging || !this.state.draggedCard) {
            this.isDragging = false;
            return;
        }

        const pos = this.getCanvasPos(e.clientX || 0, e.clientY || 0);
        const slotIdx = this.renderer.getSlotIndexAt(pos.x, pos.y);

        if (slotIdx !== null && this.state.draggedCard) {
            const success = playCardToSlot(this.state.draggedCard, slotIdx, this.state);
            if (success) {
                this.state.turnDamage = calculateTotalBoardDamage(this.state);
                if (this.state.turnDamage >= this.state.monster.hp) {
                    this.state.message = '伤害已达标！结束回合击败怪物';
                    this.state.messageTimer = 120;
                }
            } else {
                this.state.message = '无法放置到此格子';
                this.state.messageTimer = 60;
            }
        }

        this.state.draggedCard = null;
        this.state.hoveredSlot = null;
        this.isDragging = false;

        this.checkBattleEnd();
    },

    checkBattleEnd() {
        if (this.state.phase === 'ended') {
            const isWin = this.state.result === 'win';
            if (typeof GameAudio !== 'undefined') {
                setTimeout(() => isWin ? GameAudio.playWin() : GameAudio.playLose(), 300);
            }
            showModal(
                isWin ? '🎉 战斗胜利！' : '💀 战斗失败',
                isWin
                    ? `你成功击败了 ${this.state.monster.name}！\n剩余生命: ${this.state.player.hearts}/${this.state.player.maxHearts}\n总伤害: ${this.state.totalDamage}`
                    : `你的心脏停止了跳动...\n${this.state.monster.name} 依然存活（${this.state.monster.hp} HP）`,
                [
                    { text: '再来一局', action: () => restartGame(), primary: true },
                    { text: '查看日志', action: () => showLogModal() }
                ]
            );
        }
    },

    hitTest(pos, rect) {
        return pos.x >= rect.x && pos.x <= rect.x + rect.w &&
               pos.y >= rect.y && pos.y <= rect.y + rect.h;
    },

    updateTooltip(card, clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        if (!card) {
            tooltip.classList.add('hidden');
            return;
        }

        let html = `<h4>${card.name}</h4>`;
        html += `<p>基础点数: <b>${getCardBaseValue(card)}</b> | 尺寸: ${card.size}格</p>`;
        html += `<p>${card.description}</p>`;
        html += '<div style="margin-top:8px">';
        for (const kw of card.keywords) {
            const data = KEYWORDS[kw];
            if (data) {
                html += `<span class="keyword-tag" style="border-color:${data.color};color:${data.color};background:${data.color}22">${data.name}</span>`;
            }
        }
        html += '</div>';

        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');

        const x = Math.min(clientX + 20, window.innerWidth - 300);
        const y = Math.min(clientY + 20, window.innerHeight - 200);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    }
};

// Modal 系统
function showModal(title, text, buttons) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const textEl = document.getElementById('modal-text');
    const buttonsEl = document.getElementById('modal-buttons');

    titleEl.textContent = title;
    textEl.textContent = text;
    buttonsEl.innerHTML = '';

    for (const btn of buttons) {
        const b = document.createElement('button');
        b.textContent = btn.text;
        if (btn.primary) b.classList.add('primary');
        b.onclick = () => {
            overlay.classList.add('hidden');
            if (btn.action) btn.action();
        };
        buttonsEl.appendChild(b);
    }

    overlay.classList.remove('hidden');
}

function showLogModal() {
    const log = window.gameState ? window.gameState.combatLog.join('\n') : '无日志';
    showModal('📜 战斗日志', log, [{ text: '关闭', action: null }]);
}

function restartGame() {
    window.gameState = startBattle();
    Input.state = window.gameState;
    if (typeof AutoTest !== 'undefined') {
        AutoTest.state = window.gameState;
    }
}
