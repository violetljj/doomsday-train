import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { linkChanges, offerSummary, previewInstall, recommendSlot, recommendOffer, installOutcome, nextRunAdvice } from '../assets/scripts/ChoicePreview.ts';

function model(types) {
  const value = new Combat(); value.start(137, true);
  value.slots = value.slots.map((_, index) => types[index] ? { id:index, type:types[index], angle:0, previousAngle:0, flash:0, level:0, mods:{} } : null);
  return value;
}

const empty = model(['cannon', null, 'cryo', null, null]);
assert.equal(recommendSlot(empty, 'fan'), 1, 'empty slot that creates two links wins');
assert.deepEqual(previewInstall(empty, 1, 'fan'), ['cannon', 'fan', 'cryo', null, null]);
assert.deepEqual(empty.slots.map(car => car?.type ?? null), ['cannon', null, 'cryo', null, null], 'preview is pure');
const shifted = model(['cannon', 'fan', null, 'cryo', null]);
assert.deepEqual(previewInstall(shifted, 1, 'tesla'), ['cannon', 'tesla', 'fan', 'cryo', null], 'right gap mirrors Combat.install');
const leftShifted = model([null, 'fan', 'cannon', 'cryo', 'rail']);
assert.deepEqual(previewInstall(leftShifted, 2, 'tesla'), ['fan', 'cannon', 'tesla', 'cryo', 'rail'], 'left gap is used when no right gap exists');
assert.equal(recommendSlot(model(['cannon', 'fan', 'flame', 'cryo', 'rail']), 'tesla'), -1, 'full trains are never silently replaced');

const unknown = new Set();
assert.deepEqual(linkChanges(['cannon', 'fan', 'cannon'], ['cannon', 'fan', null], unknown), {
  added: [], removed: ['未知联动：用气流强化火炮。'],
});
assert.deepEqual(linkChanges(['cannon', 'fan', null], [null, 'cannon', 'fan'], new Set(['cannon-fan'])), {
  added: [], removed: [],
}, 'moving an existing recipe does not read as a loss');
assert.deepEqual(linkChanges(['cannon', 'fan', 'cannon'], ['cannon', 'fan', null], new Set(['cannon-fan'])), {
  added: [], removed: ['风压贯穿炮'],
}, 'duplicate recipes retain their multiplicity');

const carCopy = offerSummary(empty, { kind:'car', id:'fan' }, unknown);
assert.equal(carCopy.length, 3); assert.equal(carCopy[0], '可支援火炮'); assert.match(carCopy[1], /2号空槽/); assert.ok(!carCopy.join('').includes('风压贯穿炮')); assert.ok(!carCopy.includes('风扇车'));
const rapid = model(['cannon', null, null, null, null]); rapid.slots[0].mods.rapid = 1;
assert.ok(offerSummary(model(['cannon']), { kind:'mod', id:'rapid' }, unknown)[0].includes('0.66→0.53秒'));
assert.ok(offerSummary(rapid, { kind:'mod', id:'rapid' }, unknown).some(line => line.includes('0.53→0.42秒')));
const mixedRapid = model(['cannon', 'cannon', null, null, null]); mixedRapid.slots[0].mods.rapid = 0; mixedRapid.slots[1].mods.rapid = 2;
assert.ok(offerSummary(mixedRapid, { kind:'mod', id:'rapid' }, unknown).some(line => line.includes('0.66/0.42→0.53/0.42秒')), 'capped targets remain unchanged');
const lanes = model(['rail', null, null, null, null]); lanes.slots[0].mods.lanes = 1;
assert.ok(offerSummary(lanes, { kind:'mod', id:'lanes' }, unknown).some(line => line.includes('光束2→3束；单发降低')));
const links = model(['cannon', 'fan', null, null, null]); links.linkLevel = 1;
assert.ok(offerSummary(links, { kind:'mod', id:'resonance' }, new Set(['cannon-fan'])).some(line => line.includes('1.25x → 1.5x')));
const repair = model(['cannon']); repair.hp = 95;
const chain = model(['fan', 'cannon', 'cryo']); chain.linkLevel=1;
assert.ok(offerSummary(chain, {kind:'mod',id:'caliber'}, unknown).some(line=>line.includes('1.55→1.86')), 'numeric preview includes driver chain, link upgrades and the actual adjacency milestone bonus');
assert.deepEqual(offerSummary(repair, { kind:'repair', id:'repair', amount:30 }, unknown), ['装甲95→100', '实际恢复5点']);

const suggested = model(['cannon', null, 'tesla']);
suggested.offers = [{kind:'car',id:'fan'}, {kind:'mod',id:'rapid'}, {kind:'repair',id:'repair',amount:30}];
const untouched = JSON.stringify(suggested);
assert.deepEqual(recommendOffer(suggested), { index:0, reason:'空槽可新增 2 条联动', score:40 });
assert.equal(installOutcome(suggested, 1, 'fan'), '联动 0 → 2 条  ·  进攻 2 → 2 节');
const crossfeedPreview=model(['cryo','rail']);
assert.match(installOutcome(crossfeedPreview,2,'prism'),/双侧供弹：联动弹共享冻结/);
assert.equal(crossfeedPreview.getCarSynergySummary(1),'','The preview must not apply its future payload to the current train');
assert.equal(JSON.stringify(suggested), untouched, 'suggestions and outcome previews never choose or alter an offer');
suggested.hp=25;
assert.equal(recommendOffer(suggested).index, 2, 'a useful repair takes priority when armor is critically low');
suggested.offers=[{kind:'mod',id:'surge'}];suggested.slots[2].mods.surge=2;
assert.equal(recommendOffer(suggested), null, 'do not recommend a capped upgrade');
suggested.offers=[{kind:'mod',id:'burst'}];
assert.equal(recommendOffer(suggested).index, 0, 'an effective upgrade remains a voluntary suggestion');
assert.match(nextRunAdvice(model(['cannon'])), /辅助.*进攻车/);
assert.match(nextRunAdvice(model(['cannon','fan'])), /补一节进攻车/);
const replacement = model(['cannon','fan','tesla','cryo','rail']);
const projected=previewInstall(replacement, 1, 'cannon');
assert.match(installOutcome(replacement, 1, 'cannon'), /进攻 3 → 4 节/);
assert.equal(projected.length,5,'full replacement preserves slot count');
const growing=model(['cannon','flame','tesla']);
growing.slots[1].level=1;growing.slots[2].level=1;
growing.phase='supply';growing.offers=[{kind:'mod',id:'caliber'}];
const growingBefore=JSON.stringify(growing);
const actualBefore=growing.getCarAttackStats(0).damage;
const growCopy=offerSummary(growing,growing.offers[0],unknown)[0];
assert.equal(JSON.stringify(growing),growingBefore,'tier-crossing mod preview is read-only');
growing.chooseOffer(0);
const display=value=>Number.isInteger(value)?String(value):value.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
assert.equal(growCopy,`单次伤害${display(actualBefore)}→${display(growing.getCarAttackStats(0).damage)}`,'numeric preview matches actual upgrade including newly earned branch bonus');
console.log('Choice preview checks passed: placement, multiset links, recipe privacy, and Combat-derived numeric effects.');
