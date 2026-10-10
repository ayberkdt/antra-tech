/* DOKUMA TEZGÂHI — kahraman bölümünün canlı kumaşı (WebGL 1, tek tam ekran üçgen).
 *
 * Kumaş iplik iplik hesaplanır: her hücre (çözgü i, atkı j) için hangi ipliğin üstte
 * olduğu örgü raporundan gelir. Zemin 2/1 çözgü yüzlü dimi (gabardin), desen 5'li
 * atkı yüzlü saten: jakar damask. Desen "A" monogramı ve baklava; yarım atlamalı rapor.
 * Işık imleçtedir; iplik parlaklığı Kajiya–Kay anizotrop modeliyle hesaplanır
 * (çözgü dikey, atkı yatay parlar → saten desen ışıkla belirip kaybolur).
 *
 * Tezgâh çevrimi (1,15 s): ağızlık açılır → mekik atkıyı geçirir → tarak vurur
 * (kumaş bir sıra yukarı sarılır) → tarak geri döner. Yön her atkıda değişir.
 *
 * Saf yardımcılar (örgü, çevrim) dışa açıktır; araclar/dogrula.mjs Node'da sınar.
 */

export const RAPOR = { TX: 40, TY: 48, MW: 26, MH: 32 };
export const CEVRIM_SN = 1.15;            /* bir atkı çevrimi (s) → 60 / 1,15 ≈ 52 atkı/dk */

/** Örgü raporu: (i, j) hücresinde çözgü üstte mi? figur: hücre desen içinde mi. */
export function cozguUstte(i, j, figur) {
  const m = (a, b) => ((a % b) + b) % b;
  if (figur) return m(2 * i - j, 5) === 0;   // 5'li saten, atlama 2 (atkı yüzlü)
  return m(i - j, 3) < 2;                      // 2/1 dimi (çözgü yüzlü)
}

/** Tezgâh çevrimi: faz (0–1) → mekik yolu, tarak, sarma. */
export function cevrim(faz) {
  const yumusak = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const gecis = yumusak(faz / 0.6);                    // mekik 0 → 1
  const vurus = yumusak((faz - 0.6) / 0.2);            // tarak ileri + kumaş sarılır
  const donus = yumusak((faz - 0.8) / 0.2);            // tarak geri
  const tarak = faz < 0.6 ? 0 : faz < 0.8 ? vurus : 1 - donus;   // 0 = dinlenme, 1 = kumaş ağzında
  const agizlik = faz < 0.6 ? yumusak(faz / 0.08) : 1 - vurus;
  return { gecis, sarma: vurus, tarak, agizlik };
}

const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uDpr, uP, uPick, uRow, uMekik, uYon, uSerili, uTarak, uAgiz, uZaman, uDurt, uKarart, uKenar, uDuz, uZemin;
uniform vec3 uIsik;
uniform vec2 uImlec;
uniform vec4 uDalga[4];   /* tıklama dalgaları: x, y, yaş (s), güç */
uniform sampler2D uMaske;
uniform vec4 uMetin;                          /* metin bloğu (cihaz pikseli, üstten): x0 y0 x1 y1 */

const float TX = ${RAPOR.TX}.0, TY = ${RAPOR.TY}.0, MW = ${RAPOR.MW}.0, MH = ${RAPOR.MH}.0;
/* çözgü indigo; atkı iki renk (lampas): zeminde koyu lacivert, desende gümüş-ekru → desen koyu zeminde açık okunur */
const vec3 COZGU = vec3(0.140, 0.176, 0.380);
const vec3 ATKI  = vec3(0.075, 0.090, 0.210);
const vec3 ATKI_DESEN = vec3(0.560, 0.575, 0.650);
const vec3 BOS   = vec3(0.040, 0.050, 0.120);

float h1(float x){ return fract(sin(x * 91.345) * 47453.5453); }
/* kenar ipliği (selvedge): kumaşın iki kenarındaki çözgüler kırmızı */
vec3 cozguRengi(float i){
  float son = floor(uRes.x / uP);
  float kenar = (i >= 1.0 && i <= 2.0) || (i >= son - 2.0 && i <= son - 1.0) ? 1.0 : 0.0;
  return mix(COZGU, vec3(0.50, 0.11, 0.13), kenar);
}

