/**
 * AutomationSystem.js
 * 拡大再生産（自律ループ）を担う自動化施設、リチウム増殖ブランケット、
 * エネルギー消費による設備投資と実績アンロック判定
 */

import { BUILDINGS, ACHIEVEMENTS, PHYSICS } from '../constants.js';
import { sound } from '../audio.js';

export class AutomationSystem {
    constructor(state, particleSystem) {
        this.state = state;
        this.particleSystem = particleSystem;
        this.accumulatedTime = 0;
    }

    // 施設の購入
    buyBuilding(buildingId) {
        const cost = this.state.getBuildingCost(buildingId);
        if (!cost || !this.state.canAfford(cost)) {
            return false;
        }

        if (this.state.spend(cost)) {
            this.state.buildings[buildingId] = (this.state.buildings[buildingId] || 0) + 1;
            sound.playUpgrade();
            this.state.notify();
            return true;
        }
        return false;
    }

    // リチウム-6の補充 (エネルギー消費)
    buyLithium(amount = 20) {
        const costEnergy = amount * 5;
        if (this.state.energy >= costEnergy) {
            this.state.energy -= costEnergy;
            this.state.lithium6 += amount;
            sound.playUpgrade();
            this.state.notify();
            return true;
        }
        return false;
    }

    // リチウム自動生産レートの取得 (毎秒)
    getLithiumProductionRate() {
        const extractors = this.state.buildings['lithium_extractor'] || 0;
        const enrichers = this.state.buildings['lithium_enricher'] || 0;
        const harvesters = this.state.buildings['orbital_lithium_harvester'] || 0;
        return (extractors * 5) + (enrichers * 50) + (harvesters * 500);
    }

    // 海水重水素自動生産レートの取得 (毎秒)
    getDeuteriumProductionRate() {
        const gs = this.state.buildings['deuterium_extractor_gs'] || 0;
        const cryo = this.state.buildings['deuterium_distillery_cryo'] || 0;
        const float = this.state.buildings['deuterium_megafloat'] || 0;
        return (gs * 10) + (cryo * 100) + (float * 1000);
    }

    // 毎フレームの自動化処理更新
    update(dt = 1/60) {
        this.accumulatedTime += dt;

        // 1. 素粒子抽出機の自動稼働
        const uCount = this.state.buildings['quark_dispenser_u'] || 0;
        const dCount = this.state.buildings['quark_dispenser_d'] || 0;
        const eCount = this.state.buildings['electron_gun'] || 0;

        if (uCount > 0) this.state.upQuarks += uCount * dt;
        if (dCount > 0) this.state.downQuarks += dCount * dt;
        if (eCount > 0) this.state.electrons += eCount * dt;

        // 1b. リチウム大量生産設備の自動稼働 (海水抽出・濃縮・小惑星採掘)
        const liRate = this.getLithiumProductionRate();
        if (liRate > 0) {
            this.state.lithium6 += liRate * dt;
        }

        // 1c. 海水重水素大量生産設備の自動稼働 (GS重水電解・極低温蒸留・メガフロート)
        const dRate = this.getDeuteriumProductionRate();
        if (dRate > 0) {
            this.state.deuterium += dRate * dt;
        }

        // 2. 自動ハドロン結合炉の稼働
        const hadronizers = this.state.buildings['auto_hadronizer'] || 0;
        if (hadronizers > 0) {
            const craftsPerSec = hadronizers * (this.state.unlockedTechs['res_gluon_confinement'] ? 2.0 : 1.0);
            const toCraft = craftsPerSec * dt;

            // クォーク残量を見ながら陽子と中性子をバランス良く合成
            if (this.state.upQuarks >= 2 && this.state.downQuarks >= 1 && this.state.protons <= this.state.neutrons) {
                const amount = Math.min(toCraft, Math.floor(this.state.upQuarks / 2));
                this.state.upQuarks -= amount * 2;
                this.state.downQuarks -= amount * 1;
                this.state.protons += amount;
            } else if (this.state.upQuarks >= 1 && this.state.downQuarks >= 2) {
                const amount = Math.min(toCraft, Math.floor(this.state.downQuarks / 2));
                this.state.upQuarks -= amount * 1;
                this.state.downQuarks -= amount * 2;
                this.state.neutrons += amount;
            }
        }

        // 3. 自動同位体結晶機の稼働
        const assemblers = this.state.buildings['auto_isotope_assembler'] || 0;
        if (assemblers > 0) {
            const craftsPerSec = assemblers * 0.8;
            const toCraft = craftsPerSec * dt;

            // 三重水素と重水素の自動組み立て
            if (this.state.protons >= 1 && this.state.electrons >= 1 && this.state.neutrons >= 2) {
                const amt = Math.min(toCraft, Math.floor(this.state.neutrons / 2));
                this.state.protons -= amt;
                this.state.neutrons -= amt * 2;
                this.state.electrons -= amt;
                this.state.tritium += amt;
            } else if (this.state.protons >= 1 && this.state.electrons >= 1 && this.state.neutrons >= 1) {
                const amt = Math.min(toCraft, this.state.neutrons);
                this.state.protons -= amt;
                this.state.neutrons -= amt;
                this.state.electrons -= amt;
                this.state.deuterium += amt;
            }
        }

        // 4. 【拡大再生産の核心】リチウム増殖ブランケット (Breeding Blanket)
        // ⁶Li + n (14.1 MeV) -> ⁴He (2.05 MeV) + ³H (2.73 MeV) + 4.78 MeV
        const blankets = this.state.buildings['breeding_blanket'] || 0;
        if (blankets > 0 && this.state.fastNeutrons > 0) {
            let tbr = 1.15; // Tritium Breeding Ratio (トリチウム増殖比)
            if (this.state.unlockedTechs['res_tritium_handling']) {
                tbr = 1.35;
            }

            // ブランケット1基あたり毎秒処理できる中性子数
            const maxNeutronsPerSec = blankets * 2.5;
            const neutronsToProcess = Math.min(this.state.fastNeutrons, maxNeutronsPerSec * dt);

            if (neutronsToProcess > 0) {
                // リチウム6の消費 (リチウムがなければ増殖効率が低下)
                const liConsumed = Math.min(this.state.lithium6, neutronsToProcess);
                this.state.lithium6 -= liConsumed;
                this.state.fastNeutrons -= neutronsToProcess;

                // トリチウムの生成（リチウムがある時は100%増殖、枯渇時は中性子反射のみで効率50%）
                const efficiency = this.state.lithium6 > 0 ? 1.0 : 0.5;
                const tritiumBred = neutronsToProcess * tbr * efficiency;
                this.state.tritium += tritiumBred;

                // 増殖反応による追加エネルギー放出 (4.78 MeV)
                const extraEnergy = neutronsToProcess * PHYSICS.ENERGY.BREEDING_LI6;
                this.state.energy += extraEnergy;
                this.state.stats.totalEnergyProduced += extraEnergy;
            }
        }

        // 5. 実績チェック (定期的に実行)
        this._checkAchievements();
    }

    _checkAchievements() {
        for (const ach of ACHIEVEMENTS) {
            if (!this.state.achievements[ach.id] && ach.condition(this.state)) {
                this.state.achievements[ach.id] = true;
                sound.playUpgrade();
                // ログ通知等
                console.log(`[Achievement Unlocked] ${ach.title}: ${ach.desc}`);
            }
        }
    }
}
