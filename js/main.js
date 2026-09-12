/**
 * main.js
 * ゲームのメインエントリーポイント、ゲームループ、イベントリスナー、UIバインディング
 */

import { state, formatNumber, formatEnergy, formatPower } from './state.js';
import { BUILDINGS, RESEARCH_TECH, ACHIEVEMENTS, PHYSICS } from './constants.js';
import { sound } from './audio.js';
import { ParticleChamber } from './canvas/ParticleChamber.js';
import { PlasmaReactor } from './canvas/PlasmaReactor.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { FusionSystem } from './systems/FusionSystem.js';
import { AutomationSystem } from './systems/AutomationSystem.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { CodexModal } from './ui/CodexModal.js';
import { GuideModal } from './ui/GuideModal.js';
import { LogView } from './ui/LogView.js';

class GameApp {
    constructor() {
        this.particleChamber = null;
        this.plasmaReactor = null;

        this.particleSystem = null;
        this.fusionSystem = null;
        this.automationSystem = null;
        this.upgradeSystem = null;

        this.codexModal = null;
        this.guideModal = null;
        this.logView = null;

        this.lastTime = performance.now();
        this.autoSaveTimer = 0;
    }

    init() {
        // 1. キャンバスの初期化
        const pCanvas = document.getElementById('particleCanvas');
        const rCanvas = document.getElementById('reactorCanvas');

        this.particleChamber = new ParticleChamber(pCanvas, (type) => {
            // キャンバス上で衝突結合したときのコールバック
            if (type === 'proton') {
                state.protons++;
                this.logView.add('素粒子の強い力により【陽子 p (uud)】が誕生しました！', 'info');
            } else if (type === 'neutron') {
                state.neutrons++;
                this.logView.add('素粒子の強い力により【中性子 n (udd)】が誕生しました！', 'info');
            }
            state.notify();
        });

        this.plasmaReactor = new PlasmaReactor(rCanvas, (x, y) => {
            // トカマクキャンバスクリック時のパルス圧縮
            this.fusionSystem.triggerManualIgnition();
        });

        // 2. システムの初期化
        this.particleSystem = new ParticleSystem(state, this.particleChamber);
        this.fusionSystem = new FusionSystem(state, this.plasmaReactor);
        this.automationSystem = new AutomationSystem(state, this.particleSystem);
        this.upgradeSystem = new UpgradeSystem(state);

        // 3. UI・モーダルの初期化
        const logEl = document.getElementById('logConsole');
        this.logView = new LogView(logEl);

        const codexEl = document.getElementById('codexModal');
        this.codexModal = new CodexModal(codexEl);

        const guideEl = document.getElementById('guideModal');
        this.guideModal = new GuideModal(guideEl);

        // 4. 保存データのロード
        if (state.load()) {
            this.logView.add('セーブデータを復帰しました。', 'info');
        } else {
            this.logView.add('FUSION GENESIS へようこそ。クォークを射出して陽子・中性子を創り出しましょう！', 'info');
        }

        // 5. イベントリスナーとUIバインディング
        this._bindUI();
        this._bindResize();

        // 6. メインループの開始
        requestAnimationFrame((t) => this.loop(t));
    }

    _bindResize() {
        const resize = () => {
            if (this.particleChamber) this.particleChamber.resize();
            if (this.plasmaReactor) this.plasmaReactor.resize();
        };
        window.addEventListener('resize', resize);
        // 初回サイズ合わせ
        setTimeout(resize, 100);
    }

