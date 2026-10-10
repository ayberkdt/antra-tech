/* GPU — 3B sahneler (three.js, ~190 kB gzip) yüklenmeden önce donanım hızlandırmalı WebGL var mı? Tek kullanımlık küçük bir
 * bağlam açar, çizici adını okur, kapatır. Yazılımsal çizici (SwiftShader, llvmpipe, Microsoft Basic Render) ya da WebGL yoksa
 * false: three.js hiç indirilmez, 2B yedek çizilir. ?webgl=1 zorlar (ekran görüntüsü araçları), ?webgl=0 kapatır. */
let sonuc = null;
export function donanimGpu() {
  if (sonuc !== null) return sonuc;
  const prm = new URLSearchParams(location.search).get('webgl');
  if (prm === '0') return (sonuc = false);
  if (prm === '1') return (sonuc = true);
  /* kahramandaki tezgâh bağlamı çizici türünü yazdıysa ikinci bağlam açılmaz (yazılımsal GPU'da bağlam açmak pahalı) */
  const not = document.documentElement.dataset.cizici;
  if (not) return (sonuc = not === 'donanim');
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return (sonuc = false);
    const bilgi = gl.getExtension('WEBGL_debug_renderer_info');
    const ad = bilgi ? String(gl.getParameter(bilgi.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    sonuc = !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(ad);
  } catch { sonuc = false; }
  return sonuc;
}
