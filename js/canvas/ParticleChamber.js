/**
 * ParticleChamber.js (v2.0 Quantum Chromodynamics Chamber)
 * 素粒子（クォーク・レプトン）の射出、軌跡リボン、波状グルーオンフラックスチューブ、
 * 強い相互作用によるハドロン合成、および磁気ピンセット（ドラッグ引力）を
 * シミュレート・高精細描画するインタラクティブ物理キャンバス
 */

import { PARTICLES } from '../constants.js';
import { sound } from '../audio.js';

export class ParticleChamber {
    constructor(canvas, onHadronCreated) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onHadronCreated = onHadronCreated; // (type: 'proton' | 'neutron') => void

        this.particles = [];
        this.effects = []; // フラッシュ、衝撃波、スパーク、ホログラムラベル
        this.backgroundStars = [];
        this.maxParticles = 75;

        this.width = canvas.width || 320;
        this.height = canvas.height || 240;
        this.time = 0;

        this.selectedType = 'up'; // プレイヤーが直接クリックして発射する粒子

        // マウスインタラクション（クリックで射出、長押し/ドラッグで量子渦アトラクター）
        this.pointer = { x: 0, y: 0, active: false, downTime: 0, isDragging: false };

        // 自動生産エフェクト用タイマー
        this.autoSpawnTimer = 0;
        this.activeAutoRates = { up: 0, down: 0, electron: 0 };

