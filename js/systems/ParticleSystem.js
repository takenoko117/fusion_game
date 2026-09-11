/**
 * ParticleSystem.js
 * 素粒子（クォーク・レプトン）の管理、陽子・中性子の合成、
 * 水素同位体（軽水素、重水素、三重水素）の組み立てロジック
 */

import { HADRON_RECIPES, ATOM_RECIPES } from '../constants.js';
import { sound } from '../audio.js';

export class ParticleSystem {
    constructor(state, particleChamber) {
        this.state = state;
        this.chamber = particleChamber;
    }

    // クォーク・レプトンの手動射出
    shoot(type) {
        if (type === 'up') {
            this.state.upQuarks++;
        } else if (type === 'down') {
            this.state.downQuarks++;
        } else if (type === 'electron') {
            this.state.electrons++;
        }

        if (this.chamber) {
            this.chamber.shootParticle(type);
        }
        this.state.notify();
    }

    // 10連射
    shootBulk(type, count = 10) {
        for (let i = 0; i < count; i++) {
            if (type === 'up') this.state.upQuarks++;
            else if (type === 'down') this.state.downQuarks++;
            else if (type === 'electron') this.state.electrons++;
        }
        if (this.chamber) {
            for (let i = 0; i < Math.min(count, 8); i++) {
                setTimeout(() => {
                    this.chamber.shootParticle(type);
                }, i * 35);
            }
        }
        this.state.notify();
    }

    // 陽子合成 (2 Up + 1 Down -> 1 Proton)
    craftProton(amount = 1, silent = false) {
        const maxPossible = Math.min(
            Math.floor(this.state.upQuarks / 2),
            Math.floor(this.state.downQuarks / 1)
        );
        const toCraft = Math.min(amount, maxPossible);
        if (toCraft <= 0) return 0;

        this.state.upQuarks -= toCraft * 2;
        this.state.downQuarks -= toCraft * 1;
        this.state.protons += toCraft;

        if (!silent) {
            sound.playHadronBond();
            this.state.notify();
        }
        return toCraft;
    }

    // 中性子合成 (1 Up + 2 Down -> 1 Neutron)
    craftNeutron(amount = 1, silent = false) {
        const maxPossible = Math.min(
            Math.floor(this.state.upQuarks / 1),
            Math.floor(this.state.downQuarks / 2)
        );
        const toCraft = Math.min(amount, maxPossible);
        if (toCraft <= 0) return 0;

        this.state.upQuarks -= toCraft * 1;
        this.state.downQuarks -= toCraft * 2;
        this.state.neutrons += toCraft;

        if (!silent) {
            sound.playHadronBond();
            this.state.notify();
        }
        return toCraft;
    }

    // 軽水素合成 (1 Proton + 1 Electron -> 1 1H)
    craftHydrogen(amount = 1, silent = false) {
        const maxPossible = Math.min(
            Math.floor(this.state.protons / 1),
            Math.floor(this.state.electrons / 1)
        );
        const toCraft = Math.min(amount, maxPossible);
        if (toCraft <= 0) return 0;

        this.state.protons -= toCraft;
        this.state.electrons -= toCraft;
        this.state.hydrogen += toCraft;

        if (!silent) {
            sound.playAtomForm();
            this.state.notify();
        }
        return toCraft;
    }

    // 重水素合成 (1 Proton + 1 Neutron + 1 Electron -> 1 Deuterium 2H)
    craftDeuterium(amount = 1, silent = false) {
        const maxPossible = Math.min(
            Math.floor(this.state.protons / 1),
            Math.floor(this.state.neutrons / 1),
            Math.floor(this.state.electrons / 1)
        );
        const toCraft = Math.min(amount, maxPossible);
        if (toCraft <= 0) return 0;

        this.state.protons -= toCraft;
        this.state.neutrons -= toCraft;
        this.state.electrons -= toCraft;
        this.state.deuterium += toCraft;

        if (!silent) {
            sound.playAtomForm();
            this.state.notify();
        }
        return toCraft;
    }

    // 三重水素合成 (1 Proton + 2 Neutrons + 1 Electron -> 1 Tritium 3H)
    craftTritium(amount = 1, silent = false) {
        const maxPossible = Math.min(
            Math.floor(this.state.protons / 1),
            Math.floor(this.state.neutrons / 2),
            Math.floor(this.state.electrons / 1)
        );
        const toCraft = Math.min(amount, maxPossible);
        if (toCraft <= 0) return 0;

        this.state.protons -= toCraft;
        this.state.neutrons -= toCraft * 2;
        this.state.electrons -= toCraft;
        this.state.tritium += toCraft;

        if (!silent) {
            sound.playAtomForm();
            this.state.notify();
        }
        return toCraft;
    }

