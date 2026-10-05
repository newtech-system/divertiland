import { clamp } from '../core/util';

export type ButtonAction = 'jump' | 'interact' | 'pause' | 'left' | 'right' | 'up' | 'down' | 'hint';
export type InputDevice = 'keyboard' | 'touch' | 'gamepad';

/** Estado de entrada já traduzido em AÇÕES — o gameplay nunca lê teclas diretamente. */
export interface InputState {
  /** Movimento: x = direita, y = frente. Magnitude 0..1. */
  moveX: number;
  moveY: number;
  /** Rotação de câmera acumulada neste quadro (unidades ~pixels). */
  lookX: number;
  lookY: number;
  zoom: number;
  sprint: boolean;
  jumpHeld: boolean;
  /** Botões apertados NESTE quadro (borda de subida). */
  pressed: Set<ButtonAction>;
}

const KEY_MAP: Record<string, ButtonAction[]> = {
  Space: ['jump'],
  KeyE: ['interact'],
  Enter: ['interact'],
  KeyF: ['interact'],
  Escape: ['pause'],
  KeyP: ['pause'],
  KeyH: ['hint'],
  ArrowLeft: ['left'],
  KeyA: ['left'],
  ArrowRight: ['right'],
  KeyD: ['right'],
  ArrowUp: ['up'],
  KeyW: ['up'],
  ArrowDown: ['down'],
  KeyS: ['down'],
};

/**
 * InputManager (seção 30): teclado, mouse, toque (via TouchControls) e gamepad
 * convergem para o mesmo conjunto de ações.
 */
export class InputManager {
  readonly state: InputState = {
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    zoom: 0,
    sprint: false,
    jumpHeld: false,
    pressed: new Set(),
  };
  lastDevice: InputDevice = 'keyboard';
  /** Quando false (ex.: menu aberto) o gameplay recebe estado neutro. */
  enabled = true;
  cameraSensitivity = 1;
  invertY = false;

  private keys = new Set<string>();
  private pendingPressed = new Set<ButtonAction>();
  private look = { x: 0, y: 0 };
  private zoomAccum = 0;
  private virtualMove = { x: 0, y: 0 };
  private virtualJump = false;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private gamepadPrev = new Set<number>();
  private listeners: [EventTarget, string, EventListener, any?][] = [];
  onDeviceChange?: (d: InputDevice) => void;

  attach(canvas: HTMLElement): void {
    const on = (t: EventTarget, ev: string, fn: (e: any) => void, opts?: any) => {
      t.addEventListener(ev, fn, opts);
      this.listeners.push([t, ev, fn, opts]);
    };
    on(window, 'keydown', (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      this.setDevice('keyboard');
      if (!this.keys.has(e.code)) for (const a of KEY_MAP[e.code] ?? []) this.pendingPressed.add(a);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    on(window, 'blur', () => {
      this.keys.clear();
      this.dragging = false;
    });
    on(canvas, 'pointerdown', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      this.setDevice('keyboard');
      this.dragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    on(window, 'pointermove', (e: PointerEvent) => {
      if (!this.dragging || e.pointerType !== 'mouse') return;
      this.addLook(e.clientX - this.lastPointer.x, e.clientY - this.lastPointer.y);
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    on(window, 'pointerup', () => (this.dragging = false));
    on(canvas, 'wheel', (e: WheelEvent) => {
      this.zoomAccum += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    on(canvas, 'contextmenu', (e: Event) => e.preventDefault());
    on(window, 'touchstart', () => this.setDevice('touch'), { passive: true });
  }

  detach(): void {
    for (const [t, ev, fn, opts] of this.listeners) t.removeEventListener(ev, fn, opts);
    this.listeners = [];
  }

  private setDevice(d: InputDevice) {
    if (this.lastDevice !== d) {
      this.lastDevice = d;
      this.onDeviceChange?.(d);
    }
  }

  // ---------- API para controles virtuais (toque) ----------
  setVirtualMove(x: number, y: number): void {
    this.virtualMove.x = clamp(x, -1, 1);
    this.virtualMove.y = clamp(y, -1, 1);
  }
  addLook(dx: number, dy: number): void {
    this.look.x += dx;
    this.look.y += dy;
  }
  press(action: ButtonAction): void {
    this.pendingPressed.add(action);
    if (action === 'jump') this.virtualJump = true;
  }
  release(action: ButtonAction): void {
    if (action === 'jump') this.virtualJump = false;
  }

  /** Limpa tudo (ao trocar de tela, pausar etc.). */
  reset(): void {
    this.keys.clear();
    this.pendingPressed.clear();
    this.look = { x: 0, y: 0 };
    this.zoomAccum = 0;
    this.virtualMove = { x: 0, y: 0 };
    this.virtualJump = false;
  }

  /** Chamado uma vez por quadro, antes do gameplay. */
  update(): void {
    const s = this.state;
    s.pressed = this.pendingPressed;
    this.pendingPressed = new Set();
    const k = (c: string) => this.keys.has(c);
    let mx = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0);
    let my = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
    if (mx !== 0 && my !== 0) {
      mx *= Math.SQRT1_2;
      my *= Math.SQRT1_2;
    }
    if (Math.abs(this.virtualMove.x) + Math.abs(this.virtualMove.y) > 0.01) {
      mx = this.virtualMove.x;
      my = this.virtualMove.y;
    }
    let lookX = this.look.x;
    let lookY = this.look.y;
    // Teclas Q/E não: E é interação. Usamos J/L e I/K como alternativa de câmera no teclado.
    lookX += ((k('KeyL') ? 1 : 0) - (k('KeyJ') ? 1 : 0)) * 9;
    lookY += ((k('KeyK') ? 1 : 0) - (k('KeyI') ? 1 : 0)) * 6;
    let jumpHeld = k('Space') || this.virtualJump;
    let sprint = k('ShiftLeft') || k('ShiftRight');

    // Gamepad
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      const gx = dz(gp.axes[0] ?? 0);
      const gy = dz(gp.axes[1] ?? 0);
      if (gx || gy) {
        mx = gx;
        my = -gy;
        this.setDevice('gamepad');
      }
      lookX += dz(gp.axes[2] ?? 0) * 14;
      lookY += dz(gp.axes[3] ?? 0) * 10;
      const now = new Set<number>();
      gp.buttons.forEach((b, i) => b.pressed && now.add(i));
      const edge = (i: number, a: ButtonAction) => now.has(i) && !this.gamepadPrev.has(i) && s.pressed.add(a);
      edge(0, 'jump');
      edge(2, 'interact');
      edge(9, 'pause');
      edge(14, 'left');
      edge(15, 'right');
      edge(12, 'up');
      edge(13, 'down');
      if (now.has(0)) jumpHeld = true;
      if (now.has(7) || now.has(5)) sprint = true;
      if (now.size) this.setDevice('gamepad');
      this.gamepadPrev = now;
      break;
    }

    const sens = this.cameraSensitivity;
    s.moveX = mx;
    s.moveY = my;
    s.lookX = lookX * sens;
    s.lookY = lookY * sens * (this.invertY ? -1 : 1);
    s.zoom = this.zoomAccum;
    s.jumpHeld = jumpHeld;
    s.sprint = sprint;
    this.look = { x: 0, y: 0 };
    this.zoomAccum = 0;

    if (!this.enabled) {
      s.moveX = s.moveY = s.lookX = s.lookY = s.zoom = 0;
      s.jumpHeld = s.sprint = false;
      // Mantém só "pause" para poder sair de menus com Esc.
      const keepPause = s.pressed.has('pause');
      s.pressed = new Set(keepPause ? ['pause'] : []);
    }
  }
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
