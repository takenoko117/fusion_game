/**
 * CodexModal.js
 * 核融合物理図鑑（インタラクティブな教育解説モーダル）
 * クォーク・同位体・E=mc²・クーロン障壁・ローソン条件・ブランケット増殖をわかりやすく図解
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

        // モーダル外枠の構造
        this.modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content codex-content">
                <div class="modal-header">
                    <h2>📚 核融合物理学・図鑑アーカイブ (Fusion Codex)</h2>
                    <button class="modal-close-btn" id="codexCloseBtn">✕</button>
                </div>
                <div class="codex-body">
                    <div class="codex-sidebar" id="codexSidebar">
                        <!-- 目次リスト -->
                    </div>
                    <div class="codex-main" id="codexMain">
                        <!-- 詳細解説 -->
                    </div>
                </div>
            </div>
        `;

        // イベントバインド
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

        // マークダウンの簡易HTML変換 (見出し、箇条書き、数式ブロック)
        const formattedContent = this._formatMarkdown(entry.content);

        // インタラクティブ図解SVGの生成
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
                <svg viewBox="0 0 460 140" class="codex-svg">
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
                    <!-- 陽子 (uud) -->
                    <g transform="translate(110, 70)">
                        <circle r="52" fill="none" stroke="#ff0055" stroke-dasharray="4,4" stroke-width="2"/>
                        <line x1="-22" y1="-14" x2="22" y2="-14" stroke="#ffd166" stroke-width="3"/>
                        <line x1="-22" y1="-14" x2="0" y2="24" stroke="#ffd166" stroke-width="3"/>
                        <line x1="22" y1="-14" x2="0" y2="24" stroke="#ffd166" stroke-width="3"/>
                        
                        <circle cx="-22" cy="-14" r="14" fill="url(#upGrad)"/>
                        <text x="-22" y="-10" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">u</text>

                        <circle cx="22" cy="-14" r="14" fill="url(#upGrad)"/>
                        <text x="22" y="-10" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">u</text>

                        <circle cx="0" cy="24" r="14" fill="url(#downGrad)"/>
                        <text x="0" y="28" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">d</text>

                        <text x="0" y="60" fill="#ff0055" font-weight="bold" font-size="13" text-anchor="middle">陽子 p (電荷 +1)</text>
                    </g>

                    <!-- 中性子 (udd) -->
                    <g transform="translate(320, 70)">
                        <circle r="52" fill="none" stroke="#00b4d8" stroke-dasharray="4,4" stroke-width="2"/>
                        <line x1="0" y1="-24" x2="-22" y2="16" stroke="#ffd166" stroke-width="3"/>
                        <line x1="0" y1="-24" x2="22" y2="16" stroke="#ffd166" stroke-width="3"/>
                        <line x1="-22" y1="16" x2="22" y2="16" stroke="#ffd166" stroke-width="3"/>

                        <circle cx="0" cy="-24" r="14" fill="url(#upGrad)"/>
                        <text x="0" y="-20" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">u</text>

                        <circle cx="-22" cy="16" r="14" fill="url(#downGrad)"/>
                        <text x="-22" y="20" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">d</text>

                        <circle cx="22" cy="16" r="14" fill="url(#downGrad)"/>
                        <text x="22" y="20" fill="#fff" font-weight="bold" font-size="12" text-anchor="middle">d</text>

                        <text x="0" y="60" fill="#00b4d8" font-weight="bold" font-size="13" text-anchor="middle">中性子 n (電荷 0)</text>
                    </g>
                </svg>
            `;
        } else if (id === 'breeding_blanket_loop') {
            return `
                <svg viewBox="0 0 520 160" class="codex-svg">
                    <rect x="20" y="30" width="130" height="90" rx="8" fill="#1b263b" stroke="#f72585" stroke-width="2"/>
                    <text x="85" y="60" fill="#f72585" font-weight="bold" font-size="13" text-anchor="middle">D-T 核融合炉心</text>
                    <text x="85" y="85" fill="#fff" font-size="11" text-anchor="middle">²H + ³H 衝突</text>
                    <text x="85" y="105" fill="#4cc9f0" font-size="10" text-anchor="middle">+ 17.6 MeV 放出</text>

                    <path d="M 150 75 L 260 75" stroke="#ffffff" stroke-width="3" stroke-dasharray="6,4" marker-end="url(#arrow)"/>
                    <text x="205" y="65" fill="#ffffff" font-weight="bold" font-size="11" text-anchor="middle">高速中性子 n (14.1 MeV)</text>

                    <rect x="270" y="30" width="220" height="90" rx="8" fill="#0d1b2a" stroke="#00f5d4" stroke-width="2"/>
                    <text x="380" y="55" fill="#00f5d4" font-weight="bold" font-size="13" text-anchor="middle">リチウム増殖ブランケット</text>
                    <text x="380" y="78" fill="#fff" font-size="11" text-anchor="middle">⁶Li + n → ⁴He + ³H + 4.8 MeV</text>
                    <text x="380" y="102" fill="#ffd166" font-weight="bold" font-size="11" text-anchor="middle">三重水素 (³H) を自律自己増殖！</text>

                    <!-- フィードバックループの矢印 -->
                    <path d="M 380 120 C 380 155, 85 155, 85 120" fill="none" stroke="#00f5d4" stroke-width="2.5" stroke-dasharray="4,4"/>
                    <text x="230" y="150" fill="#00f5d4" font-size="11" text-anchor="middle">増殖したトリチウムを炉心へ再循環 (拡大再生産)</text>
                </svg>
            `;
        }
        return '';
    }
}
