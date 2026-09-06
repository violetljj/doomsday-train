import { CAR_TYPES, CARS, MODS, RECIPES, ROLE_NAMES } from './Catalog.ts';
import type { CarType, CarRole, ModId } from './Catalog.ts';
import type { Combat } from './Combat.ts';
import { previewInstall, recipeChanges, offerSummary } from './ChoicePreview.ts';

/** Presentation only. The host owns Cocos nodes, pointer routing and game actions. */
export interface PanelPrimitives {
  rect(x: number, y: number, w: number, h: number, color: string, radius?: number): void;
  label(text: string, x: number, y: number, size: number, color: string, width?: number, align?: 'left' | 'center' | 'right', font?: 'display' | 'body'): void;
  art?(name: string, x: number, y: number, w: number, h: number): void;
  button(text: string, x: number, y: number, w: number, h: number, action: () => void, accent?: boolean): void;
  cardIcon(type: CarType, x: number, y: number, size: number): void;
  modIcon?(type: ModId | 'repair', x: number, y: number, size: number): void;
  line(points: number[], color: string, width: number): void;
  circle(x: number, y: number, radius: number, color: string): void;
  addHitArea(x: number, y: number, w: number, h: number, action: () => void): void;
}

export interface PanelActions {
  begin(): void;
  selectSlot(index: number): void;
  setAtlas(open: boolean, page: number, cars?: boolean): void;
  installPending(depart?: boolean): void;
  manualPlacement?(): void;
  confirmReplacement?(): void;
  cancelReplacement?(): void;
  mergePending(): void;
  chooseOffer(index: number): void;
  discardOffer(): void;
  resumeWorkshop(): void;
  openWorkshop(): void;
  resume(): void;
  backToMenu(): void;
}

export interface PanelContext {
  model: Combat;
  knownRecipes: ReadonlySet<string>;
  newRecipes: ReadonlySet<string>;
  atlas: boolean;
  atlasPage: number;
  atlasCars: boolean;
  selectedSlot: number;
  replacementConfirmed?: boolean;
  draw: PanelPrimitives;
  actions: PanelActions;
}

const P = {
  ink: '#191D2D', panel: '#252437E8', tile: '#393548E8', edge: '#9CB9C04D',
  cream: '#F0DFD0', muted: '#B9B3C4', gold: '#DBB09F', teal: '#A8DADE',
  blue: '#C0B2DB', red: '#EF9A96', paper: '#F0DFD0',
  signal: '#A8DADE', warning: '#EF9A96',
};
const ROLE_COLOR: Record<CarRole, string> = { offense: P.cream, buff: P.signal, debuff: P.blue };

/** Three deliberate paint passes give labels a brush silhouette, without noise. */
function brush(d: PanelPrimitives, x: number, y: number, w: number, h: number, color: string) {
  d.line([x - w / 2 + 3, y - h * .07, x - w * .12, y + h * .07, x + w / 2 - 4, y + h * .02], color, h * .72);
  d.line([x - w * .43, y + h * .27, x + w * .17, y + h * .3, x + w * .43, y + h * .19], color, h * .23);
  d.line([x - w * .39, y - h * .29, x + w * .38, y - h * .22], color, h * .19);
}

function roleMark(d: PanelPrimitives, role: CarRole, x: number, y: number, r: number, color: string) {
  if (role === 'offense') {
    d.line([x - r * .5, y - r * .4, x + r * .06, y + r * .72, x + r * .5, y - r * .35], color, 3);
    d.line([x, y - r * .65, x + r * .03, y + r * .3], color, 3);
  } else if (role === 'buff') {
    d.line([x - r * .65, y - r * .04, x + r * .65, y + r * .06], color, 4);
    d.line([x - r * .03, y - r * .65, x + r * .04, y + r * .65], color, 4);
  } else {
    d.line([x - r * .5, y + r * .35, x + r * .03, y - r * .65, x + r * .5, y + r * .32], color, 4);
  }
}

