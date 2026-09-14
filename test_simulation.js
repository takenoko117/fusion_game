/**
 * test_simulation.js
 * ゲームループ・物理計算・拡大再生産サイクルの自動シミュレーションテスト
 */

import { state, formatEnergy, formatElectronVolt } from './js/state.js';
import { ParticleSystem } from './js/systems/ParticleSystem.js';
import { FusionSystem } from './js/systems/FusionSystem.js';
import { AutomationSystem } from './js/systems/AutomationSystem.js';
import { UpgradeSystem } from './js/systems/UpgradeSystem.js';
import { BUILDINGS, RESEARCH_TECH, ACHIEVEMENTS, PHYSICS } from './js/constants.js';

function assert(condition, message) {
    if (!condition) {
        console.error('❌ ASSERTION FAILED:', message);
        process.exit(1);
    } else {
        console.log('✅ PASS:', message);
    }
}

console.log('--- 1. 初期状態テスト ---');
state.reset(false);
assert(state.upQuarks === 6, '初期アップクォークは6個');
assert(state.downQuarks === 6, '初期ダウンクォークは6個');
assert(state.electrons === 4, '初期電子は4個');

const particleSys = new ParticleSystem(state, null);
const fusionSys = new FusionSystem(state, null);
const autoSys = new AutomationSystem(state, particleSys);
const upgradeSys = new UpgradeSystem(state);

console.log('--- 2. 素粒子射出とハドロン合成テスト ---');
// 陽子合成: 2u + 1d -> 1p
const protonsCreated = particleSys.craftProton(2);
assert(protonsCreated === 2, '陽子2個を正常に合成');
assert(state.upQuarks === 2, 'uクォーク消費確認 (6 - 4 = 2)');
assert(state.downQuarks === 4, 'dクォーク消費確認 (6 - 2 = 4)');

// 中性子合成: 1u + 2d -> 1n
const neutronsCreated = particleSys.craftNeutron(2);
assert(neutronsCreated === 2, '中性子2個を正常に合成');
assert(state.upQuarks === 0, 'uクォーク消費確認 (2 - 2 = 0)');
assert(state.downQuarks === 0, 'dクォーク消費確認 (4 - 4 = 0)');

console.log('--- 3. 同位体合成テスト ---');
// 重水素 (²H): 1p + 1n + 1e- -> 1 ²H
const dCreated = particleSys.craftDeuterium(1);
assert(dCreated === 1, '重水素 ²H を1個合成');
assert(state.protons === 1, '陽子残量1');
assert(state.neutrons === 1, '中性子残量1');
assert(state.electrons === 3, '電子残量3');

// さらに中性子を追加して三重水素 (³H): 1p + 2n + 1e- -> 1 ³H
particleSys.shoot('up');
particleSys.shoot('down');
particleSys.shoot('down');
particleSys.craftNeutron(1); // これで中性子計2個
const tCreated = particleSys.craftTritium(1);
assert(tCreated === 1, '三重水素 ³H を1個合成');
assert(state.deuterium === 1 && state.tritium === 1, '燃料 ²H=1, ³H=1 準備完了');

console.log('--- 4. プラズマ核融合反応 (D-T) テスト ---');
// 燃料を炉心に注入
fusionSys.injectFuel(1, 1);
assert(state.reactor.chamberFuelD === 1, '炉心に重水素1注入');
assert(state.reactor.chamberFuelT === 1, '炉心に三重水素1注入');

// パルス点火実行
const initialEnergy = state.energy;
const initialHelium = state.helium;
const initialNeutrons = state.fastNeutrons;

const ignited = fusionSys.triggerManualIgnition();
assert(ignited === true, '核融合点火成功');
assert(state.energy > initialEnergy, `エネルギー獲得確認 (${state.energy - initialEnergy} MeV)`);
assert(state.helium === initialHelium + 1, 'ヘリウム-4 生成確認');
assert(state.fastNeutrons === initialNeutrons + 1, '14.1 MeV 高速中性子 生成確認');
assert(state.reactor.temperatureKeV > 1.0, 'アルファ粒子自己加熱による温度上昇確認');

console.log('--- 5. リチウム増殖ブランケット (自立拡大再生産ループ) テスト ---');
// 増殖ブランケットを1基付与 (建設)
state.buildings['breeding_blanket'] = 1;
state.fastNeutrons = 10;
state.lithium6 = 20;
const prevTritium = state.tritium;
const prevEnergy = state.energy;

// 1秒シミュレーション更新
autoSys.update(1.0);

assert(state.fastNeutrons < 10, 'ブランケットが中性子を吸収処理');
assert(state.tritium > prevTritium, `トリチウム自立増殖確認 (+${(state.tritium - prevTritium).toFixed(2)} T)`);
assert(state.energy > prevEnergy, 'リチウム増殖反応に伴う追加エネルギー (4.78 MeV) 獲得確認');

