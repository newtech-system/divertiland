import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { CharacterId } from '../../core/types';
import { PATTERN_ITEMS, PUZZLE_COLORS, PUZZLE_SHAPES, PUZZLE_W1_L04, type PuzzleData, type PuzzleStage } from '../../data/levels/w1_l04';
import { ProceduralAnimator } from '../../engine/character/AnimationController';
import { CharacterModel } from '../../engine/character/CharacterModel';
import { defaultLook, otherCharacter } from '../../engine/character/looks';
import { FX_COLORS, Particles } from '../../engine/fx/Particles';
import { PALETTE, checkerTexture, textTexture, toon } from '../../engine/materials';
import { makeProp } from '../../engine/props/Props';
import type { LevelRunResult } from '../../systems/LevelResult';
import { h, wait } from '../../ui/dom';
import type { LevelHost, LevelRuntime } from '../LevelRuntime';

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/**
 * TIPO E — PUZZLES (seção 13): a criança resolve problemas DENTRO da aventura (abrir a
 * porta), não uma prova. Errar só faz a porta "piscar" e tentar de novo.
 */
export class PuzzleLevel implements LevelRuntime {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  private data: PuzzleData = PUZZLE_W1_L04;
  private particles = new Particles(400);
  private door!: THREE.Mesh;
  private lockLamps: THREE.Mesh[] = [];
  private colorPanels: THREE.Mesh[] = [];
  private npc!: { model: CharacterModel; animator: ProceduralAnimator };
  private guide: CharacterId;
  private panel!: HTMLElement;
  private stageIndex = 0;
  private hintsLeft = 0;
  private hintsUsed = 0;
  private mistakes = 0;
  private elapsed = 0;
  private t = 0;
  private paused = false;
  private finished = false;
  private doorOpen = 0;
  private busy = false;
  private earned = 0;
  /** Ação de dica do estágio atual. */
  private hintAction: (() => void) | null = null;
  private disposed = false;

  constructor(private host: LevelHost) {
    this.guide = otherCharacter(host.character);
  }

  async load(): Promise<void> {
    const h0 = this.host;
    this.buildScene();
    this.hintsLeft = this.data.hints[h0.difficulty];
    this.panel = h('div', { class: 'puzzle-panel' });
    h0.hud.mountPanel(this.panel);
    h0.hud.setControls('pointer');
    h0.hud.showCoins(false);
    if (h0.params.hintLevel === 0) h0.hud.setTimer(0);
    this.refreshHud();
    h0.hud.setMission('🚪', 'Abra os 3 cadeados');
    this.render();
    void this.run();
  }

