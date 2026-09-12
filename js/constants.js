/**
 * constants.js
 * 核融合シミュレーションの物理定数、素粒子データ、レシピ、施設、研究、図鑑データ
 */

export const PHYSICS = {
    // 質量 (MeV/c^2)
    MASS: {
        UP_QUARK: 2.2,
        DOWN_QUARK: 4.7,
        ELECTRON: 0.511,
        PROTON: 938.272,
        NEUTRON: 939.565,
        DEUTERON: 1875.613,
        TRITON: 2808.921,
        HELIUM4: 3727.379,
    },
    // 反応エネルギー (MeV)
    ENERGY: {
        DT_FUSION: 17.59,      // 2H + 3H -> 4He (3.5 MeV) + n (14.1 MeV)
        TT_FUSION: 11.33,      // 3H + 3H -> 4He + 2n + 11.3 MeV
        DD_FUSION_T: 4.03,     // 2H + 2H -> 3H (1.01 MeV) + p (3.02 MeV)
        DD_FUSION_HE3: 3.27,   // 2H + 2H -> 3He (0.82 MeV) + n (2.45 MeV)
        BREEDING_LI6: 4.78,    // 6Li + n -> 4He (2.05 MeV) + 3H (2.73 MeV)
    },
    // 1 MeV = 1.60218e-13 J
    MEV_TO_JOULE: 1.60218e-13,
    // ローソン条件の基準値 (n * T * tau_E >= 3.0e21 keV * s / m^3 で自己点火)
    LAWSON_IGNITION: 3.0e21,
    LAWSON_BREAKEVEN: 0.6e21, // Q=1の目安
};

// 素粒子の定義
export const PARTICLES = {
    UP: {
        id: 'up',
        name: 'アップクォーク',
        symbol: 'u',
        charge: '+2/3',
        color: '#ff4d6d',
        massMeV: 2.2,
        desc: '陽子や中性子を構成する第1世代のクォーク。電荷は+2/3。',
    },
    DOWN: {
        id: 'down',
        name: 'ダウンクォーク',
        symbol: 'd',
        charge: '-1/3',
        color: '#4cc9f0',
        massMeV: 4.7,
        desc: '陽子や中性子を構成する第1世代のクォーク。電荷は-1/3。',
    },
    ELECTRON: {
        id: 'electron',
        name: '電子 (レプトン)',
        symbol: 'e⁻',
        charge: '-1',
        color: '#ffd166',
        massMeV: 0.511,
        desc: '原子核の周囲を周回する軽粒子（レプトン）。電荷は-1。',
    },
};

// ハドロン合成レシピ
export const HADRON_RECIPES = {
    PROTON: {
        id: 'proton',
        name: '陽子',
        symbol: 'p',
        composition: { up: 2, down: 1 },
        charge: '+1',
        color: '#ff0055',
        desc: 'アップクォーク2個とダウンクォーク1個が強い相互作用（グルーオン）で結合したもの。電荷+1。',
    },
    NEUTRON: {
        id: 'neutron',
        name: '中性子',
        symbol: 'n',
        composition: { up: 1, down: 2 },
        charge: '0',
        color: '#00b4d8',
        desc: 'アップクォーク1個とダウンクォーク2個が結合したもの。電荷0。核分裂や核融合増殖の鍵。',
    },
};

// 原子・同位体合成レシピ
export const ATOM_RECIPES = {
    HYDROGEN: {
        id: 'hydrogen',
        name: '軽水素 (プロチウム)',
        symbol: '¹H',
        composition: { proton: 1, neutron: 0, electron: 1 },
        desc: '宇宙で最も豊富な元素。陽子1個と電子1個からなる。',
        color: '#90e0ef',
    },
    DEUTERIUM: {
        id: 'deuterium',
        name: '重水素 (デューテリウム)',
        symbol: '²H (D)',
        composition: { proton: 1, neutron: 1, electron: 1 },
        desc: '陽子1個、中性子1個、電子1個。海水中におよそ7000個に1個の割合で無尽蔵に存在する。',
        color: '#06d6a0',
    },
    TRITIUM: {
        id: 'tritium',
        name: '三重水素 (トリチウム)',
        symbol: '³H (T)',
        composition: { proton: 1, neutron: 2, electron: 1 },
        desc: '陽子1個、中性子2個、電子1個。半減期12.3年の放射性同位体。地球上の天然にはごく微量しか存在しないため、核融合炉内でリチウムから「増殖」させて調達する。',
        color: '#f72585',
    },
};

