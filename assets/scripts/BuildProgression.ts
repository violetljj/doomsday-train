import { CARS, getRecipe } from './Catalog.ts';
import type { CarType, ModId } from './Catalog.ts';

/** The run-level archetypes already used by Combat's HUD. */
export type BuildIdentity = '链式共鸣' | '火力编队' | '全域支援' | '邻接协同' | '初始编组';

export const BUILD_IDENTITIES: readonly BuildIdentity[] = ['链式共鸣', '火力编队', '全域支援', '邻接协同', '初始编组'];

export interface BuildCarSnapshot {
  type: CarType;
  level?: number;
  mods?: Partial<Record<ModId, number>>;
}

/** Two different supports can share their payload through a central projectile weapon. */
export function deriveCrossfeed(slots: readonly (BuildCarSnapshot | null)[], index: number): ('cryo' | 'acid')[] {
  const weapon = slots[index];
  if (!weapon || (weapon.type !== 'cannon' && weapon.type !== 'rail')) return [];
  const supports = [slots[index - 1], slots[index + 1]];
  if (!supports[0] || !supports[1] || supports[0].type === supports[1].type ||
      supports.some(car => !getRecipe(weapon.type, car!.type))) return [];
  return supports.map(car => car!.type).filter((type): type is 'cryo' | 'acid' => type === 'cryo' || type === 'acid');
}

export function crossfeedSummary(slots: readonly (BuildCarSnapshot | null)[], index: number): string {
  const payloads = deriveCrossfeed(slots, index);
  return payloads.length ? `双侧供弹：联动弹共享${payloads.map(type => type === 'cryo' ? '冻结' : '腐蚀').join('与')}` : '';
}

/** A serialisable view of a run. The evaluator never mutates the supplied snapshot. */
export interface BuildProgressionSnapshot {
  slots: readonly (BuildCarSnapshot | null)[];
  links?: number;
  uniqueRecipes?: number;
  linkActivations?: number;
  bossKills?: number;
  kills?: number;
  supplyCount?: number;
  time?: number;
  identity?: BuildIdentity;
}

export type BuildPassiveEffect =
  | 'linkDamageMultiplier'
  | 'weaponDamageMultiplier'
  | 'supportPowerMultiplier'
  | 'scrapMultiplier';

export interface BuildMetrics {
  offenseCount: number;
  supportCount: number;
  linkCount: number;
  uniqueRecipes: number;
  linkActivations: number;
  bossKills: number;
  kills: number;
  supplyCount: number;
  time: number;
  totalLevel: number;
  offenseLevel: number;
}

export interface BuildMilestone {
  id: string;
  title: string;
  description: string;
  threshold: string;
  progress: number;
  completed: boolean;
  passiveId: string;
  unlockId: string;
}

export interface BuildPassive {
  id: string;
  name: string;
  description: string;
  effects: Partial<Record<BuildPassiveEffect, number>>;
  sourceMilestone: string;
  active: boolean;
}

export interface BuildUnlock {
  id: string;
  name: string;
  description: string;
  sourceMilestone: string;
  available: boolean;
}

export interface BuildProgressionState {
  identity: BuildIdentity;
  buildIdentity: BuildIdentity;
  branchId: string;
  branchName: string;
  branchDescription: string;
  score: number;
  metrics: BuildMetrics;
  milestones: BuildMilestone[];
  passives: BuildPassive[];
  unlocks: BuildUnlock[];
  nextMilestone: BuildMilestone | null;
}

interface RuleContext {
  metrics: BuildMetrics;
  identity: BuildIdentity;
}

interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  threshold: string;
  passive: BuildPassive;
  unlock: BuildUnlock;
  progress: (context: RuleContext) => number;
}