  private buildScene() {
    const s = this.scene;
    s.background = new THREE.Color('#e9dcff');
    s.add(new THREE.HemisphereLight('#ffffff', '#ffc6e6', 1.7));
    const d = new THREE.DirectionalLight('#ffffff', 1.1);
    d.position.set(3, 6, 6);
    s.add(d);
    const floorTex = checkerTexture('#f3e9ff', '#dcc8ff', 2).clone();
    floorTex.needsUpdate = true;
    floorTex.repeat.set(8, 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), toon('#ffffff', { map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    s.add(floor);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 0.5), toon('#c9a8ff'));
    wall.position.set(0, 6, -0.25);
    s.add(wall);
    // Luz atrás da porta (aparece quando abre)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5), toon('#fff6c9', { unlit: true }));
    glow.position.set(0, 2.5, -0.01);
    s.add(glow);
    // Moldura e porta
    const frame = new THREE.Mesh(new RoundedBoxGeometry(4.4, 6, 0.6, 3, 0.25), toon(PALETTE.yellow));
    frame.position.set(0, 2.9, 0.05);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5.1, 0.7), toon('#fff6c9', { unlit: true }));
    hole.position.set(0, 2.55, 0.05);
    s.add(frame, hole);
    this.door = new THREE.Mesh(new RoundedBoxGeometry(3.4, 5, 0.35, 3, 0.15), toon(PALETTE.purple));
    this.door.position.set(0, 2.5, 0.45);
    s.add(this.door);
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), toon('#ffffff', { map: textTexture('D', { color: '#ff3d9a', bg: '#ffffff', font: 210, width: 256, height: 256 }) }));
    logo.position.set(0, 1.0, 0.18);
    this.door.add(logo);
    // Cadeados (lâmpadas)
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshToonMaterial({ color: '#ff5470', emissive: '#7a0020' }));
      lamp.position.set(-1 + i, -0.3, 0.2);
      this.door.add(lamp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 24), toon('#ffffff'));
      ring.position.copy(lamp.position);
      this.door.add(ring);
      const keyhole = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), toon('#ffffff', { map: textTexture('🔒', { font: 180, width: 256, height: 256 }) }));
      keyhole.position.set(-1 + i, -0.95, 0.19);
      this.door.add(keyhole);
      this.lockLamps.push(lamp);
    }
    // Painéis de luz coloridos (sequência da memória)
    PUZZLE_COLORS.forEach((c, i) => {
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.color).multiplyScalar(0.45) }));
      p.position.set(-1.2 + i * 0.8, -1.8, 0.19);
      this.door.add(p);
      this.colorPanels.push(p);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.3), toon('#ffffff', { unlit: true, map: textTexture('PORTA MISTERIOSA', { color: '#ffffff', glow: '#ff3d9a', font: 120 }) }));
    sign.position.set(0, 6.9, 0.1);
    s.add(sign);
    // Decoração
    const props: [Parameters<typeof makeProp>[0], number, number, string, number][] = [
      ['balloon', -3.6, 0.6, PALETTE.pink, 1.6],
      ['balloon', -4.1, 0.9, PALETTE.cyan, 1.8],
      ['balloon', 3.8, 0.7, PALETTE.yellow, 1.7],
      ['plant', 4.4, 1, PALETTE.pink, 2],
      ['cushion', -4.2, 1.6, PALETTE.green, 1.4],
      ['present', 3.3, 1.8, PALETTE.cyan, 1.5],
      ['stack', -3.0, 2.2, PALETTE.orange, 1.6],
    ];
    for (const [k, x, z, c, sc] of props) {
      const o = makeProp(k, c, PALETTE.yellow, sc);
      o.position.set(x, 0, z);
      s.add(o);
    }
    const model = new CharacterModel(this.guide, defaultLook(this.guide));
    model.object.position.set(-2.9, 0, 2.2);
    model.object.rotation.y = 0.5;
    s.add(model.object);
    this.npc = { model, animator: new ProceduralAnimator(model.rig) };
    s.add(this.particles.points);
  }

  // ------------------------------------------------------------------ fluxo

  private async run() {
    const h0 = this.host;
    await wait(500);
    h0.hud.say(this.guide, this.data.intro, '🚪');
    await wait(2600);
    for (this.stageIndex = 0; this.stageIndex < this.data.stages.length; this.stageIndex++) {
      if (this.disposed) return;
      const st = this.data.stages[this.stageIndex];
      h0.hud.say(this.guide, st.intro, ['🧠', '🔷', '🔮'][this.stageIndex]);
      await this.playStage(st);
      if (this.disposed) return;
      await this.openLock(this.stageIndex);
    }
    await this.openDoor();
  }

  private playStage(st: PuzzleStage): Promise<void> {
    if (st.type === 'simon') return this.simon(st.length[this.host.difficulty]);
    if (st.type === 'shapes') return this.shapes(st.count[this.host.difficulty]);
    return this.pattern(st.rounds[this.host.difficulty]);
  }

  private hintButton(): HTMLElement {
    const b = h('button', { class: 'btn round yellow hint-btn', 'aria-label': 'Dica', onclick: () => this.useHint() }, '💡');
    if (this.hintsLeft !== Infinity) b.append(h('span', { class: 'count' }, String(this.hintsLeft)));
    if (this.hintsLeft <= 0) b.classList.add('disabled');
    return b;
  }

  private useHint() {
    if (this.paused || this.finished) return;
    if (this.hintsLeft <= 0 || !this.hintAction) {
      this.host.audio.play('softError');
      return;
    }
    this.hintsLeft--;
    this.hintsUsed++;
    this.host.audio.play('secret');
    this.hintAction();
    this.panel.querySelector('.hint-btn')?.replaceWith(this.hintButton());
  }

  private mistake(text = 'Quase! Tenta de novo!') {
    this.mistakes++;
    this.host.audio.play('softError');
    this.host.hud.say(this.guide, text, '💪');
    this.door.position.x = 0.12;
  }

  // ---------- 1) memória (sequência de luzes) ----------
  private async simon(maxLen: number) {
    const lengths: number[] = [];
    for (let n = Math.max(2, maxLen - 2); n <= maxLen; n++) lengths.push(n);
    const seq: number[] = [];
    while (seq.length < maxLen) seq.push(Math.floor(Math.random() * PUZZLE_COLORS.length));
    this.simonSeq = seq;
    const buttons = PUZZLE_COLORS.map((c, i) =>
      h('button', { class: 'simon-btn', style: `--c:${c.color}`, 'aria-label': c.id, dataset: { i: String(i) } }, c.symbol),
    );
    const status = h('div', { class: 'puzzle-status' }, '👀 Olhe!');
    const roundDots = h('div', { class: 'step-dots' });
    this.panel.replaceChildren(h('div', { class: 'puzzle-box' }, h('div', { class: 'row center' }, roundDots, status), h('div', { class: 'row center', style: 'gap:14px' }, ...buttons, this.hintButton())));

    const flash = async (i: number, ms = 420) => {
      buttons[i].classList.add('lit');
      (this.colorPanels[i].material as THREE.MeshBasicMaterial).color.set(PUZZLE_COLORS[i].color);
      this.host.audio.play('note', { pitch: [1, 1.26, 1.5, 1.68][i] });
      await wait(ms);
      buttons[i].classList.remove('lit');
      (this.colorPanels[i].material as THREE.MeshBasicMaterial).color.set(new THREE.Color(PUZZLE_COLORS[i].color).multiplyScalar(0.45));
    };
    const slow = this.host.params.hintLevel >= 2 ? 1.35 : this.host.params.hintLevel === 0 ? 0.8 : 1;

    for (let r = 0; r < lengths.length; r++) {
      roundDots.replaceChildren(...lengths.map((_, i) => h('span', { class: i <= r ? 'on' : '' })));
      const len = lengths[r];
      let solved = false;
      while (!solved) {
        if (this.disposed) return;
        // Mostra a sequência
        this.busy = true;
        status.textContent = '👀 Olhe!';
        await wait(700);
        for (let k = 0; k < len; k++) {
          await flash(seq[k], 450 * slow);
          await wait(180 * slow);
        }
        this.busy = false;
        status.textContent = '👆 Sua vez!';
        this.hintAction = () => void (async () => {
          this.busy = true;
          for (let k = 0; k < len; k++) {
            await flash(seq[k], 450 * slow);
            await wait(180 * slow);
          }
          this.busy = false;
        })();
        // Lê os toques da criança
        const ok = await new Promise<boolean>((resolve) => {
          let pos = 0;
          const onTap = (e: Event) => {
            if (this.busy || this.paused) return;
            const i = Number((e.currentTarget as HTMLElement).dataset.i);
            void flash(i, 220);
            if (i === seq[pos]) {
              pos++;
              if (pos === len) {
                cleanup();
                resolve(true);
              }
            } else {
              cleanup();
              resolve(false);
            }
          };
          const cleanup = () => buttons.forEach((b) => b.removeEventListener('click', onTap));
          buttons.forEach((b) => b.addEventListener('click', onTap));
          this.simonTap = (i: number) => buttons[i].click();
        });
        this.hintAction = null;
        if (ok) {
          solved = true;
          this.host.audio.play('star', { pitch: 1 + r * 0.1 });
          status.textContent = '✨ Isso!';
          await wait(500);
        } else {
          this.mistake('Quase! Olhe as luzes de novo!');
          await wait(900);
        }
      }
    }
  }
  /** Para testes automáticos. */
  simonSeq: number[] = [];
  simonTap: ((i: number) => void) | null = null;

  // ---------- 2) formas (encaixe) ----------
  private shapes(count: number) {
    return new Promise<void>((resolve) => {
      const chosen = shuffle(PUZZLE_SHAPES).slice(0, count);
      let selected: string | null = null;
      let filled = 0;
      const holes = chosen.map((s) => h('button', { class: 'shape-hole', 'aria-label': `buraco ${s.id}`, dataset: { id: s.id } }, s.symbol));
      const pieces = shuffle(chosen).map((s) =>
        h('button', { class: 'shape-piece', style: `--c:${s.color}`, 'aria-label': `peça ${s.id}`, dataset: { id: s.id } }, s.symbol),
      );
      const status = h('div', { class: 'puzzle-status' }, '👆 Toque numa peça');
      this.panel.replaceChildren(
        h('div', { class: 'puzzle-box' }, status, h('div', { class: 'row center wrap', style: 'gap:10px' }, ...holes), h('div', { class: 'row center wrap', style: 'gap:10px' }, ...pieces, this.hintButton())),
      );
      const select = (id: string | null) => {
        selected = id;
        pieces.forEach((p) => p.classList.toggle('selected', p.dataset.id === id));
        status.textContent = id ? '👇 Agora toque no buraco igual' : '👆 Toque numa peça';
      };
      pieces.forEach((p) =>
        p.addEventListener('click', () => {
          if (this.paused || p.classList.contains('used')) return;
          this.host.audio.play('pop');
          select(p.dataset.id!);
        }),
      );
      holes.forEach((hole) =>
        hole.addEventListener('click', () => {
          if (this.paused || hole.classList.contains('filled')) return;
          if (!selected) {
            status.textContent = '👆 Primeiro escolha uma peça';
            return;
          }
          if (hole.dataset.id === selected) {
            const piece = pieces.find((p) => p.dataset.id === selected)!;
            piece.classList.add('used');
            hole.classList.add('filled');
            hole.style.setProperty('--c', PUZZLE_SHAPES.find((s) => s.id === selected)!.color);
            this.host.audio.play('note', { pitch: 1 + filled * 0.12 });
            filled++;
            select(null);
            if (filled === count) {
              this.hintAction = null;
              this.host.audio.play('star');
              resolve();
            }
          } else {
            hole.classList.add('wobble');
            setTimeout(() => hole.classList.remove('wobble'), 400);
            this.mistake('Hmm, esse buraco tem outra forma. Tenta outro!');
          }
        }),
      );
      this.hintAction = () => {
        const remaining = pieces.filter((p) => !p.classList.contains('used'));
        const id = selected && remaining.some((p) => p.dataset.id === selected) ? selected : remaining[0]?.dataset.id;
        if (!id) return;
        select(id);
        const hole = holes.find((x) => x.dataset.id === id)!;
        hole.classList.add('hinted');
        setTimeout(() => hole.classList.remove('hinted'), 2500);
      };
    });
  }

  // ---------- 3) padrão (o que vem depois?) ----------
  private async pattern(rounds: number) {
    const templates = [
      [0, 1, 0, 1, 0, 1],
      [0, 0, 1, 0, 0, 1],
      [0, 1, 2, 0, 1, 2],
      [0, 1, 1, 0, 1, 1],
      [0, 1, 2, 2, 0, 1, 2, 2],
    ];
    for (let r = 0; r < rounds; r++) {
      if (this.disposed) return;
      const tpl = templates[Math.min(templates.length - 1, r + (this.host.params.hintLevel === 0 ? 1 : 0))];
      const items = shuffle(PATTERN_ITEMS).slice(0, 3);
      const shown = tpl.slice(0, tpl.length - 1).map((k) => items[k]);
      const answer = items[tpl[tpl.length - 1]];
      const options = shuffle([answer, ...shuffle(PATTERN_ITEMS.filter((x) => x !== answer)).slice(0, 2)]);
      await new Promise<void>((resolve) => {
        const status = h('div', { class: 'puzzle-status' }, `🔮 O que vem depois? (${r + 1}/${rounds})`);
        const row = h('div', { class: 'pattern-row' }, ...shown.map((x) => h('span', null, x)), h('span', { class: 'q' }, '❓'));
        const opts = options.map((o) => h('button', { class: 'pattern-opt', 'aria-label': o }, o));
        this.panel.replaceChildren(h('div', { class: 'puzzle-box' }, status, row, h('div', { class: 'row center', style: 'gap:14px' }, ...opts, this.hintButton())));
        opts.forEach((b) =>
          b.addEventListener('click', () => {
            if (this.paused || b.classList.contains('gone')) return;
            if (b.textContent === answer) {
              row.querySelector('.q')!.textContent = answer;
              row.querySelector('.q')!.classList.add('ok');
              this.host.audio.play('star', { pitch: 1 + r * 0.1 });
              this.hintAction = null;
              setTimeout(resolve, 700);
            } else {
              b.classList.add('wobble');
              setTimeout(() => b.classList.remove('wobble'), 400);
              this.mistake('Olhe de novo a ordem das coisas!');
            }
          }),
        );
        this.hintAction = () => {
          const wrong = opts.find((b) => b.textContent !== answer && !b.classList.contains('gone'));
          wrong?.classList.add('gone');
        };
        this.patternAnswer = answer;
      });
    }
  }
  patternAnswer = '';

  private async openLock(i: number) {
    const h0 = this.host;
    const lamp = this.lockLamps[i];
    const m = lamp.material as THREE.MeshToonMaterial;
    m.color.set('#39ff88');
    m.emissive.set('#0d7a3d');
    h0.audio.play('unlock');
    this.earned += 10;
    const wp = new THREE.Vector3();
    lamp.getWorldPosition(wp);
    this.particles.emit(wp, 30, { colors: [...FX_COLORS.checkpoint], speed: 4, life: 0.9 });
    this.npc.animator.trigger('celebrate');
    h0.hud.toast('🔓', `Cadeado ${i + 1} aberto!`);
    this.refreshHud();
    h0.hud.setMission('🚪', `Cadeados abertos: ${i + 1}/3`);
    await wait(1400);
  }

  private async openDoor() {
    const h0 = this.host;
    this.finished = true;
    this.panel.replaceChildren();
    h0.audio.play('victory');
    h0.hud.say(this.guide, 'A porta abriu! Você é muito esperto!', '🎉');
    this.doorOpen = 0.001;
    this.npc.animator.trigger('dance');
    for (let i = 0; i < 4; i++)
      setTimeout(() => this.particles.emit({ x: 0, y: 3, z: 1 }, 60, { colors: [...FX_COLORS.confetti], speed: 7, up: 2, life: 1.6, size: 0.3, gravity: 4 }), 600 + i * 300);
    await wait(2600);
    if (!this.disposed) h0.finish(this.result(true));
  }

  // ------------------------------------------------------------------ loop

  update(dt: number): void {
    if (this.paused) return;
    this.t += dt;
    if (!this.finished) this.elapsed += dt;
    if (this.host.input.state.pressed.has('hint')) this.useHint();
    this.door.position.x *= Math.exp(-12 * dt);
    if (Math.abs(this.door.position.x) > 0.01) this.door.position.x = -this.door.position.x * 0.9;
    if (this.doorOpen > 0) {
      this.doorOpen = Math.min(1, this.doorOpen + dt * 0.6);
      this.door.position.y = 2.5 + this.doorOpen * 5.2;
    }
    this.npc.animator.setLocomotion('idle', 0);
    this.npc.animator.update(dt);
    this.npc.model.update(dt);
    this.particles.update(dt);
    if (this.host.params.hintLevel === 0 && !this.finished) this.host.hud.setTimer(this.elapsed);
  }

  render(): void {
    const r = this.host.renderer;
    const aspect = r.width / Math.max(1, r.height);
    this.camera.aspect = aspect;
    // Em telas estreitas a câmera se afasta para caber a porta toda.
    const dist = aspect < 1 ? 14 : 11.5;
    this.camera.position.set(Math.sin(this.t * 0.3) * 0.4, 3.2, dist);
    // Olha abaixo da porta: ela fica na parte de cima da tela, livre do painel do puzzle.
    this.camera.lookAt(0, aspect < 1 ? 1.2 : 1.6, 0);
    this.camera.updateProjectionMatrix();
    this.particles.setViewportHeight(r.height);
    r.renderFull(this.scene, this.camera);
  }

  private refreshHud() {
    const h0 = this.host;
    h0.hud.setObjectives(h0.level.objectives.map((o) => ({ icon: o.icon, label: o.label, done: false })));
  }

  private result(completed: boolean): LevelRunResult {
    const flags: string[] = [];
    if (this.hintsUsed <= 1) flags.push('fewHints');
    if (this.hintsUsed === 0) flags.push('noHints');
    if (this.mistakes <= 2) flags.push('fewMistakes');
    return {
      levelId: this.host.level.id,
      difficulty: this.host.difficulty,
      completed,
      coinsCollected: 0,
      coinsTotal: 0,
      divertisCollected: this.earned,
      secretsFound: [],
      collectiblesFound: [],
      timeSec: this.elapsed,
      flags,
      stats: { puzzlesSolved: completed ? 3 : this.stageIndex, puzzleMistakes: this.mistakes },
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
  restartFromCheckpoint() {}

  dispose() {
    this.disposed = true;
    this.host.hud.mountPanel(null);
    this.host.hud.setTimer(null);
    this.host.hud.showCoins(true);
    this.npc.model.dispose();
    this.particles.dispose();
    this.scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.scene.clear();
  }

  dev = {
    checkpoints: () => [] as string[],
    teleportTo: () => {},
    toggleColliders: () => {},
    complete: () => {
      this.finished = true;
      void this.openDoor();
    },
    collectAll: () => {},
    state: () => ({ stage: this.stageIndex, mistakes: this.mistakes, hintsUsed: this.hintsUsed, finished: this.finished, busy: this.busy }),
  };
}
