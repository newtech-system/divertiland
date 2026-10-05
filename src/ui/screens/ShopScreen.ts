import type { ItemSlot, ShopCategory } from '../../core/types';
import { REQUIRED_SLOTS } from '../../core/types';
import { CHARACTERS } from '../../data/characters';
import { COLLECTIONS, ITEMS, itemFitsCharacter, type ItemDef } from '../../data/items';
import { ShopManager } from '../../systems/ShopManager';
import { h } from '../dom';
import { Screen } from '../UIManager';
import { btn } from '../components/widgets';

type Tab = ShopCategory | 'mine';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'clothes', icon: '👕', label: 'Roupas' },
  { id: 'accessories', icon: '🎧', label: 'Acessórios' },
  { id: 'special', icon: '✨', label: 'Especiais' },
  { id: 'collections', icon: '🏅', label: 'Coleções' },
  { id: 'mine', icon: '🎒', label: 'Meus itens' },
];

/**
 * LOJA + GUARDA-ROUPA (seções 24 e 25).
 * Tocar num item = provar no personagem (prévia). Comprar exige 2 toques (sem compra acidental).
 * Só Divertis do jogo — nenhuma compra com dinheiro real, nenhum item aleatório.
 */
export class ShopScreen extends Screen {
  private tab: Tab = 'clothes';
  private selected: ItemDef | null = null;
  private confirming = false;
  private grid!: HTMLElement;
  private tabsEl!: HTMLElement;
  private stageEl!: HTMLElement;
  private moneyEl!: HTMLElement;
  private actionEl: HTMLElement | null = null;
  private root!: HTMLElement;

  build(): HTMLElement {
    const g = this.game;
    this.stageEl = h('div', { class: 'stage' }, h('div', { class: 'stage-floor' }));
    this.moneyEl = h('div', { class: 'pill' });
    this.tabsEl = h('div', { class: 'shop-tabs' });
    this.grid = h('div', { class: 'shop-grid' });
    const left = h(
      'div',
      { class: 'shop-left' },
      h(
        'div',
        { class: 'row' },
        btn(g, null, { icon: '⬅️', cls: 'round white', aria: 'Voltar ao mapa', sound: 'back', onClick: () => g.goMap() }),
        h('h2', { class: 'title-l', style: 'color:#fff;text-shadow:0 3px 0 #4b1a9e' }, 'Loja'),
        h('div', { class: 'grow' }),
        this.moneyEl,
      ),
      this.stageEl,
    );
    const right = h('div', { class: 'shop-right' }, this.tabsEl, this.grid);
    this.root = h('div', { class: 'screen shop-screen' }, left, right);
    this.renderAll();
    return this.root;
  }

  stage() {
    return this.stageEl;
  }

  onShow() {
    this.preview();
    this.game.speak('Bem-vindo à loja! Toque num item para experimentar.');
  }

  onHide() {
    // Itens vistos deixam de mostrar "NOVO".
    for (const i of this.game.services.inventory.ownedItems()) this.game.services.inventory.markSeen(i.id);
  }

  private get character() {
    return this.game.profile!.character;
  }

  private preview() {
    const s = this.game.services;
    const patch: Partial<Record<ItemSlot, string | null>> = {};
    if (this.selected) patch[this.selected.slot] = this.selected.id;
    const look = s.customization.resolveLook(this.character, this.selected ? patch : undefined);
    this.game.showroom.setCharacter(this.character, look);
  }

  private renderAll() {
    this.moneyEl.replaceChildren(h('span', { class: 'ico' }, '🪙'), String(this.game.services.currency.balance));
    this.tabsEl.replaceChildren(
      ...TABS.map((t) =>
        h(
          'button',
          {
            class: `shop-tab ${t.id === this.tab ? 'on' : ''}`,
            onclick: () => {
              this.game.audio.play('pop');
              this.tab = t.id;
              this.selected = null;
              this.confirming = false;
              this.renderAll();
              this.preview();
            },
          },
          h('span', { class: 'ico' }, t.icon),
          t.label,
        ),
      ),
    );
    this.renderGrid();
    this.renderAction();
  }

  private renderGrid() {
    const s = this.game.services;
    const cards: HTMLElement[] = [];
    if (this.tab === 'collections') {
      for (const col of COLLECTIONS) {
        const items = ITEMS.filter((i) => i.collection === col.id && (!i.hidden || s.inventory.owns(i.id)));
        const owned = items.filter((i) => s.inventory.owns(i.id)).length;
        cards.push(
          h(
            'div',
            { class: 'collection-block' },
            h('h3', null, `${col.icon} ${col.name}  ${owned}/${items.length}`),
            h('div', { style: 'font-size:15px;color:#5b4a86;margin-bottom:6px' }, owned === items.length ? '🎉 Coleção completa!' : col.description),
            h('div', { class: 'progress' }, h('div', { style: `width:${(owned / Math.max(1, items.length)) * 100}%` })),
          ),
        );
        for (const it of items) cards.push(this.card(it));
      }
    } else if (this.tab === 'mine') {
      const mine = s.inventory.ownedItems().filter((i) => itemFitsCharacter(i, this.character));
      for (const it of mine) cards.push(this.card(it));
    } else {
      for (const l of s.shop.listings(this.tab)) cards.push(this.card(l.item));
    }
    this.grid.replaceChildren(...cards);
  }

