/**
 * PlasmaReactor.js (v3.0 HYPER-CONDENSED STELLAR PLASMA & 3D RAY-TRACED ENGINE)
 *
 * リアルタイム WebGL2 3Dレイトレーシング + カオスMHD乱流ボリュメトリック・シェーダーと、
 * 同一3Dカメラ投影行列に完全同期した 3D 加算合成（Additive HDR）ハイパーパーティクル＆プラズマ稲妻エンジン。
 *
 * 【強化された高エネルギー演出】
 * 1. カオスMHDドメインワーピング乱流 & 磁気リコネクション・フレア (シェーダー内3Dうねり・ELMバースト)
 * 2. シェーダー内3Dボロノイ高速スパーク粒子層 (体積内で無数に瞬くマイクロ核融合輝点)
 * 3. 3Dカメラ同期・パースペクティブ投影パーティクル (300+個の高速ヘリカルイオン・アルファ粒子・残像リボン)
 * 4. 3D磁気リコネクション・プラズマ稲妻アーク (磁力線間をランダムに走る分岐放電)
 * 5. 3D核融合スーパーノヴァ衝撃波リング・重力レンズ風コロナフレア・14.1MeV中性子ブランケット激突スパークシャワー
 */

const VERTEX_SHADER_SRC = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform int u_viewMode;          // 0: 3D Cutaway Torus, 1: Poloidal 3D Slice, 2: In-Vessel Interior Camera
uniform vec3 u_cameraOrbit;      // x: yaw, y: pitch, z: zoom

// 物理・設備テレメトリ Uniforms
uniform float u_tempKeV;         // プラズマ中心温度 (keV)
uniform float u_density;         // 中心密度 (10^20 m^-3)
uniform float u_qValue;          // エネルギー増倍率 Q
uniform float u_magTesla;        // 磁場強度 B0 (T)
uniform float u_fusionPower;     // 核融合熱出力 (MW)
uniform float u_pulseWave;       // 手動磁気パルス圧縮波進行度 (0.0 = なし, 0.01~1.0 = 収束波)
uniform float u_nbiLevel;        // NBI加熱装置レベル
uniform float u_pelletLevel;     // ペレット注入器レベル
uniform float u_blanketLevel;    // リチウム増殖ブランケットレベル

// 3D核融合バースト点光源 (xyz: トーラス内3D座標, w: 強度 0~1)
uniform vec4 u_bursts[6];

#define PI 3.14159265359
#define TAU 6.28318530718

const float MAJOR_R = 2.15;      // 主半径 R0
const float MINOR_R = 0.82;      // 小半径 a
const float ELONGATION = 1.48;   // 楕円度 κ
const float TRIANGULARITY = 0.36;// 三角度 δ

// ----------------------------------------------------------------------------
// 3D 乱数・ドメインワーピングMHD乱流・3Dスパーク関数
// ----------------------------------------------------------------------------
float hash31(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
}

vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
}

float gyroid(vec3 p) {
    return dot(sin(p), cos(p.yzx));
}

// 激しい渦・うねり・磁気リコネクションを生む多段ドメインワーピング乱流
float chaoticPlasmaTurbulence(vec3 p, float t) {
    // 第1段階のドメインワープ (MHDキンク・バルーニング不安定性のうねり)
    vec3 warp = vec3(
        gyroid(p * 0.85 + vec3(t * 0.9, -t * 0.6, 0.0)),
        gyroid(p * 1.15 + vec3(-t * 0.7, t * 1.1, 1.5)),
        gyroid(p * 0.95 + vec3(0.5, t * 0.8, -t * 1.2))
    );
    p += warp * 0.68;

    float f = 0.0;
    float amp = 0.52;
    vec3 q = p;
    for (int i = 0; i < 4; i++) {
        float g = abs(gyroid(q));
        // 鋭いプラズマフィラメント尾根を作る反転強調
        f += amp * (1.0 - g * g);
        q = q * 2.18 + vec3(1.9, -2.7, 3.1) + warp * 0.35;
        amp *= 0.48;
    }
    return clamp(f, 0.0, 1.5);
}

// 3D空間内でランダムに瞬く高エネルギー・マイクロスパーク格子
float volumetricSparkles(vec3 p, float t) {
    vec3 cell = floor(p);
    vec3 f = fract(p);
    vec3 rnd = hash33(cell);
    // セル内のランダム中心点 (時間で激しく明滅・移動)
    vec3 sparkPos = 0.5 + 0.38 * sin(rnd * TAU + t * (6.0 + rnd.x * 8.0));
    float d = length(f - sparkPos);
    float blink = pow(0.5 + 0.5 * sin(t * (12.0 + rnd.y * 15.0) + rnd.z * TAU), 6.0);
    return smoothstep(0.24, 0.0, d) * blink;
}

// ----------------------------------------------------------------------------
// D型断面トカマク磁気面座標 (ψ, θ, φ) + 動的MHD揺動
// ----------------------------------------------------------------------------
vec3 getTokamakCoords(vec3 p) {
    float rxy = length(p.xz);
    float phi = atan(p.z, p.x);
    float dr = rxy - MAJOR_R;
    float z = p.y / ELONGATION;

    float theta = atan(z, dr);
    float sinTh = sin(theta);
    float dShift = -TRIANGULARITY * sinTh * sinTh * 0.28;
    float divertorPull = (p.y < -0.25) ? smoothstep(-0.25, -1.25, p.y) * 0.16 * exp(-abs(dr) * 3.5) : 0.0;

    float effDr = dr - dShift;
    float rho = length(vec2(effDr, z - divertorPull)) / MINOR_R;
    return vec3(rho, theta, phi);
}

// ----------------------------------------------------------------------------
// トカマク構造物 Signed Distance Fields (SDF)
// ----------------------------------------------------------------------------
float getCutawayMask(vec3 p) {
    if (u_viewMode == 2) return -1.0;
    if (u_viewMode == 1) {
        return -(p.z - 0.08);
    }
    float phi = atan(p.z, p.x);
    float cutAngle = abs(phi - 1.15) - 1.15;
    return cutAngle * 1.4;
}

float sdVesselWall(vec3 p) {
    vec3 tc = getTokamakCoords(p);
    float rho = tc.x;
    float shellDist = (abs(rho - 1.13) - 0.11) * MINOR_R;
    float cut = getCutawayMask(p);
    return max(shellDist, -cut);
}

float sdCentralSolenoid(vec3 p) {
    float dCyl = length(p.xz) - 0.78;
    float dInner = -(length(p.xz) - 0.38);
    float dHeight = abs(p.y) - 1.55;
    float cs = max(max(dCyl, dInner), dHeight);
    if (u_viewMode == 1) {
        cs = max(cs, p.z - 0.12);
    }
    return cs;
}

float sdTFCoils(vec3 p) {
    if (u_viewMode == 2) return 999.0;
    float phi = atan(p.z, p.x);
    float numCoils = 16.0;
    float sector = TAU / numCoils;
    float localPhi = mod(phi + sector * 0.5, sector) - sector * 0.5;

    float rxy = length(p.xz);
    float arcDist = abs(localPhi) * rxy;

    vec3 tc = getTokamakCoords(p);
    float rho = tc.x;
    float ringDist = (abs(rho - 1.32) - 0.095) * MINOR_R;

    float coilDist = length(vec2(max(arcDist - 0.065, 0.0), max(ringDist, 0.0))) - 0.015;
    if (u_viewMode == 1) {
        coilDist = max(coilDist, p.z - 0.25);
    }
    return coilDist;
}