// 拡大再生産用 施設定義
export const BUILDINGS = [
    {
        id: 'quark_dispenser_u',
        name: 'アップクォーク真空抽出機',
        desc: '真空エネルギー揺らぎからアップクォークを対生成し自動注入します。',
        category: 'particle',
        cost: { energy: 10 },
        costMultiplier: 1.15,
        production: { up: 1 }, // 毎秒
        icon: '⚛️',
    },
    {
        id: 'quark_dispenser_d',
        name: 'ダウンクォーク真空抽出機',
        desc: '真空エネルギー揺らぎからダウンクォークを対生成し自動注入します。',
        category: 'particle',
        cost: { energy: 12 },
        costMultiplier: 1.15,
        production: { down: 1 },
        icon: '💠',
    },
    {
        id: 'electron_gun',
        name: '熱陰極レプトン電子銃',
        desc: '高エネルギー熱電子放出により電子を自動生成します。',
        category: 'particle',
        cost: { energy: 8 },
        costMultiplier: 1.14,
        production: { electron: 1 },
        icon: '⚡',
    },
    {
        id: 'auto_hadronizer',
        name: '強相関クォーク閉じ込め結合炉',
        desc: '注入されたクォークを自動的に陽子・中性子へと高効率で結合します。',
        category: 'synthesis',
        cost: { energy: 50 },
        costMultiplier: 1.2,
        productionHadronRate: 1, // 毎秒1回自動合成
        icon: '🔄',
    },
    {
        id: 'auto_isotope_assembler',
        name: '自動同位体分子ビーム結晶機',
        desc: '核子と電子をクーロン電場で捕捉し、重水素や三重水素を自動合成します。',
        category: 'synthesis',
        cost: { energy: 200 },
        costMultiplier: 1.22,
        productionAtomRate: 1,
        icon: '🧬',
    },
    {
        id: 'breeding_blanket',
        name: 'リチウム増殖ブランケット',
        desc: 'D-T核融合で生じる高速中性子(14.1MeV)を捕獲: ⁶Li + n → ⁴He + ³H + 4.8MeV。三重水素を自律自己増殖させ、拡大再生産のループを完成させます！',
        category: 'fusion',
        cost: { energy: 1000, deuterium: 5, helium: 2 },
        costMultiplier: 1.25,
        tritiumBreedingRatio: 1.15, // 1中性子から1.15個のトリチウムを増殖
        icon: '🛡️',
    },
    {
        id: 'superconducting_magnet',
        name: '高温超伝導(HTS)トロイダル磁場コイル',
        desc: '希土類バリウム銅酸化物(REBCO)テープを用いた超強力磁場。プラズマの閉じ込め時間τ_Eを飛躍的に向上させます。',
        category: 'fusion',
        cost: { energy: 3000 },
        costMultiplier: 1.3,
        tauBoost: 0.15, // 閉じ込め時間 +0.15秒
        icon: '🧲',
    },
    {
        id: 'nbi_heater',
        name: '高エネルギー中性粒子ビーム入射装置 (NBI)',
        desc: '中性化させたメガ電子ボルトの粒子をプラズマに撃ち込み、中心温度を1億℃超へと急速加熱します。',
        category: 'fusion',
        cost: { energy: 8000 },
        costMultiplier: 1.35,
        tempBoost: 2.0, // keV
        icon: '🎯',
    },
    {
        id: 'pellet_injector',
        name: '極低温固体重水素・三重水素ペレット連続注入器',
        desc: '凍結した燃料ペレットを高速射出し、プラズマ中心密度nを安定して極限まで高めます。',
        category: 'fusion',
        cost: { energy: 20000 },
        costMultiplier: 1.4,
        densityBoost: 0.5, // 10^20 m^-3
        icon: '🧊',
    },
    {
        id: 'advanced_divertor',
        name: '液体リチウム流動ダイバータ & MHD熱回収発電機',
        desc: 'プラズマ境界の熱と不純物(ヘリウム灰)を排出しつつ、直截磁気流体力学(MHD)で核融合熱を驚異の変換効率で電力化します。',
        category: 'fusion',
        cost: { energy: 80000 },
        costMultiplier: 1.45,
        efficiencyBoost: 0.25, // 発電効率UP
        icon: '🌀',
    },
    {
        id: 'lithium_extractor',
        name: '海水リチウム吸着電解プラント',
        desc: '海水中から透析膜と選択吸着電極でリチウムを常時回収。リチウム-6を毎秒5個自動供給し、ブランケットの燃料切れを防ぎます。',
        category: 'breeding',
        cost: { energy: 400, hydrogen: 10 },
        costMultiplier: 1.18,
        lithiumRate: 5, // 毎秒5 Li
        icon: '🌊',
    },
    {
        id: 'lithium_enricher',
        name: 'リチウム-6 レーザー同位体濃縮カスケード',
        desc: '天然リチウムから原子蒸気レーザー同位体分離(AVLIS)によって高純度⁶Liを高精度濃縮。毎秒50個を大量供給します。',
        category: 'breeding',
        cost: { energy: 4000, helium: 5 },
        costMultiplier: 1.25,
        lithiumRate: 50, // 毎秒50 Li
        icon: '🔬',
    },
    {
        id: 'orbital_lithium_harvester',
        name: '小惑星帯リチウム採掘ドローン船団',
        desc: '小惑星帯(アステロイドベルト)の豊富な鉱床からリチウムを高出力マスドライバーで地球軌道へ直送。毎秒500個を爆発的大量供給します！',
        category: 'breeding',
        cost: { energy: 45000, helium: 50 },
        costMultiplier: 1.35,
        lithiumRate: 500, // 毎秒500 Li
        icon: '🚀',
    },
    {
        id: 'hydrogen_electrolyzer_pem',
        name: 'PEM式 純水電解セルユニット',
        desc: '固体高分子電解質膜(PEM)により純水を高効率電気分解。クォークや核子の合成を介さず、軽水素(¹H)を毎秒20個自動精製します。',
        category: 'fuel',
        cost: { energy: 200, electron: 4 },
        costMultiplier: 1.15,
        hydrogenRate: 20, // 毎秒20 H
        icon: '⚗️',
    },
    {
        id: 'hydrogen_photocatalytic_plant',
        name: '高温水蒸気電解・光触媒コンプレックス',
        desc: 'トカマク炉の排熱エネルギーと多接合光触媒ナノ構造を併用し、水蒸気を超高効率熱化学分解。軽水素(¹H)を毎秒200個大量精製します。',
        category: 'fuel',
        cost: { energy: 2500, helium: 3 },
        costMultiplier: 1.22,
        hydrogenRate: 200, // 毎秒200 H
        icon: '🏭',
    },
    {
        id: 'hydrogen_plasma_pyrolysis',
        name: '超高温水蒸気熱プラズマ分解タワー',
        desc: '高周波マイクロ波プラズマトーチにより水蒸気を瞬時に原子解離。毎秒2,000個の軽水素(¹H)を爆発的に連続供給します！',
        category: 'fuel',
        cost: { energy: 25000, helium: 25 },
        costMultiplier: 1.30,
        hydrogenRate: 2000, // 毎秒2000 H
        icon: '⚡',
    },
    {
        id: 'deuterium_extractor_gs',
        name: 'ギルドラー・サルファイド式 海水重水電解プラント',
        desc: '海水中(約7,000個に1個の割合)に含まれる重水(D₂O)を硫化水素-水二温度同位体交換法と電解で抽出。重水素(²H/D)を毎秒10個自動供給します。',
        category: 'fuel',
        cost: { energy: 600, hydrogen: 15 },
        costMultiplier: 1.18,
        deuteriumRate: 10, // 毎秒10 D
        icon: '💧',
    },
    {
        id: 'deuterium_distillery_cryo',
        name: '極低温液体水素 精密蒸留コンプレックス',
        desc: '海水を電気分解して得た水素ガスを極低温(20K)で液化・精密蒸留。沸点差を利用して高純度重水素(D₂)を毎秒100個大量精製します。',
        category: 'fuel',
        cost: { energy: 6000, hydrogen: 50, helium: 8 },
        costMultiplier: 1.25,
        deuteriumRate: 100, // 毎秒100 D
        icon: '🏭',
    },
    {
        id: 'deuterium_megafloat',
        name: '海洋直接触媒抽出メガフロート群',
        desc: '巨大洋上プラントが海洋深層水を取り込み、ナノ多孔質グラフェン触媒膜で重水素を直接分離。毎秒1,000個の重水素を爆発的大量生産します！',
        category: 'fuel',
        cost: { energy: 65000, hydrogen: 200, helium: 70 },
        costMultiplier: 1.35,
        deuteriumRate: 1000, // 毎秒1000 D
        icon: '🌊',
    },
];

