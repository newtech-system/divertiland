import { damp } from '../../core/util';
import type { Rig } from './CharacterModel';

/**
 * Estados de animação exigidos (seção 4). Contínuos = locomoção; "one-shots" tocam uma vez.
 */
export type LocomotionState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'climb' | 'slide';
export type OneShot = 'land' | 'celebrate' | 'pickup' | 'interact' | 'bump' | 'dance' | 'wave';

/**
 * Interface que qualquer animador deve cumprir. Hoje: ProceduralAnimator (placeholder).
 * Futuro: um animador baseado em THREE.AnimationMixer com os clipes do rig final do
 * Jhow/Mina. O gameplay só fala com esta interface — uma animação quebrada nunca
 * impede a mecânica de funcionar (seção 52).
 */
export interface CharacterAnimator {
  setLocomotion(state: LocomotionState, speed01: number): void;
  trigger(shot: OneShot): void;
  update(dt: number): void;
}

interface Pose {
  hipsY: number;
  spineX: number;
  spineZ: number;
  headX: number;
  armLX: number;
  armLZ: number;
  armRX: number;
  armRZ: number;
  legLX: number;
  legRX: number;
  bodyRotY: number;
  squash: number; // 1 = normal; <1 achatado
}

const NEUTRAL: Pose = {
  hipsY: 0.5,
  spineX: 0,
  spineZ: 0,
  headX: 0,
  armLX: 0,
  armLZ: 0.12,
  armRX: 0,
  armRZ: -0.12,
  legLX: 0,
  legRX: 0,
  bodyRotY: 0,
  squash: 1,
};

const ONE_SHOT_DURATION: Record<OneShot, number> = {
  land: 0.22,
  celebrate: 1.6,
  pickup: 0.35,
  interact: 0.45,
  bump: 0.5,
  dance: 2.4,
  wave: 1.2,
};

export class ProceduralAnimator implements CharacterAnimator {
  private state: LocomotionState = 'idle';
  private speed = 0;
  private phase = 0;
  private time = 0;
  private shot: OneShot | null = null;
  private shotT = 0;
  private cur: Pose = { ...NEUTRAL };
  reducedMotion = false;

  constructor(private rig: Rig) {}

  setLocomotion(state: LocomotionState, speed01: number): void {
    this.state = state;
    this.speed = speed01;
  }

  trigger(shot: OneShot): void {
    // Pouso não interrompe comemoração.
    if (shot === 'land' && this.shot && this.shot !== 'land') return;
    this.shot = shot;
    this.shotT = 0;
  }

  get busy(): boolean {
    return !!this.shot && this.shot !== 'land';
  }

