import { createLogger } from '../core/Logger';
import { MUSIC_TRACKS, type MusicTrack } from './musicData';

const log = createLogger('Audio');

export type SfxId =
  | 'coin'
  | 'gem'
  | 'jump'
  | 'land'
  | 'trampoline'
  | 'star'
  | 'victory'
  | 'secret'
  | 'purchase'
  | 'button'
  | 'back'
  | 'softError'
  | 'checkpoint'
  | 'whoosh'
  | 'bump'
  | 'plop'
  | 'collectible'
  | 'unlock'
  | 'chest'
  | 'equip'
  | 'climb'
  | 'pop'
  | 'note';

/**
 * AudioManager centralizado (seção 38).
 * PLACEHOLDER: todos os sons e músicas são sintetizados em tempo real (Web Audio) — não há
 * arquivos de áudio ainda. Quando existirem, registre-os em `registerSample()`; o jogo passa
 * a usar o arquivo e mantém o sintetizado como reserva.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuffer: AudioBuffer | null = null;
  private samples = new Map<string, AudioBuffer>();
  private sampleUrls = new Map<string, string>();
  private volumes = { master: 0.8, music: 0.5, sfx: 0.9 };
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private currentTrack: MusicTrack | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private lastPlay = new Map<SfxId, number>();
  private duckUntil = 0;

  get unlocked() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Precisa ser chamado a partir de um gesto do usuário (política de autoplay). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.ratio.value = 4;
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        this.noiseBuffer = this.makeNoise();
        this.applyVolumes();
        void this.loadSamples();
        if (this.currentTrack) this.startScheduler();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch (e) {
      log.warn('Áudio indisponível', e);
    }
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.volumes = { master, music, sfx };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
  }

  /** Abaixa a música rapidamente (ex.: durante a narração). */
  duck(seconds: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.duckUntil = Math.max(this.duckUntil, t + seconds);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.2, t, 0.08);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.55, this.duckUntil, 0.4);
  }

  registerSample(id: string, url: string): void {
    this.sampleUrls.set(id, url);
    if (this.ctx) void this.loadSamples();
  }

  private async loadSamples() {
    if (!this.ctx) return;
    for (const [id, url] of this.sampleUrls) {
      if (this.samples.has(id)) continue;
      try {
        const res = await fetch(url);
        const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.samples.set(id, buf);
      } catch (e) {
        log.warn(`Não carregou o som ${id} (${url}); usando som sintetizado.`, e);
      }
    }
  }

  // ------------------------------------------------------------------ SFX

  play(id: SfxId, opts: { pitch?: number; volume?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    // Evita "metralhadora" do mesmo som no mesmo instante.
    const now = ctx.currentTime;
    const last = this.lastPlay.get(id) ?? -1;
    if (now - last < 0.03) return;
    this.lastPlay.set(id, now);

    const sample = this.samples.get(id);
    if (sample) {
      const src = ctx.createBufferSource();
      src.buffer = sample;
      src.playbackRate.value = opts.pitch ?? 1;
      const g = ctx.createGain();
      g.gain.value = opts.volume ?? 1;
      src.connect(g).connect(this.sfxBus);
      src.start();
      return;
    }
    const p = opts.pitch ?? 1;
    const v = opts.volume ?? 1;
    const t = now + 0.005;
    switch (id) {
      case 'coin':
        this.tone('square', 988 * p, t, 0.06, 0.18 * v);
        this.tone('square', 1319 * p, t + 0.06, 0.12, 0.18 * v);
        break;
      case 'gem':
        [1047, 1319, 1568, 2093].forEach((f, i) => this.tone('triangle', f * p, t + i * 0.05, 0.12, 0.22 * v));
        break;
      case 'jump':
        this.sweep('sine', 320 * p, 720 * p, t, 0.16, 0.25 * v);
        break;
      case 'land':
        this.noise(t, 0.07, 0.18 * v, 600);
        this.sweep('sine', 160, 70, t, 0.08, 0.25 * v);
        break;
      case 'trampoline':
        this.sweep('sine', 180 * p, 820 * p, t, 0.32, 0.32 * v, 9);
        break;
      case 'star':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone('triangle', f * p, t + i * 0.07, 0.25, 0.22 * v));
        break;
      case 'victory': {
        const notes = [523, 659, 784, 1047, 784, 1047, 1319];
        const durs = [0.12, 0.12, 0.12, 0.25, 0.12, 0.12, 0.5];
        let tt = t;
        notes.forEach((f, i) => {
          this.tone('square', f, tt, durs[i], 0.13 * v);
          this.tone('triangle', f / 2, tt, durs[i], 0.18 * v);
          tt += durs[i];
        });
        break;
      }
      case 'secret':
        [659, 831, 988, 1319, 1661, 1976].forEach((f, i) => this.tone('sine', f, t + i * 0.06, 0.4, 0.14 * v));
        break;
      case 'purchase':
        this.tone('square', 1568, t, 0.06, 0.15 * v);
        this.tone('square', 2093, t + 0.07, 0.25, 0.15 * v);
        this.noise(t, 0.05, 0.1 * v, 5000);
        break;
      case 'button':
        this.sweep('sine', 600 * p, 900 * p, t, 0.06, 0.2 * v);
        break;
      case 'back':
        this.sweep('sine', 700, 450, t, 0.07, 0.18 * v);
        break;
      case 'softError':
        this.sweep('sine', 420, 300, t, 0.14, 0.18 * v);
        this.sweep('sine', 330, 240, t + 0.12, 0.18, 0.15 * v);
        break;
      case 'checkpoint':
        [880, 1109, 1319].forEach((f, i) => this.tone('sine', f, t + i * 0.08, 0.3, 0.18 * v));
        break;
      case 'whoosh':
        this.noise(t, 0.35, 0.18 * v, 1200, true);
        break;
      case 'bump':
        this.sweep('sine', 260, 110, t, 0.18, 0.35 * v, 14);
        break;
      case 'plop':
        this.sweep('sine', 500 * p, 180 * p, t, 0.12, 0.25 * v);
        this.noise(t, 0.1, 0.12 * v, 900);
        break;
      case 'collectible':
        [1175, 1568, 2349].forEach((f, i) => this.tone('triangle', f, t + i * 0.08, 0.3, 0.2 * v));
        break;
      case 'unlock':
        [523, 784, 1047].forEach((f, i) => this.tone('square', f, t + i * 0.1, 0.22, 0.12 * v));
        break;
      case 'chest':
        this.noise(t, 0.2, 0.15 * v, 700);
        [659, 784, 988, 1319, 1568].forEach((f, i) => this.tone('triangle', f, t + 0.15 + i * 0.07, 0.3, 0.2 * v));
        break;
      case 'equip':
        this.sweep('triangle', 500, 1200, t, 0.12, 0.2 * v);
        break;
      case 'climb':
        this.tone('triangle', 300 * p, t, 0.05, 0.1 * v);
        break;
      case 'note':
        this.tone('triangle', 523 * p, t, 0.38, 0.28 * v);
        this.tone('sine', 1046 * p, t, 0.2, 0.08 * v);
        break;
      case 'pop':
        this.sweep('sine', 900 * p, 1500 * p, t, 0.05, 0.18 * v);
        break;
    }
  }

  private envGain(t: number, dur: number, vol: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  private tone(type: OscillatorType, freq: number, t: number, dur: number, vol: number, bus?: GainNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = this.envGain(t, dur, vol);
    o.connect(g).connect(bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private sweep(type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number, vibrato = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    if (vibrato > 0) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = vibrato;
      lg.gain.value = f1 * 0.06;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    const g = this.envGain(t, dur, vol);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(t: number, dur: number, vol: number, cutoff: number, sweepUp = false, bus?: GainNode) {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    if (sweepUp) f.frequency.exponentialRampToValueAtTime(cutoff * 4, t + dur);
    const g = this.envGain(t, dur, vol);
    src.connect(f).connect(g).connect(bus ?? this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ------------------------------------------------------------------ Música

  playMusic(trackId: string | null): void {
    const track = trackId ? MUSIC_TRACKS[trackId] ?? null : null;
    if (track === this.currentTrack) return;
    this.currentTrack = track;
    this.stopScheduler();
    if (track && this.ctx) this.startScheduler();
  }

  private startScheduler() {
    if (!this.ctx || !this.currentTrack) return;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.schedule(), 50);
  }

  private stopScheduler() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private schedule() {
    const ctx = this.ctx;
    const tr = this.currentTrack;
    if (!ctx || !tr || ctx.state !== 'running') return;
    const stepDur = 60 / tr.bpm / 2; // colcheias
    while (this.nextNoteTime < ctx.currentTime + 0.2) {
      this.playStep(tr, this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % (tr.progression.length * 8);
    }
  }

  private playStep(tr: MusicTrack, step: number, t: number, sd: number) {
    const bar = Math.floor(step / 8);
    const s = step % 8;
    const chord = tr.progression[bar % tr.progression.length];
    const root = tr.root + chord.root;
    const freq = (semi: number) => 440 * Math.pow(2, (semi - 9) / 12); // semi relativo a C4
    const bus = this.musicBus;
    // Baixo nos tempos 1 e 3 (e uma síncope).
    if (s === 0 || s === 4 || (tr.style === 'bouncy' && s === 7)) this.tone('triangle', freq(root - 24), t, sd * 1.8, 0.35, bus);
    // Acorde suave no início do compasso.
    if (s === 0) for (const iv of chord.intervals) this.tone('sine', freq(root + iv), t, sd * 7, 0.07, bus);
    // Arpejo.
    const arp = tr.arp[s % tr.arp.length];
    if (arp !== null) {
      const iv = chord.intervals[arp % chord.intervals.length] + (arp >= chord.intervals.length ? 12 : 0);
      this.tone(tr.lead, freq(root + 12 + iv), t, sd * 0.9, 0.06, bus);
    }
    // Percussão leve.
    if (tr.drums) {
      if (s === 0 || s === 4) this.kick(t);
      if (s === 2 || s === 6) this.noise(t, 0.05, 0.05, 7000, false, bus);
      if (s % 2 === 1) this.noise(t, 0.02, 0.025, 9000, false, bus);
    }
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = this.envGain(t, 0.14, 0.4);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.2);
  }
}
