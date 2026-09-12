/**
 * FusionSystem.js
 * トカマク核融合炉のプラズマ物理計算、ローソン3重積、D-TおよびT-T反応断面積、
 * 17.6 MeVのエネルギー放出とヘリウム・高速中性子の生成ロジック
 */

import { PHYSICS } from '../constants.js';
import { sound } from '../audio.js';

export class FusionSystem {
    constructor(state, plasmaCanvas) {
        this.state = state;
        this.canvas = plasmaCanvas;
        this.dtAccumulator = 0;
        this.ttAccumulator = 0;
    }

    // 燃料の炉心注入 (重水素 D と 三重水素 T をプラズマ電離チャンバーへ)
    injectFuel(deuteriumAmount = 1, tritiumAmount = 1) {
        const dToInject = Math.min(this.state.deuterium, deuteriumAmount);
        const tToInject = Math.min(this.state.tritium, tritiumAmount);

        if (dToInject <= 0 && tToInject <= 0) return false;

        this.state.deuterium -= dToInject;
        this.state.tritium -= tToInject;

        this.state.reactor.chamberFuelD += dToInject;
        this.state.reactor.chamberFuelT += tToInject;

        this.state.notify();
        return true;
    }

    // 手動パルス点火（キャンバスクリックや点火ボタン押下）
    triggerManualIgnition() {
        // 炉心に燃料がなければ手持ちから自動注入
        if (this.state.reactor.chamberFuelD === 0 && this.state.reactor.chamberFuelT === 0) {
            if (this.state.deuterium > 0 || this.state.tritium > 0) {
                this.injectFuel(
                    Math.max(1, Math.floor(this.state.deuterium * 0.5)),
                    Math.max(1, Math.floor(this.state.tritium * 0.5))
                );
            }
        }

        return this.processReactions(1.0, true);
    }

    // 每フレームの核融合シミュレーション更新
    update(dt = 1/60) {
        const reactor = this.state.reactor;

        // 設備によるパラメータ補正の計算
        this._updateReactorParameters();

        // 連続燃料注入モード
        if (reactor.continuousInjection) {
            if (this.state.deuterium >= 1 && reactor.chamberFuelD < 100) {
                const addD = Math.min(this.state.deuterium, 5);
                this.state.deuterium -= addD;
                reactor.chamberFuelD += addD;
            }
            if (this.state.tritium >= 1 && reactor.chamberFuelT < 100) {
                const addT = Math.min(this.state.tritium, 5);
                this.state.tritium -= addT;
                reactor.chamberFuelT += addT;
            }
        }

        // 核融合反応の計算
        if (reactor.chamberFuelD > 0 || reactor.chamberFuelT > 0) {
            this.processReactions(dt, false);
        } else {
            reactor.fusionPowerMW = 0;
            reactor.qValue = 0;
        }

        // プラズマ冷却（熱伝導・放射損失による自然冷却）
        const baseTemp = 1.0 + (this.state.buildings['nbi_heater'] || 0) * 2.0;
        if (reactor.temperatureKeV > baseTemp) {
            const coolingRate = 0.15 / Math.max(0.2, reactor.confinementTime);
            reactor.temperatureKeV = Math.max(baseTemp, reactor.temperatureKeV - coolingRate * dt);
        }

        // 音響フィードバック更新
        sound.updatePlasmaHum(reactor.temperatureKeV, reactor.qValue >= 5.0);
    }

    _updateReactorParameters() {
        const r = this.state.reactor;
        const b = this.state.buildings;

        // 磁場強度 (T)
        r.magneticFieldTesla = 3.5 + (b['superconducting_magnet'] || 0) * 0.8;

        // 閉じ込め時間 tau_E (s)
        r.confinementTime = 0.15 + (b['superconducting_magnet'] || 0) * 0.15;

        // プラズマ中心密度 n (10^20 m^-3)
        r.density = 0.2 + (b['pellet_injector'] || 0) * 0.5;

        // 外部加熱パワー (MW)
        let heatMW = 1.0 + (b['nbi_heater'] || 0) * 5.0;

        // 研究ボーナス: 自己加熱燃焼プラズマ自律制御 (外部加熱入力を削減してQ値を跳ね上げる)
        if (this.state.unlockedTechs['res_burning_plasma']) {
            heatMW *= 0.4;
        }

        r.heatingPowerMW = heatMW;
    }

