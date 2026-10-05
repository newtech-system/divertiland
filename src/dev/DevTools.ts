import type { GameManager } from '../core/GameManager';
import { getLogHistory } from '../core/Logger';
import type { DifficultyId } from '../core/types';
import { ALL_LEVELS } from '../data/worlds';
import { ProgressionManager } from '../systems/ProgressionManager';
import { h } from '../ui/dom';
import { QA_ROUTES } from './qaRoutes';

/**
 * FERRAMENTAS DE DESENVOLVIMENTO (seção 47) — só existem no modo dev (`npm run dev`);
 * o build de produção nem inclui este arquivo.
 * Abrir/fechar: tecla F2 ou ` (crase).
 */
export function installDevTools(game: GameManager) {
  const badge = h('div', { class: 'dev-badge' }, 'DEV • F2');
  const fps = h('span', { class: 'fps' }, '-- fps');
  const panel = h('div', { class: 'devtools', style: 'display:none' });
  document.body.append(badge, panel);
  let diff: DifficultyId = 'monkey';

  const button = (label: string, fn: () => void) => h('button', { onclick: () => (fn(), render()) }, label);

  const render = () => {
    const s = game.services;
    const level = game.level as any;
    const levelSel = h('select', null, ...ALL_LEVELS.map((l) => h('option', { value: l.id }, `${l.id} ${l.name}${game.canPlay(l.id) ? '' : ' (🚧)'}`))) as HTMLSelectElement;
    const diffSel = h('select', { onchange: (e: Event) => (diff = (e.target as HTMLSelectElement).value as DifficultyId) }, ...['sloth', 'monkey', 'jaguar'].map((d) => h('option', { value: d, selected: d === diff }, d))) as HTMLSelectElement;
    panel.replaceChildren(
      h('div', null, '🛠️ Divertiland DEV  ', fps),
      h('div', null, `estado: ${game.state} • save: ${s.save.loadSource}`),
      h('h4', null, 'Fases'),
      levelSel,
      diffSel,
      button('▶ Jogar', () => {
        if (!s.profiles.active) return;
        void game.startLevel(levelSel.value, diff, false);
      }),
      button(ProgressionManager.devUnlockAll ? '🔓 Desbloqueio: ON' : '🔒 Desbloquear tudo', () => {
        ProgressionManager.devUnlockAll = !ProgressionManager.devUnlockAll;
        if (game.state === 'map') game.goMap();
      }),
      h('h4', null, 'Economia'),
      button('+100 🪙', () => s.currency.earn(100, 'dev')),
      button('+1000 🪙', () => s.currency.earn(1000, 'dev')),
      button('Recarregar mapa', () => game.state === 'map' && game.goMap()),
      ...(level?.dev
        ? [
            h('h4', null, 'Fase atual'),
            ...level.dev.checkpoints().map((id: string) => button(`🚩 ${id}`, () => level.dev.teleportTo(id))),
            h('br'),
            button('Colisões', () => level.dev.toggleColliders()),
            button('Pegar tudo', () => level.dev.collectAll()),
            button('Concluir ⭐', () => level.dev.complete(1)),
            button('⭐⭐', () => level.dev.complete(2)),
            button('⭐⭐⭐', () => level.dev.complete(3)),
          ]
        : []),
      h('h4', null, 'Save'),
      button('💾 Salvar agora', () => void s.save.flush()),
      button('📋 Save no console', () => console.log(s.save.exportJson())),
      button('🧨 Apagar tudo', () => {
        if (confirm('Apagar TODO o progresso?')) void s.save.reset().then(() => game.goTitle());
      }),
      h('h4', null, 'Log'),
      h('div', { style: 'font-size:11px;opacity:.8;max-height:120px;overflow:auto' }, ...getLogHistory().slice(-8).map((l) => h('div', null, `[${l.scope}] ${l.msg}`))),
    );
  };

  const toggle = () => {
    const show = panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    if (show) render();
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2' || e.code === 'Backquote') {
      e.preventDefault();
      toggle();
    }
  });
  badge.style.pointerEvents = 'auto';
  badge.addEventListener('click', toggle);
  setInterval(() => {
    fps.textContent = `${Math.round(game.fps)} fps`;
    badge.textContent = `DEV • ${Math.round(game.fps)} fps • F2`;
  }, 500);
  // Acesso para testes automáticos no navegador.
  (window as any).__DL = game;
  (window as any).sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  (window as any).__routes = QA_ROUTES;
  /** QA: roda todas as rotas em todos os estilos e devolve um relatório. */
  (window as any).__qaAll = async (diffs: DifficultyId[] = ['sloth', 'monkey', 'jaguar']) => {
    const report: Record<string, unknown> = {};
    for (const [id, route] of Object.entries(QA_ROUTES)) {
      for (const d of diffs) {
        const r = await (window as any).__runRoute(id, d, route, 400);
        report[`${id}/${d}`] = { fin: r.fin, t: r.t, falls: r.falls.length, coins: r.coins, idx: r.idx };
      }
    }
    game.goMap();
    return report;
  };
  /** QA: joga uma fase 3D inteira com o piloto automático seguindo a rota. */
  (window as any).__runRoute = async (id: string, diff: DifficultyId, route: unknown[], maxSec = 300) => {
    await game.startLevel(id, diff, false);
    game.closePause();
    const L = game.level as any;
    L.dev.autopilot(route);
    let t = 0;
    let lastF = 0;
    const falls: number[][] = [];
    while (t < maxSec && !L.dev.state().finished) {
      (window as any).__sim(0.25, []);
      t += 0.25;
      const s = L.dev.state();
      if (s.falls > lastF) {
        lastF = s.falls;
        falls.push([L.dev.autoStatus().index, +s.pos.x.toFixed(1), +s.pos.y.toFixed(1), +s.pos.z.toFixed(1)]);
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    const s = L.dev.state();
    return {
      t,
      fin: s.finished,
      falls,
      coins: `${s.coins}/${s.total}`,
      collectibles: s.teddies,
      secrets: s.secrets,
      idx: `${L.dev.autoStatus().index}/${route.length}`,
      pos: [s.pos.x, s.pos.y, s.pos.z].map((v: number) => +v.toFixed(1)),
      log: L.dev.autoStatus().log,
    };
  };
  /**
   * Simulação determinística para testes: segura as teclas `codes` por `seconds`
   * avançando o jogo em passos de 1/60 s (independe da aba estar visível).
   */
  (window as any).__sim = (seconds: number, codes: string[] = [], opts: { look?: number; each?: () => void } = {}) => {
    game.closePause();
    for (const c of codes) window.dispatchEvent(new KeyboardEvent('keydown', { code: c }));
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
      if (opts.look) game.input.addLook(opts.look, 0);
      game.input.update();
      opts.each?.();
      game.level?.update(1 / 60);
    }
    for (const c of codes) window.dispatchEvent(new KeyboardEvent('keyup', { code: c }));
    game.input.update();
    game.level?.render();
    return (game.level as any)?.dev?.state?.();
  };
}