// 研究開発・テクノロジーアップグレード
export const RESEARCH_TECH = [
    {
        id: 'res_gluon_confinement',
        name: 'グルーオン弦張力制御',
        desc: 'クォークの閉じ込めポテンシャルを制御し、ハドロン合成時のエネルギー効率と生成速度を2倍にします。',
        cost: { energy: 150 },
        unlocked: false,
    },
    {
        id: 'res_tritium_handling',
        name: 'アドバンスト・トリチウム抽出濃縮技術',
        desc: '増殖ブランケットからのトリチウム回収ロスを最小化し、増殖効率(TBR)を+20%向上させます。',
        cost: { energy: 2500, tritium: 10 },
        unlocked: false,
    },
    {
        id: 'res_burning_plasma',
        name: '自己加熱燃焼プラズマ自律制御 (Q > 10達成)',
        desc: '生成されたアルファ粒子(⁴He, 3.5MeV)の自己加熱を利用し、外部加熱入力を削減して自己持続燃焼を実現します。',
        cost: { energy: 25000, helium: 20 },
        unlocked: false,
    },
    {
        id: 'res_quantum_tunneling',
        name: '量子トンネル確率共鳴励起',
        desc: '原子核間のクーロン障壁を量子力学的に透過する確率を高め、低温でも高い核融合断面積を維持します。',
        cost: { energy: 150000, helium: 100 },
        unlocked: false,
    },
    {
        id: 'res_stellarator_helix',
        name: '準対称ステラレーター立体磁場配位',
        desc: 'プラズマ電流を必要としない三次元ねじれ磁場により、ディスラプション（突然のプラズマ消滅）を完全克服します。',
        cost: { energy: 1000000, helium: 500 },
        unlocked: false,
    },
];

