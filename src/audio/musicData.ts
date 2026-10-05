/**
 * Músicas PLACEHOLDER geradas por sequenciador (sem arquivos). Cada mundo/tela tem a sua.
 * Quando existirem trilhas reais, o AudioManager pode tocar arquivos no lugar destas.
 */
export interface MusicTrack {
  bpm: number;
  /** Tônica em semitons relativos a C4. */
  root: number;
  progression: { root: number; intervals: number[] }[];
  /** Índices do arpejo por colcheia (null = pausa). */
  arp: (number | null)[];
  lead: OscillatorType;
  drums: boolean;
  style: 'calm' | 'bouncy';
}

const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];

export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  menu: {
    bpm: 104,
    root: 0,
    progression: [
      { root: 0, intervals: MAJ },
      { root: 9, intervals: MIN },
      { root: 5, intervals: MAJ },
      { root: 7, intervals: MAJ },
    ],
    arp: [0, 1, 2, 1, 3, 2, 1, null],
    lead: 'triangle',
    drums: false,
    style: 'calm',
  },
  map: {
    bpm: 112,
    root: 2,
    progression: [
      { root: 0, intervals: MAJ },
      { root: 5, intervals: MAJ },
      { root: 9, intervals: MIN },
      { root: 7, intervals: MAJ },
    ],
    arp: [0, 2, 1, 3, 0, 2, 4, 2],
    lead: 'triangle',
    drums: true,
    style: 'calm',
  },
  world1: {
    bpm: 128,
    root: 5,
    progression: [
      { root: 0, intervals: MAJ },
      { root: 7, intervals: MAJ },
      { root: 9, intervals: MIN },
      { root: 5, intervals: MAJ },
    ],
    arp: [0, 1, 2, 3, 2, 1, 4, 3],
    lead: 'square',
    drums: true,
    style: 'bouncy',
  },
  shop: {
    bpm: 96,
    root: 7,
    progression: [
      { root: 0, intervals: MAJ },
      { root: 4, intervals: MIN },
      { root: 5, intervals: MAJ },
      { root: 7, intervals: MAJ },
    ],
    arp: [0, null, 2, 1, null, 3, 2, null],
    lead: 'sine',
    drums: false,
    style: 'calm',
  },
};
