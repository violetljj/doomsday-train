import { UI_THEME } from './UiTheme.ts';
import { CAR_TYPES, CARS, MODS, RECIPES, ROLE_NAMES, getRecipe } from './Catalog.ts';
import type { CarType, CarRole, ModId } from './Catalog.ts';
import type { Combat } from './Combat.ts';
import { ENGINES, MODULES } from './Locomotives.ts';
import type { EngineId, ModuleId } from './Locomotives.ts';
import { moduleUnlocked, moduleUnlockHint } from './Garage.ts';
import type { GarageState } from './Garage.ts';
import { previewInstall, previewInstallEntries, recipeChanges, offerSummary, recommendOffer, installOutcome, nextRunAdvice } from './ChoicePreview.ts';

/** Presentation only. The host owns Cocos nodes, pointer routing and game actions. */
export interface PanelPrimitives {
  rect(x: number, y: number, w: number, h: number, color: string, radius?: number): void;
  label(text: string, x: number, y: number, size: number, color: string, width?: number, align?: 'left' | 'center' | 'right', font?: 'display' | 'body'): void;
  art?(name: string, x: number, y: number, w: number, h: number): void;
  button(text: string, x: number, y: number, w: number, h: number, action: () => void, accent?: boolean): void;
  cardIcon(type: CarType, x: number, y: number, size: number): void;
  carriage?(type:CarType,x:number,y:number,size:number,key:string):void;
  modIcon?(type: ModId | 'repair', x: number, y: number, size: number): void;
  engineIcon?(id: EngineId, x: number, y: number, size: number): void;
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
  openGarage?(): void;
  openHistory?(): void;
  closeHistory?(): void;
  selectHistory?(index:number): void;
  retrySave?(): void;
  closeGarage?(): void;
  chooseEngine?(id: EngineId): void;
  chooseModule?(id: ModuleId): void;
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
  assembling?: boolean;
  garageOpen?: boolean;
  historyOpen?: boolean;
  historyIndex?: number;
  saveFailed?: boolean;
  garage?: GarageState;
  draw: PanelPrimitives;
  actions: PanelActions;
}

const P = UI_THEME;
const ROLE_COLOR: Record<CarRole, string> = { offense: P.cream, buff: P.signal, debuff: P.ochre };

/** A shared quiet plate supports text without competing with painted equipment. */
function brush(d: PanelPrimitives, x: number, y: number, w: number, h: number, color: string) {
  d.rect(x-w/2,y-h/2,w,h,color,Math.min(5,h*.2));
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
  d.rect(-360, -640, 720, 1280, '#080E1670');
  d.rect(-310, -425, 620, 840, P.panel, 3);
  d.rect(-310, 316, 5, 99, P.seal, 0);
  d.line([-281,390,165,390,184,409,281,409],P.edge,1.5);
  d.line([-278,-411,205,-411,224,-393,278,-393],P.edge,1);
}

function heading(d: PanelPrimitives, title: string, subtitle: string) {
  d.label(title, -278, 348, 42, P.cream, 425, 'left', 'display');
  d.line([-278,315,-156,315,-145,326], P.gold, 2);
  d.label('末日 / 行车票', 223, 351, 18, P.gold, 120, 'center', 'display');
  d.label(subtitle, -278, 294, 20, P.muted, 556, 'left');
}

/** Shared navigation cards keep the equipment illustration as the focal point. */
function inset(d: PanelPrimitives, x: number, y: number, w: number, h: number, color: string = P.tile) {
  d.rect(x,y,w,h,color,3);
  d.line([x+9,y+h,x+w-9,y+h],P.edge,1);
  d.line([x,y+Math.min(h,16),x,y,x+16,y],P.edge,1);
}

function badge(d: PanelPrimitives, text: string, x: number, y: number, width: number, color: string, fontSize = 20) {
  brush(d, x, y-12, width*.74, 2, color+'77');
  brush(d, x - width * .28, y - 3, width * .19, 1.2, color+'3D');
  d.label(text, x, y+1, fontSize, color, width - 4, 'center', 'body');
}

function buildGoal(d: PanelPrimitives, m: Combat, y: number) {
  const state = m.buildProgression, next = state.nextMilestone;
  d.label(next ? `下一步 · ${next.title}` : `${state.branchName} · 成长完成`, -276, y, 21, P.gold, 374, 'left');
  d.label(next ? `${Math.round(next.progress * 100)}%` : '完成', 245, y, 20, P.teal, 66);
  d.line([-275, y - 20, 278, y - 20], '#8FB6A733', 3);
  const progress = next ? Math.max(0, Math.min(1, next.progress)) : 1;
  if (progress) d.line([-275, y - 20, -275 + progress * 553, y - 20], '#8FB6A7B0', 3);
  d.label(next ? next.threshold : '可继续强化，也可尝试新的编组', -276, y - 43, 20, P.muted, 552, 'left');
}