// 核融合物理図鑑（Codex）の学習データ
export const CODEX_ENTRIES = [
    {
        id: 'quarks_and_strong_force',
        title: '1. クォークと強い相互作用',
        category: '素粒子物理',
        content: `
### 素粒子の標準模型とハドロン
私たちが手にする物質の最小構成要素は、これ以上分割できない**素粒子**です。
原子核を形作る「核子（陽子と中性子）」は、素粒子である**クォーク**が3個集まってできています。

- **陽子 (Proton, p)**: アップクォーク2個 ($+2/3 \\times 2 = +4/3$) ＋ ダウンクォーク1個 ($-1/3$) $\\longrightarrow$ 電荷 **$+1$**
- **中性子 (Neutron, n)**: アップクォーク1個 ($+2/3$) ＋ ダウンクォーク2個 ($-1/3 \\times 2 = -2/3$) $\\longrightarrow$ 電荷 **$0$**

クォーク同士は、ゲージ粒子**グルーオン**が媒介する「**強い力（強い相互作用）**」によって極めて強固に結びついています。クォーク同士を引き離そうとすると、距離が開くほどエネルギーが高まり、新たなクォーク対が生まれるため、クォーク単体を孤立して取り出すことはできません（**クォークの閉じ込め**）。
        `,
    },
    {
        id: 'hydrogen_isotopes',
        title: '2. 水素の同位体 (軽水素・重水素・三重水素)',
        category: '原子物理',
        content: `
### 核融合の主役たち
水素元素 ($Z=1$) には、中性子の数が異なる3つの代表的な「同位体」が存在します。

1. **軽水素 (氕 / Protium, $^1\\text{H}$)**:
   - 陽子1個、電子1個。中性子なし。宇宙の元素の約75%を占める。
2. **重水素 (デューテリウム / Deuterium, $^2\\text{H}$ または $\\text{D}$)**:
   - 陽子1個、**中性子1個**、電子1個。
   - 海水中に約0.015%（水1リットルあたり約33ミリグラム）含まれており、海水全体では無尽蔵の燃料となります。
3. **三重水素 (トリチウム / Tritium, $^3\\text{H}$ または $\\text{T}$)**:
   - 陽子1個、**中性子2個**、電子1個。
   - 放射性同位体で、半減期は**約12.3年**。低エネルギーのベータ線を放出してヘリウム3 ($^3\\text{He}$) に壊変します。
   - 地球の天然大気中には宇宙線によって極微量（地球全体で数十キログラム程度）しか存在しないため、**核融合炉内でリチウムから人工的に作り出す（増殖する）**必要があります。
        `,
    },
    {
        id: 'mass_defect_and_energy',
        title: '3. 質量欠損と E = mc²',
        category: '核物理',
        content: `
### なぜ核融合で巨大なエネルギーが出るのか？
アインシュタインの有名な関係式:
$$E = \\Delta m \\cdot c^2$$

核融合反応の前後の粒子の重さを精密に測ると、**反応後の粒子の総質量は、反応前よりもわずかに軽くなっています**。この失われた質量を「**質量欠損 (Mass Defect)**」と呼びます。
失われた微小な質量 $\\Delta m$ に、光速度の2乗 ($c^2 \\approx 9 \\times 10^{16} \\text{ m}^2/\\text{s}^2$) という途方もない倍率が掛け合わされ、凄まじい熱・運動エネルギーとして放出されます。

重水素と三重水素わずか**1グラム**の核融合で得られるエネルギーは、石油約**8トン**を燃焼させたエネルギーに匹敵します！
        `,
    },
    {
        id: 'coulomb_barrier',
        title: '4. クーロン障壁と量子トンネル効果',
        category: 'プラズマ物理',
        content: `
### なぜ1億度以上の超高温が必要なのか？
原子核はどちらも正の電荷（$+1$）を持っているため、電気的な反発力（**クーロン反発力**）が働きます。近づけば近づくほど反発力は急上昇し、これを「**クーロン障壁**」と呼びます。

核融合を起こすには、核力（強い力）が働く距離（約 $10^{-15} \\text{ m}$）まで原子核同士を接近させなければなりません。
古典物理学的には途方もないエネルギーが必要ですが、ミクロな世界では粒子が波の性質を持つため、障壁を通り抜ける「**量子力学的トンネル効果**」が起きます。

それでも十分な頻度で衝突・トンネルさせるためには、燃料をプラズマ化し、**1億度〜1億5000万度 (10〜15 keV)** という超高温で激しく飛び交わせる必要があります。
        `,
    },
    {
        id: 'lawson_criterion',
        title: '5. ローソン条件と核融合三重積',
        category: '炉心工学',
        content: `
### 核融合炉の成功条件 (Triple Product)
英国の物理学者ジョン・ローソンが導いた、核融合反応が持続するための3大条件：

1. **プラズマ中心密度 ($n$)**: 1立方メートルあたりどれだけ粒子が密集しているか（$\\sim 10^{20} \\text{ m}^{-3}$）
2. **イオン温度 ($T$)**: 粒子がどれだけ高速で衝突しているか（$\\sim 1.5\\text{億度} / 15 \\text{ keV}$）
3. **エネルギー閉じ込め時間 ($\\tau_E$)**: 磁場の中に熱を逃がさずどれだけ長く閉じ込められるか（$\\sim$ 数秒）

この3つの積を「**核融合三重積 ($n \\cdot T \\cdot \\tau_E$)**」と呼びます。
- **$n \\cdot T \\cdot \\tau_E \\ge 3 \\times 10^{21} \\text{ keV}\\cdot\\text{s}/\\text{m}^3$** を達成すると、核融合反応で生じるアルファ線加熱だけでプラズマ温度を保てる「**自己点火条件 (Ignition)**」に到達します。
        `,
    },
    {
        id: 'breeding_blanket_loop',
        title: '6. リチウム増殖ブランケットと拡大再生産',
        category: '燃料サイクル',
        content: `
### トリチウム増殖の自律ループ (拡大再生産の核心)
D-T核融合反応:
$$^2\\text{H} + ^3\\text{H} \\longrightarrow \\,^4\\text{He}\\,(3.5\\text{ MeV}) + n\\,(14.1\\text{ MeV})$$

生じた中性子は電荷を持たないため、磁場をすり抜けて炉壁に飛び出します。この炉壁に**リチウム (Li)** を含んだ「増殖ブランケット」を配置しておきます。

中性子がリチウム6に衝突すると：
$$^6\\text{Li} + n \\longrightarrow \\,^4\\text{He} + ^3\\text{H} + 4.78\\text{ MeV}$$

中性子1個から新しい三重水素（トリチウム）が1個生まれ、さらに中性子増倍材（ベリリウムや鉛など）を組み合わせることで、**消費した以上のトリチウムを生産（トリチウム増殖比 TBR > 1.05）**することができます！
これこそが、本ゲームで体験する「**エネルギーと燃料の自律的拡大再生産**」の真髄です。
        `,
    },
    {
        id: 'real_world_projects',
        title: '7. 世界の核融合研究最前線',
        category: '最前線',
        content: `
### 実現に向かう人類の「地上の太陽」
- **ITER (国際熱核融合実験炉)**: 日本・EU・米・中・韓・露・印の7極がフランスで建設中の世界最大のトカマク型実験炉。投入エネルギーの10倍の熱出力 ($Q=10$) を目指す。
- **JT-60SA (茨城県那珂市)**: 日本と欧州が共同開発した、世界最大の稼働中超伝導トカマク型実験装置。2023年にファーストプラズマを達成し、ギネス記録に認定。
- **NIF (米国立点火施設)**: 192本の超大型レーザーを燃料ターゲットに集中照射し、2022年に人類史上初めて「エネルギー純増 ($Q > 1$)」の自己点火を慣性閉じ込めで達成。
- **民間核融合スタートアップ**: CFS (高温超伝導トカマク SPARC)、Helion Energy (磁気ターゲット核融合)、Kyoto Fusioneering (京都フュージョニアリング: ブランケット・ジャイロトロン等の要素技術) など、世界中で民間投資が爆発的に加速中。
        `,
    },
];

