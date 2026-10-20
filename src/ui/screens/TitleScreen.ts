import { muralCanvas } from '../../engine/materials';
import { h } from '../dom';
import { Screen } from '../UIManager';
import { btn } from '../components/widgets';

/** Cores das bolinhas da piscina, como nas fotos do parque. */
const BOLINHAS = ['#ff3d9a', '#ffd60a', '#2bc7e8', '#39e07a', '#ff8a00', '#7b2cff'];

/**
 * CENÁRIO DA ABERTURA (seção 5.1 do prompt de 16/10).
 *
 * O documento pede "cenário do parque com profundidade" e manda evitar "emoji
 * espalhado e degradê vazio como composição principal" — que era exatamente o que
 * esta tela tinha. O desenho é feito em SVG e CSS, sem carregar nenhuma fase: abrir
 * o menu continua barato.
 *
 * As camadas, do fundo para a frente: parede escura com a pintura de galáxia (a MESMA
 * do jogo), estrutura verde com redes pretas, tubo verde, escorregadores azul e
 * amarelo, piso claro e piscina de bolinhas.
 */
function cenarioDoParque(): HTMLElement {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  // O desenho é ANCORADO EM BAIXO e usa uma caixa alta (100x180), na proporção de um
  // celular em pé. Com uma caixa quadrada, "slice" cortava as laterais e sobrava só a
  // faixa do meio: os escorregadores e o tubo ficavam fora da tela.
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');

  const el = (tag: string, attrs: Record<string, string | number>) => {
    const n = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    svg.appendChild(n);
    return n;
  };

  // Rede preta: um padrão de losangos entre os postes.
  const defs = document.createElementNS(svgNS, 'defs');
  defs.innerHTML =
    '<pattern id="rede" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<path d="M0 0 V3 M0 0 H3" stroke="#14141c" stroke-width="0.5" fill="none" opacity="0.85"/></pattern>';
  svg.appendChild(defs);

  const ESTRUTURA = '#9fc4a8';
  const PISO_Y = 150;

  // Estrutura verde do brinquedão, com barras acolchoadas claras e rede preta.
  el('rect', { x: 14, y: 62, width: 72, height: 3.2, rx: 1.6, fill: ESTRUTURA });
  el('rect', { x: 16, y: 64, width: 3, height: 86, rx: 1.5, fill: ESTRUTURA });
  el('rect', { x: 81, y: 64, width: 3, height: 86, rx: 1.5, fill: ESTRUTURA });
  el('rect', { x: 48.5, y: 64, width: 2.6, height: 86, rx: 1.3, fill: ESTRUTURA, opacity: 0.85 });
  el('rect', { x: 19, y: 65, width: 29.5, height: 84, fill: 'url(#rede)' });
  el('rect', { x: 51.1, y: 65, width: 30, height: 84, fill: 'url(#rede)' });
  el('rect', { x: 14, y: 104, width: 72, height: 2.6, rx: 1.3, fill: ESTRUTURA });

  // Tubo verde saindo da estrutura para a direita.
  const tubo = 'M84 84 C 94 84, 97 96, 97 112 L 97 150';
  el('path', { d: tubo, stroke: '#3fae5a', 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round' });
  el('path', { d: tubo, stroke: '#79d98f', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', opacity: 0.7 });

  // Os dois escorregadores lado a lado, azul e amarelo, saindo da plataforma.
  el('rect', { x: 2, y: 102, width: 24, height: 2.6, rx: 1.3, fill: ESTRUTURA });
  for (const [x, cor, claro] of [
    [8, '#2f6fd0', '#7fb0ee'],
    [17, '#ffc61a', '#ffe28a'],
  ] as const) {
    const d = `M${x} 104 C ${x} 128, ${x - 3} 140, ${x - 6} ${PISO_Y + 2}`;
    el('path', { d, stroke: cor, 'stroke-width': 7.5, fill: 'none', 'stroke-linecap': 'round' });
    el('path', { d, stroke: claro, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round', opacity: 0.8 });
  }

  // Piso claro e brilhante.
  el('rect', { x: -10, y: PISO_Y, width: 120, height: 40, fill: '#efedf6' });
  el('rect', { x: -10, y: PISO_Y, width: 120, height: 1.2, fill: '#ffffff', opacity: 0.9 });

  // Piscina de bolinhas.
  el('rect', { x: 30, y: PISO_Y + 3, width: 42, height: 18, rx: 3, fill: '#2a1f5e' });
  for (let i = 0; i < 48; i++) {
    const linha = Math.floor(i / 12);
    el('circle', {
      cx: 32.5 + (i % 12) * 3.3 + (linha % 2) * 1.5,
      cy: PISO_Y + 5.5 + linha * 3.4,
      r: 2,
      fill: BOLINHAS[(i * 5 + linha) % BOLINHAS.length],
    });
  }

  const mural = h('img', { class: 'mural', alt: '', src: muralCanvas('espaco', 3).toDataURL('image/png') });
  const parque = h('div', { class: 'parque', 'aria-hidden': 'true' }, h('div', { class: 'parede' }), mural);
  parque.appendChild(svg);
  return parque;
}

/**
 * De pé, a caixa é estreita e alta. Deitado, o "slice" prende a escala pela LARGURA e
 * sobraria só a faixa do piso — por isso a caixa fica mais larga, o que afasta a
 * câmera e devolve a estrutura à tela. Vale para celular deitado e para computador.
 */
function ajustaCaixa(parque: HTMLElement) {
  const svg = parque.querySelector('svg');
  if (!svg) return;
  const emPe = window.innerHeight > window.innerWidth;
  svg.setAttribute('viewBox', emPe ? '0 0 100 180' : '-55 0 210 180');
}

/** Tela inicial. */
export class TitleScreen extends Screen {
  private cenario!: HTMLElement;
  private aoRedimensionar = () => ajustaCaixa(this.cenario);

  onShow() {
    window.addEventListener('resize', this.aoRedimensionar);
    this.aoRedimensionar();
  }

  onHide() {
    window.removeEventListener('resize', this.aoRedimensionar);
  }

  build(): HTMLElement {
    const g = this.game;
    const mascote = (c: 'jhow' | 'mina', lado: string) =>
      h('img', { class: `mascote ${lado}`, alt: c === 'jhow' ? 'Jhow' : 'Mina', src: g.mascotFull(c) });

    const cenario = (this.cenario = cenarioDoParque());
    cenario.append(mascote('jhow', 'esq'), mascote('mina', 'dir'));
    ajustaCaixa(cenario);

    return h(
      'div',
      { class: 'screen title-screen' },
      cenario,
      h(
        'div',
        { class: 'title-frente' },
        h('div', { class: 'logo' }, h('div', { class: 'logo-main' }, 'DIVERTILAND'), h('div', { class: 'logo-sub' }, 'O Mundo da Diversão')),
        btn(g, 'JOGAR', {
          icon: '▶',
          cls: 'big green',
          onClick: () => {
            g.audio.unlock();
            g.afterTitle();
          },
        }),
        btn(g, null, { icon: '⚙️', cls: 'round ghost', aria: 'Ajustes', onClick: () => g.openSettings() }),
      ),
      h('div', { class: 'placeholder-tag' }, 'Versão em desenvolvimento • arte e sons provisórios'),
    );
  }
}
