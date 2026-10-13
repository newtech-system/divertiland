import { createLogger } from '../core/Logger';
import type { EventBus } from '../core/EventBus';
import { REWARD_MODE, TOKEN_SOURCES } from '../data/rewards';
import type { ProfileManager } from './ProfileManager';
import type { SaveManager } from './save/SaveManager';
import type { LedgerEntry } from './save/SaveTypes';

const log = createLogger('RewardLedger');

/**
 * LIVRO-CAIXA DE RECOMPENSAS (seção 19 do prompt mestre V2).
 *
 * Toda recompensa **finita** passa por aqui com uma **chave estável**:
 * `perfil:aventura:objetivo`. Repetir o pedido — clique duplo, duas abas, falha de rede,
 * jogar a fase de novo, trocar de estilo, reinstalar — devolve o que já existe e
 * **não credita de novo** (cenários 26.2 #1, #2, #3, #5).
 *
 * Limites honestos (o documento pede para dizer o que NÃO está protegido):
 *  - isto roda no aparelho da criança. Protege contra repetição, clique duplo e corrida
 *    entre operações, e deixa histórico auditável;
 *  - **não** protege contra alguém editar o save de propósito. Saldo resgatável de
 *    verdade exige servidor como autoridade (seção 19.1) — por isso os Pontos de Troca
 *    estão em modo `simulacao` e nenhum resgate real existe no jogo.
 */
export class RewardLedger {
  constructor(
    private profiles: ProfileManager,
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  /** Chave de idempotência de um direito. */
  key(parts: (string | number)[]): string {
    const p = this.profiles.active;
    return [p?.id ?? 'sem-perfil', ...parts].join(':');
  }

  granted(key: string): boolean {
    return this.profiles.active?.grantedKeys.includes(key) ?? false;
  }

  /**
   * Registra um direito UMA vez. Devolve false se já havia sido concedido antes
   * (e nesse caso nada é creditado nem debitado).
   */
  grantOnce(key: string, kind: LedgerEntry['kind'], amount: number, reason: string): boolean {
    const p = this.profiles.active;
    if (!p) return false;
    if (p.grantedKeys.includes(key)) {
      log.info(`Direito já concedido antes, ignorando: ${key}`);
      return false;
    }
    p.grantedKeys.push(key);
    if (p.grantedKeys.length > 4000) p.grantedKeys.splice(0, p.grantedKeys.length - 4000);
    const entry: LedgerEntry = {
      key,
      kind,
      amount: Math.round(amount),
      reason,
      at: Date.now(),
      simulated: REWARD_MODE === 'simulacao',
    };
    p.ledger.push(entry);
    if (p.ledger.length > 300) p.ledger.splice(0, p.ledger.length - 300);
    this.save.markDirty();
    return true;
  }

  // ---------------------------------------------------------------- Pontos de Troca

  get tokens(): number {
    return this.profiles.active?.tokens ?? 0;
  }

  /**
   * Emite Pontos de Troca de um marco verificável, uma vez só.
   * `sourceId` tem de existir em TOKEN_SOURCES — nada de valor solto no meio do código.
   */
  earnTokens(sourceId: string, key: string, reasonLabel: string): number {
    const src = TOKEN_SOURCES.find((s) => s.id === sourceId);
    const p = this.profiles.active;
    if (!src || !p) return 0;
    if (!this.grantOnce(key, 'tokens', src.points, `${src.label} — ${reasonLabel}`)) return 0;
    p.tokens = Math.max(0, p.tokens + src.points);
    this.bus.emit('tokensChanged', { total: p.tokens, delta: src.points, reason: sourceId });
    return src.points;
  }

  history(): LedgerEntry[] {
    return this.profiles.active?.ledger ?? [];
  }

  /** Resumo para a área dos responsáveis (nunca para a tela da criança). */
  summary(): { tokens: number; simulated: boolean; entries: number } {
    return { tokens: this.tokens, simulated: REWARD_MODE === 'simulacao', entries: this.history().length };
  }
}
