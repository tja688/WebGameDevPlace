/**
 * 卡牌地下城 - 渲染核心工具
 */

import { darkenColor } from '../core/utils.js';

export { darkenColor } from '../core/utils.js';

export function drawBackground(ctx, width, height, animTime) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#1a1520');
    grad.addColorStop(0.5, '#0d0b12');
    grad.addColorStop(1, '#1a1520');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const brickW = 80;
    const brickH = 40;
    for (let y = 0; y < height; y += brickH) {
        const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
        for (let x = -brickW; x < width + brickW; x += brickW) {
            ctx.strokeRect(x + offset, y, brickW, brickH);
        }
    }

    const torchGlow = ctx.createRadialGradient(width * 0.3, 80, 0, width * 0.3, 80, 200);
    torchGlow.addColorStop(0, 'rgba(255,160,50,0.08)');
    torchGlow.addColorStop(1, 'rgba(255,160,50,0)');
    ctx.fillStyle = torchGlow;
    ctx.fillRect(0, 0, width, height);

    const torchGlow2 = ctx.createRadialGradient(width * 0.7, 80, 0, width * 0.7, 80, 200);
    torchGlow2.addColorStop(0, 'rgba(255,160,50,0.06)');
    torchGlow2.addColorStop(1, 'rgba(255,160,50,0)');
    ctx.fillStyle = torchGlow2;
    ctx.fillRect(0, 0, width, height);
}

export function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    let currentY = y;
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, x, currentY);
            line = words[i];
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
}

export function drawBackButton(ctx, state, text, width, height) {
    const btnW = 140;
    const btnH = 45;
    const btnX = 30;
    const btnY = height - 80;
    const isHover = state.data.hoverBack;

    ctx.fillStyle = isHover ? 'rgba(60,50,50,0.95)' : 'rgba(40,35,35,0.9)';
    ctx.strokeStyle = isHover ? '#aa6666' : '#554444';
    ctx.lineWidth = isHover ? 3 : 2;
    roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHover ? '#ffcccc' : '#aaa';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('← ' + (text || '返回'), btnX + btnW / 2, btnY + 29);

    state.data.backBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
}
