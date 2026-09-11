/**
 * ParticleChamber.js
 * 素粒子（クォーク・レプトン）の射出、衝突、強い力による結合（ハドロン合成）を
 * 描画・シミュレートするインタラクティブな物理キャンバス
 */

import { PARTICLES, HADRON_RECIPES } from '../constants.js';
import { sound } from '../audio.js';

export class ParticleChamber {
    constructor(canvas, onHadronCreated) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onHadronCreated = onHadronCreated; // (type: 'proton' | 'neutron') => void

        this.particles = [];
        this.effects = []; // グルーオン結合や光のエフェクト
        this.maxParticles = 60;

        this.width = canvas.width;
        this.height = canvas.height;

        this.selectedType = 'up'; // プレイヤーが直接クリックして発射する粒子

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

            // 発射位置（中央下）からクリック地点に向かって射出
            const startX = this.width / 2;
            const startY = this.height - 20;
            const angle = Math.atan2(y - startY, x - startX);
            const speed = 5 + Math.random() * 2;

            this.shootParticle(this.selectedType, startX, startY, Math.cos(angle) * speed, Math.sin(angle) * speed);
        });
    }

    // 粒子の射出
    shootParticle(type, x, y, vx, vy) {
        if (this.particles.length >= this.maxParticles) {
            // 最も古い粒子を1つ除外
            this.particles.shift();
        }

        const info = type === 'up' ? PARTICLES.UP : (type === 'down' ? PARTICLES.DOWN : PARTICLES.ELECTRON);

        this.particles.push({
            type,
            name: info.name,
            symbol: info.symbol,
            charge: type === 'up' ? 2/3 : (type === 'down' ? -1/3 : -1),
            color: info.color,
            radius: type === 'electron' ? 5 : 8,
            x: x ?? this.width / 2 + (Math.random() - 0.5) * 40,
            y: y ?? this.height - 30,
            vx: vx ?? (Math.random() - 0.5) * 6,
            vy: vy ?? -(4 + Math.random() * 4),
            age: 0,
            bound: false,
        });

        sound.playShoot(type);
    }

    update(dt = 1/60) {
        const bounceDamping = 0.85;
        const drag = 0.992;

        // 1. 物理挙動更新
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.age += dt;
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= drag;
            p.vy *= drag;

            // 壁との衝突（丸みのあるチャンバー境界）
            const margin = p.radius + 6;
            if (p.x < margin) {
                p.x = margin;
                p.vx = -p.vx * bounceDamping;
            } else if (p.x > this.width - margin) {
                p.x = this.width - margin;
                p.vx = -p.vx * bounceDamping;
            }

            if (p.y < margin) {
                p.y = margin;
                p.vy = -p.vy * bounceDamping;
            } else if (p.y > this.height - margin) {
                p.y = this.height - margin;
                p.vy = -p.vy * bounceDamping;
            }
        }

        // 2. 強い力によるクォークの結合判定 (u+u+d -> p, u+d+d -> n)
        this._checkHadronCombinations();

        // 3. エフェクト更新
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const eff = this.effects[i];
            eff.age += dt;
            if (eff.age >= eff.maxAge) {
                this.effects.splice(i, 1);
            }
        }
    }

    _checkHadronCombinations() {
        const quarks = this.particles.filter(p => (p.type === 'up' || p.type === 'down') && !p.bound);
        const captureDist = 28;

        // 3つのクォークの近傍探索
        for (let i = 0; i < quarks.length; i++) {
            for (let j = i + 1; j < quarks.length; j++) {
                for (let k = j + 1; k < quarks.length; k++) {
                    const q1 = quarks[i];
                    const q2 = quarks[j];
                    const q3 = quarks[k];

                    if (q1.bound || q2.bound || q3.bound) continue;

                    const d12 = Math.hypot(q1.x - q2.x, q1.y - q2.y);
                    const d23 = Math.hypot(q2.x - q3.x, q2.y - q3.y);
                    const d31 = Math.hypot(q3.x - q1.x, q3.y - q1.y);

                    if (d12 < captureDist && d23 < captureDist && d31 < captureDist) {
                        const types = [q1.type, q2.type, q3.type];
                        const upCount = types.filter(t => t === 'up').length;
                        const downCount = types.filter(t => t === 'down').length;

                        let hadronType = null;
                        if (upCount === 2 && downCount === 1) {
                            hadronType = 'proton';
                        } else if (upCount === 1 && downCount === 2) {
                            hadronType = 'neutron';
                        }

                        if (hadronType) {
                            q1.bound = true;
                            q2.bound = true;
                            q3.bound = true;

                            const cx = (q1.x + q2.x + q3.x) / 3;
                            const cy = (q1.y + q2.y + q3.y) / 3;

                            // 結合エフェクト追加
                            this._createHadronEffect(cx, cy, hadronType);

                            // 粒子リストから除去
                            this.particles = this.particles.filter(p => !p.bound);

                            sound.playHadronBond();
                            if (this.onHadronCreated) {
                                this.onHadronCreated(hadronType);
                            }
                            return; // 1フレームに1回の結合で十分
                        }
                    } else if (d12 < captureDist * 1.6) {
                        // 強い力による引力（近づいたクォークを引き寄せる）
                        const fx = (q2.x - q1.x) * 0.05;
                        const fy = (q2.y - q1.y) * 0.05;
                        q1.vx += fx;
                        q1.vy += fy;
                        q2.vx -= fx;
                        q2.vy -= fy;
                    }
                }
            }
        }
    }

    _createHadronEffect(x, y, hadronType) {
        const isProton = hadronType === 'proton';
        const color = isProton ? '#ff0055' : '#00b4d8';
        const label = isProton ? '陽子 p (uud)' : '中性子 n (udd)';

        this.effects.push({
            type: 'hadron_flash',
            x,
            y,
            color,
            label,
            age: 0,
            maxAge: 0.8,
        });

        // 破片パーティクル
        for (let i = 0; i < 12; i++) {
            const ang = (Math.PI * 2 * i) / 12;
            const spd = 2 + Math.random() * 3;
            this.effects.push({
                type: 'spark',
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                color,
                age: 0,
                maxAge: 0.45,
            });
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 背景の磁気チャンバー意匠
        this._renderChamberBackground(ctx);

        // グルーオンの引力線 (クォーク間の強い力)
        this._renderGluonBonds(ctx);

        // 粒子本体の描画
        for (const p of this.particles) {
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = p.color;

            // 発光グラデーション
            const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.5, p.color);
            grad.addColorStop(1, p.color + 'aa');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // 記号ラベル
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.symbol, p.x, p.y);

            ctx.restore();
        }

        // エフェクトの描画
        for (const eff of this.effects) {
            const progress = eff.age / eff.maxAge;
            if (eff.type === 'hadron_flash') {
                const alpha = Math.max(0, 1 - progress);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = eff.color;
                ctx.shadowBlur = 20;
                ctx.shadowColor = eff.color;

                // 拡大する光輪
                const radius = 10 + progress * 40;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, radius, 0, Math.PI * 2);
                ctx.strokeStyle = eff.color;
                ctx.lineWidth = 3 * (1 - progress);
                ctx.stroke();

                // テキストラベルの上昇
                ctx.font = 'bold 12px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(eff.label, eff.x, eff.y - 15 - progress * 20);

                ctx.restore();
            } else if (eff.type === 'spark') {
                eff.x += eff.vx;
                eff.y += eff.vy;
                const alpha = Math.max(0, 1 - progress);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = eff.color;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    _renderChamberBackground(ctx) {
        // グリッド線
        ctx.strokeStyle = 'rgba(0, 180, 216, 0.07)';
        ctx.lineWidth = 1;
        const step = 30;
        for (let x = 0; x < this.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // 強い力結合エリアのインジケータ（中央）
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 77, 109, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, 60, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.textAlign = 'center';
        ctx.fillText('強い相互作用結合領域', this.width / 2, this.height / 2 - 45);
        ctx.restore();

        // 射出ガイド（下部中央）
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height, 24, Math.PI, 0);
        ctx.stroke();
        ctx.restore();
    }

    _renderGluonBonds(ctx) {
        const quarks = this.particles.filter(p => p.type === 'up' || p.type === 'down');
        const maxBondDist = 45;

        for (let i = 0; i < quarks.length; i++) {
            for (let j = i + 1; j < quarks.length; j++) {
                const q1 = quarks[i];
                const q2 = quarks[j];
                const dist = Math.hypot(q1.x - q2.x, q1.y - q2.y);
                if (dist < maxBondDist) {
                    const alpha = (1 - dist / maxBondDist) * 0.8;
                    ctx.save();
                    ctx.strokeStyle = `rgba(255, 209, 102, ${alpha})`;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.moveTo(q1.x, q1.y);
                    ctx.lineTo(q2.x, q2.y);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    }
}