    // クイック全合成（O(1)の直接算術計算により、数千万個の粒子があっても0ミリ秒で即座に完了）
    craftAllIsotopes() {
        let totalP = 0;
        let totalN = 0;
        let totalD = 0;
        let totalT = 0;

        // 1. クォークから陽子(2u+1d)と中性子(1u+2d)を一括O(1)計算で合成
        let U = Math.floor(this.state.upQuarks);
        let D = Math.floor(this.state.downQuarks);

        if (U >= 1 && D >= 1) {
            let pToCraft = 0;
            let nToCraft = 0;

            // 連立方程式の解析解で最適配分:
            // 2p + n = U, p + 2n = D
            if (2 * U <= D) {
                // U が極端にボトルネック: 中性子(1u+2d)を最大化
                nToCraft = Math.min(U, Math.floor(D / 2));
                U -= nToCraft;
                D -= nToCraft * 2;
                if (U >= 2 && D >= 1) {
                    const extraP = Math.min(Math.floor(U / 2), D);
                    pToCraft += extraP;
                    U -= extraP * 2;
                    D -= extraP;
                }
            } else if (2 * D <= U) {
                // D が極端にボトルネック: 陽子(2u+1d)を最大化
                pToCraft = Math.min(Math.floor(U / 2), D);
                U -= pToCraft * 2;
                D -= pToCraft;
                if (U >= 1 && D >= 2) {
                    const extraN = Math.min(U, Math.floor(D / 2));
                    nToCraft += extraN;
                    U -= extraN;
                    D -= extraN * 2;
                }
            } else {
                // 両クォークをバランスよく完全消費
                pToCraft = Math.floor((2 * U - D) / 3);
                nToCraft = Math.floor((2 * D - U) / 3);
                U -= (2 * pToCraft + nToCraft);
                D -= (pToCraft + 2 * nToCraft);

                // 余り(0〜2個)の最終調整
                if (U >= 2 && D >= 1) {
                    pToCraft++;
                    U -= 2;
                    D -= 1;
                }
                if (U >= 1 && D >= 2) {
                    nToCraft++;
                    U -= 1;
                    D -= 2;
                }
            }

            if (pToCraft > 0 || nToCraft > 0) {
                this.state.upQuarks -= (2 * pToCraft + nToCraft);
                this.state.downQuarks -= (pToCraft + 2 * nToCraft);
                this.state.protons += pToCraft;
                this.state.neutrons += nToCraft;
                totalP = pToCraft;
                totalN = nToCraft;
            }
        }

        // 2. 陽子・中性子・電子から重水素(D: 1p+1n+1e)と三重水素(T: 1p+2n+1e)を一括O(1)合成
        const P = Math.floor(this.state.protons);
        const N = Math.floor(this.state.neutrons);
        const E = Math.floor(this.state.electrons);

        const atomCapacity = Math.min(P, E); // 電子または陽子の限界

        if (atomCapacity >= 1 && N >= 1) {
            // 核融合炉に最適な D:T = 1:1 ペアを優先合成 (ペアあたり 2p + 3n + 2e 消費)
            const pairs = Math.min(Math.floor(atomCapacity / 2), Math.floor(N / 3));
            let dToCraft = pairs;
            let tToCraft = pairs;

            let remP = atomCapacity - pairs * 2;
            let remN = N - pairs * 3;

            // 残った中性子と陽子からさらに合成
            // 中性子が余っていれば三重水素 (1p + 2n) を合成
            if (remP >= 1 && remN >= 2) {
                const extraT = Math.min(remP, Math.floor(remN / 2));
                tToCraft += extraT;
                remP -= extraT;
                remN -= extraT * 2;
            }
            // さらに残っていれば重水素 (1p + 1n) を合成
            if (remP >= 1 && remN >= 1) {
                const extraD = Math.min(remP, remN);
                dToCraft += extraD;
                remP -= extraD;
                remN -= extraD;
            }

            const pUsed = dToCraft + tToCraft;
            const nUsed = dToCraft + tToCraft * 2;
            const eUsed = dToCraft + tToCraft;

            if (pUsed > 0) {
                this.state.protons -= pUsed;
                this.state.neutrons -= nUsed;
                this.state.electrons -= eUsed;
                this.state.deuterium += dToCraft;
                this.state.tritium += tToCraft;
                totalD = dToCraft;
                totalT = tToCraft;
            }
        }

        // 音声再生とUI更新は1回のみ（完全フリーズ防止）
        const changed = (totalP > 0 || totalN > 0 || totalD > 0 || totalT > 0);
        if (changed) {
            if (totalD > 0 || totalT > 0) {
                sound.playAtomForm();
            } else if (totalP > 0 || totalN > 0) {
                sound.playHadronBond();
            }
            this.state.notify();
        }

        return {
            protons: totalP,
            neutrons: totalN,
            deuterium: totalD,
            tritium: totalT,
        };
    }
}
