import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { RECIPES } from '../assets/scripts/Catalog.ts';
import { previewInstall, previewInstallEntries, stationAdvice } from '../assets/scripts/ChoicePreview.ts';

function model(types) {
  const value = new Combat(); value.start(137, true);
  value.slots = value.slots.map((_, index) => types[index] ? { id:100 + index, type:types[index], angle:0, previousAngle:0, flash:0, level:0, mods:{} } : null);
  return value;
}

for (const [types, index, keys] of [
  [['cannon', 'cannon', null, 'cryo'], 1, ['car:100', 'pending', 'car:101', 'car:103', null]],
  [[null, 'cannon', 'cannon', 'cryo', 'rail'], 2, ['car:101', 'car:102', 'pending', 'car:103', 'car:104']],
  [['cannon', 'cannon', 'flame', 'cryo', 'rail'], 1, ['car:100', 'pending', 'car:102', 'car:103', 'car:104']],
  [['cannon', null, 'cryo'], 1, ['car:100', 'pending', 'car:102', null, null]],
]) {
  const value = model(types), before = JSON.stringify(value), refs = [...value.slots];
  const entries = previewInstallEntries(value, index, 'tesla');
  assert.deepEqual(entries.map(car => car?.key ?? null), keys);
  assert.deepEqual(entries.map(car => car?.type ?? null), previewInstall(value, index, 'tesla'));
  assert.equal(JSON.stringify(value), before, 'both previews preserve all state');
  value.phase = 'workshop'; value.pendingCar = 'tesla';
  assert.equal(value.install(index), true);
  assert.deepEqual(entries.map(car => car?.type ?? null), value.slots.map(car => car?.type ?? null), 'projection matches actual installation');
  entries.forEach((entry, slot) => {
    if (entry && entry.key !== 'pending') assert.equal(value.slots[slot], refs.find(car => `car:${car?.id}` === entry.key), 'retained identity is the actual shifted car');
  });
}
for (const index of [-1, 5, 1.5, NaN]) {
  const value = model(['cannon', 'cannon']);
  const entries = previewInstallEntries(value, index, 'tesla');
  assert.deepEqual(entries.map(car => car?.key ?? null), ['car:100', 'car:101', null, null, null]);
  assert.deepEqual(entries.map(car => car?.type ?? null), previewInstall(value, index, 'tesla'));
}

const advice = (value, kind, id, amount) => stationAdvice(value, { kind, id, amount });
assert.match(advice(model(['cannon', null, 'tesla']), 'car', 'fan'), /2号空槽可新增2条相邻联动/);
assert.match(advice(model(['cannon']), 'car', 'tesla'), /补充进攻火力；暂不新增联动/);
assert.match(advice(model(['cannon','fan']), 'car', 'rail'), /补充进攻火力；可新增1条联动/);
assert.match(advice(model(['cannon','fan']), 'car', 'fan'), /已有同型辅助；可考虑合并升级/);
const full = model(['cannon', 'fan', 'cryo', 'rail', 'flame']);
assert.match(advice(full, 'car', 'cannon'), /可合并同型车升级/);
assert.match(advice(full, 'car', 'tesla'), /需替换现有车厢/);
assert.match(advice(model(['cannon']), 'mod', 'rapid'), /火炮提速；重甲抗物理/);
assert.match(advice(model(['rail']), 'mod', 'railpower'), /轨道炮升级；重甲抗物理/);
assert.match(advice(model(['tesla']), 'mod', 'surge'), /电弧提速；迎战双血重甲/);
assert.match(advice(model(['cannon', 'fan']), 'mod', 'resonance'), /强化1条联动/);
assert.match(advice(model(['cannon']), 'mod', 'resonance'), /暂无联动受益/);
assert.match(advice(model(['cannon']), 'mod', 'surge'), /当前无目标车/);
const capped = model(['cannon']); capped.slots[0].mods.rapid = 2;
assert.match(advice(capped, 'mod', 'rapid'), /目标词条已满/);
const mixed = model(['cannon', 'cannon']); mixed.slots[0].mods.rapid = 2;
assert.match(advice(mixed, 'mod', 'rapid'), /火炮提速/);
const repair = model(['cannon']); repair.hp = 95;
assert.equal(advice(repair, 'repair', 'repair', 30), '实修5点；放弃本次成长');
repair.hp = 40;
assert.equal(advice(repair, 'repair', 'repair'), '实修30点；放弃本次成长');
repair.hp = 100;
assert.match(advice(repair, 'repair', 'repair'), /装甲已满/);
const snapshot = JSON.stringify(full);
for (const recipe of RECIPES) assert.ok(!advice(full, 'car', 'acid').includes(recipe.name), 'unknown names stay hidden');
assert.equal(JSON.stringify(full), snapshot, 'advice is pure');
console.log('Station advice checks passed: state-aware tradeoffs, privacy, identity-preserving install parity, invalid slots and purity.');
