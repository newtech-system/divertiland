import type { GameManager } from '../core/GameManager';

/**
 * QA DE ENCAIXE NA TELA (só desenvolvimento).
 * Procura botões/controles que a criança NÃO consegue alcançar no tamanho de tela atual —
 * seja porque ficaram fora da área visível, seja porque um "corte" (overflow hidden) escondeu.
 * Rodar no console: `__fitCheck()` ou `await __fitAll()` (percorre todas as telas).
 */

const SELECTOR = [
  '#ui button',
  '#ui .btn',
  '#ui input',
  '#ui .map-node',
  '#ui .map-chest',
  '#ui .char-btn',
  '#ui .diff-btn',
  '#ui .item-card',
  '#ui .profile-card',
  '#ui .find-slot',
  '#ui .simon-btn',
  '#ui .shape-piece',
  '#ui .shape-hole',
  '#ui .pattern-opt',
  '#ui .touch-btn',
  '#ui .hud-prompt',
].join(',');

export interface FitProblem {
  label: string;
  reason: string;
  rect: [number, number, number, number];
}

function canScroll(el: Element, axis: 'x' | 'y'): boolean {
  const st = getComputedStyle(el);
  const ov = axis === 'y' ? st.overflowY : st.overflowX;
  if (ov !== 'auto' && ov !== 'scroll') return false;
  return axis === 'y' ? el.scrollHeight > el.clientHeight + 2 : el.scrollWidth > el.clientWidth + 2;
}

/**
 * Área realmente visível do elemento: começa no retângulo dele e vai sendo cortada por cada
 * ancestral que esconde o que passa do limite. Ancestrais que ROLAM não cortam (a criança
 * consegue rolar até lá).
 */
function visibleBox(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  let box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  let scrollableX = false;
  let scrollableY = false;
  let p = el.parentElement;
  while (p && p !== document.body) {
    const st = getComputedStyle(p);
    const clipsY = st.overflowY === 'hidden' || st.overflowY === 'clip';
    const clipsX = st.overflowX === 'hidden' || st.overflowX === 'clip';
    if (canScroll(p, 'y')) scrollableY = true;
    if (canScroll(p, 'x')) scrollableX = true;
    if (clipsY || clipsX) {
      const pr = p.getBoundingClientRect();
      if (clipsY && !scrollableY) {
        box.top = Math.max(box.top, pr.top);
        box.bottom = Math.min(box.bottom, pr.bottom);
      }
      if (clipsX && !scrollableX) {
        box.left = Math.max(box.left, pr.left);
        box.right = Math.min(box.right, pr.right);
      }
    }
    p = p.parentElement;
  }
  // A janela também corta — a não ser que dê para rolar até o elemento.
  const W = window.innerWidth;
  const H = window.innerHeight;
  if (!scrollableY) {
    box.top = Math.max(box.top, 0);
    box.bottom = Math.min(box.bottom, H);
  }
  if (!scrollableX) {
    box.left = Math.max(box.left, 0);
    box.right = Math.min(box.right, W);
  }
  return { box, r, scrollableX, scrollableY };
}

/** Checa a tela atual. `minTouch` = tamanho mínimo confortável para dedo de criança. */
export function fitCheck(minTouch = 40): { W: number; H: number; problems: FitProblem[] } {
  // Com a aba oculta as animações ficam paradas no primeiro quadro (ex.: um painel que
  // entra crescendo mediria 85% do tamanho). Terminamos as que têm fim antes de medir.
  for (const a of document.getAnimations()) {
    try {
      const t = a.effect?.getComputedTiming();
      if (t && Number.isFinite(t.endTime ?? Infinity) && Number.isFinite(t.iterations ?? Infinity)) a.finish();
    } catch {
      /* animação infinita: deixa como está */
    }
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  const problems: FitProblem[] = [];
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    const r0 = el.getBoundingClientRect();
    if (r0.width < 1 || r0.height < 1) return;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) < 0.05) return;
    const { box, r } = visibleBox(el);
    const vw = box.right - box.left;
    const vh = box.bottom - box.top;
    const label = (el.getAttribute('aria-label') || el.textContent || el.className || '?').trim().replace(/\s+/g, ' ').slice(0, 26);
    const rect: [number, number, number, number] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    if (vw <= 1 || vh <= 1) {
      problems.push({ label, reason: 'totalmente fora da tela', rect });
      return;
    }
    // Perdeu mais de 35% da altura/largura, ou sobrou pouco para tocar.
    const lostY = 1 - vh / r.height;
    const lostX = 1 - vw / r.width;
    if (lostY > 0.35 || lostX > 0.35) {
      problems.push({ label, reason: `cortado (${Math.round(Math.max(lostX, lostY) * 100)}%)`, rect });
      return;
    }
    if (Math.min(vw, vh) < minTouch) problems.push({ label, reason: `pequeno demais (${Math.round(Math.min(vw, vh))}px)`, rect });
  });
  return { W, H, problems };
}

