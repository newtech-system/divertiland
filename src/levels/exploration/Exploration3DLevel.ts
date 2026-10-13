import * as THREE from 'three';
import { createLogger } from '../../core/Logger';
import type { CharacterId } from '../../core/types';
import { CHARACTERS } from '../../data/characters';
import { REACH } from '../../data/reach';
import { ProceduralAnimator } from '../../engine/character/AnimationController';
import { CharacterController, type MoveIntent } from '../../engine/character/CharacterController';
import { CharacterModel } from '../../engine/character/CharacterModel';
import { otherCharacter } from '../../engine/character/looks';
import { CameraController } from '../../engine/CameraController';
import { FX_COLORS, Particles } from '../../engine/fx/Particles';
import type { LevelRunResult } from '../../systems/LevelResult';
import type { InProgressRun } from '../../systems/save/SaveTypes';
import type { LevelHost, LevelRuntime } from '../LevelRuntime';
import type { Collider, V3 } from '../../engine/physics/PhysicsWorld';
import { CheckpointManager } from './CheckpointManager';
import { CollectibleSystem, type PickupEvent } from './CollectibleSystem';
import type { LevelLayout } from './LayoutTypes';
import { LevelBuilder, type BuiltLevel, type Trigger } from './LevelBuilder';
import { QuestSystem } from './QuestSystem';

const log = createLogger('Exploration3D');

/**
 * TIPO A — EXPLORAÇÃO 3D (seção 9). Também serve de base para parkour, chão é lava e
 * trampolim, que são o mesmo motor com outros dados de fase.
 */
export class Exploration3DLevel implements LevelRuntime {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
  private lvl!: BuiltLevel;
  private controller!: CharacterController;
  private model!: CharacterModel;
  private animator!: ProceduralAnimator;
  private cam!: CameraController;
  private checkpoints!: CheckpointManager;
  private collect!: CollectibleSystem;
  private particles = new Particles(600);
  private shadow!: THREE.Mesh;
  private t = 0;
  private elapsed = 0;
  private paused = false;
  private finished = false;
  private respawning = false;
  private secretsFound: string[] = [];
  private shownMessages = new Set<string>();
  private pickups: PickupEvent[] = [];
  private falls = 0;
  private hits = 0;
  private bounces = 0;
  private hitCooldown = 0;
  private trailT = 0;
  private colliderDebug: THREE.Group | null = null;
  private guide: CharacterId;
  private projector = new THREE.Vector3();
  private lastAlmost = -10;
  private currentInteract: BuiltLevel['interactables'][number] | null = null;

  constructor(
    private host: LevelHost,
    private layoutLoader: () => Promise<LevelLayout>,
  ) {
    this.guide = otherCharacter(host.character);
  }

  async load(): Promise<void> {
    const h = this.host;
    const layout = await this.layoutLoader();
    const env = layout.environment;
    this.layoutKillY = layout.killY;
    this.side = layout.view === 'side';
    this.scene.background = new THREE.Color(env.background);
    this.scene.fog = new THREE.Fog(env.fog, env.fogNear, env.fogFar);
    const hemi = new THREE.HemisphereLight('#ffffff', '#ffb6dc', 1.7);
    const sun = new THREE.DirectionalLight('#ffffff', 1.3);
    sun.position.set(-4, 10, 3);
    this.scene.add(hemi, sun);

    const builder = new LevelBuilder({
      difficulty: h.difficulty,
      params: h.params,
      playerCharacter: h.character,
      guideCharacter: this.guide,
    });
    this.lvl = builder.build(layout);
    this.scene.add(this.lvl.root);
    this.scene.add(this.particles.points);
    this.particles.density = h.settings.reducedMotion ? 0.4 : h.settings.quality === 'low' ? 0.6 : 1;

    // Personagem
    this.controller = new CharacterController(this.lvl.world, h.params);
    this.model = new CharacterModel(h.character, h.look);
    this.animator = new ProceduralAnimator(this.model.rig);
    this.animator.reducedMotion = h.settings.reducedMotion;
    this.scene.add(this.model.object);
    this.shadow = blobShadow();
    this.scene.add(this.shadow);

    this.cam = new CameraController(this.camera, this.lvl.world);
    this.checkpoints = new CheckpointManager(this.lvl.checkpoints, {
      pos: { x: layout.spawn.pos[0], y: layout.spawn.pos[1], z: layout.spawn.pos[2] },
      yaw: layout.spawn.yaw,
    });
    this.collect = new CollectibleSystem(this.lvl, h.params.coinMagnetRadius);
    this.completeOn = layout.completeOn ?? 'finish';
    this.quests = new QuestSystem(
      this.lvl,
      {
        say: (name, icon, text) => h.hud.sayAs(name, icon, text),
        toast: (icon, text) => h.hud.toast(icon, text),
        mission: (text) => h.hud.setMission('🎯', text),
        audio: h.audio,
        particles: this.particles,
        reward: (n) => (this.bonusDivertis += n),
        finishLevel: () => this.complete(),
        stageDone: (id) => this.markStage(id),
        onTagged: (n, total) => {
          h.hud.toast('🙌', `Peguei! ${n}/${total}`);
          this.refreshHud();
          if (n >= total) {
            h.hud.say(this.guide, 'Você pegou todo mundo! Que pega-pega incrível!', '🎉');
            if (this.completeOn === 'allTagged') setTimeout(() => this.complete(), 1200);
          }
        },
      },
      h.params,
    );

    // Continuar partida salva (estado IN_PROGRESS)
    const r = h.resume;
    if (r && r.levelId === h.level.id && r.difficulty === h.difficulty) {
      this.collect.restore(r.collectedIds, r.collectiblesFound);
      this.secretsFound = [...r.secretsFound];
      this.elapsed = r.elapsedSec;
      if (r.checkpointId) this.checkpoints.activate(r.checkpointId);
      // Etapas e missões: sem isto, continuar uma aventura podia deixar a criança atrás
      // de um portão que ela já havia aberto (ou refazendo a história inteira).
      this.stagesDone = [...(r.stagesDone ?? [])];
      this.quests.restore(r.questFlags ?? [], r.questFriends ?? []);
      log.info(`Continuando do checkpoint ${r.checkpointId ?? 'início'}`);
    }
    const sp = this.checkpoints.respawnPoint();
    this.controller.teleport(sp.pos, sp.yaw);
    this.cam.snapBehind(sp.yaw);

    this.wireEvents();
    this.refreshHud();
    h.hud.setMission('🎯', h.level.tagline);
    this.render();
    // Boas-vindas do mascote guia
    setTimeout(() => {
      if (!this.finished) h.hud.say(this.guide, pick(CHARACTERS[this.guide].lines.welcome), '👋');
    }, 600);
  }

