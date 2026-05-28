/**
 * 生死烛局 - 渲染核心工具（增强版）
 */

import { darkenColor } from '../core/utils.js';
import { flickerIntensity, noise } from './fx.js';

export { darkenColor } from '../core/utils.js';
export { flickerIntensity, noise, lerpColor } from './fx.js';

// ============================================================
// 背景绘制
// ============================================================

export function drawBackground(ctx, width, height, animTime) {
    // 深色石墙基础
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0f0a14');
    grad.addColorStop(0.4, '#0a0610');
    grad.addColorStop(0.6, '#0c0812');
    grad.addColorStop(1, '#0f0a14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 石砖纹理
    drawStoneBricks(ctx, width, height, animTime);

    // 两侧墙壁阴影
    const wallGrad = ctx.createLinearGradient(0, 0, width, 0);
    wallGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
    wallGrad.addColorStop(0.15, 'rgba(0,0,0,0.1)');
    wallGrad.addColorStop(0.85, 'rgba(0,0,0,0.1)');
    wallGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // 火把光源
    const f1 = flickerIntensity(1, animTime, 0);
    const f2 = flickerIntensity(1, animTime, 3.14);
    drawTorchLight(ctx, width * 0.2, 100, 180 * f1, '#ff8800', 0.08);
    drawTorchLight(ctx, width * 0.8, 100, 160 * f2, '#ff6600', 0.06);
    drawTorchLight(ctx, width * 0.5, 50, 120 * f1, '#ffaa44', 0.04);

    // 暗角
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
}

function drawStoneBricks(ctx, width, height, animTime) {
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    const brickW = 100;
    const brickH = 50;
    for (let y = 0; y < height; y += brickH) {
        const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
        for (let x = -brickW; x < width + brickW; x += brickW) {
            const bx = x + offset;
            const by = y;
            // 砖块阴影
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(bx + 2, by + 2, brickW - 4, brickH - 4);
            // 砖缝
            ctx.strokeRect(bx + 2, by + 2, brickW - 4, brickH - 4);
            // 砖面微妙纹理
            const n = noise(bx * 0.01, by * 0.01 + animTime * 0.001);
            ctx.fillStyle = `rgba(255,255,255,${n * 0.01})`;
            ctx.fillRect(bx + 3, by + 3, brickW - 6, brickH - 6);
        }
    }
}

export function drawTorchLight(ctx, x, y, radius, color = '#ff8800', maxAlpha = 0.08) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const rgb = hexToRgb(color);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${maxAlpha})`);
    grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${maxAlpha * 0.4})`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// ============================================================
// 材质绘制
// ============================================================

export function drawStoneTile(ctx, x, y, w, h, options = {}) {
    const {
        highlight = false,
        locked = false,
        glowColor = null
    } = options;

    // 基础石砖色
    const baseColor = locked ? '#1a1a2a' : '#1e1e2e';
    const lightColor = locked ? '#252535' : '#2a2a3e';
    const darkColor = locked ? '#12121e' : '#151525';

    // 主体
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, w, h);

    // 石砖纹理线
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const tileSize = 30;
    for (let ty = 0; ty < h; ty += tileSize) {
        const offset = (Math.floor(ty / tileSize) % 2) * (tileSize / 2);
        for (let tx = -tileSize; tx < w + tileSize; tx += tileSize) {
            ctx.strokeRect(x + tx + offset, y + ty, tileSize, tileSize);
        }
    }

    // 内阴影（上左亮，下右暗）
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x + w - 2, y, 2, h);

    // 高光/发光
    if (highlight) {
        const glow = glowColor || '#4ecdc4';
        const rgb = hexToRgb(glow);
        const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`);
        g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
    }

    if (locked) {
        ctx.fillStyle = 'rgba(100,30,30,0.2)';
        ctx.fillRect(x, y, w, h);
    }
}

export function drawMetalFrame(ctx, x, y, w, h, options = {}) {
    const {
        color = '#665544',
        glowColor = null,
        thickness = 3,
        radius = 8
    } = options;

    // 外框
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    roundRect(ctx, x, y, w, h, radius);
    ctx.stroke();

    // 内斜面高光
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, radius - 1);
    ctx.stroke();

    // 外发光
    if (glowColor) {
        const rgb = hexToRgb(glowColor);
        const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.max(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`);
        g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
    }
}

