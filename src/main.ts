import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles/main.css';
import { GameManager } from './core/GameManager';
import { initViewport } from './ui/viewport';

/** Ponto de entrada do Divertiland. */
async function boot() {
  const app = document.getElementById('app')!;
  initViewport();
  const game = new GameManager(app);
  if (import.meta.env.DEV) {
    const { installDevTools } = await import('./dev/DevTools');
    installDevTools(game);
  }
  await document.fonts?.ready;
  await game.start();
  // Abriu: limpa a marca de tentativa de recuperação.
  try {
    sessionStorage.removeItem('dl_recarregou');
  } catch {
    /* navegador sem sessionStorage: segue o jogo */
  }
}

/**
 * RECUPERAÇÃO DE ABERTURA.
 *
 * Quando uma versão nova é publicada, o navegador pode continuar com o `index.html`
 * antigo em cache e pedir arquivos que já não existem. O jogo não abria e **recarregar
 * não resolvia**, porque o cache devolvia o mesmo HTML antigo — foi o que apareceu no
 * teste da proprietária ("Ops! Algo deu errado... inclusive após um recarregamento").
 *
 * Agora o próprio jogo se recupera: ao falhar por arquivo que não carregou, ele recarrega
 * UMA vez buscando do servidor. Se ainda assim não abrir, mostra o aviso com um botão que
 * faz a mesma coisa — e diz o motivo técnico para quem for olhar.
 */
function recarregarSemCache() {
  const base = location.pathname + '?v=' + Date.now();
  location.replace(base);
}

boot().catch((e) => {
  console.error(e);
  const msg = String((e && (e as Error).message) || e);
  const faltouArquivo = /dynamically imported module|module script failed|Failed to fetch|Loading chunk|ChunkLoadError|404/i.test(msg);
  let jaTentou = false;
  try {
    jaTentou = sessionStorage.getItem('dl_recarregou') === '1';
    if (faltouArquivo && !jaTentou) sessionStorage.setItem('dl_recarregou', '1');
  } catch {
    /* sem sessionStorage: cai no aviso abaixo */
  }
  if (faltouArquivo && !jaTentou) {
    recarregarSemCache();
    return;
  }
  const el = document.getElementById('app');
  if (!el) return;
  el.innerHTML = '';
  const caixa = document.createElement('div');
  caixa.setAttribute(
    'style',
    'color:#fff;font:600 20px/1.4 sans-serif;padding:32px;text-align:center;max-width:520px;margin:0 auto',
  );
  const titulo = document.createElement('div');
  titulo.setAttribute('style', 'font-size:26px;margin-bottom:10px');
  titulo.textContent = 'Ops! O jogo não abriu. 😅';
  const sub = document.createElement('div');
  sub.setAttribute('style', 'opacity:.85;font-size:17px;margin-bottom:18px');
  sub.textContent = 'Toque no botão para buscar a versão mais nova.';
  const botao = document.createElement('button');
  botao.setAttribute(
    'style',
    'font:700 20px sans-serif;padding:14px 26px;border-radius:999px;border:0;background:#39d98a;color:#08331f;cursor:pointer',
  );
  botao.textContent = '🔄 Tentar de novo';
  botao.addEventListener('click', () => {
    try {
      sessionStorage.removeItem('dl_recarregou');
    } catch {
      /* ok */
    }
    recarregarSemCache();
  });
  const detalhe = document.createElement('div');
  detalhe.setAttribute('style', 'opacity:.55;font-size:12px;margin-top:16px;word-break:break-word');
  detalhe.textContent = msg.slice(0, 180);
  caixa.append(titulo, sub, botao, detalhe);
  el.append(caixa);
});