  private wireEvents() {
    const a = this.host.audio;
    const ev = this.controller.events;
    ev.onJump = () => a.play('jump');
    ev.onLand = (impact) => {
      if (impact > 7) {
        a.play('land', { volume: Math.min(1, impact / 18) });
        this.animator.trigger('land');
        const p = this.controller.position;
        this.particles.emit({ x: p.x, y: p.y + 0.1, z: p.z }, 8, { colors: [...FX_COLORS.dust], speed: 2.5, life: 0.4, size: 0.25, gravity: 1 });
      }
    };
    ev.onBounce = (count) => {
      this.bounces++;
      a.play('trampoline', { pitch: 1 + Math.min(count, 8) * 0.07 });
      const tr = this.lvl.trampolines.find((t) => t.collider === this.controller.body.ground);
      if (tr) tr.squash = 1;
      const p = this.controller.position;
      this.particles.emit({ x: p.x, y: p.y, z: p.z }, 10, { colors: [...FX_COLORS.confetti], speed: 4, life: 0.6, size: 0.25 });
    };
    ev.onClimbStep = () => a.play('climb', { pitch: 0.9 + Math.random() * 0.3 });
    ev.onClimbTop = () => a.play('pop');
  }

  // ------------------------------------------------------------------ loop

  update(dt: number): void {
    if (this.paused) return;
    this.t += dt;
    const h = this.host;
    const lvl = this.lvl;
    if (!this.finished) this.elapsed += dt;

    for (const u of lvl.updaters) u(this.t, dt);

    // Entrada → intenção de movimento relativa à câmera.
    // B06: a câmera se vira sozinha para ficar atrás de quem anda. Se a direção do
    // comando for recalculada a cada quadro, a referência muda DURANTE a corrida e
    // "frente" vira "trás" no meio do caminho (foi o que confundiu no teste).
    // Solução: congelar a referência enquanto o comando está pressionado e só
    // recalcular quando a criança solta ou mexe na câmera de propósito.
    const inp = h.input.state;
    const moveMag = Math.hypot(inp.moveX, inp.moveY);
    const lookingAround = Math.abs(inp.lookX) + Math.abs(inp.lookY) > 0.01;
    if (moveMag < 0.12 || lookingAround) this.heldBasis = null;
    if (!this.heldBasis) this.heldBasis = this.cam.planarBasis();
    const basis = this.heldBasis;
    const intent: MoveIntent = {
      x: this.side ? inp.moveX : basis.fx * inp.moveY + basis.rx * inp.moveX,
      z: this.side ? 0 : basis.fz * inp.moveY + basis.rz * inp.moveX,
      // Joystick empurrado até o fim = correr; no teclado, Shift corre.
      sprint: inp.sprint || (h.input.lastDevice !== 'keyboard' && Math.hypot(inp.moveX, inp.moveY) > 0.95),
      jumpPressed: inp.pressed.has('jump') || (this.side && inp.pressed.has('up')),
      jumpHeld: inp.jumpHeld,
    };
    if (this.autoRoute) this.autopilotIntent(intent);
    if (this.respawning) intent.x = intent.z = 0;
    if (!this.autoRoute) this.assist(dt, intent);

    // Zonas: escalada, piscina de bolinhas, câmera
    const p = this.controller.position;
    const center = { x: p.x, y: p.y + 0.7, z: p.z };
    let climb: Trigger | null = null;
    let inPit = false;
    let camZone: Trigger | null = null;
    for (const tr of lvl.triggers) {
      const inside = pointIn(center, tr);
      if (tr.kind === 'climb' && inside) climb = tr;
      if (tr.kind === 'ballpit' && inside) inPit = true;
      if (tr.kind === 'camera' && inside) camZone = tr;
    }
    this.controller.climbZone = climb ? { normal: climb.data.normal, topY: climb.data.topY } : null;
    this.controller.speedMul = inPit ? 0.7 : 1;
    this.cam.zoneDistance = camZone?.data.distance ?? null;
    this.cam.zonePitch = camZone?.data.pitch ?? null;

    this.controller.update(dt, intent);
    const body = this.controller.body;
    if (this.side) {
      body.pos.z = 0;
      body.vel.z = 0;
    }
    if (body.hitHead) this.checkBumpBlocks();
    this.quests.update(dt, body);
    for (const st of lvl.standables) st.update(body.grounded && body.ground === st.collider, dt);

    // Obstáculos que empurram
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.hitCooldown === 0 && !this.finished) {
      for (const hz of lvl.hazards) {
        const push = hz.test(this.controller.position, this.controller.body.radius);
        if (push) {
          this.controller.knockback(push.x, push.z, push.strength, 5);
          this.animator.trigger('bump');
          h.audio.play('bump');
          this.hits++;
          this.hitCooldown = 0.6;
          const pp = this.controller.position;
          this.particles.emit({ x: pp.x, y: pp.y + 1, z: pp.z }, 8, { colors: ['#ffffff', '#ffd60a'], speed: 3, life: 0.4 });
          break;
        }
      }
    }

    // Gatilhos de entrada/saída
    for (const tr of lvl.triggers) {
      const inside = pointIn(center, tr);
      if (inside && !tr.inside) this.onEnter(tr);
      tr.inside = inside;
    }
    // B34: a lava é perigo por CONTATO, não por uma caixa fina na altura do peito.
    // Antes dava para andar o percurso inteiro pisando na "lava" e chegar ao fim.
    if (!this.finished && !this.respawning && this.touchingLava()) this.respawn();
    if (this.controller.position.y < (this.layoutKillY ?? -6)) this.respawn();