function surface(d: PanelPrimitives) {
  d.art?.('paper', 0, 0, 720, 1280);
  // A low-opacity wash keeps the paper grain visible. The broken brush passes
  // carry the edge of the panel so it reads as painted material rather than a
  // single software rectangle.
  d.rect(-320, -425, 640, 840, '#211F3278', 18);
  brush(d, -28, 388, 536, 11, '#E6C9B326');
  brush(d, 48, -393, 472, 9, '#ACCEDC22');
  brush(d, -276, 66, 98, 4, '#DAB6A522');
  brush(d, 272, -108, 116, 3, '#A8DADE1C');
}

function heading(d: PanelPrimitives, title: string, subtitle: string) {
  d.label(title, -278, 348, 42, P.cream, 425, 'left', 'display');
  brush(d, -210, 316, 137, 3, '#DBB09FAA');
  d.label('余晖防线', 223, 351, 20, P.muted, 112, 'center', 'display');
  brush(d, 224, 334, 102, 3, '#C7A8A47A');
  d.label(subtitle, 0, 294, 20, P.muted, 570);
}

/** Gouache note cards use paint weight and paper tabs, not technical outlines. */
function inset(d: PanelPrimitives, x: number, y: number, w: number, h: number, color = P.tile) {
  d.rect(x + 4, y - 4, w - 5, h, '#12111F66', 6);
  d.rect(x, y, w, h, '#292739B8', 8);
  d.rect(x + 1, y + 1, w - 2, h - 2, color, 5);
  // Keep underpainting local and irregular so the card has a paper edge.
  brush(d, x + w * .19, y + h * .58, Math.min(122, w * .25), h * .55, '#AB879226');
  brush(d, x + w * .62, y + h - 3, w * .72, 2, '#BFA8B855');
  brush(d, x + w * .51, y + 4, w * .56, 4, '#14182930');
  d.line([x + 9, y + h - 8, x + w * .24, y + h - 6, x + w * .42, y + h - 9], '#E8C9B52C', 1);
}

function badge(d: PanelPrimitives, text: string, x: number, y: number, width: number, color: string, fontSize = 20) {
  brush(d, x, y-12, width*.74, 2, color+'77');
  brush(d, x - width * .28, y - 3, width * .19, 1.2, color+'3D');
  d.label(text, x, y+1, fontSize, color, width - 4, 'center', 'body');
}

function menu(c: PanelContext) {
  const d = c.draw;
  d.art?.('menu', 0, 0, 720, 1280);
  d.label('荒原 · 余晖防线', -263, 520, 23, P.cream, 410, 'left', 'display');
  const title = ['末', '日', '列', '车'];
  title.forEach((word, i) => d.label(word, -90 + (i % 2 ? 17 : 0), 404 - i * 108,
    111, P.cream, 146, 'center', 'display'));
  ['余晖之下', '守护最后的希望'].forEach((phrase, column) => {
    Array.from(phrase).forEach((word, i) => d.label(word, -217 - column * 31, 265 - i * 29,
      22, P.cream, 27, 'center', 'display'));
  });
  // The departure word sits in a painted dusk wash over the illustrated scene.
  brush(d, 0, -352, 279, 91, '#30374B65');
  const curve: number[] = [];
  for (let i = 0; i <= 34; i++) {
    const a = -.1 + i / 34 * Math.PI * 1.72;
    curve.push(Math.cos(a) * 161, -351 + Math.sin(a) * 44 + Math.cos(a) * 14);
  }
  d.line(curve, '#ADD7D888', 2.5);
  brush(d, -139, -382, 34, 5, '#D8C0AE99');
  brush(d, 142, -327, 30, 4, '#B2D5D899');
  d.label('发车', 0, -351, 62, P.cream, 265, 'center', 'display');
  d.addHitArea(0, -351, 352, 104, c.actions.begin);
  d.button('车厢与联动图鉴', 0, -465, 352, 64,
    () => c.actions.setAtlas(true, 0, true), false);
}