    // 核融合反応処理
    processReactions(dt = 1/60, isManualForce = false) {
        const r = this.state.reactor;

        // D-T反応断面積の温度スケーリング
        // 1.0 keV で 0.3、15-20 keV で 2.5 ~ 3.5 に急上昇するゲームバランス曲線
        const T = Math.max(0.1, r.temperatureKeV);
        const tempCrossSection = 0.25 + 0.75 * Math.min(4.0, Math.pow(T / 5.0, 1.4));

        // 基本反応確率 (密度・閉じ込め時間と連動)
        let reactionRate = tempCrossSection * (r.density / 0.2) * (isManualForce ? 3.0 : 1.0);

        // 研究ボーナス
        if (this.state.unlockedTechs['res_quantum_tunneling']) {
            reactionRate *= 1.5;
        }
        if (this.state.unlockedTechs['res_stellarator_helix']) {
            reactionRate *= 1.3;
        }

        let totalEnergyProducedInStep = 0;
        let dtFusions = 0;
        let ttFusions = 0;

        // 1. D-T 核融合反応: ²H + ³H -> ⁴He (3.5 MeV) + n (14.1 MeV) + 17.59 MeV
        if (r.chamberFuelD > 0 && r.chamberFuelT > 0) {
            const potentialPairs = Math.min(r.chamberFuelD, r.chamberFuelT);
            const fusionRate = potentialPairs * reactionRate * dt * 2.0;

            this.dtAccumulator += fusionRate;

            let count = 0;
            if (isManualForce && potentialPairs >= 1) {
                count = Math.min(potentialPairs, Math.max(1, Math.floor(this.dtAccumulator + 1)));
                this.dtAccumulator = 0;
            } else if (this.dtAccumulator >= 1.0) {
                count = Math.min(potentialPairs, Math.floor(this.dtAccumulator));
                this.dtAccumulator -= count;
            }

            if (count > 0) {
                r.chamberFuelD -= count;
                r.chamberFuelT -= count;

                dtFusions += count;
                const energyPerReaction = PHYSICS.ENERGY.DT_FUSION; // 17.59 MeV
                const totalReleased = count * energyPerReaction;

                totalEnergyProducedInStep += totalReleased;
                this.state.helium += count;
                this.state.fastNeutrons += count;

                // アルファ粒子(3.5 MeV)による自己加熱: プラズマ温度の上昇
                let alphaHeating = count * 3.5;
                if (this.state.unlockedTechs['res_burning_plasma']) {
                    alphaHeating *= 1.5; // アルファ線エネルギー閉じ込め向上
                }
                r.temperatureKeV += (alphaHeating / (r.density * 40 + 10)) * 0.08;

                // 炉壁ダイバータ発電ボーナス
                const divertorBonus = 1 + (this.state.buildings['advanced_divertor'] || 0) * 0.25;
                this.state.energy += totalReleased * divertorBonus;
                this.state.stats.totalEnergyProduced += totalReleased;
                this.state.stats.totalFusions += count;
            }
        }

        // 2. T-T 核融合反応: ³H + ³H -> ⁴He + 2n + 11.33 MeV (重水素が枯渇して三重水素が多い場合)
        if (r.chamberFuelD <= 0 && r.chamberFuelT >= 2) {
            const pairs = Math.floor(r.chamberFuelT / 2);
            const ttRate = reactionRate * 0.2;
            const fusionRate = pairs * ttRate * dt * 2.0;

            this.ttAccumulator += fusionRate;

            let count = 0;
            if (isManualForce && pairs >= 1) {
                count = Math.min(pairs, Math.max(1, Math.floor(this.ttAccumulator + 1)));
                this.ttAccumulator = 0;
            } else if (this.ttAccumulator >= 1.0) {
                count = Math.min(pairs, Math.floor(this.ttAccumulator));
                this.ttAccumulator -= count;
            }

            if (count > 0) {
                r.chamberFuelT -= count * 2;

                ttFusions += count;
                const energyPerReaction = PHYSICS.ENERGY.TT_FUSION; // 11.33 MeV
                const totalReleased = count * energyPerReaction;

                totalEnergyProducedInStep += totalReleased;
                this.state.helium += count;
                this.state.fastNeutrons += count * 2; // 中性子は2個放出

                let alphaHeating = count * 2.5;
                if (this.state.unlockedTechs['res_burning_plasma']) {
                    alphaHeating *= 1.5;
                }
                r.temperatureKeV += (alphaHeating / (r.density * 40 + 10)) * 0.06;

                const divertorBonus = 1 + (this.state.buildings['advanced_divertor'] || 0) * 0.25;
                this.state.energy += totalReleased * divertorBonus;
                this.state.stats.totalEnergyProduced += totalReleased;
                this.state.stats.totalFusions += count;
            }
        }

        // 3. 発熱出力とQ値の計算
        const totalFusions = dtFusions + ttFusions;
        if (totalFusions > 0) {
            // MW換算 (指数移動平均で滑らかに表示)
            const instantPower = (totalEnergyProducedInStep / dt) * PHYSICS.MEV_TO_JOULE * 1e-6 * 1000;
            r.fusionPowerMW = r.fusionPowerMW > 0 ? (r.fusionPowerMW * 0.75 + instantPower * 0.25) : instantPower;
            r.qValue = r.heatingPowerMW > 0 ? (r.fusionPowerMW / r.heatingPowerMW) : 0;
            if (r.qValue > this.state.stats.maxQ) {
                this.state.stats.maxQ = r.qValue;
            }

            // キャンバス演出と効果音
            if (this.canvas) {
                this.canvas.triggerFusionBurst(Math.min(totalFusions, 8));
            }
            sound.playFusionBoom(1.0 + Math.min(r.qValue * 0.2, 2.0));
            this.state.notify();
            return true;
        } else {
            // 反応がないフレームは減衰
            r.fusionPowerMW *= 0.92;
            r.qValue = r.heatingPowerMW > 0 ? (r.fusionPowerMW / r.heatingPowerMW) : 0;
            if (r.fusionPowerMW < 0.01) {
                r.fusionPowerMW = 0;
                r.qValue = 0;
            }
        }

        return false;
    }

    // ローソン積 (Triple Product: n * T * tau_E)
    getTripleProduct() {
        const r = this.state.reactor;
        // n (10^20 m^-3) * T (keV) * tau_E (s) -> 10^20 keV * s / m^3
        return r.density * 1e20 * r.temperatureKeV * r.confinementTime;
    }

    // 自己点火条件 (Ignition) の達成度 (0.0 ~ 1.0+)
    getIgnitionProgress() {
        const tp = this.getTripleProduct();
        return Math.min(2.0, tp / PHYSICS.LAWSON_IGNITION);
    }
}