    _bindUI() {
        // --- 素粒子射出ボタン ---
        document.getElementById('btnShootUp').addEventListener('click', () => {
            this.particleChamber.selectedType = 'up';
            this.particleSystem.shoot('up');
        });
        document.getElementById('btnShootDown').addEventListener('click', () => {
            this.particleChamber.selectedType = 'down';
            this.particleSystem.shoot('down');
        });
        document.getElementById('btnShootElectron').addEventListener('click', () => {
            this.particleChamber.selectedType = 'electron';
            this.particleSystem.shoot('electron');
        });

        // 連射ボタン
        document.getElementById('btnShootBulkUp').addEventListener('click', () => this.particleSystem.shootBulk('up', 10));
        document.getElementById('btnShootBulkDown').addEventListener('click', () => this.particleSystem.shootBulk('down', 10));
        document.getElementById('btnShootBulkElectron').addEventListener('click', () => this.particleSystem.shootBulk('electron', 10));

        // --- ハドロン・同位体合成ボタン ---
        document.getElementById('btnCraftProton').addEventListener('click', () => {
            const count = this.particleSystem.craftProton(1);
            if (count > 0) this.logView.add(`陽子 p を 1 個合成しました。`, 'info');
        });
        document.getElementById('btnCraftNeutron').addEventListener('click', () => {
            const count = this.particleSystem.craftNeutron(1);
            if (count > 0) this.logView.add(`中性子 n を 1 個合成しました。`, 'info');
        });

        document.getElementById('btnCraftHydrogen').addEventListener('click', () => {
            const count = this.particleSystem.craftHydrogen(1);
            if (count > 0) this.logView.add(`軽水素 ¹H を 1 個組み立てました。`, 'info');
        });
        document.getElementById('btnCraftDeuterium').addEventListener('click', () => {
            const count = this.particleSystem.craftDeuterium(1);
            if (count > 0) this.logView.add(`重水素 ²H (D) を 1 個組み立てました。`, 'success');
        });
        document.getElementById('btnCraftTritium').addEventListener('click', () => {
            const count = this.particleSystem.craftTritium(1);
            if (count > 0) this.logView.add(`三重水素 ³H (T) を 1 個組み立てました！`, 'fusion');
        });
        document.getElementById('btnQuickCraftAll').addEventListener('click', () => {
            const res = this.particleSystem.craftAllIsotopes();
            const total = res.protons + res.neutrons + res.deuterium + res.tritium;
            if (total > 0) {
                const parts = [];
                if (res.protons > 0) parts.push(`陽子 +${formatNumber(res.protons)}`);
                if (res.neutrons > 0) parts.push(`中性子 +${formatNumber(res.neutrons)}`);
                if (res.deuterium > 0) parts.push(`重水素 +${formatNumber(res.deuterium)}`);
                if (res.tritium > 0) parts.push(`三重水素 +${formatNumber(res.tritium)}`);
                this.logView.add(`⚡ 一括全合成完了: ${parts.join(', ')}`, 'success');
            } else {
                this.logView.add(`合成可能なクォークまたは核子が不足しています。`, 'info');
            }
        });

        // --- トカマク炉心操作 ---
        document.getElementById('btnInjectD').addEventListener('click', () => {
            const amt = Math.max(1, Math.floor(state.deuterium * 0.5));
            if (this.fusionSystem.injectFuel(amt, 0)) {
                this.logView.add(`重水素 ${amt} 個を炉心プラズマへ注入しました。`, 'info');
            }
        });
        document.getElementById('btnInjectT').addEventListener('click', () => {
            const amt = Math.max(1, Math.floor(state.tritium * 0.5));
            if (this.fusionSystem.injectFuel(0, amt)) {
                this.logView.add(`三重水素 ${amt} 個を炉心プラズマへ注入しました。`, 'info');
            }
        });

        const chkContinuous = document.getElementById('chkContinuousFuel');
        chkContinuous.checked = state.reactor.continuousInjection;
        chkContinuous.addEventListener('change', (e) => {
            state.reactor.continuousInjection = e.target.checked;
            this.logView.add(`自動燃料注入: ${e.target.checked ? 'ON' : 'OFF'}`, 'info');
        });

        document.getElementById('btnIgnitePulse').addEventListener('click', () => {
            const ignited = this.fusionSystem.triggerManualIgnition();
            if (ignited) {
                this.logView.add(`⚡ 磁気パルス点火成功！ 核融合反応が発生しました！`, 'fusion');
            } else {
                this.logView.add(`燃料（重水素 D または 三重水素 T）を炉心に注入してください。`, 'info');
            }
        });

        // リチウム-6 備蓄補充
        document.getElementById('btnBuyLithium').addEventListener('click', () => {
            if (this.automationSystem.buyLithium(20)) {
                this.logView.add(`リチウム-6備蓄を20個補充しました (100 MeV消費)。`, 'breeding');
            } else {
                this.logView.add(`エネルギーが不足しています (必要: 100 MeV)。`, 'info');
            }
        });

        // --- タブ切り替え ---
        const tabB = document.getElementById('tabBuildingsBtn');
        const tabR = document.getElementById('tabResearchBtn');
        const tabS = document.getElementById('tabStatsBtn');

        const contentB = document.getElementById('tabBuildingsContent');
        const contentR = document.getElementById('tabResearchContent');
        const contentS = document.getElementById('tabStatsContent');

        const setTab = (activeBtn, activeContent) => {
            [tabB, tabR, tabS].forEach(b => b.classList.remove('active'));
            [contentB, contentR, contentS].forEach(c => c.style.display = 'none');
            activeBtn.classList.add('active');
            activeContent.style.display = 'block';
        };

        tabB.addEventListener('click', () => setTab(tabB, contentB));
        tabR.addEventListener('click', () => setTab(tabR, contentR));
        tabS.addEventListener('click', () => setTab(tabS, contentS));

        // --- ヘッダー操作 ---
        document.getElementById('soundBtn').addEventListener('click', (e) => {
            const muted = sound.toggleMute();
            e.target.textContent = muted ? '🔇 音声: OFF' : '🔊 音声: ON';
        });

        const speedBtn = document.getElementById('speedBtn');
        const speedVal = document.getElementById('speedVal');
        const speeds = [1.0, 2.0, 5.0, 10.0];
        speedBtn.addEventListener('click', () => {
            const curIdx = speeds.indexOf(state.speed);
            const nextIdx = (curIdx + 1) % speeds.length;
            state.speed = speeds[nextIdx];
            speedVal.textContent = `${state.speed}x`;
        });

        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.addEventListener('click', () => {
            state.paused = !state.paused;
            pauseBtn.textContent = state.paused ? '▶️' : '⏸️';
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            if (state.save()) {
                this.showToast('💾 ゲームを保存しました');
            }
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            if (confirm('ゲームデータをリセットして最初からやり直しますか？')) {
                state.clearSave();
                location.reload();
            }
        });

        // 攻略手順書モーダルオープン
        document.getElementById('guideBtn').addEventListener('click', () => {
            this.guideModal.open();
        });

        const linkReactorGuide = document.getElementById('linkOpenGuideFromReactor');
        if (linkReactorGuide) {
            linkReactorGuide.addEventListener('click', () => {
                this.guideModal.open('q_factor_mechanics');
            });
        }

        // 図鑑モーダルオープン
        document.getElementById('codexBtn').addEventListener('click', () => {
            this.codexModal.open();
        });

        // 実績モーダルオープン
        document.getElementById('achievementsBtn').addEventListener('click', () => {
            this._renderAchievementsModal();
            document.getElementById('achievementsModal').classList.add('active');
        });
        document.getElementById('achCloseBtn').addEventListener('click', () => {
            document.getElementById('achievementsModal').classList.remove('active');
        });

        // 状態変更通知の受診
        state.subscribe(() => {
            this._updateDynamicUI();
        });

        // 初回施設・研究リスト描画
        this._renderBuildingList();
        this._renderResearchList();
        this._updateDynamicUI();
    }