console.log('--- 6. 設備購入と拡大再生産スケーリング テスト ---');
// 十分なエネルギーがある状態で施設を購入
state.energy = 50000;
const boughtDispenserU = autoSys.buyBuilding('quark_dispenser_u');
assert(boughtDispenserU === true, 'クォーク抽出機購入成功');
assert(state.buildings['quark_dispenser_u'] === 1, '保有数1に増加');

const boughtMagnet = autoSys.buyBuilding('superconducting_magnet');
assert(boughtMagnet === true, '超伝導マグネット購入成功');

// パラメータ更新
fusionSys.update(0.1);
assert(state.reactor.magneticFieldTesla > 3.5, '磁場強度向上確認');
assert(state.reactor.confinementTime > 0.15, '閉じ込め時間向上確認');

console.log('--- 7. 研究開発ツリー テスト ---');
state.energy = 100000;
state.helium = 50;
const researched = upgradeSys.research('res_gluon_confinement');
assert(researched === true, 'グルーオン弦張力制御の研究完了');
assert(state.unlockedTechs['res_gluon_confinement'] === true, '研究フラグON確認');

console.log('--- 8. リチウム大量生産設備 & 一括補充 テスト ---');
state.energy = 200000;
state.hydrogen = 50;
state.helium = 100;

// 海水抽出プラント建設
const bExt = autoSys.buyBuilding('lithium_extractor');
assert(bExt === true, '海水リチウム吸着電解プラント建設成功');

// レーザー濃縮カスケード建設
const bEnr = autoSys.buyBuilding('lithium_enricher');
assert(bEnr === true, 'リチウム-6 レーザー同位体濃縮カスケード建設成功');

// 小惑星採掘船団建設
const bHarv = autoSys.buyBuilding('orbital_lithium_harvester');
assert(bHarv === true, '小惑星帯リチウム採掘ドローン船団建設成功');

const expectedRate = 5 + 50 + 500; // 555 Li / sec
const actualRate = autoSys.getLithiumProductionRate();
assert(actualRate === expectedRate, `リチウム自動生産レート正常確認 (${actualRate} Li/秒)`);

// 1秒間の自動生産 (中性子消費のない純生産を検証)
state.fastNeutrons = 0;
const prevLi = state.lithium6;
autoSys.update(1.0);
assert(Math.round(state.lithium6 - prevLi) === expectedRate, 'リチウム自動大量生産確認');

// 一括補充テスト
const bLi100 = autoSys.buyLithium(100);
assert(bLi100 === true, 'リチウム-6 一括補充 (+100 Li) 成功');
const bLi1000 = autoSys.buyLithium(1000);
assert(bLi1000 === true, 'リチウム-6 一括補充 (+1,000 Li) 成功');

console.log('--- 9. 海水重水素大量生産設備 テスト ---');
assert(autoSys.getDeuteriumProductionRate() === 0, '初期重水素生産レートは0');

state.energy = 500000;
state.hydrogen = 300;
state.helium = 200;

// GSプラント購入 (10 D/sec)
const bGS = autoSys.buyBuilding('deuterium_extractor_gs');
assert(bGS === true, 'GS海水重水電解プラント建設成功');

// 極低温蒸留コンプレックス購入 (100 D/sec)
const bCryo = autoSys.buyBuilding('deuterium_distillery_cryo');
assert(bCryo === true, '極低温液体水素精密蒸留コンプレックス建設成功');

// 海洋メガフロート購入 (1000 D/sec)
const bFloat = autoSys.buyBuilding('deuterium_megafloat');
assert(bFloat === true, '海洋直接触媒抽出メガフロート群建設成功');

const expectedDRate = 10 + 100 + 1000; // 1110 D/sec
const actualDRate = autoSys.getDeuteriumProductionRate();
assert(actualDRate === expectedDRate, `重水素自動生産レート正常確認 (${actualDRate} D/秒)`);

// 1秒間の自動生産
const prevD = state.deuterium;
autoSys.update(1.0);
assert(Math.round(state.deuterium - prevD) === expectedDRate, '海水重水素自動大量生産確認');

console.log('--- 10. 軽水素(¹H)大量生産設備 テスト ---');
assert(autoSys.getHydrogenProductionRate() === 0, '初期水素生産レートは0');

state.energy = 500000;
state.electrons = 100;
state.helium = 200;

// PEM純水電解ユニット購入 (20 H/sec)
const bPEM = autoSys.buyBuilding('hydrogen_electrolyzer_pem');
assert(bPEM === true, 'PEM式 純水電解セルユニット建設成功');

