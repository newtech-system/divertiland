import type { EventBus } from '../core/EventBus';
import type { LevelState } from '../core/types';
import {
  ADVENTURES,
  MAX_CAMPAIGN_STARS,
  MAX_GOLDEN_TEDDIES,
  getAdventure,
  goldenIdOf,
  type AdventureDef,
} from '../data/adventures';
import { DIFFICULTIES, getDifficultyParams } from '../data/difficulty';
import { ECONOMY } from '../data/economy';
import type { AchievementSystem } from './AchievementSystem';
import type { CurrencyManager } from './CurrencyManager';
import type { LevelRunResult, RewardLine } from './LevelResult';
import type { ProfileManager } from './ProfileManager';
import { ProgressionManager } from './ProgressionManager';
import type { RewardLedger } from './RewardLedger';
import { defaultAdventureProgress } from './save/SaveSchema';
import type { SaveManager } from './save/SaveManager';
import type { AdventureProgress, ProfileData } from './save/SaveTypes';
import { StarManager } from './StarManager';

/** Objetivo de estrela 1: existe em toda aventura e significa "concluí a história". */
export const COMPLETION_OBJECTIVE = 'completed';

export interface StageSummary {
  stageId: string;
  name: string;
  outcome: string;
}

export interface AdventureOutcome {
  adventureId: string;
  name: string;
  stars: number;
  prevBestStars: number;
  objectivesMet: string[];
  isFirstCompletion: boolean;
  rewardLines: RewardLine[];
  totalDivertis: number;
  /** Pontos de Troca emitidos nesta conclusão (em simulação). */
  tokensEarned: number;
  /** Ursinhos dourados NOVOS (id permanente). */
  newGoldens: string[];
  goldensTotal: { found: number; of: number };
  stagesDone: StageSummary[];
  unlocked: string[];
  itemsGranted: string[];
  achievements: string[];
  newBestTime: boolean;
  chestsReady: string[];
  /** Frase de encerramento da aventura (seção 15). */
  learningLine: string;
}

export type RunApplied =
  | { kind: 'nextRun'; nextIndex: number; stages: StageSummary[]; nextStageMission: string; divertis: number }
  | { kind: 'done'; outcome: AdventureOutcome }
  | { kind: 'incomplete'; stages: StageSummary[] };

/**
 * AS CINCO AVENTURAS, do lado das regras (seção 8 do prompt mestre V2).
 *
 * Cuida do que é permanente e não pode duplicar:
 *  - etapas internas concluídas (salva a cada etapa, seção 7.4);
 *  - estrelas como CONJUNTO de objetivos (melhorar de 1 para 3 soma 2, não 3);
 *  - ursinhos dourados por id permanente (recolher o mesmo não cria outro, 17.1);
 *  - recompensas finitas pelo livro-caixa, com chave estável (19.2).
 */
