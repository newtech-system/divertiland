import * as THREE from 'three';
import type { AudioManager } from '../../audio/AudioManager';
import type { DifficultyParams } from '../../data/difficulty';
import { FX_COLORS, type Particles } from '../../engine/fx/Particles';
import { textTexture } from '../../engine/materials';
import { CharacterBody } from '../../engine/physics/CharacterBody';
import type { V3 } from '../../engine/physics/PhysicsWorld';
import type { BuiltLevel, FriendInfo, PadInfo } from './LevelBuilder';

export interface QuestHooks {
  say(name: string, icon: string, text: string): void;
  toast(icon: string, text: string): void;
  mission(text: string): void;
  audio: AudioManager;
  particles: Particles;
  /** Dá Divertis extras (recompensa por ajudar). */
  reward(divertis: number): void;
  finishLevel(): void;
  onTagged(n: number, total: number): void;
}

type FriendState = 'new' | 'active' | 'ready' | 'done';

interface TagRunner {
  info: BuiltLevel['tagFriends'][number];
  body: CharacterBody;
  tagged: boolean;
  wanderDir: number;
  wanderT: number;
  hop: number;
}

/**
 * QuestManager (seções 16, 17 e 19): amigos que pedem ajuda, objetos de missão, botões de
 * chão (inclusive sequência de memória), portões que abrem com missões e pega-pega com IA
 * simples. Tudo descrito nos dados da fase.
 */
export class QuestSystem {
  readonly flags = new Set<string>();
  private friendState = new Map<string, FriendState>();
  private memory = new Map<string, { seq: PadInfo[]; showing: boolean; showT: number; step: number; idx: number }>();
  private runners: TagRunner[] = [];
  private t = 0;

  constructor(
    private lvl: BuiltLevel,
    private hooks: QuestHooks,
    private params: DifficultyParams,
  ) {
    for (const f of lvl.friends) {
      this.friendState.set(f.def.id, 'new');
      f.interact.onInteract = () => this.talk(f);
    }
    for (const tf of lvl.tagFriends) {
      const body = new CharacterBody(lvl.world);
      body.radius = 0.45;
      body.height = 1.4;
      body.teleport({ x: tf.def.pos[0], y: tf.def.pos[1], z: tf.def.pos[2] });
      this.runners.push({ info: tf, body, tagged: false, wanderDir: Math.random() * Math.PI * 2, wanderT: 0, hop: 0 });
    }
  }

  get questFriends() {
    return this.lvl.friends.filter((f) => f.def.quest);
  }

  /** Todos os amigos com missão foram ajudados? */
  get helpedEveryone(): boolean {
    const qf = this.questFriends;
    return qf.length > 0 && qf.every((f) => this.friendState.get(f.def.id) === 'done');
  }

  get taggedCount() {
    return this.runners.filter((r) => r.tagged).length;
  }

  get tagTotal() {
    return this.runners.length;
  }

  // ------------------------------------------------------------------ conversa

  private talk(f: FriendInfo) {
    const d = f.def;
    const st = this.friendState.get(d.id)!;
    const h = this.hooks;
    if (d.finishesLevel) {
      if (d.needsFlag && !this.flags.has(d.needsFlag)) {
        h.say(d.name, d.icon, d.intro);
        return;
      }
      h.say(d.name, d.icon, d.thanks);
      this.friendDone(f);
      h.finishLevel();
      return;
    }
    if (!d.quest) {
      h.say(d.name, d.icon, st === 'new' ? d.intro : d.hint ?? d.thanks);
      if (st === 'new') this.friendState.set(d.id, 'done');
      return;
    }
    if (st === 'new') {
      h.say(d.name, d.icon, d.intro);
      this.friendState.set(d.id, 'active');
      if (d.mission) h.mission(d.mission);
      if (d.quest.type === 'pads' && d.quest.memory) this.startMemory(d.quest.group);
      h.audio.play('pop');
      return;
    }
    if (st === 'active') {
      if (d.quest.type === 'pads' && d.quest.memory) this.replayMemory(d.quest.group);
      h.say(d.name, d.icon, d.mission ? `${d.mission}!` : 'Você consegue!');
      return;
    }
    if (st === 'ready') {
      this.friendDone(f);
      this.flags.add(d.quest.flag);
      h.say(d.name, d.icon, `${d.thanks}${d.hint ? ' ' + d.hint : ''}`);
      h.audio.play('star');
      h.reward(10);
      h.toast('💛', `Você ajudou ${d.name}!`);
      const p = f.obj.position;
      h.particles.emit({ x: p.x, y: p.y + 2, z: p.z }, 40, { colors: [...FX_COLORS.confetti], speed: 5, life: 1.2, size: 0.3 });
      this.openGates();
      if (this.helpedEveryone) this.flags.add('helpedEveryone');
      return;
    }
    h.say(d.name, d.icon, d.hint ?? d.thanks);
  }