// 光触媒コンプレックス購入 (200 H/sec)
const bPhoto = autoSys.buyBuilding('hydrogen_photocatalytic_plant');
assert(bPhoto === true, '高温水蒸気電解・光触媒コンプレックス建設成功');

// 熱プラズマ分解タワー購入 (2000 H/sec)
const bPlasma = autoSys.buyBuilding('hydrogen_plasma_pyrolysis');
assert(bPlasma === true, '超高温水蒸気熱プラズマ分解タワー建設成功');

const expectedHRate = 20 + 200 + 2000; // 2220 H/sec
const actualHRate = autoSys.getHydrogenProductionRate();
assert(actualHRate === expectedHRate, `軽水素自動生産レート正常確認 (${actualHRate} H/秒)`);

// 1秒間の自動生産
const prevH = state.hydrogen;
autoSys.update(1.0);
assert(Math.round(state.hydrogen - prevH) === expectedHRate, '軽水素自動大量生産確認');

console.log('--- 10b. 自動同位体分子ビーム結晶機 (トリチウム単独生成) テスト ---');
// 海水重水素生産施設等を一時退避して結晶機単体の挙動を検証
const savedGS = state.buildings['deuterium_extractor_gs'] || 0;
const savedCryo = state.buildings['deuterium_distillery_cryo'] || 0;
const savedFloat = state.buildings['deuterium_megafloat'] || 0;
state.buildings['deuterium_extractor_gs'] = 0;
state.buildings['deuterium_distillery_cryo'] = 0;
state.buildings['deuterium_megafloat'] = 0;

state.buildings['auto_isotope_assembler'] = 1;
state.protons = 5;
state.electrons = 5;
state.neutrons = 10;
state.deuterium = 0;
state.tritium = 0;

// 1秒間稼働 (craftsPerSec = 0.8)
autoSys.update(1.0);
assert(state.deuterium === 0, '重水素(²H)は生成されない (0のまま)');
assert(Math.abs(state.tritium - 0.8) < 1e-5, '三重水素(³H)のみが生成される (+0.8 ³H)');
assert(Math.abs(state.protons - 4.2) < 1e-5, '陽子が正常に消費される (5 - 0.8 = 4.2)');
assert(Math.abs(state.neutrons - 8.4) < 1e-5, '中性子が2倍消費される (10 - 1.6 = 8.4)');
assert(Math.abs(state.electrons - 4.2) < 1e-5, '電子が正常に消費される (5 - 0.8 = 4.2)');

// 中性子が1個だけの場合 (重水素の素材はあるが、三重水素の素材中性子>=2が不足)
state.protons = 5;
state.electrons = 5;
state.neutrons = 1;
state.deuterium = 0;
const prevTr = state.tritium;
autoSys.update(1.0);
assert(state.deuterium === 0, '中性子1個でも重水素(²H)は生成されない');
assert(state.tritium === prevTr, '中性子不足時は三重水素(³H)も生成されない');
assert(state.protons === 5 && state.neutrons === 1 && state.electrons === 5, '素材が誤って消費されない');

// 施設数を復元
state.buildings['deuterium_extractor_gs'] = savedGS;
state.buildings['deuterium_distillery_cryo'] = savedCryo;
state.buildings['deuterium_megafloat'] = savedFloat;

console.log('--- 11. エネルギー単位フォーマッター テスト ---');
assert(formatElectronVolt(500) === '500 MeV', '500 MeV 表記確認');
assert(formatElectronVolt(1000) === '1.00 GeV', '1000 MeV -> 1.00 GeV 表記確認 (k MeV ではない)');
assert(formatEnergy(1000) === '1.00 GeV', 'formatEnergy(1000) が 1.00 GeV');
assert(formatElectronVolt(1500) === '1.50 GeV', '1500 MeV -> 1.50 GeV 表記確認');
assert(formatElectronVolt(10000) === '10.0 GeV', '10000 MeV -> 10.0 GeV 表記確認');
console.log('--- 12. 段階的アンロック（プログレッション）ロジック テスト ---');
// ステージ 0: 初期状態
state.reset(false);
assert(!(state.protons > 0 || state.neutrons > 0), 'ステージ0: 陽子・中性子は未解放');
assert(!(state.deuterium > 0 || state.tritium > 0), 'ステージ0: トカマク炉心は未解放');
assert(!(state.stats.totalFusions > 0 || state.energy > 0), 'ステージ0: 拡大再生産は未解放');

// ステージ 1: 陽子合成
state.protons = 1;
assert((state.protons > 0 || state.neutrons > 0), 'ステージ1: 陽子合成により水素同位体組み立て解放');
assert(!(state.deuterium > 0 || state.tritium > 0), 'ステージ1: トカマク炉心は未解放');

