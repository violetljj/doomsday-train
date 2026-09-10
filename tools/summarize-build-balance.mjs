import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base='artifacts/optimization-20260910';
const read=path=>JSON.parse(readFileSync(`${base}/${path}`,'utf8'));
const prior=read('baseline-results/runs.json'),current=read('current-results/runs.json');
const priorSummary=read('baseline-results/summary.json'),currentSummary=read('current-results/summary.json');
const mean=values=>values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;
const group=rows=>({runs:rows.length,survival:rows.filter(r=>r.outcome==='horizon').length/rows.length,meanHp:mean(rows.map(r=>r.hp)),meanSeconds:mean(rows.map(r=>r.seconds))});
const paired=prior.map((old,i)=>{const now=current[i];if(old.seed!==now.seed||old.policy!==now.policy)throw Error('Pairing mismatch');return {seed:old.seed,before:old.outcome,after:now.outcome,secondsDelta:now.seconds-old.seconds,hpDelta:now.hp-old.hp,killDelta:now.kills-old.kills};});
const identities=[...new Set(current.map(r=>r.buildProgression.identity))];
const naturalBranches=identities.map(identity=>{
  const rows=current.filter(r=>r.buildProgression.identity===identity),activators=current.filter(r=>r.overdrives.some(e=>e.value===identity));
  return {identity,...group(rows),overdriveRuns:activators.length,totalOverdrives:activators.reduce((sum,r)=>sum+r.overdrives.filter(e=>e.value===identity).length,0),meanFirstOverdrive:mean(activators.map(r=>r.overdrives.find(e=>e.value===identity).time)),tierCounts:rows.reduce((counts,r)=>{const tier=r.buildProgression.milestones.filter(m=>m.completed).length;counts[tier]=(counts[tier]||0)+1;return counts;},{})};
});
const repairCohorts={};
for(const [name,rows] of [['baseline',prior],['current',current]])repairCohorts[name]={withRepair:group(rows.filter(r=>r.slots.some(c=>c?.type==='repair'))),withoutRepair:group(rows.filter(r=>!r.slots.some(c=>c?.type==='repair')))};
const report={scenario:'Paired seeds 1..100, balanced policy, 180 simulated seconds. Added observation fields only; policy decisions unchanged. Cohorts are observational, not causal.',baseline:priorSummary,current:currentSummary,
  pairedOutcomes:{survivedBoth:paired.filter(r=>r.before==='horizon'&&r.after==='horizon').length,lostBoth:paired.filter(r=>r.before==='lose'&&r.after==='lose').length,rescued:paired.filter(r=>r.before==='lose'&&r.after==='horizon').map(r=>r.seed),newLosses:paired.filter(r=>r.before==='horizon'&&r.after==='lose').map(r=>r.seed)},
  naturalBranches,naturalOverdriveRuns:current.filter(r=>r.overdrives.length).length,repairCohorts,paired,
  additionalHashes:{baselineBuildProgression:createHash('sha256').update(readFileSync(`${base}/baseline/assets/scripts/BuildProgression.ts`)).digest('hex'),summarizer:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex')},
  conclusions:['No new runaway survival signal at this horizon: 76/100 to 77/100; this sample is not a statistical equivalence claim.','Controlled presets naturally reach each overdrive gate; preset battles use five cars and three merges from departure and disable later supply choices.','The selected chain preset already survives 12/12 without new branch bonuses. The preset performance gap predates the new progression effects; it does not isolate universal archetype strength.','The support preset replacing repair with prism lasts longer in this test, so these diagnostics do not show repair dominance.','No numerical changes are justified from these bounded diagnostics alone. Retain current values and avoid claims about human retention, device performance, or comprehensive balance.']};
writeFileSync(`${base}/balance-comparison.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({pairedOutcomes:report.pairedOutcomes,naturalBranches,naturalOverdriveRuns:report.naturalOverdriveRuns,repairCohorts},null,2));
