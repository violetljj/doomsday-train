import type { CarType } from './Catalog.ts';

export type EngineId = 'dawn' | 'storm' | 'haven';
export type ModuleId = 'none' | 'salvager' | 'plating' | 'capacitor';
export interface RunLoadout { engine: EngineId; module: ModuleId; }
export interface EngineDefinition {
  id: EngineId; name: string; description: string; starter: CarType;
  skillName: string; skillDescription: string; skillSummary: string; color: string;
}
export interface ModuleDefinition { id: ModuleId; name: string; description: string; }

export const ENGINE_IDS: readonly EngineId[] = ['dawn', 'storm', 'haven'];
export const MODULE_IDS: readonly ModuleId[] = ['none', 'salvager', 'plating', 'capacitor'];
export const ENGINES: Record<EngineId, EngineDefinition> = {
  dawn: { id:'dawn',name:'破晓号',description:'携火炮车出发，车头齐射补足正面火力。',starter:'cannon',skillName:'破晓齐射',skillDescription:'每20秒从车头发射3枚18伤害炮弹，朝最近敌人散射；无人时向前开火。',skillSummary:'每20秒 · 3枚炮弹 × 18伤害',color:'#FFC571' },
  storm: { id:'storm',name:'鸣雷号',description:'携电弧车出发，车头电网压制附近敌群。',starter:'tesla',skillName:'雷网放电',skillDescription:'每20秒电击车头620范围内最近的至多3个敌人，各造成20电伤。',skillSummary:'每20秒 · 至多3目标 × 20电伤',color:'#C2AAFF' },
  haven: { id:'haven',name:'守望号',description:'携喷火车出发，车头护航脉冲维持装甲与护盾。',starter:'flame',skillName:'守望护航',skillDescription:'每20秒恢复3装甲、补充12护盾，不超过当前上限。',skillSummary:'每20秒 · 修复3装甲 / 补充12护盾',color:'#85E1CA' },
};
export const MODULES: Record<ModuleId, ModuleDefinition> = {
  none: { id:'none',name:'不装模块',description:'保留标准装甲与护盾容量，不附加出发加成。' },
  salvager: { id:'salvager',name:'废料回收器',description:'击杀废料获取增加10%；零散收益累计为整数废料。' },
  plating: { id:'plating',name:'加固装甲',description:'装甲上限增加15，满装甲115出发。' },
  capacitor: { id:'capacitor',name:'储能护盾',description:'护盾上限增加8，并携带8护盾出发。' },
};

/** Copy only known IDs. Garage unlock admission is handled by its persistence layer. */
export function normalizeLoadout(value: unknown): RunLoadout {
  const data=value&&typeof value==='object'?value as Partial<RunLoadout>:{};
  return {engine:ENGINE_IDS.includes(data.engine as EngineId)?data.engine!:'dawn',module:MODULE_IDS.includes(data.module as ModuleId)?data.module!:'none'};
}