function menu(c: PanelContext) {
  const d = c.draw;
  d.art?.('menu', 0, 0, 720, 1280);
  d.label('末日列车', 0, 427, 90, P.cream, 540, 'center', 'display');
  ['向着有光的地方', '载着落日前行'].forEach((phrase, column) => {
    Array.from(phrase).forEach((word, i) => d.label(word, -217 - column * 31, 265 - i * 29,
      22, P.cream, 27, 'center', 'display'));
  });
  d.button('发车', 0, -351, 352, 104, c.actions.begin, true);
  if (c.garage && c.actions.openGarage) {
    const record = c.garage.records.runs ? `远征最佳 ${c.garage.records.bestWave} 波` : '第一程，从这里出发';
    d.label(c.saveFailed?'记录暂未存盘 · 请勿关闭页面':`${ENGINES[c.garage.loadout.engine].name} · ${record}`, 0, -414, 20, c.saveFailed?P.red:P.cream, 530);
    d.button('整备车头', -145, -475, 270, 62, c.actions.openGarage, false);
    d.button('车厢图鉴', 145, -475, 270, 62, () => c.actions.setAtlas(true, 0, true), false);
    if(c.actions.openHistory)d.button('远征记录',0,-548,566,46,c.actions.openHistory,false);
  } else d.button('车厢与联动图鉴', 0, -465, 352, 64,
      () => c.actions.setAtlas(true, 0, true), false);
}

function garage(c: PanelContext) {
  const d = c.draw, state = c.garage!;
  const engineIds: EngineId[] = ['dawn', 'storm', 'haven'];
  const moduleIds: ModuleId[] = ['none', 'plating', 'salvager', 'capacitor'];
  const role: Record<EngineId, string> = { dawn: '正面突破', storm: '多点清敌', haven: '装甲护航' };
  const selected = ENGINES[state.loadout.engine];
  d.art?.('workshop', 0, 0, 720, 1280);
  heading(d, '整备车库', c.saveFailed?'选择暂未存盘 · 可在远征记录中重试':'选定车头与模块 · 带着自己的编组出发');
  engineIds.forEach((id, index) => {
    const x = (index - 1) * 194, active = state.loadout.engine === id;
    inset(d, x - 91, 80, 182, 185, active ? '#345566F5' : '#22313EF5');
    if (active) {
      brush(d, x, 261, 155, 5, P.teal);
      d.line([x - 79, 90, x - 79, 108], P.teal, 2);
      d.line([x + 79, 237, x + 79, 255], P.teal, 2);
    }
    d.label(ENGINES[id].name, x, 240, 28, active ? P.cream : P.muted, 162, 'center', 'display');
    if (d.engineIcon) d.engineIcon(id, x, 173, 118);
    else d.cardIcon(ENGINES[id].starter, x, 173, 110);
    d.label(role[id], x, 104, 21, active ? P.teal : P.muted, 166);
    d.addHitArea(x, 172, 182, 185, () => c.actions.chooseEngine?.(id));
  });
  d.label(`${selected.skillName} · 携${CARS[selected.starter].name}出发`, -276, 47, 22, P.gold, 553, 'left');
  d.label(selected.skillSummary, -276, 14, 21, P.cream, 553, 'left');
  d.label('车头模块', -276, -29, 26, P.cream, 300, 'left', 'display');
  d.label('每局可带 1 件', 188, -29, 20, P.muted, 180);
  moduleIds.forEach((id, index) => {
    const x = index % 2 ? 146 : -146, y = -81 - Math.floor(index / 2) * 61;
    const available = moduleUnlocked(state, id), active = state.loadout.module === id;
    inset(d, x - 136, y - 25, 272, 50, active ? '#345566F5' : available ? '#22313EF5' : '#18232EF5');
    if (active) brush(d, x - 23, y + 23, 208, 3, '#8FB6A7AA');
    else if (!available) {
      for (let stroke = 0; stroke < 3; stroke++)
        d.line([x + 85 + stroke * 12, y - 23, x + 95 + stroke * 12, y - 14], '#B7C5B640', 1.2);
    }
    d.label(MODULES[id].name, x - 117, y, 24, active ? P.cream : available ? P.muted : '#84978C', 184, 'left', 'display');
    if (active) d.label('已装', x + 97, y, 20, P.teal, 64);
    else if (!available) d.label('待解锁', x + 90, y, 18, P.muted, 84);
    if (available) d.addHitArea(x, y, 272, 50, () => c.actions.chooseModule?.(id));
  });
  d.label(MODULES[state.loadout.module].description, -276, -187, 20, P.teal, 553, 'left');
  const locked = moduleIds.filter(id => !moduleUnlocked(state, id));
  if (locked.length) {
    d.label(`解锁目标 · ${MODULES[locked[0]].name}：${moduleUnlockHint(state, locked[0])}`, -276, -226, 20, P.gold, 553, 'left');
    if (locked.length > 1) d.label(`${MODULES[locked[1]].name}：${moduleUnlockHint(state, locked[1])}`, -276, -254, 20, P.muted, 553, 'left');
    else d.label(`远征 ${state.records.runs} 次 · 最佳 ${state.records.bestWave} 波 · 发现 ${state.records.recipes.length} 种联动`, -276, -254, 20, P.muted, 553, 'left');
  } else {
    d.label(`模块已齐备 · 发现 ${state.records.recipes.length} 种联动`, -276, -226, 20, P.gold, 553, 'left');
    d.label(`远征 ${state.records.runs} 次 · 最佳 ${state.records.bestWave} 波 · 首领击破 ${state.records.bossKills}`, -276, -254, 20, P.muted, 553, 'left');
  }
  d.button(`驾驶${selected.name}出发  →`, 0, -320, 566, 68, c.actions.begin);
  d.button('返回', 0, -392, 566, 54, () => c.actions.closeGarage?.(), false);
}

