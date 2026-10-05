import type { EventBus } from '../core/EventBus';
import { DIFFICULTIES, getDifficultyParams } from '../data/difficulty';
import { ECONOMY } from '../data/economy';
import { getLevel } from '../data/worlds';
import type { AchievementSystem } from './AchievementSystem';
import type { CurrencyManager } from './CurrencyManager';
import type { InventoryManager } from './InventoryManager';
import type { LevelOutcome, LevelRunResult, RewardLine } from './LevelResult';
import type { ProfileManager } from './ProfileManager';
import type { ProgressionManager } from './ProgressionManager';
import type { SaveManager } from './save/SaveManager';
import { StarManager } from './StarManager';

/**
 * Aplica o resultado de uma partida: estrelas, Divertis, desbloqueios, itens e conquistas.
 * É o "coração" do ciclo FASE → RECOMPENSA → MAPA, e é 100% testável sem gráficos.
 */
export class LevelCompletionService {
  constructor(
    private profiles: ProfileManager,
    private progression: ProgressionManager,
    private currency: CurrencyManager,
    private inventory: InventoryManager,
    private achievements: AchievementSystem,
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  apply(r: LevelRunResult): LevelOutcome {
    const level = getLevel(r.levelId);
    const profile = this.profiles.require();
    if (!level) throw new Error(`Fase desconhecida: ${r.levelId}`);

    // Valida o resultado recebido (nunca deixar um valor estranho estragar o save).
    if (!Number.isFinite(r.timeSec) || r.timeSec < 0) r = { ...r, timeSec: 0 };
    const params = getDifficultyParams(r.difficulty, level.difficultyOverrides);
    const before = this.progression.snapshotStates();
    const lp = this.progression.ensureProgress(level.id);
    const prevBestStars = lp.bestStars;
    const { stars, met } = StarManager.evaluate(level, r, params);
    const lines: RewardLine[] = [];
    const itemsGranted: string[] = [];
    const isFirstCompletion = r.completed && !lp.completed;

    // Moedas coletadas sempre valem (a criança viu cada uma subir no contador).
    if (r.divertisCollected > 0) lines.push({ icon: '🪙', label: 'Divertis coletados', amount: r.divertisCollected });

    let bonus = 0;
    const addBonus = (icon: string, label: string, amount: number) => {
      if (amount <= 0) return;
      lines.push({ icon, label, amount });
      bonus += amount;
    };

    const rewards = { ...ECONOMY.levelRewards[level.size], ...(level.rewards ?? {}) };
    let newBestTime = false;

    if (r.completed) {
      addBonus('🏁', isFirstCompletion ? 'Fase concluída!' : 'Concluída de novo!', isFirstCompletion ? rewards.firstCompletion : rewards.replayCompletion);

      const newStars = Math.max(0, stars - prevBestStars);
      addBonus('⭐', newStars === 1 ? 'Estrela nova!' : 'Estrelas novas!', newStars * ECONOMY.perNewStar);
      if (stars === 3 && !lp.threeStarRewardClaimed) {
        addBonus('🌟', '3 estrelas!', ECONOMY.threeStarBonus);
        lp.threeStarRewardClaimed = true;
        if (level.rewardItemOnThreeStars && this.inventory.grant(level.rewardItemOnThreeStars))
          itemsGranted.push(level.rewardItemOnThreeStars);
      }
      if (!lp.completedDifficulties.includes(r.difficulty)) {
        if (lp.completedDifficulties.length > 0) addBonus('🎖️', 'Novo estilo de aventura!', ECONOMY.newDifficultyBonus);
        lp.completedDifficulties.push(r.difficulty);
      }
      if (isFirstCompletion) {
        lp.firstRewardClaimed = true;
        if (level.rewardItemOnComplete && this.inventory.grant(level.rewardItemOnComplete))
          itemsGranted.push(level.rewardItemOnComplete);
      }

      lp.completed = true;
      lp.completions += 1;
      lp.bestStars = Math.max(lp.bestStars, stars);
      lp.objectivesMet = [...new Set([...lp.objectivesMet, ...met])];
      lp.bestCoins = Math.max(lp.bestCoins, r.coinsCollected);
      if (r.timeSec > 0 && (lp.bestTimeSec === null || r.timeSec < lp.bestTimeSec)) {
        newBestTime = lp.bestTimeSec !== null;
        lp.bestTimeSec = Math.round(r.timeSec * 10) / 10;
      }
      if (r.coinsTotal > 0 && r.coinsCollected >= r.coinsTotal) this.profiles.addStat('perfectCoinLevels');
    }

    // Segredos e colecionáveis contam mesmo se a criança sair antes do fim.
    const newSecrets = r.secretsFound.filter((s) => !lp.secretsFound.includes(s));
    addBonus('🔍', newSecrets.length > 1 ? 'Segredos descobertos!' : 'Segredo descoberto!', newSecrets.length * ECONOMY.secretBonus);
    lp.secretsFound.push(...newSecrets);
    for (const s of newSecrets) if (!profile.secrets.includes(s)) profile.secrets.push(s);

    const newCollectibles = r.collectiblesFound.filter((c) => !lp.collectiblesFound.includes(c));
    addBonus('🧸', 'Colecionáveis novos!', newCollectibles.length * ECONOMY.collectibleBonus);
    lp.collectiblesFound.push(...newCollectibles);

    // Bônus do estilo de aventura (só sobre os bônus, nunca reduz nada).
    const extra = Math.round(bonus * (params.rewardMul - 1));
    if (extra > 0) lines.push({ icon: DIFFICULTIES[r.difficulty].icon, label: 'Bônus do estilo', amount: extra });

    for (const [k, v] of Object.entries(r.stats)) if (v) this.profiles.addStat(k, v);
    this.profiles.addStat('levelsPlayed');

    const total = lines.reduce((s, l) => s + l.amount, 0);
    this.currency.earn(total, `fase:${level.id}`);
    this.progression.clearInProgress(level.id);

    const after = this.progression.snapshotStates();
    const unlockedLevels = Object.keys(after).filter((id) => before[id] === 'LOCKED' && after[id] !== 'LOCKED');
    for (const id of unlockedLevels) this.bus.emit('levelUnlocked', { levelId: id });

    const achievements = this.achievements.check();
    if (r.completed) this.bus.emit('levelCompleted', { levelId: level.id, stars });
    this.bus.emit('starsChanged', { total: this.progression.totalStars() });
    void this.save.flush();

    return {
      levelId: level.id,
      stars,
      prevBestStars,
      objectivesMet: met,
      isFirstCompletion,
      rewardLines: lines,
      totalDivertis: total,
      unlockedLevels,
      itemsGranted,
      achievements,
      newBestTime,
      chestsReady: this.progression.readyChests(),
    };
  }
}