vec2 mapSolidScene(vec3 p) {
    float dWall = sdVesselWall(p);
    vec2 res = vec2(dWall, 1.0);

    float dCS = sdCentralSolenoid(p);
    if (dCS < res.x) res = vec2(dCS, 2.0);

    float dCoil = sdTFCoils(p);
    if (dCoil < res.x) res = vec2(dCoil, 3.0);

    if (u_viewMode != 2) {
        float dFloor = p.y + 1.85;
        float rFloor = length(p.xz) - 4.4;
        float floorObj = max(dFloor, rFloor);
        if (floorObj < res.x) res = vec2(floorObj, 4.0);
    }

    return res;
}

vec3 calcNormal(vec3 p) {
    const float eps = 0.0035;
    vec2 e = vec2(1.0, -1.0) * 0.5773;
    return normalize(
        e.xyy * mapSolidScene(p + e.xyy * eps).x +
        e.yyx * mapSolidScene(p + e.yyx * eps).x +
        e.yxy * mapSolidScene(p + e.yxy * eps).x +
        e.xxx * mapSolidScene(p + e.xxx * eps).x
    );
}

// ----------------------------------------------------------------------------
// 超高エネルギー凝縮プラズマ・スペクトル & ボリュメトリック放射
// ----------------------------------------------------------------------------
vec3 getPlasmaSpectrum(float rho, float tempKeV, float qVal, float turb, float filament) {
    float coreFactor = clamp(1.0 - rho * 1.12, 0.0, 1.0);
    float heatNorm = clamp(tempKeV / 12.0, 0.0, 1.6);
    float burnNorm = clamp(qVal / 4.5, 0.0, 1.6);

    // 外縁スクレイプオフ層 (SOL): 電離水素Dαの鮮烈なネオンマゼンタ・クリムゾン
    vec3 edgeCol = mix(vec3(1.0, 0.08, 0.38), vec3(0.95, 0.15, 0.85), clamp(heatNorm, 0.0, 1.0));
    // 中間対流層: 灼熱のソーラーオレンジ〜エレクトリック・バイオレット・ブルー
    vec3 midCol  = mix(vec3(1.0, 0.45, 0.05), vec3(0.28, 0.35, 1.0), clamp(heatNorm * 1.15, 0.0, 1.0));
    // 中心凝縮ピンチコア: 超高温プラズマホワイト・シアン・ゴールド
    vec3 coreCol = mix(vec3(1.0, 0.92, 0.65), vec3(0.55, 0.98, 1.0), clamp(heatNorm, 0.0, 1.0));
    coreCol = mix(coreCol, vec3(0.95, 1.0, 1.0), clamp(burnNorm, 0.0, 1.0));

    vec3 col = mix(edgeCol, midCol, smoothstep(0.0, 0.48, coreFactor));
    col = mix(col, coreCol, smoothstep(0.42, 0.92, coreFactor));

    // 高エネルギー凝縮フィラメントの閃光 (白熱アーク + 黄金アルファ加熱渦)
    col += vec3(0.4, 0.95, 1.0) * pow(filament, 2.5) * (0.8 + heatNorm * 0.9);
    col += vec3(1.0, 0.78, 0.25) * pow(turb, 2.8) * (0.45 + burnNorm * 0.85);

    return col;
}

vec4 samplePlasmaVolume(vec3 p) {
    vec3 tc = getTokamakCoords(p);
    float rho = tc.x;
    float theta = tc.y;
    float phi = tc.z;

    // ランダムにうねるMHDキンク摂動 (プラズマ境界自体が生き物のように脈動・変形する)
    float speed = 2.2 + min(u_tempKeV * 0.45, 7.0);
    float kinkWave = sin(phi * 3.0 - u_time * speed * 1.3 + theta * 2.0) * 0.055
                   + cos(phi * 7.0 + u_time * speed * 1.9 - theta * 3.0) * 0.035;
    float perturbedRho = max(0.0, rho + kinkWave * smoothstep(0.1, 0.85, rho));

    bool inDivertorLeg = (p.y < -0.62 && perturbedRho < 1.15 && abs(abs(theta + PI * 0.5) - 0.32) < 0.18);
    if (perturbedRho > 1.02 && !inDivertorLeg) {
        return vec4(0.0);
    }

    // ねじれ磁力線座標
    float safetyFactorQ = 1.05 + 2.25 * perturbedRho * perturbedRho;
    float helicalPhase = theta - safetyFactorQ * phi;

    vec3 flowCoord = vec3(
        phi * 3.5 - u_time * speed,
        helicalPhase * 2.5 + u_time * 1.1,
        perturbedRho * 5.2 - u_time * 0.8
    );

    // 多段ドメインワーピング乱流
    float turb = chaoticPlasmaTurbulence(flowCoord, u_time);

    // 鋭く輝く電磁プラズマ・ロープ (ねじれ磁力線に沿って走る複数本の高密度プラズマ鞭)
    float rope1 = pow(clamp(1.0 - abs(sin(helicalPhase * 5.0 + turb * 2.6 - u_time * 3.0)), 0.0, 1.0), 4.5);
    float rope2 = pow(clamp(1.0 - abs(cos(helicalPhase * 8.0 - phi * 4.0 + turb * 3.2 + u_time * 4.5)), 0.0, 1.0), 6.0);
    float filament = clamp(rope1 + rope2 * 1.3, 0.0, 2.0);

    // ELM (Edge Localized Modes: 境界層からランダムに噴出する太陽フレア状のプラズマプロミネンス)
    float elmBurst = pow(clamp(sin(phi * 6.0 + u_time * 5.0) * cos(theta * 4.0 - u_time * 3.7), 0.0, 1.0), 5.0)
                   * exp(-pow((perturbedRho - 0.86) / 0.11, 2.0)) * 1.6;

    // ★ 超高密度に凝縮された中心ピンチ・シンギュラリティ・コア (rho < 0.25)
    float pinchPulse = 1.0 + 0.35 * sin(phi * 4.0 - u_time * 11.0) * cos(u_time * 7.0);
    float condensedCore = exp(-perturbedRho * perturbedRho * 14.0) * 1.85 * pinchPulse;
    float mainCore = exp(-perturbedRho * perturbedRho * 3.4);
    float hModePedestal = exp(-pow((perturbedRho - 0.76) / 0.09, 2.0)) * 0.65;

    // 3Dボリュメトリック・マイクロスパーク (プラズマ内部でランダムに弾ける高エネルギー粒子群)
    vec3 sparkCoord = vec3(phi * 14.0 - u_time * speed * 2.2, theta * 9.0, perturbedRho * 12.0);
    float microSparks = volumetricSparkles(sparkCoord, u_time) * smoothstep(0.95, 0.15, perturbedRho);

    // 手動磁気パルス圧縮波リング
    float pulseBoost = 0.0;
    if (u_pulseWave > 0.01) {
        float targetRho = 1.05 - u_pulseWave * 0.95;
        pulseBoost = exp(-pow((perturbedRho - targetRho) / 0.085, 2.0)) * 3.2 * (1.0 - u_pulseWave * 0.7);
    }

    float densityScale = 0.55 + clamp(u_density * 0.38, 0.0, 1.6);
    float baseDensity = (
        condensedCore * (0.9 + 0.6 * turb) +
        mainCore * (0.55 + 0.75 * turb + 0.65 * filament) +
        hModePedestal * (0.5 + 1.1 * filament) +
        elmBurst +
        microSparks * 1.8 +
        pulseBoost
    ) * densityScale;

    if (inDivertorLeg) {
        baseDensity = max(baseDensity, (0.6 + 0.5 * filament) * exp(-pow((perturbedRho - 0.98) * 4.5, 2.0)));
    }

    baseDensity *= smoothstep(1.02, 0.74, perturbedRho) + (inDivertorLeg ? 0.5 : 0.0);
    if (baseDensity <= 0.001) return vec4(0.0);

    vec3 emissionColor = getPlasmaSpectrum(perturbedRho, u_tempKeV, u_qValue, turb, filament);

    // 中心ピンチコアの圧倒的な凝縮白光・チェレンコフ輝度
    emissionColor += vec3(0.85, 0.96, 1.0) * condensedCore * (0.9 + min(u_tempKeV * 0.15, 1.8));

    // マイクロスパークの閃光加算
    emissionColor += mix(vec3(0.3, 1.0, 0.95), vec3(1.0, 0.4, 0.85), fract(phi * 3.7)) * microSparks * 4.2;

    // ELMプロミネンスは鮮烈なマゼンタ・ゴールド
    emissionColor += vec3(1.0, 0.35, 0.75) * elmBurst * 2.2;

    if (pulseBoost > 0.01) {
        emissionColor = mix(emissionColor, vec3(0.4, 1.0, 0.98), clamp(pulseBoost * 0.7, 0.0, 0.9));
    }

    // 3D核融合バースト点光源による局所スーパーノヴァ閃光
    for (int i = 0; i < 6; i++) {
        if (u_bursts[i].w > 0.01) {
            float dBurst = length(p - u_bursts[i].xyz);
            float flash = exp(-dBurst * dBurst * 7.5) * u_bursts[i].w;
            // 膨張する3D球殻ショックウェーブ
            float ringR = (1.0 - u_bursts[i].w) * 0.75;
            float shockShell = exp(-pow((dBurst - ringR) / 0.07, 2.0)) * u_bursts[i].w;
            emissionColor += vec3(1.0, 0.92, 0.98) * flash * 6.0 + vec3(0.2, 0.95, 1.0) * shockShell * 4.5;
            baseDensity += (flash + shockShell) * 1.5;
        }
    }

    // NBI 中性粒子ビーム加熱の3Dプラズマレーザー軌跡
    if (u_nbiLevel > 0.0) {
        vec3 beamStart = vec3(-3.2, 0.15, -1.8);
        vec3 beamDir = normalize(vec3(1.0, -0.05, 0.95));
        vec3 toP = p - beamStart;
        float tProj = clamp(dot(toP, beamDir), 0.0, 3.8);
        float dBeam = length(toP - beamDir * tProj);
        float beamGlow = exp(-dBeam * dBeam * 75.0) * clamp(u_nbiLevel * 0.4, 0.3, 1.4);
        emissionColor += vec3(0.15, 0.98, 1.0) * beamGlow * 4.2;
        baseDensity += beamGlow * 0.95;
    }

    float brightness = 1.35 + clamp(u_tempKeV * 0.15, 0.0, 2.2) + clamp(u_qValue * 0.18, 0.0, 1.8);
    return vec4(emissionColor * brightness, baseDensity);
}