// 実績（アチーブメント）定義
export const ACHIEVEMENTS = [
    {
        id: 'ach_first_hadron',
        title: '素粒子の邂逅',
        desc: '初めて陽子または中性子を合成した。',
        condition: (s) => (s.protons > 0 || s.neutrons > 0),
    },
    {
        id: 'ach_first_hydrogen',
        title: '水素原子の精製',
        desc: '初めて軽水素(¹H)を合成または抽出した。',
        condition: (s) => (s.hydrogen > 0),
    },
    {
        id: 'ach_first_deuterium',
        title: '同位体の夜明け',
        desc: '初めて重水素(²H)を合成した。',
        condition: (s) => (s.deuterium > 0),
    },
    {
        id: 'ach_first_tritium',
        title: '希少なる燃料',
        desc: '初めて三重水素(³H)を合成した。',
        condition: (s) => (s.tritium > 0),
    },
    {
        id: 'ach_first_fusion',
        title: '地上の太陽の点火',
        desc: '初めて核融合反応を起こし、エネルギーを抽出した！',
        condition: (s) => (s.stats.totalFusions > 0),
    },
    {
        id: 'ach_breakeven',
        title: '臨界プラズマ条件 (Q ≧ 1)',
        desc: '核融合出力が加熱入力を上回るエネルギー損益分岐点を達成。',
        condition: (s) => (s.stats.maxQ >= 1.0),
    },
    {
        id: 'ach_breeding_loop',
        title: '自立的拡大再生産',
        desc: 'リチウム増殖ブランケットを建設し、核融合でトリチウムを自己増殖させた。',
        condition: (s) => (s.buildings['breeding_blanket'] > 0),
    },
    {
        id: 'ach_gigawatt',
        title: 'ギガワット発電網',
        desc: '核融合発電の累計エネルギーが1,000,000 MeVを突破した。',
        condition: (s) => (s.stats.totalEnergyProduced >= 1e6),
    },
    {
        id: 'ach_burning_plasma',
        title: '自律燃焼プラズマ (Q ≧ 10)',
        desc: 'ITER目標のQ値10を達成し、アルファ粒子加熱による定常燃焼領域へ突入。',
        condition: (s) => (s.stats.maxQ >= 10.0),
    },
];