    // Moedas e colecionáveis
    this.collect.update(this.t, dt, this.controller.position, this.pickups);
    for (const e of this.pickups) this.onPickup(e);

    // Interações (botões)
    this.updateInteract(inp.pressed.has('interact'));

    // Visual do personagem
    const loc = this.controller.locomotion();
    if (!this.finished) this.animator.setLocomotion(loc.state, loc.speed01);
    this.animator.update(dt);
    this.model.update(dt);
    const pos = this.controller.position;
    this.model.object.position.set(pos.x, pos.y, pos.z);
    this.model.object.rotation.y = this.controller.yaw;
    this.updateShadow();
    this.updateTrail(dt, loc.state);

    for (const n of lvl.npcs) {
      n.timer -= dt;
      if (n.timer <= 0) {
        n.animator.trigger(n.anim === 'dance' ? 'dance' : n.anim === 'wave' ? 'wave' : 'land');
        n.timer = n.anim === 'dance' ? 2.4 : 3 + Math.random() * 2;
      }
      n.animator.update(dt);
      n.model.update(dt);
    }

    // Dicas: brilhos guiando (Bicho-Preguiça)
    if (lvl.hintTrails.length && Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) {
      for (const trail of lvl.hintTrails)
        for (const pt of trail) this.particles.emit(pt, 1, { colors: [...FX_COLORS.magic], speed: 0.4, life: 1, size: 0.3, gravity: -0.5 });
    }

