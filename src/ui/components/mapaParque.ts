/**
 * DESENHOS DO MAPA DO PARQUE (seção 5.2 do prompt de 16/10).
 *
 * O documento pede um "mapa ilustrado do parque com caminhos e atrações reconhecíveis"
 * e que o "ícone de cada aventura represente o seu brinquedo ou ambiente". Antes o mapa
 * era um degradê com emoji espalhado e todos os nós usavam o mesmo cadeado cinza.
 *
 * Tudo é SVG desenhado em código: nenhum arquivo de imagem, nenhuma fase carregada.
 * Quando a arte de produção chegar (seção 12), estes desenhos saem daqui e nada mais
 * no mapa precisa mudar.
 */

const NS = 'http://www.w3.org/2000/svg';

/** Qual ambiente do parque representa cada aventura. */
export type CenaMapa = 'brinquedao' | 'brinquedoteca' | 'espacial' | 'escorregador' | 'arena';

// Sobre o fundo escuro da bolinha, o verde do parque e a rede preta sumiriam: estes
// são os mesmos elementos, clareados o suficiente para ler em 70 px de tela.
const ESTRUTURA = '#bfe3c6';
const REDE = '#8d93a8';

const ATRACOES: Record<CenaMapa, string> = {
  // Brinquedão: estrutura verde, rede e o escorregador amarelo.
  brinquedao:
    '<rect x="14" y="18" width="72" height="11" rx="5.5" fill="' + ESTRUTURA + '"/>' +
    '<rect x="14" y="29" width="11" height="54" rx="5" fill="' + ESTRUTURA + '"/>' +
    '<rect x="75" y="29" width="11" height="54" rx="5" fill="' + ESTRUTURA + '"/>' +
    '<rect x="25" y="31" width="50" height="46" fill="url(#mapaRede)"/>' +
    '<path d="M66 44 C 66 64, 54 72, 42 80" stroke="#ffc61a" stroke-width="13" fill="none" stroke-linecap="round"/>' +
    '<rect x="8" y="83" width="84" height="10" rx="5" fill="#efedf6"/>',
  // Brinquedoteca: mesa roxa, brinquedos e livros em pé.
  brinquedoteca:
    '<rect x="22" y="22" width="16" height="30" rx="3" fill="#ff3d9a"/>' +
    '<rect x="41" y="30" width="16" height="22" rx="3" fill="#2bc7e8"/>' +
    '<rect x="60" y="18" width="16" height="34" rx="3" fill="#ffd60a"/>' +
    '<rect x="10" y="52" width="80" height="14" rx="7" fill="#9a4fd6"/>' +
    '<rect x="20" y="66" width="12" height="26" rx="6" fill="#7b2cff"/>' +
    '<rect x="68" y="66" width="12" height="26" rx="6" fill="#7b2cff"/>' +
    '<circle cx="50" cy="79" r="11" fill="#39e07a"/>',
  // Circuito espacial: planeta com anel e as plataformas suspensas.
  espacial:
    '<circle cx="50" cy="38" r="23" fill="#ffb13d"/>' +
    '<ellipse cx="50" cy="38" rx="37" ry="10" fill="none" stroke="#ffe7a8" stroke-width="6" transform="rotate(-18 50 38)"/>' +
    '<circle cx="18" cy="16" r="4" fill="#ffffff"/>' +
    '<circle cx="84" cy="20" r="3" fill="#ffffff"/>' +
    '<rect x="10" y="72" width="34" height="12" rx="6" fill="' + ESTRUTURA + '"/>' +
    '<rect x="56" y="84" width="34" height="12" rx="6" fill="' + ESTRUTURA + '"/>',
  // Percurso: os dois escorregadores paralelos, azul e amarelo.
  escorregador:
    '<rect x="14" y="16" width="54" height="11" rx="5.5" fill="' + ESTRUTURA + '"/>' +
    '<path d="M28 27 C 28 56, 22 70, 12 86" stroke="#2f6fd0" stroke-width="16" fill="none" stroke-linecap="round"/>' +
    '<path d="M54 27 C 54 56, 48 70, 38 86" stroke="#ffc61a" stroke-width="16" fill="none" stroke-linecap="round"/>' +
    '<circle cx="78" cy="56" r="10" fill="#ff3d9a"/>' +
    '<circle cx="86" cy="76" r="7" fill="#39e07a"/>',
  // Arena neon: piso colorido e o emblema da equipe.
  arena:
    '<rect x="10" y="40" width="37" height="26" rx="5" fill="#ff2d6f"/>' +
    '<rect x="53" y="40" width="37" height="26" rx="5" fill="#2bc7e8"/>' +
    '<rect x="10" y="70" width="37" height="24" rx="5" fill="#ffd60a"/>' +
    '<rect x="53" y="70" width="37" height="24" rx="5" fill="#39ff88"/>' +
    '<path d="M50 6 L57 24 L76 26 L62 38 L66 56 L50 46 L34 56 L38 38 L24 26 L43 24 Z" fill="#39ff88"/>',
};