function pendingWorkshop(c: PanelContext) {
  const d = c.draw, m = c.model, type = m.pendingCar!;
  const selected = c.selectedSlot, old = selected >= 0 ? m.slots[selected] : null;
  const full = m.slots.every(Boolean), replacing = !!old && full;
  const merging = old?.type === type;
  const mods = old ? (Object.keys(old.mods) as ModId[]).filter(id => MODS[id] && old.mods[id] > 0) : [];
  const confirming = replacing && c.replacementConfirmed;
  const foreground = '#EDF1EA', muted = '#A4B4AE', accent = '#A6DFCD', loss = '#EDA69A';
  // An opaque, unframed work surface keeps the scene texture away from the decision.
  d.rect(-360, -440, 720, 864, '#1B2425FA');
  d.line([-284, 330, 284, 330], '#61777566', 1);
  d.label(confirming ? '确认替换' : '列车工坊', -284, 373, 34, foreground, 350, 'left', 'display');
  d.label(replacing ? '替换车厢' : '装入车厢', 211, 373, 18, muted, 148);

  const arrow = (x: number, y: number, color: string) => {
    d.line([x - 19, y, x + 19, y], color, 2);
    d.line([x + 9, y + 9, x + 19, y, x + 9, y - 9], color, 2);
  };
  if (selected >= 0) {
    if (old) d.cardIcon(old.type, -141, 255, 128);
    else {
      d.circle(-141, 255, 43, '#34413F');
      d.line([-155, 255, -127, 255], muted, 2);
      d.line([-141, 241, -141, 269], muted, 2);
    }
    d.label(old ? CARS[old.type].name : `${selected + 1} 号空位`, -141, 176, 23, muted, 230);
    arrow(0, 255, accent);
    d.circle(141, 255, 69, '#315047');
    d.cardIcon(type, 141, 255, 142);
    d.label(CARS[type].name, 141, 176, 29, foreground, 230, 'center', 'display');
  } else {
    d.circle(-165, 253, 65, '#315047');
    d.cardIcon(type, -165, 253, 134);
    d.label(CARS[type].name, -68, 270, 34, foreground, 350, 'left', 'display');
    d.label('选择装车位置', -68, 222, 22, muted, 350, 'left');
  }

  if (confirming) {
    d.label(`将拆除 ${CARS[old!.type].name} · 强化 ${old!.level} 级`, 0, 111, 23, loss, 566);
    if (!mods.length) d.label('没有已装改装', 0, -13, 23, muted, 566);
    mods.forEach((id, i) => {
      const x = i % 2 ? 152 : -152, y = 25 - Math.floor(i / 2) * 105;
      d.modIcon?.(id, x - 89, y, 54);
      d.label(MODS[id].name, x - 48, y + 12, 21, foreground, 200, 'left');
      d.label(`−${old!.mods[id]}`, x - 48, y - 21, 20, loss, 200, 'left');
    });
    d.line([-284, -160, 284, -160], '#61777566', 1);
    d.label('旧车与以上改装将被移除', 0, -201, 21, loss, 566);
    d.button('确认替换并出发', 0, -303, 566, 70, () => c.actions.installPending(true));
    d.label('返回调整', 0, -383, 23, muted, 300);
    d.addHitArea(0, -383, 400, 58, () => c.actions.cancelReplacement?.());
    return;
  }

  const spacing = 610 / m.slots.length;
  d.line([-286, 20, 286, 20], '#617775', 3);
  m.slots.forEach((car, i) => {
    const x = (i - (m.slots.length - 1) / 2) * spacing, active = i === selected, width = spacing - 12;
    d.rect(x - width / 2, -42, width, 148, active ? '#406658' : '#263332', 5);
    if (active) d.line([x - width / 2 + 1, 104, x + width / 2 - 1, 104], accent, 4);
    d.label(String(i + 1).padStart(2, '0'), x, 83, 18, active ? accent : muted, width);
    if (car) d.cardIcon(car.type, x, 27, 87);
    else {
      d.line([x - 12, 25, x + 12, 25], muted, 2);
      d.line([x, 13, x, 37], muted, 2);
    }
    d.label(car ? CARS[car.type].name.replace('车', '') : '空位', x, -26, 19, active ? foreground : muted, width - 4);
    d.addHitArea(x, 32, width, 148, () => c.actions.selectSlot(i));
  });

  if (selected >= 0) {
    d.label(replacing ? `将拆除 · 强化 ${old!.level} 级 / ${mods.length} 项改装`
      : old ? '旧车移入空位 · 改装保留' : '保留现有车厢', 0, -80, 19, replacing ? loss : muted, 566);
    const delta = recipeChanges(m.slots.map(car => car?.type ?? null), previewInstall(m, selected, type));
    const rows = [...delta.added.map(recipe => ({ recipe, added: true })), ...delta.removed.map(recipe => ({ recipe, added: false }))];
    if (!rows.length) d.label('联动不变', 0, -161, 23, muted, 566);
    rows.forEach(({ recipe, added }, i) => {
      const y = -128 - i * 38, color = added ? accent : loss;
      d.label(added ? '+' : '−', -273, y, 26, color, 32);
      const support = recipe.a === recipe.executor ? recipe.b : recipe.a;
      d.cardIcon(support, -224, y, 34);
      d.cardIcon(recipe.executor, -157, y, 34);
      d.line([-200, y, -181, y], muted, 1);
      d.line([-186, y + 4, -181, y, -186, y - 4], muted, 1);
      d.label(c.knownRecipes.has(recipe.id) ? recipe.name : '未知联动', -118, y, 22, color, 400, 'left');
    });
    const command = !old ? '装车并出发' : full ? '替换旧车' : '插入并出发';
    d.button(command, merging ? -146 : 0, -303, merging ? 272 : 566, 70,
      () => replacing ? c.actions.confirmReplacement?.() : c.actions.installPending(true), !merging);
    if (merging) d.button('合并升级', 146, -303, 272, 70, c.actions.mergePending);
  }
  d.label('手动调整', -146, -383, 22, muted, 260);
  d.addHitArea(-146, -383, 272, 58, () => c.actions.manualPlacement?.());
  d.label('放弃车厢', 146, -383, 22, muted, 260);
  d.addHitArea(146, -383, 272, 58, c.actions.discardOffer);
}

