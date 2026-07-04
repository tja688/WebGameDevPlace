/**
 * Heave! - 主渲染器
 * 
 * 职责：组合各子渲染器，根据当前 screen 分发绘制任务
 */

import { drawBattle } from './battle.js';
import {
    drawTitle, drawClassSelect, drawMap, drawPostBattle,
    drawCardPick, drawCardSelect, drawShop, drawBlacksmith,
    drawEvent, drawTreasure, drawActTransition, drawVictory,
    drawGameOver, drawMessages, drawBossRelic, drawDeckViewOverlay
} from './screens.js';
import { FX } from './fx.js';
import { drawPlayground } from '../playground/renderer.js';

export const Renderer = {
    canvas: null,
    ctx: null,
    width: 1280,
    height: 720,
    animTime: 0,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const container = document.getElementById('game-container');
        const w = container.clientWidth;
        const h = container.clientHeight;
        const scale = Math.min(w / this.width, h / this.height);
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${this.width * scale}px`;
        this.canvas.style.height = `${this.height * scale}px`;
        this.scale = scale;
    },

    render(state) {
        this.animTime += 0.016;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        
        FX.update();
        FX.screenShake.apply(ctx);

        switch (state.screen) {
            case 'title': drawTitle(this, ctx, state); break;
            case 'class_select': drawClassSelect(this, ctx, state); break;
            case 'map': drawMap(this, ctx, state); break;
            case 'battle': drawBattle(this, ctx, state); break;
            case 'post_battle': drawPostBattle(this, ctx, state); break;
            case 'card_pick': drawCardPick(this, ctx, state); break;
            case 'card_select': drawCardSelect(this, ctx, state); break;
            case 'shop': drawShop(this, ctx, state); break;
            case 'blacksmith': drawBlacksmith(this, ctx, state); break;
            case 'event': drawEvent(this, ctx, state); break;
            case 'treasure': drawTreasure(this, ctx, state); break;
            case 'boss_relic': drawBossRelic(this, ctx, state); break;
            case 'act_transition': drawActTransition(this, ctx, state); break;
            case 'victory': drawVictory(this, ctx, state); break;
            case 'game_over': drawGameOver(this, ctx, state); break;
            case 'playground': 
    if (state.data?.pgView === 'battle') {
        drawBattle(this, ctx, state);
    } else {
        drawPlayground(this, ctx, state);
    }
    break;
            default:
                ctx.fillStyle = '#0f0a14';
                ctx.fillRect(0, 0, this.width, this.height);
                ctx.fillStyle = '#ff4444';
                ctx.font = 'bold 20px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.fillText(`未知界面: ${state.screen}`, this.width / 2, this.height / 2);
                break;
        }

        FX.screenShake.restore(ctx);
        FX.drawPost(ctx);
        drawDeckViewOverlay(this, ctx, state);
        drawMessages(ctx, state, this.width, this.height);
    }
};

// 重新导出战斗渲染中的位置工具，供 input 使用
export {
    getEndTurnButtonRect,
    getHandCardRect,
    getSlotRect,
    getSlotIndexAt,
    getSlotCardAt,
    getHandCardIndexAt
} from './battle.js';
