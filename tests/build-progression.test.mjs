import assert from 'node:assert/strict';
import { Combat, SLOT_Y } from '../assets/scripts/Combat.ts';
import {
  deriveBuildIdentity,
  evaluateBuildProgression,
} from '../assets/scripts/BuildProgression.ts';

const car = type => ({ type, level: 0 });
const snapshot = (types, extra = {}) => ({ slots: types.map(type => type ? car(type) : null), ...extra });

assert.equal(deriveBuildIdentity([car('cannon')]), '初始编组');
assert.equal(deriveBuildIdentity([car('cannon'), car('fan'), car('flame')]), '邻接协同');
assert.equal(deriveBuildIdentity([car('cannon'), car('flame'), car('rail')]), '火力编队');
assert.equal(deriveBuildIdentity([car('fan'), car('cryo'), car('repair'), car('shield')]), '全域支援');
assert.equal(deriveBuildIdentity([car('cannon'), car('fan'), car('flame'), car('cryo'), car('rail')]), '链式共鸣');

const chain = evaluateBuildProgression(snapshot(['cannon', 'fan', 'flame', 'cryo', 'rail'], {
  uniqueRecipes: 3, linkActivations: 24, supplyCount: 4, time: 70,
}));
assert.equal(chain.identity, '链式共鸣');
assert.equal(chain.milestones.every(milestone => milestone.completed), true);
assert.equal(chain.nextMilestone, null);
assert.deepEqual(chain.passives.filter(passive => passive.active).map(passive => passive.id), ['resonant-routing', 'cascade-routing', 'overdrive-resonance']);
assert.equal(chain.unlocks.every(unlock => unlock.available), true);
assert.equal(chain.metrics.linkCount, 4);

const fire = evaluateBuildProgression(snapshot(['cannon', 'flame', 'rail'], {
  time: 20, kills: 100, bossKills: 0,
}));
assert.equal(fire.identity, '火力编队');
assert.equal(fire.milestones[0].completed, true);
assert.equal(fire.milestones[1].completed, false);
assert.equal(fire.milestones[2].completed, true);
assert.equal(fire.passives[2].active, true);
assert.equal(fire.unlocks[1].available, false);
assert.equal(fire.nextMilestone.id, 'fire-veteran');
const falseFireVeteran=evaluateBuildProgression({slots:[car('cannon'),car('flame'),car('rail'),{type:'repair',level:9}]});
assert.equal(falseFireVeteran.metrics.totalLevel,9);
assert.equal(falseFireVeteran.metrics.offenseLevel,0);
assert.equal(falseFireVeteran.milestones[1].completed,false,'Support upgrades cannot fulfill offensive upgrades');
const remembered=evaluateBuildProgression(snapshot(['cannon','fan','flame','cryo','rail'],{uniqueRecipes:24,time:70}));
assert.equal(remembered.metrics.linkActivations,0,'Discovery history is not combat activation evidence');
assert.equal(remembered.milestones[2].completed,false);

const support = evaluateBuildProgression(snapshot(['fan', 'cryo', 'repair'], { links: 0, time: 60 }));
assert.equal(support.identity, '全域支援');
assert.equal(support.milestones[0].completed, true);
assert.equal(support.milestones[1].completed, false);
assert.equal(support.milestones[2].completed, true);
assert.ok(support.score > 0);

const initial = evaluateBuildProgression(snapshot(['cannon'], { supplyCount: 1, time: 20, kills: 25 }));
assert.equal(initial.identity, '初始编组');
assert.equal(initial.milestones.every(milestone => milestone.completed), true);
assert.ok(Math.abs(initial.passives.reduce((sum, passive) => sum + (passive.effects.scrapMultiplier || 0), 0) - .30) < 1e-9);

const model = new Combat();
model.start(137, true);
assert.equal(model.buildProgression.identity, '初始编组');
assert.equal(model.buildProgressionSnapshot.slots[0].type, 'cannon');
model.slots = SLOT_Y.map((_, index) => index < 5 ? car(['cannon', 'fan', 'flame', 'cryo', 'rail'][index]) : null);
assert.equal(model.buildIdentity, '链式共鸣');
assert.equal(model.buildProgression.identity, '链式共鸣');
assert.equal(model.buildProgression.metrics.linkCount, 4);
assert.notEqual(model.buildProgression, model.buildProgression, 'Getter returns a fresh read model for UI consumers');

const before = snapshot(['cannon', 'fan'], { kills: 10 });
const frozen = JSON.stringify(before);
evaluateBuildProgression(before);
assert.equal(JSON.stringify(before), frozen, 'Evaluation is pure and does not mutate the snapshot');

console.log('Build progression checks passed: identity derivation, branch milestones, passives, unlocks, Combat snapshot, and purity.');
