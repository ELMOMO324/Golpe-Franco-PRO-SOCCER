// Detección de plataforma: PC o móvil (Android, iPhone, iPad). Un solo código: solo cambian los
// controles, la interfaz y la calidad gráfica por defecto. El usuario puede forzar la plataforma
// en Ajustes.

export const PLATAFORMAS = ['auto', 'pc', 'movil'];

/** Detecta la plataforma real del dispositivo. */
export function detectarDispositivo() {
  const ua = (navigator && navigator.userAgent) || '';
  const tactil = ('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0);
  const movilUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  // iPadOS con Safari de escritorio se identifica como Mac, pero tiene pantalla táctil
  const iPadDisfrazado = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  const pantalla = Math.min((window.screen && window.screen.width) || 9999, (window.screen && window.screen.height) || 9999);
  if (movilUA || iPadDisfrazado) return 'movil';
  if (tactil && pantalla < 900) return 'movil';
  return 'pc';
}

/** Plataforma efectiva: la elegida en Ajustes o, si es «auto», la detectada. */
export function plataformaEfectiva(ajuste = 'auto') {
  if (ajuste === 'pc' || ajuste === 'movil') return ajuste;
  return detectarDispositivo();
}

/** Marca el documento para que el CSS adapte la interfaz (clase «movil» o «pc»). */
export function aplicarPlataforma(plataforma) {
  const html = document.documentElement;
  html.classList.toggle('movil', plataforma === 'movil');
  html.classList.toggle('pc', plataforma !== 'movil');
}
