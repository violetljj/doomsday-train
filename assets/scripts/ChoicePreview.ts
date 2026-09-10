import { CARS, MODS, getRecipe } from './Catalog.ts';
import type { CarType, ModId, Recipe } from './Catalog.ts';
import type { Combat, Offer } from './Combat.ts';
import { crossfeedSummary } from './BuildProgression.ts';

type TrainRow = readonly (CarType | null)[];

function types(model: Combat): (CarType | null)[] {
  return model.slots.map(car => car?.type ?? null);
}

function recipeEntries(row: TrainRow): Recipe[] {
  const entries: Recipe[] = [];
  for (let index = 0; index < row.length - 1; index++) {
    const a = row[index], b = row[index + 1];
    const recipe = a && b ? getRecipe(a, b) : null;
    if (recipe) entries.push(recipe);
  }
  return entries;
}

function recipeLabel(recipe: Recipe, known: ReadonlySet<string>): string {
  return known.has(recipe.id) ? recipe.name : `未知联动：${recipe.hint}`;
}

function count(entries: Recipe[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const entry of entries) values.set(entry.id, (values.get(entry.id) ?? 0) + 1);
  return values;
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/** Stable identities distinguish duplicate cars while previewing Combat.install without mutation. */
export function previewInstallEntries(model: Combat, index: number, type: CarType): ({ type: CarType; key: string } | null)[] {
  const row = model.slots.map(car => car ? { type: car.type, key: `car:${car.id}` } : null);
  if (!Number.isInteger(index) || index < 0 || index >= row.length) return row;
  if (row[index]) {
    const right = row.indexOf(null, index + 1);
    const left = index > 0 ? row.lastIndexOf(null, index - 1) : -1;
    if (right >= 0) for (let cursor = right; cursor > index; cursor--) row[cursor] = row[cursor - 1];
    else if (left >= 0) for (let cursor = left; cursor < index; cursor++) row[cursor] = row[cursor + 1];
  }
  row[index] = { type, key: 'pending' };
  return row;
}

/** Uses the same projection as identity-aware workshop previews. */
export function previewInstall(model: Combat, index: number, type: CarType): (CarType | null)[] {
  return previewInstallEntries(model, index, type).map(car => car?.type ?? null);
}

/** Station tradeoffs use the current train and never disclose recipe names. */
export function stationAdvice(model: Combat, offer: Offer): string {
  if (offer.kind === 'repair') {
    const healed = Math.max(0, Math.min(model.maxHp - model.hp, offer.amount ?? model.repairAmount));
    return healed ? `实修${format(healed)}点；放弃本次成长` : '装甲已满；维修会放弃本次成长';
  }
  if (offer.kind === 'car') {
    const type = offer.id as CarType, slot = recommendSlot(model, type);
    if (slot < 0) return model.slots.some(car => car?.type === type)
      ? '列车已满；可合并同型车升级' : '列车已满；需替换现有车厢';
    const added = addedRecipes(types(model), previewInstall(model, slot, type)).length;
    if(CARS[type].role==='offense' && model.slots.filter(car=>car&&CARS[car.type].role==='offense').length===1)
      return added ? `补充进攻火力；可新增${added}条联动` : '补充进攻火力；暂不新增联动';
    if(CARS[type].role!=='offense' && !added && model.slots.some(car=>car?.type===type))
      return '已有同型辅助；可考虑合并升级';
    return added ? `${slot + 1}号空槽可新增${added}条相邻联动` : `${slot + 1}号有空槽；暂不新增联动`;
  }
  const id = offer.id as ModId, mod = MODS[id], target = mod.target;
  const risk = target === 'cannon' || target === 'rail' ? '重甲抗物理' : '迎战双血重甲';
  if (target === 'links') return model.links.length ? `强化${model.links.length}条联动；${risk}` : `暂无联动受益；${risk}`;
  const cars = model.slots.filter(car => car?.type === target);
  if (!cars.length) return `当前无目标车；${risk}`;
  if (mod.mode && cars.every(car => (car!.mods[id] ?? 0) >= 2)) return `目标词条已满；${risk}`;
  const benefit = mod.mode === 'cadence' ? '提速' : mod.mode === 'reach' ? '增程'
    : mod.mode === 'lanes' || id === 'scatter' ? '增弹减单伤' : id === 'burst' ? '连发减单伤'
    : target === 'repair' ? '增修复' : target === 'shield' ? '增充盾' : '升级';
  return `${CARS[target].name.replace('车', '')}${benefit}；${risk}`;
}

/** Select an empty slot that creates the most adjacent recipes; full trains require an explicit replacement. */
export function recommendSlot(model: Combat, type: CarType): number {
  let best = -1, bestLinks = -1;
  for (let index = 0; index < model.slots.length; index++) {
    if (model.slots[index]) continue;
    const row = previewInstall(model, index, type);
    const newLinks = recipeEntries(row).length - model.links.length;
    if (newLinks > bestLinks) { best = index; bestLinks = newLinks; }
  }
  return best;
}

/** A transparent, deterministic suggestion; selecting and replacing remain player actions. */
export function recommendOffer(model: Combat): { index: number; reason: string } | null {
  const offense = model.slots.filter(car => car && CARS[car.type].role === 'offense').length;
  let best: { index: number; reason: string; score: number } | null = null;
  model.offers.forEach((offer, index) => {
    let score = -1, reason = '';
    if (offer.kind === 'repair') {
      const healed = Math.max(0, Math.min(model.maxHp - model.hp, offer.amount ?? model.repairAmount));
      if (healed > 0 && model.hp < model.maxHp * .45) {
        score = 100; reason = '装甲偏低，先维修再出发';
      }
    } else if (offer.kind === 'car') {
      const type = offer.id as CarType, slot = recommendSlot(model, type);
      const added = slot >= 0 ? addedRecipes(types(model), previewInstall(model, slot, type)).length : 0;
      const offenseNeeded = CARS[type].role === 'offense' && offense < 2;
      if (added) { score = 20 + added * 10; reason = `空槽可新增 ${added} 条联动`; }
      else if (offenseNeeded) { score = 25; reason = '增加进攻车，分担清敌压力'; }
      else if (model.slots.some(car => car?.type === type)) { score = 8; reason = '同型车可合并，保留现有编组'; }
    } else {
      const id = offer.id as ModId, mod = MODS[id];
      const targets = model.slots.filter(car => car?.type === mod.target);
      const effective = mod.target === 'links' ? model.links.length > 0
        : targets.some(car => !mod.mode || (car!.mods[id] ?? 0) < 2);
      if (effective) { score = 15; reason = mod.target === 'links' ? '现有联动可立即强化' : '现有车厢可立即受益'; }
    }
    if (score >= 0 && (!best || score > best.score)) best = { index, reason, score };
  });
  return best;
}

/** Structural before/after only: deliberately does not estimate combat DPS. */
export function installOutcome(model: Combat, index: number, type: CarType): string {
  const before = types(model), after = previewInstall(model, index, type);
  const offense = (row: TrainRow) => row.filter(car => car && CARS[car].role === 'offense').length;
  const snapshot=after.map(type=>type?{type}:null);
  const feeds=after.map((_,slot)=>crossfeedSummary(snapshot,slot)).filter(Boolean);
  return `联动 ${recipeEntries(before).length} → ${recipeEntries(after).length} 条  ·  进攻 ${offense(before)} → ${offense(after)} 节${feeds.length?`  ·  ${[...new Set(feeds)].join('；')}`:''}`;
}

/** A specific next-run experiment grounded in the final formation, not inferred damage statistics. */
export function nextRunAdvice(model: Combat): string {
  if (!model.links.length) return '把辅助装在进攻车旁，先接通一条联动';
  if (model.slots.filter(car => car && CARS[car.type].role === 'offense').length < 2)
    return '补一节进攻车，让辅助支援更多火力';
  const next = model.buildProgression.nextMilestone;
  return next ? `${next.title} · ${next.threshold}` : '保留核心联动，尝试替换一节车厢';
}

/** Recipe multiset delta: a route shifting to another edge is retained, not reported as lost. */
export function linkChanges(before: TrainRow, after: TrainRow, known: ReadonlySet<string>): { added: string[]; removed: string[] } {
  const delta = recipeChanges(before, after);
  return { added: delta.added.map(recipe => recipeLabel(recipe, known)), removed: delta.removed.map(recipe => recipeLabel(recipe, known)) };
}

/** Structured changes let the workshop show equipment pairs instead of explanatory paragraphs. */
export function recipeChanges(before: TrainRow, after: TrainRow): { added: Recipe[]; removed: Recipe[] } {
  const oldEntries = recipeEntries(before), newEntries = recipeEntries(after);
  const oldCounts = count(oldEntries), newCounts = count(newEntries);
  const added: Recipe[] = [], removed: Recipe[] = [];
  for (const recipe of newEntries) {
    const old = oldCounts.get(recipe.id) ?? 0;
    if (old > 0) oldCounts.set(recipe.id, old - 1);
    else added.push(recipe);
  }
  for (const recipe of oldEntries) {
    const next = newCounts.get(recipe.id) ?? 0;
    if (next > 0) newCounts.set(recipe.id, next - 1);
    else removed.push(recipe);
  }
  return { added, removed };
}

function range(values: number[]): string {
  return Array.from(new Set(values.map(format))).join('/');
}

function compactRecipe(recipe: Recipe, known: ReadonlySet<string>): string {
  if (known.has(recipe.id)) return recipe.name;
  const support = recipe.a === recipe.executor ? recipe.b : recipe.a;
  return `未知联动·${CARS[support].name.replace('车', '')}→${CARS[recipe.executor].name.replace('车', '')}`;
}

function compactList(values: string[]): string {
  return values.length <= 1 ? values.join('') : `${values[0]}等${values.length}条`;
}

function addedRecipes(before: TrainRow, after: TrainRow): Recipe[] {
  const previous = count(recipeEntries(before));
  return recipeEntries(after).filter(recipe => {
    const left = previous.get(recipe.id) ?? 0;
    if (left) { previous.set(recipe.id, left - 1); return false; }
    return true;
  });
}

function compatibleCars(model: Combat, type: CarType): string {
  const cars = model.slots.filter(car => car && getRecipe(type, car.type)).map(car => car!.type);
  if (!cars.length) return CARS[type].role === 'offense' ? '独立进攻车' : CARS[type].role === 'buff' ? '增益辅助车' : '减益辅助车';
  const names = Array.from(new Set(cars.map(car => CARS[car].name.replace('车', ''))));
  return CARS[type].role === 'offense' ? `可获${names.join('、')}支援` : `可支援${names.join('、')}`;
}

/** Isolate the two fields a mod changes; all queries on this view are read-only. */
function previewMod(model: Combat, id: ModId): Combat {
  const next: Combat = Object.assign(Object.create(Object.getPrototypeOf(model)), model);
  next.slots = model.slots.map(car => car ? { ...car, mods: { ...car.mods } } : null);
  const mod = MODS[id];
  if (mod.target === 'links') next.linkLevel++;
  else for (const car of next.slots) if (car?.type === mod.target) {
    if (mod.mode) car.mods[id] = Math.min(2, (car.mods[id] ?? 0) + 1);
    else { car.level++; car.mods[id] = car.level; }
  }
  return next;
}

function modEffect(model: Combat, id: ModId): string {
  const mod = MODS[id], target = mod.target;
  if (target === 'links') return model.links.length
    ? `${model.links.length} 条联动词条 ${format(1 + model.linkLevel * .25)}x → ${format(1 + (model.linkLevel + 1) * .25)}x`
    : '当前没有联动可强化';
  const cars = model.slots.filter(car => car?.type === target);
  if (!cars.length) return `当前没有${CARS[target].name}`;
  const projected = previewMod(model, id);
  const indices: number[] = [];
  model.slots.forEach((car, index) => { if (car?.type === target) indices.push(index); });
  const beforeStats = indices.map(index => model.getCarAttackStats(index)!);
  const afterStats = indices.map(index => projected.getCarAttackStats(index)!);
  const stacks = cars.map(car => car!.mods[id] ?? 0);
  const nextStacks = stacks.map(stack => Math.min(2, stack + 1));
  const changed = nextStacks.some((stack, index) => stack !== stacks[index]);
  if (mod.mode && !changed) return '所有目标均已达词条上限';
  if (id === 'rapid' || id === 'surge') {
    return `间隔 ${range(beforeStats.map(stats => stats.interval))}→${range(afterStats.map(stats => stats.interval))}秒`;
  }
  if (id === 'reach') {
    return `射程 ${range(stacks.map(stack => 240 * (1 + .25 * stack)))}→${range(nextStacks.map(stack => 240 * (1 + .25 * stack)))}`;
  }
  if (id === 'lanes' || id === 'scatter') {
    const label = id === 'lanes' ? '光束' : '炮弹';
    return `${label}${range(stacks.map(stack => 1 + stack))}→${range(nextStacks.map(stack => 1 + stack))}束；单发降低`;
  }
  if (id === 'burst') {
    return `连射${range(stacks.map(stack => stack + 1))}→${range(nextStacks.map(stack => stack + 1))}发；单发降低`;
  }
  const levels = cars.map(car => car!.level), nextLevels = levels.map(level => level + 1);
  if (target === 'repair' || target === 'shield') return `每次${target === 'repair' ? '维修' : '充盾'}${range(beforeStats.map(stats => stats.utility!))}→${range(afterStats.map(stats => stats.utility!))}点`;
  if (target === 'prism') return `强化等级${range(levels)}→${range(nextLevels)}`;
  if (target === 'fan') return `推力${range(beforeStats.map(stats => stats.utility!))}→${range(afterStats.map(stats => stats.utility!))}`;
  return `单次伤害${range(beforeStats.map(stats => stats.damage))}→${range(afterStats.map(stats => stats.damage))}`;
}

/** Compact, state-aware supply copy. Unknown recipes expose only their authored hint. */
export function offerSummary(model: Combat, offer: Offer, known: ReadonlySet<string>): string[] {
  if (offer.kind === 'repair') {
    const healed = Math.min(model.maxHp - model.hp, offer.amount ?? model.repairAmount);
    return [`装甲${format(model.hp)}→${format(model.hp + healed)}`, healed ? `实际恢复${format(healed)}点` : '装甲已满'];
  }
  if (offer.kind === 'mod') {
    const id = offer.id as ModId;
    const target = MODS[id].target;
    const summary = [modEffect(model, id), target === 'links' ? '作用于当前全部联动' : `作用于现有${CARS[target].name}`];
    if (!MODS[id].mode && target !== 'links') {
      const projected = previewMod(model, id);
      const affected = model.links.filter(link => model.slots[link.index]?.type === target || model.slots[link.index + 1]?.type === target);
      if (affected.length) {
        const before = affected.map(link => {
          const a = model.slots[link.index]!, b = model.slots[link.index + 1]!;
          const factor = (1 + .25 * model.linkLevel) * (1 + .18 * Math.max(0, model.links.filter(other => other.driver === link.driver).length - 1));
          return { value: (1 + .2 * (a.level + b.level)) * factor * model.buildPower.linkDamageMultiplier * model.buildPower.supportPowerMultiplier,
            next: (1 + .2 * (a.level + b.level + 1)) * factor * projected.buildPower.linkDamageMultiplier * projected.buildPower.supportPowerMultiplier };
        });
        summary.push(`相邻联动倍率${range(before.map(v => v.value))}→${range(before.map(v => v.next))}`);
      } else summary.push('当前无相邻联动受益');
    }
    return summary;
  }
  const type = offer.id as CarType;
  const slot = recommendSlot(model, type);
  if (slot < 0) return [compatibleCars(model, type), '列车已满，工坊可替换或合并', '不会自动拆除车厢'];
  const before = types(model), after = previewInstall(model, slot, type);
  const added = addedRecipes(before, after);
  const route = added.length ? `新增：${compactList(added.map(recipe => compactRecipe(recipe, known)))}` : '此位置暂不形成联动';
  return [compatibleCars(model, type), `推荐装入${slot + 1}号空槽`, route];
}
