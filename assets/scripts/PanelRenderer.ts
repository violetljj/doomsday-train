import { CARS, MODS, RECIPES, ROLE_NAMES } from './Catalog.ts';
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
  setAtlas(open: boolean, page: number): void;
  chooseOffer(index: number): void;
  discardOffer(): void;
  resumeWorkshop(): void;
  resume(): void;
  backToMenu(): void;
}

export interface PanelContext {
  model: Combat;
  knownRecipes: ReadonlySet<string>;
  newRecipes: ReadonlySet<string>;
  atlas: boolean;
  atlasPage: number;
  selectedSlot: number;
  draw: PanelPrimitives;
  actions: PanelActions;
}

const P = {
  ink: '#191D2D', panel: '#252437C7', tile: '#3A354A99', edge: '#9CB9C04D',
  cream: '#F0DFD0', muted: '#B9B3C4', gold: '#DBB09F', teal: '#A8DADE',
  blue: '#C0B2DB', red: '#EF9A96', paper: '#F0DFD0',
  signal: '#A8DADE', warning: '#EF9A96',
};
const ROLE_COLOR: Record<CarRole, string> = { offense: P.cream, buff: P.signal, debuff: P.blue };

function diamond(d: PanelPrimitives, x: number, y: number, r: number, color: string) {
  d.line([x, y + r, x + r, y, x, y - r, x - r, y, x, y + r], color, 1);
}

function roleMark(d: PanelPrimitives, role: CarRole, x: number, y: number, r: number, color: string) {
  diamond(d, x, y, r, color);
  if (role === 'offense') {
    d.line([x - r * .35, y - r * .35, x, y + r * .6, x + r * .35, y - r * .35], color, 2);
    d.line([x, y - r * .6, x, y + r * .3], color, 2);
  } else if (role === 'buff') {
    d.line([x - r * .52, y, x + r * .52, y], color, 2);
    d.line([x, y - r * .52, x, y + r * .52], color, 2);
  } else {
    d.line([x - r * .4, y + r * .25, x, y - r * .5, x + r * .4, y + r * .25], color, 2);
  }
}

function surface(d: PanelPrimitives) {
  d.rect(-360, -535, 720, 1080, '#151A2BCC', 0);
  d.rect(-326, -417, 652, 830, '#302A4099', 12);
  d.line([-296, 385, 217, 385, 283, 391], '#D9C6BE42', 1);
  d.line([-281, -396, -199, -386, 291, -386], '#AECFD140', 1);
  diamond(d, -298, 385, 4, P.teal);
  diamond(d, 293, -386, 4, P.teal);
}

function heading(d: PanelPrimitives, title: string, subtitle: string) {
  d.label(title, -276, 345, 44, P.cream, 430, 'left', 'display');
  d.label('余晖防线', 223, 351, 20, P.muted, 112, 'center', 'display');
  d.line([-276, 318, 276, 318], P.edge, 1);
  d.label(subtitle, 0, 301, 20, P.muted, 570);
}

/** Light translucent sheets leave the world visible between their edges. */
function inset(d: PanelPrimitives, x: number, y: number, w: number, h: number, color = P.tile) {
  d.rect(x + 3, y - 4, w - 6, h, '#15172745', 6);
  d.rect(x, y, w, h, color, 6);
  d.line([x + 5, y + h - 17, x + 18, y + h - 4, x + w - 24, y + h - 4], P.edge, 1);
  d.line([x + 23, y + 4, x + w - 18, y + 4, x + w - 5, y + 17], P.edge, 1);
}

function badge(d: PanelPrimitives, text: string, x: number, y: number, width: number, color: string, fontSize = 20) {
  d.label(text, x, y, fontSize, color, width - 8);
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
  // A single light orbit is the departure control; artwork supplies the scene.
  const curve: number[] = [];
  for (let i = 0; i <= 34; i++) {
    const a = -.1 + i / 34 * Math.PI * 1.72;
    curve.push(Math.cos(a) * 161, -351 + Math.sin(a) * 44 + Math.cos(a) * 14);
  }
  d.line(curve, '#ADD7D895', 1.5);
  diamond(d, -154, -365, 5, P.teal);
  diamond(d, 158, -334, 6, P.teal);
  d.label('发车', 0, -351, 62, P.cream, 265, 'center', 'display');
  d.addHitArea(0, -351, 352, 104, c.actions.begin);
  d.button(`联动图鉴  ${c.knownRecipes.size} / ${RECIPES.length}`, 0, -465, 352, 64,
    () => c.actions.setAtlas(true, 0), false);
}

