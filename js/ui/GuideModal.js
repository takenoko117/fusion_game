/**
 * GuideModal.js
 * 核融合促進・Q値極大化の攻略手順書モーダル
 * 初動から自律増殖ループ、ローソン条件達成、Q値10超えの燃焼プラズマまでを徹底ガイド
 */

export const GUIDE_SECTIONS = [
    {
        id: 'roadmap',
        title: '🗺️ 攻略ロードマップ (5大フェーズ)',
        badge: '基本進行',
        content: `
### 🚀 宇宙で最も効率的なエネルギー拡大再生産の道筋

---

#### 【Phase 1】初動点火とファーストエネルギー獲得 (0 〜 100 MeV)
1. **素粒子を射出**:
   - 「u（アップクォーク）」「d（ダウンクォーク）」「e⁻（電子）」ボタンをクリック（または「10連射」）。
2. **ハドロンと燃料の組み立て**:
   - 「陽子合成 ($2u + 1d \to p$)」と「中性子合成 ($1u + 2d \to n$)」を実行。
   - 「重水素 ($1p + 1n + 1e^-$)」と「三重水素 ($1p + 2n + 1e^-$)」をそれぞれ1個以上結合。
3. **トカマク炉心へ注入 & 点火**:
   - 「注入: 重水素 D」と「注入: 三重水素 T」を押して炉心プラズマへ送り込みます。
   - **「⚡ 磁気パルス圧縮点火」** をクリック！
   - 初のD-T核融合反応が成功し、**$17.6\\text{ MeV}$ の莫大なエネルギー** とヘリウム-4、高速中性子を獲得します！

---

#### 【Phase 2】素粒子の自動化と自律増殖ループの開通 (100 〜 10,000 MeV)
1. **素粒子生成の自動化**:
   - 獲得したエネルギーで、右カラムの施設「**アップクォーク真空抽出機**」「**ダウンクォーク真空抽出機**」「**熱陰極レプトン電子銃**」を建設。
   - 素粒子が毎秒自動的に湧き出すようになります。
2. **合成ラインの自動化**:
   - 「**自動ハドロン結合炉**」と「**自動同位体結晶機**」を順次建設。手動クリックの手間が激減します。
   - また、上部の「**全合成**」ボタンを押せば、手持ちの素粒子から重水素・三重水素が一瞬で $O(1)$ 最適合成されます。
3. ★**ゲーム最大の最重要転換点: リチウム増殖ブランケットの建設**★:
   - 「**リチウム増殖ブランケット**」を配備します。
   - 核融合で生じる $14.1\\text{ MeV}$ の高速中性子を炉壁で受け止め、以下の核反応を自動トリガー：
     $$^6\\text{Li} + n \\longrightarrow \\,^4\\text{He} + ^3\\text{H} + 4.78\\text{ MeV}$$
   - これにより、**「三重水素を消費して核融合し、放出した中性子で消費以上の三重水素を自己増殖する」という自律的な拡大再生産ループ** が完成します！

---

#### 【Phase 3】燃料の定常注入と連続燃焼 (10,000 〜 100,000 MeV)
1. **自動連続注入トグルを ON**:
   - 中央カラムの「**☑ 自動連続注入**」にチェックを入れます。
   - 手持ちの重水素(D)と三重水素(T)が常時トカマク炉心に補充され、核融合が連続して発生し続けます。
2. **海水からの重水素大量生産ラインを稼働**:
   - 海水には無尽蔵の重水素（約7000個に1個）が含まれています。
   - 「**💧 ギルドラー・サルファイド式 重水電解プラント**」(毎秒 +10 D)
   - 「**🏭 極低温液体水素 精密蒸留コンプレックス**」(毎秒 +100 D)
   - 「**🌊 海洋直接触媒抽出メガフロート群**」(毎秒 +1,000 D)
   - これらを配備することで、クォークから陽子・中性子を作る手間を完全にバイパスし、毎秒数百〜数千個の重水素を炉心へ直結供給できます！
3. **リチウム-6 大量生産設備の配備**:
   - 「海水リチウム抽出プラント」「レーザー濃縮カスケード」「小惑星採掘船団」を建設し、リチウム-6も毎秒自動供給化。
4. **軽水素(¹H)大量生産設備の導入**:
   - 高度抽出プラントや蒸留複合体の原料・建設材となる軽水素を、「**⚗️ PEM式 純水電解セル**」(毎秒 +20 H)、「**🏭 光触媒コンプレックス**」(毎秒 +200 H)、「**⚡ 熱プラズマ分解タワー**」(毎秒 +2,000 H) で自動生産。
   - これにより、**軽水素(¹H)・重水素(²H)・三重水素(³H)・リチウム(⁶Li)の全ラインが完全全自動で無尽蔵供給される真の自律拡大再生産** が完成します！

---

#### 【Phase 4】ローソン3重積の極大化と臨界達成 ($Q \\ge 1.0$)
1. **3大プラズマ強化装置を増設**:
   - **高温超伝導(HTS)コイル**: 磁場を強め、閉じ込め時間 $\\tau_E$ を延長。プラズマの冷却速度を大幅に低下させます。
   - **極低温ペレット連続注入器**: プラズマ密度 $n$ を極大化し、粒子同士の衝突確率を倍増させます。
   - **中性粒子ビーム入射装置(NBI)**: プラズマ温度を $10\\text{ keV}$（1億度超）の核融合断面積ピークへ加熱します。
2. **臨界プラズマ条件 ($Q = 1.0$) の突破**:
   - 核融合出力 $P_{\\text{fusion}}$ が加熱入力 $P_{\\text{heat}}$ を上回り、エネルギー黒字化（損益分岐点）を達成！

---

#### 【Phase 5】自律燃焼プラズマと究極のQ値極大化 ($Q \\ge 5 \\to Q \\ge 10$)
1. **先端研究の習得**:
   - 研究「**自己加熱燃焼プラズマ自律制御**」:
     アルファ粒子 ($^4\\text{He}, 3.5\\text{ MeV}$) の閉じ込め効率を高め、外部加熱入力を $60\\%$ カット！ これにより分母が激減し **$Q$ 値が一気に跳ね上がります**。
   - 研究「**量子トンネル確率共鳴励起**」: 反応率が $+50\\%$ 恒常ブースト。
   - 研究「**準対称ステラレーター立体磁場配位**」: 定常運転が強化され、究極の安定燃焼へ。
2. **燃焼プラズマ領域へ**:
   - $Q \\ge 5.0$、そして世界最高水準の $Q \\ge 10.0$ を達成し、人類の夢「地上の太陽」を完全掌握しましょう！
        `,
    },
    {
        id: 'q_factor_mechanics',
        title: '📈 Q値を爆発的に高める物理メカニズム',
        badge: '重要理論',
        content: `
### 💡 なぜQ値が上がらないのか？ どうすれば上がるのか？

---

#### 1. Q値（エネルギー増倍率）の計算式
$$Q = \\frac{P_{\\text{fusion}} \\text{ (核融合熱出力)}}{P_{\\text{heat}} \\text{ (外部加熱入力)}}$$

Q値を上げるには、**「分子（核融合熱出力）を極大化する」** か **「分母（外部加熱電力）を削る」** の2つしかありません。

---

#### 2. 分子 ($P_{\\text{fusion}}$) を最大化する「3大変数」
核融合反応率 $R$ は以下の比例関係にあります：
$$P_{\\text{fusion}} \\propto n_D \\cdot n_T \\cdot \\langle \\sigma v \\rangle(T)$$

- **燃料比率 $n_D : n_T = 1 : 1$**:
  重水素だけ、あるいは三重水素だけが炉心に偏っていると反応しません。**必ず両方を同等に注入** してください。
- **プラズマ温度 $T$ (目標: 10〜20 keV / 約1億〜2億℃)**:
  核融合断面積 $\\langle \\sigma v \\rangle$ は温度が低いと極端に小さく、**$10\\text{ keV}$（約1億1600万℃）を超えたあたりで急峻なピーク** を迎えます。
  - NBI加熱装置の増設
  - 連続燃焼による **アルファ粒子 ($^4\\text{He}, 3.5\\text{ MeV}$) の自己加熱**
  この2つで炉心温度を $10\\text{ keV}$ 以上に維持することが極めて重要です。
- **閉じ込め時間 $\\tau_E$ (超伝導マグネット)**:
  温度が上がっても熱が炉外へ逃げてしまうと冷めてしまいます。超伝導マグネットを増設して $\\tau_E$ を伸ばすと、**冷却速度が激減して超高温が持続** します。
- **プラズマ密度 $n$ (ペレット連続注入器)**:
  ペレット注入器を増設すると密度 $n$ が上がり、衝突頻度が二次関数的に急増します。

---

#### 3. 分母 ($P_{\\text{heat}}$) を削減する「燃焼プラズマの極意」
NBI加熱装置を増設すると初期加熱は速くなりますが、同時に $P_{\\text{heat}}$（分母）も増えるため、単純増設だけではQ値が頭打ちになります。

**ここで必須となるのが研究「自己加熱燃焼プラズマ自律制御」です！**
- 核融合反応で生じるヘリウム核（アルファ線）が持っている $3.5\\text{ MeV}$ の運動エネルギーを磁場で完璧に閉じ込め、プラズマ自身に熱を供給させます（自己加熱）。
- この研究をアンロックすると、外部加熱入力 $P_{\\text{heat}}$ を大幅に削減できるようになり、**Q値が一気に $Q > 5$ 〜 $Q > 10$ へと急上昇** します！
        `,
    },
    {
        id: 'breeding_secrets',
        title: '🛡️ リチウム増殖ブランケット完全マスター',
        badge: '燃料自立',
        content: `
### 🔄 三重水素の「永久機関的」自律サイクル

---

#### 1. 三重水素の希少性
- 重水素(D)は海水中から無限に手に入りますが、三重水素(T)は天然にはほぼゼロで、半減期も12.3年しかありません。
- 手動で中性子を2個作って三重水素を合成し続けるのは、中盤以降の規模では不可能です。

---

#### 2. 増殖ブランケットの神髄
核融合で飛び出す中性子は電荷を持たないため、磁場を突き抜けて炉壁に激突します。
炉壁の「リチウム増殖ブランケット」がこれをキャッチします：
$$^6\\text{Li} + n\\,(14.1\\text{ MeV}) \\longrightarrow \\,^4\\text{He} + ^3\\text{H} + 4.78\\text{ MeV}$$

- **核融合 1 反応につき中性子 1 個が放出** されます。
- ブランケットがその中性子から **1個以上のトリチウム（TBR > 1.15）を自動生成** します。
- さらに **$4.78\\text{ MeV}$ の追加熱エネルギー** も発生します。

**つまり、「1個のTを燃やすと、1.15個以上のTが手元に戻ってくる」状態が作れます！**

---

#### 3. 注意点: リチウム-6の備蓄切れ
- ブランケットが増殖を行うには原材料である「リチウム-6」が必要です。
- 画面上部ステータスバーの **「⁶Li備蓄」が 0 になると、増殖効率が半減** します。
- **リチウム大量生産設備で自動化しよう！**:
  - **🌊 海水リチウム吸着電解プラント** (毎秒 +5 Li): 海水から常時透析回収。序盤の枯渇を防止。
  - **🔬 リチウム-6 レーザー同位体濃縮カスケード** (毎秒 +50 Li): レーザー同位体分離で高純度⁶Liを急速生産。
  - **🚀 小惑星帯リチウム採掘ドローン船団** (毎秒 +500 Li): 小惑星帯からマスドライバーで直送し、超大規模連続核融合でもビクともしない超大量リチウムを供給！
- また、右カラム上部の「**+100 Li**」「**+1,000 Li**」一括購入ボタンで瞬時に数千単位の備蓄を補充することも可能です。
        `,
    },
    {
        id: 'checklist',
        title: '✅ 高Q値達成チェックリスト',
        badge: '診断リスト',
        content: `
### 🎯 Q値が上がらないときのトラブルシューティング

以下の項目を上から順に確認してください：

- [ ] **燃料比率は均等か？**
  - 重水素(D)と三重水素(T)の在庫、または炉心内のDとTが片方ゼロになっていませんか？
  - 上部の「全合成」を押して両方を同数揃えましょう。
- [ ] **自動連続注入は ON になっているか？**
  - トカマク炉心操作盤の「☑ 自動連続注入」にチェックが入っているか確認してください。
- [ ] **リチウム-6 備蓄はあるか？（自動生産設備は配備したか？）**
  - ステータスバーの「⁶Li備蓄」が 0 になっていませんか？
  - 「海水リチウム抽出プラント」や「レーザー濃縮カスケード」を建設し、毎秒の自動生産レートを確保してください。
- [ ] **プラズマ温度は 10 keV（約1.1億℃）を超えているか？**
  - 温度が数 keV だと核融合断面積が小さく、出力が出ません。NBI加熱機を建設し、連続燃焼でアルファ加熱を蓄積させてください。
- [ ] **超伝導マグネットは足りているか？**
  - 閉じ込め時間 $\\tau_E$ が短いと熱がすぐ逃げます。超伝導マグネットを 5〜10基以上建設して $\\tau_E \\ge 1.0\\text{ s}$ を目指してください。
- [ ] **ペレット連続注入器は建設したか？**
  - プラズマ密度 $n$ を高めることで、同一温度での反応頻度が倍増します。
- [ ] **研究「自己加熱燃焼プラズマ自律制御」を習得したか？**
  - $Q \\ge 5$ や $Q \\ge 10$ を狙うにはこの研究が決め手となります。ヘリウム20個とエネルギーを集めて解放してください。
        `,
    },
];

