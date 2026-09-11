/**
 * state.js
 * ゲームの中心的な状態管理ストア、リソース定義、セーブ＆ロード、フォーマッター
 */

import { BUILDINGS, RESEARCH_TECH, ACHIEVEMENTS, PHYSICS } from './constants.js';

const SAVE_KEY = 'fusion_genesis_save_v1';

export class GameState {
    constructor() {
        this.reset(false);
        this.listeners = new Set();
    }

    reset(triggerListeners = true) {
        // 素粒子・ハドロン・原子リソース
        this.upQuarks = 6;     // 初回プレイ用に少しだけ持たせる (陽子・中性子をすぐ試せる)
        this.downQuarks = 6;
        this.electrons = 4;
        this.protons = 0;
        this.neutrons = 0;
        this.hydrogen = 0;
        this.deuterium = 0;
        this.tritium = 0;
        this.helium = 0;
        this.fastNeutrons = 0;
        this.lithium6 = 50;    // 増殖ブランケット用リチウム備蓄

        // エネルギー (MeV単位で内部保持)
        this.energy = 0;

        // 施設保有数
        this.buildings = {};
        BUILDINGS.forEach(b => {
            this.buildings[b.id] = 0;
        });

        // 解放済み研究
        this.unlockedTechs = {};
        RESEARCH_TECH.forEach(t => {
            this.unlockedTechs[t.id] = false;
        });

        // 解放済み実績
        this.achievements = {};
        ACHIEVEMENTS.forEach(a => {
            this.achievements[a.id] = false;
        });

        // プラズマ核融合炉の状態
        this.reactor = {
            active: false,
            continuousInjection: false,
            temperatureKeV: 1.0,     // 1 keV ≒ 1160万度
            density: 0.2,            // 10^20 m^-3
            confinementTime: 0.15,   // 秒
            heatingPowerMW: 1.0,     // 外部加熱電力
            fusionPowerMW: 0.0,      // 核融合熱出力
            qValue: 0.0,             // エネルギー増倍率 Q
            fuelRatioDT: 0.5,        // 重水素と三重水素の混合比 (0.5 = 50:50)
            chamberFuelD: 0,         // 炉心内プラズマ粒子
            chamberFuelT: 0,
            magneticFieldTesla: 3.5, // 磁場強度 (テスラ)
        };

        // 統計データ
        this.stats = {
            totalFusions: 0,
            totalEnergyProduced: 0,  // MeV
            maxQ: 0.0,
            timePlayed: 0,           // 秒
        };

        // ゲーム進行速度
        this.speed = 1.0;
        this.paused = false;

        if (triggerListeners) {
            this.notify();
        }
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        for (const listener of this.listeners) {
            listener(this);
        }
    }

    // 施設コストの計算
    getBuildingCost(buildingId) {
        const def = BUILDINGS.find(b => b.id === buildingId);
        if (!def) return null;
        const count = this.buildings[buildingId] || 0;
        const multiplier = Math.pow(def.costMultiplier, count);

        const cost = {};
        for (const [res, amount] of Object.entries(def.cost)) {
            cost[res] = Math.ceil(amount * multiplier);
        }
        return cost;
    }

    canAfford(costObj) {
        if (!costObj) return false;
        for (const [res, amount] of Object.entries(costObj)) {
            let current = 0;
            if (res === 'energy') current = this.energy;
            else if (res === 'up') current = this.upQuarks;
            else if (res === 'down') current = this.downQuarks;
            else if (res === 'electron') current = this.electrons;
            else if (res === 'proton') current = this.protons;
            else if (res === 'neutron') current = this.neutrons;
            else if (res === 'hydrogen') current = this.hydrogen;
            else if (res === 'deuterium') current = this.deuterium;
            else if (res === 'tritium') current = this.tritium;
            else if (res === 'helium') current = this.helium;
            else if (res === 'fastNeutron') current = this.fastNeutrons;

            if (current < amount) return false;
        }
        return true;
    }

    spend(costObj) {
        if (!this.canAfford(costObj)) return false;
        for (const [res, amount] of Object.entries(costObj)) {
            if (res === 'energy') this.energy -= amount;
            else if (res === 'up') this.upQuarks -= amount;
            else if (res === 'down') this.downQuarks -= amount;
            else if (res === 'electron') this.electrons -= amount;
            else if (res === 'proton') this.protons -= amount;
            else if (res === 'neutron') this.neutrons -= amount;
            else if (res === 'hydrogen') this.hydrogen -= amount;
            else if (res === 'deuterium') this.deuterium -= amount;
            else if (res === 'tritium') this.tritium -= amount;
            else if (res === 'helium') this.helium -= amount;
            else if (res === 'fastNeutron') this.fastNeutrons -= amount;
        }
        return true;
    }