        this._initBackgroundField();
        this._setupEvents();
    }

    _initBackgroundField() {
        this.backgroundStars = [];
        for (let i = 0; i < 28; i++) {
            this.backgroundStars.push({
                x: Math.random(),
                y: Math.random(),
                r: 0.6 + Math.random() * 1.4,
                phase: Math.random() * Math.PI * 2,
                speed: 1 + Math.random() * 2,
            });
        }
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.width = rect.width;
            this.height = rect.height;
        }
    }

    _setupEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            this.pointer.x = pos.x;
            this.pointer.y = pos.y;
            this.pointer.active = true;
            this.pointer.downTime = performance.now();
            this.pointer.isDragging = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = getPos(e);
            this.pointer.x = pos.x;
            this.pointer.y = pos.y;
            if (this.pointer.active && performance.now() - this.pointer.downTime > 140) {
                this.pointer.isDragging = true;
            }
        });

        window.addEventListener('mouseup', () => {
            this.pointer.active = false;
            this.pointer.isDragging = false;
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 発射位置（中央下）からクリック地点に向かって射出
            const startX = this.width / 2;
            const startY = this.height - 18;
            const angle = Math.atan2(y - startY, x - startX);
            const speed = 5.5 + Math.random() * 2.5;

            this.shootParticle(this.selectedType, startX, startY, Math.cos(angle) * speed, Math.sin(angle) * speed);
        });
    }

    // 粒子の射出
    shootParticle(type, x, y, vx, vy, isAuto = false) {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift();
        }

        const info = type === 'up' ? PARTICLES.UP : (type === 'down' ? PARTICLES.DOWN : PARTICLES.ELECTRON);
        const px = x ?? this.width / 2 + (Math.random() - 0.5) * 36;
        const py = y ?? this.height - 24;

        this.particles.push({
            type,
            name: info.name,
            symbol: info.symbol,
            charge: type === 'up' ? 2 / 3 : (type === 'down' ? -1 / 3 : -1),
            color: info.color,
            radius: type === 'electron' ? 5.5 : 8.5,
            x: px,
            y: py,
            vx: vx ?? (Math.random() - 0.5) * 6.5,
            vy: vy ?? -(4.5 + Math.random() * 4),
            age: 0,
            spinPhase: Math.random() * Math.PI * 2,
            bound: false,
            trail: [{ x: px, y: py }],
        });

        // 発射口マズルフラッシュ
        this.effects.push({
            type: 'muzzle',
            x: px,
            y: py,
            color: info.color,
            age: 0,
            maxAge: 0.22,
        });

        if (!isAuto) {
            sound.playShoot(type);
        }
    }

    // 自動抽出機からのスポーン演出
    spawnAutoParticle(type) {
        const fromLeft = Math.random() < 0.5;
        const startX = fromLeft ? 34 + Math.random() * 20 : this.width - (34 + Math.random() * 20);
        const startY = 18;
        const targetX = this.width / 2 + (Math.random() - 0.5) * 65;
        const targetY = this.height / 2 + (Math.random() - 0.5) * 45;
        const angle = Math.atan2(targetY - startY, targetX - startX);
        const speed = 2.8 + Math.random() * 2.4;

        this.shootParticle(type, startX, startY, Math.cos(angle) * speed, Math.sin(angle) * speed, true);
    }

    // 合成エフェクト（手動ボタン押下時または自動結合炉の稼働時）
    createSynthesisEffect(label, color = '#00f5d4') {
        const cx = this.width / 2 + (Math.random() - 0.5) * 34;
        const cy = this.height / 2 + (Math.random() - 0.5) * 24;

        this.effects.push({
            type: 'hadron_flash',
            x: cx,
            y: cy,
            color: color,
            label: label,
            age: 0,
            maxAge: 1.0,
        });

        // 二重衝撃波リング
        this.effects.push({
            type: 'shockwave',
            x: cx,
            y: cy,
            color: '#ffffff',
            age: 0,
            maxAge: 0.55,
            maxRadius: 58,
        });

        // 放射状スパーク
        for (let i = 0; i < 18; i++) {
            const ang = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.25;
            const spd = 2.2 + Math.random() * 4.0;
            this.effects.push({
                type: 'spark',
                x: cx,
                y: cy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                color: i % 3 === 0 ? '#ffffff' : color,
                age: 0,
                maxAge: 0.55,
            });
        }
    }

    update(dt = 1 / 60, autoRates = null) {
        this.time += dt;
        if (autoRates) {
            this.activeAutoRates = autoRates;
        }

        // 自動抽出粒子スポーン処理
        const totalAutoRate = (this.activeAutoRates.up || 0) + (this.activeAutoRates.down || 0) + (this.activeAutoRates.electron || 0);
        if (totalAutoRate > 0) {
            this.autoSpawnTimer += dt;
            const spawnInterval = Math.max(0.15, 1.1 / Math.min(totalAutoRate, 12));
            if (this.autoSpawnTimer >= spawnInterval) {
                this.autoSpawnTimer = 0;
                const pool = [];
                if (this.activeAutoRates.up > 0) pool.push('up');
                if (this.activeAutoRates.down > 0) pool.push('down');
                if (this.activeAutoRates.electron > 0) pool.push('electron');
                if (pool.length > 0) {
                    const picked = pool[Math.floor(Math.random() * pool.length)];
                    this.spawnAutoParticle(picked);
                }
            }
        }

        const bounceDamping = 0.86;
        const drag = 0.993;
        const cx = this.width / 2;
        const cy = this.height / 2;

        // 1. 物理挙動更新
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.age += dt;
            p.spinPhase += dt * 6;

            // 中央の弱い磁気トラップ引力（クォークが中央で出会いやすくする）
            const dxCenter = cx - p.x;
            const dyCenter = cy - p.y;
            const distCenter = Math.hypot(dxCenter, dyCenter) || 1;
            if (distCenter > 55) {
                p.vx += (dxCenter / distCenter) * 0.035;
                p.vy += (dyCenter / distCenter) * 0.035;
            }

            // マウスドラッグ時の量子ピンセット引力
            if (this.pointer.active) {
                const dxP = this.pointer.x - p.x;
                const dyP = this.pointer.y - p.y;
                const distP = Math.hypot(dxP, dyP) || 1;
                if (distP < 120) {
                    p.vx += (dxP / distP) * 0.22;
                    p.vy += (dyP / distP) * 0.22;
                }
            }

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= drag;
            p.vy *= drag;

            // 軌跡(Trail)記録
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 9) {
                p.trail.shift();
            }

            // 壁との衝突
            const margin = p.radius + 7;
            if (p.x < margin) {
                p.x = margin;
                p.vx = Math.abs(p.vx) * bounceDamping;
            } else if (p.x > this.width - margin) {
                p.x = this.width - margin;
                p.vx = -Math.abs(p.vx) * bounceDamping;
            }

            if (p.y < margin) {
                p.y = margin;
                p.vy = Math.abs(p.vy) * bounceDamping;
            } else if (p.y > this.height - margin) {
                p.y = this.height - margin;
                p.vy = -Math.abs(p.vy) * bounceDamping;
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
        const captureDist = 30;

        for (let i = 0; i < quarks.length; i++) {
            for (let j = i + 1; j < quarks.length; j++) {
                const q1 = quarks[i];
                const q2 = quarks[j];
                const d12 = Math.hypot(q1.x - q2.x, q1.y - q2.y);

                // 2クォーク間の強い相互作用引力
                if (d12 < captureDist * 1.8 && d12 > 4) {
                    const force = 0.048;
                    const fx = ((q2.x - q1.x) / d12) * force;
                    const fy = ((q2.y - q1.y) / d12) * force;
                    q1.vx += fx;
                    q1.vy += fy;
                    q2.vx -= fx;
                    q2.vy -= fy;
                }

                for (let k = j + 1; k < quarks.length; k++) {
                    const q3 = quarks[k];
                    if (q1.bound || q2.bound || q3.bound) continue;

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

                            this._createHadronEffect(cx, cy, hadronType);
                            this.particles = this.particles.filter(p => !p.bound);

                            sound.playHadronBond();
                            if (this.onHadronCreated) {
                                this.onHadronCreated(hadronType);
                            }
                            return;
                        }
                    }
                }
            }
        }
    }

    _createHadronEffect(x, y, hadronType) {
        const isProton = hadronType === 'proton';
        const color = isProton ? '#ff2a6d' : '#00d2ff';
        const label = isProton ? '⚡ 陽子 p (uud)' : '⚡ 中性子 n (udd)';

        this.effects.push({
            type: 'hadron_flash',
            x,
            y,
            color,
            label,
            age: 0,
            maxAge: 0.95,
        });

        this.effects.push({
            type: 'shockwave',
            x,
            y,
            color,
            age: 0,
            maxAge: 0.5,
            maxRadius: 52,
        });

        for (let i = 0; i < 16; i++) {
            const ang = (Math.PI * 2 * i) / 16;
            const spd = 2.2 + Math.random() * 3.5;
            this.effects.push({
                type: 'spark',
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                color: i % 2 === 0 ? '#ffffff' : color,
                age: 0,
                maxAge: 0.5,
            });
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. 量子フィールド背景 & 磁気閉じ込めリング
        this._renderChamberBackground(ctx);

        // 2. グルーオンフラックスチューブ（波状の強い相互作用弦）
        this._renderGluonBonds(ctx);

        // 3. 粒子軌跡と粒子本体
        this._renderParticles(ctx);

        // 4. 合成・衝撃波エフェクト
        this._renderEffects(ctx);
    }

    _renderChamberBackground(ctx) {
        const cx = this.width / 2;
        const cy = this.height / 2;

        // 放射状ダークビネット背景
        const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(this.width, this.height) * 0.75);
        bgGrad.addColorStop(0, 'rgba(16, 32, 58, 0.55)');
        bgGrad.addColorStop(0.6, 'rgba(8, 15, 28, 0.85)');
        bgGrad.addColorStop(1, 'rgba(4, 8, 16, 0.98)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 量子真空ゆらぎ粒子（背景の煌めき）
        for (const s of this.backgroundStars) {
            const alpha = 0.12 + 0.18 * Math.sin(this.time * s.speed + s.phase);
            ctx.fillStyle = `rgba(110, 220, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x * this.width, s.y * this.height, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // サイバーグリッド線
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.055)';
        ctx.lineWidth = 1;
        const step = 28;
        for (let x = (this.width % step) / 2; x < this.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = (this.height % step) / 2; y < this.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // 中央 QCD 強い相互作用コンファインメントサークル
        ctx.save();
        ctx.translate(cx, cy);

        // 外周回転目盛りリング
        ctx.rotate(this.time * 0.25);
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 68, 0, Math.PI * 2);
        ctx.stroke();

        // 逆回転内周リング
        ctx.rotate(-this.time * 0.6);
        ctx.strokeStyle = 'rgba(255, 77, 109, 0.24)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // マウスドラッグ時の磁気トラップ渦エフェクト
        if (this.pointer.active) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 245, 212, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.pointer.x, this.pointer.y, 18 + Math.sin(this.time * 12) * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 中央ラベル
        ctx.save();
        ctx.font = '600 9px "JetBrains Mono", "Segoe UI", monospace';
        ctx.fillStyle = 'rgba(160, 210, 245, 0.35)';
        ctx.textAlign = 'center';
        ctx.fillText('QCD STRONG FORCE CONFINEMENT ZONE', cx, cy - 55);
        ctx.restore();

        // 下部 粒子エミッター砲台デザイン
        const selColor = this.selectedType === 'up' ? '#ff4d6d' : (this.selectedType === 'down' ? '#4cc9f0' : '#ffd166');
        ctx.save();
        ctx.strokeStyle = selColor;
        ctx.fillStyle = 'rgba(10, 18, 32, 0.9)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = selColor;
        ctx.beginPath();
        ctx.arc(cx, this.height + 4, 24, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = selColor;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`EMIT: ${this.selectedType.toUpperCase()}`, cx, this.height - 5);
        ctx.restore();

        // 上部 自動インジェクターノズル (左右)
        const totalAuto = (this.activeAutoRates.up || 0) + (this.activeAutoRates.down || 0) + (this.activeAutoRates.electron || 0);
        const nozzleActive = totalAuto > 0;
        ctx.save();
        ctx.fillStyle = nozzleActive ? 'rgba(0, 245, 212, 0.25)' : 'rgba(255, 255, 255, 0.06)';
        ctx.strokeStyle = nozzleActive ? '#00f5d4' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;

        // 左ノズル台形
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(60, 0);
        ctx.lineTo(54, 12);
        ctx.lineTo(30, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 右ノズル台形
        ctx.beginPath();
        ctx.moveTo(this.width - 60, 0);
        ctx.lineTo(this.width - 24, 0);
        ctx.lineTo(this.width - 30, 12);
        ctx.lineTo(this.width - 54, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (nozzleActive) {
            ctx.font = 'bold 9px "JetBrains Mono", "Segoe UI", monospace';
            ctx.fillStyle = '#00f5d4';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#00f5d4';
            ctx.fillText(`⚡ AUTO-INJECTOR: +${totalAuto.toFixed(1)}/s`, cx, 13);
        }
        ctx.restore();
    }

    _renderGluonBonds(ctx) {
        const quarks = this.particles.filter(p => p.type === 'up' || p.type === 'down');
        const maxBondDist = 54;

        for (let i = 0; i < quarks.length; i++) {
            for (let j = i + 1; j < quarks.length; j++) {
                const q1 = quarks[i];
                const q2 = quarks[j];
                const dist = Math.hypot(q1.x - q2.x, q1.y - q2.y);
                if (dist < maxBondDist && dist > 1) {
                    const alpha = (1 - dist / maxBondDist) * 0.9;
                    ctx.save();
                    ctx.strokeStyle = `rgba(255, 215, 100, ${alpha})`;
                    ctx.lineWidth = 2;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#ffd166';

                    // 波状のグルーオン・フラックスチューブ描画
                    const steps = 10;
                    const dx = q2.x - q1.x;
                    const dy = q2.y - q1.y;
                    const nx = -dy / dist;
                    const ny = dx / dist;

                    ctx.beginPath();
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        const wave = Math.sin(t * Math.PI * 4 + this.time * 18) * 3.2 * Math.sin(t * Math.PI);
                        const px = q1.x + dx * t + nx * wave;
                        const py = q1.y + dy * t + ny * wave;
                        if (s === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    }

    _renderParticles(ctx) {
        for (const p of this.particles) {
            ctx.save();

            // 1. モーショントレイル（軌跡リボン）の描画
            if (p.trail && p.trail.length > 1) {
                for (let t = 0; t < p.trail.length - 1; t++) {
                    const ratio = (t + 1) / p.trail.length;
                    ctx.strokeStyle = p.color;
                    ctx.globalAlpha = ratio * 0.35;
                    ctx.lineWidth = p.radius * ratio * 1.1;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p.trail[t].x, p.trail[t].y);
                    ctx.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
                    ctx.stroke();
                }
            }

            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 14;
            ctx.shadowColor = p.color;

            // 2. クォーク/レプトンの外周スピン軌道リング
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 3, p.spinPhase, p.spinPhase + Math.PI * 1.3);
            ctx.stroke();

            // 3. 発光コアグラデーション
            const grad = ctx.createRadialGradient(p.x - p.radius * 0.25, p.y - p.radius * 0.25, 1, p.x, p.y, p.radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.45, p.color);
            grad.addColorStop(1, p.color + '88');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // 4. 記号ラベル
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#060b14';
            ctx.font = '800 9px "JetBrains Mono", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.symbol, p.x, p.y + 0.5);

            ctx.restore();
        }
    }

    _renderEffects(ctx) {
        for (const eff of this.effects) {
            const progress = eff.age / eff.maxAge;
            const alpha = Math.max(0, 1 - progress);

            if (eff.type === 'muzzle') {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = eff.color;
                ctx.shadowBlur = 12;
                ctx.shadowColor = eff.color;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, 6 + progress * 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (eff.type === 'shockwave') {
                ctx.save();
                ctx.globalAlpha = alpha * 0.75;
                ctx.strokeStyle = eff.color;
                ctx.lineWidth = 2.5 * (1 - progress);
                ctx.shadowBlur = 12;
                ctx.shadowColor = eff.color;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, 6 + progress * eff.maxRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (eff.type === 'hadron_flash') {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = 18;
                ctx.shadowColor = eff.color;

                // 拡大する二重光輪
                const radius = 10 + progress * 44;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, radius, 0, Math.PI * 2);
                ctx.strokeStyle = eff.color;
                ctx.lineWidth = 3 * (1 - progress);
                ctx.stroke();

                // ホログラムタグ付きラベルの上昇
                const ly = eff.y - 16 - progress * 24;
                ctx.font = 'bold 11px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
                const textW = ctx.measureText(eff.label).width + 14;
                ctx.fillRect(eff.x - textW / 2, ly - 10, textW, 18);
                ctx.strokeStyle = eff.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(eff.x - textW / 2, ly - 10, textW, 18);

                ctx.fillStyle = '#ffffff';
                ctx.fillText(eff.label, eff.x, ly + 2);
                ctx.restore();
            } else if (eff.type === 'spark') {
                eff.x += eff.vx;
                eff.y += eff.vy;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = eff.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(eff.x - eff.vx * 1.5, eff.y - eff.vy * 1.5);
                ctx.lineTo(eff.x, eff.y);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
}