// ----------------------------------------------------------------------------
// 第1壁・ブランケット・超伝導コイルの PBR シェーディング & レイトレーシング反射
// ----------------------------------------------------------------------------
vec3 shadeSolidSurface(vec3 p, vec3 n, vec3 rd, float matID) {
    vec3 tc = getTokamakCoords(p);
    float rho = tc.x;
    float theta = tc.y;
    float phi = tc.z;

    vec3 plasmaAxisPos = vec3(cos(phi) * MAJOR_R, 0.0, sin(phi) * MAJOR_R);
    vec3 toPlasma = plasmaAxisPos - p;
    float distToPlasma = max(length(toPlasma), 0.15);
    vec3 lightDir = toPlasma / distToPlasma;

    float ndotl = max(dot(n, lightDir), 0.0);
    vec3 halfVec = normalize(lightDir - rd);
    float ndoth = max(dot(n, halfVec), 0.0);

    vec3 plasmaLightCol = getPlasmaSpectrum(0.2, u_tempKeV, u_qValue, 0.6, 0.8);
    float pulseFlicker = 0.92 + 0.16 * sin(u_time * 17.0 + phi * 4.0);
    float lightIntensity = pulseFlicker * (1.35 + min(u_tempKeV * 0.22, 3.0) + min(u_qValue * 0.25, 2.5)) / (0.85 + distToPlasma * distToPlasma * 0.32);

    vec3 burstLight = vec3(0.0);
    for (int i = 0; i < 6; i++) {
        if (u_bursts[i].w > 0.01) {
            vec3 bVec = u_bursts[i].xyz - p;
            float bDist = max(length(bVec), 0.1);
            float bNdotL = max(dot(n, bVec / bDist), 0.0);
            burstLight += vec3(1.0, 0.6, 0.9) * u_bursts[i].w * (bNdotL + 0.35) / (0.15 + bDist * bDist * 1.2);
        }
    }

    vec3 baseAlbedo = vec3(0.12, 0.16, 0.22);
    float roughness = 0.24;
    float metallic = 0.88;
    vec3 emissive = vec3(0.0);

    if (matID == 1.0) {
        bool isInnerWall = (rho < 1.055);
        bool isCutFace = (rho >= 1.055 && rho <= 1.215 && abs(n.y) < 0.85);

        if (isInnerWall) {
            vec2 tileUV = vec2(phi * 18.0, theta * 10.0);
            vec2 grid = abs(fract(tileUV) - 0.5);
            float seam = smoothstep(0.43, 0.48, max(grid.x, grid.y));
            float tileHash = fract(sin(dot(floor(tileUV), vec2(12.9898, 78.233))) * 43758.5453);

            baseAlbedo = mix(vec3(0.19, 0.23, 0.30) * (0.88 + 0.24 * tileHash), vec3(0.02, 0.03, 0.05), seam);
            roughness = mix(0.18, 0.75, seam);

            // 下部ダイバータ・ストライクプレートの超高熱白熱発光
            float divertorZone = exp(-pow((theta + PI * 0.5) / 0.34, 2.0));
            if (divertorZone > 0.05) {
                float divRibs = smoothstep(0.3, 0.45, abs(fract(phi * 48.0) - 0.5));
                float heatGlow = divertorZone * (0.5 + min(u_tempKeV * 0.16, 1.8) + min(u_fusionPower * 0.03, 1.5));
                emissive += mix(vec3(1.0, 0.32, 0.06), vec3(1.0, 0.85, 0.4), divertorZone) * heatGlow * (1.0 - divRibs * 0.45);
            }

            // リチウム増殖ブランケット稼働時の14.1MeV中性子吸収サブサーフェス発光
            if (u_blanketLevel > 0.0) {
                float blanketPulse = 0.5 + 0.5 * sin(u_time * 5.5 + tileHash * TAU);
                float activeTile = step(0.58, fract(tileHash + u_time * 0.22));
                float bStrength = clamp(u_blanketLevel * 0.18, 0.2, 1.2) * (0.3 + min(u_fusionPower * 0.06, 1.2));
                emissive += mix(vec3(0.0, 0.98, 0.85), vec3(1.0, 0.85, 0.25), activeTile) * (1.0 - seam) * blanketPulse * bStrength * 0.65;
            }
        } else if (isCutFace) {
            float channel = sin(theta * 28.0) * sin((rho - 1.02) * 90.0);
            baseAlbedo = vec3(0.09, 0.14, 0.22);
            if (channel > 0.45 && u_blanketLevel > 0.0) {
                emissive += vec3(0.0, 0.96, 0.83) * 0.75;
            }
        } else {
            float panel = smoothstep(0.46, 0.49, max(abs(fract(phi * 8.0) - 0.5), abs(fract(theta * 4.0) - 0.5)));
            baseAlbedo = mix(vec3(0.11, 0.15, 0.22), vec3(0.04, 0.06, 0.10), panel);
            roughness = 0.32;
        }
    } else if (matID == 2.0) {
        float coilGroove = smoothstep(0.35, 0.48, abs(fract(p.y * 9.0) - 0.5));
        baseAlbedo = mix(vec3(0.14, 0.24, 0.42), vec3(0.04, 0.08, 0.15), coilGroove);
        float pulseRing = exp(-pow(fract(p.y * 0.6 - u_time * 0.65) - 0.5, 2.0) * 35.0);
        emissive += vec3(0.0, 0.9, 1.0) * pulseRing * (0.65 + min(u_magTesla * 0.1, 1.5));
        roughness = 0.18;
    } else if (matID == 3.0) {
        baseAlbedo = vec3(0.16, 0.28, 0.48);
        roughness = 0.16;
        float htsGlow = clamp((u_magTesla - 3.5) * 0.15, 0.15, 1.2);
        emissive += vec3(0.15, 0.6, 1.0) * htsGlow * 0.42;
    } else if (matID == 4.0) {
        float r = length(p.xz);
        float ang = atan(p.z, p.x);
        float grid = smoothstep(0.46, 0.49, abs(fract(r * 2.5) - 0.5)) + smoothstep(0.47, 0.495, abs(fract(ang * 16.0 / TAU) - 0.5));
        baseAlbedo = mix(vec3(0.04, 0.07, 0.12), vec3(0.08, 0.16, 0.28), clamp(grid, 0.0, 1.0));
        roughness = 0.22;
    }

    float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    float specPower = mix(72.0, 14.0, roughness);
    float spec = pow(ndoth, specPower) * (1.6 - roughness);

    // 2ステップ・レイトレーシング反射サンプリング
    vec3 reflDir = reflect(rd, n);
    vec4 reflPlasma1 = samplePlasmaVolume(p + reflDir * 0.38);
    vec4 reflPlasma2 = samplePlasmaVolume(p + reflDir * 0.82);
    vec3 raytracedRefl = (reflPlasma1.rgb * reflPlasma1.a + reflPlasma2.rgb * reflPlasma2.a * 0.7) * 1.35;

    vec3 diffuse = baseAlbedo * (1.0 - metallic * 0.65) * ndotl * plasmaLightCol * lightIntensity;
    vec3 specular = mix(vec3(0.04), baseAlbedo, metallic) * (spec * plasmaLightCol * lightIntensity + raytracedRefl * (0.5 + 0.65 * fresnel));
    vec3 ambient = baseAlbedo * vec3(0.12, 0.18, 0.28) * (0.6 + 0.4 * n.y);

    return ambient + diffuse + specular + burstLight * baseAlbedo * 2.2 + emissive;
}

