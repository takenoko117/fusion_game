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
            // セーブデータがある場合は過去実績に応じて履歴を初期化（通知連発を防ぐ）
            if (state.protons > 0 || state.neutrons > 0 || state.stats.totalFusions > 0) this.unlockHistory.isotopeCrafting = true;
            if (state.deuterium > 0 || state.tritium > 0 || state.stats.totalFusions > 0) this.unlockHistory.reactorUnlocked = true;
            if (state.stats.totalFusions > 0 || state.energy > 0) this.unlockHistory.expansionUnlocked = true;
            if (state.stats.totalEnergyProduced >= 100) this.unlockHistory.researchUnlocked = true;
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
            if (count > 0) {
                this.logView.add(`陽子 p を 1 個合成しました。`, 'info');
                this.particleChamber.createSynthesisEffect('+1 陽子 p', '#ff0055');
            }
        });
        document.getElementById('btnCraftNeutron').addEventListener('click', () => {
            const count = this.particleSystem.craftNeutron(1);
            if (count > 0) {
                this.logView.add(`中性子 n を 1 個合成しました。`, 'info');
                this.particleChamber.createSynthesisEffect('+1 中性子 n', '#00b4d8');
            }
        });

        document.getElementById('btnCraftHydrogen').addEventListener('click', () => {
            const count = this.particleSystem.craftHydrogen(1);
            if (count > 0) {
                this.logView.add(`軽水素 ¹H を 1 個組み立てました。`, 'info');
                this.particleChamber.createSynthesisEffect('+1 軽水素 ¹H', '#90e0ef');
            }
        });
        document.getElementById('btnCraftDeuterium').addEventListener('click', () => {
            const count = this.particleSystem.craftDeuterium(1);
            if (count > 0) {
                this.logView.add(`重水素 ²H を 1 個組み立てました。`, 'success');
                this.particleChamber.createSynthesisEffect('+1 重水素 ²H', '#06d6a0');
            }
        });
        document.getElementById('btnCraftTritium').addEventListener('click', () => {
            const count = this.particleSystem.craftTritium(1);
            if (count > 0) {
                this.logView.add(`三重水素 ³H を 1 個組み立てました！`, 'fusion');
                this.particleChamber.createSynthesisEffect('+1 三重水素 ³H', '#f72585');
            }
        });
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

        // --- トカマク炉心操作 ---
        document.getElementById('btnInjectD').addEventListener('click', () => {
            const amt = Math.max(1, Math.floor(state.deuterium * 0.5));
            if (this.fusionSystem.injectFuel(amt, 0)) {
                this.logView.add(`重水素 ²H ${amt} 個を炉心プラズマへ注入しました。`, 'info');
            }
        });
        document.getElementById('btnInjectT').addEventListener('click', () => {
            const amt = Math.max(1, Math.floor(state.tritium * 0.5));
            if (this.fusionSystem.injectFuel(0, amt)) {
                this.logView.add(`三重水素 ³H ${amt} 個を炉心プラズマへ注入しました。`, 'info');
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

        // リチウム-6 備蓄補充 (一括購入対応)
        const buyLi = (amt, cost) => {
            if (this.automationSystem.buyLithium(amt)) {
                this.logView.add(`リチウム-6備蓄を ${amt} 個補充しました (${cost} MeV消費)。`, 'breeding');
            } else {
                this.logView.add(`エネルギーが不足しています (必要: ${cost} MeV)。`, 'info');
            }
        };

        const b20 = document.getElementById('btnBuyLithium20');
        const b100 = document.getElementById('btnBuyLithium100');
        const b1000 = document.getElementById('btnBuyLithium1000');

        if (b20) b20.addEventListener('click', () => buyLi(20, 100));
        if (b100) b100.addEventListener('click', () => buyLi(100, 500));
        if (b1000) b1000.addEventListener('click', () => buyLi(1000, 5000));

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
        this._checkProgressionUnlocks();
        this._updateDynamicUI();
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

        // 累計エネルギーまたは保有数で表示対象をフィルタリング (段階的アンロック)
        const visibleBuildings = BUILDINGS.filter(b => {
            if ((state.buildings[b.id] || 0) > 0) return true;
            return state.stats.totalEnergyProduced >= (b.unlockEnergy || 0);
        });

        container.innerHTML = visibleBuildings.map(b => {
            const cost = state.getBuildingCost(b.id);
            const count = state.buildings[b.id] || 0;
            const costText = Object.entries(cost).map(([k, v]) => {
                if (k === 'energy') return formatEnergy(v);
                return `${v} ${resLabels[k] || k}`;
            }).join(', ');

            // 合計効果の計算
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

            return `
                <div class="building-card" id="bcard-${b.id}">
                    <div class="b-left">
                        <span class="b-icon">${b.icon}</span>
                        <div class="b-info">
                            <span class="b-name">${b.name}</span>
                            <span class="b-desc">${b.desc}</span>
                            <div class="b-effect ${count > 0 ? 'is-active' : ''}">
                                <span>⚡ 生産/効果:</span>
                                <span>${b.effectDesc || ''}</span>
                                <span class="b-effect-total">${totalEffectText}</span>
                            </div>
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
                elReactorActive.style.display = 'flex';
                elReactorLocked.style.display = 'none';
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

        // 軽水素生産レート表示
        const hRate = this.automationSystem.getHydrogenProductionRate();
        const hRateEl = document.getElementById('txtHydrogenRate');
        const resHRateEl = document.getElementById('resHydrogenRate');
        if (hRateEl) {
            hRateEl.textContent = hRate > 0 ? `(+${formatNumber(hRate, 1)} /秒)` : '(+0 /秒)';
        }
        if (resHRateEl) {
            resHRateEl.textContent = hRate > 0 ? `(+${formatNumber(hRate, 0)}/s)` : '';
        }

        // リチウム生産レート表示
        const liRate = this.automationSystem.getLithiumProductionRate();
        const liRateEl = document.getElementById('txtLithiumRate');
        if (liRateEl) {
            liRateEl.textContent = liRate > 0 ? `(+${formatNumber(liRate, 1)} /秒)` : '(+0 /秒)';
        }

        // 重水素生産レート表示
        const dRate = this.automationSystem.getDeuteriumProductionRate();
        const dRateEl = document.getElementById('txtDeuteriumRate');
        const resDRateEl = document.getElementById('resDeuteriumRate');
        if (dRateEl) {
            dRateEl.textContent = dRate > 0 ? `(+${formatNumber(dRate, 1)} /秒)` : '(+0 /秒)';
        }
        if (resDRateEl) {
            resDRateEl.textContent = dRate > 0 ? `(+${formatNumber(dRate, 0)}/s)` : '';
        }

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

            // 自動抽出機の稼働状況をParticleChamberに伝達
            const autoRates = {
                up: state.buildings['quark_dispenser_u'] || 0,
                down: state.buildings['quark_dispenser_d'] || 0,
                electron: state.buildings['electron_gun'] || 0,
            };

            // 各システム更新
            this.particleChamber.update(simDt, autoRates);
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