  private card(it: ItemDef): HTMLElement {
    const g = this.game;
    const s = g.services;
    const owned = s.inventory.owns(it.id);
    const equipped = s.customization.isEquipped(it.id, this.character);
    const fits = itemFitsCharacter(it, this.character);
    const isNew = s.inventory.isNew(it.id);
    let status: HTMLElement;
    if (equipped) status = h('div', { class: 'i-status' }, '✔ Usando');
    else if (owned) status = h('div', { class: 'i-status', style: 'color:#7b2cff' }, 'É seu!');
    else if (it.acquire.type === 'shop') status = h('div', { class: 'i-price' }, `🪙 ${it.price}`);
    else status = h('div', { class: 'i-status', style: 'color:#5b4a86' }, '🔒');
    return h(
      'div',
      {
        class: `item-card ${this.selected?.id === it.id ? 'selected' : ''} ${equipped ? 'equipped' : ''} ${fits ? '' : 'cant'}`,
        role: 'button',
        'aria-label': it.name,
        onclick: () => {
          g.audio.play('pop');
          this.selected = it;
          this.confirming = false;
          if (fits) this.preview();
          this.renderGrid();
          this.renderAction();
          g.speak(it.name);
        },
      },
      isNew ? h('span', { class: 'new-badge' }, 'NOVO!') : null,
      h('div', { class: 'i-ico' }, it.icon),
      h('div', { class: 'i-name' }, it.name),
      status,
    );
  }

  private renderAction() {
    this.actionEl?.remove();
    this.actionEl = null;
    const it = this.selected;
    if (!it) return;
    const g = this.game;
    const s = g.services;
    const owned = s.inventory.owns(it.id);
    const fits = itemFitsCharacter(it, this.character);
    const equipped = s.customization.isEquipped(it.id, this.character);
    const bar = h('div', { class: 'shop-action' }, h('span', { class: 'what' }, `${it.icon} ${it.name}`));

    if (!fits) {
      const who = it.characters?.map((c) => CHARACTERS[c].name).join(' e ');
      bar.append(h('span', { style: 'font-weight:600;color:#5b4a86' }, `Só para ${who}`));
    } else if (owned) {
      if (equipped) {
        if (!REQUIRED_SLOTS.includes(it.slot) || it.acquire.type !== 'default') {
          bar.append(
            btn(g, 'Tirar', {
              icon: '↩️',
              cls: 'white',
              onClick: () => {
                s.customization.unequip(it.slot);
                this.selected = null;
                this.after();
              },
            }),
          );
        } else bar.append(h('span', { style: 'font-weight:700;color:#22c96d' }, '✔ Usando'));
      } else {
        bar.append(
          btn(g, 'Usar', {
            icon: '😎',
            cls: 'green',
            sound: 'equip',
            onClick: () => {
              s.customization.equip(it.id);
              g.showroom.play('celebrate');
              this.after();
            },
          }),
        );
      }
    } else if (it.acquire.type !== 'shop') {
      bar.append(h('span', { style: 'font-weight:600;color:#5b4a86' }, `🔒 ${ShopManager.howToGet(it)}`));
    } else if (!s.currency.canAfford(it.price)) {
      const missing = it.price - s.currency.balance;
      bar.append(h('span', { style: 'font-weight:600;color:#5b4a86' }, `Faltam 🪙 ${missing}. Jogue para ganhar mais!`));
    } else if (!this.confirming) {
      bar.append(
        btn(g, `${it.price}`, {
          icon: '🪙',
          cls: 'yellow',
          aria: `Comprar por ${it.price} Divertis`,
          onClick: () => {
            this.confirming = true;
            g.speak('Quer comprar?');
            this.renderAction();
          },
        }),
      );
    } else {
      bar.append(
        h('span', { style: 'font-weight:700' }, 'Comprar?'),
        btn(g, null, {
          icon: '✖',
          cls: 'round white',
          aria: 'Não',
          sound: 'back',
          onClick: () => {
            this.confirming = false;
            this.renderAction();
          },
        }),
        btn(g, null, {
          icon: '✔',
          cls: 'round green',
          aria: 'Sim, comprar',
          sound: null,
          onClick: () => {
            const res = s.shop.purchase(it.id);
            if (res.ok) {
              g.audio.play('purchase');
              s.customization.equip(it.id);
              s.achievements.check();
              g.showroom.play('celebrate');
              g.ui.toast('🛍️', `${it.name} é seu!`);
            } else g.audio.play('softError');
            this.confirming = false;
            this.after();
          },
        }),
      );
    }
    this.actionEl = bar;
    this.root.append(bar);
  }

  private after() {
    this.renderAll();
    this.preview();
  }
}
