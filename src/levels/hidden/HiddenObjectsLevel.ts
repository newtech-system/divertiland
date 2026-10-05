import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../../core/util';
import type { CharacterId } from '../../core/types';
import { CHARACTERS } from '../../data/characters';
import { ECONOMY } from '../../data/economy';
import { ProceduralAnimator } from '../../engine/character/AnimationController';
import { CharacterModel } from '../../engine/character/CharacterModel';
import { defaultLook, otherCharacter } from '../../engine/character/looks';
import { FX_COLORS, Particles } from '../../engine/fx/Particles';
import { checkerTexture, textTexture, toon } from '../../engine/materials';
import { makeProp } from '../../engine/props/Props';
import type { LevelRunResult } from '../../systems/LevelResult';
import { h } from '../../ui/dom';
import { goldenTeddy } from '../exploration/LevelBuilder';
import type { LevelHost, LevelRuntime } from '../LevelRuntime';
import type { HiddenRoomData, Spot } from './HiddenTypes';

interface Findable {
  id: string;
  name: string;
  icon: string;
  obj: THREE.Object3D;
  hit: THREE.Mesh;
  found: boolean;
  slot: HTMLElement | null;
  kind: 'target' | 'bonus' | 'coin';
  anim: number;
}

/**
 * TIPO D — OBJETOS ESCONDIDOS (seção 12): observação, atenção e memória visual.
 * Câmera no centro da sala: arrastar gira, roda/pinça/botões dão zoom, tocar encontra.
 * Bicho-Preguiça: mais dicas, área de toque maior. Jaguar: menos dicas e cronômetro.
 */
