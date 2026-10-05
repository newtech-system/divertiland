import { createLogger } from '../core/Logger';

const log = createLogger('Narrator');

/**
 * Narração em voz alta das falas dos mascotes — essencial para crianças que ainda não leem
 * (seções 3 e 32). PLACEHOLDER para a futura dublagem do Jhow e da Mina.
 *
 * Privacidade: só usamos vozes que rodam no próprio aparelho (`localService`), para que
 * nenhum texto (como o apelido da criança) seja enviado para servidores de voz.
 */
export class Narrator {
  enabled = true;
  private voice: SpeechSynthesisVoice | null = null;
  private supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  constructor() {
    if (!this.supported) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices().filter((v) => v.localService);
      this.voice =
        voices.find((v) => v.lang === 'pt-BR') ?? voices.find((v) => v.lang.startsWith('pt')) ?? null;
      if (!this.voice && voices.length) log.info('Nenhuma voz local em português — narração desativada.');
    };
    pick();
    window.speechSynthesis.addEventListener?.('voiceschanged', pick);
  }

  get available() {
    return this.supported && !!this.voice;
  }

  /** Fala o texto (interrompe a fala anterior). Retorna a duração estimada em segundos. */
  say(text: string, opts: { pitch?: number; rate?: number } = {}): number {
    const clean = text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();
    const estimate = Math.max(1.2, clean.length * 0.065);
    if (!this.enabled || !this.available || !clean) return 0;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.voice = this.voice;
      u.lang = this.voice!.lang;
      u.rate = opts.rate ?? 1.02;
      u.pitch = opts.pitch ?? 1.25;
      window.speechSynthesis.speak(u);
      return estimate;
    } catch (e) {
      log.warn('Falha na narração', e);
      return 0;
    }
  }

  stop(): void {
    if (this.supported) window.speechSynthesis.cancel();
  }
}
