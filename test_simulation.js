/**
 * test_simulation.js
 * ゲームループ・物理計算・拡大再生産サイクルの自動シミュレーションテスト
 */

import { state } from './js/state.js';
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
// 重水素 (2H / D): 1p + 1n + 1e- -> 1 D
const dCreated = particleSys.craftDeuterium(1);
assert(dCreated === 1, '重水素 D を1個合成');
assert(state.protons === 1, '陽子残量1');
assert(state.neutrons === 1, '中性子残量1');
assert(state.electrons === 3, '電子残量3');

// さらに中性子を追加して三重水素 (3H / T): 1p + 2n + 1e- -> 1 T
particleSys.shoot('up');
particleSys.shoot('down');
particleSys.shoot('down');
particleSys.craftNeutron(1); // これで中性子計2個
const tCreated = particleSys.craftTritium(1);
assert(tCreated === 1, '三重水素 T を1個合成');
assert(state.deuterium === 1 && state.tritium === 1, '燃料 D=1, T=1 準備完了');

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
state.hydrogen = 100;
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

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! ゲームロジック・拡大再生産サイクル・リチウム/重水素大量生産は完全に正常です。');

