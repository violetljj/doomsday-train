import { CAR_TYPES, CARS, MODS, RECIPES, ROLE_NAMES } from './Catalog.ts';
import type { CarType, CarRole, ModId } from './Catalog.ts';
import type { Combat } from './Combat.ts';

/** Presentation only. The host owns Cocos nodes, pointer routing and game actions. */
export interface PanelPrimitives {
  rect(x: number, y: number, w: number, h: number, color: string, radius?: number): void;
  label(text: string, x: number, y: number, size: number, color: string, width?: number, align?: 'left' | 'center' | 'right', font?: 'display' | 'body'): void;
  art?(name: string, x: number, y: number, w: number, h: number): void;
  button(text: string, x: number, y: number, w: number, h: number, action: () => void, accent?: boolean): void;
  cardIcon(type: CarType, x: number, y: number, size: number): void;
  line(points: number[], color: string, width: number): void;
  circle(x: number, y: number, radius: number, color: string): void;
  addHitArea(x: number, y: number, w: number, h: number, action: () => void): void;
}

export interface PanelActions {
  begin(): void;
  selectSlot(index: number): void;
  setAtlas(open: boolean, page: number, cars?: boolean): void;
  installPending(): void;
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
  draw: PanelPrimitives;
  actions: PanelActions;
}

const P = {
  ink: '#191D2D', panel: '#252437C7', tile: '#52465BAA', edge: '#9CB9C04D',
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
  d.rect(-360, -535, 720, 1080, '#171A2C58', 0);
  brush(d, -31, 391, 539, 10, '#E6C9B330');
  brush(d, 52, -395, 470, 9, '#ACCEDC29');
}

function heading(d: PanelPrimitives, title: string, subtitle: string) {
  brush(d, -144, 345, 288, 57, '#E3C8AF');
  d.label(title, -268, 345, 44, '#342A38', 430, 'left', 'display');
  d.label('余晖防线', 223, 351, 20, P.muted, 112, 'center', 'display');
  brush(d, 224, 334, 102, 3, '#C7A8A47A');
  d.label(subtitle, 0, 301, 20, P.muted, 570);
}

/** Gouache note cards use paint weight and paper tabs, not technical outlines. */
function inset(d: PanelPrimitives, x: number, y: number, w: number, h: number, color = P.tile) {
  d.rect(x + 5, y - 4, w - 7, h, '#18162745', 0);
  d.rect(x, y, w, h, color, 3);
  // Broad warm/cool underpainting, intentionally separate from the lettering.
  d.rect(x + 5, y + h * .27, w * .3, h * .69, '#AB87924D', 0);
  d.rect(x + w * .55, y + 3, w * .4, h * .29, '#59698743', 0);
  brush(d, x + w * .46, y + h - 4, w * .79, 5, '#BFA8B82B');
  brush(d, x + w * .52, y + 4, w * .69, 5, '#14182938');
}

function badge(d: PanelPrimitives, text: string, x: number, y: number, width: number, color: string, fontSize = 20) {
  brush(d, x, y, width, 29, color);
  d.label(text, x, y, fontSize, '#2A2B3C', width - 8, 'center', 'display');
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

function workshop(c: PanelContext) {
  const d = c.draw, m = c.model, links = m.links, hasSpace = m.slots.some(car => !car);
  const selectedCar = c.selectedSlot >= 0 ? m.slots[c.selectedSlot] : null;
  const canMerge = !!selectedCar && selectedCar.type === m.pendingCar;
  const installed = selectedCar ? (Object.keys(selectedCar.mods) as ModId[])
    .filter(id => MODS[id] && (selectedCar.mods[id] || 0) > 0) : [];
  heading(d, '列车工坊', m.pendingCar
    ? `待装 ${CARS[m.pendingCar].name} · ${hasSpace ? '插入 / 同车合并' : '替换 / 同车合并'}`
    : selectedCar ? `${CARS[selectedCar.type].name} · 已装 ${installed.length} 项词条 · 强化 ${selectedCar.level} 级`
      : '辅助相邻武器 · 前后顺序不限');
  const instruction = m.pendingCar
    ? canMerge ? `同车合并：强化 ${selectedCar!.level} → ${selectedCar!.level + 1} 级，保留词条` : '选择目标槽位'
    : c.selectedSlot >= 0 ? `已选 ${c.selectedSlot + 1} 号位 → 再点另一节车厢交换`
      : '先点一节车厢，再点另一节交换位置';
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
      const state = m.pendingCar ? selected ? '目标槽位' : car.type === m.pendingCar ? '可合并升级' : hasSpace ? '可插入' : '可替换'
        : selected ? '已选中' : c.selectedSlot >= 0 ? '点此交换' : modCount ? `改装 ×${modCount}` : car.level ? `强化 ${car.level} 级` : '基础车厢';
      d.label(state, x, 61 + lift, 20, selected || c.selectedSlot >= 0 ? P.teal : P.muted, width - 6);
    } else {
      badge(d, `${i + 1} 空槽`, x, 207 + lift, width - 8, P.paper, 20);
      brush(d, x, 145 + lift, 69, 58, '#9D8FAD22');
      d.line([x - 13, 145 + lift, x + 13, 145 + lift], P.muted, 3);
      d.line([x, 132 + lift, x, 158 + lift], P.muted, 3);
      d.label(m.pendingCar ? selected ? '目标槽位' : '可装入' : c.selectedSlot >= 0 ? '交换到此' : '空槽可交换', x, 91 + lift, 20, P.muted, width - 6);
    }
    d.addHitArea(x, 139, width, 187, () => c.actions.selectSlot(i));
  });
  if (selectedCar) {
    brush(d, 0, 0, 566, 81, '#72617C8C');
    const shown = installed.slice(0, installed.length > 3 ? 2 : 3);
    const summary = shown.map(id => `${MODS[id].name}×${selectedCar.mods[id]}`);
    if (installed.length > shown.length) summary.push(`另${installed.length - shown.length}项`);
    d.label(summary.join(' / ') || '尚未安装词条 · 补给可强化这节车厢', -267, 25, 20, P.cream, 535, 'left');
    // Explain a behavior-changing upgrade first; each shown name keeps its stack count.
    const detailId = installed.find(id => MODS[id].mode) || installed[0];
    const detail = detailId ? MODS[detailId].description : CARS[selectedCar.type].description;
    d.label(detail, -267, -13, 20, P.muted, 535, 'left');
  }
  for (let i = 0; i < m.slots.length - 1; i++) {
    const y = selectedCar ? -77 - i * 49 : 5 - i * 73;
    const link = links.find(l => l.index === i), recipe = link?.recipe;
    const known = !!recipe && c.knownRecipes.has(recipe.id);
    brush(d, 0, y, 567, selectedCar ? 45 : 68, link ? '#49536A65' : '#39334755');
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
    d.label(relationship, -159, y + (selectedCar ? 11 : 16), 20, P.muted, 425, 'left');
    const caption = recipe ? known ? recipe.name : `未知 · ${recipe.hint}`
      : !m.slots[i] || !m.slots[i + 1] ? '装入车厢，连接相邻槽位'
        : CARS[m.slots[i]!.type].role === 'offense' ? '相邻增益或减益车可辅助武器' : '辅助之间暂无联动，请搭配武器';
    d.label(caption, -159, y - (selectedCar ? 11 : 14), 20, recipe ? known ? P.teal : P.gold : P.muted, 425, 'left');
  }
  if (m.pendingCar) {
    if (c.selectedSlot >= 0) {
      const command = !selectedCar ? '装入新车' : hasSpace ? '插入新车' : '替换旧车';
      d.button(command, canMerge ? -146 : 0, -303, canMerge ? 272 : 566, 66, c.actions.installPending, !canMerge);
      if (canMerge) d.button('合并升级', 146, -303, 272, 66, c.actions.mergePending);
    }
    d.button('放弃这节车厢', -146, -383, 272, 56, c.actions.discardOffer, false);
    d.button('车厢图鉴', 146, -383, 272, 56, () => c.actions.setAtlas(true, 0, true), false);
  } else {
    d.button(`带着 ${links.length} 条联动出发  →`, 0, -303, 566, 66, c.actions.resumeWorkshop);
    d.button('车厢与联动图鉴', 0, -375, 566, 56, () => c.actions.setAtlas(true, 0, true), false);
  }
}