    // Câmera
    const v = this.controller.body.vel;
    if (this.side) this.updateSideCamera(dt);
    else this.cam.update(dt, pos, { x: inp.lookX, y: inp.lookY, zoom: inp.zoom }, { x: v.x, z: v.z, speed: Math.hypot(v.x, v.z) });
    this.updateFadeables(dt, pos);
    this.updateTouchables(dt, pos);
    this.particles.update(dt);
  }

  /**
   * Seção 7.2 — NADA tapa a visão da criança. Placas, bandeiras de checkpoint e balões
   * que entram entre a câmera e o personagem (ou logo à frente dele) ficam translúcidos
   * e voltam ao normal depois. Perigos e plataformas continuam visíveis.
   */
  private updateFadeables(dt: number, pos: V3) {
    const list = this.lvl.fadeables;
    if (!list.length) return;
    const cam = this.camera.position;
    // O segmento vai da câmera até 6 m ADIANTE da criança: a placa que atrapalha está
    // na frente dela (era o caso do "⬅️ Plataformas" cobrindo o salto), não em cima dela.
    this.camera.getWorldDirection(this.fadeDir);
    this.fadeA.set(pos.x, pos.y + 1.1, pos.z).addScaledVector(this.fadeDir, 6);
    for (const f of list) {
      f.object.getWorldPosition(this.fadeB);
      // Distância do objeto ao segmento câmera → personagem.
      this.fadeSeg.subVectors(this.fadeA, cam);
      const len2 = this.fadeSeg.lengthSq() || 1;
      const t = Math.max(0, Math.min(1, this.fadeB.clone().sub(cam).dot(this.fadeSeg) / len2));
      const near = this.fadeC.copy(cam).addScaledVector(this.fadeSeg, t).distanceTo(this.fadeB);
      const want = near < f.radius + 0.9 ? 1 : 0;
      f.faded = f.faded + (want - f.faded) * Math.min(1, dt * 9);
      const op = 1 - f.faded * 0.82;
      for (let i = 0; i < f.materials.length; i++) f.materials[i].opacity = f.baseOpacity[i] * op;
    }
  }

  /**
   * Enfeites que parecem prêmio (presentes, bolo) dão um "boing" quando a criança
   * encosta — fica claro que são enfeites, sem prometer recompensa (B33, seção 16).
   */
  private updateTouchables(dt: number, pos: V3) {
    for (const t of this.lvl.touchables) {
      if (t.wobble > 0) {
        t.wobble = Math.max(0, t.wobble - dt * 2.2);
        const k = t.wobble;
        t.obj.position.y = t.baseY + Math.sin(k * 22) * 0.07 * k;
        t.obj.rotation.z = Math.sin(k * 18) * 0.12 * k;
        continue;
      }
      const d = Math.hypot(t.pos.x - pos.x, t.pos.z - pos.z);
      if (d < t.radius + this.controller.body.radius && Math.abs(t.pos.y - pos.y) < 1.6) {
        t.wobble = 1;
        this.host.audio.play('pop', { volume: 0.35, pitch: 1.3 });
      }
    }
  }

  /**
   * ETAPAS INTERNAS DA AVENTURA (seção 8 do V2).
   * Cada etapa concluída avisa a criança, salva na hora (seção 7.4: "salvar por etapa
   * interna") e entra no resultado da aventura.
   */
  private stagesDone: string[] = [];
  private markStage(id: string): void {
    if (!id || this.stagesDone.includes(id)) return;
    this.stagesDone.push(id);
    this.host.audio.play('checkpoint');
    this.host.hud.toast('✅', 'Etapa concluída!');
    const snap = this.snapshot();
    if (snap) this.host.checkpoint(snap);
  }

  private fadeA = new THREE.Vector3();
  private fadeB = new THREE.Vector3();
  private fadeC = new THREE.Vector3();
  private fadeSeg = new THREE.Vector3();
  private fadeDir = new THREE.Vector3();

  /** Encostou na lava (em cima, de lado ou dentro)? Vale para qualquer face. */
  private touchingLava(): boolean {
    const body = this.controller.body;
    if (body.grounded && body.ground?.surface === 'lava') return true;
    const r = body.radius;
    const p = body.pos;
    // Começa um pouco acima dos pés: plataforma encostada na lava não pode matar
    // quem está em pé na beirada dela (o contato por cima já é tratado acima).
    const min = { x: p.x - r, y: p.y + 0.05, z: p.z - r };
    const max = { x: p.x + r, y: p.y + body.height * 0.6, z: p.z + r };
    for (const c of this.lvl.world.overlapping(min, max, this.lavaProbe)) if (c.surface === 'lava') return true;
    return false;
  }

  /** Referência frente/direita congelada enquanto o comando de andar está pressionado. */
  private heldBasis: { fx: number; fz: number; rx: number; rz: number } | null = null;
  private lavaProbe: Collider[] = [];
  private layoutKillY = -6;
  private quests!: QuestSystem;
  private completeOn: 'finish' | 'allTagged' = 'finish';
  private bonusDivertis = 0;
  /** Fase de plataforma 2D (vista lateral). */
  private side = false;
  private sideCam = { x: 0, y: 0, look: 0 };

  // ------------------------------------------------------------------ ajuda de controle (seção 6)

  private assistFalls = 0;
  private assistAskedAt = -99;
  private assistLedTo: string | null = null;
  private stuckAt: V3 | null = null;
  private stuckT = 0;
  private autoJumpCooldown = 0;

  /**
   * ASSISTÊNCIA DE CONTROLE — separada da complexidade da missão (seção 6).
   * No Bicho-Preguiça:
   *  - pulo automático contextual: chegando na beirada com uma plataforma ao alcance,
   *    o pulo sai sozinho (a criança não precisa acertar o tempo);
   *  - depois de cair algumas vezes no mesmo trecho, o guia oferece "Vamos juntos?"
   *    e conduz até o próximo ponto seguro.
   * Em TODOS os estilos: ninguém fica preso (seção 7.4).
   */
  private assist(dt: number, intent: MoveIntent) {
    const b = this.controller.body;
    const sloth = this.host.params.hintLevel >= 2;
    this.autoJumpCooldown = Math.max(0, this.autoJumpCooldown - dt);

    // --- Pulo automático contextual (só no estilo tranquilo)
    if (sloth && b.grounded && !this.side && this.autoJumpCooldown === 0) {
      const mag = Math.hypot(intent.x, intent.z);
      if (mag > 0.5 && this.noGroundAhead(intent, 0.75) && this.landingAhead(intent)) {
        intent.jumpPressed = true;
        intent.jumpHeld = true;
        this.autoJumpCooldown = 0.5;
      }
    }

    // --- Nunca ficar preso: parado, empurrando e sem sair do lugar
    const moving = Math.hypot(intent.x, intent.z) > 0.3;
    if (moving && !this.finished && !this.respawning) {
      if (!this.stuckAt || Math.hypot(b.pos.x - this.stuckAt.x, b.pos.z - this.stuckAt.z) > 0.6 || Math.abs(b.pos.y - this.stuckAt.y) > 0.6) {
        this.stuckAt = { ...b.pos };
        this.stuckT = 0;
      } else {
        this.stuckT += dt;
        if (this.stuckT > 3.5) {
          this.stuckT = 0;
          this.stuckAt = null;
          this.host.hud.say(this.guide, 'Acho que travamos aqui! Vou te levar de volta para o ponto seguro.', '🤝');
          void this.respawn();
        }
      }
    } else {
      this.stuckT = 0;
    }
  }

  /** Tem chão logo à frente na direção em que a criança anda? */
  private noGroundAhead(intent: MoveIntent, dist: number): boolean {
    const b = this.controller.body;
    const mag = Math.hypot(intent.x, intent.z) || 1;
    const x = b.pos.x + (intent.x / mag) * dist;
    const z = b.pos.z + (intent.z / mag) * dist;
    const hit = this.lvl.world.groundBelow(x, b.pos.y + 0.3, z, 1.2, b.radius * 0.6);
    return !hit || hit.collider.surface === 'lava';
  }

  /** Existe lugar para pousar dentro do alcance do pulo, seguindo em frente? */
  private landingAhead(intent: MoveIntent): boolean {
    const b = this.controller.body;
    const mag = Math.hypot(intent.x, intent.z) || 1;
    for (let d = 1.4; d <= REACH.jumpDistanceWalk; d += 0.5) {
      const x = b.pos.x + (intent.x / mag) * d;
      const z = b.pos.z + (intent.z / mag) * d;
      const hit = this.lvl.world.groundBelow(x, b.pos.y + REACH.jumpHeight, z, REACH.jumpHeight + 1.2, b.radius * 0.6);
      if (hit && hit.collider.surface !== 'lava' && hit.y <= b.pos.y + REACH.stepUpHeight) return true;
    }
    return false;
  }

  /**
   * Depois de cair várias vezes NO MESMO TRECHO, oferece ajuda de verdade (seção 6).
   * Aceitando, o guia leva a criança de mão até o próximo ponto seguro: escurece a tela,
   * coloca ela lá e só então diz "Chegamos" — nunca anuncia uma chegada que não houve.
   */
  private async maybeOfferHelp() {
    if (this.autoRoute) return; // piloto automático de teste não responde perguntas
    const sloth = this.host.params.hintLevel >= 2;
    const limit = sloth ? 3 : 6;
    const cpId = this.checkpoints.respawnId();
    if (this.assistLedTo === cpId) return;
    if (this.assistFalls < limit || this.t - this.assistAskedAt < 25) return;
    this.assistAskedAt = this.t;
    this.assistFalls = 0;
    // A ajuda NUNCA leva a criança para depois de um portão de missão que ainda está
    // fechado: isso pularia uma etapa da história (ou a deixaria presa do outro lado).
    const next = this.checkpoints.nextSafeCheckpoint((cp) => !cp.needsFlag || !!this.quests?.flags.has(cp.needsFlag));
    if (!next) return;
    const yes = await this.host.hud.offer(
      this.guide,
      'Esse trecho é osso duro! Quer ir junto comigo até o próximo ponto seguro?',
      { icon: '🤝', label: 'Vamos juntos!' },
      { icon: '💪', label: 'Deixa que eu tento' },
    );
    if (!yes) {
      this.host.hud.say(this.guide, 'Tá bom! Eu fico aqui torcendo por você!', '💪');
      return;
    }
    this.assistLedTo = cpId;
    const h = this.host;
    h.hud.say(this.guide, 'Segura na minha mão! A gente vai juntos.', '🤝');
    await new Promise((r) => setTimeout(r, 900));
    await h.hud.fade(true);
    // Ativa o checkpoint de destino (o progresso é de verdade) e coloca a criança lá.
    if (this.checkpoints.activate(next.id)) {
      const snap = this.snapshot();
      if (snap) h.checkpoint(snap);
    }
    const sp = this.checkpoints.respawnPoint();
    this.controller.teleport(sp.pos, sp.yaw);
    this.cam.snapBehind(sp.yaw);
    this.stuckAt = null;
    this.stuckT = 0;
    await h.hud.fade(false);
    h.audio.play('checkpoint');
    h.hud.say(this.guide, 'Chegamos! Daqui pra frente é com você. Eu fico torcendo!', '🤝');
  }

  // ------------------------------------------------------------------ piloto automático (testes de QA)

  private autoRoute: AutoWaypoint[] | null = null;
  private autoIndex = 0;
  private autoWait = 0;
  private autoLog: string[] = [];

  /** Segue a rota de teste: anda até cada ponto, pula em beiradas/paredes, espera em trampolins. */
  private autopilotIntent(intent: MoveIntent) {
    const route = this.autoRoute!;
    const wp = route[this.autoIndex];
    if (!wp) {
      intent.x = intent.z = 0;
      return;
    }
    const b = this.controller.body;
    const p = b.pos;
    if (this.autoWait > 0) {
      this.autoWait -= 1 / 60;
      intent.x = intent.z = 0;
      return;
    }
    const dx = wp.x - p.x;
    const dz = wp.z - p.z;
    const d = Math.hypot(dx, dz);
    if (wp.bounceTo !== undefined) {
      // Pula no trampolim até passar da altura e então segue para o próximo ponto.
      if (d > 0.5 && p.y < wp.bounceTo) {
        intent.x = dx / Math.max(d, 1e-3);
        intent.z = dz / Math.max(d, 1e-3);
        if (d < 1.2) intent.x = intent.z = 0;
      } else intent.x = intent.z = 0;
      intent.jumpPressed = b.grounded;
      intent.jumpHeld = true;
      if (p.y >= wp.bounceTo && b.vel.y > 0 && this.controller.bounces >= (wp.bounces ?? 0)) {
        this.autoLog.push(`bounce ok ${this.autoIndex} y=${p.y.toFixed(1)}`);
        this.autoIndex++;
      }
      return;
    }
    if (d < (wp.radius ?? 0.8) && (wp.y === undefined || (b.grounded && Math.abs(p.y - wp.y) < 1.5))) {
      this.autoLog.push(`wp ${this.autoIndex} ok`);
      if (wp.talk) {
        // MESMO caminho do botão ✋ / tecla E: exige estar perto de verdade. Se o piloto
        // não estiver ao alcance, nada acontece e a rota empaca — é isso que faz do teste
        // uma prova de que a missão dá para ser cumprida jogando.
        this.updateInteract(true);
        this.autoLog.push(`talk ${JSON.stringify(this.quests.debugState().friends)}`);
      }
      if (wp.devFlag) this.quests.devSetFlag(wp.devFlag);
      this.autoIndex++;
      this.autoWait = wp.wait ?? 0;
      return;
    }
    if (wp.needGround && b.grounded) {
      const g = this.lvl.world.groundBelow(wp.x, (wp.y ?? p.y) + 0.6, wp.z, 1.6);
      if (!g) {
        intent.x = intent.z = 0;
        return;
      }
    }
    const nx = dx / d;
    const nz = dz / d;
    intent.x = nx;
    intent.z = nz;
    intent.sprint = !!wp.sprint;
    intent.jumpHeld = true;
    if (b.grounded) {
      const ahead = this.lvl.world.groundBelow(p.x + nx * 0.5, p.y + 0.1, p.z + nz * 0.5, 2.5);
      const edge = !ahead || ahead.y < p.y - 0.6 || ahead.collider.surface === 'lava';
      const wantsUp = wp.y !== undefined && wp.y > p.y + 0.3;
      // Obstáculo vindo? Na vista lateral pula por cima; em 3D espera ele passar.
      const probe = { x: p.x + nx * 1.6, y: p.y, z: p.z + nz * 1.6 };
      const probe2 = { x: p.x + nx * 3, y: p.y, z: p.z + nz * 3 };
      const near = this.lvl.hazards.find((hz) => hz.test(probe, 0.6));
      if (near) {
        if (this.side || near.kind === 'spinner') intent.jumpPressed = true;
        else {
          intent.x = intent.z = 0;
          intent.jumpPressed = false;
        }
      } else if (!this.side && this.lvl.hazards.some((hz) => hz.kind !== 'spinner' && hz.test(probe2, 0.5))) {
        intent.x = intent.z = 0;
        intent.jumpPressed = false;
      }
      if (!ahead || (edge && (wp.y === undefined || wp.y >= p.y - 0.8)) || b.hitWall || (wp.jump && d < 2.2) || (wantsUp && d < 2.6)) intent.jumpPressed = true;
    }
  }

  /** Câmera de lado com "olhar à frente" na direção do movimento. */
  private updateSideCamera(dt: number) {
    const p = this.controller.position;
    const vx = this.controller.body.vel.x;
    const sc = this.sideCam;
    const want = Math.abs(vx) > 0.5 ? Math.sign(vx) * 2.5 : sc.look;
    sc.look += (want - sc.look) * Math.min(1, dt * 1.5);
    sc.x += (p.x + sc.look - sc.x) * Math.min(1, dt * 6);
    sc.y += (p.y - sc.y) * Math.min(1, dt * (p.y < sc.y ? 6 : 2.5));
    this.camera.position.set(sc.x, sc.y + 2.6, 12.5);
    this.camera.lookAt(sc.x, sc.y + 1.6, 0);
  }

  private checkBumpBlocks() {
    const b = this.controller.body;
    const p = b.pos;
    const top = p.y + b.height;
    for (const blk of this.lvl.bumpBlocks) {
      const c = blk.collider;
      if (blk.used || Math.abs(c.min.y - top) > 0.25) continue;
      if (p.x + b.radius < c.min.x || p.x - b.radius > c.max.x || p.z + b.radius < c.min.z || p.z - b.radius > c.max.z) continue;
      blk.used = true;
      blk.bump = 1;
      const mat = blk.mesh.material as THREE.MeshToonMaterial;
      mat.map = null;
      mat.color.set('#b48bff');
      mat.needsUpdate = true;
      if (blk.coin) {
        blk.coin.hidden = false;
        blk.coin.pos.y = c.max.y + 0.8;
      }
      this.host.audio.play('pop', { pitch: 1.3 });
      this.particles.emit({ x: (c.min.x + c.max.x) / 2, y: c.max.y + 0.3, z: (c.min.z + c.max.z) / 2 }, 14, { colors: ['#ffd60a', '#ffffff', '#ff3d9a'], speed: 3, life: 0.6 });
    }
  }

  render(): void {
    const r = this.host.renderer;
    const aspect = r.width / Math.max(1, r.height);
    this.camera.aspect = aspect;
    // Celular em pé: abre o campo de visão para enxergar o caminho à frente
    // (senão a tela fica "apertada" e a criança não vê para onde ir).
    this.camera.fov = aspect < 1 ? Math.min(82, 62 + (1 - aspect) * 34) : 62;
    this.camera.updateProjectionMatrix();
    this.particles.setViewportHeight(r.height);
    r.renderFull(this.scene, this.camera);
  }

  // ------------------------------------------------------------------ eventos

  private onEnter(tr: Trigger) {
    const h = this.host;
    switch (tr.kind) {
      case 'message': {
        const d = tr.data;
        if (this.shownMessages.has(d.id)) return;
        if (d.minHint > h.params.hintLevel) return;
        if (d.tutorial && !h.firstTime && h.params.hintLevel < 2) return;
        this.shownMessages.add(d.id);
        h.hud.say(this.guide, d.text, d.icon);
        if (d.mission) h.hud.setMission('🎯', d.mission);
        if (typeof d.stage === 'string') this.markStage(d.stage);
        break;
      }
      case 'secret': {
        const id = tr.data.id as string;
        if (this.secretsFound.includes(id)) return;
        this.secretsFound.push(id);
        h.audio.play('secret');
        h.hud.toast('🔍', 'Segredo descoberto!');
        h.hud.say(this.guide, pick(CHARACTERS[this.guide].lines.secret), '🤩');
        const p = this.controller.position;
        this.particles.emit({ x: p.x, y: p.y + 1.5, z: p.z }, 40, { colors: [...FX_COLORS.confetti], speed: 6, life: 1.2, size: 0.3 });
        this.refreshHud();
        break;
      }
      case 'checkpoint': {
        if (this.checkpoints.activate(tr.data.id)) {
          this.assistFalls = 0; // "3 quedas" conta por trecho, não pela fase inteira
          h.audio.play('checkpoint');
          h.hud.toast('🚩', 'Ponto de partida salvo!');
          const cp = this.checkpoints.get(tr.data.id)!;
          this.particles.emit({ x: cp.pos.x, y: cp.pos.y + 2, z: cp.pos.z }, 24, { colors: [...FX_COLORS.checkpoint], speed: 4, life: 0.9 });
          const snap = this.snapshot();
          if (snap) h.checkpoint(snap);
        }
        break;
      }
      case 'kill':
      case 'lava':
        this.respawn();
        break;
      case 'finish':
        if (this.lvl.finishStage) this.markStage(this.lvl.finishStage);
        this.complete();
        break;
    }
  }

  private onPickup(e: PickupEvent) {
    const h = this.host;
    if (e.type === 'collectible') {
      h.audio.play('collectible');
      const look = this.lvl.collectibles.find((c) => c.id === e.id)?.look ?? 'teddy';
      const same = this.lvl.collectibles.filter((c) => c.look === look);
      const n = same.filter((c) => c.taken).length;
      const total = same.length;
      const label = look === 'ring' ? 'Alvo' : look === 'paw' ? 'Pista' : 'Ursinho dourado';
      h.hud.toast(look === 'ring' ? '🎯' : look === 'paw' ? '🐾' : '🧸', `${label}! ${n}/${total}`);
      this.animator.trigger('pickup');
      this.particles.emit(e.pos, 30, { colors: ['#ffd60a', '#ffffff', '#ffb000'], speed: 5, life: 1, size: 0.3 });
      if (n === total) h.hud.say(this.guide, look === 'ring' ? 'Você acertou todos os alvos!' : look === 'paw' ? 'Todas as pistas! Que detetive!' : 'Você achou todos os ursinhos dourados!', look === 'ring' ? '🎯' : look === 'paw' ? '🐾' : '🧸');
    } else {
      h.audio.play(e.type === 'gem' ? 'gem' : 'coin', { pitch: 0.95 + Math.random() * 0.1 });
      this.particles.emit(e.pos, e.type === 'gem' ? 14 : 6, { colors: e.type === 'gem' ? ['#ff3d9a', '#ffffff', '#ff9ccc'] : [...FX_COLORS.coin], speed: 2.5, life: 0.5, size: 0.22 });
      this.projector.copy(e.pos).project(this.camera);
      const r = h.renderer;
      if (this.projector.z < 1) {
        h.hud.coinFly(((this.projector.x + 1) / 2) * r.width, ((1 - this.projector.y) / 2) * r.height, e.type === 'gem' ? 'gem' : 'coin');
      }
    }
    this.refreshHud();
  }

  private updateInteract(pressed: boolean) {
    const p = this.controller.position;
    let best: BuiltLevel['interactables'][number] | null = null;
    let bd = 3;
    for (const it of this.lvl.interactables) {
      if (it.used) continue;
      const d = Math.hypot(it.pos.x - p.x, it.pos.y - (p.y + 0.8), it.pos.z - p.z);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    if (best !== this.currentInteract) {
      this.currentInteract = best;
      this.host.hud.setPrompt(best ? best.icon : null);
    }
    if (best && pressed) {
      best.onInteract();
      this.animator.trigger(best.kind === 'talk' ? 'wave' : 'interact');
      if (best.kind !== 'talk') {
        this.host.audio.play('unlock');
        this.host.hud.toast('🔓', 'A porta abriu!');
        this.currentInteract = null;
        this.host.hud.setPrompt(null);
      }
    }
  }

  private async respawn() {
    if (this.respawning || this.finished) return;
    this.respawning = true;
    this.falls++;
    this.assistFalls++;
    const h = this.host;
    h.audio.play('whoosh');
    if (this.t - this.lastAlmost > 12) {
      this.lastAlmost = this.t;
      h.hud.say(this.guide, pick(CHARACTERS[this.guide].lines.almost), '💪');
    }
    await new Promise((r) => setTimeout(r, h.params.respawnDelay * 1000));
    await h.hud.fade(true);
    const sp = this.checkpoints.respawnPoint();
    this.controller.teleport(sp.pos, sp.yaw);
    this.cam.snapBehind(sp.yaw);
    if (this.autoRoute) {
      // Retoma do ponto 'cp' da rota mais próximo de onde o personagem reapareceu.
      let best = 0;
      let bd = Infinity;
      this.autoRoute.forEach((w, i) => {
        if (!w.cp || i > this.autoIndex) return;
        const d = Math.hypot(w.x - sp.pos.x, w.z - sp.pos.z) + Math.abs((w.y ?? sp.pos.y) - sp.pos.y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      this.autoLog.push(`fall at wp ${this.autoIndex} → ${best}`);
      this.autoIndex = best;
    }
    for (const tr of this.lvl.triggers) if (tr.kind === 'kill' || tr.kind === 'lava') tr.inside = false;
    h.audio.play('pop');
    await h.hud.fade(false);
    this.respawning = false;
    // Só oferece ajuda depois de reaparecer de verdade (nunca por cima do fade).
    await this.maybeOfferHelp();
  }

  private complete() {
    if (this.finished) return;
    this.finished = true;
    const h = this.host;
    this.controller.frozen = true;
    this.animator.setLocomotion('idle', 0);
    this.animator.trigger('celebrate');
    h.audio.play('victory');
    h.hud.say(this.guide, pick(CHARACTERS[this.guide].lines.finish), '🎉');
    h.hud.setPrompt(null);
    const p = this.controller.position;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.particles.emit({ x: p.x, y: p.y + 2.5, z: p.z }, 60, { colors: [...FX_COLORS.confetti], speed: 7, up: 3, life: 1.6, size: 0.3, gravity: 5 });
      }, i * 350);
    }
    setTimeout(() => h.finish(this.result(true)), 2300);
  }

  // ------------------------------------------------------------------ estado

  private result(completed: boolean): LevelRunResult {
    const flags: string[] = [];
    if (this.falls <= 2) flags.push('fewFalls');
    if (this.quests?.helpedEveryone) flags.push('helpedEveryone');
    for (const fl of this.quests?.flags ?? []) if (!flags.includes(fl)) flags.push(fl);
    if (this.hits <= 2) flags.push('fewHits');
    if (this.hits === 0) flags.push('noHits');
    return {
      levelId: this.host.level.id,
      difficulty: this.host.difficulty,
      completed,
      coinsCollected: this.collect.collectedCount,
      coinsTotal: this.collect.total,
      divertisCollected: this.collect.divertis + this.bonusDivertis,
      secretsFound: [...this.secretsFound],
      collectiblesFound: [...this.collect.collectiblesFound, ...this.taggedIds()],
      timeSec: this.elapsed,
      flags,
      stats: { trampolineBounces: this.bounces, falls: this.falls },
      stagesDone: [...this.stagesDone],
    };
  }

  partialResult(): LevelRunResult {
    return this.result(false);
  }

  snapshot(): InProgressRun | null {
    if (this.finished) return null;
    return {
      levelId: this.host.level.id,
      difficulty: this.host.difficulty,
      checkpointId: this.checkpoints.currentId,
      collectedIds: this.collect.takenIds(),
      secretsFound: [...this.secretsFound],
      collectiblesFound: [...this.collect.collectiblesFound],
      elapsedSec: this.elapsed,
      savedAt: Date.now(),
      stagesDone: [...this.stagesDone],
      questFlags: this.quests?.saveState().flags ?? [],
      questFriends: this.quests?.saveState().friends ?? [],
    };
  }

  private taggedIds(): string[] {
    return this.quests ? Array.from({ length: this.quests.taggedCount }, (_, i) => `tag_${i}`) : [];
  }

  private refreshHud() {
    const h = this.host;
    h.hud.setCoins(this.collect.collectedCount, this.collect.total);
    const r = this.result(false);
    r.completed = true;
    h.hud.setObjectives(
      h.level.objectives.map((o) => {
        let done = false;
        if (o.type === 'secret') done = this.secretsFound.includes(o.secretId);
        else if (o.type === 'collectibles') done = r.collectiblesFound.length >= o.count;
        else if (o.type === 'coinsRatio') done = r.coinsTotal > 0 && r.coinsCollected / r.coinsTotal >= o.ratio;
        else if (o.type === 'flag' && o.flag === 'helpedEveryone') done = !!this.quests?.helpedEveryone;
        let label = o.label;
        if (o.type === 'collectibles') label += ` (${Math.min(o.count, r.collectiblesFound.length)}/${o.count})`;
        if (o.type === 'coinsRatio') label += ` (${Math.ceil(r.coinsTotal * o.ratio)})`;
        return { icon: o.icon, label, done };
      }),
    );
  }

  setPaused(p: boolean): void {
    this.paused = p;
  }

  restartFromCheckpoint(): void {
    this.respawning = false;
    const sp = this.checkpoints.respawnPoint();
    this.controller.teleport(sp.pos, sp.yaw);
    this.cam.snapBehind(sp.yaw);
  }

  private updateShadow() {
    const p = this.controller.position;
    const g = this.lvl.world.groundBelow(p.x, p.y + 0.1, p.z, 30);
    if (g) {
      const hgt = p.y - g.y;
      this.shadow.visible = true;
      this.shadow.position.set(p.x, g.y + 0.03, p.z);
      const s = Math.max(0.35, 1 - hgt * 0.08);
      this.shadow.scale.set(s, s, s);
      (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.35 * s;
    } else this.shadow.visible = false;
  }

  private updateTrail(dt: number, state: string) {
    const colors = this.model.trailColors;
    if (!colors || state === 'idle') return;
    this.trailT -= dt;
    if (this.trailT > 0) return;
    this.trailT = 0.04;
    const p = this.controller.position;
    this.particles.emit({ x: p.x, y: p.y + 0.4, z: p.z }, 1, { colors, speed: 0.5, life: 0.7, size: 0.28, gravity: -0.4 });
  }

  dispose(): void {
    this.model.dispose();
    this.particles.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    for (const n of this.lvl.npcs) n.model.dispose();
    this.scene.clear();
  }

  // ------------------------------------------------------------------ ferramentas de dev

  dev = {
    checkpoints: () => this.checkpoints.ids(),
    teleportTo: (id: string) => {
      const cp = this.checkpoints.get(id);
      if (!cp) return;
      this.controller.teleport({ x: cp.pos.x, y: cp.pos.y + 0.5, z: cp.pos.z + 1 }, cp.yaw);
      this.cam.snapBehind(cp.yaw);
    },
    /**
     * QA da seção 7.2: olhando de onde a criança está, algum enfeite/placa/bandeira
     * continua OPACO entre a câmera e o que ela precisa ver? Devolve os culpados.
     */
    viewObstructions: () => {
      const ray = new THREE.Raycaster();
      const p = this.controller.position;
      const chest = new THREE.Vector3(p.x, p.y + 1.1, p.z);
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const objs = this.lvl.fadeables.map((f) => f.object);
      const bad: { label: string; dist: number; opacity: number }[] = [];
      for (const ahead of [0, 2, 4, 6]) {
        const target = chest.clone().addScaledVector(dir, ahead);
        const from = this.camera.position;
        const d = target.clone().sub(from);
        const len = d.length();
        ray.set(from, d.normalize());
        ray.far = len;
        for (const hit of ray.intersectObjects(objs, true)) {
          const f = this.lvl.fadeables.find((x) => hit.object === x.object || x.object.children.includes(hit.object as never));
          const op = f ? 1 - f.faded * 0.82 : 1;
          if (op > 0.5) bad.push({ label: hit.object.name || hit.object.type, dist: +hit.distance.toFixed(2), opacity: +op.toFixed(2) });
        }
      }
      return bad;
    },
    toggleColliders: () => {
      if (!this.colliderDebug) {
        this.colliderDebug = new THREE.Group();
        const mat = new THREE.LineBasicMaterial({ color: '#ff0000' });
        for (const c of this.lvl.world.colliders) {
          const box = new THREE.Box3(new THREE.Vector3(c.min.x, c.min.y, c.min.z), new THREE.Vector3(c.max.x, c.max.y, c.max.z));
          const helper = new THREE.Box3Helper(box, c.surface === 'trampoline' ? '#00ff88' : '#ff2266');
          (helper.material as THREE.Material).dispose();
          helper.material = mat;
          this.colliderDebug.add(helper);
        }
        for (const t of this.lvl.triggers) {
          const box = new THREE.Box3(new THREE.Vector3(t.min.x, t.min.y, t.min.z), new THREE.Vector3(t.max.x, t.max.y, t.max.z));
          this.colliderDebug.add(new THREE.Box3Helper(box, '#ffff00'));
        }
        this.colliderDebug.visible = false;
        this.scene.add(this.colliderDebug);
      }
      this.colliderDebug.visible = !this.colliderDebug.visible;
    },
    complete: (stars: 1 | 2 | 3) => {
      if (stars >= 2) this.collect.collectAll(this.pickups);
      if (stars >= 3) for (const id of this.lvl.secretIds) if (!this.secretsFound.includes(id)) this.secretsFound.push(id);
      this.refreshHud();
      this.complete();
    },
    collectAll: () => {
      this.collect.collectAll(this.pickups);
      this.refreshHud();
    },
    /** Usado por testes automáticos no navegador. */
    state: () => ({
      pos: { ...this.controller.position },
      grounded: this.controller.body.grounded,
      coins: this.collect.collectedCount,
      total: this.collect.total,
      checkpoint: this.checkpoints.currentId,
      secrets: [...this.secretsFound],
      teddies: [...this.collect.collectiblesFound],
      finished: this.finished,
      falls: this.falls,
      quests: this.quests.debugState(),
    }),
    /** Conversa com um amigo (teste automático). */
    talk: (id: string) => this.lvl.friends.find((f) => f.def.id === id)?.interact.onInteract(),
    teleport: (x: number, y: number, z: number, yaw = 0) => {
      this.controller.teleport({ x, y, z }, yaw);
      this.cam.snapBehind(yaw);
    },
    press: (dt: number) => this.update(dt),
    /** Liga o piloto automático com uma rota (ver AutoWaypoint). */
    autopilot: (route: AutoWaypoint[] | null) => {
      this.autoRoute = route;
      this.autoIndex = 0;
      this.autoLog = [];
    },
    autoStatus: () => ({ index: this.autoIndex, total: this.autoRoute?.length ?? 0, log: this.autoLog.slice(-6) }),
  };
}

/** Ponto de rota do piloto automático de testes. */
export interface AutoWaypoint {
  x: number;
  z: number;
  y?: number;
  radius?: number;
  jump?: boolean;
  sprint?: boolean;
  wait?: number;
  /** Conversa/aperta o que estiver ao alcance (como a criança aperta ✋). */
  talk?: boolean;
  /** Ficar pulando no trampolim até passar desta altura. */
  bounceTo?: number;
  /** Mínimo de quiques antes de sair do trampolim. */
  bounces?: number;
  /** Ponto de recomeço: ao cair, o piloto volta para cá. */
  cp?: boolean;
  /** Só pula para este ponto quando houver chão nele (plataformas que andam/somem). */
  needGround?: boolean;
  /** (QA) Ao chegar aqui, liga esta flag de missão (simula a missão cumprida). */
  devFlag?: string;
}

function pointIn(p: { x: number; y: number; z: number }, t: Trigger) {
  return p.x >= t.min.x && p.x <= t.max.x && p.y >= t.min.y && p.y <= t.max.y && p.z >= t.min.z && p.z <= t.max.z;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function blobShadow(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(40,10,80,1)');
  g.addColorStop(1, 'rgba(40,10,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.35 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 5;
  return m;
}