  private friendDone(f: FriendInfo) {
    this.friendState.set(f.def.id, 'done');
    (f.bubble.material as THREE.SpriteMaterial).map = textTexture('💛', { font: 180, width: 256, height: 256 });
    (f.bubble.material as THREE.SpriteMaterial).needsUpdate = true;
  }

  /** Missão cumprida → o amigo fica esperando para agradecer. */
  private questReady(group: string) {
    for (const f of this.lvl.friends) {
      const q = f.def.quest;
      if (!q || q.group !== group || this.friendState.get(f.def.id) !== 'active') continue;
      this.friendState.set(f.def.id, 'ready');
      this.hooks.audio.play('unlock');
      this.hooks.toast(f.def.icon, `Volte e fale com ${f.def.name}!`);
      this.hooks.mission(`Volte e fale com ${f.def.name}`);
      (f.bubble.material as THREE.SpriteMaterial).map = textTexture('❗', { font: 180, width: 256, height: 256 });
      (f.bubble.material as THREE.SpriteMaterial).needsUpdate = true;
    }
  }

  private openGates() {
    for (const g of this.lvl.questGates) {
      if (!g.opened && this.flags.has(g.flag)) {
        g.open();
        this.hooks.audio.play('unlock');
        this.hooks.toast('🔓', 'Um caminho novo abriu!');
      }
    }
  }

  // ------------------------------------------------------------------ botões e memória

  private activeGroup(group: string): boolean {
    return this.lvl.friends.some((f) => f.def.quest?.group === group && this.friendState.get(f.def.id) === 'active');
  }

  private startMemory(group: string) {
    const pads = this.lvl.pads.filter((p) => p.def.group === group);
    const len = Math.min(pads.length + 1, this.params.hintLevel >= 2 ? 3 : this.params.hintLevel === 1 ? 4 : 5);
    const seq: PadInfo[] = [];
    while (seq.length < len) {
      const next = pads[Math.floor(Math.random() * pads.length)];
      // Nunca o mesmo botão duas vezes seguidas (confunde as crianças).
      if (next !== seq[seq.length - 1]) seq.push(next);
    }
    this.memory.set(group, { seq, showing: true, showT: -0.8, step: 0, idx: 0 });
  }

  private replayMemory(group: string) {
    const m = this.memory.get(group);
    if (!m) return;
    m.showing = true;
    m.showT = -0.6;
    m.step = 0;
    m.idx = 0;
  }

  private onPad(pad: PadInfo) {
    const g = pad.def.group;
    const quest = this.lvl.friends.find((f) => f.def.quest?.group === g)?.def.quest;
    if (!quest || quest.type !== 'pads' || !this.activeGroup(g)) {
      pad.glow = 1;
      this.hooks.audio.play('note', { pitch: 0.9 + (pad.def.order ?? 0) * 0.15 });
      return;
    }
    if (quest.memory) {
      const m = this.memory.get(g);
      if (!m || m.showing) return;
      const pads = this.lvl.pads.filter((p) => p.def.group === g);
      this.hooks.audio.play('note', { pitch: 1 + pads.indexOf(pad) * 0.25 });
      pad.glow = 1;
      if (m.seq[m.idx] === pad) {
        m.idx++;
        if (m.idx >= m.seq.length) {
          for (const p of pads) p.lit = true;
          this.questReady(g);
        }
      } else {
        this.hooks.audio.play('softError');
        this.hooks.say('Ops', '🔁', 'Quase! Olhe a sequência de novo.');
        this.replayMemory(g);
      }
      return;
    }
    if (!pad.lit) {
      pad.lit = true;
      this.hooks.audio.play('note', { pitch: 1 + this.lvl.pads.filter((p) => p.def.group === g && p.lit).length * 0.15 });
      if (this.lvl.pads.filter((p) => p.def.group === g).every((p) => p.lit)) this.questReady(g);
    }
  }

  // ------------------------------------------------------------------ loop

  private lastPad: PadInfo | null = null;

