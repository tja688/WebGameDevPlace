/**
 * Heave! - 视觉特效系统 (Visual FX System)
 * 
 * 职责：纯视觉效果，与游戏逻辑完全解耦。
 * 所有效果都是"锦上添花"，移除后不影响游戏运行。
 */

// ============================================================
// 粒子系统
// ============================================================

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 300;
    }

    emit(config) {
        const {
            x, y,
            count = 10,
            type = 'spark',
            color = '#ffd700',
            colors = null,
            speed = 2,
            speedVar = 1,
            life = 30,
            lifeVar = 10,
            size = 3,
            sizeVar = 1,
            gravity = 0.1,
            spread = Math.PI * 2,
            angle = -Math.PI / 2,
            drag = 0.98,
            glow = false
        } = config;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            const a = angle + (Math.random() - 0.5) * spread;
            const s = speed + (Math.random() - 0.5) * speedVar * 2;
            const c = colors ? colors[Math.floor(Math.random() * colors.length)] : color;
            this.particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: life + (Math.random() - 0.5) * lifeVar * 2,
                maxLife: life + (Math.random() - 0.5) * lifeVar * 2,
                size: size + (Math.random() - 0.5) * sizeVar * 2,
                color: c,
                gravity,
                drag,
                glow,
                type
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            const size = p.size * (0.5 + 0.5 * alpha);

            if (p.glow) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = size * 3;
            } else {
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }

            const rgb = hexToRgb(p.color);
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;

            if (p.type === 'spark') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'smoke') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'debris') {
                ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
            } else if (p.type === 'star') {
                drawStar(ctx, p.x, p.y, 5, size, size * 0.5);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

// ============================================================
// 浮动文字
// ============================================================

export class FloatingTextSystem {
    constructor() {
        this.texts = [];
        this.maxTexts = 50;
    }

    add(config) {
        const {
            x, y,
            text,
            color = '#ffd700',
            fontSize = 20,
            font = 'bold',
            life = 45,
            vy = -1.5,
            vx = 0,
            gravity = 0.02,
            outline = true,
            outlineColor = '#000'
        } = config;

        if (this.texts.length >= this.maxTexts) this.texts.shift();

        this.texts.push({
            x, y,
            text: String(text),
            color,
            fontSize,
            font,
            life,
            maxLife: life,
            vx,
            vy,
            gravity,
            outline,
            outlineColor,
            scale: 1.0
        });
    }

    update() {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.x += t.vx;
            t.y += t.vy;
            t.vy += t.gravity;
            t.life--;

            // 弹出放大效果
            const progress = 1 - t.life / t.maxLife;
            if (progress < 0.15) {
                t.scale = 1.0 + Math.sin(progress / 0.15 * Math.PI) * 0.4;
            } else {
                t.scale = 1.0;
            }

            if (t.life <= 0) {
                this.texts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const t of this.texts) {
            const alpha = Math.min(1, t.life / 15);
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.scale(t.scale, t.scale);
            ctx.font = `${t.font} ${t.fontSize}px Microsoft YaHei`;
            ctx.textAlign = 'center';

            if (t.outline) {
                ctx.strokeStyle = t.outlineColor;
                ctx.lineWidth = 3;
                ctx.globalAlpha = alpha;
                ctx.strokeText(t.text, 0, 0);
            }

            ctx.fillStyle = t.color;
            ctx.globalAlpha = alpha;
            ctx.fillText(t.text, 0, 0);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }
}

// ============================================================
// 屏幕震动
// ============================================================

export class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.decay = 0.9;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    trigger(intensity = 5, decay = 0.85) {
        this.intensity = intensity;
        this.decay = decay;
    }

    update() {
        if (this.intensity > 0.1) {
            this.offsetX = (Math.random() - 0.5) * this.intensity * 2;
            this.offsetY = (Math.random() - 0.5) * this.intensity * 2;
            this.intensity *= this.decay;
        } else {
            this.intensity = 0;
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }

    apply(ctx) {
        if (this.intensity > 0) {
            ctx.translate(this.offsetX, this.offsetY);
        }
    }

    restore(ctx) {
        if (this.intensity > 0) {
            ctx.translate(-this.offsetX, -this.offsetY);
        }
    }
}

// ============================================================
// 环境粒子（背景漂浮）
// ============================================================

export class AmbientParticles {
    constructor(count = 30) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * 1280,
            y: Math.random() * 720,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.1 - Math.random() * 0.3,
            size: 1 + Math.random() * 2,
            alpha: 0.1 + Math.random() * 0.3,
            life: 100 + Math.random() * 200,
            maxLife: 100 + Math.random() * 200,
            color: Math.random() > 0.7 ? '#ffd700' : '#aaaaaa'
        };
    }

    update(width = 1280, height = 720) {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0 || p.y < -10) {
                const np = this.createParticle();
                p.x = np.x;
                p.y = height + 10;
                p.vx = np.vx;
                p.vy = np.vy;
                p.size = np.size;
                p.alpha = np.alpha;
                p.life = np.life;
                p.maxLife = np.maxLife;
                p.color = np.color;
            }
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            const fade = Math.min(1, p.life / 30) * Math.min(1, (p.maxLife - p.life) / 30);
            const rgb = hexToRgb(p.color);
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${p.alpha * fade})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ============================================================
// 闪电/闪光效果
// ============================================================

export class FlashEffect {
    constructor() {
        this.flashes = [];
    }

