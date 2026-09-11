/**
 * UpgradeSystem.js
 * 核融合研究開発ツリーの購入、効果適用、アンロック管理
 */

import { RESEARCH_TECH } from '../constants.js';
import { sound } from '../audio.js';

export class UpgradeSystem {
    constructor(state) {
        this.state = state;
    }

    research(techId) {
        const tech = RESEARCH_TECH.find(t => t.id === techId);
        if (!tech) return false;
        if (this.state.unlockedTechs[techId]) return false;

        if (this.state.canAfford(tech.cost)) {
            if (this.state.spend(tech.cost)) {
                this.state.unlockedTechs[techId] = true;
                sound.playUpgrade();
                this.state.notify();
                return true;
            }
        }
        return false;
    }
}