function pendingWorkshop(c: PanelContext) {
  const d = c.draw, m = c.model, type = m.pendingCar!;
  const selected = c.selectedSlot, old = selected >= 0 ? m.slots[selected] : null;
  const full = m.slots.every(Boolean), replacing = !!old && full;
  const merging = old?.type === type;
  const mods = old ? (Object.keys(old.mods) as ModId[]).filter(id => MODS[id] && old.mods[id] > 0) : [];
  const confirming = replacing && c.replacementConfirmed;
  const foreground = P.cream, muted = P.muted, accent = P.teal, loss = P.red;
  // Keep the workshop in the same dusk palette as the world and supply screen.
  d.line([-287, 342, 287, 342], '#DAB9795C', 1);
  brush(d, -144, 373, 259, 36, '#DAB97928');
  brush(d, -277, 380, 5, 38, P.gold);
  d.label(confirming ? '确认替换' : '列车工坊', -255, 380, 40, foreground, 365, 'left', 'display');
  d.label('末日整备所', 210, 380, 19, P.gold, 155, 'center', 'display');
  brush(d, -190, 252, 181, 158, '#8FB6A726');
  d.cardIcon(type, -190, 252, 182);
  badge(d, `${ROLE_NAMES[CARS[type].role]}车厢`, 19, 306, 126, ROLE_COLOR[CARS[type].role], 18);
  d.label(CARS[type].name, -44, 260, 37, foreground, 320, 'left', 'display');
  d.label(selected < 0 ? '点选下方槽位，预览装入结果' : merging ? `可与 ${selected + 1} 号车合并升级` : replacing ? `将替换 ${selected + 1} 号${CARS[old!.type].name}` : `准备装入 ${selected + 1} 号位`, -44, 217, 21, accent, 320, 'left');
  d.label('点选位置 · 预览编组', -281, 146, 19, muted, 350, 'left');
  d.label('车头 → 车尾', 200, 146, 18, P.gold, 165);

  if (confirming) {
    d.label(`将拆除 ${CARS[old!.type].name} · 强化 ${old!.level} 级`, 0, 111, 23, loss, 566);
    if (!mods.length) d.label('没有已装改装', 0, -13, 23, muted, 566);
    mods.slice(0, 6).forEach((id, i) => {
      const x = i % 2 ? 152 : -152, y = 25 - Math.floor(i / 2) * 105;
      d.modIcon?.(id, x - 89, y, 54);
      d.label(MODS[id].name, x - 48, y + 12, 21, foreground, 200, 'left');
      d.label(`−${old!.mods[id]}`, x - 48, y - 21, 20, loss, 200, 'left');
    });
    d.line([-284, -160, 284, -160], '#8FB6A766', 1);
    d.label(mods.length > 6 ? `旧车与全部 ${mods.length} 项改装将被移除` : '旧车与以上改装将被移除', 0, -237, 21, loss, 566);
    d.button('确认替换并出发', 0, -303, 566, 70, () => c.actions.installPending(true));
    d.label('返回调整', 0, -383, 23, muted, 300);
    d.addHitArea(0, -383, 400, 58, () => c.actions.cancelReplacement?.());
    return;
  }

  const entries = previewInstallEntries(m,selected,type), preview=entries.map(entry=>entry?.type??null);
  const occupied=entries.filter(Boolean).length,empty=entries.length-occupied;
  const widths=entries.map(entry=>entry?Math.min(168,(610-empty*64)/Math.max(1,occupied)):64);
  const total=widths.reduce((sum,width)=>sum+width,0);let cursor=-total/2;
  const centers=widths.map(width=>{const x=cursor+width/2;cursor+=width;return x;});
  d.line([-299, 0, -92, 2, 117, -1, 300, 1], '#DAB97955', 2);
  d.line([-299, 61, -80, 59, 103, 63, 300, 61], '#DAB97955', 2);
  m.slots.forEach((car, i) => {
    const x = centers[i], active = i === selected, width = widths[i]-8;
    if (active) {
      brush(d, x, 31, width, 109, '#8FB6A722');
      d.line([x-49,76,x-49,94,x-28,96], accent, 1.5);
      d.line([x+49,-10,x+49,-28,x+28,-30], accent, 1.5);
    }
    d.label(String(i + 1).padStart(2, '0'), x, 102, 18, active ? accent : muted, width);
    const shown = preview[i];
    if (shown) {
      if(d.carriage)d.carriage(shown,x,31,Math.min(151,width),entries[i]!.key);
      else d.cardIcon(shown,x,31,Math.min(151,width));
    }
    else {
      d.line([x - 12, 25, x + 12, 25], muted, 2);
      d.line([x, 13, x, 37], muted, 2);
    }
    d.label(active ? '装入预览' : shown ? CARS[shown].name.replace('车', '') : '空槽', x, -32, 18, active ? accent : muted, width - 4);
    d.addHitArea(x, 32, width, 177, () => c.actions.selectSlot(i));
  });
  for(let i=0;i<preview.length-1;i++){
    const a=preview[i],b=preview[i+1],recipe=a&&b?getRecipe(a,b):null;
    if(!recipe)continue;
    const from=recipe.executor===a?centers[i+1]:centers[i],to=recipe.executor===a?centers[i]:centers[i+1],direction=Math.sign(to-from);
    d.line([from,-49,from,-64,to,-64,to,-49],accent,1.5);
    const mid=(from+to)/2;
    d.line([mid-direction*7,-59,mid,-64,mid-direction*7,-69],accent,2);
  }

  if (selected >= 0) {
    d.label(replacing ? `将拆除 · 强化 ${old!.level} 级 / ${mods.length} 项改装`
      : old ? '旧车移入空位 · 改装保留' : '保留现有车厢', 0, -81, 19, replacing ? loss : muted, 566);
    d.label(installOutcome(m, selected, type), 0, -111, 22, accent, 566);
    brush(d, 0, -181, 568, 101, '#8FB6A725');
    const delta = recipeChanges(m.slots.map(car => car?.type ?? null), previewInstall(m, selected, type));
    const rows = [...delta.added.map(recipe => ({ recipe, added: true })), ...delta.removed.map(recipe => ({ recipe, added: false }))];
    if (!rows.length) d.label('联动配方保留 · 可继续调整位置', 0, -175, 21, muted, 566);
    rows.slice(0, rows.length > 3 ? 2 : 3).forEach(({ recipe, added }, i) => {
      const y = -149 - i * 33, color = added ? accent : loss;
      d.label(added ? '+' : '−', -273, y, 26, color, 32);
      const support = recipe.a === recipe.executor ? recipe.b : recipe.a;
      d.cardIcon(support, -224, y, 34);
      d.cardIcon(recipe.executor, -157, y, 34);
      d.line([-200, y, -181, y], muted, 1);
      d.line([-186, y + 4, -181, y, -186, y - 4], muted, 1);
      d.label(c.knownRecipes.has(recipe.id) ? recipe.name : '未知联动', -118, y, 22, color, 400, 'left');
    });
    if(rows.length > 3) d.label(`共新增 ${delta.added.length} 条 / 移除 ${delta.removed.length} 条联动`, 0, -215, 19, muted, 530);
    if (merging) d.label(`合并可选 · 强化 ${old!.level} → ${old!.level + 1} 级，改装保留`, 0, -248, 20, P.gold, 566);
    else {
      const next = m.buildProgression.nextMilestone;
      d.label(next ? `成长目标 · ${next.threshold}` : `当前路线 · ${m.buildIdentity}`, 0, -248, 20, P.gold, 566);
    }
    const command = !old ? '装车并出发' : full ? '替换旧车' : '插入并出发';
    d.button(command, merging ? -146 : 0, -303, merging ? 272 : 566, 70,
      () => replacing ? c.actions.confirmReplacement?.() : c.actions.installPending(true), !merging);
    if (merging) d.button('合并升级', 146, -303, 272, 70, c.actions.mergePending);
  }
  else d.label('点选槽位后，查看新车带来的联动', 0, -161, 22, muted, 566);
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
  const power = m.buildPower;
  heading(d, c.assembling ? '车厢就位' : '列车工坊', `${m.buildIdentity} · ${power.summary}`);
  const instruction = c.assembling ? '编组完成 · 准备出发' : c.selectedSlot >= 0 ? `已选 ${c.selectedSlot + 1} 号 · 点另一节交换，也可拖动`
      : '长按车厢拖到目标槽位，松手交换';
  d.label(instruction, 0, 258, 22, c.selectedSlot >= 0 ? P.teal : P.gold, 576);
  const spacing = 610 / m.slots.length;
  d.line([-302, 146, -6, 149, 302, 146], P.edge, 2);
  d.line([-302, 157, 8, 155, 302, 158], P.edge, 2);
  m.slots.forEach((car, i) => {
    const x = (i - (m.slots.length - 1) / 2) * spacing, selected = c.selectedSlot === i;
    const width = spacing - 10, lift = selected ? 6 : 0;
    if(selected) brush(d, x, 146 + lift, width, 153, '#8FB6A726');
    if (selected) {
      brush(d, x, 228 + lift, width - 8, 6, P.teal);
      d.line([x - 24, 43 + lift, x + 24, 43 + lift], P.teal, 1.5);
      d.line([x - 17, 48 + lift, x - 24, 43 + lift, x - 17, 38 + lift], P.teal, 1.5);
      d.line([x + 17, 48 + lift, x + 24, 43 + lift, x + 17, 38 + lift], P.teal, 1.5);
    }
    if (car) {
      const data = CARS[car.type];
      badge(d, `${i + 1} ${ROLE_NAMES[data.role]}`, x, 207 + lift, width - 8, ROLE_COLOR[data.role], 20);
      if(d.carriage)d.carriage(car.type,x,146+lift,119,`car:${car.id}`);
      else d.cardIcon(car.type, x, 146 + lift, 119);
      d.label(data.name, x, 87 + lift, 23, P.cream, width - 6, 'center', 'display');
      const modCount = (Object.keys(car.mods) as ModId[]).reduce((sum, id) => sum + (car.mods[id] || 0), 0);
      const state = selected ? '已选中' : c.selectedSlot >= 0 ? '点此交换' : modCount ? `改装 ×${modCount}` : car.level ? `强化 ${car.level} 级` : '基础车厢';
      d.label(state, x, 61 + lift, 20, selected || c.selectedSlot >= 0 ? P.teal : P.muted, width - 6);
    } else {
      badge(d, `${i + 1} 空槽`, x, 207 + lift, width - 8, P.paper, 20);
      brush(d, x, 145 + lift, 69, 58, '#DAB97922');
      d.line([x - 13, 145 + lift, x + 13, 145 + lift], P.muted, 3);
      d.line([x, 132 + lift, x, 158 + lift], P.muted, 3);
      d.label(c.selectedSlot >= 0 ? '交换到此' : '空槽可交换', x, 91 + lift, 20, P.muted, width - 6);
    }
    d.addHitArea(x, 139, width, 187, () => c.actions.selectSlot(i));
  });
  if (selectedCar) {
    brush(d, 0, -3, 566, 95, '#254F488C');
    const shown = installed.slice(0, installed.length > 3 ? 2 : 3);
    const summary = shown.map(id => `${MODS[id].name}×${selectedCar.mods[id]}`);
    if (installed.length > shown.length) summary.push(`另${installed.length - shown.length}项`);
    d.label(summary.join(' / ') || '尚未安装词条 · 补给可强化这节车厢', -267, 25, 20, P.cream, 535, 'left');
    // Explain a behavior-changing upgrade first; each shown name keeps its stack count.
    const detailId = installed.find(id => MODS[id].mode) || installed[0];
    const detail = detailId ? MODS[detailId].description : CARS[selectedCar.type].description;
    d.label(`本车输出 · ${m.getCarAttackSummary(c.selectedSlot)}`, -267, -1, 18, P.gold, 535, 'left');
    const synergy = m.getCarSynergySummary(c.selectedSlot);
    d.label(synergy || detail, -267, -29, synergy ? 20 : 17, synergy ? P.teal : P.muted, 535, 'left');
  }
  const compactLinks = !!selectedCar;
  for (let i = 0; i < m.slots.length - 1; i++) {
    const y = compactLinks ? -77 - i * 49 : 5 - i * 73;
    const link = links.find(l => l.index === i), recipe = link?.recipe;
    const known = !!recipe && c.knownRecipes.has(recipe.id);
    brush(d, 0, y, 567, compactLinks ? 45 : 68, link ? '#274C4665' : '#173C3D55');
    const routeColor = '#102B2D';
    brush(d, -255, y, 39, 35, link ? '#8FB6A7' : P.gold);
    brush(d, -193, y, 39, 35, link ? '#8FB6A7' : P.gold);
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
  const next = m.buildProgression.nextMilestone;
  d.label(next ? `下一步 · ${next.threshold}` : power.overdrive.eligible
    ? `${power.overdrive.name} · 蓄能${power.overdrive.chargeTime}秒，爆发${power.overdrive.duration}秒`
    : `${m.buildIdentity} · 成长完成`, 0, -259, 19, P.gold, 566);
  if(c.assembling)d.label('装配完成  →',0,-303,32,P.teal,566,'center','display');
  else d.button(`带着 ${links.length} 条联动出发  →`, 0, -303, 566, 66, c.actions.resumeWorkshop);
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
    inset(d, -284, y - 72, 568, 148, known ? '#345566F5' : '#22313EF5');
    brush(d, -237, y + 37, 79, 63, '#8FB6A725');
    brush(d, 237, y + 37, 79, 63, '#DAB97925');
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
  const reward = m.rewardState, carReward = reward?.kind !== 'mod';
  const source = reward?.source === 'elite' ? '精英战利' : reward?.source === 'timer' ? '定时整备' : '经验积累';
  const recommendation = recommendOffer(m);
  heading(d, carReward ? '编组晋升' : '特殊改装', `${source} · ${carReward ? '车厢三选一' : '改装三选一'}`);
  d.rect(-282, 388, 134, 27, carReward ? '#28564A' : P.seal, 1);
  d.label(carReward ? '车厢补给票' : '特殊改装票', -215, 401, 17, P.cream, 126);
  m.offers.forEach((offer, i) => {
    const y = 180 - i * 185, isCar = offer.kind === 'car', isRepair = offer.kind === 'repair';
    const heal = Math.min(m.maxHp - m.hp, offer.amount ?? m.repairAmount);
    const data = isRepair ? {name:'应急维修', description:`装甲恢复 ${heal} 点，最高恢复至 ${m.maxHp}。`} : isCar ? CARS[offer.id as CarType] : MODS[offer.id as ModId];
    const color = isRepair ? P.teal : isCar ? ROLE_COLOR[CARS[offer.id as CarType].role] : P.gold;
    inset(d, -284, y - 80, 568, 168, carReward ? '#22313EF5' : '#22313EF5');
    if (!carReward) d.line([-284,y+88,-264,y+88,-254,y+78],P.seal,3);
    const suggested = recommendation?.index === i;
    if (suggested) {
      brush(d, -281, y + 4, 4, 140, '#8FB6A7B8');
      brush(d, 244, y + 60, 66, 31, '#8FB6A7');
    }
    brush(d, -207, y + 14, 137, 109, '#DAB97939');
    if (isCar) roleMark(d, CARS[offer.id as CarType].role, -257, y + 58, 13, color);
    if (!suggested) brush(d, 246, y + 60, 52, 29, '#F4E4BE');
    d.label(suggested ? '建议' : `0${i + 1}`, 246, y + 60, suggested ? 20 : 23, '#102B2D', 63, 'center', 'display');
    if (isCar) d.cardIcon(offer.id as CarType, -207, y + 17, 124);
    else if(d.modIcon){
      d.modIcon(isRepair?'repair':offer.id as ModId,-207,y+17,122);
    }else {
      brush(d, -207, y + 17, 77, 63, '#DAB97944');
      if (isRepair) roleMark(d, 'buff', -207, y + 17, 33, P.teal);
      else d.label('改', -207, y + 17, 36, P.cream, 85, 'center', 'display');
    }
    badge(d, isRepair ? '应急维护' : isCar ? `${ROLE_NAMES[CARS[offer.id as CarType].role]}车厢` : '专属词条', -207, y - 56, 122, color);
    d.label(data.name, -111, y + 47, 34, P.cream, 317, 'left', 'display');
    d.line([-110, y + 28, -74, y + 26, -38, y + 28], '#DAB9796B', 1.3);
    const summary = offerSummary(m, offer, c.knownRecipes);
    if(carReward&&m.supplyCount===1&&offer.id==='fan')summary[0]='把风扇装在火炮旁，试试气流支援';
    if (!isCar && summary.length < 3) summary.push(isRepair ? '领取后恢复装甲，继续行车' : '无需装车 · 领取后继续行车');
    summary.slice(0, 3).forEach((text, row) => d.label(text, -111, y + 9 - row * 31, 20,
      row === 0 ? P.teal : !carReward && row === 1 ? P.gold : P.muted, 374, 'left'));
    d.addHitArea(0, y + 4, 568, 168, () => c.actions.chooseOffer(i));
  });
  d.label(carReward ? hasSpace ? '选一节进入工坊 · 可插入新车或合并同型' : '列车已满 · 选车后在工坊合并或替换' : '选一项立即生效 · 强化现有编组', 0, -307, 20, P.muted, 566);
  buildGoal(d, m, -349);
}

function pause(c: PanelContext) {
  const d = c.draw, m = c.model, awaitingSupply = m.previous === 'supply';
  d.label('末日列车 / 行车控制', -268, 363, 19, P.gold, 390, 'left');
  d.label('暂时停靠', -270, 307, 54, P.cream, 416, 'left', 'display');
  d.rect(213, 281, 9, 45, P.gold, 0);
  d.rect(234, 281, 9, 45, P.gold, 0);
  d.label(awaitingSupply ? '补给已到站，领取后继续这段旅程。' : '歇一歇，带着最后的光继续前行。', -268, 255, 21, P.muted, 536, 'left');
  d.line([-268,222,268,222], '#DAB97966', 1);
  d.label(`第 ${m.wave} 波`, -266, 194, 25, P.cream, 165, 'left', 'display');
  d.label(`装甲 ${Math.ceil(m.hp)} / ${m.maxHp}`, -81, 194, 22, m.hp < m.maxHp * .35 ? P.red : P.teal, 208, 'left');
  d.label(`${Math.floor(m.time / 60).toString().padStart(2,'0')}:${Math.floor(m.time % 60).toString().padStart(2,'0')}`, 221, 194, 24, P.gold, 95);
  d.label('当前编组', -268, 151, 18, P.muted, 110, 'left');
  d.label(m.buildIdentity, 133, 151, 20, P.gold, 270, 'right');
  d.line([-251,67,251,67], '#DAB97980', 2);
  m.slots.forEach((car, i) => {
    const x = (i - (m.slots.length - 1) / 2) * 108;
    d.circle(x, 67, 4, car ? P.gold : '#48645B');
    if (car) {
      d.cardIcon(car.type, x, 103, 76);
      d.label(CARS[car.type].name, x, 39, 19, P.cream, 104);
    } else d.label('空位', x, 103, 19, '#84978C', 95);
  });
  d.label(`${m.links.length} 条相邻联动 · ${m.buildPower.summary}`, -268, -3, 20, P.teal, 536, 'left');
  const next = m.buildProgression.nextMilestone;
  d.rect(-270, -115, 540, 86, '#26453F88', 2);
  d.rect(-270, -115, 3, 86, P.gold, 0);
  d.label(next ? `下一步 / ${next.title}` : '编组成长已完成', -252, -52, 20, P.gold, 504, 'left');
  d.label(next ? next.threshold : '继续强化车厢，守住更远的路。', -252, -87, 20, P.cream, 504, 'left');
  d.button(awaitingSupply ? '返回补给  →' : '继续前进  →', 0, -177, 540, 74, c.actions.resume, true);
  if (awaitingSupply) d.label('领取补给后，可进入工坊调整车序', -268, -266, 21, P.muted, 536, 'left');
  else d.button(m.pendingCar ? '安排新车  →' : '调整车序  ↔', 0, -265, 540, 62, c.actions.openWorkshop, false);
  d.line([-268,-319,268,-319], '#DAB97933', 1);
  d.button('收车并记录', -120, -355, 290, 48, c.actions.backToMenu, false);
  d.button('重新发车', 175, -355, 188, 48, c.actions.begin, false);
  d.label('停靠期间 · 战斗与行程计时暂停', -268, -395, 17, P.muted, 536, 'left');
}

function results(c: PanelContext) {
  const d = c.draw, m = c.model, fallen = m.phase === 'lose';
  const progression = m.buildProgression;
  brush(d, 0, 382, 65, 7, fallen ? P.warning : P.teal);
  d.label(fallen ? '列车失守' : '行程记录', 0, 332, 50, fallen ? P.red : P.cream, 570, 'center', 'display');
  d.label(c.saveFailed?'记录未存盘 · 点此重试，请勿关闭页面':fallen ? `第 ${m.wave} 波 · 主要受损：${m.mainDamageSource || '尚无受损记录'}` : `抵达第 ${m.wave} 波`, 0, 272, 22, c.saveFailed?P.red:P.muted, 570);
  if(c.saveFailed){d.line([-264,251,264,251],P.red,1);d.addHitArea(0,272,570,42,()=>c.actions.retrySave?.());}
  const identityColor = m.buildIdentity === '火力编队' ? P.gold : m.buildIdentity === '全域支援' ? '#8FB6A7' : m.buildIdentity === '链式共鸣' ? '#F4E4BE' : P.gold;
  d.label(`${m.buildIdentity} · ${m.buildPower.summary}`, 0, 239, 21, identityColor, 570, 'center', 'display');
  const completed=progression.milestones.filter(milestone=>milestone.completed).length;
  d.label(`成长 ${completed}/${progression.milestones.length} · 联动发动 ${progression.metrics.linkActivations} 次 · 首领 ${progression.metrics.bossKills}`, 0, 207, 20, P.muted, 570);
  inset(d, -281, 96, 562, 94);
  d.label(`${m.kills}`, -141, 157, 45, P.cream, 240);
  d.label('击破敌人', -141, 124, 20, P.muted, 240);
  d.line([0, 112, 0, 174], P.edge, 2);
  d.label(`${Math.round(m.time)} 秒`, 141, 157, 39, P.cream, 240);
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
  const formationText = formation.length > 2 ? `${formation.slice(0, 2).join(' / ')} 等${formation.length}种` : formation.join(' / ');
  d.label(`终局编组 · ${formationText || '各车独立工作'}`, 0, -185, 19, P.muted, 562);
  brush(d, 0, -242, 566, 62, '#274C4655');
  d.label('下局试试', -268, -222, 20, P.gold, 180, 'left');
  d.label(nextRunAdvice(m), -268, -251, 21, P.cream, 536, 'left');
  d.button('再组一列  →', 0, -320, 566, 68, c.actions.begin);
  d.button('返回车库', 0, -392, 566, 54, c.actions.backToMenu, false);
}

function expeditionHistory(c:PanelContext) {
  const d=c.draw,history=c.garage!.recentRuns;
  const selected=history[c.historyIndex??-1];
  if(selected){
    surface(d);heading(d,`第${selected.number}次远征`,c.saveFailed?'记录暂未写入设备 · 请勿关闭页面':`${ENGINES[selected.engine].name} · 第${selected.wave}波 · 击破 ${selected.kills}`);
    selected.cars.forEach((car,index)=>{
      const y=218-index*98;
      inset(d,-280,y-76,560,90,P.tile);
      d.label(`${index+1}`, -258,y-25,20,P.muted,32);
      if(!car){d.label('空车位',-210,y-25,23,P.muted,440,'left');return;}
      d.cardIcon(car.type,-197,y-27,54);
      d.label(`${CARS[car.type].name} +${car.level}`,-154,y-5,23,P.cream,408,'left');
      const mods=(Object.keys(car.mods??{}) as ModId[]).filter(id=>MODS[id]?.mode&&(car.mods![id]??0)>0).map(id=>`${MODS[id].name} ${car.mods![id]}级`);
      d.label(car.mods===undefined?'旧记录未保存词条':mods.length?mods.slice(0,2).join(' · '):'未装配特殊词条',-154,y-33,20,P.muted,408,'left');
      if(mods.length>2)d.label(mods.slice(2).join(' · '),-154,y-59,20,P.muted,408,'left');
    });
    if(c.saveFailed)d.button('重试保存',0,-314,566,46,()=>c.actions.retrySave?.(),true);
    d.button('返回记录列表',0,c.saveFailed?-381:-370,566,58,()=>c.actions.selectHistory?.(-1),false);
    return;
  }
  surface(d);heading(d,'远征记录',c.saveFailed?'记录暂未写入设备 · 请勿关闭页面':'最近五次 · 点击记录查看配装');
  if(!history.length){
    d.label('还没有远征记录',0,90,30,P.cream,550);
    d.label('完成远征或返回菜单后，将在这里留下行车票。',0,30,21,P.muted,550);
    d.label('旧版累计成绩仍然保留。',0,-16,20,P.muted,550);
  }
  history.forEach((run,index)=>{
    const y=226-index*104;
    inset(d,-280,y-84,560,96,P.tile);
    d.addHitArea(0,y-36,560,96,()=>c.actions.selectHistory?.(index));
    const time=`${Math.floor(run.time/60).toString().padStart(2,'0')}:${(run.time%60).toString().padStart(2,'0')}`;
    d.label(`#${run.number} ${ENGINES[run.engine].name} · ${time} · 第${run.wave}波`,-266,y-5,22,P.cream,440,'left');
    d.label(run.outcome==='defeat'?'失守':run.outcome==='completed'?'完成':'收车',238,y-5,20,P.gold,66);
    d.label(`击破 ${run.kills} · 首领 ${run.bosses}`,-266,y-43,20,P.muted,230,'left');
    run.cars.forEach((car,i)=>{
      const x=15+i*53;
      if(car){d.cardIcon(car.type,x,y-46,44);if(car.level)d.label(`+${car.level}`,x,y-73,15,P.gold,48);}
      else d.label('—',x,y-46,18,P.muted,40);
    });
  });
  if(c.saveFailed)d.button('重试保存',0,-314,566,46,()=>c.actions.retrySave?.(),true);
  d.button('返回',0,c.saveFailed?-381:-370,566,58,()=>c.actions.closeHistory?.(),false);
}

export function renderPanel(context: PanelContext): void {
  if(context.historyOpen&&context.garage){expeditionHistory(context);return;}
  if (context.garageOpen && context.garage) { garage(context); return; }
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