function workshop(c: PanelContext) {
  const d = c.draw, m = c.model, links = m.links;
  heading(d, '列车工坊', '辅助相邻武器 · 前后顺序不限');
  const instruction = m.pendingCar ? `待装 ${CARS[m.pendingCar].name} · 点槽位装入或替换`
    : c.selectedSlot >= 0 ? `已选 ${c.selectedSlot + 1} 号位 · 再点一节车厢交换`
      : '点两节车厢交换位置，空槽也可交换';
  d.label(instruction, 0, 258, 21, P.gold, 576);
  const spacing = 610 / m.slots.length;
  d.line([-302, 147, 302, 147], P.edge, 1);
  d.line([-302, 157, 302, 157], P.edge, 1);
  m.slots.forEach((car, i) => {
    const x = (i - (m.slots.length - 1) / 2) * spacing, selected = c.selectedSlot === i;
    const width = spacing - 10, lift = selected ? 6 : 0;
    inset(d, x - width / 2, 46 + lift, width, 187, selected ? '#536472AF' : car ? '#363248AD' : '#272A3D88');
    if (selected) {
      d.line([x - width / 2 + 4, 218 + lift, x - width / 2 + 4, 229 + lift, x + width / 2 - 4, 229 + lift], P.teal, 1.5);
      diamond(d, x, 43 + lift, 5, P.teal);
    }
    if (car) {
      const data = CARS[car.type];
      badge(d, `${i + 1} ${ROLE_NAMES[data.role]}`, x, 207 + lift, width - 8, ROLE_COLOR[data.role], 20);
      d.cardIcon(car.type, x, 146 + lift, 99);
      d.label(data.name, x, 87 + lift, 23, P.cream, width - 6, 'center', 'display');
      d.label(car.level ? `改装 ${car.level} 级` : '基础车厢', x, 61 + lift, 20, P.muted, width - 6);
    } else {
      badge(d, `${i + 1} 空槽`, x, 207 + lift, width - 8, P.paper, 20);
      diamond(d, x, 145 + lift, 28, P.edge);
      d.line([x - 13, 145 + lift, x + 13, 145 + lift], P.muted, 3);
      d.line([x, 132 + lift, x, 158 + lift], P.muted, 3);
      d.label(m.pendingCar ? '点此装入' : '等待装入', x, 91 + lift, 20, P.muted, width - 6);
    }
    d.addHitArea(x, 139, width, 187, () => c.actions.selectSlot(i));
  });
  for (let i = 0; i < m.slots.length - 1; i++) {
    const y = 5 - i * 73, link = links.find(l => l.index === i), recipe = link?.recipe;
    const known = !!recipe && c.knownRecipes.has(recipe.id);
    d.rect(-284, y - 34, 568, 68, link ? '#3C425957' : '#252B3F35', 4);
    d.line([-163, y - 32, 275, y - 32], P.edge, 1);
    const routeColor = link ? P.signal : P.paper;
    diamond(d, -255, y, 23, link ? P.teal : P.edge);
    diamond(d, -193, y, 23, link ? P.teal : P.edge);
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
    d.label(relationship, -159, y + 16, 20, P.muted, 425, 'left');
    const caption = recipe ? known ? recipe.name : `未知 · ${recipe.hint}`
      : !m.slots[i] || !m.slots[i + 1] ? '装入车厢，连接相邻槽位'
        : CARS[m.slots[i]!.type].role === 'offense' ? '相邻增益或减益车可辅助武器' : '辅助之间暂无联动，请搭配武器';
    d.label(caption, -159, y - 14, 20, recipe ? known ? P.teal : P.gold : P.muted, 425, 'left');
  }
  if (m.pendingCar) d.button('放弃这节车厢', 0, -303, 566, 66, c.actions.discardOffer, false);
  else d.button(`带着 ${links.length} 条联动出发  →`, 0, -303, 566, 66, c.actions.resumeWorkshop);
  d.button(`联动图鉴   ${c.knownRecipes.size} / ${RECIPES.length}`, 0, -375, 566, 56,
    () => c.actions.setAtlas(true, 0), false);
}