float figur(float i, float j){
  float c = floor(i / TX);
  float jj = j + mod(c, 2.0) * TY * 0.5;
  float r = floor(jj / TY);
  float li = i - c * TX, lj = jj - r * TY;
  if (mod(c + r, 2.0) < 0.5) {
    vec2 uv = vec2((li - (TX - MW) * 0.5 + 0.5) / MW, (lj - (TY - MH) * 0.5 + 0.5) / MH);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    return step(0.5, texture2D(uMaske, uv).r);
  }
  vec2 d = abs(vec2(li - TX * 0.5 + 0.5, lj - TY * 0.5 + 0.5));
  float m = d.x / 7.5 + d.y / 9.0;
  return ((m < 1.0 && m > 0.6) || (d.x < 1.0 && d.y < 1.0)) ? 1.0 : 0.0;
}
float ust(float i, float j){
  if (figur(i, j) > 0.5) return mod(2.0 * i - j, 5.0) < 0.5 ? 1.0 : 0.0;
  if (uZemin < 0.5) return mod(i - j, 3.0) < 1.5 ? 1.0 : 0.0;                          /* 2/1 dimi */
  if (uZemin < 1.5) return mod(i + j, 2.0) < 0.5 ? 1.0 : 0.0;                          /* bezayağı */
  return mod(floor(i * 0.5) + floor(j * 0.5), 2.0) < 0.5 ? 1.0 : 0.0;                  /* panama 2/2 */
}