export class AdventureService {
  constructor(
    private profiles: ProfileManager,
    private progression: ProgressionManager,
    private currency: CurrencyManager,
    private achievements: AchievementSystem,
    private ledger: RewardLedger,
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  // ---------------------------------------------------------------- progresso

  progress(id: string, profile: ProfileData | null = this.profiles.active): AdventureProgress {
    return profile?.adventures[id] ?? defaultAdventureProgress();
  }

  ensure(id: string): AdventureProgress {
    const p = this.profiles.require();
    if (!p.adventures[id]) p.adventures[id] = defaultAdventureProgress();
    return p.adventures[id];
  }

  /** Estrelas da aventura: 1 por objetivo cumprido (a conclusão é um deles), máximo 3. */
  stars(id: string, profile: ProfileData | null = this.profiles.active): number {
    return Math.min(3, this.progress(id, profile).objectivesMet.length);
  }

  totalStars(profile: ProfileData | null = this.profiles.active): number {
    return ADVENTURES.reduce((s, a) => s + this.stars(a.id, profile), 0);
  }

  get maxStars(): number {
    return MAX_CAMPAIGN_STARS;
  }

  goldensFound(profile: ProfileData | null = this.profiles.active): string[] {
    return ADVENTURES.flatMap((a) => this.progress(a.id, profile).goldens);
  }

  goldenCount(profile: ProfileData | null = this.profiles.active): { found: number; of: number } {
    return { found: this.goldensFound(profile).length, of: MAX_GOLDEN_TEDDIES };
  }

  isUnlocked(adv: AdventureDef, profile: ProfileData | null = this.profiles.active): boolean {
    if (!profile) return false;
    if (ProgressionManager.devUnlockAll) return true;
    const rule = adv.unlock;
    if (rule.afterLevels?.some((id) => !this.progress(id, profile).completed)) return false;
    if (rule.minStars && this.totalStars(profile) < rule.minStars) return false;
    if (rule.secretId && !profile.secrets.includes(rule.secretId)) return false;
    return true;
  }

  state(id: string, profile: ProfileData | null = this.profiles.active): LevelState {
    const adv = getAdventure(id);
    if (!adv || !profile) return 'LOCKED';
    const ap = this.progress(id, profile);
    if (ap.completed) return 'COMPLETED';
    if (!this.isUnlocked(adv, profile)) return 'LOCKED';
    // Já descobriu algo (etapa, dourado ou segredo) ou deixou uma partida salva:
    // o mapa mostra "em andamento" em vez de fingir que ela nunca começou.
    if (
      ap.stagesDone.length > 0 ||
      ap.goldens.length > 0 ||
      ap.secretsFound.length > 0 ||
      profile.inProgress?.levelId === adv.runs[ap.runIndex]?.levelId
    )
      return 'IN_PROGRESS';
    return 'AVAILABLE';
  }

  snapshotStates(): Record<string, LevelState> {
    const out: Record<string, LevelState> = {};
    for (const a of ADVENTURES) out[a.id] = this.state(a.id);
    return out;
  }

  /** Aventura que o mapa destaca: a primeira disponível ou em andamento. */
  currentAdventureId(): string {
    const next = ADVENTURES.find((a) => {
      const s = this.state(a.id);
      return s === 'AVAILABLE' || s === 'IN_PROGRESS';
    });
    return next?.id ?? ADVENTURES[ADVENTURES.length - 1].id;
  }

  /** Qual jogada começar: continua de onde parou, ou do começo se já concluiu. */
  runIndexToPlay(id: string): number {
    const adv = getAdventure(id);
    if (!adv) return 0;
    const ap = this.progress(id);
    if (ap.completed) return 0;
    const i = adv.runs.findIndex((r) => r.stages.some((s) => !ap.stagesDone.includes(s)));
    return i < 0 ? 0 : i;
  }

  stageSummaries(adv: AdventureDef, ids: string[]): StageSummary[] {
    return adv.stages.filter((s) => ids.includes(s.id)).map((s) => ({ stageId: s.id, name: s.name, outcome: s.outcome }));
  }

  /** Próxima etapa ainda não concluída (para o mapa mostrar o objetivo atual). */
  nextStage(id: string): { name: string; mission: string } | null {
    const adv = getAdventure(id);
    if (!adv) return null;
    const ap = this.progress(id);
    const s = adv.stages.find((x) => !ap.stagesDone.includes(x.id));
    return s ? { name: s.name, mission: s.mission } : null;
  }

  // ---------------------------------------------------------------- aplicar resultado

  /**
   * Aplica o resultado de UMA jogada da aventura.
   * Guarda sempre o que é permanente (etapas, dourados, segredos) — mesmo se a criança
   * sair no meio — e só fecha a aventura quando a última jogada termina.
   */
  applyRun(adventureId: string, runIndex: number, r: LevelRunResult): RunApplied {
    const adv = getAdventure(adventureId);
    const profile = this.profiles.require();
    if (!adv) throw new Error(`Aventura desconhecida: ${adventureId}`);
    const run = adv.runs[runIndex];
    if (!run) throw new Error(`Jogada ${runIndex} não existe em ${adventureId}`);
    if (!Number.isFinite(r.timeSec) || r.timeSec < 0) r = { ...r, timeSec: 0 };
    const ap = this.ensure(adventureId);

    // --- Ursinhos dourados: id permanente, uma vez só (17.1)
    const newGoldens: string[] = [];
    for (const cid of r.collectiblesFound) {
      const gid = goldenIdOf(adv, cid);
      if (!gid || ap.goldens.includes(gid)) continue;
      ap.goldens.push(gid);
      newGoldens.push(gid);
    }
    // --- Segredos
    for (const s of r.secretsFound) {
      if (!ap.secretsFound.includes(s)) ap.secretsFound.push(s);
      if (!profile.secrets.includes(s)) profile.secrets.push(s);
    }
    ap.bestCoins = Math.max(ap.bestCoins, r.coinsCollected);
    this.save.markDirty();

    if (!r.completed) {
      // Saiu no meio: o que foi descoberto fica guardado, a aventura continua pendente.
      void this.save.flush();
      return { kind: 'incomplete', stages: this.stageSummaries(adv, ap.stagesDone) };
    }

    // --- Etapas concluídas: o que a fase relatou (quando ela sabe) ou as etapas
    // declaradas pela jogada em data/adventures.ts.
    const reported = (r.stagesDone ?? []).filter((s) => run.stages.includes(s));
    for (const sid of reported.length ? reported : run.stages) if (!ap.stagesDone.includes(sid)) ap.stagesDone.push(sid);
    ap.runIndex = Math.min(runIndex + 1, adv.runs.length - 1);

    const isLastRun = runIndex >= adv.runs.length - 1;
    if (!isLastRun) {
      // Os Divertis desta etapa são creditados AGORA: a criança viu cada moeda subir no
      // contador, e uma aventura de várias etapas não pode perder o que ela juntou na
      // primeira (os bônus finitos continuam só no fim, pelo livro-caixa).
      if (r.divertisCollected > 0) this.currency.earn(r.divertisCollected, `aventura:${adv.id}:etapa${runIndex + 1}`);
      for (const [k, v] of Object.entries(r.stats)) if (v) this.profiles.addStat(k, v);
      void this.save.flush();
      const next = this.nextStage(adventureId);
      return {
        kind: 'nextRun',
        nextIndex: runIndex + 1,
        stages: this.stageSummaries(adv, run.stages),
        nextStageMission: next?.mission ?? 'Continuar a aventura',
        divertis: r.divertisCollected,
      };
    }

    return { kind: 'done', outcome: this.finishAdventure(adv, r) };
  }

  // ---------------------------------------------------------------- fechar aventura

  private finishAdventure(adv: AdventureDef, r: LevelRunResult): AdventureOutcome {
    const ap = this.ensure(adv.id);
    const params = getDifficultyParams(r.difficulty);
    const prevBestStars = Math.min(3, ap.objectivesMet.length);
    const beforeStates = this.snapshotStates();

    // --- Estrelas: conjunto de objetivos (nunca soma repetida)
    const met = new Set(ap.objectivesMet);
    met.add(COMPLETION_OBJECTIVE);
    const fakeLevel = { objectives: adv.bonusObjectives } as never;
    for (const id of StarManager.evaluate(fakeLevel, r, params).met) met.add(id);
    ap.objectivesMet = [...met];
    const stars = Math.min(3, ap.objectivesMet.length);

    const isFirstCompletion = !ap.completed;
    ap.completed = true;
    ap.completions += 1;
    if (!ap.completedDifficulties.includes(r.difficulty)) ap.completedDifficulties.push(r.difficulty);
    if (r.timeSec > 0 && (ap.bestTimeSec === null || r.timeSec < ap.bestTimeSec)) ap.bestTimeSec = Math.round(r.timeSec * 10) / 10;
    const newBestTime = false;

    // --- Divertis: moedas coletadas valem sempre; bônus finitos passam pelo livro-caixa
    const lines: RewardLine[] = [];
    const itemsGranted: string[] = [];
    if (r.divertisCollected > 0) lines.push({ icon: '🪙', label: 'Divertis coletados', amount: r.divertisCollected });

    let bonus = 0;
    const addBonus = (icon: string, label: string, amount: number) => {
      if (amount <= 0) return;
      lines.push({ icon, label, amount });
      bonus += amount;
    };
    const rewards = ECONOMY.levelRewards[adv.size];
    const key = (...parts: string[]) => this.ledger.key([adv.id, ...parts]);

    if (this.ledger.grantOnce(key('primeira'), 'divertis', rewards.firstCompletion, 'Primeira conclusão da aventura')) {
      addBonus('🏁', 'Aventura concluída!', rewards.firstCompletion);
    } else {
      addBonus('🏁', 'Concluída de novo!', rewards.replayCompletion);
    }

    const newStarIds = [...met].filter((id) => !new Set(this.starsPaidFor(adv.id)).has(id));
    let paidStars = 0;
    for (const id of newStarIds) {
      if (this.ledger.grantOnce(key('estrela', id), 'star', ECONOMY.perNewStar, `Objetivo de estrela: ${id}`)) paidStars++;
    }
    addBonus('⭐', paidStars === 1 ? 'Estrela nova!' : 'Estrelas novas!', paidStars * ECONOMY.perNewStar);

    if (stars === 3 && this.ledger.grantOnce(key('tresEstrelas'), 'divertis', ECONOMY.threeStarBonus, '3 estrelas na aventura')) {
      addBonus('🌟', '3 estrelas!', ECONOMY.threeStarBonus);
    }
    if (
      ap.completedDifficulties.length > 1 &&
      this.ledger.grantOnce(key('estilo', r.difficulty), 'divertis', ECONOMY.newDifficultyBonus, `Novo estilo: ${r.difficulty}`)
    ) {
      addBonus('🎖️', 'Novo estilo de aventura!', ECONOMY.newDifficultyBonus);
    }
    // Paga os dourados pelo livro-caixa: vale para os que foram achados em QUALQUER
    // etapa desta aventura, e a chave garante uma vez só por ursinho.
    const newGoldens: string[] = [];
    for (const gid of ap.goldens) {
      if (this.ledger.grantOnce(key('dourado', gid), 'golden', ECONOMY.collectibleBonus, `Ursinho dourado ${gid}`)) {
        newGoldens.push(gid);
        addBonus('🧸', 'Ursinho dourado novo!', ECONOMY.collectibleBonus);
      }
    }
    for (const s of ap.secretsFound) {
      if (this.ledger.grantOnce(key('segredo', s), 'divertis', ECONOMY.secretBonus, `Segredo ${s}`))
        addBonus('🔍', 'Segredo descoberto!', ECONOMY.secretBonus);
    }

    // Bônus do estilo incide só sobre os bônus — a base nunca diminui.
    const extra = Math.round(bonus * (params.rewardMul - 1));
    if (extra > 0) lines.push({ icon: DIFFICULTIES[r.difficulty].icon, label: 'Bônus do estilo', amount: extra });

    const totalDivertis = lines.reduce((s, l) => s + l.amount, 0);
    this.currency.earn(totalDivertis, `aventura:${adv.id}`);

    // --- Pontos de Troca (SIMULAÇÃO): só marcos verificáveis e únicos (18.2)
    let tokensEarned = 0;
    if (isFirstCompletion) tokensEarned += this.ledger.earnTokens('primeiraConclusao', key('pontos', 'primeira'), adv.name);
    const placed = adv.goldens.filter((g) => g.from).length;
    if (placed >= 3 && ap.goldens.length >= 3)
      tokensEarned += this.ledger.earnTokens('colecaoCompleta', key('pontos', 'colecao'), adv.name);
    if (ap.objectivesMet.includes(adv.bonusObjectives[0]?.id ?? '—'))
      tokensEarned += this.ledger.earnTokens('missaoEspecialAjuda', key('pontos', 'ajuda'), adv.name);

    // --- Item de recompensa da aventura (uma vez)
    if (adv.worldPiece && this.ledger.grantOnce(key('peca'), 'item', 0, `Peça do mundo: ${adv.worldPiece.name}`)) {
      itemsGranted.push(adv.worldPiece.id);
    }

    for (const [k, v] of Object.entries(r.stats)) if (v) this.profiles.addStat(k, v);
    this.profiles.addStat('adventuresPlayed');
    this.progression.clearInProgress();

    const after = this.snapshotStates();
    const unlocked = Object.keys(after).filter((id) => beforeStates[id] === 'LOCKED' && after[id] !== 'LOCKED');
    for (const id of unlocked) this.bus.emit('levelUnlocked', { levelId: id });
    const achievements = this.achievements.check();
    this.bus.emit('levelCompleted', { levelId: adv.id, stars });
    this.bus.emit('starsChanged', { total: this.totalStars() });
    void this.save.flush();

    return {
      adventureId: adv.id,
      name: adv.name,
      stars,
      prevBestStars,
      objectivesMet: ap.objectivesMet,
      isFirstCompletion,
      rewardLines: lines,
      totalDivertis,
      tokensEarned,
      newGoldens,
      goldensTotal: this.goldenCount(),
      stagesDone: this.stageSummaries(adv, ap.stagesDone),
      unlocked,
      itemsGranted,
      achievements,
      newBestTime,
      chestsReady: this.progression.readyChests(),
      learningLine: adv.learning.line,
    };
  }

  /** Objetivos de estrela que JÁ foram pagos (pelo livro-caixa). */
  private starsPaidFor(adventureId: string): string[] {
    const p = this.profiles.active;
    if (!p) return [];
    const prefix = `${p.id}:${adventureId}:estrela:`;
    return p.grantedKeys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
  }
}