function atlas(c: PanelContext) {
  const d = c.draw, pages = Math.max(1, Math.ceil((c.atlasCars ? CAR_TYPES.length : RECIPES.length) / 3));
  const page = Math.max(0, Math.min(pages - 1, c.atlasPage));
  heading(d, c.atlasCars ? '车厢图鉴' : '联动图鉴', c.atlasCars ? '8 种车厢 · 进攻 / 增益 / 减益' : `已发现 ${c.knownRecipes.size} / ${RECIPES.length} 种联动`);
  d.button('车厢', -146, 255, 272, 48, () => c.actions.setAtlas(true, 0, true), c.atlasCars);
  d.button('联动', 146, 255, 272, 48, () => c.actions.setAtlas(true, 0, false), !c.atlasCars);
  if (c.atlasCars) CAR_TYPES.slice(page * 3, page * 3 + 3).forEach((type, i) => {
    const y = 145 - i * 153, car = CARS[type];
    inset(d, -284, y - 67, 568, 138);
    d.cardIcon(type, -218, y + 5, 110);
    d.label(car.name, -140, y + 41, 29, P.cream, 274, 'left', 'display');
    badge(d, ROLE_NAMES[car.role], 222, y + 40, 86, ROLE_COLOR[car.role]);
    d.label(car.description, -140, y - 13, 20, P.muted, 399, 'left');
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
  heading(d, '废料补给', hasSpace ? '三选一 · 插入新车 / 同车合并 / 改装' : '三选一 · 同车合并 / 改装 / 维修');
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
    else {
      brush(d, -207, y + 17, 77, 63, '#C8A69B44');
      if (isRepair) roleMark(d, 'buff', -207, y + 17, 33, P.teal);
      else d.label('改', -207, y + 17, 36, P.cream, 85, 'center', 'display');
    }
    badge(d, isRepair ? '维修补给' : isCar ? `${ROLE_NAMES[CARS[offer.id as CarType].role]}车厢` : '改装词条', -207, y - 56, 122, color);
    d.label(data.name, -111, y + 47, 32, P.cream, 327, 'left', 'display');
    d.label(data.description, -111, y + 1, 20, P.muted, 369, 'left');
    d.label(isRepair ? `装甲 ${m.hp} → ${m.hp + heal}` : isCar ? '领取车厢 · 安装或同车合并' : '领取词条 · 强化配置', -111, y - 53, 20, P.teal, 334, 'left');
    d.line([238, y - 53, 262, y - 53], P.teal, 1.5);
    d.line([254, y - 47, 262, y - 53, 254, y - 59], P.teal, 1.5);
    d.addHitArea(0, y + 4, 568, 168, () => c.actions.chooseOffer(i));
  });
  d.label(`第 ${m.supplyCount} 次补给   ·   已收集 ${m.scrap} 废料`, 0, -336, 21, P.muted, 566);
  d.label('点击整张卡片领取', 0, -373, 20, P.gold, 560);
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
  d.label(`抵达第 ${m.wave} 波 · 调整编组，再向前走一程`, 0, 272, 22, P.muted, 570);
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