  update(dt: number): void {
    this.time += dt;
    const target: Pose = { ...NEUTRAL };
    const s = this.speed;
    switch (this.state) {
      case 'idle': {
        const b = Math.sin(this.time * 2.2);
        target.hipsY = 0.5 + b * 0.008;
        target.armLZ = 0.15 + b * 0.03;
        target.armRZ = -0.15 - b * 0.03;
        target.headX = Math.sin(this.time * 0.9) * 0.04;
        break;
      }
      case 'walk':
      case 'run': {
        const run = this.state === 'run';
        this.phase += dt * (run ? 13 : 9) * Math.max(0.5, s);
        const sw = Math.sin(this.phase);
        const amp = (run ? 0.95 : 0.6) * Math.max(0.4, s);
        target.legLX = sw * amp;
        target.legRX = -sw * amp;
        target.armLX = -sw * amp * 0.9;
        target.armRX = sw * amp * 0.9;
        target.hipsY = 0.5 + Math.abs(Math.cos(this.phase)) * (run ? 0.06 : 0.03);
        target.spineX = run ? 0.22 : 0.08;
        target.spineZ = sw * 0.04;
        break;
      }
      case 'jump':
        target.armLZ = 2.4;
        target.armRZ = -2.4;
        target.legLX = -0.7;
        target.legRX = 0.3;
        target.spineX = -0.1;
        target.squash = 1.08;
        break;
      case 'fall': {
        const f = Math.sin(this.time * 18) * 0.25;
        target.armLZ = 1.5 + f;
        target.armRZ = -1.5 + f;
        target.legLX = 0.3;
        target.legRX = -0.2;
        target.headX = -0.15;
        break;
      }
      case 'climb': {
        this.phase += dt * 7 * Math.max(0.3, s);
        const c = Math.sin(this.phase);
        target.armLX = -2.6 + c * 0.5;
        target.armRX = -2.6 - c * 0.5;
        target.legLX = -0.6 + c * 0.5;
        target.legRX = -0.6 - c * 0.5;
        target.spineX = -0.05;
        break;
      }
      case 'slide':
        target.armLZ = 1.2;
        target.armRZ = -1.2;
        target.legLX = -1.2;
        target.legRX = -1.2;
        target.hipsY = 0.38;
        target.spineX = -0.35;
        break;
    }

    if (this.shot) {
      this.shotT += dt;
      const d = ONE_SHOT_DURATION[this.shot];
      const k = this.shotT / d;
      const env = Math.sin(Math.min(1, k) * Math.PI);
      switch (this.shot) {
        case 'land':
          target.squash = 1 - 0.18 * env;
          break;
        case 'pickup':
          target.spineX += 0.5 * env;
          target.armLX = -1.2 * env;
          target.armRX = -1.2 * env;
          break;
        case 'interact':
          target.armRX = -1.6 * env;
          target.armLX = -1.2 * env;
          target.spineX += 0.15 * env;
          break;
        case 'bump':
          target.spineX = -0.45 * env;
          target.armLZ = 1.3 * env;
          target.armRZ = -1.3 * env;
          target.headX = -0.3 * env;
          break;
        case 'celebrate': {
          const hop = Math.abs(Math.sin(k * Math.PI * 3));
          target.hipsY = 0.5 + hop * 0.25;
          target.armLZ = 2.6 + Math.sin(this.time * 14) * 0.25;
          target.armRZ = -2.6 - Math.sin(this.time * 14) * 0.25;
          target.bodyRotY = k < 0.6 ? 0 : (k - 0.6) / 0.4 * Math.PI * 2;
          target.legLX = -hop * 0.4;
          target.legRX = -hop * 0.4;
          break;
        }
        case 'dance': {
          const b = Math.sin(this.time * 8);
          target.spineZ = b * 0.25;
          target.hipsY = 0.5 + Math.abs(b) * 0.06;
          target.armLZ = 1.4 + b * 0.8;
          target.armRZ = -1.4 + b * 0.8;
          target.legLX = Math.max(0, b) * 0.5;
          target.legRX = Math.max(0, -b) * 0.5;
          target.headX = Math.sin(this.time * 16) * 0.1;
          break;
        }
        case 'wave':
          target.armRZ = -2.5 + Math.sin(this.time * 16) * 0.35;
          target.headX = -0.1;
          break;
      }
      if (this.shotT >= d) this.shot = null;
    }

    // Suaviza transições (nada de "estalos" entre poses).
    const L = 18;
    const c = this.cur;
    for (const k of Object.keys(target) as (keyof Pose)[]) {
      c[k] = k === 'bodyRotY' ? target[k] : damp(c[k], target[k], L, dt);
    }
    const B = this.rig.bones;
    B.hips.position.y = c.hipsY;
    B.spine.rotation.set(c.spineX, 0, c.spineZ);
    B.head.rotation.x = c.headX;
    B.armL.rotation.set(c.armLX, 0, c.armLZ);
    B.armR.rotation.set(c.armRX, 0, c.armRZ);
    B.legL.rotation.x = c.legLX;
    B.legR.rotation.x = c.legRX;
    this.rig.body.rotation.y = c.bodyRotY;
    const sq = this.reducedMotion ? 1 : c.squash;
    this.rig.body.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
  }
}
