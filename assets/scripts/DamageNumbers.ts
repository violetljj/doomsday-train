export interface DamageNumber {
  key: string; x: number; y: number; amount: number; color: string;
  age: number; life: number; incoming: boolean; shield: boolean;
  drift: number;
}

export class DamageNumbers {
  items: DamageNumber[] = [];
  add(key: string, x: number, y: number, amount: number, color: string, incoming = false, shield = false) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const existing = this.items.find(item => item.key === key && item.age < .12);
    if (existing) { existing.amount += amount; return; }
    if (this.items.length >= 36) this.items.shift();
    x=Math.max(-280,Math.min(280,x+(x<0?-26:26)));
    y=Math.min(110,Math.max(-370,y+28+(shield?30:0)));
    const originX=x,originY=y;
    for(let attempt=0;attempt<12&&this.items.some(n=>Math.abs(n.x-x)<66&&Math.abs(n.y-y)<32);attempt++){
      x=Math.max(-280,Math.min(280,originX+(attempt%3-1)*70));
      y=Math.max(-385,originY-Math.floor(attempt/3)*34);
    }
    this.items.push({ key, x, y, amount, color, age: 0, life: .86, incoming, shield,drift:x<0?-9:9 });
  }
  advance(dt: number) {
    for (const item of this.items) { item.age += dt; item.life -= dt; }
    this.items = this.items.filter(item => item.life > 0);
  }
  clear() { this.items = []; }
}
