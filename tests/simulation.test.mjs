import assert from 'node:assert/strict';
import { simulate, summarize } from '../tools/simulate.mjs';
for (const policy of ['balanced', 'random']) {
  const a = simulate(137, 45, policy);
  assert.deepEqual(a, simulate(137, 45, policy), 'Same seed and policy must replay identically');
  assert.ok(a.choices.length > 0, 'Exercise actual supply decisions');
  assert.ok(a.seconds <= 45.000001);
  assert.ok(['lose', 'horizon'].includes(a.outcome));
  if (a.outcome === 'horizon') assert.equal(a.seconds, 45);
}
assert.throws(() => simulate(0));
assert.throws(() => simulate(1, Infinity));
assert.throws(() => simulate(1, 10, 'unknown'));
const base = simulate(1, 1);
const report = summarize([{ ...base, outcome: 'lose', reason: 'armor', seconds: 20 }, { ...base, seconds: 60 }], 60);
assert.deepEqual(report.outcomes, { lose: 1, horizon: 1 });
assert.equal(report.horizonSurvivalRate, .5);
assert.equal(report.survivalAtSeconds[30], .5);
assert.equal(report.metrics.seconds.mean, 40);
console.log('Simulation replay, decision, horizon, validation and aggregation checks passed.');