    // ローカルストレージへのセーブ
    save() {
        try {
            const data = {
                upQuarks: this.upQuarks,
                downQuarks: this.downQuarks,
                electrons: this.electrons,
                protons: this.protons,
                neutrons: this.neutrons,
                hydrogen: this.hydrogen,
                deuterium: this.deuterium,
                tritium: this.tritium,
                helium: this.helium,
                fastNeutrons: this.fastNeutrons,
                lithium6: this.lithium6,
                energy: this.energy,
                buildings: this.buildings,
                unlockedTechs: this.unlockedTechs,
                achievements: this.achievements,
                stats: this.stats,
                reactor: {
                    active: this.reactor.active,
                    continuousInjection: this.reactor.continuousInjection,
                    chamberFuelD: this.reactor.chamberFuelD,
                    chamberFuelT: this.reactor.chamberFuelT,
                },
                timestamp: Date.now(),
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    // ローカルストレージからのロード
    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);

            this.upQuarks = data.upQuarks ?? 6;
            this.downQuarks = data.downQuarks ?? 6;
            this.electrons = data.electrons ?? 4;
            this.protons = data.protons ?? 0;
            this.neutrons = data.neutrons ?? 0;
            this.hydrogen = data.hydrogen ?? 0;
            this.deuterium = data.deuterium ?? 0;
            this.tritium = data.tritium ?? 0;
            this.helium = data.helium ?? 0;
            this.fastNeutrons = data.fastNeutrons ?? 0;
            this.lithium6 = data.lithium6 ?? 50;
            this.energy = data.energy ?? 0;

            if (data.buildings) Object.assign(this.buildings, data.buildings);
            if (data.unlockedTechs) Object.assign(this.unlockedTechs, data.unlockedTechs);
            if (data.achievements) Object.assign(this.achievements, data.achievements);
            if (data.stats) Object.assign(this.stats, data.stats);
            if (data.reactor) {
                this.reactor.active = !!data.reactor.active;
                this.reactor.continuousInjection = !!data.reactor.continuousInjection;
                this.reactor.chamberFuelD = data.reactor.chamberFuelD ?? 0;
                this.reactor.chamberFuelT = data.reactor.chamberFuelT ?? 0;
            }

            this.notify();
            return true;
        } catch (e) {
            console.error('Failed to load game:', e);
            return false;
        }
    }

    clearSave() {
        localStorage.removeItem(SAVE_KEY);
        this.reset(true);
    }
}

// 数値フォーマッター
export function formatNumber(val, decimals = 1) {
    if (val === undefined || val === null || isNaN(val)) return '0';
    if (val === 0) return '0';
    if (Math.abs(val) < 1e-4) return '0';

    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';

    if (abs < 1000) {
        return sign + (Number.isInteger(val) ? val.toString() : val.toFixed(decimals));
    }

    const suffixes = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
    const exp = Math.floor(Math.log10(abs) / 3);

    if (exp < suffixes.length) {
        const scaled = abs / Math.pow(10, exp * 3);
        return sign + scaled.toFixed(scaled >= 100 ? 0 : (scaled >= 10 ? 1 : 2)) + ' ' + suffixes[exp];
    }

    return sign + val.toExponential(2);
}

// エネルギーフォーマッター (MeV と Joules を併記または動的切り替え)
export function formatEnergy(valMeV) {
    if (!valMeV || valMeV <= 0) return '0 MeV';
    const joules = valMeV * PHYSICS.MEV_TO_JOULE;

    if (valMeV < 1000) {
        return `${formatNumber(valMeV, 1)} MeV`;
    }
    if (joules < 1.0) {
        return `${formatNumber(valMeV, 1)} MeV (${formatNumber(joules * 1e6, 1)} µJ)`;
    }
    if (joules < 1e3) {
        return `${formatNumber(joules, 2)} J (${formatNumber(valMeV, 1)} MeV)`;
    }
    if (joules < 1e6) {
        return `${formatNumber(joules / 1e3, 2)} kJ`;
    }
    if (joules < 1e9) {
        return `${formatNumber(joules / 1e6, 2)} MJ`;
    }
    if (joules < 1e12) {
        return `${formatNumber(joules / 1e9, 2)} GJ`;
    }
    return `${formatNumber(joules / 1e12, 2)} TJ`;
}

// 電力フォーマッター (W, kW, MW, GW)
export function formatPower(powerMW) {
    if (powerMW < 0.001) return '0.0 W';
    if (powerMW < 1.0) return `${formatNumber(powerMW * 1000, 1)} kW`;
    if (powerMW < 1000) return `${formatNumber(powerMW, 2)} MW`;
    if (powerMW < 1e6) return `${formatNumber(powerMW / 1000, 2)} GW`;
    return `${formatNumber(powerMW / 1e6, 2)} TW`;
}

export const state = new GameState();
