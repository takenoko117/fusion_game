/**
 * mathRenderer.js
 * LaTeX数式のレンダリングエンジン & Markdown変換ユーティリティ
 * 
 * 攻略手順書 (GuideModal) や核融合図鑑 (CodexModal) に登場する数式 ($$...$$ および $...$) を
 * KaTeX を用いて美麗な数式HTMLにコンパイルします。
 * オフライン環境やライブラリ未読込時のためのセーフティ・フォールバック描画も内蔵しています。
 */

/**
 * LaTeX文字列をサニタイズ・正規化
 * 先頭の ^ や記号直後の ^ を `{}^` に補正し、KaTeXのパースエラーを防止
 */
export function normalizeLatex(tex) {
    if (!tex) return '';
    let s = tex.trim();
    // 先頭が ^ で始まる場合 (例: ^6\text{Li} -> {}^6\text{Li})
    s = s.replace(/^\^/, '{}^');
    // 空白、演算子、カンマ、括弧、バックスラッシュ直後の ^ (例: + ^3\text{H}, \,^4\text{He})
    s = s.replace(/([\s\+\-\=\,\(\[\{\\])\^/g, '$1{}^');
    return s;
}

/**
 * LaTeX数式をHTMLにレンダリング
 * @param {string} tex - LaTeX数式コード
 * @param {boolean} isDisplayMode - ディスプレイ数式 ($$...$$) かどうか
 * @returns {string} レンダリングされたHTML文字列
 */
export function renderMath(tex, isDisplayMode = false) {
    const cleanTex = normalizeLatex(tex);

    // 1. KaTeX が利用可能な場合 (ブラウザ環境)
    if (typeof window !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function') {
        try {
            const html = window.katex.renderToString(cleanTex, {
                displayMode: isDisplayMode,
                throwOnError: false,
                output: 'htmlAndMathml',
            });
            if (isDisplayMode) {
                return `<div class="math-block">${html}</div>`;
            } else {
                return `<span class="math-inline">${html}</span>`;
            }
        } catch (e) {
            console.warn('[MathRenderer] KaTeX render error:', e, tex);
        }
    }

    // 2. フォールバック描画 (KaTeX未読込・オフライン環境)
    return fallbackRenderMath(cleanTex, isDisplayMode);
}

/**
 * KaTeXが利用できない場合のフォールバックHTML生成
 * 一般的なLaTeXコマンドをHTML特殊文字やタグ（<sup>, <sub>）に安全に変換
 */
export function fallbackRenderMath(tex, isDisplayMode = false) {
    let s = normalizeLatex(tex);

    // 矢印・数学記号
    s = s.replace(/\\longrightarrow/g, ' ⟶ ');
    s = s.replace(/\\to/g, ' → ');
    s = s.replace(/\\cdot/g, ' · ');
    s = s.replace(/\\times/g, ' × ');
    s = s.replace(/\\approx/g, ' ≈ ');
    s = s.replace(/\\ge/g, ' ≥ ');
    s = s.replace(/\\le/g, ' ≤ ');
    s = s.replace(/\\propto/g, ' ∝ ');
    s = s.replace(/\\sim/g, ' ∼ ');
    s = s.replace(/\\pm/g, ' ± ');
    s = s.replace(/\\Delta/g, 'Δ');
    s = s.replace(/\\tau/g, 'τ');
    s = s.replace(/\\sigma/g, 'σ');
    s = s.replace(/\\langle/g, '⟨');
    s = s.replace(/\\rangle/g, '⟩');
    s = s.replace(/\\,/g, ' ');
    s = s.replace(/\\ /g, ' ');
    s = s.replace(/\\%/g, '%');

    // 分数 \frac{a}{b} -> (a / b)
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');

    // \text{...} -> ...
    s = s.replace(/\\text\{([^{}]+)\}/g, '$1');

    // 上付き文字 {}^{...}, ^{...}, ^...
    s = s.replace(/\{\}\^\{([^{}]+)\}/g, '<sup>$1</sup>');
    s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
    s = s.replace(/\{\}\^([0-9]+|[a-zA-Z+\-])/g, '<sup>$1</sup>');
    s = s.replace(/\^([0-9]+|[a-zA-Z+\-])/g, '<sup>$1</sup>');

    // 下付き文字 _{...}, _...
    s = s.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
    s = s.replace(/_([0-9]+|[a-zA-Z+\-])/g, '<sub>$1</sub>');

    // 残余のバックスラッシュ除去
    s = s.replace(/\\/g, '');

    if (isDisplayMode) {
        return `<div class="math-block math-fallback">${s}</div>`;
    } else {
        return `<span class="math-inline math-fallback">${s}</span>`;
    }
}

/**
 * 数式 ($$...$$ および $...$) を保護しながらMarkdownテキストをHTMLに変換
 * @param {string} md - Markdown本文
 * @returns {string} HTML
 */
export function formatMarkdownWithMath(md) {
    if (!md) return '';

    const mathBlocks = [];
    const mathInlines = [];

    // 1. ディスプレイ数式 $$...$$ を退避
    let text = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
        const placeholder = `%%MATH_BLOCK_${mathBlocks.length}%%`;
        mathBlocks.push(renderMath(tex, true));
        return placeholder;
    });

    // 2. インライン数式 $...$ を退避 (改行を含まない1行の $...$)
    text = text.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
        const placeholder = `%%MATH_INLINE_${mathInlines.length}%%`;
        mathInlines.push(renderMath(tex, false));
        return placeholder;
    });

    // 3. Markdown記法の変換
    text = text.trim();

    // 見出し
    text = text.replace(/^#### (.*$)/gim, '<h4 style="color: var(--c-energy); margin: 16px 0 6px 0; font-size: 14px;">$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3 style="color: var(--c-plasma); margin: 14px 0 8px 0; font-size: 16px;">$1</h3>');

    // 水平線
    text = text.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid var(--border-color); margin: 16px 0;">');

    // 太字・斜体
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // チェックボックス付きリスト
    text = text.replace(/^\- \[ \] (.*$)/gim, '<li style="list-style: none; margin: 6px 0;"><label style="cursor: pointer;"><input type="checkbox" style="margin-right: 8px;">$1</label></li>');

    // 通常リスト & 番号付きリスト
    text = text.replace(/^\- (.*$)/gim, '<li>$1</li>');
    text = text.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    text = text.replace(/<\/li>\n<li>/g, '</li><li>');

    // 連続する <li> を <ul> で囲む
    text = text.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
        return `<ul style="margin-left: 20px; margin-bottom: 12px;">${match}</ul>`;
    });

    // 段落
    text = text.replace(/\n\n/g, '<p style="margin-bottom: 8px;"></p>');

    // 4. 数式プレースホルダーをレンダリング済みHTMLに復元
    text = text.replace(/%%MATH_BLOCK_(\d+)%%/g, (_, id) => mathBlocks[Number(id)] || '');
    text = text.replace(/%%MATH_INLINE_(\d+)%%/g, (_, id) => mathInlines[Number(id)] || '');

    return text;
}
