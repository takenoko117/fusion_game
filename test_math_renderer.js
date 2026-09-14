/**
 * test_math_renderer.js
 * mathRenderer.js のユニットテスト
 */

import { renderMath, fallbackRenderMath, normalizeLatex, formatMarkdownWithMath } from './js/ui/mathRenderer.js';
import { CODEX_ENTRIES } from './js/constants.js';
import { GUIDE_SECTIONS } from './js/ui/GuideModal.js';

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`);
        process.exit(1);
    }
    console.log(`✅ PASS: ${message}`);
}

console.log('--- 1. normalizeLatex テスト ---');
assert(normalizeLatex('^6\\text{Li}') === '{}^6\\text{Li}', '^6\\text{Li} の先頭 ^ が {}^ に補正される');
assert(normalizeLatex('+ ^3\\text{H}') === '+ {}^3\\text{H}', '演算子直後の ^ が {}^ に補正される');
assert(normalizeLatex('\\,^4\\text{He}') === '\\,{}^4\\text{He}', '\\,直後の ^ が {}^ に補正される');
assert(normalizeLatex('E = mc^2') === 'E = mc^2', '通常の上付き文字 mc^2 はそのまま保持される');

console.log('--- 2. fallbackRenderMath テスト (KaTeXなし環境) ---');
const fbInline = fallbackRenderMath('^6\\text{Li} + n \\longrightarrow \\,^4\\text{He} + ^3\\text{H} + 4.78\\text{ MeV}', false);
assert(fbInline.includes('<sup>6</sup>Li'), '上付き文字 6 が sup タグに変換される');
assert(fbInline.includes('⟶'), '\\longrightarrow が矢印に変換される');
assert(!fbInline.includes('\\text'), '\\text が除去されている');
assert(fbInline.includes('math-fallback'), 'フォールバッククラスが付与される');

const fbDisplay = fallbackRenderMath('E = \\Delta m \\cdot c^2', true);
assert(fbDisplay.includes('math-block'), 'ディスプレイ数式ブロッククラスが付与される');
assert(fbDisplay.includes('Δ'), '\\Delta がギリシャ文字に変換される');
assert(fbDisplay.includes('·'), '\\cdot が中黒記号に変換される');

console.log('--- 3. KaTeX モック環境での renderMath テスト ---');
// KaTeX のモックを設定
global.window = {
    katex: {
        renderToString: (tex, opts) => {
            return `<katex-mock display="${opts.displayMode}">${tex}</katex-mock>`;
        }
    }
};

const ktInline = renderMath('17.6\\text{ MeV}', false);
assert(ktInline.includes('<katex-mock display="false">17.6\\text{ MeV}</katex-mock>'), 'KaTeXが呼ばれてインライン数式が描画される');
assert(ktInline.includes('class="math-inline"'), 'math-inline クラスが付与される');

const ktDisplay = renderMath('E = \\Delta m \\cdot c^2', true);
assert(ktDisplay.includes('<katex-mock display="true">E = \\Delta m \\cdot c^2</katex-mock>'), 'KaTeXが呼ばれてディスプレイ数式が描画される');
assert(ktDisplay.includes('class="math-block"'), 'math-block クラスが付与される');

console.log('--- 4. formatMarkdownWithMath テスト ---');
const sampleMd = `
### タイトル
核融合反応:
$$^6\\text{Li} + n \\longrightarrow \\,^4\\text{He} + ^3\\text{H} + 4.78\\text{ MeV}$$
- 生成されるエネルギーは $17.6\\text{ MeV}$ です。
- **重要**: $Q \\ge 1.0$ を目指します。
`;

const formatted = formatMarkdownWithMath(sampleMd);
assert(!formatted.includes('$$'), '$$ は完全にプレースホルダーからHTMLに置換されている');
assert(!formatted.includes('$17.6'), '$ のまま残っている数式はない');
assert(formatted.includes('<katex-mock display="true">'), 'ディスプレイ数式がKaTeXで描画されている');
assert(formatted.includes('<katex-mock display="false">'), 'インライン数式がKaTeXで描画されている');
assert(formatted.includes('<strong>重要</strong>'), '太字Markdownが正しく変換されている');
assert(formatted.includes('<li>'), 'リストMarkdownが正しく変換されている');

console.log('--- 5. 実際の CODEX_ENTRIES と GUIDE_SECTIONS の全件変換テスト ---');
for (const entry of CODEX_ENTRIES) {
    const result = formatMarkdownWithMath(entry.content);
    assert(result && result.length > 0, `Codex [${entry.id}] が正常にHTML変換される`);
    assert(!result.includes('$$'), `Codex [${entry.id}] に未置換の $$ が存在しない`);
}

for (const section of GUIDE_SECTIONS) {
    const result = formatMarkdownWithMath(section.content);
    assert(result && result.length > 0, `Guide [${section.id}] が正常にHTML変換される`);
    assert(!result.includes('$$'), `Guide [${section.id}] に未置換の $$ が存在しない`);
}

console.log('\n🎉 ALL MATH RENDERER TESTS PASSED SUCCESSFULLY!');
