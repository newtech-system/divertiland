import type { GameManager } from '../../core/GameManager';
import { ACHIEVEMENTS } from '../../data/achievements';
import { h } from '../dom';

export function openAchievements(g: GameManager) {
  const s = g.services;
  const rows = ACHIEVEMENTS.map((a) => {
    const done = s.achievements.isUnlocked(a.id);
    const { current, target } = s.achievements.progressOf(a);
    return h(
      'div',
      { class: `ach-row ${done ? '' : 'locked'}` },
      h('div', { class: 'a-ico' }, a.icon),
      h(
        'div',
        { class: 'grow' },
        h('div', { class: 'a-name' }, a.name, done ? ' ✔' : ''),
        h('div', { class: 'a-desc' }, a.description),
        done ? null : h('div', { class: 'progress', style: 'margin-top:4px;height:10px' }, h('div', { style: `width:${Math.min(100, (current / target) * 100)}%` })),
      ),
      h('div', { class: 'a-reward' }, `🪙 ${a.reward}`),
    );
  });
  const count = ACHIEVEMENTS.filter((a) => s.achievements.isUnlocked(a.id)).length;
  g.ui.modal(h('div', { class: 'panel' }, h('h2', { class: 'title-l' }, `🏆 Conquistas ${count}/${ACHIEVEMENTS.length}`), h('div', { style: 'margin-top:12px' }, ...rows)));
  g.speak('Conquistas');
}
