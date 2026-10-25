/**
 * CodexModal.js (v2.0 Interactive Physics Archive)
 * 核融合物理図鑑（全7章すべてに高精細SVGベクター図解を搭載）
 */

import { CODEX_ENTRIES } from '../constants.js';
import { formatMarkdownWithMath } from './mathRenderer.js';

export class CodexModal {
    constructor(modalElement) {
        this.modal = modalElement;
        this.activeEntryId = CODEX_ENTRIES[0].id;
        this._initUI();
    }

    _initUI() {
        if (!this.modal) return;

        this.modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content codex-content">
                <div class="modal-header">
                    <h2>📚 核融合物理学・図鑑アーカイブ (Fusion Codex v2.0)</h2>
                    <button class="modal-close-btn" id="codexCloseBtn">✕</button>
                </div>
                <div class="codex-body">
                    <div class="codex-sidebar" id="codexSidebar"></div>
                    <div class="codex-main" id="codexMain"></div>
                </div>
            </div>
        `;

        this.modal.querySelector('#codexCloseBtn').addEventListener('click', () => this.close());
        this.modal.querySelector('.modal-backdrop').addEventListener('click', () => this.close());

        this.renderSidebar();
        this.renderActiveEntry();
    }

    open(entryId = null) {
        if (entryId) {
            this.activeEntryId = entryId;
        }
        this.renderSidebar();
        this.renderActiveEntry();
        this.modal.classList.add('active');
    }

    close() {
        this.modal.classList.remove('active');
    }

    renderSidebar() {
        const sidebar = this.modal.querySelector('#codexSidebar');
        if (!sidebar) return;

        sidebar.innerHTML = CODEX_ENTRIES.map(entry => `
            <button class="codex-nav-item ${entry.id === this.activeEntryId ? 'active' : ''}" data-id="${entry.id}">
                <span class="category-badge">${entry.category}</span>
                <span class="entry-title">${entry.title}</span>
            </button>
        `).join('');

        sidebar.querySelectorAll('.codex-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeEntryId = btn.getAttribute('data-id');
                this.renderSidebar();
                this.renderActiveEntry();
            });
        });
    }

    renderActiveEntry() {
        const main = this.modal.querySelector('#codexMain');
        if (!main) return;

        const entry = CODEX_ENTRIES.find(e => e.id === this.activeEntryId) || CODEX_ENTRIES[0];
        const formattedContent = this._formatMarkdown(entry.content);
        const diagramSVG = this._getDiagramForEntry(entry.id);

        main.innerHTML = `
            <div class="codex-entry-header">
                <span class="category-tag">${entry.category}</span>
                <h1>${entry.title}</h1>
            </div>
            ${diagramSVG ? `<div class="codex-diagram-container">${diagramSVG}</div>` : ''}
            <div class="codex-markdown">${formattedContent}</div>
        `;
    }

    _formatMarkdown(md) {
        return formatMarkdownWithMath(md);
    }

    _getDiagramForEntry(id) {
        if (id === 'quarks_and_strong_force') {
            return `
                <svg viewBox="0 0 500 155" class="codex-svg">
                    <defs>
                        <linearGradient id="upGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#ff758f"/>
                            <stop offset="100%" stop-color="#ff0055"/>
                        </linearGradient>
                        <linearGradient id="downGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#90e0ef"/>
                            <stop offset="100%" stop-color="#0077b6"/>
                        </linearGradient>
                    </defs>
                    <g transform="translate(135, 72)">
                        <circle r="54" fill="rgba(255,0,85,0.06)" stroke="#ff0055" stroke-dasharray="5,4" stroke-width="2"/>
                        <path d="M -24 -16 Q 0 -28 24 -16" fill="none" stroke="#ffd166" stroke-width="3"/>
                        <path d="M -24 -16 Q -22 10 0 26" fill="none" stroke="#ffd166" stroke-width="3"/>
                        <path d="M 24 -16 Q 22 10 0 26" fill="none" stroke="#ffd166" stroke-width="3"/>
                        <circle cx="-24" cy="-16" r="15" fill="url(#upGrad)"/>
                        <text x="-24" y="-12" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">u (+⅔)</text>
                        <circle cx="24" cy="-16" r="15" fill="url(#upGrad)"/>
                        <text x="24" y="-12" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">u (+⅔)</text>
                        <circle cx="0" cy="26" r="15" fill="url(#downGrad)"/>
                        <text x="0" y="30" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">d (-⅓)</text>
                        <text x="0" y="70" fill="#ff4d6d" font-weight="bold" font-size="13" text-anchor="middle">陽子 p (uud : 電荷 +1)</text>
                    </g>
                    <g transform="translate(365, 72)">
                        <circle r="54" fill="rgba(0,180,216,0.06)" stroke="#00b4d8" stroke-dasharray="5,4" stroke-width="2"/>
                        <path d="M 0 -26 Q -22 -4 -24 18" fill="none" stroke="#ffd166" stroke-width="3"/>
                        <path d="M 0 -26 Q 22 -4 24 18" fill="none" stroke="#ffd166" stroke-width="3"/>
                        <path d="M -24 18 Q 0 30 24 18" fill="none" stroke="#ffd166" stroke-width="3"/>
                        <circle cx="0" cy="-26" r="15" fill="url(#upGrad)"/>
                        <text x="0" y="-22" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">u (+⅔)</text>
                        <circle cx="-24" cy="18" r="15" fill="url(#downGrad)"/>
                        <text x="-24" y="22" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">d (-⅓)</text>
                        <circle cx="24" cy="18" r="15" fill="url(#downGrad)"/>
                        <text x="24" y="22" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">d (-⅓)</text>
                        <text x="0" y="70" fill="#4cc9f0" font-weight="bold" font-size="13" text-anchor="middle">中性子 n (udd : 電荷 0)</text>
                    </g>
                </svg>
            `;
        } else if (id === 'hydrogen_isotopes') {
            return `
                <svg viewBox="0 0 540 155" class="codex-svg">
                    <!-- 軽水素 1H -->
                    <g transform="translate(95, 72)">
                        <ellipse rx="52" ry="26" fill="none" stroke="rgba(144,224,239,0.4)" stroke-dasharray="4,3" transform="rotate(-25)"/>
                        <circle cx="0" cy="0" r="13" fill="#ff0055"/>
                        <text x="0" y="4" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">p</text>
                        <circle cx="44" cy="-20" r="5" fill="#ffd166"/>
                        <text x="44" y="-28" fill="#ffd166" font-size="10" text-anchor="middle">e⁻</text>
                        <text x="0" y="65" fill="#90e0ef" font-weight="bold" font-size="13" text-anchor="middle">軽水素 ¹H (1p + 1e⁻)</text>
                    </g>
                    <!-- 重水素 2H -->
                    <g transform="translate(270, 72)">
                        <ellipse rx="54" ry="28" fill="none" stroke="rgba(6,214,160,0.45)" stroke-dasharray="4,3" transform="rotate(-25)"/>
                        <circle cx="-8" cy="0" r="13" fill="#ff0055"/>
                        <text x="-8" y="4" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">p</text>
                        <circle cx="9" cy="2" r="13" fill="#00b4d8"/>
                        <text x="9" y="6" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">n</text>
                        <circle cx="46" cy="-21" r="5" fill="#ffd166"/>
                        <text x="0" y="65" fill="#06d6a0" font-weight="bold" font-size="13" text-anchor="middle">重水素 ²H / D (1p+1n)</text>
                    </g>
                    <!-- 三重水素 3H -->
                    <g transform="translate(445, 72)">
                        <ellipse rx="56" ry="30" fill="none" stroke="rgba(247,37,133,0.5)" stroke-dasharray="4,3" transform="rotate(-25)"/>
                        <circle cx="0" cy="-9" r="12" fill="#ff0055"/>
                        <text x="0" y="-5" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">p</text>
                        <circle cx="-10" cy="7" r="12" fill="#00b4d8"/>
                        <text x="-10" y="11" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">n</text>
                        <circle cx="10" cy="7" r="12" fill="#00b4d8"/>
                        <text x="10" y="11" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">n</text>
                        <circle cx="48" cy="-22" r="5" fill="#ffd166"/>
                        <text x="0" y="65" fill="#f72585" font-weight="bold" font-size="13" text-anchor="middle">三重水素 ³H / T (1p+2n)</text>
                    </g>
                </svg>
            `;
        } else if (id === 'mass_defect_and_energy') {
            return `
                <svg viewBox="0 0 520 150" class="codex-svg">
                    <rect x="20" y="25" width="160" height="85" rx="8" fill="rgba(6,214,160,0.08)" stroke="#06d6a0" stroke-width="1.5"/>
                    <text x="100" y="48" fill="#06d6a0" font-weight="bold" font-size="12" text-anchor="middle">反応前 (D + T)</text>
                    <text x="100" y="72" fill="#fff" font-size="12" text-anchor="middle">²H (2.014 u) + ³H (3.016 u)</text>
                    <text x="100" y="95" fill="#90e0ef" font-weight="bold" font-size="12" text-anchor="middle">合計 = 5.030 u</text>

                    <text x="225" y="65" fill="#ffd166" font-weight="bold" font-size="20" text-anchor="middle">⟶</text>
                    <text x="225" y="88" fill="#f72585" font-weight="bold" font-size="11" text-anchor="middle">Δm = -0.019 u</text>

                    <rect x="275" y="25" width="225" height="85" rx="8" fill="rgba(247,37,133,0.1)" stroke="#f72585" stroke-width="1.5"/>
                    <text x="387" y="48" fill="#f72585" font-weight="bold" font-size="12" text-anchor="middle">反応後 (⁴He + n + エネルギー)</text>
                    <text x="387" y="72" fill="#fff" font-size="12" text-anchor="middle">⁴He (4.002 u) + n (1.009 u) = 5.011 u</text>
                    <text x="387" y="96" fill="#ffd166" font-weight="bold" font-size="13" text-anchor="middle">⚡ E = Δm·c² = 17.59 MeV 放出！</text>
                </svg>
            `;
        } else if (id === 'coulomb_barrier') {
            return `
                <svg viewBox="0 0 520 155" class="codex-svg">
                    <!-- ポテンシャル曲線 -->
                    <line x1="40" y1="125" x2="480" y2="125" stroke="#5c6b84" stroke-width="1.5"/>
                    <line x1="80" y1="15" x2="80" y2="140" stroke="#5c6b84" stroke-width="1.5"/>
                    <path d="M 80 140 L 145 140 L 145 25 Q 210 95 450 120" fill="none" stroke="#ff4d6d" stroke-width="3"/>
                    <rect x="80" y="95" width="65" height="45" fill="rgba(0,245,212,0.18)"/>
                    <text x="112" y="120" fill="#00f5d4" font-size="10" font-weight="bold" text-anchor="middle">強い力の井戸</text>
                    <text x="205" y="42" fill="#ff4d6d" font-size="11" font-weight="bold">クーロン障壁 (反発力)</text>
                    <!-- 量子トンネル矢印 -->
                    <path d="M 320 82 L 130 82" stroke="#ffd166" stroke-width="2.5" stroke-dasharray="5,4"/>
                    <circle cx="320" cy="82" r="9" fill="#06d6a0"/>
                    <text x="320" y="85" fill="#000" font-size="9" font-weight="bold" text-anchor="middle">D⁺</text>
                    <text x="245" y="72" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">量子トンネル透過 (1億℃ / 10 keV)</text>
                </svg>
            `;
        } else if (id === 'lawson_criterion') {
            return `
                <svg viewBox="0 0 520 155" class="codex-svg">
                    <g transform="translate(85, 75)">
                        <circle r="44" fill="rgba(58,134,255,0.12)" stroke="#3a86ff" stroke-width="2"/>
                        <text x="0" y="-6" fill="#3a86ff" font-weight="bold" font-size="14" text-anchor="middle">密度 n</text>
                        <text x="0" y="14" fill="#fff" font-size="10" text-anchor="middle">~10²⁰ m⁻³</text>
                    </g>
                    <text x="155" y="80" fill="#fff" font-size="18" font-weight="bold">×</text>
                    <g transform="translate(225, 75)">
                        <circle r="44" fill="rgba(247,37,133,0.12)" stroke="#f72585" stroke-width="2"/>
                        <text x="0" y="-6" fill="#f72585" font-weight="bold" font-size="14" text-anchor="middle">温度 T</text>
                        <text x="0" y="14" fill="#fff" font-size="10" text-anchor="middle">10~20 keV</text>
                    </g>
                    <text x="295" y="80" fill="#fff" font-size="18" font-weight="bold">×</text>
                    <g transform="translate(365, 75)">
                        <circle r="44" fill="rgba(0,245,212,0.12)" stroke="#00f5d4" stroke-width="2"/>
                        <text x="0" y="-6" fill="#00f5d4" font-weight="bold" font-size="14" text-anchor="middle">時間 τ_E</text>
                        <text x="0" y="14" fill="#fff" font-size="10" text-anchor="middle">数秒閉じ込め</text>
                    </g>
                    <text x="468" y="72" fill="#ffd166" font-weight="bold" font-size="12" text-anchor="middle">≧ 3×10²¹</text>
                    <text x="468" y="90" fill="#00f5d4" font-weight="bold" font-size="11" text-anchor="middle">自己点火達成</text>
                </svg>
            `;
        } else if (id === 'breeding_blanket_loop') {
            return `
                <svg viewBox="0 0 520 160" class="codex-svg">
                    <rect x="20" y="28" width="135" height="90" rx="8" fill="#1b263b" stroke="#f72585" stroke-width="2"/>
                    <text x="87" y="56" fill="#f72585" font-weight="bold" font-size="13" text-anchor="middle">D-T 核融合炉心</text>
                    <text x="87" y="78" fill="#fff" font-size="11" text-anchor="middle">²H + ³H 衝突</text>
                    <text x="87" y="98" fill="#4cc9f0" font-size="10" text-anchor="middle">+ 17.6 MeV 放出</text>

                    <path d="M 155 73 L 265 73" stroke="#ffffff" stroke-width="3" stroke-dasharray="6,4"/>
                    <text x="210" y="62" fill="#ffffff" font-weight="bold" font-size="11" text-anchor="middle">高速中性子 n (14.1 MeV)</text>

                    <rect x="270" y="28" width="230" height="90" rx="8" fill="#0d1b2a" stroke="#00f5d4" stroke-width="2"/>
                    <text x="385" y="54" fill="#00f5d4" font-weight="bold" font-size="13" text-anchor="middle">リチウム増殖ブランケット</text>
                    <text x="385" y="76" fill="#fff" font-size="11" text-anchor="middle">⁶Li + n → ⁴He + ³H + 4.8 MeV</text>
                    <text x="385" y="98" fill="#ffd166" font-weight="bold" font-size="11" text-anchor="middle">三重水素 (³H) を自律自己増殖！</text>

                    <path d="M 385 118 C 385 154, 87 154, 87 118" fill="none" stroke="#00f5d4" stroke-width="2.5" stroke-dasharray="4,4"/>
                    <text x="235" y="149" fill="#00f5d4" font-size="11" font-weight="bold" text-anchor="middle">↻ 増殖したトリチウム (TBR &gt; 1.15) を炉心へ再循環</text>
                </svg>
            `;
        } else if (id === 'real_world_projects') {
            return `
                <svg viewBox="0 0 520 150" class="codex-svg">
                    <rect x="15" y="25" width="150" height="95" rx="8" fill="rgba(0,245,212,0.08)" stroke="#00f5d4" stroke-width="1.5"/>
                    <text x="90" y="50" fill="#00f5d4" font-weight="bold" font-size="13" text-anchor="middle">ITER / JT-60SA</text>
                    <text x="90" y="73" fill="#fff" font-size="11" text-anchor="middle">超伝導トカマク方式</text>
                    <text x="90" y="95" fill="#8b9bb4" font-size="10" text-anchor="middle">目標 Q ≧ 10 定常燃焼</text>

                    <rect x="185" y="25" width="150" height="95" rx="8" fill="rgba(247,37,133,0.08)" stroke="#f72585" stroke-width="1.5"/>
                    <text x="260" y="50" fill="#f72585" font-weight="bold" font-size="13" text-anchor="middle">NIF (レーザー核融合)</text>
                    <text x="260" y="73" fill="#fff" font-size="11" text-anchor="middle">192本レーザー慣性閉じ込め</text>
                    <text x="260" y="95" fill="#ffd166" font-size="10" text-anchor="middle">2022年 Q &gt; 1 自己点火達成</text>

                    <rect x="355" y="25" width="150" height="95" rx="8" fill="rgba(58,134,255,0.08)" stroke="#3a86ff" stroke-width="1.5"/>
                    <text x="430" y="50" fill="#3a86ff" font-weight="bold" font-size="13" text-anchor="middle">SPARC / 民間革新</text>
                    <text x="430" y="73" fill="#fff" font-size="11" text-anchor="middle">高温超伝導(HTS)強磁場</text>
                    <text x="430" y="95" fill="#06d6a0" font-size="10" text-anchor="middle">小型・商用発電炉へ加速</text>
                </svg>
            `;
        }
        return '';
    }
}
