import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles/main.css';
import { GameManager } from './core/GameManager';

/** Ponto de entrada do Divertiland. */
async function boot() {
  const app = document.getElementById('app')!;
  const game = new GameManager(app);
  if (import.meta.env.DEV) {
    const { installDevTools } = await import('./dev/DevTools');
    installDevTools(game);
  }
  await document.fonts?.ready;
  await game.start();
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('app');
  if (el) el.innerHTML = '<div style="color:#fff;font:24px sans-serif;padding:40px;text-align:center">Ops! Algo deu errado ao abrir o jogo. Recarregue a página. 🔄</div>';
});
