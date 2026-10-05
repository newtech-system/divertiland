import * as THREE from 'three';
import type { CharacterId } from '../../core/types';
import { clamp, damp } from '../../core/util';
import { CHARACTERS } from '../../data/characters';
import { LANE_W, buildRunnerCourse, laneX } from '../../data/levels/w1_l03';
import { MOVEMENT } from '../../data/physicsConfig';
import { ProceduralAnimator } from '../../engine/character/AnimationController';
import { CharacterModel } from '../../engine/character/CharacterModel';
import { otherCharacter } from '../../engine/character/looks';
import { FX_COLORS, Particles } from '../../engine/fx/Particles';
import { CharacterBody } from '../../engine/physics/CharacterBody';
import { makeProp } from '../../engine/props/Props';
import type { LevelRunResult } from '../../systems/LevelResult';
import { h } from '../../ui/dom';
import { CollectibleSystem, type PickupEvent } from '../exploration/CollectibleSystem';
import { LevelBuilder, type BuiltLevel, type Trigger } from '../exploration/LevelBuilder';
import type { LevelHost, LevelRuntime } from '../LevelRuntime';

const STAND_H = 1.45;
const SLIDE_H = 0.72;

/**
 * TIPO B — CORRIDA (seção 10): corre sozinho, troca de faixa, pula, abaixa, coleta.
 * Bater NUNCA elimina: a criança tropeça, dá um pulinho automático e continua.
 * O "Dino Fofo" inflável persegue de brincadeira e chega perto quando há tropeços.
 */
export class RunnerLevel implements LevelRuntime {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(64, 1, 0.1, 300);
  private lvl!: BuiltLevel;
  private body!: CharacterBody;
  private model!: CharacterModel;
  private animator!: ProceduralAnimator;
  private collect!: CollectibleSystem;
  private particles = new Particles(500);
  private chaser!: THREE.Group;
  private length = 1000;
  private lane = 0;
  private speed = 0;
  private baseSpeed = 11;
  private stumble = 0;
  private slideT = 0;
  private hits = 0;
  private hitCooldown = 0;
  private chaserDist = 16;
  private t = 0;
  private elapsed = 0;
  private started = false;
  private startDelay = 2.2;
  private paused = false;
  private finished = false;
  private gems: string[] = [];
  private pickups: PickupEvent[] = [];
  private shownMessages = new Set<string>();
  private guide: CharacterId;
  private progressFill!: HTMLElement;
  private camPos = new THREE.Vector3();
  private bounces = 0;
  private trailT = 0;

  constructor(private host: LevelHost) {
    this.guide = otherCharacter(host.character);
  }

  async load(): Promise<void> {
    const h0 = this.host;
    const course = buildRunnerCourse(h0.difficulty);
    this.length = course.length;
    const env = course.layout.environment;
    this.scene.background = new THREE.Color(env.background);
    this.scene.fog = new THREE.Fog(env.fog, env.fogNear, env.fogFar);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#ffb6dc', 1.7));
    const sun = new THREE.DirectionalLight('#ffffff', 1.2);
    sun.position.set(-3, 10, -4);
    this.scene.add(sun);
    this.lvl = new LevelBuilder({ difficulty: h0.difficulty, params: h0.params, playerCharacter: h0.character, guideCharacter: this.guide }).build(course.layout);
    this.scene.add(this.lvl.root, this.particles.points);
    this.particles.density = h0.settings.reducedMotion ? 0.4 : 1;

    this.body = new CharacterBody(this.lvl.world);
    this.body.teleport({ x: 0, y: 0, z: 0 });
    this.model = new CharacterModel(h0.character, h0.look);
    this.animator = new ProceduralAnimator(this.model.rig);
    this.scene.add(this.model.object);
    this.collect = new CollectibleSystem(this.lvl, Math.max(1.1, h0.params.coinMagnetRadius));
    this.baseSpeed = h0.params.runnerSpeed;

    // Dino Fofo inflável (perseguição divertida)
    this.chaser = makeProp('dino', '#b07bff', '#ffd60a', 7);
    this.chaser.rotation.y = -Math.PI / 2;
    this.scene.add(this.chaser);

    // Painel de progresso
    this.progressFill = h('div', { style: 'height:100%;width:0%;background:linear-gradient(90deg,#39ff88,#21d4fd);border-radius:99px;transition:width .2s' });
    const bar = h(
      'div',
      { class: 'find-bar', style: 'padding:8px 16px;gap:10px;min-width:min(420px,80vw)' },
      h('span', { style: 'font-size:26px' }, '🏃'),
      h('div', { class: 'progress', style: 'flex:1;height:18px' }, this.progressFill),
      h('span', { style: 'font-size:26px' }, '🏁'),
    );
    h0.hud.mountPanel(bar);
    h0.hud.setControls('swipe');
    h0.hud.setMission('🏁', 'Corra até a chegada!');
    this.refreshHud();
    this.camPos.set(0, 3.4, -7);
    this.render();
    setTimeout(() => {
      if (!this.finished) h0.hud.say(this.guide, 'O Dino Fofo quer brincar de pega-pega! Prepare-se para correr!', '🦖');
    }, 400);
  }

