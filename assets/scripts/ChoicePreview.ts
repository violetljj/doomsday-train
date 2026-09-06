import { CARS, MODS, getRecipe } from './Catalog.ts';
import type { CarType, ModId, Recipe } from './Catalog.ts';
import type { Combat, Offer } from './Combat.ts';

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

/** Mirrors Combat.install while only projecting car types, never mutating the model. */
export function previewInstall(model: Combat, index: number, type: CarType): (CarType | null)[] {
  const row = types(model);
  if (!Number.isInteger(index) || index < 0 || index >= row.length) return row;
  if (row[index]) {
    const right = row.indexOf(null, index + 1);
    const left = index > 0 ? row.lastIndexOf(null, index - 1) : -1;
    if (right >= 0) for (let cursor = right; cursor > index; cursor--) row[cursor] = row[cursor - 1];
    else if (left >= 0) for (let cursor = left; cursor < index; cursor++) row[cursor] = row[cursor + 1];
  }
  row[index] = type;
  return row;
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

function modEffect(model: Combat, id: ModId): string {
  const mod = MODS[id], target = mod.target;
  if (target === 'links') return model.links.length
    ? `${model.links.length} 条联动倍率 ${format(1 + model.linkLevel * .25)}x → ${format(1 + (model.linkLevel + 1) * .25)}x`
    : '当前没有联动可强化';
  const cars = model.slots.filter(car => car?.type === target);
  if (!cars.length) return `当前没有${CARS[target].name}`;
  const stacks = cars.map(car => car!.mods[id] ?? 0);
  const nextStacks = stacks.map(stack => Math.min(2, stack + 1));
  const changed = nextStacks.some((stack, index) => stack !== stacks[index]);
  if (mod.mode && !changed) return '所有目标均已达词条上限';
  if (id === 'rapid' || id === 'surge') {
    const base = id === 'rapid' ? .66 : .95;
    return `间隔 ${range(stacks.map(stack => base * Math.pow(.8, stack)))}→${range(nextStacks.map(stack => base * Math.pow(.8, stack)))}秒`;
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
  if (target === 'repair') return `每次维修${range(levels.map(level => 3 + level))}→${range(nextLevels.map(level => 3 + level))}点`;
  if (target === 'shield') return `每次充盾${range(levels.map(level => 12 + level * 4))}→${range(nextLevels.map(level => 12 + level * 4))}点`;
  if (target === 'prism') return `强化等级${range(levels)}→${range(nextLevels)}`;
  return `基础倍率${range(levels.map(level => 1 + level * .35))}→${range(nextLevels.map(level => 1 + level * .35))}`;
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
      const affected = model.links.filter(link => model.slots[link.index]?.type === target || model.slots[link.index + 1]?.type === target);
      if (affected.length) {
        const before = affected.map(link => {
          const a = model.slots[link.index]!, b = model.slots[link.index + 1]!;
          const factor = (1 + .25 * model.linkLevel) * (1 + .18 * Math.max(0, model.links.filter(other => other.driver === link.driver).length - 1));
          return { value: (1 + .2 * (a.level + b.level)) * factor, increase: .2 * factor };
        });
        summary.push(`相邻联动倍率${range(before.map(v => v.value))}→${range(before.map(v => v.value + v.increase))}`);
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