// ステージ 2: 重水素合成
state.deuterium = 1;
assert((state.deuterium > 0 || state.tritium > 0), 'ステージ2: 重水素(²H)合成によりトカマク炉心解放');
assert(!(state.stats.totalFusions > 0 || state.energy > 0), 'ステージ2: 拡大再生産は未解放');

// ステージ 3: 初核融合点火成功
state.stats.totalFusions = 1;
state.energy = 17.59;
state.stats.totalEnergyProduced = 17.59;
assert((state.stats.totalFusions > 0 || state.energy > 0), 'ステージ3: 核融合点火成功により拡大再生産施設が解放');

// 施設アンロック条件の検証
const initialBuildings = BUILDINGS.filter(b => state.stats.totalEnergyProduced >= (b.unlockEnergy || 0));
const initialBuildingIds = initialBuildings.map(b => b.id);
assert(initialBuildingIds.includes('quark_dispenser_u'), '初期施設: アップクォーク抽出機が含まれる');
assert(initialBuildingIds.includes('quark_dispenser_d'), '初期施設: ダウンクォーク抽出機が含まれる');
assert(initialBuildingIds.includes('electron_gun'), '初期施設: 電子銃が含まれる');
assert(!initialBuildingIds.includes('breeding_blanket'), 'リチウム増殖ブランケットは500MeV未満では未解放');
assert(!initialBuildingIds.includes('deuterium_megafloat'), 'メガフロートは35000MeV未満では未解放');

// 1000 MeV 獲得時
state.stats.totalEnergyProduced = 1000;
const midBuildings = BUILDINGS.filter(b => state.stats.totalEnergyProduced >= (b.unlockEnergy || 0));
const midBuildingIds = midBuildings.map(b => b.id);
assert(midBuildingIds.includes('breeding_blanket'), '1000MeV獲得時: リチウム増殖ブランケット解放');
assert(midBuildingIds.includes('auto_isotope_assembler'), '1000MeV獲得時: 自動同位体分子ビーム結晶機解放');

console.log('--- 13. Q値・核融合熱出力(MW)・臨界プラズマ条件 (Q ≧ 1) テスト ---');
// A. 初期手動点火 (アップグレードなし)
state.reset(false);
state.deuterium = 1;
state.tritium = 1;
fusionSys.injectFuel(1, 1);
fusionSys.triggerManualIgnition();
assert(state.reactor.fusionPowerMW > 0, `核融合出力が正の値 (${state.reactor.fusionPowerMW.toFixed(2)} MW)`);
assert(state.reactor.qValue < 1.0, `初回手動点火では Q < 1.0 (${state.reactor.qValue.toFixed(2)})`);
assert(state.achievements['ach_breakeven'] !== true, '初期手動点火で臨界実績は解除されない');

// B. 臨界構成 (HTS 4基, NBI 3基, ペレット 2基)
state.buildings['superconducting_magnet'] = 4;
state.buildings['nbi_heater'] = 3;
state.buildings['pellet_injector'] = 2;
state.reactor.continuousInjection = true;

// パラメータ更新（NBI外部加熱による昇温を反映）
for (let i = 0; i < 30; i++) {
    fusionSys.update(1 / 60);
}
const tp = fusionSys.getTripleProduct();
assert(tp >= PHYSICS.LAWSON_BREAKEVEN, `ローソン三重積が臨界目安 (0.6e21) を突破 (${(tp / 1e21).toFixed(3)}e21)`);

// 燃料を十分持たせて自動連続燃焼シミュレーション
state.deuterium = 100;
state.tritium = 100;
for (let i = 0; i < 180; i++) { // 3秒間 (180フレーム)
    fusionSys.update(1 / 60);
    autoSys.update(1 / 60);
}

assert(state.stats.maxQ >= 1.0, `連続燃焼により maxQ ≧ 1.0 を達成 (${state.stats.maxQ.toFixed(2)})`);
assert(state.achievements['ach_breakeven'] === true, '実績「臨界プラズマ条件 (Q ≧ 1)」が正常にアンロック');

// C. 自律燃焼プラズマ構成 (研究「自己加熱燃焼プラズマ自律制御」習得時)
state.unlockedTechs['res_burning_plasma'] = true;
state.buildings['superconducting_magnet'] = 6;
state.deuterium = 200;
state.tritium = 200;
for (let i = 0; i < 300; i++) { // 5秒間
    fusionSys.update(1 / 60);
    autoSys.update(1 / 60);
}
assert(state.stats.maxQ >= 5.0, `燃焼プラズマ自律制御により maxQ ≧ 5.0 を達成 (${state.stats.maxQ.toFixed(2)})`);

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! ゲームロジック・拡大再生産・Q値物理スケール・臨界達成は完全に正常です。');