    trigger(x, y, color = '#ffffff', radius = 100, duration = 10) {
        this.flashes.push({ x, y, color, radius, duration, maxDuration: duration });
    }

    triggerScreen(color = '#ffffff', duration = 8) {
        this.flashes.push({ x: 640, y: 360, color, radius: 1000, duration, maxDuration: duration, screen: true });
    }

    update() {
        for (let i = this.flashes.length - 1; i >= 0; i--) {
            this.flashes[i].duration--;
            if (this.flashes[i].duration <= 0) {
                this.flashes.splice(i, 1);
            }
        }
    }

    draw(ctx, width = 1280, height = 720) {
        for (const f of this.flashes) {
            const alpha = f.duration / f.maxDuration;
            const rgb = hexToRgb(f.color);
            const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
            grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.8})`);
            grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.3})`);
            grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
            ctx.fillStyle = grad;
            if (f.screen) {
                ctx.fillRect(0, 0, width, height);
            } else {
                ctx.fillRect(f.x - f.radius, f.y - f.radius, f.radius * 2, f.radius * 2);
            }
        }
    }
}

// ============================================================
// 主特效管理器（单例）
// ============================================================

export const FX = {
    particles: new ParticleSystem(),
    floatingText: new FloatingTextSystem(),
    screenShake: new ScreenShake(),
    ambient: new AmbientParticles(40),
    flash: new FlashEffect(),

    update() {
        this.particles.update();
        this.floatingText.update();
        this.screenShake.update();
        this.ambient.update();
        this.flash.update();
    },

    draw(ctx, width = 1280, height = 720) {
        this.ambient.draw(ctx);
    },

    drawPost(ctx) {
        this.flash.draw(ctx);
        this.particles.draw(ctx);
        this.floatingText.draw(ctx);
    },

    // 便捷方法
    spawnCardPlace(x, y, color) {
        this.particles.emit({
            x, y, count: 8, type: 'spark',
            color: color || '#ffd700',
            speed: 2, speedVar: 1, life: 20, size: 2, sizeVar: 1,
            gravity: 0.05, spread: Math.PI, glow: true
        });
    },

    spawnDamage(x, y, amount, isCrit) {
        this.floatingText.add({
            x, y, text: amount,
            color: isCrit ? '#ff4444' : '#ffaa44',
            fontSize: isCrit ? 28 : 22,
            vy: -2, vx: (Math.random() - 0.5) * 1,
            life: 50
        });
        this.particles.emit({
            x, y, count: isCrit ? 20 : 10, type: 'spark',
            colors: ['#ff4444', '#ff8800', '#ffcc00'],
            speed: 3, speedVar: 1.5, life: 25, size: 2, sizeVar: 1,
            gravity: 0.1, spread: Math.PI * 2, glow: true
        });
    },

    spawnHeartBreak(x, y) {
        this.particles.emit({
            x, y, count: 15, type: 'debris',
            colors: ['#e74c3c', '#c0392b', '#ff6666'],
            speed: 3, speedVar: 2, life: 40, size: 3, sizeVar: 2,
            gravity: 0.15, spread: Math.PI * 2, glow: false
        });
        this.screenShake.trigger(3, 0.85);
    },

    spawnMonsterHit(x, y) {
        this.particles.emit({
            x, y, count: 25, type: 'spark',
            colors: ['#ff0000', '#ff4400', '#ff8800', '#ffffff'],
            speed: 4, speedVar: 2, life: 30, size: 2, sizeVar: 2,
            gravity: 0.1, spread: Math.PI * 2, glow: true
        });
        this.screenShake.trigger(4, 0.88);
    },

    spawnVictory(x, y) {
        this.particles.emit({
            x, y, count: 50, type: 'star',
            colors: ['#ffd700', '#ffec8b', '#ffa500', '#ffffff'],
            speed: 5, speedVar: 3, life: 80, size: 4, sizeVar: 2,
            gravity: 0.05, spread: Math.PI * 2, glow: true
        });
        this.screenShake.trigger(2, 0.9);
    },

    spawnGrowth(x, y) {
        this.particles.emit({
            x, y, count: 12, type: 'spark',
            colors: ['#2ecc71', '#27ae60', '#a8e6cf'],
            speed: 2, speedVar: 1, life: 35, size: 2, sizeVar: 1,
            gravity: -0.05, spread: Math.PI * 2, glow: true
        });
        this.floatingText.add({
            x, y, text: '+淬火', color: '#2ecc71',
            fontSize: 16, vy: -1.5, life: 40
        });
    },

    spawnLockBreak(x, y) {
        this.particles.emit({
            x, y, count: 20, type: 'debris',
            colors: ['#888888', '#aaaaaa', '#666666'],
            speed: 3, speedVar: 2, life: 30, size: 2, sizeVar: 1,
            gravity: 0.2, spread: Math.PI, glow: false
        });
    }
};

// ============================================================
// 工具函数
// ============================================================

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

export function lerpColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r},${g},${bl})`;
}

export function flickerIntensity(base, time, seed = 0) {
    const noise = Math.sin(time * 8 + seed) * 0.3 + Math.sin(time * 13 + seed * 2) * 0.2 + Math.sin(time * 21 + seed * 3) * 0.1;
    return base + noise * 0.15;
}

export function pulseScale(base, time, speed = 2, amount = 0.05) {
    return base + Math.sin(time * speed) * amount;
}

// 随机噪声
export function noise(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}