  update(dt: number, player: CharacterBody) {
    this.t += dt;
    const p = player.pos;
    const center = new THREE.Vector3(p.x, p.y + 0.8, p.z);

    // Objetos de missão
    for (const it of this.lvl.questItems) {
      if (it.taken || it.obj.position.distanceTo(center) > 1.3) continue;
      it.taken = true;
      it.obj.visible = false;
      this.hooks.audio.play('collectible');
      const group = it.def.group;
      const got = this.lvl.questItems.filter((q) => q.def.group === group && q.taken).length;
      const quest = this.lvl.friends.find((f) => f.def.quest?.group === group)?.def.quest;
      const need = quest?.type === 'collect' ? quest.count : this.lvl.questItems.filter((q) => q.def.group === group).length;
      this.hooks.toast(it.def.icon, `Achou! ${got}/${need}`);
      this.hooks.particles.emit(it.obj.position, 20, { colors: [...FX_COLORS.magic], speed: 3, life: 0.8 });
      if (got >= need) this.questReady(group);
    }

    // Botões de chão
    const ground = player.grounded ? player.ground : null;
    const pad = ground?.tag === 'pad' ? this.lvl.pads.find((x) => x.collider === ground) ?? null : null;
    if (pad && pad !== this.lastPad) this.onPad(pad);
    this.lastPad = pad;

    // Mostrando a sequência de memória
    for (const [g, m] of this.memory) {
      if (!m.showing) continue;
      m.showT += dt;
      const each = this.params.hintLevel >= 2 ? 0.9 : 0.7;
      if (m.showT >= m.step * each && m.step < m.seq.length) {
        const pd = m.seq[m.step];
        pd.glow = 1;
        const pads = this.lvl.pads.filter((x) => x.def.group === g);
        this.hooks.audio.play('note', { pitch: 1 + pads.indexOf(pd) * 0.25 });
        m.step++;
      }
      if (m.step >= m.seq.length && m.showT > m.seq.length * each + 0.3) {
        m.showing = false;
        m.idx = 0;
      }
    }

    // Pega-pega
    for (const r of this.runners) this.updateRunner(r, p, dt);
  }

  private updateRunner(r: TagRunner, player: V3, dt: number) {
    const b = r.body;
    const [amin, amax] = r.info.def.area;
    if (r.tagged) {
      r.hop += dt;
      b.vel.x = b.vel.z = 0;
      if (b.grounded && r.hop > 0.9) {
        b.vel.y = 6;
        r.hop = 0;
      }
    } else {
      const dx = b.pos.x - player.x;
      const dz = b.pos.z - player.z;
      const d = Math.hypot(dx, dz);
      const speed = (r.info.def.speed ?? 4.4) * this.params.obstacleSpeedMul;
      let vx: number;
      let vz: number;
      if (d < 7) {
        // foge, desviando das bordas da área
        let ax = dx / (d || 1);
        let az = dz / (d || 1);
        const cx = (amin[0] + amax[0]) / 2;
        const cz = (amin[2] + amax[2]) / 2;
        const edge = Math.min(b.pos.x - amin[0], amax[0] - b.pos.x, b.pos.z - amin[2], amax[2] - b.pos.z);
        if (edge < 3) {
          ax += (cx - b.pos.x) * 0.25;
          az += (cz - b.pos.z) * 0.25;
          ax += -az * 0.6; // contorna em vez de encurralar
        }
        const l = Math.hypot(ax, az) || 1;
        vx = (ax / l) * speed;
        vz = (az / l) * speed;
      } else {
        r.wanderT -= dt;
        if (r.wanderT <= 0) {
          r.wanderDir = Math.random() * Math.PI * 2;
          r.wanderT = 1.5 + Math.random() * 2;
        }
        vx = Math.cos(r.wanderDir) * speed * 0.35;
        vz = Math.sin(r.wanderDir) * speed * 0.35;
      }
      b.vel.x += (vx - b.vel.x) * Math.min(1, dt * 6);
      b.vel.z += (vz - b.vel.z) * Math.min(1, dt * 6);
      if (b.hitWall && b.grounded) b.vel.y = 7;
      if (d < 1.35 && Math.abs(b.pos.y - player.y) < 1.6) {
        r.tagged = true;
        this.hooks.audio.play('collectible');
        this.hooks.particles.emit({ x: b.pos.x, y: b.pos.y + 1.5, z: b.pos.z }, 30, { colors: [...FX_COLORS.confetti], speed: 4, life: 1 });
        this.hooks.onTagged(this.taggedCount, this.tagTotal);
      }
    }
    b.vel.y -= 26 * dt;
    b.step(dt);
    b.pos.x = Math.min(amax[0], Math.max(amin[0], b.pos.x));
    b.pos.z = Math.min(amax[2], Math.max(amin[2], b.pos.z));
    const o = r.info.obj;
    o.position.set(b.pos.x, b.pos.y, b.pos.z);
    const sp = Math.hypot(b.vel.x, b.vel.z);
    if (sp > 0.3) o.rotation.y = Math.atan2(b.vel.x, b.vel.z) - Math.PI / 2;
    o.rotation.z = r.tagged ? 0 : Math.sin(this.t * 14) * Math.min(0.15, sp * 0.03);
  }

  /** Para testes: liga uma flag e abre portões dependentes. */
  devSetFlag(flag: string) {
    this.flags.add(flag);
    this.openGates();
  }

  /** Para testes: estado das missões. */
  debugState() {
    return {
      flags: [...this.flags],
      friends: Object.fromEntries(this.friendState),
      tagged: `${this.taggedCount}/${this.tagTotal}`,
    };
  }
}
