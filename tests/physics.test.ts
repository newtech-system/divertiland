import { describe, expect, it } from 'vitest';
import { CharacterBody } from '../src/engine/physics/CharacterBody';
import { PhysicsWorld, makeBox } from '../src/engine/physics/PhysicsWorld';

const G = -25;

function sim(body: CharacterBody, seconds: number, each?: () => void) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    body.vel.y += G * dt;
    each?.();
    body.step(dt);
  }
}

function worldWithFloor() {
  const w = new PhysicsWorld();
  w.add(makeBox({ x: -50, y: -1, z: -50 }, { x: 50, y: 0, z: 50 }));
  return w;
}

describe('Física do personagem', () => {
  it('cai e pousa no chão', () => {
    const w = worldWithFloor();
    const b = new CharacterBody(w);
    b.teleport({ x: 0, y: 5, z: 0 });
    sim(b, 2);
    expect(b.grounded).toBe(true);
    expect(b.pos.y).toBeCloseTo(0, 3);
  });

  it('parede bloqueia o movimento', () => {
    const w = worldWithFloor();
    w.add(makeBox({ x: 2, y: 0, z: -5 }, { x: 3, y: 4, z: 5 }));
    const b = new CharacterBody(w);
    b.teleport({ x: 0, y: 0, z: 0 });
    sim(b, 2, () => (b.vel.x = 6));
    expect(b.pos.x).toBeLessThanOrEqual(2 - b.radius + 1e-6);
  });

  it('não atravessa parede fina em alta velocidade', () => {
    const w = worldWithFloor();
    w.add(makeBox({ x: 2, y: 0, z: -5 }, { x: 2.1, y: 4, z: 5 }));
    const b = new CharacterBody(w);
    b.teleport({ x: 0, y: 0, z: 0 });
    sim(b, 1, () => (b.vel.x = 40));
    expect(b.pos.x).toBeLessThan(2);
  });

  it('sobe degraus baixos automaticamente', () => {
    const w = worldWithFloor();
    w.add(makeBox({ x: 2, y: 0, z: -5 }, { x: 10, y: 0.3, z: 5 }));
    const b = new CharacterBody(w);
    b.teleport({ x: 0, y: 0, z: 0 });
    sim(b, 1.5, () => (b.vel.x = 5));
    expect(b.pos.x).toBeGreaterThan(3);
    expect(b.pos.y).toBeCloseTo(0.3, 2);
  });

  it('anda subindo e descendo rampas', () => {
    const w = worldWithFloor();
    w.add(makeBox({ x: 2, y: 0, z: -2 }, { x: 8, y: 3, z: 2 }, { shape: 'ramp', ramp: { axis: 'x', h0: 0, h1: 3 } }));
    const b = new CharacterBody(w);
    b.teleport({ x: 0, y: 0, z: 0 });
    sim(b, 1.2, () => (b.vel.x = 5));
    expect(b.pos.x).toBeGreaterThan(5);
    expect(b.pos.y).toBeGreaterThan(1.5);
    expect(b.grounded).toBe(true);
    // descendo continua "grudado" na rampa
    let airborneFrames = 0;
    sim(b, 0.8, () => {
      b.vel.x = -5;
      if (!b.grounded) airborneFrames++;
    });
    expect(airborneFrames).toBeLessThan(3);
  });

  it('plataforma de um lado só: atravessa por baixo, pousa por cima', () => {
    const w = worldWithFloor();
    w.add(makeBox({ x: -2, y: 1.6, z: -2 }, { x: 2, y: 1.8, z: 2 }, { oneWay: true }));
    const b = new CharacterBody(w);
    b.teleport({ x: 0, y: 0, z: 0 });
    b.vel.y = 11;
    sim(b, 1.5);
    expect(b.pos.y).toBeCloseTo(1.8, 2);
    expect(b.grounded).toBe(true);
  });

  it('plataforma móvel carrega o personagem', () => {
    const w = new PhysicsWorld();
    const plat = w.add(makeBox({ x: -1, y: -0.5, z: -1 }, { x: 1, y: 0, z: 1 }));
    const b = new CharacterBody(w);
    b.teleport({ x: 0, y: 0.5, z: 0 });
    sim(b, 0.5);
    expect(b.grounded).toBe(true);
    const dt = 1 / 60;
    for (let i = 0; i < 60; i++) {
      plat.velocity.x = 2;
      plat.min.x += 2 * dt;
      plat.max.x += 2 * dt;
      b.vel.y += G * dt;
      b.step(dt);
    }
    expect(b.pos.x).toBeCloseTo(2, 1);
    expect(b.grounded).toBe(true);
  });

  it('chão mais alto abaixo de um ponto', () => {
    const w = worldWithFloor();
    w.add(makeBox({ x: -1, y: 0, z: -1 }, { x: 1, y: 2, z: 1 }));
    expect(w.groundBelow(0, 5, 0, 10)?.y).toBe(2);
    expect(w.groundBelow(5, 5, 5, 10)?.y).toBe(0);
    expect(w.groundBelow(5, 5, 5, 1)).toBeNull();
  });

  it('raycast encontra a parede mais próxima', () => {
    const w = new PhysicsWorld();
    w.add(makeBox({ x: 5, y: -1, z: -1 }, { x: 6, y: 1, z: 1 }));
    w.add(makeBox({ x: 3, y: -1, z: -1 }, { x: 4, y: 1, z: 1 }));
    expect(w.raycast({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10)).toBeCloseTo(3);
    expect(w.raycast({ x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, 10)).toBeNull();
  });
});
