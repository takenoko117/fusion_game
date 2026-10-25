/**
 * main.js (v2.0 Hyper-Torus Edition)
 * ゲームのメインエントリーポイント、ゲームループ、UIバインディング、
 * 3D/ポロイダル視点切替、ミッションナビゲーション、カテゴリフィルタ＆一括建設制御
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

        // UI状態 (v2.0)
        this.buildingFilter = 'all'; // 'all' | 'particle' | 'fusion' | 'resource'
        this.buyMultiplier = 1;      // 1 | 10 | 'max'
        this.lastUnlockedBuildingCount = -1;

        // アンロック通知履歴
        this.unlockHistory = {
            isotopeCrafting: false,
            reactorUnlocked: false,
            expansionUnlocked: false,
            researchUnlocked: false,
        };
    }

    init() {
        // 1. キャンバスの初期化
        const pCanvas = document.getElementById('particleCanvas');
        const rCanvas = document.getElementById('reactorCanvas');

        this.particleChamber = new ParticleChamber(pCanvas, (type) => {
            if (type === 'proton') {
                state.protons++;
                this.logView.add('素粒子の強い力により【陽子 p (uud)】が誕生しました！', 'info');
            } else if (type === 'neutron') {
                state.neutrons++;
                this.logView.add('素粒子の強い力により【中性子 n (udd)】が誕生しました！', 'info');
            }
            state.notify();
        });

        this.plasmaReactor = new PlasmaReactor(rCanvas, () => {
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
            this.logView.add('セーブデータを復帰しました (FUSION GENESIS v2.0)。', 'info');
            if (state.protons > 0 || state.neutrons > 0 || state.stats.totalFusions > 0) this.unlockHistory.isotopeCrafting = true;
            if (state.deuterium > 0 || state.tritium > 0 || state.stats.totalFusions > 0) this.unlockHistory.reactorUnlocked = true;
            if (state.stats.totalFusions > 0 || state.energy > 0) this.unlockHistory.expansionUnlocked = true;
            if (state.stats.totalEnergyProduced >= 100) this.unlockHistory.researchUnlocked = true;
        } else {
            this.logView.add('FUSION GENESIS v2.0 へようこそ。クォークを射出して陽子・中性子を創り出しましょう！', 'info');
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
        setTimeout(resize, 100);
    }

    _setSelectedEmitter(type) {
        this.particleChamber.selectedType = type;
        const map = {
            up: document.getElementById('btnShootUp'),
            down: document.getElementById('btnShootDown'),
            electron: document.getElementById('btnShootElectron'),
        };
        Object.entries(map).forEach(([k, el]) => {
            if (!el) return;
            el.classList.toggle('is-selected', k === type);
        });
    }

    _bindUI() {
        // --- 素粒子射出ボタン ---
        document.getElementById('btnShootUp').addEventListener('click', () => {
            this._setSelectedEmitter('up');
            this.particleSystem.shoot('up');
        });
        document.getElementById('btnShootDown').addEventListener('click', () => {
            this._setSelectedEmitter('down');
            this.particleSystem.shoot('down');
        });
        document.getElementById('btnShootElectron').addEventListener('click', () => {
            this._setSelectedEmitter('electron');
            this.particleSystem.shoot('electron');
        });

        // 連射ボタン
        document.getElementById('btnShootBulkUp').addEventListener('click', () => {
            this._setSelectedEmitter('up');
            this.particleSystem.shootBulk('up', 10);
        });
        document.getElementById('btnShootBulkDown').addEventListener('click', () => {
            this._setSelectedEmitter('down');
            this.particleSystem.shootBulk('down', 10);
        });
        document.getElementById('btnShootBulkElectron').addEventListener('click', () => {
            this._setSelectedEmitter('electron');
            this.particleSystem.shootBulk('electron', 10);
        });

        // キーボードショートカット (1: u, 2: d, 3: e-)
        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            if (e.key === '1') {
                this._setSelectedEmitter('up');
                this.particleSystem.shoot('up');
            } else if (e.key === '2') {
                this._setSelectedEmitter('down');
                this.particleSystem.shoot('down');
            } else if (e.key === '3') {
                this._setSelectedEmitter('electron');
                this.particleSystem.shoot('electron');
            }
        });

        // --- ハドロン・同位体合成ボタン (+1 および MAX) ---
        document.getElementById('btnCraftProton').addEventListener('click', () => {
            const count = this.particleSystem.craftProton(1);
            if (count > 0) {
                this.logView.add(`陽子 p を 1 個合成しました。`, 'info');
                this.particleChamber.createSynthesisEffect('+1 陽子 p', '#ff2a6d');
            }
        });
        const btnProtonMax = document.getElementById('btnCraftProtonMax');
        if (btnProtonMax) {
            btnProtonMax.addEventListener('click', () => {
                const maxP = Math.min(Math.floor(state.upQuarks / 2), Math.floor(state.downQuarks));
                if (maxP > 0) {
                    const c = this.particleSystem.craftProton(maxP);
                    this.logView.add(`陽子 p を ${formatNumber(c)} 個一括合成しました。`, 'info');
                    this.particleChamber.createSynthesisEffect(`+${formatNumber(c)} 陽子 p`, '#ff2a6d');
                }
            });
        }

        document.getElementById('btnCraftNeutron').addEventListener('click', () => {
            const count = this.particleSystem.craftNeutron(1);
            if (count > 0) {
                this.logView.add(`中性子 n を 1 個合成しました。`, 'info');
                this.particleChamber.createSynthesisEffect('+1 中性子 n', '#00d2ff');
            }
        });
        const btnNeutronMax = document.getElementById('btnCraftNeutronMax');
        if (btnNeutronMax) {
            btnNeutronMax.addEventListener('click', () => {
                const maxN = Math.min(Math.floor(state.upQuarks), Math.floor(state.downQuarks / 2));
                if (maxN > 0) {
                    const c = this.particleSystem.craftNeutron(maxN);
                    this.logView.add(`中性子 n を ${formatNumber(c)} 個一括合成しました。`, 'info');
                    this.particleChamber.createSynthesisEffect(`+${formatNumber(c)} 中性子 n`, '#00d2ff');
                }
            });
        }

        document.getElementById('btnCraftHydrogen').addEventListener('click', () => {
            const count = this.particleSystem.craftHydrogen(1);
            if (count > 0) {
                this.logView.add(`軽水素 ¹H を 1 個組み立てました。`, 'info');
                this.particleChamber.createSynthesisEffect('+1 軽水素 ¹H', '#90e0ef');
            }
        });
        const btnHMax = document.getElementById('btnCraftHydrogenMax');
        if (btnHMax) {
            btnHMax.addEventListener('click', () => {
                const maxH = Math.min(Math.floor(state.protons), Math.floor(state.electrons));
                if (maxH > 0) {
                    const c = this.particleSystem.craftHydrogen(maxH);
                    this.logView.add(`軽水素 ¹H を ${formatNumber(c)} 個一括組み立てました。`, 'info');
                    this.particleChamber.createSynthesisEffect(`+${formatNumber(c)} 軽水素 ¹H`, '#90e0ef');
                }
            });
        }

        document.getElementById('btnCraftDeuterium').addEventListener('click', () => {
            const count = this.particleSystem.craftDeuterium(1);
            if (count > 0) {
                this.logView.add(`重水素 ²H を 1 個組み立てました。`, 'success');
                this.particleChamber.createSynthesisEffect('+1 重水素 ²H', '#06d6a0');
            }
        });
        const btnDMax = document.getElementById('btnCraftDeuteriumMax');
        if (btnDMax) {
            btnDMax.addEventListener('click', () => {
                const maxD = Math.min(Math.floor(state.protons), Math.floor(state.neutrons), Math.floor(state.electrons));
                if (maxD > 0) {
                    const c = this.particleSystem.craftDeuterium(maxD);
                    this.logView.add(`重水素 ²H を ${formatNumber(c)} 個一括組み立てました。`, 'success');
                    this.particleChamber.createSynthesisEffect(`+${formatNumber(c)} 重水素 ²H`, '#06d6a0');
                }
            });
        }

        document.getElementById('btnCraftTritium').addEventListener('click', () => {
            const count = this.particleSystem.craftTritium(1);
            if (count > 0) {
                this.logView.add(`三重水素 ³H を 1 個組み立てました！`, 'fusion');
                this.particleChamber.createSynthesisEffect('+1 三重水素 ³H', '#ff2a85');
            }
        });
        const btnTMax = document.getElementById('btnCraftTritiumMax');
        if (btnTMax) {
            btnTMax.addEventListener('click', () => {
                const maxT = Math.min(Math.floor(state.protons), Math.floor(state.neutrons / 2), Math.floor(state.electrons));
                if (maxT > 0) {
                    const c = this.particleSystem.craftTritium(maxT);
                    this.logView.add(`三重水素 ³H を ${formatNumber(c)} 個一括組み立てました！`, 'fusion');
                    this.particleChamber.createSynthesisEffect(`+${formatNumber(c)} 三重水素 ³H`, '#ff2a85');
                }
            });
        }

        document.getElementById('btnQuickCraftAll').addEventListener('click', () => {
            const res = this.particleSystem.craftAllIsotopes();
            const total = res.protons + res.neutrons + res.deuterium + res.tritium;
            if (total > 0) {
                const parts = [];
                if (res.protons > 0) parts.push(`陽子 +${formatNumber(res.protons)}`);
                if (res.neutrons > 0) parts.push(`中性子 +${formatNumber(res.neutrons)}`);
                if (res.deuterium > 0) parts.push(`重水素 ²H +${formatNumber(res.deuterium)}`);
                if (res.tritium > 0) parts.push(`三重水素 ³H +${formatNumber(res.tritium)}`);
                this.logView.add(`⚡ 一括全合成完了: ${parts.join(', ')}`, 'success');
                this.particleChamber.createSynthesisEffect(`⚡ 一括合成 +${total}`, '#00f5d4');
            } else {
                this.logView.add(`合成可能なクォークまたは核子が不足しています。`, 'info');
            }
        });

        // --- トカマク視点切替 (3Dカットアウェイ俯瞰 / 炉心内部カメラ / 3Dポロイダル断面 / 波形オシロスコープ) ---
        const btnViewTorus = document.getElementById('btnViewTorus');
        const btnViewInterior = document.getElementById('btnViewInterior');
        const btnViewPoloidal = document.getElementById('btnViewPoloidal');
        const btnToggleOsc = document.getElementById('btnToggleOsc');

        const setCamBtnActive = (mode, activeBtn) => {
            this.plasmaReactor.setViewMode(mode);
            [btnViewTorus, btnViewInterior, btnViewPoloidal].forEach(b => {
                if (b) b.classList.remove('active');
            });
            if (activeBtn) activeBtn.classList.add('active');
        };

        if (btnViewTorus) {
            btnViewTorus.addEventListener('click', () => setCamBtnActive('torus', btnViewTorus));
        }
        if (btnViewInterior) {
            btnViewInterior.addEventListener('click', () => setCamBtnActive('interior', btnViewInterior));
        }
        if (btnViewPoloidal) {
            btnViewPoloidal.addEventListener('click', () => setCamBtnActive('poloidal', btnViewPoloidal));
        }
        if (btnToggleOsc) {
            btnToggleOsc.addEventListener('click', () => {
                const active = this.plasmaReactor.toggleOscilloscope();
                btnToggleOsc.classList.toggle('active', active);
            });
        }

        // --- トカマク炉心操作 ---
        document.getElementById('btnInjectD').addEventListener('click', () => {
            const amt = Math.max(1, Math.floor(state.deuterium * 0.5));
            if (this.fusionSystem.injectFuel(amt, 0)) {
                this.logView.add(`重水素 ²H ${formatNumber(amt)} 個を炉心プラズマへ注入しました。`, 'info');
            }
        });
        document.getElementById('btnInjectT').addEventListener('click', () => {
            const amt = Math.max(1, Math.floor(state.tritium * 0.5));
            if (this.fusionSystem.injectFuel(0, amt)) {
                this.logView.add(`三重水素 ³H ${formatNumber(amt)} 個を炉心プラズマへ注入しました。`, 'info');
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
                this.logView.add(`燃料（重水素 ²H または 三重水素 ³H）を炉心に注入してください。`, 'info');
            }
        });

        // リチウム-6 備蓄補充
        const buyLi = (amt, cost) => {
            if (this.automationSystem.buyLithium(amt)) {
                this.logView.add(`リチウム-6備蓄を ${amt} 個補充しました (${formatEnergy(cost)}消費)。`, 'breeding');
            } else {
                this.logView.add(`エネルギーが不足しています (必要: ${formatEnergy(cost)})。`, 'info');
            }
        };

        const b20 = document.getElementById('btnBuyLithium20');
        const b100 = document.getElementById('btnBuyLithium100');
        const b1000 = document.getElementById('btnBuyLithium1000');

        if (b20) b20.addEventListener('click', () => buyLi(20, 100));
        if (b100) b100.addEventListener('click', () => buyLi(100, 500));
        if (b1000) b1000.addEventListener('click', () => buyLi(1000, 5000));

        // --- 施設カテゴリフィルタ & 購入マルチプライヤ ---
        const filterGroup = document.getElementById('buildingFilterGroup');
        if (filterGroup) {
            filterGroup.querySelectorAll('.filter-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    filterGroup.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.buildingFilter = btn.getAttribute('data-cat');
                    this._renderBuildingList();
                });
            });
        }

        const multGroup = document.getElementById('buyMultGroup');
        if (multGroup) {
            multGroup.querySelectorAll('.mult-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    multGroup.querySelectorAll('.mult-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const val = btn.getAttribute('data-mult');
                    this.buyMultiplier = val === 'max' ? 'max' : parseInt(val, 10);
                    this._renderBuildingList();
                });
            });
        }

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
            e.currentTarget.textContent = muted ? '🔇 音声: OFF' : '🔊 音声: ON';
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
                this.showToast('💾 ゲームデータを保存しました');
            }
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            if (confirm('ゲームデータをリセットして最初からやり直しますか？')) {
                state.clearSave();
                location.reload();
            }
        });

        // ミッションポッド & 攻略手順書モーダルオープン
        document.getElementById('guideBtn').addEventListener('click', () => {
            this.guideModal.open();
        });
        const missionPod = document.getElementById('missionPod');
        if (missionPod) {
            missionPod.addEventListener('click', () => {
                this.guideModal.open();
            });
        }

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

        // 状態変更通知の購読
        state.subscribe(() => {
            this._updateDynamicUI();
        });

        // 初回施設・研究リスト描画
        this._renderBuildingList();
        this._renderResearchList();
        this._checkProgressionUnlocks();
        this._updateDynamicUI();
    }

    _matchesBuildingFilter(b) {
        if (this.buildingFilter === 'all') return true;
        if (this.buildingFilter === 'particle') return b.category === 'particle' || b.category === 'synthesis';
        if (this.buildingFilter === 'fusion') return b.category === 'fusion';
        if (this.buildingFilter === 'resource') return b.category === 'breeding' || b.category === 'fuel';
        return true;
    }

    _renderBuildingList() {
        const container = document.getElementById('buildingList');
        if (!container) return;

        const resLabels = {
            energy: 'MeV',
            up: 'u',
            down: 'd',
            electron: 'e⁻',
            proton: 'p',
            neutron: 'n',
            hydrogen: '¹H',
            deuterium: '²H',
            tritium: '³H',
            helium: '⁴He',
            fastNeutron: '高速n',
            lithium6: '⁶Li'
        };

        const unlockedBuildings = BUILDINGS.filter(b => {
            if ((state.buildings[b.id] || 0) > 0) return true;
            return state.stats.totalEnergyProduced >= (b.unlockEnergy || 0);
        });
        this.lastUnlockedBuildingCount = unlockedBuildings.length;

        const visibleBuildings = unlockedBuildings.filter(b => this._matchesBuildingFilter(b));

        container.innerHTML = visibleBuildings.map(b => {
            const cost = state.getBuildingCost(b.id);
            const count = state.buildings[b.id] || 0;
            const affordable = state.canAfford(cost);
            const costText = Object.entries(cost).map(([k, v]) => {
                if (k === 'energy') return formatEnergy(v);
                return `${formatNumber(v, 0)} ${resLabels[k] || k}`;
            }).join(', ');

            let totalEffectText = '';
            if (count > 0) {
                if (b.production?.up) totalEffectText = ` (合計: +${formatNumber(count * b.production.up, 1)}/秒)`;
                else if (b.production?.down) totalEffectText = ` (合計: +${formatNumber(count * b.production.down, 1)}/秒)`;
                else if (b.production?.electron) totalEffectText = ` (合計: +${formatNumber(count * b.production.electron, 1)}/秒)`;
                else if (b.productionHadronRate) totalEffectText = ` (合計: ${formatNumber(count * b.productionHadronRate, 1)}回/秒)`;
                else if (b.productionAtomRate) totalEffectText = ` (合計: 最大+${formatNumber(count * 0.8, 1)}個/秒)`;
                else if (b.lithiumRate) totalEffectText = ` (合計: +${formatNumber(count * b.lithiumRate, 0)}/秒)`;
                else if (b.hydrogenRate) totalEffectText = ` (合計: +${formatNumber(count * b.hydrogenRate, 0)}/秒)`;
                else if (b.deuteriumRate) totalEffectText = ` (合計: +${formatNumber(count * b.deuteriumRate, 0)}/秒)`;
                else if (b.tauBoost) totalEffectText = ` (合計: +${(count * b.tauBoost).toFixed(2)}秒)`;
                else if (b.tempBoost) totalEffectText = ` (合計: +${(count * b.tempBoost).toFixed(1)} keV)`;
                else if (b.densityBoost) totalEffectText = ` (合計: +${(count * b.densityBoost).toFixed(1)})`;
                else if (b.efficiencyBoost) totalEffectText = ` (合計: +${(count * b.efficiencyBoost * 100).toFixed(0)}%)`;
            }

            const multLabel = this.buyMultiplier === 'max' ? '建設 (MAX)' : (this.buyMultiplier > 1 ? `建設 (×${this.buyMultiplier})` : '建設');

            return `
                <div class="building-card ${affordable ? 'can-afford' : ''}" id="bcard-${b.id}">
                    <div class="b-left">
                        <span class="b-icon">${b.icon}</span>
                        <div class="b-info">
                            <span class="b-name">${b.name}</span>
                            <span class="b-desc">${b.desc}</span>
                            <div class="b-effect ${count > 0 ? 'is-active' : ''}">
                                <span>⚡ 効果:</span>
                                <span>${b.effectDesc || ''}</span>
                                <span class="b-effect-total">${totalEffectText}</span>
                            </div>
                            <span class="b-cost">次回コスト: ${costText}</span>
                        </div>
                    </div>
                    <div class="b-right">
                        <span class="b-count">${formatNumber(count, 0)}</span>
                        <button class="btn btn-small btn-primary buy-building-btn" data-id="${b.id}" ${affordable ? '' : 'disabled'}>${multLabel}</button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.buy-building-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.getAttribute('data-id');
                let boughtCount = 0;
                const maxIterations = this.buyMultiplier === 'max' ? 100 : this.buyMultiplier;
                for (let i = 0; i < maxIterations; i++) {
                    if (this.automationSystem.buyBuilding(bId)) {
                        boughtCount++;
                    } else {
                        break;
                    }
                }
                if (boughtCount > 0) {
                    const def = BUILDINGS.find(b => b.id === bId);
                    this.logView.add(`【${def.name}】を ${boughtCount > 1 ? `${boughtCount} 基` : ''}建設しました！`, 'success');
                    this._renderBuildingList();
                    this._updateDynamicUI();
                }
            });
        });
    }

    _renderResearchList() {
        const container = document.getElementById('researchList');
        if (!container) return;

        const resLabels = {
            energy: 'MeV',
            up: 'u',
            down: 'd',
            electron: 'e⁻',
            proton: 'p',
            neutron: 'n',
            hydrogen: '¹H',
            deuterium: '²H',
            tritium: '³H',
            helium: '⁴He',
            fastNeutron: '高速n',
            lithium6: '⁶Li'
        };

        container.innerHTML = RESEARCH_TECH.map(t => {
            const unlocked = state.unlockedTechs[t.id];
            const costText = Object.entries(t.cost).map(([k, v]) => {
                if (k === 'energy') return formatEnergy(v);
                return `${v} ${resLabels[k] || k}`;
            }).join(', ');

            return `
                <div class="building-card" style="${unlocked ? 'opacity: 0.65; border-color: var(--c-deuterium);' : ''}">
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

    _updateMissionBanner() {
        const phaseTag = document.getElementById('missionPhaseTag');
        const titleEl = document.getElementById('missionTitle');
        const descEl = document.getElementById('missionDesc');
        const fillEl = document.getElementById('missionProgressFill');
        if (!phaseTag || !titleEl || !descEl || !fillEl) return;

        const hasHadron = state.protons > 0 || state.neutrons > 0 || state.stats.totalFusions > 0;
        const hasDT = (state.deuterium > 0 && state.tritium > 0) || state.stats.totalFusions > 0;
        const hasFusion = state.stats.totalFusions > 0;
        const hasBlanket = (state.buildings['breeding_blanket'] || 0) > 0;
        const maxQ = state.stats.maxQ || 0;

        if (!hasHadron) {
            phaseTag.textContent = 'PHASE 1/5';
            titleEl.textContent = '陽子・中性子の合成';
            descEl.textContent = 'u, d クォークを射出し、陽子(p)と中性子(n)を合成しましょう';
            fillEl.style.width = '15%';
        } else if (!hasDT) {
            phaseTag.textContent = 'PHASE 2/5';
            titleEl.textContent = '重水素(²H)と三重水素(³H)の製造';
            descEl.textContent = '核子と電子を結合して重水素(²H)と三重水素(³H)を各1個以上組み立てましょう';
            fillEl.style.width = '35%';
        } else if (!hasFusion) {
            phaseTag.textContent = 'PHASE 3/5';
            titleEl.textContent = 'トカマク炉心へ燃料注入 & 初点火';
            descEl.textContent = '²H と ³H を炉心へ注入し、「⚡ 磁気パルス圧縮点火」を実行しましょう！';
            fillEl.style.width = '55%';
        } else if (!hasBlanket) {
            phaseTag.textContent = 'PHASE 4/5';
            titleEl.textContent = 'リチウム増殖ブランケットの建設';
            descEl.textContent = '獲得エネルギーで自動化設備を増設し、「リチウム増殖ブランケット」を建設しましょう';
            fillEl.style.width = `${Math.min(80, 55 + (state.stats.totalEnergyProduced / 1000) * 25)}%`;
        } else if (maxQ < 10.0) {
            phaseTag.textContent = 'PHASE 5/5';
            titleEl.textContent = `臨界突破 & 自律燃焼プラズマ (現在最大 Q=${maxQ.toFixed(2)})`;
            descEl.textContent = '超伝導コイル・NBI加熱・ペレット注入を増設し、Q ≧ 1.0 → Q ≧ 10 を目指しましょう！';
            fillEl.style.width = `${Math.min(98, 80 + (maxQ / 10.0) * 18)}%`;
        } else {
            phaseTag.textContent = 'COMPLETE';
            titleEl.textContent = '恒星級 自律核融合エネルギー網 完成！';
            descEl.textContent = `最大 Q=${maxQ.toFixed(2)} 達成！さらなる出力拡大と全実績コンプリートへ`;
            fillEl.style.width = '100%';
        }
    }

    _updateReactorStatusBadge() {
        const dotEl = document.getElementById('reactorStatusDot');
        const txtEl = document.getElementById('reactorStatusText');
        if (!dotEl || !txtEl) return;

        const r = state.reactor;
        if (r.qValue >= 10.0) {
            txtEl.textContent = 'SELF-IGNITION (Q≧10)';
            txtEl.style.color = '#00f5d4';
            dotEl.style.background = '#00f5d4';
            dotEl.style.boxShadow = '0 0 10px #00f5d4';
            dotEl.classList.add('is-active');
            document.body.dataset.reactorTier = 'burning';
        } else if (r.qValue >= 5.0) {
            txtEl.textContent = 'BURNING PLASMA (Q≧5)';
            txtEl.style.color = '#00f5d4';
            dotEl.style.background = '#00f5d4';
            dotEl.style.boxShadow = '0 0 8px #00f5d4';
            dotEl.classList.add('is-active');
            document.body.dataset.reactorTier = 'burning';
        } else if (r.qValue >= 1.0) {
            txtEl.textContent = 'CRITICAL BREAKEVEN (Q≧1)';
            txtEl.style.color = '#ffd166';
            dotEl.style.background = '#ffd166';
            dotEl.style.boxShadow = '0 0 8px #ffd166';
            dotEl.classList.add('is-active');
            document.body.dataset.reactorTier = 'critical';
        } else if (r.fusionPowerMW > 0.01) {
            txtEl.textContent = 'SUB-CRITICAL BURN';
            txtEl.style.color = '#ff4d8d';
            dotEl.style.background = '#ff4d8d';
            dotEl.style.boxShadow = '0 0 8px #ff4d8d';
            dotEl.classList.add('is-active');
            document.body.dataset.reactorTier = 'subcritical';
        } else {
            txtEl.textContent = 'COLD STANDBY';
            txtEl.style.color = 'var(--text-secondary)';
            dotEl.style.background = '#5c6b84';
            dotEl.style.boxShadow = 'none';
            dotEl.classList.remove('is-active');
            document.body.dataset.reactorTier = 'cold';
        }
    }

    _checkProgressionUnlocks() {
        const hadProtonOrNeutron = state.protons > 0 || state.neutrons > 0 || state.stats.totalFusions > 0 || state.energy > 0;
        const hadIsotope = state.deuterium > 0 || state.tritium > 0 || state.stats.totalFusions > 0 || state.energy > 0;
        const hadFusion = state.stats.totalFusions > 0 || state.stats.totalEnergyProduced > 0 || state.energy > 0;

        // 1. リソースバーの表示/非表示
        const elEnergy = document.getElementById('resGroupEnergy');
        if (elEnergy) elEnergy.style.display = hadFusion ? 'flex' : 'none';

        const elHadrons = document.getElementById('resGroupHadrons');
        if (elHadrons) elHadrons.style.display = hadProtonOrNeutron ? 'flex' : 'none';

        const elIsotopes = document.getElementById('resGroupIsotopes');
        if (elIsotopes) elIsotopes.style.display = hadProtonOrNeutron ? 'flex' : 'none';

        const elProducts = document.getElementById('resGroupProducts');
        if (elProducts) elProducts.style.display = hadFusion ? 'flex' : 'none';

        // 2. 左カラム: 水素同位体組み立てカード
        const elIsotopeCard = document.getElementById('cardIsotopeCrafting');
        const elIsotopeLocked = document.getElementById('isotopeLockedPlaceholder');
        const btnQuickCraft = document.getElementById('btnQuickCraftAll');
        if (elIsotopeCard && elIsotopeLocked) {
            if (hadProtonOrNeutron) {
                elIsotopeCard.style.display = 'block';
                elIsotopeLocked.style.display = 'none';
                if (btnQuickCraft) btnQuickCraft.style.display = 'inline-flex';
                if (!this.unlockHistory.isotopeCrafting) {
                    this.unlockHistory.isotopeCrafting = true;
                    this.showToast('💡 水素同位体組み立てがアンロックされました！', '🧬');
                    this.logView.add('【新機能解放】水素同位体（軽水素・重水素・三重水素）の組み立てが認可されました！', 'success');
                }
            } else {
                elIsotopeCard.style.display = 'none';
                elIsotopeLocked.style.display = 'flex';
                if (btnQuickCraft) btnQuickCraft.style.display = 'none';
            }
        }

        // 3. 中央カラム: トカマク核融合炉
        const elReactorActive = document.getElementById('reactorActiveContent');
        const elReactorLocked = document.getElementById('reactorLockedPlaceholder');
        if (elReactorActive && elReactorLocked) {
            if (hadIsotope) {
                const wasHidden = elReactorActive.style.display === 'none';
                elReactorActive.style.display = 'flex';
                elReactorLocked.style.display = 'none';
                if (wasHidden && this.plasmaReactor) {
                    setTimeout(() => this.plasmaReactor.resize(), 30);
                }
                if (!this.unlockHistory.reactorUnlocked) {
                    this.unlockHistory.reactorUnlocked = true;
                    this.showToast('🔥 トカマク核融合炉が起動しました！', '⚡');
                    this.logView.add('【新機能解放】トカマク型磁場閉じ込め核融合炉が起動！重水素(²H)と三重水素(³H)を注入して点火しましょう！', 'fusion');
                }
            } else {
                elReactorActive.style.display = 'none';
                elReactorLocked.style.display = 'flex';
            }
        }

        // 4. 右カラム: 拡大再生産 & 研究開発
        const elExpActive = document.getElementById('expansionActiveContent');
        const elExpLocked = document.getElementById('expansionLockedPlaceholder');
        const elExpHeader = document.getElementById('expansionHeader');
        if (elExpActive && elExpLocked) {
            if (hadFusion) {
                elExpActive.style.display = 'block';
                elExpLocked.style.display = 'none';
                if (elExpHeader) elExpHeader.style.visibility = 'visible';
                if (!this.unlockHistory.expansionUnlocked) {
                    this.unlockHistory.expansionUnlocked = true;
                    this.showToast('🏗️ 拡大再生産施設が認可されました！', '✨');
                    this.logView.add('【新機能解放】獲得エネルギーを投じ、自動素粒子抽出機や増殖ブランケットを建設して拡大再生産を推進しましょう！', 'breeding');
                    this._renderBuildingList();
                }
            } else {
                elExpActive.style.display = 'none';
                elExpLocked.style.display = 'flex';
                if (elExpHeader) elExpHeader.style.visibility = 'hidden';
            }
        }

        // 新しい施設が累計エネルギーによって解放された場合はリストを再描画
        if (hadFusion) {
            const curUnlockedCount = BUILDINGS.filter(b => {
                if ((state.buildings[b.id] || 0) > 0) return true;
                return state.stats.totalEnergyProduced >= (b.unlockEnergy || 0);
            }).length;
            if (curUnlockedCount !== this.lastUnlockedBuildingCount) {
                this._renderBuildingList();
            }
        }

        // リチウム補充クイックバーの表示制御
        const elLiBar = document.getElementById('lithiumQuickBar');
        if (elLiBar) {
            const hasBlanket = (state.buildings['breeding_blanket'] || 0) > 0 || state.fastNeutrons > 0;
            elLiBar.style.display = hasBlanket ? 'block' : 'none';
        }

        // 研究開発タブの制御 (累計エネルギー 100 MeV 以上でアンロック)
        const tabR = document.getElementById('tabResearchBtn');
        if (tabR) {
            const hasResearchUnlock = state.stats.totalEnergyProduced >= 100 || Object.values(state.unlockedTechs).some(v => v);
            tabR.disabled = !hasResearchUnlock;
            tabR.title = hasResearchUnlock ? '研究開発' : '累計エネルギー 100 MeV でアンロック';
            tabR.style.opacity = hasResearchUnlock ? '1' : '0.4';
            if (hasResearchUnlock && !this.unlockHistory.researchUnlocked) {
                this.unlockHistory.researchUnlocked = true;
                this.showToast('🔬 研究開発 (Research) がアンロック！', '🔬');
                this.logView.add('【新機能解放】研究開発タブが解放されました。テクノロジーを習得して炉心効率を高めましょう！', 'info');
            }
        }
    }

    _updateDynamicUI() {
        this._checkProgressionUnlocks();
        this._updateMissionBanner();
        this._updateReactorStatusBadge();

        // リソース表示
        document.getElementById('resEnergy').textContent = formatEnergy(state.energy);
        document.getElementById('resUp').textContent = formatNumber(state.upQuarks);
        document.getElementById('resDown').textContent = formatNumber(state.downQuarks);
        document.getElementById('resElectron').textContent = formatNumber(state.electrons);
        document.getElementById('resProton').textContent = formatNumber(state.protons);
        document.getElementById('resNeutron').textContent = formatNumber(state.neutrons);
        const resHEl = document.getElementById('resHydrogen');
        if (resHEl) resHEl.textContent = formatNumber(state.hydrogen);
        document.getElementById('resDeuterium').textContent = formatNumber(state.deuterium);
        document.getElementById('resTritium').textContent = formatNumber(state.tritium);
        document.getElementById('resHelium').textContent = formatNumber(state.helium);
        document.getElementById('resFastNeutron').textContent = formatNumber(state.fastNeutrons);
        document.getElementById('resLithium6').textContent = formatNumber(state.lithium6);

        // クォーク・電子の自動生産レート表示
        const uRate = state.buildings['quark_dispenser_u'] || 0;
        const dRate = state.buildings['quark_dispenser_d'] || 0;
        const eRate = state.buildings['electron_gun'] || 0;
        const elURate = document.getElementById('resUpRate');
        const elDRate = document.getElementById('resDownRate');
        const elERate = document.getElementById('resElectronRate');
        if (elURate) elURate.textContent = uRate > 0 ? `+${uRate}/s` : '';
        if (elDRate) elDRate.textContent = dRate > 0 ? `+${dRate}/s` : '';
        if (elERate) elERate.textContent = eRate > 0 ? `+${eRate}/s` : '';

        // 軽水素生産レート表示
        const hRate = this.automationSystem.getHydrogenProductionRate();
        const hRateEl = document.getElementById('txtHydrogenRate');
        const resHRateEl = document.getElementById('resHydrogenRate');
        if (hRateEl) hRateEl.textContent = hRate > 0 ? `(+${formatNumber(hRate, 1)} /秒)` : '(+0 /秒)';
        if (resHRateEl) resHRateEl.textContent = hRate > 0 ? `(+${formatNumber(hRate, 0)}/s)` : '';

        // リチウム生産レート表示
        const liRate = this.automationSystem.getLithiumProductionRate();
        const liRateEl = document.getElementById('txtLithiumRate');
        const resLiTopEl = document.getElementById('resLithiumRateTop');
        if (liRateEl) liRateEl.textContent = liRate > 0 ? `(+${formatNumber(liRate, 1)} /秒)` : '(+0 /秒)';
        if (resLiTopEl) resLiTopEl.textContent = liRate > 0 ? `(+${formatNumber(liRate, 0)}/s)` : '';

        // 重水素生産レート表示
        const deutRate = this.automationSystem.getDeuteriumProductionRate();
        const dRateEl = document.getElementById('txtDeuteriumRate');
        const resDRateEl = document.getElementById('resDeuteriumRate');
        if (dRateEl) dRateEl.textContent = deutRate > 0 ? `(+${formatNumber(deutRate, 1)} /秒)` : '(+0 /秒)';
        if (resDRateEl) resDRateEl.textContent = deutRate > 0 ? `(+${formatNumber(deutRate, 0)}/s)` : '';

        // トカマクHUD
        const r = state.reactor;
        const tempMillionC = (r.temperatureKeV * 11.6).toFixed(0);
        document.getElementById('txtTemperature').textContent = `${r.temperatureKeV.toFixed(2)} keV (${tempMillionC}万℃)`;
        document.getElementById('txtFusionPower').textContent = formatPower(r.fusionPowerMW);
        document.getElementById('txtQValue').textContent = r.qValue.toFixed(2);
        document.getElementById('txtMagField').textContent = `${r.magneticFieldTesla.toFixed(1)} T`;

        document.getElementById('txtChamberD').textContent = formatNumber(r.chamberFuelD);
        document.getElementById('txtChamberT').textContent = formatNumber(r.chamberFuelT);

        // 炉心内燃料バランスHUD
        const hudFuelD = document.getElementById('hudFuelD');
        const hudFuelT = document.getElementById('hudFuelT');
        const fuelBarD = document.getElementById('fuelBalanceBarD');
        if (hudFuelD) hudFuelD.textContent = formatNumber(r.chamberFuelD, 0);
        if (hudFuelT) hudFuelT.textContent = formatNumber(r.chamberFuelT, 0);
        if (fuelBarD) {
            const totalFuel = r.chamberFuelD + r.chamberFuelT;
            const dRatio = totalFuel > 0 ? (r.chamberFuelD / totalFuel) * 100 : 50;
            fuelBarD.style.width = `${dRatio}%`;
        }

        // ローソン3重積ゲージ & 3サブメトリクス
        const tripleProdVal = this.fusionSystem.getTripleProduct();
        const tripleProd10_21 = tripleProdVal / 1e21;
        document.getElementById('txtTripleProduct').textContent = `${tripleProd10_21.toFixed(2)} × 10²¹ keV·s/m³`;

        const progressPercent = Math.min(100, Math.max(0, (tripleProdVal / PHYSICS.LAWSON_IGNITION) * 100));
        document.getElementById('lawsonProgressFill').style.width = `${progressPercent}%`;

        const hudN = document.getElementById('hudMetricN');
        const hudT = document.getElementById('hudMetricT');
        const hudTau = document.getElementById('hudMetricTau');
        if (hudN) hudN.textContent = `${r.density.toFixed(2)} ×10²⁰`;
        if (hudT) hudT.textContent = `${r.temperatureKeV.toFixed(1)} keV`;
        if (hudTau) hudTau.textContent = `${r.confinementTime.toFixed(2)} s`;

        // 統計
        document.getElementById('statTotalFusions').textContent = formatNumber(state.stats.totalFusions, 0);
        document.getElementById('statTotalEnergy').textContent = formatEnergy(state.stats.totalEnergyProduced);
        document.getElementById('statMaxQ').textContent = state.stats.maxQ.toFixed(2);
        document.getElementById('statPlayTime').textContent = `${Math.floor(state.stats.timePlayed)} 秒`;
        document.getElementById('statTauE').textContent = `${r.confinementTime.toFixed(2)} s`;
        document.getElementById('statDensity').textContent = `${r.density.toFixed(2)} × 10²⁰ m⁻³`;
        document.getElementById('statHeatingPower').textContent = `${r.heatingPowerMW.toFixed(2)} MW`;

        // 実績カウンタ更新
        const achCountEl = document.getElementById('achCountBadge');
        if (achCountEl) {
            const unlockedAch = Object.values(state.achievements).filter(Boolean).length;
            achCountEl.textContent = `${unlockedAch}/${ACHIEVEMENTS.length}`;
        }

        // 合成可能数バッジ & ボタンの活性/非活性状態更新
        const canP = Math.min(Math.floor(state.upQuarks / 2), Math.floor(state.downQuarks));
        const canN = Math.min(Math.floor(state.upQuarks), Math.floor(state.downQuarks / 2));
        const canH = Math.min(Math.floor(state.protons), Math.floor(state.electrons));
        const canD = Math.min(Math.floor(state.protons), Math.floor(state.neutrons), Math.floor(state.electrons));
        const canT = Math.min(Math.floor(state.protons), Math.floor(state.neutrons / 2), Math.floor(state.electrons));

        const badgeP = document.getElementById('badgeCanCraftProton');
        const badgeN = document.getElementById('badgeCanCraftNeutron');
        if (badgeP) badgeP.textContent = `合成可: ${formatNumber(canP, 0)}`;
        if (badgeN) badgeN.textContent = `合成可: ${formatNumber(canN, 0)}`;

        document.getElementById('btnCraftProton').disabled = canP < 1;
        document.getElementById('btnCraftNeutron').disabled = canN < 1;
        document.getElementById('btnCraftHydrogen').disabled = canH < 1;
        document.getElementById('btnCraftDeuterium').disabled = canD < 1;
        document.getElementById('btnCraftTritium').disabled = canT < 1;

        const bPMax = document.getElementById('btnCraftProtonMax');
        const bNMax = document.getElementById('btnCraftNeutronMax');
        const bHMax = document.getElementById('btnCraftHydrogenMax');
        const bDMax = document.getElementById('btnCraftDeuteriumMax');
        const bTMax = document.getElementById('btnCraftTritiumMax');
        if (bPMax) bPMax.disabled = canP < 1;
        if (bNMax) bNMax.disabled = canN < 1;
        if (bHMax) bHMax.disabled = canH < 1;
        if (bDMax) bDMax.disabled = canD < 1;
        if (bTMax) bTMax.disabled = canT < 1;

        // 施設カードの購入可否ハイライト同期
        BUILDINGS.forEach(b => {
            const card = document.getElementById(`bcard-${b.id}`);
            if (!card) return;
            const cost = state.getBuildingCost(b.id);
            const afford = state.canAfford(cost);
            card.classList.toggle('can-afford', afford);
            const btn = card.querySelector('.buy-building-btn');
            if (btn) btn.disabled = !afford;
        });
    }

    loop(currentTime) {
        const deltaMs = currentTime - this.lastTime;
        this.lastTime = currentTime;

        let dt = Math.min(deltaMs / 1000, 0.1);

        if (!state.paused) {
            const simDt = dt * state.speed;

            state.stats.timePlayed += simDt;

            const autoRates = {
                up: state.buildings['quark_dispenser_u'] || 0,
                down: state.buildings['quark_dispenser_d'] || 0,
                electron: state.buildings['electron_gun'] || 0,
            };

            this.particleChamber.update(simDt, autoRates);
            this.fusionSystem.update(simDt);
            this.plasmaReactor.update(simDt, state.reactor, state.buildings);
            this.automationSystem.update(simDt);

            this.autoSaveTimer += simDt;
            if (this.autoSaveTimer >= 15.0) {
                this.autoSaveTimer = 0;
                state.save();
            }
        }

        this.particleChamber.render();
        this.plasmaReactor.render(state.reactor, state.buildings);

        this._updateDynamicUI();

        requestAnimationFrame((t) => this.loop(t));
    }
}

// ゲーム起動
window.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
    app.init();
    window.__app = app;
});