function workshop(c: PanelContext) {
  if (c.model.pendingCar) { pendingWorkshop(c); return; }
  const d = c.draw, m = c.model, links = m.links;
  const selectedCar = c.selectedSlot >= 0 ? m.slots[c.selectedSlot] : null;
  const installed = selectedCar ? (Object.keys(selectedCar.mods) as ModId[])
    .filter(id => MODS[id] && (selectedCar.mods[id] || 0) > 0) : [];
  heading(d, '列车工坊', selectedCar ? `${CARS[selectedCar.type].name} · 已装 ${installed.length} 项词条 · 强化 ${selectedCar.level} 级`
      : '辅助相邻武器 · 前后顺序不限');
  const instruction = c.selectedSlot >= 0 ? `长按拖动交换 · 也可点选另一槽位`
      : '长按车厢拖到目标槽位，松手交换';
  d.label(instruction, 0, 258, 22, c.selectedSlot >= 0 ? P.teal : P.gold, 576);
  const spacing = 610 / m.slots.length;
  d.line([-302, 146, -6, 149, 302, 146], '#B7ABAE4D', 2);
  d.line([-302, 157, 8, 155, 302, 158], '#B7ABAE4D', 2);
  m.slots.forEach((car, i) => {
    const x = (i - (m.slots.length - 1) / 2) * spacing, selected = c.selectedSlot === i;
    const width = spacing - 10, lift = selected ? 6 : 0;
    inset(d, x - width / 2, 46 + lift, width, 187, selected ? '#607F8BB8' : car ? '#685365AA' : '#403B5266');
    if (selected) {
      brush(d, x, 228 + lift, width - 8, 6, P.teal);
      d.line([x - 24, 43 + lift, x + 24, 43 + lift], P.teal, 1.5);
      d.line([x - 17, 48 + lift, x - 24, 43 + lift, x - 17, 38 + lift], P.teal, 1.5);
      d.line([x + 17, 48 + lift, x + 24, 43 + lift, x + 17, 38 + lift], P.teal, 1.5);
    }
    if (car) {
      const data = CARS[car.type];
      badge(d, `${i + 1} ${ROLE_NAMES[data.role]}`, x, 207 + lift, width - 8, ROLE_COLOR[data.role], 20);
      d.cardIcon(car.type, x, 146 + lift, 99);
      d.label(data.name, x, 87 + lift, 23, P.cream, width - 6, 'center', 'display');
      const modCount = (Object.keys(car.mods) as ModId[]).reduce((sum, id) => sum + (car.mods[id] || 0), 0);
      const state = selected ? '已选中' : c.selectedSlot >= 0 ? '点此交换' : modCount ? `改装 ×${modCount}` : car.level ? `强化 ${car.level} 级` : '基础车厢';
      d.label(state, x, 61 + lift, 20, selected || c.selectedSlot >= 0 ? P.teal : P.muted, width - 6);
    } else {
      badge(d, `${i + 1} 空槽`, x, 207 + lift, width - 8, P.paper, 20);
      brush(d, x, 145 + lift, 69, 58, '#9D8FAD22');
      d.line([x - 13, 145 + lift, x + 13, 145 + lift], P.muted, 3);
      d.line([x, 132 + lift, x, 158 + lift], P.muted, 3);
      d.label(c.selectedSlot >= 0 ? '交换到此' : '空槽可交换', x, 91 + lift, 20, P.muted, width - 6);
    }
    d.addHitArea(x, 139, width, 187, () => c.actions.selectSlot(i));
  });
  if (selectedCar) {
    brush(d, 0, -3, 566, 95, '#72617C8C');
    const shown = installed.slice(0, installed.length > 3 ? 2 : 3);
    const summary = shown.map(id => `${MODS[id].name}×${selectedCar.mods[id]}`);
    if (installed.length > shown.length) summary.push(`另${installed.length - shown.length}项`);
    d.label(summary.join(' / ') || '尚未安装词条 · 补给可强化这节车厢', -267, 25, 20, P.cream, 535, 'left');
    // Explain a behavior-changing upgrade first; each shown name keeps its stack count.
    const detailId = installed.find(id => MODS[id].mode) || installed[0];
    const detail = detailId ? MODS[detailId].description : CARS[selectedCar.type].description;
    d.label(`标称 ${m.getCarAttackSummary(c.selectedSlot)}`, -267, -1, 18, P.gold, 535, 'left');
    d.label(detail, -267, -29, 17, P.muted, 535, 'left');
  }
  const compactLinks = !!selectedCar;
  for (let i = 0; i < m.slots.length - 1; i++) {
    const y = compactLinks ? -77 - i * 49 : 5 - i * 73;
    const link = links.find(l => l.index === i), recipe = link?.recipe;
    const known = !!recipe && c.knownRecipes.has(recipe.id);
    brush(d, 0, y, 567, compactLinks ? 45 : 68, link ? '#49536A65' : '#39334755');
    const routeColor = '#292A3A';
    brush(d, -255, y, 39, 35, link ? '#B8D4D2' : '#C6B7AB');
    brush(d, -193, y, 39, 35, link ? '#B8D4D2' : '#C6B7AB');
    d.label(`${i + 1}`, -255, y, 20, routeColor, 32);
    d.label(`${i + 2}`, -193, y, 20, routeColor, 32);
    d.line([-237, y, -211, y], P.teal, 3);
    if (link) {
      const direction = link.support === i ? 1 : -1, tip = direction > 0 ? -211 : -237;
      d.line([tip - direction * 7, y + 5, tip, y, tip - direction * 7, y - 5], P.teal, 2);
    }
    const relationship = link
      ? `#${link.support + 1} ${CARS[m.slots[link.support]!.type].name.replace('车', '')} → #${link.driver + 1} ${CARS[recipe!.executor].name.replace('车', '')}`
      : `${i + 1}号 — ${i + 2}号 · 独立工作`;
    const caption = recipe ? known ? recipe.name : `未知 · ${recipe.hint}`
      : !m.slots[i] || !m.slots[i + 1] ? '装入车厢，连接相邻槽位'
        : CARS[m.slots[i]!.type].role === 'offense' ? '相邻增益或减益车可辅助武器' : '辅助之间暂无联动，请搭配武器';
    d.label(relationship, -159, y + (selectedCar ? 11 : 16), 20, P.muted, 425, 'left');
    d.label(caption, -159, y - (selectedCar ? 11 : 14), 20, recipe ? known ? P.teal : P.gold : P.muted, 425, 'left');
  }
  d.button(`带着 ${links.length} 条联动出发  →`, 0, -303, 566, 66, c.actions.resumeWorkshop);
  d.button('车厢与联动图鉴', 0, -375, 566, 56, () => c.actions.setAtlas(true, 0, true), false);
}