/** O ícone de uma aventura: o brinquedo dela, não um cadeado genérico. */
export function atracaoSvg(cena: CenaMapa): SVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'atracao');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<defs><pattern id="mapaRede" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    `<path d="M0 0 V8 M0 0 H8" stroke="${REDE}" stroke-width="2" fill="none" opacity="0.8"/></pattern></defs>` +
    ATRACOES[cena];
  return svg;
}

/**
 * O chão do parque por trás da trilha: piso claro, tapetes coloridos de cada setor e
 * os respingos neon das paredes. Fica atrás de tudo e não recebe toque.
 */
export function fundoDoParque(altura: number): SVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 100 ${altura}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'map-parque');
  svg.setAttribute('aria-hidden', 'true');

  const add = (tag: string, attrs: Record<string, string | number>) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    svg.appendChild(n);
  };

  add('rect', { x: 0, y: 0, width: 100, height: altura, fill: '#efedf6' });
  // Tapetes dos setores, alternando os lados ao longo da subida.
  const tapetes = ['#d9e9ff', '#ffe3f2', '#e2fbe8', '#fff3cf', '#e9e0ff'];
  for (let i = 0; i < Math.ceil(altura / 150); i++) {
    add('rect', {
      x: i % 2 ? 4 : 42,
      y: 40 + i * 150,
      width: 54,
      height: 110,
      rx: 10,
      fill: tapetes[i % tapetes.length],
    });
  }
  // Respingos de tinta fluorescente, como nas paredes do parque.
  const cores = ['#ff2d6f', '#2bc7e8', '#ffd60a', '#39e07a', '#7b2cff'];
  for (let i = 0; i < Math.round(altura / 45); i++) {
    const s = (i * 9301 + 49297) % 233280;
    // Quadradinhos e não círculos: este SVG é ESTICADO para preencher a largura, e um
    // círculo aqui viraria uma elipse achatada.
    const lado = 2 + ((i * 7) % 4) * 0.8;
    add('rect', {
      x: 4 + (s / 233280) * 92,
      y: 20 + ((i * 97) % Math.max(1, altura - 40)),
      width: lado,
      height: lado,
      rx: lado / 3,
      fill: cores[i % cores.length],
      opacity: 0.35,
    });
  }
  return svg;
}

/**
 * Brinquedos espalhados pelo caminho. Ficam em elementos próprios, e não dentro do
 * fundo esticado, para a piscina de bolinhas continuar redonda em qualquer largura.
 */
export function propsDoParque(altura: number): { el: SVGElement; x: number; y: number }[] {
  const bolinhas = ['#ff3d9a', '#ffd60a', '#2bc7e8', '#39e07a', '#ff8a00', '#7b2cff'];
  const out: { el: SVGElement; x: number; y: number }[] = [];
  const svg = (inner: string) => {
    const n = document.createElementNS(NS, 'svg');
    n.setAttribute('viewBox', '0 0 100 64');
    n.setAttribute('class', 'map-prop');
    n.setAttribute('aria-hidden', 'true');
    n.innerHTML = inner;
    return n;
  };
  for (let i = 0; i < Math.ceil(altura / 150); i++) {
    const x = i % 2 ? 76 : 24;
    const y = 90 + i * 150;
    if (i % 3 === 0) {
      let inner = '<rect x="4" y="18" width="92" height="42" rx="10" fill="#2a1f5e"/>';
      for (let k = 0; k < 18; k++) {
        inner += `<circle cx="${12 + (k % 6) * 15.5}" cy="${28 + Math.floor(k / 6) * 13}" r="6.5" fill="${bolinhas[(k + i) % bolinhas.length]}"/>`;
      }
      out.push({ el: svg(inner), x, y });
    } else if (i % 3 === 1) {
      out.push({
        el: svg(
          '<rect x="16" y="6" width="56" height="9" rx="4.5" fill="#bfe3c6"/>' +
            '<path d="M28 15 C 28 36, 22 46, 12 58" stroke="#2f6fd0" stroke-width="13" fill="none" stroke-linecap="round"/>' +
            '<path d="M58 15 C 58 36, 52 46, 42 58" stroke="#ffc61a" stroke-width="13" fill="none" stroke-linecap="round"/>',
        ),
        x,
        y,
      });
    } else {
      const d = 'M8 14 C 62 14, 76 30, 76 58';
      out.push({
        el: svg(
          `<path d="${d}" stroke="#3fae5a" stroke-width="18" fill="none" stroke-linecap="round"/>` +
            `<path d="${d}" stroke="#79d98f" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.75"/>`,
        ),
        x,
        y,
      });
    }
  }
  return out;
}
