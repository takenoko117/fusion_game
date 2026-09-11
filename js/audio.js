/**
 * audio.js
 * Web Audio APIを用いたプロシージャル効果音シンセサイザー
 * 外部音源ファイル不要で、軽量かつ低レイテンシにSFサウンドを生成
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.masterGain = null;
        this.initialized = false;
        this.plasmaOsc = null;
        this.plasmaGain = null;
    }

    init() {
        if (this.initialized) return;
        if (typeof window === 'undefined') return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;

            // プラズマの低音ドローン（唸り）用ノード
            this._setupPlasmaDrone();
        } catch (e) {
            console.warn('Web Audio API not supported or blocked:', e);
        }
    }

    _ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.3, this.ctx.currentTime);
        }
        return this.muted;
    }

    // 粒子射出音 (ピュンと弾ける電子音)
    playShoot(type = 'up') {
        if (this.muted) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let baseFreq = 520;
        if (type === 'up') baseFreq = 660;
        if (type === 'down') baseFreq = 440;
        if (type === 'electron') baseFreq = 880;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // ハドロン合成音（強い力の結びつき、キラリとしたハーモニー）
    playHadronBond() {
        if (this.muted) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 和音

        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + i * 0.03);

            gain.gain.setValueAtTime(0.15, now + i * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + i * 0.03);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + i * 0.03);
            osc.stop(now + 0.4);
        });
    }

    // 原子・同位体合成音 (ふわりと重厚なベル音)
    playAtomForm() {
        if (this.muted) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, now); // E4
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.42);
    }

    // 核融合反応音 (重低音のインパルス爆発 + 輝く超高音)
    playFusionBoom(intensity = 1.0) {
        if (this.muted) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const boundedIntensity = Math.min(intensity, 3.0);

        // 低音インパクト
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

        gain.gain.setValueAtTime(0.35 * Math.min(boundedIntensity, 1.2), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        // フィルターで重低音を強調
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.5);

        // 高周波のエネルギーフラッシュ音
        const flashOsc = this.ctx.createOscillator();
        const flashGain = this.ctx.createGain();
        flashOsc.type = 'sine';
        flashOsc.frequency.setValueAtTime(1200, now);
        flashOsc.frequency.exponentialRampToValueAtTime(2400, now + 0.12);

        flashGain.gain.setValueAtTime(0.12, now);
        flashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        flashOsc.connect(flashGain);
        flashGain.connect(this.masterGain);

        flashOsc.start(now);
        flashOsc.stop(now + 0.22);
    }

    // 施設購入・研究完了音
    playUpgrade() {
        if (this.muted) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0.12, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.3);
        });
    }

    // プラズマの持続的なハミング音セットアップ
    _setupPlasmaDrone() {
        if (!this.ctx) return;
        this.plasmaOsc = this.ctx.createOscillator();
        this.plasmaGain = this.ctx.createGain();

        this.plasmaOsc.type = 'sine';
        this.plasmaOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55Hz (A1) 低周波磁場ハミング

        this.plasmaGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

        this.plasmaOsc.connect(this.plasmaGain);
        this.plasmaGain.connect(this.masterGain);
        this.plasmaOsc.start();
    }

    // プラズマ活動度に応じてドローン音のピッチと音量を調節
    updatePlasmaHum(temperatureKeV, isBurning) {
        if (!this.plasmaGain || !this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const targetGain = isBurning ? 0.04 : (temperatureKeV > 5 ? 0.02 : 0.002);
        const targetFreq = 50 + Math.min(temperatureKeV * 4, 160);

        this.plasmaGain.gain.setTargetAtTime(targetGain, now, 0.2);
        this.plasmaOsc.frequency.setTargetAtTime(targetFreq, now, 0.2);
    }
}

export const sound = new SoundManager();