function atlas(c: PanelContext) {
  const d = c.draw, pages = Math.max(1, Math.ceil((c.atlasCars ? CAR_TYPES.length : RECIPES.length) / 3));
  const page = Math.max(0, Math.min(pages - 1, c.atlasPage));
  heading(d, c.atlasCars ? '车厢图鉴' : '联动图鉴', c.atlasCars ? `${CAR_TYPES.length} 种车厢 · 进攻 / 增益 / 减益` : `已发现 ${c.knownRecipes.size} / ${RECIPES.length} 种联动`);
  d.button('车厢', -146, 255, 272, 48, () => c.actions.setAtlas(true, 0, true), c.atlasCars);
  d.button('联动', 146, 255, 272, 48, () => c.actions.setAtlas(true, 0, false), !c.atlasCars);
  if (c.atlasCars) CAR_TYPES.slice(page * 3, page * 3 + 3).forEach((type, i) => {
    const y = 145 - i * 153, car = CARS[type];
    inset(d, -284, y - 67, 568, 138);
    d.cardIcon(type, -218, y + 5, 110);
    d.label(car.name, -140, y + 41, 29, P.cream, 274, 'left', 'display');
    badge(d, ROLE_NAMES[car.role], 222, y + 40, 86, ROLE_COLOR[car.role]);
    d.label(car.description, -140, y - 2, 18, P.muted, 399, 'left');
    d.label(c.model.getBaseCarAttackSummary(type), -140, y - 39, 17, P.gold, 399, 'left');
  });
  else RECIPES.slice(page * 3, page * 3 + 3).forEach((recipe, i) => {
    const y = 145 - i * 153, known = c.knownRecipes.has(recipe.id);
    const support = recipe.a === recipe.executor ? recipe.b : recipe.a;
    inset(d, -284, y - 72, 568, 148, known ? '#526779AC' : '#655167B0');
    brush(d, -237, y + 37, 79, 63, '#B5C6C125');
    brush(d, 237, y + 37, 79, 63, '#D9B99E25');
    d.cardIcon(support, -237, y + 37, 81);
    d.cardIcon(recipe.executor, 237, y + 37, 81);
    d.label(`${CARS[support].name} → ${CARS[recipe.executor].name}`, 0, y + 48, 22, P.cream, 384);
    d.label(`${ROLE_NAMES[CARS[support].role]}辅助     武器执行`, 0, y + 20, 20, P.muted, 384);
    d.label(known ? recipe.name : '未知联动', -263, y - 11, 28, known ? P.teal : P.gold, 398, 'left', 'display');
    badge(d, known ? '已发现' : '待发现', 218, y - 12, 94, known ? P.signal : P.gold);
    d.label(known ? recipe.description : recipe.hint, -263, y - 46, 20, P.muted, 526, 'left');
  });
  d.button('上一页', -188, -284, 190, 62, () => c.actions.setAtlas(true, (page + pages - 1) % pages), false);
  d.label(`${page + 1} / ${pages}`, 0, -284, 23, P.cream, 120);
  d.button('下一页', 188, -284, 190, 62, () => c.actions.setAtlas(true, (page + 1) % pages), false);
  d.button('返回', 0, -370, 566, 66, () => c.actions.setAtlas(false, page), false);
}

