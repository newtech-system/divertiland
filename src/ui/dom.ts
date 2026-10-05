/** Mini-helper para criar DOM sem framework (mantém o jogo leve e sem dependências). */

type Child = Node | string | number | null | undefined | false;
type Props = {
  class?: string;
  style?: string;
  title?: string;
  onclick?: (e: MouseEvent) => void;
  [key: string]: unknown;
};

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
      else if (k in el && k !== 'list') (el as any)[k] = v;
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: (Child | Child[])[]) {
  for (const c of children) {
    if (Array.isArray(c)) append(el, c);
    else if (c === null || c === undefined || c === false) continue;
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function stars(n: number, max = 3): HTMLElement {
  return h(
    'span',
    { class: 'stars' },
    ...Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'on' : 'off' }, '⭐')),
  );
}

export function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
