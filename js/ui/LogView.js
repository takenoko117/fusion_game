/**
 * LogView.js
 * ゲーム進行ログ、核融合イベント、実績達成メッセージを表示するコンソール
 */

export class LogView {
    constructor(containerElement) {
        this.container = containerElement;
        this.maxLogs = 40;
        this.logs = [];
    }

    add(message, type = 'info') {
        const timeStr = new Date().toLocaleTimeString('ja-JP', { hour12: false });
        this.logs.unshift({ message, type, time: timeStr });

        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = this.logs.map(log => `
            <div class="log-entry log-${log.type}">
                <span class="log-time">[${log.time}]</span>
                <span class="log-text">${log.message}</span>
            </div>
        `).join('');
    }
}
