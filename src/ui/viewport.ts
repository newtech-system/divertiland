/**
 * MEDIDA REAL DA TELA (seção 32: tem que caber em qualquer celular).
 *
 * Em celular não dá para confiar em `100%`/`100vh`: a barra de endereço do navegador fica
 * por cima, o teclado abre, a tela gira. Aqui medimos a área REALMENTE visível
 * (`visualViewport`, quando existe) e publicamos em variáveis CSS que o jogo inteiro usa:
 *
 *   --app-w / --app-h  tamanho da área visível, em px
 *   --app-min          o menor dos dois (base para escalas)
 *
 * Também marcamos o <body> com classes de tamanho, para a interface ficar mais compacta em
 * telas pequenas: `short` (baixa), `tiny` (muito baixa), `narrow` (estreita), `em-pe` (celular em pé).
 */

export interface ViewportSize {
  width: number;
  height: number;
}

type Listener = (size: ViewportSize) => void;

const listeners = new Set<Listener>();
let current: ViewportSize = { width: 1, height: 1 };

function measure(): ViewportSize {
  const vv = window.visualViewport;
  let width = window.innerWidth || document.documentElement.clientWidth || 1;
  let height = window.innerHeight || document.documentElement.clientHeight || 1;
  if (vv) {
    // Com zoom (pinça) a medida visual encolhe de propósito: aí não vale como tamanho da tela.
    const zoomed = Math.abs((vv.scale ?? 1) - 1) > 0.02;
    if (!zoomed) {
      // A menor medida é a que realmente aparece (barra do navegador/teclado por cima).
      width = Math.min(width, Math.round(vv.width));
      height = Math.min(height, Math.round(vv.height));
    }
  }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

function apply() {
  const size = measure();
  if (size.width === current.width && size.height === current.height) return;
  current = size;
  const root = document.documentElement;
  root.style.setProperty('--app-w', `${size.width}px`);
  root.style.setProperty('--app-h', `${size.height}px`);
  root.style.setProperty('--app-min', `${Math.min(size.width, size.height)}px`);
  const b = document.body;
  b.classList.toggle('short', size.height < 560);
  b.classList.toggle('tiny', size.height < 430);
  b.classList.toggle('narrow', size.width < 430);
  // 'em-pe' (e não 'portrait') para não colidir com a classe .portrait dos retratos redondos.
  b.classList.toggle('em-pe', size.height > size.width);
  for (const l of listeners) l(size);
}

let started = false;
let lastPoll = 0;

/** Começa a acompanhar o tamanho da tela. Pode ser chamado mais de uma vez sem problema. */
export function initViewport(): ViewportSize {
  if (!started) {
    started = true;
    const update = () => apply();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', () => {
      update();
      // Alguns celulares só terminam de girar depois de um instante.
      setTimeout(update, 120);
      setTimeout(update, 400);
    });
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    document.addEventListener('visibilitychange', update);
    // Cinto e suspensório: alguns navegadores de celular não avisam em toda mudança
    // (girar a tela, barra que some, teclado). O observador abaixo sempre percebe.
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(document.documentElement);
  }
  apply();
  return current;
}

/**
 * Confere o tamanho de vez em quando (chamado pelo laço do jogo). Última garantia para
 * navegadores que não disparam nenhum aviso ao mudar de tamanho.
 */
export function pollViewport(now = performance.now()): void {
  if (now - lastPoll < 250) return;
  lastPoll = now;
  apply();
}

export function getViewport(): ViewportSize {
  return current;
}

/** Avisa quando o tamanho da tela mudar. Devolve a função para parar de ouvir. */
export function onViewportChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
