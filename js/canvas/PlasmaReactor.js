/**
 * PlasmaReactor.js
 * トカマク型磁場閉じ込め核融合炉のプラズマ挙動、磁気面、核融合衝突、
 * ヘリウム(アルファ線)と高速中性子の放出を描画する動的キャンバス
 */

export class PlasmaReactor {
    constructor(canvas, onManualPulse) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onManualPulse = onManualPulse;

        this.width = canvas.width;
        this.height = canvas.height;

        this.plasmaParticles = [];
        this.explosions = [];
        this.neutrons = []; // 磁場を抜けて炉壁に向かう高速中性子

        this.time = 0;
        this.baseParticleCount = 120;

        this._initParticles();
        this._setupEvents();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.width = rect.width;
            this.height = rect.height;
        }
    }

    _setupEvents() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (this.onManualPulse) {
                this.onManualPulse(x, y);
            }
        });
    }

    _initParticles() {
        this.plasmaParticles = [];
        for (let i = 0; i < this.baseParticleCount; i++) {
            this.plasmaParticles.push(this._createParticle());
        }
    }

    _createParticle() {
        const isDeuterium = Math.random() > 0.5;
        // トロイダル角とポロイダル角
        return {
            type: isDeuterium ? 'D' : 'T',
            color: isDeuterium ? '#06d6a0' : '#f72585',
            angle: Math.random() * Math.PI * 2,
            minorAngle: Math.random() * Math.PI * 2,
            minorRadius: 10 + Math.random() * 32,
            speed: 0.02 + Math.random() * 0.04,
            twistSpeed: 0.05 + Math.random() * 0.08,
            charge: +1,
            size: 2.2 + Math.random() * 1.5,
        };
    }

    // 核融合反応イベント（D-T衝突）時の演出トリガー
    triggerFusionBurst(count = 1) {
        const cx = this.width / 2;
        const cy = this.height / 2;
        const majorR = Math.min(this.width, this.height) * 0.32;

        for (let k = 0; k < count; k++) {
            // 円環上のランダム位置
            const theta = Math.random() * Math.PI * 2;
            const px = cx + Math.cos(theta) * majorR + (Math.random() - 0.5) * 20;
            const py = cy + Math.sin(theta) * (majorR * 0.55) + (Math.random() - 0.5) * 15;

            // 核融合爆発エフェクト
            this.explosions.push({
                x: px,
                y: py,
                radius: 4,
                maxRadius: 28 + Math.random() * 12,
                color: '#ffffff',
                age: 0,
                maxAge: 0.5,
            });

            // 高速中性子 (14.1 MeV) の放出：電荷を持たないため磁場を直進し炉壁ブランケットへ
            const nAngle = theta + (Math.random() - 0.5) * 1.2;
            const nSpeed = 6 + Math.random() * 4;
            this.neutrons.push({
                x: px,
                y: py,
                vx: Math.cos(nAngle) * nSpeed,
                vy: Math.sin(nAngle) * nSpeed,
                age: 0,
                maxAge: 0.6,
            });
        }
    }

    update(dt = 1/60, reactorState) {
        this.time += dt;
        const temp = reactorState ? reactorState.temperatureKeV : 1.0;
        const speedFactor = 1 + Math.min(temp / 5, 4);

        // 粒子の旋回運動（磁力線に沿ったヘリカル運動）
        for (const p of this.plasmaParticles) {
            p.angle += p.speed * speedFactor;
            p.minorAngle += p.twistSpeed * speedFactor;
        }

        // 爆発エフェクト更新
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.age += dt;
            if (exp.age >= exp.maxAge) {
                this.explosions.splice(i, 1);
            }
        }

        // 高速中性子更新
        for (let i = this.neutrons.length - 1; i >= 0; i--) {
            const n = this.neutrons[i];
            n.x += n.vx;
            n.y += n.vy;
            n.age += dt;
            if (n.age >= n.maxAge) {
                this.neutrons.splice(i, 1);
            }
        }
    }

    render(reactorState) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;
        const majorR = Math.min(this.width, this.height) * 0.32;
        const minorAspect = 0.55; // 楕円断面の傾斜比

        const temp = reactorState ? reactorState.temperatureKeV : 1.0;
        const isBurning = reactorState && reactorState.qValue >= 5.0;

        // 1. トカマク真空容器およびD型コイルの描画
        this._renderVesselAndCoils(ctx, cx, cy, majorR, minorAspect);

        // 2. 磁気面（Nested Magnetic Flux Surfaces）のグロー
        this._renderMagneticSurfaces(ctx, cx, cy, majorR, minorAspect, temp);

        // 3. 超高温プラズマコアの光
        this._renderPlasmaCore(ctx, cx, cy, majorR, minorAspect, temp, isBurning);

        // 4. 個々のプラズマイオン（D+, T+）の描画
        this._renderPlasmaParticles(ctx, cx, cy, majorR, minorAspect);

        // 5. 高速中性子の航跡描画
        this._renderNeutrons(ctx);

        // 6. 核融合爆発エフェクト
        this._renderExplosions(ctx);
    }

    _renderVesselAndCoils(ctx, cx, cy, majorR, minorAspect) {
        ctx.save();

        // 外壁（真空容器壁 / 増殖ブランケット）
        ctx.strokeStyle = 'rgba(74, 93, 110, 0.4)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.ellipse(cx, cy, majorR + 42, (majorR + 42) * minorAspect, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 増殖ブランケットの内側タイル（リチウム保護層）
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.25)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, majorR + 36, (majorR + 36) * minorAspect, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 中心ソレノイド（変流器コイル）
        ctx.fillStyle = '#1b263b';
        ctx.strokeStyle = '#3a86ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 28, 28 * minorAspect, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // ソレノイドの磁力線マーク
        ctx.fillStyle = 'rgba(58, 134, 255, 0.6)';
        ctx.font = 'bold 9px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CS COIL', cx, cy);

        // トロイダル磁場コイルの放射状リブ
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        const numCoils = 16;
        for (let i = 0; i < numCoils; i++) {
            const th = (Math.PI * 2 * i) / numCoils;
            const x1 = cx + Math.cos(th) * 32;
            const y1 = cy + Math.sin(th) * (32 * minorAspect);
            const x2 = cx + Math.cos(th) * (majorR + 48);
            const y2 = cy + Math.sin(th) * ((majorR + 48) * minorAspect);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    _renderMagneticSurfaces(ctx, cx, cy, majorR, minorAspect, temp) {
        ctx.save();
        const rings = [0.8, 0.92, 1.0, 1.08, 1.2];
        for (const scale of rings) {
            const alpha = 0.08 + Math.sin(this.time * 2 + scale * 5) * 0.03;
            ctx.strokeStyle = `rgba(114, 9, 183, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, majorR * scale, majorR * scale * minorAspect, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderPlasmaCore(ctx, cx, cy, majorR, minorAspect, temp, isBurning) {
        ctx.save();

        // 温度に応じたプラズマコアのカラーシフト
        let innerGlow = 'rgba(255, 100, 50, 0.35)';
        let outerGlow = 'rgba(200, 30, 80, 0.15)';

        if (temp > 5.0) {
            // 5 keV 以上: 鮮やかなバイオレット・シアン
            innerGlow = 'rgba(120, 210, 255, 0.45)';
            outerGlow = 'rgba(180, 50, 240, 0.2)';
        }
        if (temp > 12.0) {
            // 12 keV 以上（臨界〜燃焼プラズマ）: 超高輝度ホワイトパープル
            innerGlow = 'rgba(255, 255, 255, 0.65)';
            outerGlow = 'rgba(0, 245, 212, 0.3)';
        }

        ctx.shadowBlur = isBurning ? 40 : 25;
        ctx.shadowColor = isBurning ? '#00f5d4' : '#f72585';

        ctx.strokeStyle = innerGlow;
        ctx.lineWidth = 22 + Math.sin(this.time * 4) * 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, majorR, majorR * minorAspect, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = outerGlow;
        ctx.lineWidth = 42;
        ctx.beginPath();
        ctx.ellipse(cx, cy, majorR, majorR * minorAspect, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    _renderPlasmaParticles(ctx, cx, cy, majorR, minorAspect) {
        ctx.save();
        for (const p of this.plasmaParticles) {
            // ヘリカル座標から2D投影座標へ
            const rOffset = Math.sin(p.minorAngle) * p.minorRadius;
            const zOffset = Math.cos(p.minorAngle) * (p.minorRadius * minorAspect);

            const rx = majorR + rOffset;
            const px = cx + Math.cos(p.angle) * rx;
            const py = cy + Math.sin(p.angle) * (rx * minorAspect) + zOffset;

            ctx.fillStyle = p.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _renderNeutrons(ctx) {
        ctx.save();
        for (const n of this.neutrons) {
            const progress = n.age / n.maxAge;
            const alpha = 1 - progress;

            // 14.1 MeV 中性子の軌跡（淡い青白のレーザー状トレイル）
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(n.x - n.vx * 3, n.y - n.vy * 3);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();

            // 中性子核
            ctx.fillStyle = `rgba(180, 240, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _renderExplosions(ctx) {
        ctx.save();
        for (const exp of this.explosions) {
            const progress = exp.age / exp.maxAge;
            const curRadius = exp.radius + (exp.maxRadius - exp.radius) * progress;
            const alpha = Math.max(0, 1 - progress);

            // 白色中心フラッシュ
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, curRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // 核融合リング
            ctx.strokeStyle = `rgba(247, 37, 133, ${alpha})`;
            ctx.lineWidth = 3 * (1 - progress);
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f72585';
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, curRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}