export class GuideModal {
    constructor(modalElement) {
        this.modal = modalElement;
        this.activeSectionId = GUIDE_SECTIONS[0].id;
        this._initUI();
    }

    _initUI() {
        if (!this.modal) return;

        this.modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content codex-content">
                <div class="modal-header">
                    <h2>📖 核融合促進・Q値極大化 攻略手順書 (Fusion Strategy Guide)</h2>
                    <button class="modal-close-btn" id="guideCloseBtn">✕</button>
                </div>
                <div class="codex-body">
                    <div class="codex-sidebar" id="guideSidebar">
                        <!-- 目次リスト -->
                    </div>
                    <div class="codex-main" id="guideMain">
                        <!-- 詳細攻略記事 -->
                    </div>
                </div>
            </div>
        `;

        this.modal.querySelector('#guideCloseBtn').addEventListener('click', () => this.close());
        this.modal.querySelector('.modal-backdrop').addEventListener('click', () => this.close());

        this.renderSidebar();
        this.renderActiveSection();
    }

    open(sectionId = null) {
        if (sectionId) {
            this.activeSectionId = sectionId;
        }
        this.renderSidebar();
        this.renderActiveSection();
        this.modal.classList.add('active');
    }

    close() {
        this.modal.classList.remove('active');
    }

    renderSidebar() {
        const sidebar = this.modal.querySelector('#guideSidebar');
        if (!sidebar) return;

        sidebar.innerHTML = GUIDE_SECTIONS.map(s => `
            <button class="codex-nav-item ${s.id === this.activeSectionId ? 'active' : ''}" data-id="${s.id}">
                <span class="category-badge">${s.badge}</span>
                <span class="entry-title">${s.title}</span>
            </button>
        `).join('');

        sidebar.querySelectorAll('.codex-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeSectionId = btn.getAttribute('data-id');
                this.renderSidebar();
                this.renderActiveSection();
            });
        });
    }

    renderActiveSection() {
        const main = this.modal.querySelector('#guideMain');
        if (!main) return;

        const section = GUIDE_SECTIONS.find(s => s.id === this.activeSectionId) || GUIDE_SECTIONS[0];
        const formatted = this._formatMarkdown(section.content);

        main.innerHTML = `
            <div class="codex-entry-header">
                <span class="category-tag">${section.badge}</span>
                <h1>${section.title}</h1>
            </div>
            <div class="codex-markdown">${formatted}</div>
        `;
    }

    _formatMarkdown(md) {
        return md
            .trim()
            .replace(/^#### (.*$)/gim, '<h4 style="color: var(--c-energy); margin: 16px 0 6px 0; font-size: 14px;">$1</h4>')
            .replace(/^### (.*$)/gim, '<h3 style="color: var(--c-plasma); margin: 14px 0 8px 0; font-size: 16px;">$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\$\$(.*?)\$\$/g, '<div class="math-block">$1</div>')
            .replace(/\$(.*?)\$/g, '<code class="math-inline">$1</code>')
            .replace(/^\- \[ \] (.*$)/gim, '<li style="list-style: none; margin: 6px 0;"><label style="cursor: pointer;"><input type="checkbox" style="margin-right: 8px;">$1</label></li>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/<\/li>\n<li>/g, '</li><li>')
            .replace(/(<li>.*<\/li>)/s, '<ul style="margin-left: 20px; margin-bottom: 12px;">$1</ul>')
            .replace(/\n\n/g, '<p style="margin-bottom: 8px;"></p>');
    }
}
