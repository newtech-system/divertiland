import type { InputManager } from '../../input/InputManager';
import { h } from '../dom';

/**
 * Controles de toque (seção 30): joystick virtual que aparece onde o dedo encosta (lado
 * esquerdo), arrastar no lado direito gira a câmera e um botão grande de pulo.
 */
export class TouchControls {
  readonly el: HTMLElement;
  private joyBase: HTMLElement;
  private joyKnob: HTMLElement;
  private hint: HTMLElement;
  private moveId: number | null = null;
  private lookId: number | null = null;
  private origin = { x: 0, y: 0 };
  private lastLook = { x: 0, y: 0 };

  constructor(private input: InputManager) {
    this.joyKnob = h('div', { class: 'joy-knob' });
    this.joyBase = h('div', { class: 'joy-base', style: 'display:none' }, this.joyKnob);
    this.hint = h('div', { class: 'joy-hint' }, '🕹️');
    const left = h('div', { class: 'touch-zone', style: 'left:0;width:45%' });
    const right = h('div', { class: 'touch-zone', style: 'right:0;width:55%' });
    const jump = h('div', { class: 'touch-btn jump', 'aria-label': 'Pular' }, '⬆');

    left.addEventListener('pointerdown', (e) => {
      if (this.moveId !== null) return;
      this.moveId = e.pointerId;
      left.setPointerCapture(e.pointerId);
      this.origin = { x: e.clientX, y: e.clientY };
      this.joyBase.style.display = 'block';
      this.joyBase.style.left = `${e.clientX}px`;
      this.joyBase.style.top = `${e.clientY}px`;
      this.hint.style.display = 'none';
      this.setKnob(0, 0);
    });
    left.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.moveId) return;
      const R = 62;
      let dx = e.clientX - this.origin.x;
      let dy = e.clientY - this.origin.y;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      this.setKnob(dx, dy);
      const mag = Math.min(1, len / R);
      const dead = 0.12;
      const k = mag < dead ? 0 : (mag - dead) / (1 - dead) / Math.max(1e-3, Math.min(1, len / R));
      this.input.setVirtualMove((dx / R) * k, (-dy / R) * k);
    });
    const endMove = (e: PointerEvent) => {
      if (e.pointerId !== this.moveId) return;
      this.moveId = null;
      this.joyBase.style.display = 'none';
      this.hint.style.display = '';
      this.input.setVirtualMove(0, 0);
    };
    left.addEventListener('pointerup', endMove);
    left.addEventListener('pointercancel', endMove);

    right.addEventListener('pointerdown', (e) => {
      if (this.lookId !== null) return;
      this.lookId = e.pointerId;
      right.setPointerCapture(e.pointerId);
      this.lastLook = { x: e.clientX, y: e.clientY };
    });
    right.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.input.addLook((e.clientX - this.lastLook.x) * 1.3, (e.clientY - this.lastLook.y) * 1.3);
      this.lastLook = { x: e.clientX, y: e.clientY };
    });
    const endLook = (e: PointerEvent) => {
      if (e.pointerId === this.lookId) this.lookId = null;
    };
    right.addEventListener('pointerup', endLook);
    right.addEventListener('pointercancel', endLook);

    jump.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      jump.setPointerCapture(e.pointerId);
      jump.classList.add('pressed');
      this.input.press('jump');
      try {
        navigator.vibrate?.(10);
      } catch {
        /* ok */
      }
    });
    const endJump = () => {
      jump.classList.remove('pressed');
      this.input.release('jump');
    };
    jump.addEventListener('pointerup', endJump);
    jump.addEventListener('pointercancel', endJump);

    this.el = h('div', { class: 'touch-layer' }, left, right, this.hint, this.joyBase, jump);
  }

  private setKnob(dx: number, dy: number) {
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  reset() {
    this.moveId = null;
    this.lookId = null;
    this.joyBase.style.display = 'none';
    this.input.setVirtualMove(0, 0);
    this.input.release('jump');
  }
}

/**
 * Controles de deslizar (runner): deslizar para os lados troca de faixa, para cima pula,
 * para baixo abaixa. Um toque rápido também pula.
 */
export class SwipeControls {
  readonly el: HTMLElement;
  private start: { x: number; y: number; t: number; id: number } | null = null;
  private fired = false;

  constructor(private input: InputManager) {
    const zone = h('div', { class: 'touch-zone', style: 'left:0;right:0;width:100%' });
    zone.addEventListener('pointerdown', (e) => {
      zone.setPointerCapture(e.pointerId);
      this.start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      this.fired = false;
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this.start || e.pointerId !== this.start.id || this.fired) return;
      const dx = e.clientX - this.start.x;
      const dy = e.clientY - this.start.y;
      if (Math.hypot(dx, dy) < 34) return;
      this.fired = true;
      if (Math.abs(dx) > Math.abs(dy)) this.input.press(dx > 0 ? 'right' : 'left');
      else this.input.press(dy < 0 ? 'up' : 'down');
    });
    const end = (e: PointerEvent) => {
      if (!this.start || e.pointerId !== this.start.id) return;
      if (!this.fired && performance.now() - this.start.t < 300) this.input.press('up');
      this.start = null;
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', () => (this.start = null));
    const hint = h('div', { class: 'swipe-hint' }, '👆 deslize para os lados • para cima pula • para baixo abaixa');
    setTimeout(() => hint.remove(), 6000);
    this.el = h('div', { class: 'touch-layer' }, zone, hint);
  }

  reset() {
    this.start = null;
  }
}