export function drawParchment(ctx, x, y, w, h, options = {}) {
    const { alpha = 0.9, radius = 10 } = options;

    // 羊皮纸底色
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, `rgba(40,32,20,${alpha})`);
    grad.addColorStop(0.5, `rgba(35,28,18,${alpha})`);
    grad.addColorStop(1, `rgba(40,32,20,${alpha})`);
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();

    // 边缘磨损效果
    ctx.strokeStyle = `rgba(180,150,100,${alpha * 0.4})`;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, radius);
    ctx.stroke();

    ctx.strokeStyle = `rgba(180,150,100,${alpha * 0.2})`;
    ctx.lineWidth = 1;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, radius - 2);
    ctx.stroke();

    // 纹理线条
    ctx.strokeStyle = `rgba(180,150,100,${alpha * 0.03})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < h; i += 4) {
        ctx.beginPath();
        ctx.moveTo(x + 8, y + i);
        ctx.lineTo(x + w - 8, y + i);
        ctx.stroke();
    }
}

export function drawGlowText(ctx, text, x, y, options = {}) {
    const {
        color = '#ffd700',
        glowColor = '#ffd700',
        glowBlur = 15,
        font = 'bold 20px Microsoft YaHei',
        align = 'center'
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.restore();
}

export function drawButton(ctx, x, y, w, h, text, options = {}) {
    const {
        hover = false,
        primary = false,
        disabled = false,
        radius = 10,
        fontSize = 18,
        glow = false
    } = options;

    const alpha = disabled ? 0.4 : (hover ? 1 : 0.85);
    const baseColor = primary ? '#4a2a2a' : '#2a2a3a';
    const hoverColor = primary ? '#6a3a3a' : '#3a3a5a';
    const borderColor = primary ? (hover ? '#cc6666' : '#aa4444') : (hover ? '#777' : '#555');
    const textColor = disabled ? '#666' : (hover ? (primary ? '#ffcccc' : '#eeeeee') : (primary ? '#ffaaaa' : '#cccccc'));
    const glowC = primary ? '#ff4444' : '#4444ff';

    ctx.save();
    ctx.globalAlpha = alpha;

    // 发光
    if (glow || (hover && primary)) {
        const rgb = hexToRgb(glowC);
        const g = ctx.createRadialGradient(x + w / 2, y + h / 2, w * 0.3, x + w / 2, y + h / 2, w);
        g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.25)`);
        g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - 15, y - 15, w + 30, h + 30);
    }

    // 主体
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, disabled ? baseColor : (hover ? hoverColor : baseColor));
    grad.addColorStop(1, disabled ? darkenColor(baseColor, -20) : darkenColor(hover ? hoverColor : baseColor, -20));
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();

    // 边框
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = hover ? 2.5 : 2;
    roundRect(ctx, x, y, w, h, radius);
    ctx.stroke();

    // 内高光
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, y, w, h / 2, radius);
    ctx.fill();

    // 文字
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px Microsoft YaHei`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);

    ctx.restore();
}

export function drawHealthBar(ctx, x, y, w, h, current, max, options = {}) {
    const {
        radius = 4,
        flash = false,
        label = null
    } = options;

    const ratio = Math.max(0, Math.min(1, current / max));
    const isLow = ratio < 0.3;

    // 背景
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();

    // 边框
    ctx.strokeStyle = isLow && flash ? '#ff3333' : '#444';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, radius);
    ctx.stroke();

    if (ratio > 0) {
        // 血条填充
        const barW = (w - 4) * ratio;
        const barColor = isLow
            ? (flash ? '#ff0000' : '#cc3333')
            : (ratio < 0.6 ? '#cc8800' : '#cc3333');

        const grad = ctx.createLinearGradient(x, y + 2, x, y + h - 2);
        grad.addColorStop(0, barColor);
        grad.addColorStop(1, darkenColor(barColor, -30));
        ctx.fillStyle = grad;
        roundRect(ctx, x + 2, y + 2, barW, h - 4, radius - 1);
        ctx.fill();

        // 血条高光
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 2, y + 2, barW, (h - 4) * 0.4);
    }

    // 数值文字
    if (label !== null) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, h - 4)}px Microsoft YaHei`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    }
}

