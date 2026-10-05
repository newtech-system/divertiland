import type { CharacterId, DifficultyId } from '../../core/types';
import type { PropKind } from '../../engine/props/Props';

/**
 * FORMATO DE DADOS das fases 3D (seção 34).
 * Uma fase é uma lista de "entidades" descritas por dados. O LevelBuilder transforma cada
 * entidade em visual + colisão + gatilhos. Para trocar o placeholder pelo cenário real
 * (fotos/GoPro/modelos), basta adicionar `model` a uma entidade ou usar 'model' — o
 * gameplay (colisores e gatilhos) continua o mesmo.
 */
export type Vec3 = [number, number, number];

export type VisualStyle = 'foam' | 'mat' | 'wall' | 'neon' | 'invisible' | 'glass' | 'padded' | 'lava';

interface Base {
  /** Só existe nesses estilos de aventura (ex.: checkpoint extra no Bicho-Preguiça). */
  onlyIn?: DifficultyId[];
  /** Modelo 3D final que substitui o visual placeholder (opcional). */
  model?: string;
}

export type LayoutEntity = Base &
  (
    | {
        t: 'box';
        min: Vec3;
        max: Vec3;
        color?: string;
        style?: VisualStyle;
        surface?: 'normal' | 'sticky' | 'trampoline' | 'slide' | 'lava';
        oneWay?: boolean;
        camera?: boolean;
      }
    | {
        t: 'platform';
        /** Centro do TOPO da plataforma. */
        pos: Vec3;
        size: [number, number];
        thick?: number;
        color?: string;
        shape?: 'box' | 'disc';
        /** Escala pelo estilo de aventura (plataformas maiores no Bicho-Preguiça). */
        scales?: boolean;
        move?: { to: Vec3; period: number; phase?: number };
        spin?: number;
      }
    | { t: 'ramp'; min: Vec3; max: Vec3; axis: 'x' | 'z'; h0: number; h1: number; color?: string; slide?: boolean; rails?: boolean }
    | { t: 'tunnel'; start: Vec3; axis: 'x' | 'z'; length: number; radius: number; colors: string[] }
    | { t: 'coin'; pos: Vec3 }
    | { t: 'coinLine'; from: Vec3; to: Vec3; count: number }
    | { t: 'coinArc'; center: Vec3; radius: number; count: number; height?: number }
    | { t: 'gem'; pos: Vec3 }
    | { t: 'collectible'; id: string; pos: Vec3; look?: 'teddy' | 'ring' | 'paw' }
    /** Martelo de espuma balançando (empurra, não machuca). */
    | { t: 'pendulum'; pivot: Vec3; length: number; axis: 'x' | 'z'; amplitude: number; speed: number; phase?: number; color?: string }
    /** Brinquedo/objeto da biblioteca de props. `solid` cria colisão pela caixa do objeto. */
    | { t: 'prop'; kind: PropKind; pos: Vec3; rotY?: number; color?: string; accent?: string; scale?: number; solid?: boolean }
    /** Amigo que conversa e pode pedir ajuda (missão). Ver QuestSystem. */
    | {
        t: 'friend';
        id: string;
        name: string;
        icon: string;
        kind: PropKind;
        color?: string;
        accent?: string;
        scale?: number;
        pos: Vec3;
        yaw?: number;
        intro: string;
        quest?: QuestDef;
        /** Texto da missão no HUD enquanto ela está ativa. */
        mission?: string;
        thanks: string;
        hint?: string;
        /** Conversar com este amigo (depois da flag `needsFlag`) conclui a fase. */
        finishesLevel?: boolean;
        needsFlag?: string;
      }
    /** Objeto de missão para pegar e levar a um amigo. */
    | { t: 'questItem'; id: string; group: string; kind: PropKind; icon: string; pos: Vec3; color?: string; scale?: number }
    /** Botão de chão (pisar). Usado em missões de "apertar todos" ou sequência de memória. */
    | { t: 'pad'; id: string; group: string; pos: Vec3; color: string; order?: number }
    /** Portão que abre quando uma flag de missão é ligada. */
    | { t: 'questGate'; id: string; min: Vec3; max: Vec3; flag: string; color?: string }
    /** Amigo do pega-pega: foge quando você chega perto; encoste para pegar! */
    | { t: 'tagFriend'; id: string; kind: PropKind; color: string; accent?: string; pos: Vec3; area: [Vec3, Vec3]; speed?: number }
    /** Bloco surpresa: bater nele de baixo solta uma gema. */
    | { t: 'bumpBlock'; pos: Vec3; color?: string }
    /** Plataforma que treme e some depois de pisar (volta em seguida). */
    | { t: 'vanish'; pos: Vec3; size: [number, number]; color?: string }
    | { t: 'checkpoint'; id: string; pos: Vec3; yaw?: number }
    | { t: 'trampoline'; pos: Vec3; radius: number; power?: number }
    | { t: 'ballpit'; min: Vec3; max: Vec3; depth?: number }
    | { t: 'net'; min: Vec3; max: Vec3; normal: [number, number]; color?: string }
    | { t: 'netBridge'; min: Vec3; max: Vec3; color?: string }
    | {
        t: 'bumper';
        pos: Vec3;
        size: Vec3;
        axis: 'x' | 'z';
        amplitude: number;
        speed: number;
        phase?: number;
        color?: string;
      }
    | { t: 'spinner'; pos: Vec3; length: number; speed: number; height?: number; color?: string }
    | { t: 'curtain'; min: Vec3; max: Vec3; colors?: string[] }
    | { t: 'secretZone'; id: string; min: Vec3; max: Vec3 }
    | { t: 'finish'; pos: Vec3; yaw?: number }
    | {
        t: 'message';
        id: string;
        min: Vec3;
        max: Vec3;
        text: string;
        /** Ícone grande mostrado junto (para quem ainda não lê). */
        icon?: string;
        /** Atualiza a missão atual (🎯) no HUD. */
        mission?: string;
        /** Dica de tutorial: só aparece na primeira vez (ou sempre no Bicho-Preguiça). */
        tutorial?: boolean;
        /** Mostra só se a ajuda do estilo for >= este valor. */
        minHint?: number;
      }
    | { t: 'button'; id: string; pos: Vec3; target: string; yaw?: number }
    | { t: 'gate'; id: string; min: Vec3; max: Vec3; color?: string }
    | { t: 'killZone'; min: Vec3; max: Vec3 }
    | { t: 'hintTrail'; points: Vec3[]; minHint?: number }
    | { t: 'cameraZone'; min: Vec3; max: Vec3; distance?: number; pitch?: number }
    | { t: 'npc'; character: CharacterId | 'guide' | 'friend'; pos: Vec3; yaw?: number; anim?: 'wave' | 'dance' | 'idle' }
    | { t: 'sign'; pos: Vec3; yaw?: number; text: string; color?: string; w?: number; h?: number }
    | {
        t: 'decor';
        kind: 'neonSign' | 'arch' | 'pillar' | 'balloons' | 'star' | 'lightPanel' | 'cushion' | 'ring' | 'stripe';
        pos: Vec3;
        yaw?: number;
        color?: string;
        text?: string;
        size?: number;
      }
  );

/** Missões (seção 17): buscar objetos, pisar em botões ou repetir uma sequência. */
export type QuestDef =
  | { type: 'collect'; group: string; count: number; flag: string }
  | { type: 'pads'; group: string; flag: string; memory?: boolean };

export interface LevelLayout {
  /** Como a fase termina: chegando na estrela (padrão) ou pegando todos no pega-pega. */
  completeOn?: 'finish' | 'allTagged';
  id: string;
  spawn: { pos: Vec3; yaw: number };
  /** Abaixo disso o personagem volta ao checkpoint. */
  killY: number;
  environment: {
    background: string;
    fog: string;
    fogNear: number;
    fogFar: number;
    floorColors?: [string, string];
  };
  music: string;
  /** 'side' = fase de plataforma 2D (câmera de lado, movimento só para os lados). */
  view?: 'third' | 'side';
  entities: LayoutEntity[];
}
