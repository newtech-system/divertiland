import type { GameManager } from '../../core/GameManager';
import type { SettingsData } from '../../systems/save/SaveTypes';
import { ALL_LEVELS } from '../../data/worlds';
import { h } from '../dom';
import { btn } from '../components/widgets';

const SKILL_LABEL: Record<string, string> = {
  observation: 'Observação',
  memory: 'Memória',
  coordination: 'Coordenação',
  planning: 'Planejamento',
  persistence: 'Persistência',
  logic: 'Lógica',
  spatial_awareness: 'Orientação espacial',
  decision_making: 'Tomada de decisão',
  creativity: 'Criatividade',
  attention: 'Atenção',
  empathy: 'Empatia',
};

/** Ajustes (seção 32): volumes, narração, câmera, qualidade e controles. */
export function openSettings(g: GameManager) {
  const s = g.settings;
  const slider = (icon: string, label: string, key: keyof SettingsData, min = 0, max = 1, step = 0.05) => {
    const input = h('input', { type: 'range', min, max, step, value: String(s[key]), 'aria-label': label }) as HTMLInputElement;
    input.addEventListener('input', () => g.updateSettings({ [key]: Number(input.value) } as Partial<SettingsData>));
    input.addEventListener('change', () => g.audio.play('coin'));
    return h('div', { class: 'setting-row' }, h('span', { class: 'ico' }, icon), h('span', { style: 'min-width:110px' }, label), input);
  };
  const seg = <T extends string | boolean>(icon: string, label: string, key: keyof SettingsData, options: [T, string][]) => {
    const wrap = h('div', { class: 'seg' });
    const render = () =>
      wrap.replaceChildren(
        ...options.map(([v, l]) =>
          h(
            'button',
            {
              class: (g.settings[key] as unknown) === v ? 'on' : '',
              onclick: () => {
                g.audio.play('pop');
                g.updateSettings({ [key]: v } as Partial<SettingsData>);
                render();
              },
            },
            l,
          ),
        ),
      );
    render();
    return h('div', { class: 'setting-row' }, h('span', { class: 'ico' }, icon), h('span', null, label), wrap);
  };

  const panel = h(
    'div',
    { class: 'panel' },
    h('h2', { class: 'title-l' }, '⚙️ Ajustes'),
    slider('🔊', 'Volume', 'masterVolume'),
    slider('🎵', 'Música', 'musicVolume'),
    slider('💥', 'Efeitos', 'sfxVolume'),
    seg('🗣️', 'Narração', 'narration', [
      [true, 'Sim'],
      [false, 'Não'],
    ]),
    slider('🎥', 'Câmera', 'cameraSensitivity', 0.3, 2.5, 0.1),
    seg('↕️', 'Inverter câmera', 'invertCameraY', [
      [false, 'Não'],
      [true, 'Sim'],
    ]),
    seg('📱', 'Controles de toque', 'touchControls', [
      ['auto', 'Auto'],
      ['on', 'Sim'],
      ['off', 'Não'],
    ]),
    seg('✨', 'Gráficos', 'quality', [
      ['low', 'Leve'],
      ['medium', 'Médio'],
      ['high', 'Bonito'],
    ]),
    seg('🌙', 'Menos movimento', 'reducedMotion', [
      [false, 'Não'],
      [true, 'Sim'],
    ]),
    !g.narrator.available ? h('div', { style: 'font-size:14px;color:#5b4a86;margin-top:6px' }, 'Narração: nenhuma voz em português instalada neste aparelho.') : null,
    h(
      'div',
      { class: 'row center wrap', style: 'margin-top:14px' },
      g.profile ? btn(g, 'Trocar jogador', { icon: '👥', cls: 'white small', onClick: () => (g.ui.closeAllModals(), g.goProfiles()) }) : null,
      g.profile ? btn(g, 'Área dos pais', { icon: '👨‍👩‍👧', cls: 'white small', onClick: () => openParents(g) }) : null,
    ),
  );
  g.ui.modal(panel);
}

/**
 * Área dos pais: mostra o progresso e as HABILIDADES trabalhadas (skillFocus, seção 26) —
 * nunca exibidas para a criança como "aula". Apagar perfil exige segurar o botão.
 */
function openParents(g: GameManager) {
  const s = g.services;
  const p = g.profile!;
  const skillCount = new Map<string, number>();
  for (const l of ALL_LEVELS) {
    if (!p.levels[l.id]?.completed) continue;
    for (const sk of l.skillFocus) skillCount.set(sk, (skillCount.get(sk) ?? 0) + 1);
  }
  const hold = btn(g, 'Segure para apagar este jogador', { icon: '🗑️', cls: 'orange small', sound: null, onClick: () => {} });
  let timer: ReturnType<typeof setTimeout> | null = null;
  hold.addEventListener('pointerdown', () => {
    hold.style.filter = 'brightness(0.8)';
    timer = setTimeout(() => {
      s.profiles.remove(p.id);
      void s.save.flush();
      g.ui.closeAllModals();
      g.ui.toast('🗑️', 'Jogador apagado.');
      g.afterTitle();
    }, 3000);
  });
  const cancel = () => {
    hold.style.filter = '';
    if (timer) clearTimeout(timer);
  };
  hold.addEventListener('pointerup', cancel);
  hold.addEventListener('pointerleave', cancel);

  const panel = h(
    'div',
    { class: 'panel' },
    h('h2', { class: 'title-l' }, '👨‍👩‍👧 Área dos pais'),
    h('p', { style: 'font-size:16px;color:#5b4a86' }, `Jogador: ${p.name}. O progresso fica salvo somente neste aparelho. Nenhum dado pessoal além do apelido é guardado, e não há compras com dinheiro real.`),
    h('div', { class: 'setting-row' }, '🗺️ Fases concluídas', h('b', { style: 'margin-left:auto' }, String(s.progression.completedCount()))),
    h('div', { class: 'setting-row' }, '⭐ Estrelas', h('b', { style: 'margin-left:auto' }, String(s.progression.totalStars()))),
    h('div', { class: 'setting-row' }, '🪙 Divertis ganhos no total', h('b', { style: 'margin-left:auto' }, String(p.totalEarned))),
    h('h3', null, 'Habilidades praticadas'),
    skillCount.size
      ? h('div', { class: 'col', style: 'gap:6px' }, ...[...skillCount.entries()].map(([k, n]) => h('div', { class: 'setting-row' }, SKILL_LABEL[k] ?? k, h('b', { style: 'margin-left:auto' }, `${n} fase(s)`))))
      : h('p', null, 'Conclua fases para ver as habilidades trabalhadas.'),
    h('div', { class: 'row center', style: 'margin-top:12px' }, hold),
  );
  g.ui.modal(panel);
}