export function drawRarityGlow(ctx, x, y, w, h, rarity, animTime) {
    if (!rarity || rarity === 'white') {
        // 白卡微光
        ctx.shadowColor = 'rgba(255,255,255,0.15)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;
        return;
    }

    let color, intensity;
    if (rarity === 'blue') {
        color = '#4488ff';
        intensity = 0.3;
    } else if (rarity === 'gold') {
        color = '#ffd700';
        intensity = 0.5;
    } else {
        return;
    }

    const pulse = Math.sin(animTime * 2) * 0.3 + 0.7;
    const rgb = hexToRgb(color);
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, w * 0.2, x + w / 2, y + h / 2, w * 0.8);
    g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${intensity * pulse})`);
    g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - 10, y - 10, w + 20, h + 20);

    // 边缘光
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;
}

// ============================================================
// 基础工具
// ============================================================

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

    drawButton(ctx, btnX, btnY, btnW, btnH, '← ' + (text || '返回'), {
        hover: isHover,
        radius: 8,
        fontSize: 16
    });

    state.data.backBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

// 绘制生命值计数图标
export function drawHeartIcon(ctx, x, y, size, filled, pulseTime = 0) {
    const scale = size / 30;
    const pulse = pulseTime > 0 ? 1 + Math.sin(pulseTime * 6) * 0.08 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * pulse, scale * pulse);

    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-15, -15, -25, 0, 0, 20);
    ctx.bezierCurveTo(25, 0, 15, -15, 0, 5);
    ctx.closePath();

    if (filled) {
        const grad = ctx.createRadialGradient(0, 2, 0, 0, 5, 20);
        grad.addColorStop(0, '#ff4444');
        grad.addColorStop(0.6, '#cc2222');
        grad.addColorStop(1, '#991111');
        ctx.fillStyle = grad;
        ctx.fill();

        // 高光
        ctx.fillStyle = 'rgba(255,150,150,0.4)';
        ctx.beginPath();
        ctx.ellipse(-5, -3, 4, 6, -0.5, 0, Math.PI * 2);
        ctx.fill();

        // 边缘发光
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = 'rgba(50,30,30,0.4)';
        ctx.fill();
        ctx.strokeStyle = '#553333';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 裂缝
        ctx.strokeStyle = '#442222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, 5);
        ctx.lineTo(0, 12);
        ctx.lineTo(3, 8);
        ctx.stroke();
    }

    ctx.restore();
}

// 绘制金币图标
export function drawSoulIcon(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    const s = size / 20;
    ctx.scale(s, s);

    // 金币外发光
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    grad.addColorStop(0, 'rgba(255,215,0,0.6)');
    grad.addColorStop(0.5, 'rgba(255,180,0,0.3)');
    grad.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // 金币主体
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // 金币内圈
    ctx.fillStyle = '#ffec8b';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // 金币符号 ¤
    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 8px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¤', 0, 0.5);
    ctx.textBaseline = 'alphabetic';

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-3, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 绘制符文圆环
export function drawRuneCircle(ctx, x, y, radius, animTime) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(animTime * 0.3);

    ctx.strokeStyle = 'rgba(255,200,50,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 符文标记
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.fillStyle = 'rgba(255,200,50,0.2)';
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}