    _renderBuildingList() {
        const container = document.getElementById('buildingList');
        if (!container) return;

        container.innerHTML = BUILDINGS.map(b => {
            const cost = state.getBuildingCost(b.id);
            const count = state.buildings[b.id] || 0;
            const costText = Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(', ');

            return `
                <div class="building-card" id="bcard-${b.id}">
                    <div class="b-left">
                        <span class="b-icon">${b.icon}</span>
                        <div class="b-info">
                            <span class="b-name">${b.name}</span>
                            <span class="b-desc">${b.desc}</span>
                            <span class="b-cost">コスト: ${costText}</span>
                        </div>
                    </div>
                    <div class="b-right">
                        <span class="b-count">${formatNumber(count)}</span>
                        <button class="btn btn-small btn-primary buy-building-btn" data-id="${b.id}">建設</button>
                    </div>
                </div>
            `;
        }).join('');

        // イベントバインド
        container.querySelectorAll('.buy-building-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.getAttribute('data-id');
                if (this.automationSystem.buyBuilding(bId)) {
                    const def = BUILDINGS.find(b => b.id === bId);
                    this.logView.add(`【${def.name}】を建設しました！`, 'success');
                    this._renderBuildingList();
                    this._updateDynamicUI();
                }
            });
        });
    }

    _renderResearchList() {
        const container = document.getElementById('researchList');
        if (!container) return;

        container.innerHTML = RESEARCH_TECH.map(t => {
            const unlocked = state.unlockedTechs[t.id];
            const costText = Object.entries(t.cost).map(([k, v]) => `${v} ${k}`).join(', ');

            return `
                <div class="building-card" style="${unlocked ? 'opacity: 0.6; border-color: var(--c-deuterium);' : ''}">
                    <div class="b-left">
                        <span class="b-icon">🔬</span>
                        <div class="b-info">
                            <span class="b-name">${t.name}</span>
                            <span class="b-desc">${t.desc}</span>
                            <span class="b-cost">必要研究資源: ${costText}</span>
                        </div>
                    </div>
                    <div class="b-right">
                        ${unlocked 
                            ? `<span style="color: var(--c-deuterium); font-weight: bold; font-size: 11px;">✓ 研究完了</span>`
                            : `<button class="btn btn-small btn-action research-tech-btn" data-id="${t.id}">研究開始</button>`
                        }
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.research-tech-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tId = btn.getAttribute('data-id');
                if (this.upgradeSystem.research(tId)) {
                    const def = RESEARCH_TECH.find(t => t.id === tId);
                    this.logView.add(`研究完了: 【${def.name}】を習得しました！`, 'fusion');
                    this._renderResearchList();
                    this._updateDynamicUI();
                }
            });
        });
    }

    _renderAchievementsModal() {
        const container = document.getElementById('achievementsList');
        if (!container) return;

        container.innerHTML = ACHIEVEMENTS.map(a => {
            const unlocked = state.achievements[a.id];
            return `
                <div class="building-card" style="margin-bottom: 8px; ${unlocked ? 'border-color: var(--c-plasma);' : 'opacity: 0.5;'}">
                    <div class="b-left">
                        <span class="b-icon">${unlocked ? '🏆' : '🔒'}</span>
                        <div class="b-info">
                            <span class="b-name" style="${unlocked ? 'color: var(--c-plasma);' : ''}">${a.title}</span>
                            <span class="b-desc">${a.desc}</span>
                        </div>
                    </div>
                    <div class="b-right">
                        <span style="font-size: 11px; font-weight: bold; color: ${unlocked ? 'var(--c-deuterium)' : 'var(--text-muted)'};">
                            ${unlocked ? '達成済' : '未達成'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    showToast(message, icon = '✨') {
        const toast = document.getElementById('toastNotification');
        document.getElementById('toastText').textContent = message;
        document.getElementById('toastIcon').textContent = icon;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    _updateDynamicUI() {
        // リソース表示
        document.getElementById('resEnergy').textContent = formatEnergy(state.energy);
        document.getElementById('resUp').textContent = formatNumber(state.upQuarks);
        document.getElementById('resDown').textContent = formatNumber(state.downQuarks);
        document.getElementById('resElectron').textContent = formatNumber(state.electrons);
        document.getElementById('resProton').textContent = formatNumber(state.protons);
        document.getElementById('resNeutron').textContent = formatNumber(state.neutrons);
        document.getElementById('resDeuterium').textContent = formatNumber(state.deuterium);
        document.getElementById('resTritium').textContent = formatNumber(state.tritium);
        document.getElementById('resHelium').textContent = formatNumber(state.helium);
        document.getElementById('resFastNeutron').textContent = formatNumber(state.fastNeutrons);
        document.getElementById('resLithium6').textContent = formatNumber(state.lithium6);

        // トカマクHUD
        const r = state.reactor;
        const tempMillionC = (r.temperatureKeV * 11.6).toFixed(0);
        document.getElementById('txtTemperature').textContent = `${r.temperatureKeV.toFixed(2)} keV (${tempMillionC}万℃)`;
        document.getElementById('txtFusionPower').textContent = formatPower(r.fusionPowerMW);
        document.getElementById('txtQValue').textContent = r.qValue.toFixed(2);
        document.getElementById('txtMagField').textContent = `${r.magneticFieldTesla.toFixed(1)} T`;

        document.getElementById('txtChamberD').textContent = formatNumber(r.chamberFuelD);
        document.getElementById('txtChamberT').textContent = formatNumber(r.chamberFuelT);

        // ローソン3重積ゲージ
        const tripleProdVal = this.fusionSystem.getTripleProduct();
        const tripleProd10_21 = tripleProdVal / 1e21;
        document.getElementById('txtTripleProduct').textContent = `${tripleProd10_21.toFixed(2)} × 10²¹ keV·s/m³`;

        const progressPercent = Math.min(100, Math.max(0, (tripleProdVal / PHYSICS.LAWSON_IGNITION) * 100));
        document.getElementById('lawsonProgressFill').style.width = `${progressPercent}%`;

        // 統計
        document.getElementById('statTotalFusions').textContent = formatNumber(state.stats.totalFusions);
        document.getElementById('statTotalEnergy').textContent = formatEnergy(state.stats.totalEnergyProduced);
        document.getElementById('statMaxQ').textContent = state.stats.maxQ.toFixed(2);
        document.getElementById('statPlayTime').textContent = `${Math.floor(state.stats.timePlayed)} 秒`;
        document.getElementById('statTauE').textContent = `${r.confinementTime.toFixed(2)} s`;
        document.getElementById('statDensity').textContent = `${r.density.toFixed(2)} × 10²⁰ m⁻³`;
        document.getElementById('statHeatingPower').textContent = `${r.heatingPowerMW.toFixed(2)} MW`;

        // ボタンの活性/非活性状態更新
        document.getElementById('btnCraftProton').disabled = (state.upQuarks < 2 || state.downQuarks < 1);
        document.getElementById('btnCraftNeutron').disabled = (state.upQuarks < 1 || state.downQuarks < 2);
        document.getElementById('btnCraftHydrogen').disabled = (state.protons < 1 || state.electrons < 1);
        document.getElementById('btnCraftDeuterium').disabled = (state.protons < 1 || state.neutrons < 1 || state.electrons < 1);
        document.getElementById('btnCraftTritium').disabled = (state.protons < 1 || state.neutrons < 2 || state.electrons < 1);
    }

    loop(currentTime) {
        const deltaMs = currentTime - this.lastTime;
        this.lastTime = currentTime;

        let dt = Math.min(deltaMs / 1000, 0.1); // 最大でも0.1秒クリップ

        if (!state.paused) {
            const simDt = dt * state.speed;

            state.stats.timePlayed += simDt;

            // 各システム更新
            this.particleChamber.update(simDt);
            this.fusionSystem.update(simDt);
            this.plasmaReactor.update(simDt, state.reactor);
            this.automationSystem.update(simDt);

            // 自動セーブ (15秒毎)
            this.autoSaveTimer += simDt;
            if (this.autoSaveTimer >= 15.0) {
                this.autoSaveTimer = 0;
                state.save();
            }
        }

        // 描画更新
        this.particleChamber.render();
        this.plasmaReactor.render(state.reactor);

        this._updateDynamicUI();

        requestAnimationFrame((t) => this.loop(t));
    }
}

// ゲーム起動
window.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
    app.init();
    window.__app = app; // デバッグ用グローバル公開
});