function atlas(c: PanelContext) {
  const d = c.draw, pages = Math.max(1, Math.ceil(RECIPES.length / 3));
  const page = Math.max(0, Math.min(pages - 1, c.atlasPage));
  heading(d, '联动图鉴', '战斗触发后揭晓 · 辅助与武器前后不限');
  d.label(`已发现 ${c.knownRecipes.size} / ${RECIPES.length} 种联动`, 0, 263, 21, P.gold, 560);
  RECIPES.slice(page * 3, page * 3 + 3).forEach((recipe, i) => {
    const y = 173 - i * 162, known = c.knownRecipes.has(recipe.id);
    const support = recipe.a === recipe.executor ? recipe.b : recipe.a;
    inset(d, -284, y - 72, 568, 148, known ? '#3E4B5D99' : '#353248AA');
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
  heading(d, '废料补给', '三选一 · 新车可装入空位或替换旧车');
  m.offers.forEach((offer, i) => {
    const y = 180 - i * 185, isCar = offer.kind === 'car';
    const data = isCar ? CARS[offer.id as CarType] : MODS[offer.id as ModId];
    const color = isCar ? ROLE_COLOR[CARS[offer.id as CarType].role] : P.gold;
    inset(d, -284, y - 80, 568, 168, '#38364DAA');
    d.line([-137, y - 61, -131, y + 62], P.edge, 1);
    if (isCar) roleMark(d, CARS[offer.id as CarType].role, -257, y + 58, 13, color);
    d.label(`0${i + 1}`, 246, y + 60, 23, P.muted, 55);
    if (isCar) d.cardIcon(offer.id as CarType, -207, y + 17, 124);
    else {
      diamond(d, -207, y + 17, 42, P.edge);
      diamond(d, -207, y + 17, 34, P.gold);
      d.label('改', -207, y + 17, 36, P.cream, 85, 'center', 'display');
    }
    badge(d, isCar ? `${ROLE_NAMES[CARS[offer.id as CarType].role]}车厢` : '改装词条', -207, y - 56, 122, color);
    d.label(data.name, -111, y + 47, 32, P.cream, 327, 'left', 'display');
    d.label(data.description, -111, y + 1, 20, P.muted, 369, 'left');
    d.label(isCar ? '领取车厢 · 安排槽位' : '领取词条 · 强化配置', -111, y - 53, 20, P.teal, 334, 'left');
    d.line([238, y - 53, 262, y - 53], P.teal, 1.5);
    d.line([254, y - 47, 262, y - 53, 254, y - 59], P.teal, 1.5);
    d.addHitArea(0, y + 4, 568, 168, () => c.actions.chooseOffer(i));
  });
  d.label(`第 ${m.supplyCount} 次补给   ·   已收集 ${m.scrap} 废料`, 0, -336, 21, P.muted, 566);
  d.label('点击整张卡片领取', 0, -373, 20, P.gold, 560);
}

function pause(c: PanelContext) {
  const d = c.draw;
  diamond(d, 0, 211, 68, P.edge);
  d.line([-15, 188, -15, 234], P.cream, 4);
  d.line([15, 188, 15, 234], P.cream, 4);
  d.label('列车已暂停', 0, 100, 44, P.cream, 560, 'center', 'display');
  d.label('准备好了，再一起冲出去', 0, 42, 23, P.muted, 560);
  d.button('继续前进  →', 0, -81, 566, 78, c.actions.resume);
  d.button('重新发车', 0, -177, 566, 66, c.actions.begin, false);
}

function results(c: PanelContext) {
  const d = c.draw, m = c.model, won = m.phase === 'win';
  diamond(d, 0, 382, 7, won ? P.teal : P.warning);
  d.label(won ? '首领已击破' : m.endReason === 'timeout' ? '突围超时' : '列车失守', 0, 332, 50, won ? P.cream : P.red, 570, 'center', 'display');
  d.label(won ? '这条车厢链，冲破了封锁' : '调整辅助与武器搭配，再组一列', 0, 272, 22, P.muted, 570);
  inset(d, -281, 96, 562, 126);
  d.label(`${m.kills}`, -141, 174, 52, P.cream, 240);
  d.label('击破敌人', -141, 124, 20, P.muted, 240);
  d.line([0, 115, 0, 203], P.edge, 2);
  d.label(`${Math.round(m.time)} 秒`, 141, 174, 43, P.cream, 240);
  d.label('突围时间', 141, 124, 20, P.muted, 240);
  m.slots.forEach((car, i) => {
    const spacing = 610 / m.slots.length, x = (i - (m.slots.length - 1) / 2) * spacing;
    inset(d, x - (spacing - 10) / 2, -74, spacing - 10, 143);
    if (car) {
      d.cardIcon(car.type, x, 16, 92);
      d.label(CARS[car.type].name, x, -48, 22, P.cream, spacing - 14, 'center', 'display');
    } else d.label('空槽', x, -4, 21, P.muted, spacing - 14);
  });
  d.label(`本局新发现 ${c.newRecipes.size} 种联动`, 0, -121, 24, P.gold, 560);
  const names = m.links.map(link => c.knownRecipes.has(link.recipe.id) ? link.recipe.name : '未知联动');
  d.label(names.join(' / ') || '本局没有相邻联动', 0, -165, 20, P.muted, 562);
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