interface BranchDefinition {
  id: string;
  name: string;
  description: string;
  score: (metrics: BuildMetrics) => number;
  milestones: readonly MilestoneDefinition[];
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const positive = (value: number | undefined) => Math.max(0, Number.isFinite(value) ? value! : 0);
const minProgress = (...values: number[]) => Math.min(...values.map(clamp01));
const maxProgress = (...values: number[]) => Math.max(...values.map(clamp01));

function milestone(
  id: string,
  title: string,
  description: string,
  threshold: string,
  passive: Omit<BuildPassive, 'sourceMilestone' | 'active'>,
  unlock: Omit<BuildUnlock, 'sourceMilestone' | 'available'>,
  progress: (context: RuleContext) => number,
): MilestoneDefinition {
  return {
    id, title, description, threshold,
    passive: { ...passive, sourceMilestone: id, active: false },
    unlock: { ...unlock, sourceMilestone: id, available: false },
    progress,
  };
}

const BRANCHES: Record<BuildIdentity, BranchDefinition> = {
  '链式共鸣': {
    id: 'chain-resonance', name: '链式共鸣', description: '让相邻联动持续叠加，追求一列车上的连锁反应。',
    score: m => 40 * m.linkCount / 4 + 30 * m.uniqueRecipes / 4 + 30 * m.linkActivations / 24,
    milestones: [
      milestone('chain-formed', '初成回路', '同时维持两条相邻联动。', '联动 ≥ 2',
        { id: 'resonant-routing', name: '共振传导', description: '相邻联动伤害倍率 +5%。', effects: { linkDamageMultiplier: .05 } },
        { id: 'chain-preview', name: '回路增幅', description: '当前联动伤害获得首阶5%增幅。' },
        ({ metrics }) => metrics.linkCount / 2),
      milestone('chain-network', '满列回路', '五节车厢的四条边全部接入联动。', '联动 = 4',
        { id: 'cascade-routing', name: '级联路由', description: '相邻联动伤害倍率再 +10%。', effects: { linkDamageMultiplier: .10 } },
        { id: 'chain-cascade', name: '级联联动', description: '完整回路的联动伤害累计增加15%。' },
        ({ metrics }) => metrics.linkCount / 4),
      milestone('chain-veteran', '回路老兵', '让完整回路在战斗中稳定运转，开启周期过载。', '≥ 3 种配方 · 发动 ≥ 24 次 · 战斗 ≥ 30 秒',
        { id: 'overdrive-resonance', name: '共振过载', description: '相邻联动伤害倍率再 +15%。', effects: { linkDamageMultiplier: .15 } },
        { id: 'chain-archive', name: '共振过载', description: '三阶编队每充能18秒，联动增伤45%、发动加快35%，持续4秒。' },
        ({ metrics }) => minProgress(metrics.uniqueRecipes / 3, metrics.linkActivations / 24, metrics.linkCount / 4, metrics.time / 30)),
    ],
  },
  '火力编队': {
    id: 'fire-formation', name: '火力编队', description: '集中进攻车厢，把升级和击杀转化为正面火力。',
    score: m => 50 * m.offenseCount / 5 + 25 * m.offenseLevel / 8 + 25 * Math.max(m.bossKills / 2, m.kills / 200),
    milestones: [
      milestone('fire-formation', '三车齐射', '编入三节进攻车厢。', '进攻车 ≥ 3',
        { id: 'focused-fire', name: '集中火力', description: '进攻车伤害倍率 +5%。', effects: { weaponDamageMultiplier: .05 } },
        { id: 'fire-arsenal', name: '火力军械', description: '所有进攻车的独立攻击伤害增加5%。' },
        ({ metrics }) => metrics.offenseCount / 3),
      milestone('fire-veteran', '重装编队', '让进攻车厢累计成长三次。', '进攻车 ≥ 3 且进攻车总等级 ≥ 3',
        { id: 'weapon-drill', name: '齐射训练', description: '进攻车伤害倍率再 +10%。', effects: { weaponDamageMultiplier: .10 } },
        { id: 'fire-specialization', name: '火力专精', description: '已升级进攻编队再获得10%武器增伤。' },
        ({ metrics }) => minProgress(metrics.offenseCount / 3, metrics.offenseLevel / 3)),
      milestone('fire-breakthrough', '突破首领线', '以火力编队持续作战并完成一轮高压战斗。', '首领击破 ≥ 1 或击杀 ≥ 100',
        { id: 'breakthrough-volley', name: '突破齐射', description: '进攻车伤害倍率再 +15%。', effects: { weaponDamageMultiplier: .15 } },
        { id: 'fire-overdrive', name: '火力超载', description: '三阶编队每充能18秒，武器增伤35%、射速加快25%，持续4秒。' },
        ({ metrics }) => minProgress(metrics.offenseCount / 3, maxProgress(metrics.bossKills, metrics.kills / 100))),
    ],
  },
  '全域支援': {
    id: 'field-support', name: '全域支援', description: '用辅助车厢覆盖全列，让维修、护盾和控制形成纵深。',
    score: m => 50 * m.supportCount / 5 + 25 * m.linkCount / 4 + 25 * m.time / 90,
    milestones: [
      milestone('support-network', '支援成网', '编入三节非进攻车厢。', '辅助车 ≥ 3',
        { id: 'support-drill', name: '支援演练', description: '修复、充盾、控制时长、推力与支援联动伤害 +5%。', effects: { supportPowerMultiplier: .05 } },
        { id: 'support-loadout', name: '支援编制', description: '修复、充盾、控制和支援联动获得5%增幅。' },
        ({ metrics }) => metrics.supportCount / 3),
      milestone('support-links', '交叉支援', '让支援网络接入至少两条联动。', '辅助车 ≥ 3 且联动 ≥ 2',
        { id: 'cross-support', name: '交叉支援', description: '辅助效果倍率再 +10%。', effects: { supportPowerMultiplier: .10 } },
        { id: 'support-routing', name: '支援路由', description: '双联动支援网络再获得10%支援增幅。' },
        ({ metrics }) => minProgress(metrics.supportCount / 3, metrics.linkCount / 2)),
      milestone('support-endurance', '长线护航', '让支援编队撑过一段完整的长期战斗。', '辅助车 ≥ 3 且战斗 ≥ 60 秒',
        { id: 'field-sustain', name: '持续护航', description: '辅助效果倍率再 +15%。', effects: { supportPowerMultiplier: .15 } },
        { id: 'support-endurance', name: '护航脉冲', description: '三阶编队每充能18秒，支援增强50%并每秒修复1、充盾2，持续4秒。' },
        ({ metrics }) => minProgress(metrics.supportCount / 3, metrics.time / 60)),
    ],
  },
  '邻接协同': {
    id: 'adjacent-synergy', name: '邻接协同', description: '先建立可靠的相邻关系，再决定列车的专门方向。',
    score: m => 65 * m.linkCount / 4 + 20 * m.uniqueRecipes / 4 + 15 * m.supplyCount / 4,
    milestones: [
      milestone('adjacent-pair', '首组协同', '建立两条相邻联动。', '联动 ≥ 2',
        { id: 'steady-adjacency', name: '稳态邻接', description: '相邻联动伤害倍率 +5%。', effects: { linkDamageMultiplier: .05 } },
        { id: 'adjacency-preview', name: '邻接规划', description: '两条相邻联动获得5%伤害增幅。' },
        ({ metrics }) => metrics.linkCount / 2),
      milestone('adjacent-chain', '三边协同', '让三条边同时产生有效联动。', '联动 ≥ 3',
        { id: 'coordinated-edges', name: '边缘协同', description: '相邻联动伤害倍率再 +10%。', effects: { linkDamageMultiplier: .10 } },
        { id: 'adjacency-branch', name: '协同分支', description: '三条相邻联动再获得10%伤害增幅。' },
        ({ metrics }) => metrics.linkCount / 3),
      milestone('adjacent-veteran', '协同远征', '至少经历三次补给后仍保持邻接结构。', '联动 ≥ 2 且补给 ≥ 3',
        { id: 'expedition-rhythm', name: '远征节奏', description: '相邻联动伤害倍率再 +15%。', effects: { linkDamageMultiplier: .15 } },
        { id: 'adjacency-expedition', name: '协同远征', description: '历经三次补给的联动再获得15%伤害增幅。' },
        ({ metrics }) => minProgress(metrics.linkCount / 2, metrics.supplyCount / 3)),
    ],
  },
  '初始编组': {
    id: 'starting-formation', name: '初始编组', description: '尚未偏向单一路线的基础编组，所有成长方向都保持开放。',
    score: m => Math.min(100, 20 + 20 * m.supplyCount + 10 * m.kills / 10 + 10 * m.time / 20),
    milestones: [
      milestone('starting-departure', '离站', '完成第一次补给选择。', '补给 ≥ 1',
        { id: 'prepared-departure', name: '整备出发', description: '废料获取倍率 +5%。', effects: { scrapMultiplier: .05 } },
        { id: 'starting-choice', name: '初始分支', description: '保持初始编组时，击杀废料增加5%。' },
        ({ metrics }) => metrics.supplyCount),
      milestone('starting-survivor', '初次远征', '在战场上保持二十秒。', '战斗 ≥ 20 秒',
        { id: 'survivor-routine', name: '生存惯性', description: '废料获取倍率再 +10%。', effects: { scrapMultiplier: .10 } },
        { id: 'starting-route', name: '远征路线', description: '保持初始编组时，废料获取再增加10%。' },
        ({ metrics }) => metrics.time / 20),
      milestone('starting-record', '留下记录', '完成至少二十五次击杀。', '击杀 ≥ 25',
        { id: 'recorded-run', name: '战斗记录', description: '废料获取倍率再 +15%。', effects: { scrapMultiplier: .15 } },
        { id: 'starting-record', name: '远征记录', description: '保持初始编组时，废料获取再增加15%。' },
        ({ metrics }) => metrics.kills / 25),
    ],
  },
};

function countLinks(slots: readonly (BuildCarSnapshot | null)[]): number {
  let count = 0;
  for (let index = 0; index < slots.length - 1; index++) {
    const left = slots[index], right = slots[index + 1];
    if (left && right && getRecipe(left.type, right.type)) count++;
  }
  return count;
}

function buildMetrics(snapshot: BuildProgressionSnapshot): BuildMetrics {
  const slots = snapshot.slots || [];
  const offenseCount = slots.filter(car => !!car && CARS[car.type].role === 'offense').length;
  const supportCount = slots.filter(car => !!car && CARS[car.type].role !== 'offense').length;
  return {
    offenseCount,
    supportCount,
    linkCount: Math.max(0, snapshot.links ?? countLinks(slots)),
    uniqueRecipes: positive(snapshot.uniqueRecipes),
    linkActivations: positive(snapshot.linkActivations),
    bossKills: positive(snapshot.bossKills),
    kills: positive(snapshot.kills),
    supplyCount: positive(snapshot.supplyCount),
    time: positive(snapshot.time),
    totalLevel: slots.reduce((sum, car) => sum + positive(car?.level), 0),
    offenseLevel: slots.reduce((sum, car) => sum + (car && CARS[car.type].role === 'offense' ? positive(car.level) : 0), 0),
  };
}

/** Derive the same identity rule as Combat without requiring a Combat instance. */
export function deriveBuildIdentity(
  slots: readonly (BuildCarSnapshot | null)[],
  links = countLinks(slots),
): BuildIdentity {
  const offensive = slots.filter(car => !!car && CARS[car.type].role === 'offense').length;
  const support = slots.filter(car => !!car && CARS[car.type].role !== 'offense').length;
  return links >= 4 ? '链式共鸣' : offensive >= 3 ? '火力编队' : support >= 3 ? '全域支援' : links >= 2 ? '邻接协同' : '初始编组';
}

/** Pure branch evaluation, shared by live combat bonuses and build previews. */
export function evaluateBuildProgression(snapshot: BuildProgressionSnapshot): BuildProgressionState {
  const metrics = buildMetrics(snapshot);
  const identity = snapshot.identity || deriveBuildIdentity(snapshot.slots, metrics.linkCount);
  const branch = BRANCHES[identity];
  const context = { metrics, identity };
  const milestones = branch.milestones.map(definition => {
    const progress = clamp01(definition.progress(context));
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      threshold: definition.threshold,
      progress,
      completed: progress >= 1 - 1e-9,
      passiveId: definition.passive.id,
      unlockId: definition.unlock.id,
    };
  });
  const passives = branch.milestones.map((definition, index) => ({
    ...definition.passive,
    active: milestones[index].completed,
  }));
  const unlocks = branch.milestones.map((definition, index) => ({
    ...definition.unlock,
    available: milestones[index].completed,
  }));
  return {
    identity,
    buildIdentity: identity,
    branchId: branch.id,
    branchName: branch.name,
    branchDescription: branch.description,
    score: clamp01(branch.score(metrics) / 100) * 100,
    metrics,
    milestones,
    passives,
    unlocks,
    nextMilestone: milestones.find(milestone => !milestone.completed) || null,
  };
}