export class HiddenObjectsLevel implements LevelRuntime {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 1, 0.05, 60);
  private data!: HiddenRoomData;
  private items: Findable[] = [];
  private occluders: THREE.Object3D[] = [];
  private particles = new Particles(400);
  private ray = new THREE.Raycaster();
  private yaw = 0;
  private pitch = -0.12;
  private fov = 58;
  private targetYaw: number | null = null;
  private targetPitch: number | null = null;
  private t = 0;
  private elapsed = 0;
  private paused = false;
  private finished = false;
  private hintsUsed = 0;
  private hintsLeft = 0;
  private mistakes = 0;
  private hintTarget: Findable | null = null;
  private hintTimer = 0;
  private idleTimer = 0;
  private guide: CharacterId;
  private npc!: { model: CharacterModel; animator: ProceduralAnimator };
  private bar!: HTMLElement;
  private hintBtn!: HTMLElement;
  private pointers = new Map<number, { x: number; y: number }>();
  private down: { x: number; y: number; t: number; moved: number } | null = null;
  private pinchDist = 0;
  private listeners: [string, EventListener][] = [];
  private coinsCollected = 0;

  constructor(
    private host: LevelHost,
    private loader: () => Promise<HiddenRoomData>,
  ) {
    this.guide = otherCharacter(host.character);
  }

  async load(): Promise<void> {
    const h0 = this.host;
    this.data = await this.loader();
    const d = this.data;
    this.scene.background = new THREE.Color(d.background);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#ffc6e6', 1.8));
    const key = new THREE.DirectionalLight('#ffffff', 1.0);
    key.position.set(2, 6, 3);
    this.scene.add(key);
    this.buildRoom();
    this.scene.add(this.particles.points);

    // Mascote guia (perdeu as coisas) no meio da sala, perto da porta.
    const model = new CharacterModel(this.guide, defaultLook(this.guide));
    model.object.position.set(1.6, 0, -5.2);
    model.object.rotation.y = -0.3;
    this.scene.add(model.object);
    this.npc = { model, animator: new ProceduralAnimator(model.rig) };
    this.occluders.push(model.object);

    // Sorteia os objetos desta partida e suas posições.
    const rnd = Math.random;
    const pool = [...d.targets].sort(() => rnd() - 0.5);
    const chosen = pool.slice(0, d.counts[h0.difficulty]);
    const hitScale = h0.params.hintLevel >= 2 ? 1.6 : h0.params.hintLevel === 1 ? 1.25 : 1.05;
    for (const tg of chosen) {
      const spot = tg.spots[Math.floor(rnd() * tg.spots.length)];
      const obj = makeProp(tg.kind, tg.color, tg.accent, tg.scale ?? 1);
      this.place(obj, spot);
      this.items.push(this.findable(tg.id, tg.name, tg.icon, obj, 0.32 * (tg.scale ?? 1) * hitScale, 'target'));
    }
    // Ursinho dourado bônus
    const bspot = d.bonus.spots[Math.floor(rnd() * d.bonus.spots.length)];
    const teddy = goldenTeddy();
    teddy.scale.setScalar(0.45);
    teddy.position.y = 0.32;
    const tg = new THREE.Group();
    tg.add(teddy);
    this.place(tg, bspot);
    this.items.push(this.findable(d.bonus.id, 'Ursinho dourado', '🧸', tg, 0.3 * hitScale, 'bonus'));
    // Moedas para tocar
    d.coins.forEach((p, i) => {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16), toon('#ffb000', { emissive: 0.35 }));
      coin.rotation.x = Math.PI / 2;
      const g = new THREE.Group();
      g.add(coin);
      g.position.set(...p);
      this.scene.add(g);
      this.items.push(this.findable(`coin_${i}`, 'Divertis', '🪙', g, 0.3 * hitScale, 'coin'));
    });

    this.hintsLeft = d.hints[h0.difficulty];
    this.buildPanel();
    this.attachPointer();
    h0.hud.setControls('pointer');
    h0.hud.showCoins(true);
    this.refreshHud();
    h0.hud.setMission('🔎', `Ache ${chosen.length} coisas do ${CHARACTERS[this.guide].name}`);
    if (d.showTimer.includes(h0.difficulty)) h0.hud.setTimer(0);
    // Começa olhando para o mascote
    this.yaw = Math.PI;
    setTimeout(() => !this.finished && h0.hud.say(this.guide, d.intro, '🔎'), 500);
    this.render();
  }

  private place(obj: THREE.Object3D, spot: Spot) {
    obj.position.set(...spot.pos);
    obj.rotation.y = spot.rotY ?? 0;
    this.scene.add(obj);
  }

  private findable(id: string, name: string, icon: string, obj: THREE.Object3D, radius: number, kind: Findable['kind']): Findable {
    // Área de toque invisível (maior que o objeto — mais fácil para dedos pequenos).
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.22, radius), 10, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    const box = new THREE.Box3().setFromObject(obj);
    box.getCenter(hit.position);
    this.scene.add(hit);
    return { id, name, icon, obj, hit, found: false, slot: null, kind, anim: 0 };
  }

  private buildRoom() {
    const d = this.data.room;
    // Piso
    const tex = checkerTexture(d.floorColors[0], d.floorColors[1], 2).clone();
    tex.needsUpdate = true;
    tex.repeat.set(d.radius, d.radius);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(d.radius + 0.2, 48), toon('#ffffff', { map: tex }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    // Paredes em gomos coloridos
    const n = 20;
    for (let i = 0; i < n; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(d.radius, d.radius, d.height, 4, 1, true, (i / n) * Math.PI * 2, (Math.PI * 2) / n + 0.01),
        toon(d.wallColors[i % d.wallColors.length], { side: THREE.BackSide }),
      );
      seg.position.y = d.height / 2;
      this.scene.add(seg);
    }
    // Faixas neon e teto
    for (const [y, c] of [[0.15, '#ff3d9a'], [d.height - 0.3, '#39ff88']] as const) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(d.radius - 0.05, 0.06, 6, 64), toon(c, { unlit: true }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      this.scene.add(ring);
    }
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(d.radius + 0.2, 48), toon('#f6efff', { side: THREE.DoubleSide }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = d.height;
    this.scene.add(ceil);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20), toon(i % 2 ? '#ffd60a' : '#ff9ccc', { unlit: true }));
      lamp.position.set(Math.sin(a) * 5, d.height - 0.05, Math.cos(a) * 5);
      this.scene.add(lamp);
    }
    // Letreiro na "porta"
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 1),
      toon('#ffffff', { unlit: true, map: textTexture('SALA DE BRINQUEDOS', { color: '#ffffff', glow: '#ff3d9a', font: 110 }) }),
    );
    sign.position.set(0, 3.6, -d.radius + 0.1);
    this.scene.add(sign);
    // Decoração (muitos brinquedos: a sala não pode parecer vazia)
    for (const p of this.data.decor) {
      const obj = makeProp(p.kind, p.color, p.accent, p.scale ?? 1);
      obj.position.set(...p.pos);
      obj.rotation.y = p.rotY ?? 0;
      this.scene.add(obj);
      if (p.occludes !== false) this.occluders.push(obj);
    }
  }

  // ------------------------------------------------------------------ interface da fase

  private buildPanel() {
    const g = this.host;
    const targets = this.items.filter((i) => i.kind === 'target');
    const slots = targets.map((it) => {
      const s = h('div', { class: 'find-slot', title: it.name, 'aria-label': it.name }, it.icon);
      it.slot = s;
      return s;
    });
    this.hintBtn = h('button', { class: 'btn round yellow hint-btn', 'aria-label': 'Dica', onclick: () => this.useHint() }, '💡');
    const zoomIn = h('button', { class: 'btn round white small', 'aria-label': 'Aproximar', onclick: () => (this.fov = clamp(this.fov - 10, 26, 62)) }, '➕');
    const zoomOut = h('button', { class: 'btn round white small', 'aria-label': 'Afastar', onclick: () => (this.fov = clamp(this.fov + 10, 26, 62)) }, '➖');
    zoomIn.style.cssText = zoomOut.style.cssText = 'width:52px;height:52px;font-size:22px';
    this.bar = h('div', { class: 'find-bar' }, ...slots, this.hintBtn, zoomIn, zoomOut);
    this.updateHintBtn();
    g.hud.mountPanel(this.bar);
  }

  private updateHintBtn() {
    this.hintBtn.querySelector('.count')?.remove();
    if (this.hintsLeft !== Infinity) this.hintBtn.append(h('span', { class: 'count' }, String(this.hintsLeft)));
    this.hintBtn.classList.toggle('disabled', this.hintsLeft <= 0);
  }

  private attachPointer() {
    const canvas = this.host.renderer.canvas;
    const on = (ev: string, fn: (e: any) => void) => {
      canvas.addEventListener(ev, fn);
      this.listeners.push([ev, fn]);
    };
    on('pointerdown', (e: PointerEvent) => {
      if (this.paused) return;
      canvas.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        this.down = null;
      }
    });
    on('pointermove', (e: PointerEvent) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev || this.paused) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        this.fov = clamp(this.fov - (dist - this.pinchDist) * 0.08, 26, 62);
        this.pinchDist = dist;
        return;
      }
      if (this.down) this.down.moved += Math.abs(dx) + Math.abs(dy);
      const k = (this.fov / 58) * 0.006 * this.host.input.cameraSensitivity;
      this.yaw += dx * k;
      this.pitch = clamp(this.pitch + dy * k, -0.9, 0.6);
      this.targetYaw = this.targetPitch = null;
      this.idleTimer = 0;
    });
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.down && this.down.moved < 12 && performance.now() - this.down.t < 600) this.tap(e.clientX, e.clientY);
      this.down = null;
    };
    on('pointerup', up);
    on('pointercancel', (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      this.down = null;
    });
    on('wheel', (e: WheelEvent) => {
      this.fov = clamp(this.fov + Math.sign(e.deltaY) * 4, 26, 62);
    });
  }

  /** Toque/clique: procura o primeiro objeto atingido (objetos na frente escondem os de trás). */
  tap(clientX: number, clientY: number) {
    if (this.finished || this.paused) return;
    const r = this.host.renderer;
    const ndc = new THREE.Vector2((clientX / r.width) * 2 - 1, -(clientY / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const candidates = [...this.items.filter((i) => !i.found).map((i) => i.hit), ...this.occluders];
    const hits = this.ray.intersectObjects(candidates, true);
    const first = hits[0];
    const item = first ? this.items.find((i) => i.hit === first.object) : undefined;
    if (item) this.onFound(item);
    else {
      this.mistakes++;
      this.host.audio.play('pop', { pitch: 0.7 });
      if (first) this.particles.emit(first.point, 5, { colors: ['#ffffff', '#d9c6ff'], speed: 1.5, life: 0.4, size: 0.15, gravity: 0 });
    }
  }

  private onFound(it: Findable) {
    const g = this.host;
    it.found = true;
    it.anim = 1;
    this.idleTimer = 0;
    const p = it.hit.position;
    if (it.kind === 'coin') {
      this.coinsCollected++;
      g.audio.play('coin');
      this.particles.emit(p, 10, { colors: [...FX_COLORS.coin], speed: 2, life: 0.5, size: 0.15 });
      const v = p.clone().project(this.camera);
      g.hud.coinFly(((v.x + 1) / 2) * g.renderer.width, ((1 - v.y) / 2) * g.renderer.height, 'coin');
    } else if (it.kind === 'bonus') {
      g.audio.play('collectible');
      g.hud.toast('🧸', 'Ursinho dourado!');
      this.particles.emit(p, 30, { colors: ['#ffd60a', '#ffffff'], speed: 3, life: 1, size: 0.2 });
    } else {
      g.audio.play('star', { pitch: 1 + Math.random() * 0.2 });
      this.particles.emit(p, 26, { colors: [...FX_COLORS.confetti], speed: 3, life: 0.9, size: 0.18 });
      it.slot?.classList.add('found');
      this.npc.animator.trigger('celebrate');
      const left = this.items.filter((i) => i.kind === 'target' && !i.found).length;
      if (left > 0) g.hud.say(this.guide, left === 1 ? `Achou ${it.name}! Falta só mais uma!` : `Achou ${it.name}!`, it.icon);
      if (this.hintTarget === it) this.hintTarget = null;
    }
    this.refreshHud();
    if (this.items.every((i) => i.kind !== 'target' || i.found)) this.complete();
  }

  private useHint() {
    if (this.finished || this.paused) return;
    if (this.hintsLeft <= 0) {
      this.host.audio.play('softError');
      this.host.hud.say(this.guide, 'As dicas acabaram, mas eu sei que você consegue!', '💪');
      return;
    }
    const left = this.items.filter((i) => i.kind === 'target' && !i.found);
    if (!left.length) return;
    const target = left[Math.floor(Math.random() * left.length)];
    this.hintsLeft--;
    this.hintsUsed++;
    this.updateHintBtn();
    this.showHint(target);
  }

  private showHint(target: Findable) {
    this.hintTarget = target;
    this.hintTimer = 4;
    const p = target.hit.position;
    this.targetYaw = Math.atan2(p.x, p.z);
    const camH = this.data.camera.height;
    this.targetPitch = clamp(Math.atan2(p.y - camH, Math.hypot(p.x, p.z)), -0.9, 0.6);
    this.fov = Math.min(this.fov, 46);
    this.host.audio.play('secret');
    this.host.hud.say(this.guide, `Olha ali! Procure perto dos brilhos.`, target.icon);
  }

  private complete() {
    if (this.finished) return;
    this.finished = true;
    const g = this.host;
    g.audio.play('victory');
    this.npc.animator.trigger('dance');
    g.hud.say(this.guide, 'Você achou tudo! Muito obrigado!', '🎉');
    this.targetYaw = Math.PI;
    this.targetPitch = -0.1;
    for (let i = 0; i < 3; i++)
      setTimeout(() => this.particles.emit({ x: 1.6, y: 2.5, z: -5.2 }, 50, { colors: [...FX_COLORS.confetti], speed: 6, up: 2, life: 1.5, size: 0.25, gravity: 4 }), i * 300);
    setTimeout(() => g.finish(this.result(true)), 2400);
  }

  // ------------------------------------------------------------------ loop

  update(dt: number): void {
    if (this.paused) return;
    this.t += dt;
    if (!this.finished) this.elapsed += dt;
    const inp = this.host.input.state;
    // Teclado/gamepad também giram a câmera
    if (inp.moveX || inp.lookX) {
      this.yaw -= (inp.moveX * 1.6 * dt + inp.lookX * 0.004);
      this.targetYaw = null;
    }
    if (inp.moveY || inp.lookY) {
      this.pitch = clamp(this.pitch + inp.moveY * 1.0 * dt - inp.lookY * 0.003, -0.9, 0.6);
      this.targetPitch = null;
    }
    if (inp.zoom) this.fov = clamp(this.fov + inp.zoom * 4, 26, 62);
    if (inp.pressed.has('hint')) this.useHint();
    if (this.targetYaw !== null) this.yaw = dampAngle(this.yaw, this.targetYaw, 4, dt);
    if (this.targetPitch !== null) this.pitch = damp(this.pitch, this.targetPitch, 4, dt);

    // Ajuda automática no Bicho-Preguiça se a criança ficar muito tempo sem achar nada.
    this.idleTimer += dt;
    if (!this.finished && this.host.params.hintLevel >= 2 && this.idleTimer > 35) {
      this.idleTimer = 0;
      const left = this.items.filter((i) => i.kind === 'target' && !i.found);
      if (left.length) this.showHint(left[0]);
    }

    // Brilhos da dica
    if (this.hintTarget && this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (Math.floor(this.t * 10) !== Math.floor((this.t - dt) * 10))
        this.particles.emit(this.hintTarget.hit.position, 3, { colors: [...FX_COLORS.magic], speed: 1.2, life: 0.8, size: 0.2, gravity: -0.5 });
    }

    // Animação de "achei!": objeto pula e some
    for (const it of this.items) {
      if (it.kind === 'coin' && !it.found) it.obj.rotation.y = this.t * 2;
      if (it.found && it.anim > 0) {
        it.anim = Math.max(0, it.anim - dt * 1.6);
        const s = it.anim > 0.5 ? 1 + (1 - it.anim) * 0.8 : it.anim * 2.8;
        it.obj.scale.setScalar(Math.max(0.0001, s));
        it.obj.position.y += dt * 1.2;
        if (it.anim === 0) it.obj.visible = false;
      }
    }

    this.npc.animator.setLocomotion('idle', 0);
    this.npc.animator.update(dt);
    this.npc.model.update(dt);
    this.particles.update(dt);
    if (this.data.showTimer.includes(this.host.difficulty) && !this.finished) this.host.hud.setTimer(this.elapsed);
  }

  render(): void {
    const r = this.host.renderer;
    const ch = this.data.camera.height;
    this.camera.fov = damp(this.camera.fov, this.fov, 10, 1 / 60);
    this.camera.aspect = r.width / Math.max(1, r.height);
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, ch, 0);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.lookAt(this.camera.position.clone().add(dir));
    this.particles.setViewportHeight(r.height);
    r.renderFull(this.scene, this.camera);
  }

  private refreshHud() {
    const h0 = this.host;
    h0.hud.setCoins(this.coinsCollected, this.data.coins.length);
    const r = this.result(true);
    h0.hud.setObjectives(
      h0.level.objectives.map((o) => {
        let done = false;
        // Objetivos 'de manter' (poucas dicas, tempo) só contam no final.
        if (o.type === 'flag' || o.type === 'timeUnder') done = false;
        if (o.type === 'collectibles') done = r.collectiblesFound.length >= o.count;
        return { icon: o.icon, label: o.label, done };
      }),
    );
  }

  private result(completed: boolean): LevelRunResult {
    const flags: string[] = [];
    if (this.hintsUsed <= 1) flags.push('fewHints');
    if (this.hintsUsed === 0) flags.push('noHints');
    if (this.mistakes <= 3) flags.push('fewMistakes');
    const bonus = this.items.find((i) => i.kind === 'bonus');
    return {
      levelId: this.host.level.id,
      difficulty: this.host.difficulty,
      completed,
      coinsCollected: this.coinsCollected,
      coinsTotal: this.data.coins.length,
      divertisCollected:
        this.coinsCollected * ECONOMY.coinValue * 3 + this.items.filter((i) => i.kind === 'target' && i.found).length * ECONOMY.coinValue * 3,
      secretsFound: [],
      collectiblesFound: bonus?.found ? [bonus.id] : [],
      timeSec: this.elapsed,
      flags,
      stats: { hiddenFound: this.items.filter((i) => i.kind === 'target' && i.found).length },
    };
  }

  partialResult(): LevelRunResult {
    return this.result(false);
  }

  snapshot() {
    return null; // fase curta: recomeça do início
  }

  setPaused(p: boolean): void {
    this.paused = p;
  }

  restartFromCheckpoint(): void {
    this.targetYaw = Math.PI;
    this.targetPitch = -0.12;
  }

  dispose(): void {
    const canvas = this.host.renderer.canvas;
    for (const [ev, fn] of this.listeners) canvas.removeEventListener(ev, fn);
    this.host.hud.mountPanel(null);
    this.host.hud.setTimer(null);
    this.npc.model.dispose();
    this.particles.dispose();
    this.scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.scene.clear();
  }

  dev = {
    checkpoints: () => [] as string[],
    teleportTo: () => {},
    toggleColliders: () => {},
    complete: (stars: 1 | 2 | 3) => {
      if (stars >= 2) this.items.find((i) => i.kind === 'bonus')!.found = true;
      for (const it of this.items) if (it.kind === 'target' && !it.found) this.onFound(it);
    },
    collectAll: () => {
      for (const it of this.items) if (!it.found) this.onFound(it);
    },
    state: () => ({
      found: this.items.filter((i) => i.kind === 'target' && i.found).map((i) => i.id),
      targets: this.items.filter((i) => i.kind === 'target').map((i) => i.id),
      hintsLeft: this.hintsLeft,
      finished: this.finished,
      coins: this.coinsCollected,
    }),
    /** QA: confere se TODAS as posições possíveis de TODOS os objetos podem ser tocadas. */
    testAllSpots: () => {
      const fails: string[] = [];
      const saved = this.items;
      // esconde os objetos sorteados desta partida para não atrapalharem
      for (const it of saved) {
        it.obj.visible = false;
        it.hit.position.y -= 100;
      }
      const all = [
        ...this.data.targets.flatMap((t) => t.spots.map((s, i) => ({ id: `${t.id}#${i}`, obj: makeProp(t.kind, t.color, t.accent, t.scale ?? 1), s, r: 0.32 * (t.scale ?? 1) * 1.05 }))),
        ...this.data.bonus.spots.map((s, i) => {
          const g = new THREE.Group();
          const td = goldenTeddy();
          td.scale.setScalar(0.45);
          td.position.y = 0.32;
          g.add(td);
          return { id: `bonus#${i}`, obj: g, s, r: 0.3 * 1.05 };
        }),
      ];
      for (const c of all) {
        this.place(c.obj, c.s);
        const f = this.findable(c.id, c.id, '?', c.obj, c.r, 'target');
        this.items = [f];
        this.finished = false;
        const p = f.hit.position;
        this.yaw = Math.atan2(p.x, p.z);
        this.pitch = Math.atan2(p.y - this.data.camera.height, Math.hypot(p.x, p.z));
        this.targetYaw = this.targetPitch = null;
        this.camera.fov = this.fov;
        this.render();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const hits = ray.intersectObjects([f.hit, ...this.occluders], true);
        if (hits[0]?.object !== f.hit) fails.push(`${c.id} (${p.toArray().map((v) => v.toFixed(1)).join(',')})`);
        this.scene.remove(c.obj, f.hit);
      }
      this.items = saved;
      this.finished = false;
      for (const it of saved) {
        it.obj.visible = !it.found;
        it.hit.position.y += 100;
      }
      return { tested: all.length, fails };
    },
    /** Mira a câmera num objeto e "toca" no centro da tela (teste automático). */
    lookAndTap: (id: string) => {
      const it = this.items.find((i) => i.id === id);
      if (!it) return false;
      const p = it.hit.position;
      this.yaw = Math.atan2(p.x, p.z);
      this.pitch = Math.atan2(p.y - this.data.camera.height, Math.hypot(p.x, p.z));
      this.targetYaw = this.targetPitch = null;
      this.camera.fov = this.fov;
      this.render();
      this.tap(this.host.renderer.width / 2, this.host.renderer.height / 2);
      return it.found;
    },
  };
}
