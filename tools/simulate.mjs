import { Combat } from '../assets/scripts/Combat.ts';
import { CARS } from '../assets/scripts/Catalog.ts';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export function simulate(seed, seconds = 180, policy = 'balanced') {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) throw Error('seed must be 1..4294967295');
  if (!Number.isFinite(seconds) || seconds <= 0 || !['balanced', 'random'].includes(policy)) throw Error('Invalid simulation options');
  const m = new Combat(); m.start(seed);
  let rng = (seed ^ 0x9e3779b9) >>> 0;
  const random = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
  const requireAction = ok => { if (!ok) throw Error(`Rejected action: seed=${seed}, phase=${m.phase}`); };
  const choices = [];
  const frames = Math.ceil(seconds * 30);
  for (let frame = 0; frame < frames && m.phase !== 'lose' && m.phase !== 'win'; frame++) {
    if (m.phase === 'supply') {
      const tail = m.slots.filter(Boolean).at(-1);
      const score = o => o.kind === 'repair' ? (m.hp <= 50 ? 100 : 0) : o.kind === 'mod' ? 30 :
        m.slots.includes(null) ? 60 + (tail && (CARS[tail.type].role === 'offense') !== (CARS[o.id].role === 'offense') ? 20 : 0) :
        m.slots.some(c => c?.type === o.id) ? 40 : 10;
      const pick = policy === 'random' ? Math.floor(random() * m.offers.length) :
        m.offers.map((o, i) => ({ i, score: score(o) })).sort((a, b) => b.score - a.score)[0].i;
      choices.push({ time: m.time, ...m.offers[pick] });
      requireAction(m.chooseOffer(pick));
    }
    if (m.phase === 'workshop') {
      if (m.pendingCar) {
        const empty = m.slots.indexOf(null), duplicate = m.slots.findIndex(c => c?.type === m.pendingCar);
        if (empty >= 0) requireAction(m.install(empty));
        else if (duplicate >= 0) requireAction(m.mergePending(duplicate));
        else if (policy === 'random') requireAction(m.install(Math.floor(random() * m.slots.length)));
        else requireAction(m.discardOffer());
      }
      requireAction(m.resumeWorkshop());
    }
    if (m.phase !== 'combat') throw Error(`Stalled run ${seed}: ${m.phase}`);
    m.advance(1 / 30); m.effects.length = 0;
    if (![m.hp, m.time, m.kills, m.scrap].every(Number.isFinite)) throw Error(`Non-finite state: ${seed}`);
  }
  return { seed, policy, outcome: m.phase === 'lose' ? 'lose' : m.phase === 'win' ? 'win' : 'horizon',
    reason: m.endReason || 'time_limit', seconds: +m.time.toFixed(6), wave: m.wave, hp: m.hp,
    kills: m.kills, scrap: m.scrap, supplies: m.supplyCount,
    bossesKilled: m.events.filter(e => e.type === 'boss_killed').length,
    recipes: [...m.seenRecipes], slots: m.slots.map(c => c && ({ type: c.type, level: c.level, mods: c.mods })), choices };
}

export function summarize(rows, seconds) {
  const counts = key => rows.reduce((out, r) => { out[r[key]] = (out[r[key]] || 0) + 1; return out; }, {});
  const metrics = {};
  for (const key of ['seconds', 'wave', 'hp', 'kills', 'scrap', 'supplies', 'bossesKilled']) {
    const v = rows.map(r => r[key]).sort((a, b) => a - b);
    metrics[key] = { mean: v.reduce((a, b) => a + b, 0) / v.length, p10: v[Math.floor((v.length - 1) * .1)], median: v[Math.floor((v.length - 1) * .5)], p90: v[Math.floor((v.length - 1) * .9)] };
  }
  return { runs: rows.length, outcomes: counts('outcome'), reasons: counts('reason'),
    horizonSurvivalRate: rows.filter(r => r.outcome === 'horizon').length / rows.length,
    survivalAtSeconds: Object.fromEntries([30, 60, 120, 180, 300].filter(t => t <= seconds).map(t => [t, rows.filter(r => r.seconds >= t && !(r.outcome === 'lose' && r.seconds === t)).length / rows.length])), metrics };
}

function main() {
  const args = process.argv.slice(2), options = { runs: 1000, seed: 1, seconds: 180, policy: 'balanced', out: `artifacts/simulation-${new Date().toISOString().replace(/[:.]/g, '-')}` };
  if (args.includes('--help')) { console.log('node --experimental-strip-types tools/simulate.mjs [--runs 1000] [--seed 1] [--seconds 180] [--policy balanced|random] [--out DIR]'); return; }
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    if (!args[i].startsWith('--') || !(key in options) || !args[i + 1]) throw Error(`Invalid option ${args[i]}`);
    options[key] = ['runs', 'seed', 'seconds'].includes(key) ? Number(args[i + 1]) : args[i + 1];
  }
  if (!Number.isInteger(options.runs) || options.runs < 1 || options.seed + options.runs - 1 > 0xffffffff) throw Error('Invalid run count / seed range');
  const start = performance.now(), rows = [];
  for (let i = 0; i < options.runs; i++) {
    rows.push(simulate(options.seed + i, options.seconds, options.policy));
    if ((i + 1) % 100 === 0) console.error(`${i + 1}/${options.runs} (${((performance.now() - start) / 1000).toFixed(1)}s)`);
  }
  const hashes = Object.fromEntries(['../assets/scripts/Combat.ts', '../assets/scripts/Catalog.ts', './simulate.mjs'].map(p => [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')]));
  const report = { options, node: process.version, hashes, elapsedSeconds: (performance.now() - start) / 1000, ...summarize(rows, options.seconds) };
  mkdirSync(options.out, { recursive: true });
  writeFileSync(join(options.out, 'summary.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(options.out, 'runs.json'), JSON.stringify(rows, null, 2));
  const keys = ['seed', 'policy', 'outcome', 'reason', 'seconds', 'wave', 'hp', 'kills', 'scrap', 'supplies', 'bossesKilled'];
  writeFileSync(join(options.out, 'runs.csv'), [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k])).join(','))].join('\n'));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Results: ${resolve(options.out)}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
