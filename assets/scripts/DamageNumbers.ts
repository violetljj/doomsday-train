export type DamageNumberKind = 'normal' | 'heavy' | 'tick' | 'shield' | 'incoming';

/** Imagegen v7 source pixels are preserved; the drawn columns are not a uniform grid. */
export const DAMAGE_GLYPHS = '0123456789.-';
export const DAMAGE_ATLAS_PATH = 'art/afterglow-damage-digits-v7/spriteFrame';
const DAMAGE_COLUMN_EDGES = [18,157,262,398,530,662,794,930,1060,1193,1337,1431,1564];
const DAMAGE_ROW_TOPS = [64,236,412,596,770];
export function damageGlyphRect(row: number, column: number) {
  return { x: DAMAGE_COLUMN_EDGES[column], y: DAMAGE_ROW_TOPS[row],
    width: DAMAGE_COLUMN_EDGES[column + 1] - DAMAGE_COLUMN_EDGES[column], height: 160 };
}

export interface DamageNumber {
  key: string; x: number; y: number; amount: number; color: string;
  age: number; life: number; incoming: boolean; shield: boolean;
  drift: number; kind: DamageNumberKind; duration: number;
}

export function classifyDamageNumber(amount: number, source = '', incoming = false, shield = false): DamageNumberKind {
  if (shield) return 'shield';
  if (incoming) return 'incoming';
  if (source.startsWith('status:') || source==='car:flame') return 'tick';
  return amount >= 40 ? 'heavy' : 'normal';
}

/** Deterministic animation, independent of frame rate and the Cocos renderer. */
export function damageNumberPresentation(item: DamageNumber) {
  const t = Math.max(0, Math.min(1, item.age / item.duration));
  const heavy = item.kind === 'heavy', tick = item.kind === 'tick', incoming=item.kind==='incoming', shield=item.kind==='shield';
  const settle = Math.min(1, item.age / (tick ? .18 : heavy ? .12 : .16));
  const pop = Math.sin(settle * Math.PI) * (heavy ? .24 : tick ? .025 : shield ? .07 : incoming ? .12 : .14);
  const scale = (heavy ? 1.08 : tick ? .95 : 1) + pop;
  return {
    rise: tick ? 28*t : (incoming ? -26 : shield ? 34 : heavy ? 62 : 48) * (1 - Math.pow(1 - t, 2)),
    scale,
    alpha: t < .62 ? 1 : Math.max(0, (1 - t) / .38),
    tilt: tick||shield||incoming ? 0 : (item.drift < 0 ? -1 : 1) * (heavy ? 6 : 3) * (1 - settle),
    offsetX: incoming ? Math.sin(item.age*65)*5*(1-settle) : tick||shield ? 0 : item.drift*t,
    atlasRow: heavy ? 1 : tick ? 2 : shield ? 3 : incoming ? 4 : 0,
  };
}

export class DamageNumbers {
  items: DamageNumber[] = [];
  add(key: string, x: number, y: number, amount: number, color: string, incoming = false, shield = false, kind?: DamageNumberKind) {
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
    kind = shield ? 'shield' : incoming ? 'incoming' : kind ?? classifyDamageNumber(amount);
    // Separate channels; ticks batch for longer without restarting their animation.
    const sameChannel = (item: DamageNumber) => item.kind === kind ||
      ((item.kind === 'normal' || item.kind === 'heavy') && (kind === 'normal' || kind === 'heavy'));
    const existing = this.items.find(item => item.key === key && item.incoming === incoming && item.shield === shield &&
      sameChannel(item) && item.age < (kind === 'tick' ? .24 : .12));
    if (existing) {
      existing.amount += amount;
      if (existing.kind === 'normal' && existing.amount >= 40) existing.kind = 'heavy';
      return;
    }
    if (this.items.length >= 36) {
      const tickIndex = this.items.findIndex(item => item.kind === 'tick');
      this.items.splice(tickIndex >= 0 ? tickIndex : 0, 1);
    }
    x = Math.max(-280, Math.min(280, x + (x < 0 ? -26 : 26)));
    y = Math.min(110, Math.max(-370, y + 28 + (shield ? 30 : 0)));
    const originX = x, originY = y;
    for (let attempt = 0; attempt < 12 && this.items.some(n => Math.abs(n.x - x) < 66 && Math.abs(n.y - y) < 32); attempt++) {
      x = Math.max(-280, Math.min(280, originX + (attempt % 3 - 1) * 70));
      y = Math.max(-385, originY - Math.floor(attempt / 3) * 34);
    }
    const duration = kind === 'heavy' ? 1.02 : kind === 'tick' ? .72 : .86;
    this.items.push({key, x, y, amount, color, age: 0, life: duration, duration, incoming, shield, kind, drift: x < 0 ? -12 : 12});
  }
  advance(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const item of this.items) { item.age += dt; item.life = item.duration - item.age; }
    this.items = this.items.filter(item => item.life > 0);
  }
  clear() { this.items = []; }
}