/**
 * Confere as telas DE JOGO (HUD, controles de toque e os painéis de cada tipo de fase).
 * Usa o perfil que já existe; se não houver, cria um de teste.
 */
export async function fitGame(game: GameManager) {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  window.dispatchEvent(new Event('resize'));
  await wait(60);
  const report: Record<string, FitProblem[]> = {};
  const created = !game.profile;
  if (created) game.services.profiles.create('QA', 'mina', 'monkey');
  const touchBefore = game.settings.touchControls;
  game.updateSettings({ touchControls: 'on' }); // pior caso: joystick + botões na tela

  const levels: [string, string][] = [
    ['w1_l01', 'fase 3D (HUD + controles)'],
    ['w1_l02', 'objetos escondidos'],
    ['w1_l03', 'corrida'],
    ['w1_l04', 'quebra-cabeça'],
  ];
  for (const [id, name] of levels) {
    await game.startLevel(id, 'monkey', false);
    game.closePause();
    await wait(1400);
    const r = fitCheck();
    if (r.problems.length) report[name] = r.problems;
    if (id === 'w1_l01') {
      game.openPause();
      await wait(400);
      const p = fitCheck();
      if (p.problems.length) report['pausa'] = p.problems;
      game.closePause();
    }
  }
  // Tela de resultados (com a fase concluída de mentirinha).
  await game.startLevel('w1_l01', 'monkey', false);
  game.closePause();
  await wait(1200);
  (game.level as any)?.dev?.complete?.(3);
  await wait(3600);
  const res = fitCheck();
  if (res.problems.length) report['resultado'] = res.problems;

  game.updateSettings({ touchControls: touchBefore });
  game.goMap();
  await wait(300);
  return { size: `${window.innerWidth}x${window.innerHeight}`, report };
}

/** Percorre as telas principais e devolve os problemas de cada uma. */
export async function fitAll(game: GameManager) {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // Garante que a medida da tela está atualizada (no navegador de teste, mudar o tamanho
  // emulado nem sempre avisa a página).
  window.dispatchEvent(new Event('resize'));
  await wait(60);
  const click = (t: string) => {
    const b = [...document.querySelectorAll<HTMLElement>('#ui button')].find((x) => (x.textContent || '').includes(t));
    b?.click();
    return !!b;
  };
  const report: Record<string, FitProblem[]> = {};
  const snap = (name: string) => {
    const r = fitCheck();
    if (r.problems.length) report[name] = r.problems;
  };

  // Começa do zero, sem perfil, para passar pela criação.
  const savedProfiles = game.services.save.data.profiles.slice();
  const savedActive = game.services.save.data.activeProfileId;
  game.services.save.data.profiles = [];
  game.services.save.data.activeProfileId = null;

  game.goTitle();
  await wait(400);
  snap('título');
  click('JOGAR');
  await wait(500);
  snap('criar: personagem');
  click('Pronto');
  await wait(400);
  snap('criar: apelido');
  click('Pronto');
  await wait(400);
  snap('criar: dificuldade');
  click('Vamos');
  await wait(1200);
  snap('mapa');

  document.querySelector<HTMLElement>('.map-node')?.click();
  await wait(600);
  snap('cartão da fase');
  game.ui.closeAllModals();

  game.openShop();
  await wait(800);
  snap('loja');
  const card = document.querySelector<HTMLElement>('.item-card');
  card?.click();
  await wait(300);
  snap('loja: item escolhido');

  game.openSettings();
  await wait(400);
  snap('ajustes');
  game.ui.closeAllModals();

  game.goProfiles();
  await wait(400);
  snap('perfis');

  // Restaura o save real
  game.services.save.data.profiles = savedProfiles;
  game.services.save.data.activeProfileId = savedActive;
  game.goMap();
  await wait(300);
  return { size: `${window.innerWidth}x${window.innerHeight}`, report };
}