vec3 isikla(vec3 taban, vec3 n, vec3 T, vec2 q, float boy, float en){
  vec3 L = normalize(vec3(uIsik.xy - q, uIsik.z));
  float yayil = max(dot(n, L), 0.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float th = dot(T, H);
  float par = pow(sqrt(max(1.0 - th * th, 0.0)), 70.0) * smoothstep(0.05, 0.7, n.z);
  float bukum = 0.93 + 0.07 * sin((boy * 6.0 + en * 1.4) * 6.2832);
  return taban * (0.36 + 0.78 * yayil) * bukum + vec3(0.62, 0.66, 0.86) * par * 0.40;
}

/* çıplak çözgü (henüz dokunmamış bölge) */
vec3 ciplakCozgu(float i, vec2 f, vec2 q, float kalkik){
  float s = (f.x - 0.5) / 0.4;
  if (abs(s) > 1.0) return BOS;
  vec3 n = normalize(vec3(s * 0.9, 0.0, sqrt(1.0 - s * s)));
  vec3 taban = cozguRengi(i) * (0.9 + 0.16 * h1(i)) * (0.62 + 0.38 * kalkik);
  return isikla(taban, n, vec3(0.0, 1.0, 0.0), q, f.y, s);
}

vec3 hucre(float i, float j, vec2 f, vec2 q){
  float cu = ust(i, j);
  float w = 0.88;
  if (cu > 0.5) {
    float s = (f.x - 0.5) / (w * 0.5);
    if (abs(s) > 1.0) return ATKI * 0.42;
    float a = ust(i, j - 1.0), b = ust(i, j + 1.0);
    float dal = 0.0, ny = 0.0;
    if (a < 0.5 && f.y < 0.5) { dal = 1.0 - smoothstep(0.0, 0.3, f.y); ny = -dal; }
    if (b < 0.5 && f.y > 0.5) { dal = smoothstep(0.7, 1.0, f.y); ny = dal; }
    vec3 n = normalize(vec3(s * 0.9, ny * 0.8, sqrt(1.0 - s * s)));
    vec3 taban = cozguRengi(i) * (0.9 + 0.16 * h1(i));
    return isikla(taban, n, vec3(0.0, 1.0, 0.0), q, f.y, s) * (1.0 - dal * 0.5);
  } else {
    float s = (f.y - 0.5) / (w * 0.5);
    if (abs(s) > 1.0) return COZGU * 0.38;
    float a = ust(i - 1.0, j), b = ust(i + 1.0, j);
    float dal = 0.0, nx = 0.0;
    if (a > 0.5 && f.x < 0.5) { dal = 1.0 - smoothstep(0.0, 0.3, f.x); nx = -dal; }
    if (b > 0.5 && f.x > 0.5) { dal = smoothstep(0.7, 1.0, f.x); nx = dal; }
    vec3 n = normalize(vec3(nx * 0.8, s * 0.9, sqrt(1.0 - s * s)));
    vec3 taban = mix(ATKI, ATKI_DESEN, figur(i, j)) * (0.9 + 0.16 * h1(j + 517.0));
    return isikla(taban, n, vec3(1.0, 0.0, 0.0), q, f.x, s) * (1.0 - dal * 0.5);
  }
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  /* imleç: iplikler parmağın çevresinde hafifçe aralanır (mercek) */
  vec2 d = p - uImlec;
  float R = 120.0 * uDpr;
  float g = exp(-dot(d, d) / (R * R));
  vec2 q = p - d * g * 0.2 * uDurt;
  /* tıklama: kumaşta halka dalga yayılır (iplikler yer değiştirir, kıvrım ışığı oynar) */
  float dalgaIsik = 0.0;
  for (int k = 0; k < 4; k++) {
    vec4 w = uDalga[k];
    if (w.w <= 0.0) continue;
    vec2 dv = p - w.xy;
    float r = length(dv) / uDpr;
    float on = w.z * 520.0;
    float u = (r - on) / 60.0;                 /* pow() negatif tabanda tanımsız: u*u */
    float zarf = exp(-u * u) * exp(-w.z * 1.6) * w.w;
    float s = sin((r - on) * 0.11);
    q -= normalize(dv + 0.001) * s * zarf * 6.0 * uDpr;
    dalgaIsik += s * zarf;
  }
  /* dökümlü kumaş: yavaş, dikey kıvrımlar */
  float kivrim = sin(q.x * 0.0042 / uDpr + sin(q.y * 0.0016 / uDpr + uZaman * 0.19) * 1.7 + uZaman * 0.11);

  float on = uKenar;                         /* kumaş ağzı (fell), cihaz pikseli */
  float sira = uPick + (q.y - on) / uP;
  float kolon = q.x / uP;
  float i = floor(kolon), j = floor(sira);
  vec2 f = vec2(fract(kolon), fract(sira));
  vec3 renk;

  /* mekik serili atkının ucu: yön sağa ise soldan uSerili'ye, sola ise sağdan */
  bool serili = uYon > 0.0 ? (q.x < uSerili) : (q.x > uSerili);
  float kalkik = ust(i, uRow);

  if (j < uRow || (j < uRow + 0.5 && serili)) {
    renk = hucre(i, j, f, q);
    renk *= (0.9 + 0.1 * kivrim) * (1.0 + 0.22 * dalgaIsik);
  } else {
    renk = ciplakCozgu(i, f, q, mix(1.0, kalkik, uAgiz));
    /* gücü çerçeveleri: iki çerçeve, ağızlıkla zıt yönde */
    float yA = on + 10.0 * uP - uAgiz * 3.0 * uDpr, yB = on + 13.0 * uP + uAgiz * 3.0 * uDpr;
    float cerA = 1.0 - smoothstep(0.6 * uDpr, 1.6 * uDpr, abs(q.y - yA));
    float cerB = 1.0 - smoothstep(0.6 * uDpr, 1.6 * uDpr, abs(q.y - yB));
    renk = mix(renk, vec3(0.58, 0.62, 0.72), max(cerA, cerB) * 0.9);
    float goz = mod(i, 2.0) < 0.5 ? abs(q.y - yA) : abs(q.y - yB);
    float gozM = (1.0 - smoothstep(1.5 * uDpr, 2.6 * uDpr, goz)) * (1.0 - smoothstep(0.18, 0.32, abs(f.x - 0.5)));
    renk = mix(renk, vec3(0.93, 0.94, 0.97), gozM * 0.9);
  }

  /* tarak: dinlenmede ağızdan 5 iplik aşağıda, vuruşta ağza gelir */
  float tarakY = on + mix(5.0, 0.55, uTarak) * uP;
  float tb = abs(q.y - tarakY);
  if (tb < 0.5 * uP) {
    float kenarT = smoothstep(0.5 * uP, 0.3 * uP, tb);
    float dis = smoothstep(0.1, 0.0, min(f.x, 1.0 - f.x));
    vec3 celik = mix(vec3(0.46, 0.50, 0.58), vec3(0.86, 0.88, 0.93), 1.0 - tb / (0.5 * uP));
    renk = mix(renk, mix(celik, vec3(0.08, 0.09, 0.14), dis), kenarT * 0.85);
  }

  /* mekik: sivri uçlu ahşap gövde, metal burun */
  vec2 m = (q - vec2(uMekik, on + 3.0 * uP)) / vec2(6.0 * uP, 0.85 * uP);
  float sekil = abs(m.x) + m.y * m.y;
  if (sekil < 1.0) {
    float burun = smoothstep(0.62, 0.7, abs(m.x));
    vec3 agac = mix(vec3(0.52, 0.33, 0.19), vec3(0.70, 0.48, 0.29), 0.5 + 0.5 * sin(m.x * 40.0 + m.y * 3.0));
    agac *= 0.75 + 0.35 * (1.0 - m.y);
    vec3 metal = vec3(0.78, 0.80, 0.84) * (0.7 + 0.4 * (1.0 - abs(m.y)));
    renk = mix(agac, metal, burun) * smoothstep(1.0, 0.86, sekil) + renk * (1.0 - smoothstep(1.0, 0.86, sekil));
    /* masura: kırmızı atkı bobini */
    if (abs(m.x) < 0.32 && abs(m.y) < 0.42) renk = mix(renk, vec3(0.72, 0.16, 0.17), 0.85);
  }

  /* metin okunurluğu: yalnız metin bloğunun arkası koyulaşır, dışa doğru 140 px'te söner; dış kenarlardaki desen tam
     parlaklıkta kalır (önce sol yarının tamamı %58 koyulaşıyor, oradaki motifler lacivert üstünde koyu gri kalıyordu) */
  vec2 disari = max(max(uMetin.xy - p, p - uMetin.zw), 0.0);
  float koyu = 1.0 - smoothstep(0.0, 140.0 * uDpr, length(disari));
  renk *= (1.0 - uKarart * koyu) * (1.0 - uDuz);
  renk *= mix(1.0, 0.62, smoothstep(on + 15.0 * uP, uRes.y, p.y));
  renk *= mix(0.55, 1.0, smoothstep(40.0 * uDpr, 150.0 * uDpr, p.y));   /* üst şerit menüsü okunur kalsın */
  gl_FragColor = vec4(renk, 1.0);
}`;

export function dokumaKur(tuval, secenek = {}) {
  const gl = tuval.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) return null;
  /* çizici türü bir kez not edilir: 3B sahneler (gpu.mjs) ikinci bir bağlam açmadan yazılımsal GPU'yu bilsin; GPU adı yazılmaz */
  const bilgi = gl.getExtension('WEBGL_debug_renderer_info');
  if (bilgi) document.documentElement.dataset.cizici = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gl.getParameter(bilgi.UNMASKED_RENDERER_WEBGL)) ? 'yazilim' : 'donanim';
  const derle = (tur, kaynak) => {
    const s = gl.createShader(tur); gl.shaderSource(s, kaynak); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, derle(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, derle(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const tampon = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  U.uDalga = gl.getUniformLocation(prog, 'uDalga');
  const dalgalar = new Float32Array(16);
  let dalgaSira = 0;
  for (const ad of ['uRes', 'uDpr', 'uP', 'uPick', 'uRow', 'uMekik', 'uYon', 'uSerili', 'uTarak', 'uAgiz', 'uZaman', 'uDurt', 'uKarart', 'uKenar', 'uDuz', 'uZemin', 'uIsik', 'uImlec', 'uMaske', 'uMetin']) U[ad] = gl.getUniformLocation(prog, ad);

  /* desen maskesi: "A" harfi (Fraunces), 64×80 */
  const maske = document.createElement('canvas');
  maske.width = 64; maske.height = 80;
  const mc = maske.getContext('2d');
  const doku = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, doku);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  /* maske yazı tipiyle çizilir; Fraunces geç gelirse maskeYenile() desenini yeniden basar */
  function maskeCiz() {
    mc.fillStyle = '#000'; mc.fillRect(0, 0, 64, 80);
    mc.fillStyle = '#fff'; mc.textAlign = 'center'; mc.textBaseline = 'alphabetic';
    mc.font = `600 92px ${secenek.yazi || 'Fraunces, Georgia, serif'}`;
    mc.fillText('A', 32, 76);
    gl.bindTexture(gl.TEXTURE_2D, doku);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, maske);
  }
  maskeCiz();
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uMaske, 0);

  const azHareket = !!secenek.azHareket;
  const CEVRIM = CEVRIM_SN;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let G = 0, Y = 0;
  let pick = 600, faz = 0.9, zaman = 0, son = 0, calisiyor = false, rafId = 0;
  let acilis = azHareket ? 0 : 1;          /* ilk açılışta kumaş hızla sarılarak yerine gelir */
  const isik = { x: 0, y: 0, hx: 0, hy: 0, aktif: false };
  let durt = 0, durtHedef = 0;
  const imlec = { x: -9999, y: -9999 };
  let yavasKare = 0, taban = 0;
  let zemin = 0;                /* 0 dimi 2/1 · 1 bezayağı · 2 panama 2/2 */
  let kenarCss = null;          /* tezgâh ağzının (fell) CSS yüksekliği; null → alttan %20 (en az 150 px) */
  let metin = [0, 0, 0, 0];     /* metin bloğu tuval koordinatında (cihaz pikseli); verilmezse sol %60 */

  function boyutla() {
    const r = tuval.getBoundingClientRect();
    G = Math.max(1, Math.round(r.width * dpr)); Y = Math.max(1, Math.round(r.height * dpr));
    if (tuval.width !== G || tuval.height !== Y) { tuval.width = G; tuval.height = Y; }
    gl.viewport(0, 0, G, Y);
    if (!isik.aktif) { isik.x = isik.hx = G * 0.72; isik.y = isik.hy = Y * 0.32; }
    kenarCss = secenek.kenar ? secenek.kenar() : null;
    const m = secenek.metin?.();
    metin = m ? [(m.left - r.left) * dpr, (m.top - r.top) * dpr, (m.right - r.left) * dpr, (m.bottom - r.top) * dpr] : [0, 0, G * 0.6, Y];
  }

  function ciz() {
    const cssG = G / dpr;
    const P = (cssG < 640 ? 6 : 7) * dpr;
    const kenar = kenarCss != null ? Math.min(Y - 40 * dpr, kenarCss * dpr) : Y - Math.max(150 * dpr, Y * 0.2);
    const c = cevrim(faz);
    const yon = (Math.floor(pick) % 2 === 0) ? 1 : -1;
    const bas = -8 * P, bit = G + 8 * P;
    let mekikX = yon > 0 ? bas + (bit - bas) * c.gecis : bit - (bit - bas) * c.gecis;
    if (faz >= 0.6) mekikX = -1e5;
    const serili = faz >= 0.6 ? (yon > 0 ? 1e6 : -1e6) : mekikX - yon * 5 * P;
    const sarmaAcilis = acilis > 0 ? -38 * (acilis * acilis * (3 - 2 * acilis)) : 0;
    gl.uniform2f(U.uRes, G, Y);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uP, P);
    gl.uniform1f(U.uPick, pick + c.sarma + sarmaAcilis);
    gl.uniform1f(U.uRow, pick);
    gl.uniform1f(U.uMekik, mekikX);
    gl.uniform1f(U.uYon, yon);
    gl.uniform1f(U.uSerili, serili);
    gl.uniform1f(U.uTarak, c.tarak);
    gl.uniform1f(U.uAgiz, c.agizlik);
    gl.uniform1f(U.uZaman, zaman);
    gl.uniform1f(U.uDurt, durt);
    gl.uniform1f(U.uKarart, cssG < 900 ? 0.3 : 0.58);
    gl.uniform4f(U.uMetin, metin[0], metin[1], metin[2], metin[3]);
    gl.uniform1f(U.uDuz, cssG < 640 ? 0.28 : 0);
    gl.uniform1f(U.uZemin, zemin);
    gl.uniform1f(U.uKenar, kenar);
    gl.uniform3f(U.uIsik, isik.x, isik.y, 300 * dpr);
    gl.uniform2f(U.uImlec, imlec.x, imlec.y);
    gl.uniform4fv(U.uDalga, dalgalar);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function kare(t) {
    rafId = 0;
    if (!calisiyor) return;
    const dt = son ? Math.min((t - son) / 1000, 0.05) : 0.016;
    son = t;
    zaman += dt;
    if (acilis > 0) acilis = Math.max(0, acilis - dt / 1.6);
    faz += dt / CEVRIM;
    if (faz >= 1) { faz -= 1; pick += 1; secenek.atki?.(); }
    if (!isik.aktif) {                         /* boşta ışık yavaşça dolaşır */
      isik.hx = G * (0.66 + 0.18 * Math.sin(zaman * 0.23));
      isik.hy = Y * (0.34 + 0.16 * Math.sin(zaman * 0.31 + 1.2));
    }
    const k = 1 - Math.exp(-dt * 6);
    isik.x += (isik.hx - isik.x) * k; isik.y += (isik.hy - isik.y) * k;
    durt += (durtHedef - durt) * (1 - Math.exp(-dt * 5));
    for (let k = 0; k < 4; k++) if (dalgalar[k * 4 + 3] > 0) { dalgalar[k * 4 + 2] += dt; if (dalgalar[k * 4 + 2] > 2.4) dalgalar[k * 4 + 3] = 0; }
    ciz();
    /* uyarlamalı çözünürlük: kare süresi, ekranın kendi kare aralığının (taban, yavaşça izlenir)
       1,5 katını sürekli aşarsa piksel yoğunluğunu düşür. 30 Hz ekran kendi başına yavaş sayılmaz. */
    taban = taban ? Math.min(dt, taban * 1.002) : dt;
    if (dt > taban * 1.5) yavasKare++; else yavasKare = Math.max(0, yavasKare - 1);
    if (yavasKare > 40 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); yavasKare = 0; boyutla(); ciz(); }
    rafId = requestAnimationFrame(kare);
  }

  function baslat() {
    if (azHareket) { ciz(); return; }
    if (calisiyor) return;
    calisiyor = true; son = 0;
    rafId = requestAnimationFrame(kare);
  }
  function durdur() { calisiyor = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  const kap = secenek.olayKabi || tuval;
  const konum = (e) => {
    const r = tuval.getBoundingClientRect();
    return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
  };
  kap.addEventListener('pointermove', (e) => {
    const [x, y] = konum(e);
    isik.aktif = true; isik.hx = x; isik.hy = y;
    imlec.x = x; imlec.y = y;
    durtHedef = e.pointerType === 'mouse' ? 1 : 0.6;
    if (azHareket) { isik.x = x; isik.y = y; durt = 0; ciz(); }
  }, { passive: true });
  kap.addEventListener('pointerleave', () => { isik.aktif = false; durtHedef = 0; });
  /* kumaşa tıklama → dalga (bağlantı ve düğmelerde değil) */
  kap.addEventListener('pointerdown', (e) => {
    if (azHareket || e.target.closest('a, button')) return;
    const [x, y] = konum(e);
    const k = dalgaSira++ % 4;
    dalgalar.set([x, y, 0, 1], k * 4);
  });

  boyutla();
  ciz();
  const ro = new ResizeObserver(() => { boyutla(); ciz(); });
  ro.observe(tuval);
  for (const e of secenek.metinOgeleri || []) ro.observe(e);     /* yazı tipi gelince başlık yeniden dizilir: metin kutusu güncellenir */
  /* GPU sıfırlanırsa: döngü durur, CSS zemini görünür; bağlam geri gelince sayfa yenilenmeden yeniden kurulmaz */
  tuval.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); durdur(); tuval.classList.remove('hazir');
    const orgu = document.getElementById('kunye-orgu'); if (orgu) orgu.disabled = true;
  });
  const yenile = () => { boyutla(); ciz(); };
  const zeminSec = (z) => { zemin = z; ciz(); };
  const maskeYenile = () => { maskeCiz(); ciz(); };
  return { baslat, durdur, yenile, zeminSec, maskeYenile };
}
