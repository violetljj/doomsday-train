export type CarType = 'cannon' | 'flame' | 'fan' | 'tesla' | 'cryo';
export type CarRole = 'offense' | 'buff' | 'debuff';
export const ROLE_NAMES: Record<CarRole, string> = { offense: '进攻', buff: '增益', debuff: '减益' };
export const CAR_TYPES: CarType[] = ['cannon', 'flame', 'fan', 'tesla', 'cryo'];
export const CARS: Record<CarType, { name: string; description: string; color: string; role: CarRole }> = {
  cannon: { name: '火炮车', description: '发射实体炮弹；相邻风扇或冰霜车可强化火炮。', color: '#FFC571', role: 'offense' },
  flame: { name: '喷火车', description: '持续喷射扇形火焰；相邻风扇或冰霜车可强化喷火。', color: '#FF814E', role: 'offense' },
  fan: { name: '风扇车', description: '独立推开普通敌人，并为两侧相邻攻击车输送气流。', color: '#85E1CA', role: 'buff' },
  tesla: { name: '电弧车', description: '自动电击最近的三个目标；相邻风扇或冰霜车可强化电弧。', color: '#C2AAFF', role: 'offense' },
  cryo: { name: '冰霜车', description: '独立造成低额冰伤并减速普通敌人，为相邻攻击车附加冰霜效果。', color: '#83D8FF', role: 'debuff' },
};
export type ModId = 'caliber' | 'fuel' | 'pressure' | 'voltage' | 'coolant' | 'resonance';
export const MODS: Record<ModId, { name: string; description: string; target: CarType | 'links' }> = {
  caliber: { name: '扩膛弹药', description: '现有火炮车升1级：炮弹伤害和火炮联动增强。', target: 'cannon' },
  fuel: { name: '高热燃料', description: '现有喷火车升1级：喷火与火系联动伤害提升。', target: 'flame' },
  pressure: { name: '增压叶轮', description: '现有风扇车升1级：风压与气流联动增强。', target: 'fan' },
  voltage: { name: '高压线圈', description: '现有电弧车升1级：电伤和电系联动增强。', target: 'tesla' },
  coolant: { name: '低温冷剂', description: '现有冰霜车升1级：冰伤和冰系联动增强。', target: 'cryo' },
  resonance: { name: '同步传动', description: '所有相邻联动升1级：联动伤害提升。', target: 'links' },
};
export interface Recipe { id: string; name: string; description: string; hint: string; a: CarType; b: CarType; directional: false; executor: CarType; }
export const RECIPES: Recipe[] = [
  { id: 'cannon-fan', name: '风压贯穿炮', description: '风扇输送气流，火炮发射贯穿敌群的高速炮弹。', hint: '用气流强化火炮。', a: 'cannon', b: 'fan', directional: false, executor: 'cannon' },
  { id: 'cannon-cryo', name: '冻结碎裂炮', description: '冰霜附加冻结，火炮重击已冻结目标。', hint: '让炮弹带上低温。', a: 'cannon', b: 'cryo', directional: false, executor: 'cannon' },
  { id: 'flame-fan', name: '聚焦火流', description: '风扇聚拢火焰，由喷火车射出更远、更窄的高热火束。', hint: '用气流集中喷火。', a: 'flame', b: 'fan', directional: false, executor: 'flame' },
  { id: 'flame-cryo', name: '冷热爆破', description: '喷火车引爆目标区域；减速或冻结敌人承受双倍温差伤害。', hint: '用低温配合高热攻击。', a: 'flame', b: 'cryo', directional: false, executor: 'flame' },
  { id: 'fan-tesla', name: '聚怪电涡', description: '风扇强化电弧车，在目标处形成吸附并持续电击的气旋。', hint: '用气旋留住电流。', a: 'fan', b: 'tesla', directional: false, executor: 'tesla' },
  { id: 'tesla-cryo', name: '冻结传导', description: '冰霜强化电弧车，电流冻结首个目标并传给附近敌人。', hint: '让电流沿着冰霜传导。', a: 'tesla', b: 'cryo', directional: false, executor: 'tesla' },
];
export function getRecipe(a: CarType, b: CarType): Recipe | null {
  if (a === b || (CARS[a].role === 'offense') === (CARS[b].role === 'offense')) return null;
  return RECIPES.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a)) || null;
}