  // ------------------------------------------------------------------ loop

  update(dt: number): void {
    if (this.paused) return;
    this.t += dt;
    const h0 = this.host;
    const b = this.body;
    for (const u of this.lvl.updaters) u(this.t, dt);

    if (!this.started) {
      this.startDelay -= dt;
      const n = Math.ceil(this.startDelay);
      if (n !== Math.ceil(this.startDelay + dt) && n > 0) {
        h0.audio.play('pop', { pitch: 0.8 + (3 - n) * 0.2 });
        h0.hud.toast(String(n), n === 1 ? 'Já!' : '...');
      }
      if (this.startDelay <= 0) {
        this.started = true;
        h0.audio.play('whoosh');
      }
    }

    const inp = h0.input.state;
    const pressed = inp.pressed;
    if (this.started && !this.finished) {
      this.elapsed += dt;
      if (pressed.has('left')) this.changeLane(-1);
      if (pressed.has('right')) this.changeLane(1);
      if (pressed.has('jump') || pressed.has('up')) this.jump();
      if (pressed.has('down')) this.slide();
    }

    // Velocidade (aumenta aos poucos; tropeço diminui por um instante)
    const target = this.started && !this.finished ? this.baseSpeed * Math.min(1.35, 1 + this.elapsed * h0.params.runnerAccel * 0.05) : 0;
    this.stumble = Math.max(0, this.stumble - dt);
    const mul = this.stumble > 0 ? 0.45 : 1;
    this.speed = damp(this.speed, target * mul, this.finished ? 2 : 4, dt);

    // Abaixar (corpo menor) — só levanta se tiver espaço.
    if (this.slideT > 0) {
      this.slideT -= dt;
      if (this.slideT <= 0 && !this.canStand()) this.slideT = 0.1;
    }
    b.height = this.slideT > 0 ? SLIDE_H : STAND_H;

    // Movimento
    const tx = laneX(this.lane);
    b.vel.x = clamp((tx - b.pos.x) * 14, -12, 12);
    b.vel.z = this.speed;
    b.vel.y = Math.max(-MOVEMENT.maxFallSpeed, b.vel.y - MOVEMENT.gravity * (this.slideT > 0 && b.vel.y > 0 ? 2.2 : 1) * dt);
    const z0 = b.pos.z;
    b.step(dt);
    const advanced = b.pos.z - z0;

    // Trampolim (almofada verde)
    if (b.landedThisFrame && b.ground?.surface === 'trampoline') {
      b.vel.y = 14;
      b.grounded = false;
      this.bounces++;
      h0.audio.play('trampoline');
      this.particles.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z }, 14, { colors: [...FX_COLORS.confetti], speed: 4, life: 0.6 });
    } else if (b.landedThisFrame && -b.landingSpeed > 8) {
      h0.audio.play('land', { volume: 0.6 });
      this.animator.trigger('land');
    }

    // Bateu de frente em algo?
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.started && !this.finished && this.speed > 2 && advanced < this.speed * dt * 0.4 && this.hitCooldown === 0) this.onHit();

    // Gatilhos (mensagens e chegada)
    const c = { x: b.pos.x, y: b.pos.y + 0.6, z: b.pos.z };
    for (const tr of this.lvl.triggers) {
      const inside = c.x >= tr.min.x && c.x <= tr.max.x && c.y >= tr.min.y && c.y <= tr.max.y && c.z >= tr.min.z && c.z <= tr.max.z;
      if (inside && !tr.inside) this.onEnter(tr);
      tr.inside = inside;
    }
    if (b.pos.z >= this.length && !this.finished) this.complete();

    // Moedas e gemas
    this.collect.update(this.t, dt, b.pos, this.pickups);
    for (const e of this.pickups) this.onPickup(e);

    // Perseguidor
    if (this.started && !this.finished) this.chaserDist = Math.min(16, this.chaserDist + dt * 1.2);
    else if (this.finished) this.chaserDist = Math.min(30, this.chaserDist + dt * 6);
    this.chaser.position.set(Math.sin(this.t * 1.3) * 1.5, Math.abs(Math.sin(this.t * 7)) * 0.4, b.pos.z - this.chaserDist);
    this.chaser.rotation.z = Math.sin(this.t * 7) * 0.08;

    // Visual do personagem
    const state = this.finished ? 'idle' : this.slideT > 0 ? 'slide' : !b.grounded ? (b.vel.y > 0 ? 'jump' : 'fall') : this.speed > 0.5 ? 'run' : 'idle';
    this.animator.setLocomotion(state, 1);
    this.animator.update(dt);
    this.model.update(dt);
    this.model.object.position.set(b.pos.x, b.pos.y, b.pos.z);
    this.model.object.rotation.y = (tx - b.pos.x) * -0.15;
    this.trail(dt);

    for (const n of this.lvl.npcs) {
      n.timer -= dt;
      if (n.timer <= 0) {
        n.animator.trigger('dance');
        n.timer = 2.4;
      }
      n.animator.update(dt);
    }

    this.particles.update(dt);
    this.progressFill.style.width = `${clamp((b.pos.z / this.length) * 100, 0, 100)}%`;
  }

  private changeLane(d: number) {
    const next = clamp(this.lane + d, -1, 1);
    if (next === this.lane) {
      this.host.audio.play('bump', { volume: 0.4 });
      return;
    }
    this.lane = next;
    this.host.audio.play('whoosh', { volume: 0.5 });
  }

  private jump() {
    const b = this.body;
    if (!b.grounded) return;
    this.slideT = 0;
    b.vel.y = MOVEMENT.jumpVelocity;
    b.grounded = false;
    this.host.audio.play('jump');
  }

  private slide() {
    const b = this.body;
    this.slideT = 0.8;
    if (!b.grounded) b.vel.y = Math.min(b.vel.y, -10); // mergulha para baixo
    this.host.audio.play('whoosh', { pitch: 0.7 });
  }

  private canStand(): boolean {
    const p = this.body.pos;
    const r = this.body.radius;
    return this.lvl.world.overlapping({ x: p.x - r, y: p.y + SLIDE_H, z: p.z - r }, { x: p.x + r, y: p.y + STAND_H, z: p.z + r }, []).length === 0;
  }

  /** Tropeço amigável: pulinho automático e, se for bloco alto, desvia para uma faixa livre. */
  private onHit() {
    const h0 = this.host;
    const b = this.body;
    this.hits++;
    this.hitCooldown = 0.8;
    this.stumble = 0.9;
    this.chaserDist = Math.max(5, this.chaserDist - 6);
    h0.audio.play('bump');
    this.animator.trigger('bump');
    this.particles.emit({ x: b.pos.x, y: b.pos.y + 1, z: b.pos.z + 0.5 }, 10, { colors: ['#ffffff', '#ffd60a'], speed: 3, life: 0.4 });
    const tallAhead = (lane: number) =>
      this.lvl.world.overlapping({ x: laneX(lane) - 0.3, y: 1.7, z: b.pos.z }, { x: laneX(lane) + 0.3, y: 2.4, z: b.pos.z + 2.5 }, []).length > 0;
    if (tallAhead(this.lane)) {
      const options = [this.lane - 1, this.lane + 1].filter((l) => l >= -1 && l <= 1 && !tallAhead(l));
      if (options.length) this.lane = options[0];
    }
    b.vel.y = MOVEMENT.jumpVelocity * 0.95;
    b.grounded = false;
    if (this.hits === 1 || this.hits % 3 === 0) h0.hud.say(this.guide, pick(CHARACTERS[this.guide].lines.almost), '💪');
  }

  private onEnter(tr: Trigger) {
    const h0 = this.host;
    if (tr.kind === 'message') {
      const d = tr.data;
      if (this.shownMessages.has(d.id)) return;
      if (d.tutorial && !h0.firstTime && h0.params.hintLevel < 2) return;
      this.shownMessages.add(d.id);
      h0.hud.say(this.guide, d.text, d.icon);
      if (d.mission) h0.hud.setMission('🏁', d.mission);
    } else if (tr.kind === 'finish') this.complete();
  }

  private onPickup(e: PickupEvent) {
    const h0 = this.host;
    if (e.type === 'gem') {
      this.gems.push(e.id);
      h0.audio.play('gem');
      h0.hud.toast('💎', `Gema ${this.gems.length}/3!`);
    } else h0.audio.play('coin', { pitch: 0.95 + Math.random() * 0.1 });
    this.particles.emit(e.pos, e.type === 'gem' ? 14 : 5, { colors: e.type === 'gem' ? ['#ff3d9a', '#ffffff'] : [...FX_COLORS.coin], speed: 2, life: 0.4, size: 0.2 });
    const v = e.pos.clone().project(this.camera);
    if (v.z < 1) h0.hud.coinFly(((v.x + 1) / 2) * h0.renderer.width, ((1 - v.y) / 2) * h0.renderer.height, e.type === 'gem' ? 'gem' : 'coin');
    this.refreshHud();
  }

  private trail(dt: number) {
    const colors = this.model.trailColors;
    if (!colors || !this.started) return;
    this.trailT -= dt;
    if (this.trailT > 0) return;
    this.trailT = 0.03;
    const p = this.body.pos;
    this.particles.emit({ x: p.x, y: p.y + 0.4, z: p.z - 0.3 }, 1, { colors, speed: 0.3, life: 0.6, size: 0.3, gravity: -0.3 });
  }

  private complete() {
    if (this.finished) return;
    this.finished = true;
    const h0 = this.host;
    h0.audio.play('victory');
    this.animator.trigger('celebrate');
    h0.hud.say(this.guide, this.hits <= 2 ? 'Que corrida incrível! O Dino Fofo nem chegou perto!' : pick(CHARACTERS[this.guide].lines.finish), '🏁');
    const p = this.body.pos;
    for (let i = 0; i < 3; i++)
      setTimeout(() => this.particles.emit({ x: p.x, y: p.y + 2.5, z: p.z + 2 }, 50, { colors: [...FX_COLORS.confetti], speed: 7, up: 3, life: 1.5, size: 0.3, gravity: 5 }), i * 300);
    setTimeout(() => h0.finish(this.result(true)), 2400);
  }

  render(): void {
    const r = this.host.renderer;
    const b = this.body;
    const want = new THREE.Vector3(b.pos.x * 0.55, b.pos.y * 0.6 + 3.3, b.pos.z - 6.8);
    this.camPos.x = damp(this.camPos.x, want.x, 8, 1 / 60);
    this.camPos.y = damp(this.camPos.y, want.y, 5, 1 / 60);
    this.camPos.z = want.z;
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(b.pos.x * 0.4, b.pos.y * 0.5 + 1.2, b.pos.z + 7);
    const aspect = r.width / Math.max(1, r.height);
    this.camera.aspect = aspect;
    // Em pé, abre o campo de visão para dar tempo de ver os obstáculos chegando.
    this.camera.fov = aspect < 1 ? Math.min(86, 64 + (1 - aspect) * 34) : 64;
    this.camera.updateProjectionMatrix();
    this.particles.setViewportHeight(r.height);
    r.renderFull(this.scene, this.camera);
  }

  private refreshHud() {
    const h0 = this.host;
    h0.hud.setCoins(this.collect.collectedCount, this.collect.total);
    const r = this.result(false);
    h0.hud.setObjectives(
      h0.level.objectives.map((o) => {
        let done = false;
        if (o.type === 'collectibles') done = this.gems.length >= o.count;
        if (o.type === 'coinsRatio') done = r.coinsTotal > 0 && r.coinsCollected / r.coinsTotal >= o.ratio;
        let label = o.label;
        if (o.type === 'collectibles') label += ` (${Math.min(o.count, this.gems.length)}/${o.count})`;
        return { icon: o.icon, label, done };
      }),
    );
  }

  private result(completed: boolean): LevelRunResult {
    const flags: string[] = [];
    if (this.hits <= 2) flags.push('fewHits');
    if (this.hits === 0) flags.push('noHits');
    return {
      levelId: this.host.level.id,
      difficulty: this.host.difficulty,
      completed,
      coinsCollected: this.collect.collectedCount,
      coinsTotal: this.collect.total,
      divertisCollected: this.collect.divertis,
      secretsFound: [],
      collectiblesFound: [...this.gems],
      timeSec: this.elapsed,
      flags,
      stats: { runnerHits: this.hits, trampolineBounces: this.bounces },
    };
  }

  partialResult() {
    return this.result(false);
  }

  snapshot() {
    return null;
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  restartFromCheckpoint() {
    /* corrida não tem checkpoint: nada a fazer */
  }

  dispose() {
    this.host.hud.mountPanel(null);
    this.host.hud.setControls('move');
    this.model.dispose();
    for (const n of this.lvl.npcs) n.model.dispose();
    this.particles.dispose();
    this.scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.scene.clear();
  }

  dev = {
    checkpoints: () => [] as string[],
    teleportTo: () => {},
    toggleColliders: () => {},
    complete: (stars: 1 | 2 | 3) => {
      if (stars >= 2) this.collect.collectAll(this.pickups);
      if (stars >= 3) this.gems = ['g1', 'g2', 'g3'];
      this.complete();
    },
    collectAll: () => this.collect.collectAll(this.pickups),
    state: () => ({
      pos: { ...this.body.pos },
      lane: this.lane,
      speed: this.speed,
      hits: this.hits,
      coins: this.collect.collectedCount,
      total: this.collect.total,
      gems: this.gems.length,
      finished: this.finished,
      started: this.started,
      length: this.length,
    }),
    /** Piloto automático simples para testes: escolhe faixa livre e pula/abaixa sozinho. */
    autopilot: () => {
      const b = this.body;
      const w = this.lvl.world;
      const lookAhead = Math.max(3, this.speed * 0.45);
      const blocked = (lane: number, y0: number, y1: number) =>
        w.overlapping({ x: laneX(lane) - 0.3, y: y0, z: b.pos.z + 0.4 }, { x: laneX(lane) + 0.3, y: y1, z: b.pos.z + lookAhead }, []).filter((c) => c.shape === 'box' && c.surface !== 'trampoline').length > 0;
      const tall = (l: number) => blocked(l, 1.7, 2.4);
      if (tall(this.lane)) {
        const opt = [0, -1, 1].find((l) => !tall(l));
        if (opt !== undefined) this.lane = opt;
      }
      if (blocked(this.lane, 0.05, 0.7) && b.grounded) this.jump();
      else if (blocked(this.lane, 1.0, 1.5) && !blocked(this.lane, 0.05, 0.7)) this.slideT = Math.max(this.slideT, 0.5);
      void LANE_W;
    },
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
