import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PALETTE, textTexture, toon } from '../materials';

/**
 * BIBLIOTECA DE PROPS (brinquedos e objetos) — PLACEHOLDER procedural.
 * Usada por objetos escondidos, fases narrativas e decoração. Cada função devolve um
 * THREE.Group com a base no chão (y = 0) e tamanho aproximado de brinquedo real.
 * Quando houver modelos reais, troque a função por um carregador de GLB com o mesmo nome.
 */
export type PropKind =
  | 'car'
  | 'ball'
  | 'yoyo'
  | 'duck'
  | 'kite'
  | 'drum'
  | 'block'
  | 'robot'
  | 'teddy'
  | 'rocket'
  | 'trophy'
  | 'sneaker'
  | 'headphones'
  | 'cap'
  | 'book'
  | 'lollipop'
  | 'guitar'
  | 'dino'
  | 'star'
  | 'balloon'
  | 'cushion'
  | 'toybox'
  | 'shelf'
  | 'table'
  | 'chair'
  | 'plant'
  | 'lamp'
  | 'present'
  | 'cone'
  | 'stack';

const m = (geo: THREE.BufferGeometry, color: string, opts?: Parameters<typeof toon>[1]) => new THREE.Mesh(geo, toon(color, opts));

export function makeProp(kind: PropKind, color: string = PALETTE.pink, accent: string = PALETTE.yellow, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const add = (o: THREE.Object3D, x = 0, y = 0, z = 0) => {
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  switch (kind) {
    case 'car': {
      add(m(new RoundedBoxGeometry(0.5, 0.18, 0.28, 2, 0.05), color), 0, 0.15, 0);
      add(m(new RoundedBoxGeometry(0.26, 0.14, 0.24, 2, 0.05), accent), -0.03, 0.29, 0);
      for (const [x, z] of [[-0.16, 0.14], [0.16, 0.14], [-0.16, -0.14], [0.16, -0.14]]) {
        const w = m(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), '#222');
        w.rotation.x = Math.PI / 2;
        add(w, x, 0.07, z);
      }
      break;
    }
    case 'ball': {
      add(m(new THREE.SphereGeometry(0.22, 16, 12), color), 0, 0.22, 0);
      const band = m(new THREE.TorusGeometry(0.222, 0.03, 6, 20), accent);
      band.rotation.x = Math.PI / 2;
      add(band, 0, 0.22, 0);
      break;
    }
    case 'yoyo': {
      for (const s of [-1, 1]) {
        const d = m(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16), s < 0 ? color : accent);
        d.rotation.z = Math.PI / 2;
        add(d, s * 0.045, 0.12, 0);
      }
      add(m(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 4), '#ffffff'), 0, 0.32, 0);
      break;
    }
    case 'duck': {
      add(m(new THREE.SphereGeometry(0.16, 14, 10), '#ffd60a'), 0, 0.14, 0).scale.set(1.2, 0.9, 1);
      add(m(new THREE.SphereGeometry(0.1, 12, 10), '#ffd60a'), 0.1, 0.3, 0);
      const beak = m(new THREE.ConeGeometry(0.04, 0.09, 8), PALETTE.orange);
      beak.rotation.z = -Math.PI / 2;
      add(beak, 0.21, 0.29, 0);
      add(m(new THREE.SphereGeometry(0.02, 6, 6), '#111'), 0.16, 0.34, 0.06);
      break;
    }
    case 'kite': {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.4);
      shape.lineTo(0.22, 0);
      shape.lineTo(0, -0.35);
      shape.lineTo(-0.22, 0);
      shape.closePath();
      add(m(new THREE.ShapeGeometry(shape), color, { side: THREE.DoubleSide }), 0, 0.45, 0);
      add(m(new THREE.CylinderGeometry(0.01, 0.01, 0.75, 4), accent), 0, 0.45, 0.01);
      break;
    }
    case 'drum': {
      add(m(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 18), color), 0, 0.11, 0);
      add(m(new THREE.CylinderGeometry(0.205, 0.205, 0.02, 18), '#ffffff'), 0, 0.225, 0);
      const ring = m(new THREE.TorusGeometry(0.2, 0.02, 6, 18), accent);
      ring.rotation.x = Math.PI / 2;
      add(ring, 0, 0.02, 0);
      break;
    }
    case 'block': {
      const tex = textTexture('A', { color: '#ffffff', bg: color, font: 200, width: 256, height: 256 });
      add(new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.22, 0.22, 2, 0.03), toon('#ffffff', { map: tex })), 0, 0.11, 0);
      break;
    }
    case 'robot': {
      add(m(new RoundedBoxGeometry(0.24, 0.26, 0.16, 2, 0.03), color), 0, 0.2, 0);
      add(m(new RoundedBoxGeometry(0.2, 0.16, 0.16, 2, 0.03), accent), 0, 0.42, 0);
      for (const s of [-1, 1]) add(m(new THREE.SphereGeometry(0.025, 6, 6), '#21d4fd', { emissive: 0.8 }), s * 0.05, 0.43, 0.08);
      add(m(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4), '#999'), 0, 0.55, 0);
      add(m(new THREE.SphereGeometry(0.025, 6, 6), PALETTE.pink, { emissive: 0.6 }), 0, 0.61, 0);
      for (const s of [-1, 1]) add(m(new THREE.BoxGeometry(0.06, 0.08, 0.08), '#555'), s * 0.07, 0.04, 0);
      break;
    }
    case 'teddy': {
      const fur = color;
      add(m(new THREE.SphereGeometry(0.16, 14, 10), fur), 0, 0.17, 0);
      add(m(new THREE.SphereGeometry(0.13, 14, 10), fur), 0, 0.4, 0);
      for (const s of [-1, 1]) {
        add(m(new THREE.SphereGeometry(0.05, 8, 6), fur), s * 0.1, 0.51, 0);
        add(m(new THREE.SphereGeometry(0.018, 6, 6), '#222'), s * 0.045, 0.43, 0.12);
        add(m(new THREE.SphereGeometry(0.06, 8, 6), fur), s * 0.16, 0.2, 0.03);
      }
      add(m(new THREE.SphereGeometry(0.05, 8, 6), accent), 0, 0.37, 0.11);
      break;
    }
    case 'rocket': {
      add(m(new THREE.CylinderGeometry(0.09, 0.11, 0.4, 14), '#ffffff'), 0, 0.28, 0);
      add(m(new THREE.ConeGeometry(0.09, 0.16, 14), color), 0, 0.56, 0);
      for (let i = 0; i < 3; i++) {
        const fin = m(new THREE.BoxGeometry(0.02, 0.14, 0.1), accent);
        const a = (i / 3) * Math.PI * 2;
        fin.position.set(Math.sin(a) * 0.11, 0.12, Math.cos(a) * 0.11);
        fin.rotation.y = a;
        g.add(fin);
      }
      add(m(new THREE.SphereGeometry(0.04, 8, 6), PALETTE.cyan, { emissive: 0.5 }), 0, 0.36, 0.09);
      break;
    }
    case 'trophy': {
      add(m(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 12), '#7a4b26'), 0, 0.03, 0);
      add(m(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), '#ffc928', { emissive: 0.3 }), 0, 0.12, 0);
      add(m(new THREE.CylinderGeometry(0.12, 0.05, 0.16, 14), '#ffc928', { emissive: 0.3 }), 0, 0.26, 0);
      break;
    }
    case 'sneaker': {
      const shoe = m(new THREE.CapsuleGeometry(0.08, 0.16, 4, 8), color);
      shoe.rotation.x = Math.PI / 2;
      add(shoe, 0, 0.09, 0);
      add(m(new THREE.BoxGeometry(0.17, 0.04, 0.34), accent), 0, 0.02, 0);
      break;
    }
    case 'headphones': {
      add(m(new THREE.TorusGeometry(0.15, 0.022, 8, 20, Math.PI), color), 0, 0.12, 0);
      for (const s of [-1, 1]) {
        const cup = m(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), color);
        cup.rotation.z = Math.PI / 2;
        add(cup, s * 0.15, 0.1, 0);
        const ring = m(new THREE.TorusGeometry(0.05, 0.012, 6, 12), accent, { emissive: 0.4 });
        ring.rotation.y = Math.PI / 2;
        add(ring, s * 0.178, 0.1, 0);
      }
      break;
    }
    case 'cap': {
      add(m(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), color), 0, 0, 0);
      const brim = m(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 14, 1, false, -Math.PI / 2, Math.PI), accent);
      brim.scale.z = 1.4;
      add(brim, 0, 0.01, 0.13);
      break;
    }
    case 'book': {
      add(m(new THREE.BoxGeometry(0.26, 0.05, 0.2), color), 0, 0.025, 0);
      add(m(new THREE.BoxGeometry(0.25, 0.04, 0.19), '#ffffff'), 0.008, 0.026, 0);
      break;
    }
    case 'lollipop': {
      add(m(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), '#ffffff'), 0, 0.15, 0);
      const c = m(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), color);
      c.rotation.x = Math.PI / 2;
      add(c, 0, 0.36, 0);
      const sw = m(new THREE.TorusGeometry(0.06, 0.012, 6, 16), accent);
      add(sw, 0, 0.36, 0.017);
      break;
    }
    case 'guitar': {
      add(m(new THREE.SphereGeometry(0.13, 14, 10), color), 0, 0.14, 0).scale.set(1, 1.1, 0.35);
      add(m(new THREE.SphereGeometry(0.1, 14, 10), color), 0, 0.3, 0).scale.set(1, 1, 0.35);
      add(m(new THREE.BoxGeometry(0.04, 0.32, 0.03), '#7a4b26'), 0, 0.52, 0);
      add(m(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 12), '#222'), 0, 0.22, 0.05).rotation.x = Math.PI / 2;
      break;
    }
    case 'dino': {
      add(m(new THREE.SphereGeometry(0.15, 12, 10), color), 0, 0.17, 0).scale.set(1.4, 1, 1);
      add(m(new THREE.SphereGeometry(0.09, 12, 10), color), 0.2, 0.33, 0);
      const tail = m(new THREE.ConeGeometry(0.07, 0.25, 8), color);
      tail.rotation.z = Math.PI / 2;
      add(tail, -0.3, 0.16, 0);
      for (let i = 0; i < 3; i++) add(m(new THREE.ConeGeometry(0.03, 0.07, 6), accent), -0.1 + i * 0.1, 0.33, 0);
      for (const s of [-1, 1]) add(m(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), color), 0.05 * s, 0.04, 0.07 * s);
      break;
    }
    case 'star': {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.08 : 0.18;
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
      geo.center();
      add(new THREE.Mesh(geo, toon(color, { emissive: 0.4 })), 0, 0.2, 0);
      break;
    }
    case 'balloon': {
      add(m(new THREE.SphereGeometry(0.2, 14, 12), color), 0, 0.9, 0).scale.y = 1.2;
      add(m(new THREE.CylinderGeometry(0.004, 0.004, 0.65, 4), '#ffffff'), 0, 0.38, 0);
      break;
    }
    case 'cushion':
      add(m(new RoundedBoxGeometry(0.9, 0.35, 0.9, 3, 0.15), color), 0, 0.175, 0);
      break;
    case 'toybox': {
      add(m(new RoundedBoxGeometry(0.9, 0.55, 0.6, 2, 0.05), color), 0, 0.275, 0);
      add(m(new THREE.BoxGeometry(0.92, 0.06, 0.62), accent), 0, 0.57, -0.02).rotation.x = -0.5;
      break;
    }
    case 'shelf': {
      for (const s of [-1, 1]) add(m(new THREE.BoxGeometry(0.06, 1.6, 0.4), color), s * 0.8, 0.8, 0);
      for (let i = 0; i < 4; i++) add(m(new THREE.BoxGeometry(1.66, 0.05, 0.4), color), 0, 0.05 + i * 0.5, 0);
      add(m(new THREE.BoxGeometry(1.66, 1.6, 0.03), accent), 0, 0.8, -0.2);
      break;
    }
    case 'table': {
      add(m(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 24), color), 0, 0.55, 0);
      add(m(new THREE.CylinderGeometry(0.08, 0.12, 0.55, 10), accent), 0, 0.27, 0);
      break;
    }
    case 'chair': {
      add(m(new RoundedBoxGeometry(0.4, 0.06, 0.4, 2, 0.02), color), 0, 0.32, 0);
      add(m(new RoundedBoxGeometry(0.4, 0.4, 0.06, 2, 0.02), color), 0, 0.55, -0.17);
      for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) add(m(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), accent), x, 0.15, z);
      break;
    }
    case 'plant': {
      add(m(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12), color), 0, 0.14, 0);
      for (let i = 0; i < 5; i++) {
        const leaf = m(new THREE.SphereGeometry(0.12, 8, 6), PALETTE.green);
        leaf.scale.set(0.5, 1.4, 0.5);
        const a = (i / 5) * Math.PI * 2;
        leaf.position.set(Math.sin(a) * 0.08, 0.42, Math.cos(a) * 0.08);
        leaf.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
        g.add(leaf);
      }
      break;
    }
    case 'lamp': {
      add(m(new THREE.CylinderGeometry(0.12, 0.15, 0.04, 12), accent), 0, 0.02, 0);
      add(m(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), '#ffffff'), 0, 0.42, 0);
      add(m(new THREE.ConeGeometry(0.2, 0.22, 14, 1, true), color, { side: THREE.DoubleSide, emissive: 0.3 }), 0, 0.88, 0);
      break;
    }
    case 'present': {
      add(m(new RoundedBoxGeometry(0.3, 0.26, 0.3, 2, 0.03), color), 0, 0.13, 0);
      add(m(new THREE.BoxGeometry(0.31, 0.27, 0.06), accent), 0, 0.13, 0);
      add(m(new THREE.BoxGeometry(0.06, 0.27, 0.31), accent), 0, 0.13, 0);
      add(m(new THREE.TorusGeometry(0.05, 0.02, 6, 12), accent), 0, 0.3, 0);
      break;
    }
    case 'cone': {
      add(m(new THREE.ConeGeometry(0.16, 0.4, 14), color), 0, 0.2, 0);
      const s = m(new THREE.CylinderGeometry(0.105, 0.125, 0.06, 14), '#ffffff');
      add(s, 0, 0.18, 0);
      break;
    }
    case 'stack': {
      const cols = [color, accent, PALETTE.cyan, PALETTE.green];
      for (let i = 0; i < 4; i++) {
        const r = m(new THREE.TorusGeometry(0.14 - i * 0.025, 0.045, 8, 16), cols[i]);
        r.rotation.x = Math.PI / 2;
        add(r, 0, 0.05 + i * 0.08, 0);
      }
      add(m(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), '#ffffff'), 0, 0.2, 0);
      break;
    }
  }
  g.scale.setScalar(scale);
  return g;
}