function supply(c: PanelContext) {
  const d = c.draw, m = c.model;
  const hasSpace = m.slots.some(car => !car);
  heading(d, m.milestoneSupply ? '第一站突破' : '废料补给', m.milestoneSupply ? '阶段补给 · 当前编组继续前进' : hasSpace ? '三选一 · 插入新车 / 同车合并 / 改装' : '三选一 · 同车合并 / 改装 / 维修');
  m.offers.forEach((offer, i) => {
    const y = 180 - i * 185, isCar = offer.kind === 'car', isRepair = offer.kind === 'repair';
    const heal = Math.min(m.maxHp - m.hp, offer.amount ?? m.repairAmount);
    const data = isRepair ? {name:'应急维修', description:`装甲恢复 ${heal} 点，最高恢复至 ${m.maxHp}。`} : isCar ? CARS[offer.id as CarType] : MODS[offer.id as ModId];
    const color = isRepair ? P.teal : isCar ? ROLE_COLOR[CARS[offer.id as CarType].role] : P.gold;
    inset(d, -284, y - 80, 568, 168, '#55485CA6');
    brush(d, -207, y + 14, 137, 109, '#CBA79539');
    if (isCar) roleMark(d, CARS[offer.id as CarType].role, -257, y + 58, 13, color);
    brush(d, 246, y + 60, 52, 29, '#D8C1AB');
    d.label(`0${i + 1}`, 246, y + 60, 23, '#302B39', 55, 'center', 'display');
    if (isCar) d.cardIcon(offer.id as CarType, -207, y + 17, 124);
    else if(d.modIcon){
      d.modIcon(isRepair?'repair':offer.id as ModId,-207,y+17,122);
    }else {
      brush(d, -207, y + 17, 77, 63, '#C8A69B44');
      if (isRepair) roleMark(d, 'buff', -207, y + 17, 33, P.teal);
      else d.label('改', -207, y + 17, 36, P.cream, 85, 'center', 'display');
    }
    badge(d, isRepair ? '维修补给' : isCar ? `${ROLE_NAMES[CARS[offer.id as CarType].role]}车厢` : '改装词条', -207, y - 56, 122, color);
    d.label(data.name, -111, y + 47, 32, P.cream, 327, 'left', 'display');
    const summary = offerSummary(m, offer, c.knownRecipes);
    summary.slice(0, 3).forEach((text, row) => d.label(text, -111, y + 12 - row * 32, 18,
      row === 0 ? P.muted : P.teal, 369, 'left'));
    d.line([238, y - 53, 262, y - 53], P.teal, 1.5);
    d.line([254, y - 47, 262, y - 53, 254, y - 59], P.teal, 1.5);
    d.addHitArea(0, y + 4, 568, 168, () => c.actions.chooseOffer(i));
  });
  d.label(`${m.milestoneSupply?'阶段奖励':`第 ${m.supplyCount} 次补给`}   ·   已收集 ${m.scrap} 废料`, 0, -336, 21, P.muted, 566);
  d.label('行进中每 5 秒缓慢修复 1 点装甲', 0, -373, 20, P.gold, 560);
}

