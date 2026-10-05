import type { AutoWaypoint } from '../levels/exploration/Exploration3DLevel';

/**
 * ROTAS DE QA (só desenvolvimento): o piloto automático segue estes pontos para provar que
 * cada fase 3D pode ser concluída do início ao fim. Rodar no console: `await __qaAll()`.
 * Se mudar o desenho de uma fase, atualize a rota correspondente.
 */
export const QA_ROUTES: Record<string, AutoWaypoint[]> = {
  w1_l10: [
    { x: 0, z: 30, cp: true, devFlag: 'memDoor', wait: 0.5 }, { x: 0, z: 42, cp: true }, { x: 0, z: 47.2, bounceTo: 7.0, bounces: 3 },
    { x: 0, z: 52.5, y: 6 }, { x: -4.5, z: 52, y: 6, cp: true }, { x: 0, z: 56.8, bounceTo: 13.2, bounces: 3 }, { x: 0, z: 61, y: 12 },
    { x: -4, z: 64, y: 12, cp: true }, { x: 0, z: 71, y: 12 }, { x: 0, z: 89, y: 12 }, { x: -2, z: 92, y: 12, cp: true },
    { x: 0, z: 96.6, y: 12, needGround: true }, { x: 2.4, z: 100, y: 12, needGround: true }, { x: 0, z: 103.4, y: 12, needGround: true },
    { x: 0, z: 107, y: 12 }, { x: -2, z: 108, y: 12, cp: true }, { x: 0, z: 113.5, y: 12, needGround: true, radius: 1.0 },
    { x: 0, z: 117.5, y: 12, radius: 1.0 }, { x: 0, z: 121, y: 12 }, { x: -2.5, z: 122, y: 12, cp: true }, { x: 0, z: 125, y: 12 },
    { x: 0, z: 151, y: 0 }, { x: -3, z: 154, cp: true }, { x: -14, z: 156 }, { x: -14, z: 185 }, { x: 0, z: 186 },
    { x: 0, z: 189, y: 1 }, { x: -3, z: 189, y: 1, cp: true }, { x: 0, z: 195, y: 1 }, { x: 3, z: 198.5, y: 1.5 }, { x: 0, z: 202, y: 2 },
    { x: -3, z: 205.5, y: 2, needGround: true }, { x: 0, z: 209, y: 2, needGround: true }, { x: 0, z: 213, y: 2 },
    { x: -1.5, z: 214, y: 2, cp: true }, { x: 0, z: 216, y: 2 }, { x: -4, z: 219.5, y: 2, needGround: true, radius: 1.2 },
    { x: 4, z: 219.5, y: 2, needGround: true, radius: 1.2 }, { x: 4, z: 224, y: 2 }, { x: 4, z: 227.2, bounceTo: 6.8, bounces: 2 },
    { x: 2, z: 232, y: 6 }, { x: 0, z: 240, y: 6 },
  ],
  w1_l01: [
    { x: 0, z: 10, cp: true }, { x: 0, z: 30 }, { x: 0, z: 33.8, y: 0.8 }, { x: 0, z: 36, y: 0 }, { x: 0, z: 37.9, y: 1.3 },
    { x: 0, z: 40, y: 0 }, { x: 0, z: 55 }, { x: -2.5, z: 56.5, cp: true }, { x: -8, z: 58 }, { x: -8, z: 79 }, { x: 0, z: 82 },
    { x: 0, z: 88, y: 4 }, { x: -2.2, z: 87, y: 4, cp: true }, { x: 0, z: 91, y: 4 }, { x: 0, z: 101, y: 4 }, { x: 0, z: 106, y: 4, cp: true },
    { x: 6, z: 109 }, { x: 6, z: 112.4, y: 4 }, { x: 4.8, z: 115.5, y: 4 }, { x: 6, z: 119.5, y: 4, needGround: true, radius: 1.3 },
    { x: 6, z: 123, y: 4 }, { x: 5, z: 126.5, y: 4.6 }, { x: 7, z: 129.5, y: 4 }, { x: 5.4, z: 132.4, y: 4 }, { x: 0, z: 136, y: 4 },
    { x: -4, z: 137, y: 4, cp: true }, { x: 0, z: 139, y: 4 }, { x: 0, z: 157, y: 0 }, { x: -3, z: 158.5, cp: true },
    { x: 0, z: 172.4, bounceTo: 7.6, bounces: 3 }, { x: 0, z: 178, y: 7 }, { x: 0, z: 182, y: 7 },
  ],
  w1_l05: [
    { x: 0, z: 6, cp: true }, { x: 1.5, z: 11.5, y: 3, needGround: true }, { x: 1.5, z: 16, y: 3, needGround: true },
    { x: 0, z: 20.5, y: 3, needGround: true }, { x: 0, z: 25, y: 3, cp: true }, { x: 0, z: 29, y: 3 }, { x: 0, z: 51, y: 3 },
    { x: 0, z: 55, y: 3, cp: true }, { x: 0, z: 61, y: 3, needGround: true }, { x: 2.6, z: 64.5, y: 3, needGround: true },
    { x: 0, z: 68, y: 3, needGround: true }, { x: -2.6, z: 71.5, y: 3, needGround: true }, { x: 0, z: 75, y: 3, needGround: true },
    { x: 0, z: 80, y: 3 }, { x: 0, z: 85.6, y: 3 }, { x: 0, z: 88, y: 7 }, { x: -3, z: 89, y: 7, cp: true }, { x: 0, z: 92.5, y: 7 },
    { x: 0, z: 105, y: 7 }, { x: 0, z: 108.5, y: 7 }, { x: 0, z: 113.5, y: 7 }, { x: 0, z: 118.6, y: 7 }, { x: 0, z: 123.7, y: 7 },
    { x: 0, z: 127.5, y: 7 }, { x: -3.5, z: 128.5, y: 7, cp: true }, { x: 0, z: 131, y: 7 }, { x: 0, z: 146, y: 7 }, { x: 0, z: 150, y: 7 },
  ],
  w1_l06: [
    { x: -6, z: 0, cp: true }, { x: 13, z: 0, y: 0 }, { x: 15, z: 0, y: 1 }, { x: 17, z: 0, y: 2 }, { x: 25, z: 0, y: 2 },
    { x: 31, z: 0, y: 0, cp: true }, { x: 43, z: 0, y: 0 }, { x: 46.5, z: 0, y: 1.6 }, { x: 51, z: 0, y: 3.2 }, { x: 55.5, z: 0, y: 4.6 },
    { x: 59, z: 0, y: 5 }, { x: 66, z: 0, radius: 1.2 }, { x: 68.5, z: 0, y: 4.5, needGround: true },
    { x: 77.5, z: 0, y: 4.5, needGround: true, radius: 1.2 }, { x: 82.5, z: 0, y: 3, cp: true }, { x: 92.5, z: 0, bounceTo: 9.6, bounces: 3 },
    { x: 100.5, z: 0, y: 3, cp: true }, { x: 121, z: 0, y: 3 }, { x: 161, z: 0, y: 3, cp: true }, { x: 167.5, z: 0, y: 3 },
    { x: 171.5, z: 0, y: 3, needGround: true }, { x: 175.5, z: 0, y: 3.8, needGround: true }, { x: 179.5, z: 0, y: 4.6, needGround: true },
    { x: 183.5, z: 0, y: 3.8, needGround: true }, { x: 187.5, z: 0, y: 3, needGround: true }, { x: 193, z: 0, y: 3, cp: true },
    { x: 203, z: 0, y: 3 }, { x: 205.5, z: 0, y: 4.2 }, { x: 208.5, z: 0, y: 5.4 }, { x: 212, z: 0, y: 6.6 }, { x: 218, z: 0, y: 6.6 },
  ],
  w1_l07: [
    { x: 0, z: -3, cp: true }, { x: -0.8, z: 3.8, bounceTo: 6.0, bounces: 3 }, { x: -5.5, z: 8.5, y: 6 }, { x: -8.5, z: 8, y: 6, cp: true },
    { x: -4.7, z: 11.4, bounceTo: 11.8, bounces: 3 }, { x: 0, z: 16, y: 12 }, { x: 2.8, z: 15, y: 12, cp: true },
    { x: 2.2, z: 18.6, bounceTo: 17.8, bounces: 3 }, { x: 7, z: 22.5, y: 18 }, { x: 9.5, z: 22, y: 18, cp: true },
    { x: 6.3, z: 25, bounceTo: 23.8, bounces: 3 }, { x: 1.5, z: 25.5, y: 24 }, { x: -1, z: 27, y: 24 },
  ],
  w1_l08: [
    { x: 0, z: 1, y: 1, cp: true }, { x: -1.5, z: 5.6, y: 0.9 }, { x: 1.8, z: 8.6, y: 0.9 }, { x: -1, z: 11.8, y: 0.9 }, { x: 2.2, z: 15, y: 0.9 },
    { x: -0.5, z: 18.2, y: 0.9 }, { x: 0, z: 22, y: 1.4 }, { x: -1.5, z: 23, y: 1.4, cp: true }, { x: 0, z: 25.5, y: 1.4 },
    { x: -2.5, z: 28.8, y: 1.2 }, { x: 1.5, z: 31.8, y: 1.2 }, { x: -2, z: 34.8, y: 1.2 }, { x: -2.8, z: 38.8, y: 1.8, cp: true },
    { x: -8, z: 39.4, y: 1.5 }, { x: -12.6, z: 39, y: 2.6 }, { x: -13, z: 41, y: 2.9 }, { x: -13, z: 54.5, y: 2.9 }, { x: -12, z: 57, y: 2.2 },
    { x: -9, z: 61, y: 2.2, needGround: true }, { x: -1, z: 61, y: 2.2, needGround: true, radius: 1.2 }, { x: 2.7, z: 61.2, y: 2.2, cp: true },
    { x: 5.8, z: 65, y: 2.2, needGround: true }, { x: 3.2, z: 68, y: 2.2, needGround: true }, { x: 5.8, z: 71, y: 2.2, needGround: true },
    { x: 5.5, z: 73.6, y: 2.2 }, { x: 5.5, z: 75, bounceTo: 6.5, bounces: 2 }, { x: 4, z: 79.5, y: 6 }, { x: 1.5, z: 82, y: 6 },
  ],
};