vec3 acesFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    vec3 ro, lookAt;
    float fov = 1.15;

    if (u_viewMode == 2) {
        float camPhi = u_cameraOrbit.x * 0.8 + 0.35;
        float camR = MAJOR_R + 0.15;
        ro = vec3(cos(camPhi) * camR, u_cameraOrbit.y * 0.35 + 0.05, sin(camPhi) * camR);
        float lookPhi = camPhi + 0.85;
        lookAt = vec3(cos(lookPhi) * (MAJOR_R - 0.1), -0.08 + u_cameraOrbit.y * 0.2, sin(lookPhi) * (MAJOR_R - 0.1));
        fov = 0.95 / clamp(u_cameraOrbit.z, 0.7, 1.5);
    } else if (u_viewMode == 1) {
        float dist = 4.9 / clamp(u_cameraOrbit.z, 0.65, 1.8);
        float yaw = u_cameraOrbit.x * 0.35 + 1.5708;
        float pitch = clamp(u_cameraOrbit.y * 0.4 + 0.12, -0.35, 0.85);
        ro = vec3(cos(yaw) * cos(pitch), sin(pitch), sin(yaw) * cos(pitch)) * dist;
        lookAt = vec3(0.0, -0.05, 0.0);
    } else {
        float dist = 5.3 / clamp(u_cameraOrbit.z, 0.65, 1.8);
        float yaw = u_cameraOrbit.x + 1.15;
        float pitch = clamp(u_cameraOrbit.y + 0.46, 0.05, 1.25);
        ro = vec3(cos(yaw) * cos(pitch), sin(pitch), sin(yaw) * cos(pitch)) * dist;
        lookAt = vec3(0.0, -0.08, 0.0);
    }

    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward * fov + uv.x * right + uv.y * up);

    // 1. 固体構造物のスフィアトレーシング
    float tMax = 12.0;
    float tSolid = 0.05;
    float hitMat = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * tSolid;
        vec2 d = mapSolidScene(p);
        if (d.x < 0.004) {
            hitMat = d.y;
            break;
        }
        tSolid += d.x * 0.85;
        if (tSolid >= tMax) break;
    }

    vec3 bgCol = mix(vec3(0.01, 0.02, 0.05), vec3(0.03, 0.07, 0.14), clamp(1.0 - length(uv) * 0.8, 0.0, 1.0));
    vec3 solidColor = bgCol;

    if (hitMat > 0.5 && tSolid < tMax) {
        vec3 hitPos = ro + rd * tSolid;
        vec3 normal = calcNormal(hitPos);
        solidColor = shadeSolidSurface(hitPos, normal, rd, hitMat);
    }

    // 2. ボリュメトリック・プラズマ・レイマーチング (48ステップ高密度積分)
    float marchEnd = min(tSolid, 8.5);
    float marchStart = 0.1;
    int numSteps = 48;
    float stepSize = (marchEnd - marchStart) / float(numSteps);

    float dither = fract(sin(dot(gl_FragCoord.xy + u_time * 10.0, vec2(12.9898, 78.233))) * 43758.5453);
    float tVol = marchStart + dither * stepSize;

    vec3 accumGlow = vec3(0.0);
    float transmittance = 1.0;

    for (int i = 0; i < 48; i++) {
        if (tVol >= marchEnd || transmittance < 0.015) break;
        vec3 p = ro + rd * tVol;
        vec4 sampleVal = samplePlasmaVolume(p);
        if (sampleVal.a > 0.001) {
            float alpha = 1.0 - exp(-sampleVal.a * stepSize * 2.65);
            accumGlow += transmittance * sampleVal.rgb * alpha * 1.85;
            transmittance *= (1.0 - alpha * 0.52);
        }
        tVol += stepSize;
    }

    vec3 finalHdr = solidColor * transmittance + accumGlow;

    // 凝縮されたエネルギーを感じさせるアナモルフィック・ストリーク＆コロナグレア
    float streak = exp(-abs(uv.y) * 14.0) * exp(-abs(uv.x) * 1.8);
    float energyFactor = clamp(u_tempKeV * 0.05 + u_qValue * 0.08 + u_pulseWave * 0.6, 0.08, 0.65);
    finalHdr += mix(vec3(1.0, 0.2, 0.65), vec3(0.15, 0.9, 1.0), clamp(u_qValue * 0.2, 0.0, 1.0)) * streak * energyFactor;

    vec3 mapped = acesFilm(finalHdr);
    mapped = pow(mapped, vec3(1.0 / 2.2));

    float vig = smoothstep(1.18, 0.32, length(uv));
    mapped *= mix(0.62, 1.0, vig);

    fragColor = vec4(mapped, 1.0);
}
`;

export class PlasmaReactor {
    constructor(canvas, onManualPulse) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onManualPulse = onManualPulse;

        this.width = canvas.width || 480;
        this.height = canvas.height || 380;

        this.viewMode = 'torus';
        this.showOscilloscope = true;

        this.cameraOrbit = {
            yaw: 0.0,
            pitch: 0.0,
            zoom: 1.0,
            dragging: false,
            lastX: 0,
            lastY: 0,
            dragDist: 0,
        };

        // 3D空間内パーティクル＆高エネルギー放電システム
        this.particles3D = [];
        this.lightningArcs = [];
        this.explosions = [];    // 3D核融合バースト (シェーダー点光源 + 3D衝撃波・スパーク)
        this.ejectaSparks = [];  // 核融合爆発や14.1MeV中性子から飛び散る3D高エネルギースパーク
        this.pulseWave = 0.0;

        this.telemetryHistory = [];
        this.telemetryTimer = 0;
        this.lightningTimer = 0;
        this.time = 0;

        this._initParticles3D(240);

        this.glCanvas = null;
        this.gl = null;
        this.program = null;
        this.uniforms = {};
        this._initWebGLRayTracer();
        this._setupEvents();
    }

    // 3D空間をヘリカル＋カオス渦で疾走する高エネルギーイオン＆アルファ粒子群の初期化
    _initParticles3D(count) {
        this.particles3D = [];
        for (let i = 0; i < count; i++) {
            this.particles3D.push(this._createParticle3D(i, count));
        }
    }

    _createParticle3D(idx = 0, total = 240) {
        const rand = Math.random();
        let type = 'D';
        let color = '#00f5d4';
        let coreColor = '#ffffff';
        if (rand > 0.42 && rand <= 0.82) {
            type = 'T';
            color = '#ff2a85';
        } else if (rand > 0.82 && rand <= 0.95) {
            type = 'He'; // 3.5 MeV アルファ粒子
            color = '#ffd166';
        } else if (rand > 0.95) {
            type = 'Plasmoid'; // 凝縮エネルギー・プラズモイド塊
            color = '#a855f7';
        }

        return {
            type,
            color,
            coreColor,
            phi: (idx / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.4, // トロイダル角
            theta: Math.random() * Math.PI * 2,                              // ポロイダル角
            rho: 0.06 + Math.pow(Math.random(), 1.4) * 0.78,                 // 小半径比 (中心ほど高密度に凝縮)
            baseRho: 0.06 + Math.pow(Math.random(), 1.4) * 0.78,
            toroidalSpeed: (1.4 + Math.random() * 2.6) * (Math.random() < 0.12 ? -0.7 : 1.0),
            poloidalSpeed: 2.8 + Math.random() * 4.5,
            wobbleFreq: 3.0 + Math.random() * 6.0,
            wobblePhase: Math.random() * Math.PI * 2,
            size: type === 'Plasmoid' ? (3.2 + Math.random() * 2.0) : (type === 'He' ? 2.6 : (1.4 + Math.random() * 1.5)),
            flickerOffset: Math.random() * 100,
        };
    }

    _initWebGLRayTracer() {
        if (typeof document === 'undefined' || !this.canvas || !this.canvas.parentElement) return;

        try {
            this.glCanvas = document.createElement('canvas');
            this.glCanvas.style.position = 'absolute';
            this.glCanvas.style.top = '0';
            this.glCanvas.style.left = '0';
            this.glCanvas.style.width = '100%';
            this.glCanvas.style.height = '100%';
            this.glCanvas.style.pointerEvents = 'none';
            this.glCanvas.style.zIndex = '0';

            this.canvas.style.position = 'relative';
            this.canvas.style.zIndex = '1';
            this.canvas.parentElement.insertBefore(this.glCanvas, this.canvas);

            const gl = this.glCanvas.getContext('webgl2', { antialias: false, depth: false, stencil: false });
            if (!gl) return;
            this.gl = gl;

            const vs = this._compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
            const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
            if (!vs || !fs) return;

            const prog = gl.createProgram();
            gl.attachShader(prog, vs);
            gl.attachShader(prog, fs);
            gl.linkProgram(prog);

            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                console.error('WebGL2 Shader Link Error:', gl.getProgramInfoLog(prog));
                return;
            }
            this.program = prog;

            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            const vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1, 1, -1, -1, 1,
                -1, 1, 1, -1, 1, 1,
            ]), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            this.vao = vao;

            const uNames = [
                'u_resolution', 'u_time', 'u_viewMode', 'u_cameraOrbit',
                'u_tempKeV', 'u_density', 'u_qValue', 'u_magTesla', 'u_fusionPower',
                'u_pulseWave', 'u_nbiLevel', 'u_pelletLevel', 'u_blanketLevel',
            ];
            uNames.forEach(name => {
                this.uniforms[name] = gl.getUniformLocation(prog, name);
            });
            this.uniforms.u_bursts = [];
            for (let i = 0; i < 6; i++) {
                this.uniforms.u_bursts.push(gl.getUniformLocation(prog, `u_bursts[${i}]`));
            }
        } catch (err) {
            console.warn('WebGL2 RayTracer fallback to 2D:', err);
        }
    }

    _compileShader(gl, type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('GLSL Compile Error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    setViewMode(mode) {
        if (mode === 'torus' || mode === 'poloidal' || mode === 'interior') {
            this.viewMode = mode;
            this.cameraOrbit.yaw = 0.0;
            this.cameraOrbit.pitch = 0.0;
            this.cameraOrbit.zoom = 1.0;
        }
    }

    toggleOscilloscope() {
        this.showOscilloscope = !this.showOscilloscope;
        return this.showOscilloscope;
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.width = rect.width;
            this.height = rect.height;

            if (this.glCanvas) {
                const glDpr = Math.min(window.devicePixelRatio || 1, 1.5);
                this.glCanvas.width = Math.floor(rect.width * glDpr);
                this.glCanvas.height = Math.floor(rect.height * glDpr);
            }
        }
    }

    _setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.cameraOrbit.dragging = true;
            this.cameraOrbit.lastX = e.clientX;
            this.cameraOrbit.lastY = e.clientY;
            this.cameraOrbit.dragDist = 0;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.cameraOrbit.dragging) return;
            const dx = e.clientX - this.cameraOrbit.lastX;
            const dy = e.clientY - this.cameraOrbit.lastY;
            this.cameraOrbit.lastX = e.clientX;
            this.cameraOrbit.lastY = e.clientY;
            this.cameraOrbit.dragDist += Math.hypot(dx, dy);

            this.cameraOrbit.yaw -= dx * 0.0075;
            this.cameraOrbit.pitch = Math.max(-0.65, Math.min(0.85, this.cameraOrbit.pitch + dy * 0.0065));
        });

        window.addEventListener('mouseup', () => {
            this.cameraOrbit.dragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            this.cameraOrbit.zoom = Math.max(0.7, Math.min(1.75, this.cameraOrbit.zoom + delta));
        }, { passive: false });

        this.canvas.addEventListener('click', (e) => {
            if (this.cameraOrbit.dragDist > 8) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.pulseWave = 0.02;
            // クリック時にランダムなプラズマ稲妻アークと高エネルギー粒子バーストを追加発生
            this._spawnLightningArc(true);
            this._spawnLightningArc(true);

            if (this.onManualPulse) {
                this.onManualPulse(x, y);
            }
        });
    }

    // トカマク座標 (phi, theta, rho) から 3D ワールド座標 (x, y, z) への変換
    _tokamakTo3D(phi, theta, rho) {
        const majorR = 2.15;
        const minorR = 0.82;
        const elongation = 1.48;
        const triangularity = 0.36;

        const rLocal = rho * minorR;
        const cTh = Math.cos(theta - triangularity * Math.sin(theta));
        const sTh = Math.sin(theta) * elongation;

        const rxy = majorR + rLocal * cTh;
        return {
            x: Math.cos(phi) * rxy,
            y: rLocal * sTh,
            z: Math.sin(phi) * rxy,
        };
    }

    // ランダムな3Dプラズマ稲妻（磁気リコネクション・アーク放電）の生成
    _spawnLightningArc(intense = false) {
        if (this.lightningArcs.length >= 14) {
            this.lightningArcs.shift();
        }
        // カットアウェイ開口部付近または内部カメラ前方に優先的に生成して視覚的迫力を最大化
        const basePhi = this.viewMode === 'interior'
            ? (this.cameraOrbit.yaw * 0.8 + 0.9 + (Math.random() - 0.5) * 1.2)
            : (1.15 + (Math.random() - 0.5) * 2.2);

        const spanPhi = (Math.random() - 0.5) * 0.85;
        const theta1 = Math.random() * Math.PI * 2;
        const theta2 = theta1 + (Math.random() - 0.5) * 2.4;
        const rho1 = 0.1 + Math.random() * 0.35;
        const rho2 = intense ? (0.75 + Math.random() * 0.25) : (0.3 + Math.random() * 0.65);

        const segments = 9;
        const pts3D = [];
        for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const phi = basePhi + spanPhi * t;
            const th = theta1 + (theta2 - theta1) * t;
            const rh = rho1 + (rho2 - rho1) * t;
            const p = this._tokamakTo3D(phi, th, rh);
            // 中間点にギザギザの3D電磁ジッターを付与
            const jitter = Math.sin(t * Math.PI) * (intense ? 0.24 : 0.15);
            p.x += (Math.random() - 0.5) * jitter;
            p.y += (Math.random() - 0.5) * jitter;
            p.z += (Math.random() - 0.5) * jitter;
            pts3D.push(p);
        }

        const palette = ['#00f5d4', '#ff2a85', '#a855f7', '#ffd166', '#60efff'];
        const color = palette[Math.floor(Math.random() * palette.length)];

        this.lightningArcs.push({
            pts3D,
            color,
            width: intense ? 2.6 : (1.3 + Math.random() * 1.2),
            age: 0,
            maxAge: 0.08 + Math.random() * 0.14,
        });
    }

    // 核融合反応イベント（D-T衝突）時の3D点光源＋3Dスパーク＆中性子シャワートリガー
    triggerFusionBurst(count = 1) {
        const numBursts = Math.min(count, 5);
        for (let k = 0; k < numBursts; k++) {
            // 見える領域に優先配置しつつ全方位にランダム性を持たせる
            const preferFront = Math.random() < 0.72;
            const phi = preferFront
                ? (1.15 + (Math.random() - 0.5) * 2.1)
                : (Math.random() * Math.PI * 2);
            const theta = Math.random() * Math.PI * 2;
            const rho = Math.random() * 0.45;
            const pos = this._tokamakTo3D(phi, theta, rho);

            if (this.explosions.length >= 6) {
                this.explosions.shift();
            }
            this.explosions.push({
                x3d: pos.x,
                y3d: pos.y,
                z3d: pos.z,
                color: Math.random() < 0.5 ? '#ff2a85' : '#00f5d4',
                age: 0,
                maxAge: 0.55,
            });

            // 3D空間へ飛び散る高エネルギー・プラズマエジェクタ & 14.1 MeV 高速中性子レーザー軌跡
            const sparkCount = 14 + Math.floor(Math.random() * 8);
            for (let s = 0; s < sparkCount; s++) {
                if (this.ejectaSparks.length >= 160) {
                    this.ejectaSparks.shift();
                }
                const isNeutron = s < 4; // 4本は磁場を貫通して炉壁へ直進する14.1MeV高速中性子
                const u = Math.random() * Math.PI * 2;
                const v = (Math.random() - 0.5) * Math.PI;
                const spd = isNeutron ? (4.8 + Math.random() * 2.5) : (1.8 + Math.random() * 3.4);

                this.ejectaSparks.push({
                    x: pos.x,
                    y: pos.y,
                    z: pos.z,
                    vx: Math.cos(u) * Math.cos(v) * spd,
                    vy: Math.sin(v) * spd,
                    vz: Math.sin(u) * Math.cos(v) * spd,
                    isNeutron,
                    color: isNeutron ? '#b8f5ff' : (s % 2 === 0 ? '#ffd166' : '#ff2a85'),
                    size: isNeutron ? 2.4 : (1.5 + Math.random() * 1.8),
                    age: 0,
                    maxAge: isNeutron ? 0.42 : (0.28 + Math.random() * 0.25),
                });
            }

            // 核融合と同時に磁気リコネクション稲妻も誘発
            this._spawnLightningArc(true);
        }
    }

    update(dt = 1 / 60, reactorState, buildingsState = null) {
        this.time += dt;
        const temp = reactorState ? reactorState.temperatureKeV : 1.0;
        const qVal = reactorState ? reactorState.qValue : 0.0;
        const powerMW = reactorState ? reactorState.fusionPowerMW : 0.0;
        const speedFactor = 0.8 + Math.min(temp / 3.8, 5.0) + Math.min(qVal * 0.2, 2.0);

        if (!this.cameraOrbit.dragging) {
            this.cameraOrbit.yaw += dt * (this.viewMode === 'interior' ? 0.14 : 0.06);
        }

        if (this.pulseWave > 0.0) {
            this.pulseWave += dt * 1.65;
            if (this.pulseWave >= 1.0) {
                this.pulseWave = 0.0;
            }
        }

        // テレメトリ波形履歴のサンプリング
        this.telemetryTimer += dt;
        if (this.telemetryTimer >= 0.2) {
            this.telemetryTimer = 0;
            this.telemetryHistory.push({
                temp,
                power: powerMW,
                q: qVal,
            });
            if (this.telemetryHistory.length > 60) {
                this.telemetryHistory.shift();
            }
        }

        // 1. 3Dヘリカル＋カオス渦パーティクル群の更新
        for (const p of this.particles3D) {
            p.phi = (p.phi + p.toroidalSpeed * speedFactor * dt) % (Math.PI * 2);
            if (p.phi < 0) p.phi += Math.PI * 2;
            p.theta = (p.theta + p.poloidalSpeed * speedFactor * dt) % (Math.PI * 2);

            // パルス圧縮時は中心コア(rho -> 0.05)へ激しくピンチ収束！
            const pinchFactor = this.pulseWave > 0.01 ? (1.0 - Math.sin(this.pulseWave * Math.PI) * 0.65) : 1.0;
            const chaosJitter = Math.sin(this.time * p.wobbleFreq + p.wobblePhase) * 0.12;
            p.rho = Math.max(0.03, Math.min(0.92, (p.baseRho + chaosJitter) * pinchFactor));
        }

        // 2. 自発的プラズマ稲妻アーク放電のランダム発生 (温度・Q値が高いほど高頻度)
        this.lightningTimer += dt;
        const arcInterval = Math.max(0.025, 0.14 / (1.0 + temp * 0.25 + qVal * 0.4));
        if (this.lightningTimer >= arcInterval) {
            this.lightningTimer = 0;
            this._spawnLightningArc(temp > 8.0 || qVal >= 1.0);
        }

        for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
            this.lightningArcs[i].age += dt;
            if (this.lightningArcs[i].age >= this.lightningArcs[i].maxAge) {
                this.lightningArcs.splice(i, 1);
            }
        }

        // 3. 3Dエジェクタスパーク＆高速中性子の運動更新
        for (let i = this.ejectaSparks.length - 1; i >= 0; i--) {
            const sp = this.ejectaSparks[i];
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.z += sp.vz * dt;
            if (!sp.isNeutron) {
                // 荷電粒子はローレンツ力で螺旋状に曲がる
                const bend = 4.5 * dt;
                const nvx = sp.vx * Math.cos(bend) - sp.vz * Math.sin(bend);
                const nvz = sp.vx * Math.sin(bend) + sp.vz * Math.cos(bend);
                sp.vx = nvx * 0.96;
                sp.vy *= 0.96;
                sp.vz = nvz * 0.96;
            }
            sp.age += dt;
            if (sp.age >= sp.maxAge) {
                this.ejectaSparks.splice(i, 1);
            }
        }

        // 4. 3D核融合バースト光源の減衰更新
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].age += dt;
            if (this.explosions[i].age >= this.explosions[i].maxAge) {
                this.explosions.splice(i, 1);
            }
        }
    }

    // WebGL2シェーダーと完全に同一の3Dカメラ基底ベクトルを計算
    _getCameraBasis() {
        let ro, lookAt;
        let fov = 1.15;
        const majorR = 2.15;

        if (this.viewMode === 'interior') {
            const camPhi = this.cameraOrbit.yaw * 0.8 + 0.35;
            const camR = majorR + 0.15;
            ro = {
                x: Math.cos(camPhi) * camR,
                y: this.cameraOrbit.y * 0.35 + 0.05 || this.cameraOrbit.pitch * 0.35 + 0.05,
                z: Math.sin(camPhi) * camR,
            };
            const lookPhi = camPhi + 0.85;
            lookAt = {
                x: Math.cos(lookPhi) * (majorR - 0.1),
                y: -0.08 + this.cameraOrbit.pitch * 0.2,
                z: Math.sin(lookPhi) * (majorR - 0.1),
            };
            fov = 0.95 / Math.max(0.7, Math.min(1.5, this.cameraOrbit.zoom));
        } else if (this.viewMode === 'poloidal') {
            const dist = 4.9 / Math.max(0.65, Math.min(1.8, this.cameraOrbit.zoom));
            const yaw = this.cameraOrbit.yaw * 0.35 + 1.5708;
            const pitch = Math.max(-0.35, Math.min(0.85, this.cameraOrbit.pitch * 0.4 + 0.12));
            ro = {
                x: Math.cos(yaw) * Math.cos(pitch) * dist,
                y: Math.sin(pitch) * dist,
                z: Math.sin(yaw) * Math.cos(pitch) * dist,
            };
            lookAt = { x: 0, y: -0.05, z: 0 };
        } else {
            const dist = 5.3 / Math.max(0.65, Math.min(1.8, this.cameraOrbit.zoom));
            const yaw = this.cameraOrbit.yaw + 1.15;
            const pitch = Math.max(0.05, Math.min(1.25, this.cameraOrbit.pitch + 0.46));
            ro = {
                x: Math.cos(yaw) * Math.cos(pitch) * dist,
                y: Math.sin(pitch) * dist,
                z: Math.sin(yaw) * Math.cos(pitch) * dist,
            };
            lookAt = { x: 0, y: -0.08, z: 0 };
        }

        const norm = (v) => {
            const l = Math.hypot(v.x, v.y, v.z) || 1;
            return { x: v.x / l, y: v.y / l, z: v.z / l };
        };
        const cross = (a, b) => ({
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x,
        });

        const forward = norm({ x: lookAt.x - ro.x, y: lookAt.y - ro.y, z: lookAt.z - ro.z });
        const right = norm(cross(forward, { x: 0, y: 1, z: 0 }));
        const up = cross(right, forward);

        return { ro, forward, right, up, fov };
    }

    // 3Dワールド座標 (x,y,z) を 2Dキャンバススクリーン座標 (sx, sy, depth) へ透視投影
    _project3D(pt, cam) {
        const dx = pt.x - cam.ro.x;
        const dy = pt.y - cam.ro.y;
        const dz = pt.z - cam.ro.z;

        const zCam = dx * cam.forward.x + dy * cam.forward.y + dz * cam.forward.z;
        if (zCam <= 0.12) return null;

        const xCam = dx * cam.right.x + dy * cam.right.y + dz * cam.right.z;
        const yCam = dx * cam.up.x + dy * cam.up.y + dz * cam.up.z;

        const scale = (cam.fov * this.height) / zCam;
        return {
            sx: this.width * 0.5 + xCam * scale,
            sy: this.height * 0.5 - yCam * scale,
            depth: zCam,
            scale: cam.fov / zCam,
        };
    }

    // カットアウェイ外壁による簡易3D遮蔽判定（壁の裏側にある粒子は減光させる）
    _getVisibilityFactor(pt) {
        if (this.viewMode === 'interior') return 1.0;
        if (this.viewMode === 'poloidal') {
            return pt.z > -0.25 ? 1.0 : 0.22;
        }
        const phi = Math.atan2(pt.z, pt.x);
        const diff = Math.abs(phi - 1.15);
        // カットアウェイ開口セクター内は100%可視、外壁裏は半透明透過グローとして描画
        return diff < 1.22 ? 1.0 : 0.25;
    }

    render(reactorState, buildingsState = null) {
        // 1. WebGL2 3Dレイトレーシング & カオスMHDボリュメトリック・プラズマ描画
        if (this.gl && this.program && this.glCanvas) {
            this._renderWebGLRayTracing(reactorState, buildingsState);
        }

        // 2. 前面2Dキャンバスに 3D同期ハイパーパーティクル・稲妻アーク・爆発エフェクトを加算合成描画
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const cam = this._getCameraBasis();
        this._render3DHyperParticlesAndArcs(ctx, cam, reactorState);
        this._renderCameraHUDHint(ctx);

        if (this.showOscilloscope) {
            this._renderTelemetryOscilloscope(ctx, reactorState);
        }
    }

    _render3DHyperParticlesAndArcs(ctx, cam, reactorState) {
        const temp = reactorState ? reactorState.temperatureKeV : 1.0;
        const qVal = reactorState ? reactorState.qValue : 0.0;
        const speedTail = 0.055 + Math.min(temp * 0.008, 0.09);

        ctx.save();
        // 加算合成 (HDR Additive Glow) でエネルギーが凝縮・発光する表現
        ctx.globalCompositeOperation = 'lighter';

        // A. 3Dヘリカル高速イオン＆プラズモイド粒子（残像リボン＋高輝度コア）
        for (const p of this.particles3D) {
            const posNow = this._tokamakTo3D(p.phi, p.theta, p.rho);
            const vis = this._getVisibilityFactor(posNow);
            if (vis <= 0.05) continue;

            const projNow = this._project3D(posNow, cam);
            if (!projNow) continue;

            // 少し前の時刻の3D位置から残像テールを計算
            const posPrev = this._tokamakTo3D(
                p.phi - p.toroidalSpeed * speedTail,
                p.theta - p.poloidalSpeed * speedTail,
                p.rho
            );
            const projPrev = this._project3D(posPrev, cam);

            const flicker = 0.65 + 0.35 * Math.sin(this.time * 24.0 + p.flickerOffset);
            const alpha = Math.min(1.0, vis * flicker * (0.65 + Math.min(temp * 0.05, 0.35)));
            const radius = Math.max(0.9, Math.min(9.0, p.size * projNow.scale * 3.4));

            if (projPrev) {
                const grad = ctx.createLinearGradient(projPrev.sx, projPrev.sy, projNow.sx, projNow.sy);
                grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
                grad.addColorStop(1, p.color);

                ctx.strokeStyle = grad;
                ctx.globalAlpha = alpha * 0.78;
                ctx.lineWidth = radius * 1.15;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(projPrev.sx, projPrev.sy);
                ctx.lineTo(projNow.sx, projNow.sy);
                ctx.stroke();
            }

            // 粒子発光ハロー
            ctx.globalAlpha = alpha * 0.85;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(projNow.sx, projNow.sy, radius * 1.6, 0, Math.PI * 2);
            ctx.fill();

            // 粒子ホワイトホットコア
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(projNow.sx, projNow.sy, radius * 0.65, 0, Math.PI * 2);
            ctx.fill();
        }

        // B. 3D磁気リコネクション・プラズマ稲妻アーク
        for (const arc of this.lightningArcs) {
            const progress = arc.age / arc.maxAge;
            const alpha = Math.sin(progress * Math.PI) * 0.95;

            ctx.strokeStyle = arc.color;
            ctx.shadowBlur = 14;
            ctx.shadowColor = arc.color;
            ctx.lineWidth = arc.width;
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            let started = false;
            for (const pt of arc.pts3D) {
                const pr = this._project3D(pt, cam);
                if (!pr) continue;
                if (!started) {
                    ctx.moveTo(pr.sx, pr.sy);
                    started = true;
                } else {
                    ctx.lineTo(pr.sx, pr.sy);
                }
            }
            ctx.stroke();

            // 稲妻の中心白芯
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = arc.width * 0.45;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // C. 3D核融合エジェクタ・スパーク & 14.1 MeV 高速中性子レーザー
        for (const sp of this.ejectaSparks) {
            const pNow = this._project3D(sp, cam);
            if (!pNow) continue;
            const dtTail = sp.isNeutron ? 0.045 : 0.03;
            const pPrev = this._project3D({
                x: sp.x - sp.vx * dtTail,
                y: sp.y - sp.vy * dtTail,
                z: sp.z - sp.vz * dtTail,
            }, cam);

            const alpha = Math.max(0, 1.0 - sp.age / sp.maxAge);
            const r = Math.max(1.0, Math.min(7.0, sp.size * pNow.scale * 3.2));

            if (pPrev) {
                ctx.strokeStyle = sp.color;
                ctx.globalAlpha = alpha * 0.9;
                ctx.lineWidth = r;
                ctx.beginPath();
                ctx.moveTo(pPrev.sx, pPrev.sy);
                ctx.lineTo(pNow.sx, pNow.sy);
                ctx.stroke();
            }

            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(pNow.sx, pNow.sy, r * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // D. 3D核融合スーパーノヴァ衝撃波リング & アナモルフィック・レンズフレア
        for (const exp of this.explosions) {
            const pr = this._project3D({ x: exp.x3d, y: exp.y3d, z: exp.z3d }, cam);
            if (!pr) continue;

            const p = exp.age / exp.maxAge;
            const alpha = Math.max(0, 1.0 - p);
            const baseR = (10 + p * 68) * pr.scale * 2.6;

            // 中心高輝度プラズマフレア
            const flareGrad = ctx.createRadialGradient(pr.sx, pr.sy, 1, pr.sx, pr.sy, baseR * 0.85);
            flareGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            flareGrad.addColorStop(0.35, `rgba(0, 245, 212, ${alpha * 0.7})`);
            flareGrad.addColorStop(1, 'rgba(247, 37, 133, 0)');
            ctx.fillStyle = flareGrad;
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(pr.sx, pr.sy, baseR * 0.85, 0, Math.PI * 2);
            ctx.fill();

            // 3Dパース付き楕円衝撃波リング
            ctx.strokeStyle = exp.color;
            ctx.globalAlpha = alpha * 0.9;
            ctx.lineWidth = Math.max(1.2, 3.5 * (1.0 - p));
            ctx.beginPath();
            ctx.ellipse(pr.sx, pr.sy, baseR, baseR * 0.58, 0.25, 0, Math.PI * 2);
            ctx.stroke();

            // 水平アナモルフィック・ライトストリーク
            ctx.strokeStyle = `rgba(180, 245, 255, ${alpha * 0.75})`;
            ctx.lineWidth = 2.0 * (1.0 - p);
            ctx.beginPath();
            ctx.moveTo(pr.sx - baseR * 1.9, pr.sy);
            ctx.lineTo(pr.sx + baseR * 1.9, pr.sy);
            ctx.stroke();
        }

        ctx.restore();
    }

    _renderWebGLRayTracing(reactorState, buildingsState) {
        const gl = this.gl;
        const w = this.glCanvas.width;
        const h = this.glCanvas.height;
        if (w === 0 || h === 0) return;

        gl.viewport(0, 0, w, h);
        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        const temp = reactorState ? reactorState.temperatureKeV : 1.0;
        const density = reactorState ? reactorState.density : 0.2;
        const qVal = reactorState ? reactorState.qValue : 0.0;
        const magT = reactorState ? reactorState.magneticFieldTesla : 3.5;
        const powerMW = reactorState ? reactorState.fusionPowerMW : 0.0;

        const nbiCount = buildingsState ? (buildingsState['nbi_heater'] || 0) : 0;
        const pelletCount = buildingsState ? (buildingsState['pellet_injector'] || 0) : 0;
        const blanketCount = buildingsState ? (buildingsState['breeding_blanket'] || 0) : 0;

        const modeInt = this.viewMode === 'poloidal' ? 1 : (this.viewMode === 'interior' ? 2 : 0);

        gl.uniform2f(this.uniforms.u_resolution, w, h);
        gl.uniform1f(this.uniforms.u_time, this.time);
        gl.uniform1i(this.uniforms.u_viewMode, modeInt);
        gl.uniform3f(this.uniforms.u_cameraOrbit, this.cameraOrbit.yaw, this.cameraOrbit.pitch, this.cameraOrbit.zoom);

        gl.uniform1f(this.uniforms.u_tempKeV, temp);
        gl.uniform1f(this.uniforms.u_density, density);
        gl.uniform1f(this.uniforms.u_qValue, qVal);
        gl.uniform1f(this.uniforms.u_magTesla, magT);
        gl.uniform1f(this.uniforms.u_fusionPower, powerMW);
        gl.uniform1f(this.uniforms.u_pulseWave, this.pulseWave);

        gl.uniform1f(this.uniforms.u_nbiLevel, nbiCount);
        gl.uniform1f(this.uniforms.u_pelletLevel, pelletCount);
        gl.uniform1f(this.uniforms.u_blanketLevel, blanketCount);

        for (let i = 0; i < 6; i++) {
            if (i < this.explosions.length) {
                const exp = this.explosions[i];
                const intensity = Math.max(0, 1.0 - exp.age / exp.maxAge);
                gl.uniform4f(this.uniforms.u_bursts[i], exp.x3d, exp.y3d, exp.z3d, intensity);
            } else {
                gl.uniform4f(this.uniforms.u_bursts[i], 0, 0, 0, 0);
            }
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _renderCameraHUDHint(ctx) {
        ctx.save();
        const modeLabel = this.viewMode === 'interior'
            ? 'IN-VESSEL FIRST-WALL RAY-TRACED CAMERA'
            : (this.viewMode === 'poloidal' ? '3D VOLUMETRIC POLOIDAL SLICE' : '3D RAY-TRACED CUTAWAY TOKAMAK');

        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(180, 225, 255, 0.72)';
        ctx.textAlign = 'left';
        ctx.fillText(`🎥 ${modeLabel}  [ドラッグ: 3D回転 / ホイール: ズーム / クリック: 高エネルギー圧縮パルス]`, 14, 58);
        ctx.restore();
    }

    _renderTelemetryOscilloscope(ctx) {
        if (this.telemetryHistory.length < 2) return;

        const boxW = 195;
        const boxH = 54;
        const boxX = 12;
        const boxY = this.height - boxH - 10;

        ctx.save();
        ctx.fillStyle = 'rgba(5, 10, 20, 0.78)';
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#98abc6';
        ctx.textAlign = 'left';
        ctx.fillText('LIVE TELEMETRY (T: CYAN / Q: MAGENTA)', boxX + 8, boxY + 11);

        const graphX = boxX + 8;
        const graphY = boxY + 16;
        const graphW = boxW - 16;
        const graphH = boxH - 22;

        const maxT = Math.max(15, ...this.telemetryHistory.map(d => d.temp));
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.telemetryHistory.forEach((pt, idx) => {
            const x = graphX + (idx / (this.telemetryHistory.length - 1)) * graphW;
            const y = graphY + graphH - Math.min(1, pt.temp / maxT) * graphH;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        const maxQ = Math.max(5, ...this.telemetryHistory.map(d => d.q));
        ctx.strokeStyle = '#ff2a85';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.telemetryHistory.forEach((pt, idx) => {
            const x = graphX + (idx / (this.telemetryHistory.length - 1)) * graphW;
            const y = graphY + graphH - Math.min(1, pt.q / maxQ) * graphH;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.restore();
    }
}