function pause(c: PanelContext) {
  const d = c.draw, awaitingSupply = c.model.previous === 'supply';
  brush(d, 0, 211, 123, 105, '#9B849D45');
  d.line([-17, 186, -14, 235], P.cream, 8);
  d.line([15, 187, 17, 234], P.cream, 8);
  d.label('列车已暂停', 0, 100, 44, P.cream, 560, 'center', 'display');
  d.label(awaitingSupply ? '补给还在等待，选好再出发' : '重新安排车厢，让火力彼此照应', 0, 42, 23, P.muted, 560);
  d.button(awaitingSupply ? '返回补给  →' : '继续前进  →', 0, -51, 566, 76, c.actions.resume);
  if (awaitingSupply) d.label('领取补给后，可进入工坊调整车序', 0, -151, 22, P.muted, 560);
  else d.button(c.model.pendingCar ? '安排新车  →' : '调整车序  ↔', 0, -151, 566, 72, c.actions.openWorkshop);
  d.button('重新发车', 0, -251, 566, 64, c.actions.begin, false);
  d.label(awaitingSupply ? '领取补给前战斗保持暂停' : '调整期间战斗保持暂停', 0, -317, 20, P.muted, 560);
}

function results(c: PanelContext) {
  const d = c.draw, m = c.model, fallen = m.phase === 'lose';
  brush(d, 0, 382, 65, 7, fallen ? P.warning : P.teal);
  d.label(fallen ? '列车失守' : '行程记录', 0, 332, 50, fallen ? P.red : P.cream, 570, 'center', 'display');
  d.label(fallen ? `主要受损来源：${m.mainDamageSource}` : `抵达第 ${m.wave} 波`, 0, 272, 22, P.muted, 570);
  inset(d, -281, 96, 562, 126);
  d.label(`${m.kills}`, -141, 174, 52, P.cream, 240);
  d.label('击破敌人', -141, 124, 20, P.muted, 240);
  d.line([0, 115, 0, 203], P.edge, 2);
  d.label(`${Math.round(m.time)} 秒`, 141, 174, 43, P.cream, 240);
  d.label('生存时间', 141, 124, 20, P.muted, 240);
  m.slots.forEach((car, i) => {
    const spacing = 610 / m.slots.length, x = (i - (m.slots.length - 1) / 2) * spacing;
    inset(d, x - (spacing - 10) / 2, -74, spacing - 10, 143);
    if (car) {
      d.cardIcon(car.type, x, 16, 92);
      d.label(CARS[car.type].name, x, -48, 22, P.cream, spacing - 14, 'center', 'display');
    } else d.label('空槽', x, -4, 21, P.muted, spacing - 14);
  });
  const triggered = RECIPES.filter(recipe => m.seenRecipes.has(recipe.id));
  const counts = new Map<string, number>();
  for (const link of m.links) counts.set(link.recipe.id, (counts.get(link.recipe.id) || 0) + 1);
  const formation = RECIPES.filter(recipe => counts.has(recipe.id)).map(recipe => {
    const name = c.knownRecipes.has(recipe.id) || m.seenRecipes.has(recipe.id) ? recipe.name : '未知联动';
    const count = counts.get(recipe.id)!;
    return count > 1 ? `${name} ×${count}` : name;
  });
  d.label(`本局触发 ${triggered.length} 种 · 新发现 ${c.newRecipes.size} 种`, 0, -109, 24, P.teal, 560);
  const triggeredNames = triggered.slice(0, 4).map(recipe => recipe.name);
  if (triggered.length > 4) triggeredNames.push(`还有${triggered.length - 4}种`);
  d.label(triggered.length ? triggeredNames.join(' / ') : '尚未触发联动，试着让辅助靠近武器',
    0, -151, 20, P.cream, 562);
  d.label(`终局编组 · ${formation.join(' / ') || '各车独立工作'}`, 0, -206, 20, P.muted, 562);
  d.button('再组一列  →', 0, -276, 566, 76, c.actions.begin);
  d.button('返回车库', 0, -366, 566, 64, c.actions.backToMenu, false);
}

export function renderPanel(context: PanelContext): void {
  const phase = context.model.phase;
  if (phase === 'combat') return;
  if (phase === 'menu' && !context.atlas) { menu(context); return; }
  surface(context.draw);
  if (context.atlas && (phase === 'menu' || phase === 'workshop')) { atlas(context); return; }
  switch (phase) {
    case 'workshop': workshop(context); break;
    case 'supply': supply(context); break;
    case 'paused': pause(context); break;
    case 'win': case 'lose': results(context); break;
  }
}
