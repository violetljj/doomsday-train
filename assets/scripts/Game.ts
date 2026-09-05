import { _decorator, Component, Node, Graphics, Color, UITransform, Label, Vec3, EventTouch,
  resources, SpriteFrame, Sprite, view, ResolutionPolicy, game, Game as EngineGame, Layers, profiler, Material, gfx } from 'cc';
import { Combat } from './Combat';
const { ccclass } = _decorator;
const C = { ink: '#101E22', panel: '#192C30', edge: '#355052', gold: '#FFB54D', cream: '#F3E6CD', muted: '#91A7A4', teal: '#70D9C0', red: '#F4785F' };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type HitArea = { x: number; y: number; w: number; h: number; action: () => void };
type Defeated = { node: Node; x: number; y: number; vx: number; vy: number; life: number; angle: number; size: number };

@ccclass('Game')
export class Game extends Component {
  private model = new Combat();
  private bg!: Graphics; private world!: Graphics; private fx!: Graphics; private hud!: Graphics; private overlay!: Graphics;
  private details!: Graphics; private attacks!: Graphics;
  private trainLayer!: Node; private enemyLayer!: Node;
  private vortexLayer!: Node; private fireMaterial!: Material;
  private overlayNode!: Node; private worldNode!: Node; private labels: Record<string, Label> = {};
  private hitAreas: HitArea[] = []; private particles: Particle[] = []; private state = '';
  private visualTime = 0; private shake = 0; private seed = 137;
  private loco: Node | null = null; private zombieFrame: SpriteFrame | null = null;
  private carriageFrame: SpriteFrame | null = null;
  private fireFrame: SpriteFrame | null = null;
  private vortexSprites = new Map<number,Node>();
  private enemySprites = new Map<number, Node>();
  private defeated: Defeated[] = [];
  private chain = 0; private chainLife = 0; private emberClock = 0;
  private toastText = ''; private toastLife = 0;
  private audio: any = null; private sound = true; private lowMotion = false;
  private frameCount = 0; private frameSeconds = 0; private fps = 0;
  private debugSpeed = 1;

  onLoad() {
    profiler.hideStats();
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
    this.node.getComponent(UITransform)?.setContentSize(720,1280);
    this.bg = this.layer('Ground');
    this.worldNode = new Node('World'); this.worldNode.layer=Layers.Enum.UI_2D; this.node.addChild(this.worldNode); this.worldNode.addComponent(UITransform).setContentSize(720,1280);
    this.world = this.layer('World drawing', this.worldNode);
    this.trainLayer = this.group('Train art',this.worldNode);
    this.details = this.layer('Mechanical parts',this.worldNode);
    this.enemyLayer = this.group('Enemies',this.worldNode);
    this.attacks = this.layer('Fire and wind',this.worldNode);
    this.vortexLayer = this.group('Vortex emission',this.worldNode);
    this.fireMaterial=new Material();
    this.fx = this.layer('Effects'); this.hud = this.layer('HUD');
    this.labels.brand = this.label(this.node, '末日列车', -310, 570, 29, C.cream, 350, 'left');
    this.labels.tag = this.label(this.node, '荒原突围  /  01', -310, 535, 20, C.muted, 350, 'left');
    this.labels.time = this.label(this.node, '00:00', 224, 570, 26, C.cream, 115);
    this.labels.hp = this.label(this.node, '装甲  100', -310, 475, 23, C.cream, 240, 'left');
    this.labels.kills = this.label(this.node, '击破  0', 212, 475, 23, C.gold, 175);
    this.labels.stage = this.label(this.node, '', 0, 415, 22, C.teal, 650);
    this.labels.form = this.label(this.node, '', 0, -442, 25, C.cream, 620);
    this.labels.hint = this.label(this.node, '', 0, -479, 22, C.muted, 640);
    this.labels.footer = this.label(this.node, '声音 开', -270, -577, 21, C.muted, 162);
    this.labels.motion = this.label(this.node, '镜头 开', -90, -577, 21, C.muted, 162);
    this.labels.speed = this.label(this.node, '倍速 ×1', 90, -577, 21, C.gold, 162);
    this.labels.pause = this.label(this.node, '暂停 Ⅱ', 270, -577, 21, C.cream, 162);
    this.labels.toast = this.label(this.node, '', 0, 375, 24, C.gold, 680);
    this.labels.chain = this.label(this.node, '', 245, 305, 28, C.gold, 205);
    this.overlayNode = new Node('Panels'); this.overlayNode.layer=Layers.Enum.UI_2D; this.node.addChild(this.overlayNode);
    this.overlayNode.addComponent(UITransform).setContentSize(720,1280);
    this.overlay = this.overlayNode.addComponent(Graphics);
    this.node.on(Node.EventType.TOUCH_END, this.touch, this);
    game.on(EngineGame.EVENT_HIDE, this.hide, this);
    try { const saved = globalThis.localStorage?.getItem('doomsday-settings'); if(saved){const v=JSON.parse(saved);this.sound=v.sound!==false;this.lowMotion=!!v.lowMotion;} } catch {}
    resources.load('art/locomotive/spriteFrame', SpriteFrame, (err,frame) => {
      if (err || !this.isValid) return;
      this.loco = this.sprite('Locomotive', frame, 174, 261, this.trainLayer); this.loco.setPosition(0,235,0);
    });
    resources.load('art/zombie/spriteFrame', SpriteFrame, (err,frame) => { if (!err && this.isValid) this.zombieFrame = frame; });
    resources.load('art/carriage-deck/spriteFrame', SpriteFrame, (err,frame) => {
      if(err||!this.isValid)return;this.carriageFrame=frame;this.state='';
      for(const y of [40,-90])this.sprite('Armored carriage',frame,90,98,this.trainLayer).setPosition(0,y,0);
    });
    resources.load('art/fire-vortex/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err||!this.isValid)return;this.fireFrame=frame;this.state='';
    });
    // Read-only diagnostic snapshot for smoke checks, without exposing state mutation.
    (globalThis as any).__doomsday = { snapshot: () => ({ phase:this.model.phase, form:this.model.form,
      time:this.model.time, hp:this.model.hp, kills:this.model.kills, enemies:this.model.enemies.length,
      vortices:this.model.vortices.length, seed:this.model.initialSeed, fps:this.fps, speed:this.debugSpeed,
      turretAngle:this.model.turretAngle, renderTurretAngle:this.model.renderTurretAngle,
      art:{ locomotive:!!this.loco,zombie:!!this.zombieFrame,carriage:!!this.carriageFrame,fire:!!this.fireFrame },
      effects:{particles:this.particles.length,defeated:this.defeated.length,chain:this.chain}, events:this.model.events.slice() }) };
  }
  onDestroy() {
    game.off(EngineGame.EVENT_HIDE, this.hide, this);
    this.node.off(Node.EventType.TOUCH_END, this.touch, this);
    this.audio?.close?.(); delete (globalThis as any).__doomsday;
    this.fireMaterial?.destroy();
  }
  private hide() { this.model.pause(); }
  private group(name:string,parent:Node) {const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(720,1280);return n;}
  private layer(name: string, parent=this.node) { const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(720,1280);return n.addComponent(Graphics); }
  private label(parent: Node, text: string, x: number, y: number, size: number, color: string, width=600, align='center') {
    const n=new Node('Text');n.layer=Layers.Enum.UI_2D; parent.addChild(n); const t=n.addComponent(UITransform);t.setContentSize(width,size*2.7);
    if(align==='left')t.setAnchorPoint(0,.5);
    n.setPosition(x,y,0);const l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=size*1.35;l.color=new Color(color);
    l.horizontalAlign=align==='left'?Label.HorizontalAlign.LEFT:Label.HorizontalAlign.CENTER;
    l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;return l;
  }
  private sprite(name: string, frame: SpriteFrame, w: number, h: number, parent: Node) {
    const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);
    const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=frame;return n;
  }
  private emission(sprite:Sprite) {
    if(!this.fireMaterial.passes.length){
      const base=sprite.getSharedMaterial(0);
      if(!base)throw new Error('Fire sprite has no base material');
      // Copy the actual engine sprite effect rather than relying on its registry name.
      this.fireMaterial.copy(base,{states:{blendState:{targets:[{
        blend:true,blendSrc:gfx.BlendFactor.SRC_ALPHA,blendDst:gfx.BlendFactor.ONE,
        blendSrcAlpha:gfx.BlendFactor.ZERO,blendDstAlpha:gfx.BlendFactor.ONE,
      }]}}});
    }
    sprite.customMaterial=this.fireMaterial;
  }
  private rect(g:Graphics,x:number,y:number,w:number,h:number,color:string,r=0) {
    g.fillColor=new Color(color);if(r)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);g.fill();
  }
  private circle(g:Graphics,x:number,y:number,r:number,color:string) {g.fillColor=new Color(color);g.circle(x,y,r);g.fill();}
  private line(g:Graphics,points:number[],color:string,width=2) {
    g.strokeColor=new Color(color);g.lineWidth=width;g.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke();
  }
  private begin() {
    this.unlockAudio();this.model.start(this.seed++);this.particles=[];this.chain=0;this.chainLife=0;
    for(const d of this.defeated)d.node.destroy();this.defeated=[];
    for(const n of this.vortexSprites.values())n.destroy();this.vortexSprites.clear();
    this.toast('清出一条路');this.tone(180,.15);
  }
  private touch(event: EventTouch) {
    this.unlockAudio();
    const p=event.getUILocation(), local=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
    for(let i=this.hitAreas.length-1;i>=0;i--){const a=this.hitAreas[i];if(Math.abs(local.x-a.x)<=a.w/2&&Math.abs(local.y-a.y)<=a.h/2){a.action();this.tone(470,.045);return;}}
    if(local.y < -540) {
      if(local.x < -180) this.sound=!this.sound;
      else if(local.x<0) this.lowMotion=!this.lowMotion;
      else if(local.x<180) this.debugSpeed=this.debugSpeed===4?1:this.debugSpeed*2;
      else { if(this.model.phase==='paused')this.model.resume();else this.model.pause(); }
      try{globalThis.localStorage?.setItem('doomsday-settings',JSON.stringify({sound:this.sound,lowMotion:this.lowMotion}));}catch{}
    }
  }
  private unlockAudio() {
    try { const AC=(globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if(!this.audio&&AC)this.audio=new AC();this.audio?.resume?.(); }catch{}
  }
  private tone(freq:number, length:number, kind='sine') {
    if(!this.sound||!this.audio)return;
    try {const o=this.audio.createOscillator(),g=this.audio.createGain();o.type=kind;o.frequency.setValueAtTime(freq,this.audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.45),this.audio.currentTime+length);
      g.gain.setValueAtTime(.045,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+length);
      o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+length);}catch{}
  }
  private toast(text:string) {this.toastText=text;this.toastLife=2.2;}
  update(dt:number) {
    const before=this.model.phase,realDelta=Math.min(Math.max(dt,0),.1);
    const elapsed=this.model.advance(dt,this.debugSpeed);
    const delta=before==='combat'?(this.model.phase==='combat'?realDelta*this.debugSpeed:elapsed):
      ['menu','win','lose'].includes(before)?realDelta:0;
    if(before==='combat'||before==='menu')this.visualTime+=delta;
    this.frameCount++;this.frameSeconds+=dt;if(this.frameSeconds>=1){this.fps=Math.round(this.frameCount/this.frameSeconds);this.frameCount=0;this.frameSeconds=0;}
    const frozen=['paused','reward','arrange','upgrade'].includes(this.model.phase);
    if(!frozen){this.toastLife=Math.max(0,this.toastLife-delta);this.shake=Math.max(0,this.shake-delta*20);
      this.chainLife=Math.max(0,this.chainLife-delta);if(this.chainLife===0)this.chain=0;}
    if(!frozen)for(const p of this.particles){p.life-=delta;p.x+=p.vx*delta;p.y+=p.vy*delta;const drag=Math.pow(.96,delta*60);p.vx*=drag;p.vy*=drag;}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const d of this.defeated){
      if(!frozen){d.life-=delta;d.x+=d.vx*delta;d.y+=d.vy*delta;d.angle+=delta*220;}
      d.node.setPosition(d.x,d.y,0);d.node.angle=d.angle;
      const fade=Math.max(0,d.life/.42);d.node.setScale(.6+.4*fade,.6+.4*fade,1);
      d.node.getComponent(Sprite)!.color=new Color(154,124,83,Math.round(210*fade));
      if(d.life<=0)d.node.destroy();
    }
    this.defeated=this.defeated.filter(d=>d.life>0);
    let frameKills=0;
    for(const e of this.model.effects.splice(0)) {
      if(e.type==='wave'){
        this.toast(({5:'尸群聚集 · 准备接敌',21:'密集尸群 · 补给将至',45:'前方封锁 · 保持火力',50:'最后尸潮 · 全火力突围'} as Record<number,string>)[e.size]||'尸潮来袭');
        this.tone(210,.28,'triangle');continue;
      }
      const count=e.type==='upgrade'?40:e.type==='kill'?7:e.type==='hit'?2:9;
      const color=e.type==='kill'?C.gold:e.type==='damage'?C.red:e.type==='upgrade'?C.teal:C.gold;
      for(let i=0;i<count&&this.particles.length<200;i++){
        const a=(i/count)*Math.PI*2+this.visualTime, speed=e.type==='upgrade'?150:45+Math.random()*100;
        this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.4+Math.random()*.3,max:.7,size:e.type==='kill'?3:5,color});
      }
      if(e.type==='kill'){
        frameKills++;
        if(this.zombieFrame&&this.defeated.length<24){
          const size=e.enemyKind===2?67:52,n=this.sprite('Defeated',this.zombieFrame,size,size,this.enemyLayer);
          n.setPosition(e.x,e.y,0);n.angle=30;
          this.defeated.push({node:n,x:e.x,y:e.y,vx:(e.dx??Math.sign(e.x))*150,vy:(e.dy??.3)*150,life:.42,angle:30,size});
        }
      }
      if(e.type==='damage'){this.shake=6;this.tone(65,.15,'triangle');}
      if(e.type==='upgrade'){this.shake=8;this.tone(660,.35,'triangle');}
      if(e.type==='fire')this.tone(100,.09,'triangle');
    }
    if(frameKills){this.chain+=frameKills;this.chainLife=1.25;this.tone(130+Math.min(12,this.chain)*16,.065,'triangle');
      if(frameKills>=3)this.shake=Math.max(this.shake,Math.min(4,frameKills));}
    if(this.model.phase==='combat'){
      this.emberClock+=delta;
      if(this.emberClock>.045){this.emberClock=0;
        for(const v of this.model.vortices.slice(0,9))if(this.particles.length<200){
          const a=this.visualTime*12+v.id;
          this.particles.push({x:v.x+Math.cos(a)*v.radius*.65,y:v.y+Math.sin(a)*v.radius*.65,
            vx:-v.dx*.24+Math.cos(a)*35,vy:-v.dy*.24+Math.sin(a)*35,life:.32,max:.32,size:3,color:C.gold});
        }
      }
    }
    this.worldNode.setPosition(!this.lowMotion?Math.sin(this.visualTime*85)*this.shake:0,0,0);
    this.drawGround();this.drawWorld();this.drawEffects();this.drawHUD();
    if(this.state!==this.model.phase){this.state=this.model.phase;this.drawPanel();}
  }
  private drawGround() {
    const g=this.bg;g.clear();this.rect(g,-360,-640,720,1280,C.ink);
    this.rect(g,-350,-415,700,850,'#223334');
    // Roadside blocks move with the ground. Fixed layout keeps the combat RNG independent.
    for(let i=0;i<28;i++){
      const x=(i%2?1:-1)*(145+(i*67)%185),y=((i*109-this.visualTime*48)%920+920)%920-440;
      if(y>420)continue;
      const w=20+(i*17)%60,h=10+(i*13)%40;
      this.rect(g,x-w/2,y-h/2,w,h,i%3?'#293C3A':'#34443D',3);
      if(i%4===0)this.line(g,[x-w/2,y,x,y+h/2,x+w/2,y+h/2],'#465247',2);
    }
    this.rect(g,-83,-415,166,840,'#1B2A2C');
    for(let i=0;i<23;i++){const y=((i*42-this.visualTime*85)%890+890)%890-445;if(y<415)this.rect(g,-69,y,138,9,'#39423C',2);}
    this.rect(g,-49,-415,7,830,'#61706B');this.rect(g,42,-415,7,830,'#61706B');
    this.rect(g,-45,-415,2,830,'#9B9A7D');this.rect(g,43,-415,2,830,'#9B9A7D');
    this.line(g,[-344,-414,344,-414],C.edge,2);this.line(g,[-344,425,344,425],C.edge,2);
  }
  private car(g:Graphics,y:number) {
    this.rect(g,-51,y-55,108,114,'#102025',14);
    for(const x of [-54,44]){this.rect(g,x,y-42,10,29,'#080F14',3);this.rect(g,x,y+14,10,29,'#080F14',3);}
    this.rect(g,-47,y-49,94,103,'#526966',10);this.rect(g,-40,y-42,80,88,'#2F4649',8);
    this.line(g,[-38,y+43,37,y+43],'#95ABA0',3);
    for(const x of [-34,34])for(const yy of [-34,35])this.circle(g,x,y+yy,3,'#A4AD92');
    this.rect(g,-12,y-67,24,15,'#71817A',3);
  }
  private drawWorld() {
    const g=this.world,d=this.details,a=this.attacks;g.clear();d.clear();a.clear();const m=this.model;
    const ids=new Set(m.enemies.map(e=>e.id));
    for(const [id,n]of this.enemySprites)if(!ids.has(id)){n.destroy();this.enemySprites.delete(id);}
    for(const e of m.enemies){
      const size=e.kind===2?45:e.kind===1?30:35;
      this.circle(g,e.x+3,e.y-5,size*.42,'#142321');
      if(this.zombieFrame){
        let n=this.enemySprites.get(e.id);if(!n){n=this.sprite('Enemy',this.zombieFrame,size*1.5,size*1.5,this.enemyLayer);this.enemySprites.set(e.id,n);}
        const gait=Math.sin(this.visualTime*(e.kind===1?19:12)+e.id*2.4);
        n.setPosition(e.x,e.y+gait*1.6,0);n.angle=(Math.atan2(40-e.y,-e.x)+Math.PI/2)*180/Math.PI+gait*5;
        n.setScale(e.flash>0?1.1:1,e.flash>0?1.1:1,1);
        n.getComponent(Sprite)!.color=new Color(e.kind===2?'#D2AD78':e.kind===1?'#BAE899':'#FFFFFF');
        if(e.flash>0){a.strokeColor=new Color(255,204,111,Math.round(e.flash/.09*170));a.lineWidth=2;a.circle(e.x,e.y,size*.6);a.stroke();}
      }else{
        this.circle(g,e.x,e.y, size*.39,e.flash>0?C.cream:e.kind===2?'#9A9872':'#809D69');
        this.rect(g,e.x-size*.4,e.y-14,size*.8,14,e.kind===1?'#73624A':'#45544C',5);
        this.circle(g,e.x-5,e.y+4,2,'#EBB35B');this.circle(g,e.x+5,e.y+4,2,'#EBB35B');
      }
      if(e.hp<e.maxHp){this.rect(g,e.x-16,e.y+26,32,3,'#152325');this.rect(g,e.x-16,e.y+26,32*Math.max(0,e.hp/e.maxHp),3,C.red);}
    }
    this.car(g,40);this.car(g,-90);
    this.rect(g,-10,96,20,19,'#819489',3);this.rect(g,-10,-29,20,16,'#819489',3);
    if(!this.loco){
      this.rect(g,-41,190,82,89,'#5A7772',12);this.rect(g,-31,229,62,32,'#152E35',6);
      this.line(g,[-25,234,-25,254,25,254],C.teal,3);this.rect(g,-45,168,90,17,C.gold,4);
      for(let i=0;i<5;i++)this.line(g,[-38+i*18,168,-28+i*18,185],'#343D34',6);
    }
    // Sprites sit on their own railcars; moving weapon parts are drawn separately.
    const angle=m.renderTurretAngle;
    if(m.form==='twin'){
      this.drawTurret(d,-22,40,angle,.69);this.drawTurret(d,22,40,angle,.69);
    }else this.drawTurret(d,0,40,angle,m.form==='giant'?1.1:1);
    if(m.form!=='flame'){
      const giant=m.form==='giant',radius=giant?36:29;
      this.drawFan(d,0,-90,radius,this.visualTime*(giant?21:16));
      this.line(d,[-11,-43,-11,-17],C.teal,4);this.line(d,[11,-43,11,-17],C.teal,4);
      const flow=(this.visualTime*25)%26;this.circle(d,-11,-43+flow,3,C.cream);this.circle(d,11,-43+flow,3,C.cream);
      if(giant){
        this.rect(d,-49,15,10,50,'#334A47',3);this.rect(d,39,15,10,50,'#334A47',3);
        for(const y of [22,34,46,58]){this.rect(d,-47,y,6,5,C.gold,1);this.rect(d,41,y,6,5,C.gold,1);}
      }else if(m.form==='twin'){
        for(const x of [-46,46]){this.circle(d,x,-90,9,'#253F41');this.circle(d,x,-90,5,C.teal);}
      }
    }else{
      this.circle(d,0,-90,24,'#17292CCB');this.line(d,[-15,-90,15,-90],C.muted,3);this.line(d,[0,-105,0,-75],C.muted,3);
    }
    if(m.phase==='arrange'){
      d.lineWidth=4;d.strokeColor=new Color(C.teal);d.roundRect(-61,-153,122,126,14);d.stroke();
    }
    if(m.form==='flame'&&m.fireFlash>0&&m.phase!=='menu'){
      this.drawFlame(a,angle);
    }
    const vortexIds=new Set(m.vortices.map(v=>v.id));
    for(const [id,n]of this.vortexSprites)if(!vortexIds.has(id)){n.destroy();this.vortexSprites.delete(id);}
    for(const v of m.vortices){
      const fade=Math.min(1,v.life/.3),spin=this.visualTime*9*(v.id%2?1:-1)+v.id;
      if(this.fireFrame){
        let n=this.vortexSprites.get(v.id);
        if(!n){n=this.sprite('Fire vortex',this.fireFrame,v.radius*2.45,v.radius*2.45,this.vortexLayer);this.emission(n.getComponent(Sprite)!);this.vortexSprites.set(v.id,n);}
        n.setPosition(v.x,v.y,0);n.angle=spin*180/Math.PI;
        const grow=(.7+.3*Math.min(1,v.age/.12))*(.85+.15*fade);n.setScale(grow,grow,1);
        n.getComponent(Sprite)!.color=new Color(255,241,210,Math.round(185*fade));
      }else this.drawVortex(a,v.x,v.y,v.radius,spin,Math.atan2(v.dy,v.dx),fade);
    }
  }
  private drawTurret(g:Graphics,x:number,y:number,angle:number,scale:number) {
    const c=Math.cos(angle),s=Math.sin(angle);
    const point=(px:number,py:number)=>[x+(px*c-py*s)*scale,y+(px*s+py*c)*scale];
    const part=(points:number[],color:string)=>{const out:number[]=[];for(let i=0;i<points.length;i+=2)out.push(...point(points[i],points[i+1]));this.polygon(g,out,color);};
    this.circle(g,x+3,y-3,33*scale,'#111D21');this.circle(g,x,y,30*scale,'#B09060');this.circle(g,x,y,26*scale,'#36504D');
    for(const yy of [-18,18]){
      part([-24,yy-7,-2,yy-7,2,yy-3,2,yy+5,-22,yy+7,-26,yy+2],'#263A3B');
      part([-22,yy-4,-3,yy-4,-3,yy+3,-22,yy+4],'#C27436');
      part([-17,yy-6,-14,yy-6,-14,yy+5,-17,yy+5],'#CFB17C');
    }
    part([-21,-11,9,-11,19,-7,19,7,9,11,-21,11,-25,0],'#667E70');
    part([-16,4,11,4,16,7,-16,8],'#B0B49A');
    part([6,-7,45,-7,50,-4,50,4,45,7,6,7],'#162C30');
    part([9,-4,46,-4,46,3,9,3],'#AF9563');
    for(const xx of [20,29,38])part([xx,-8,xx+4,-8,xx+4,8,xx,8],'#3E5350');
    part([43,-10,54,-10,57,-5,57,5,54,10,43,10],'#D58236');
    const muzzle=point(53,0);this.circle(g,muzzle[0],muzzle[1],5*scale,'#15292D');this.circle(g,muzzle[0],muzzle[1],2.5*scale,C.gold);
    const cap=point(-14,0);this.circle(g,cap[0],cap[1],5*scale,'#243B3E');
  }
  private drawFan(g:Graphics,x:number,y:number,r:number,spin:number) {
    // The reward preview and installed equipment share the same mechanical design.
    this.circle(g,x+2,y-3,r+7,'#101C20');this.circle(g,x,y,r+5,'#A38656');
    this.circle(g,x,y,r+2,'#71908B');this.circle(g,x,y,r,'#152B30');
    this.circle(g,x,y,r*.85,'#203A3F');
    for(let i=0;i<5;i++){
      const a=spin+i*Math.PI*2/5,c=Math.cos(a),s=Math.sin(a);
      const points:number[]=[];
      for(const [px,py] of [[.12,-.1],[.58,-.32],[.86,-.17],[.82,.08],[.52,.21],[.15,.1]])
        points.push(x+(px*c-py*s)*r,y+(px*s+py*c)*r);
      this.polygon(g,points,'#9EBEB1');
      this.line(g,[x+Math.cos(a-.25)*r*.3,y+Math.sin(a-.25)*r*.3,x+Math.cos(a-.17)*r*.77,y+Math.sin(a-.17)*r*.77],'#D3D8B9',Math.max(1,r*.045));
    }
    // Stationary cross-bracing and bolts distinguish an industrial blower from a toy pinwheel.
    for(let i=0;i<4;i++){
      const a=Math.PI/4+i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
      this.line(g,[x+c*r*.22,y+s*r*.22,x+c*r,y+s*r],'#3B5557',r*.075);
      this.circle(g,x+c*(r+2),y+s*(r+2),r*.055,'#E2BE7C');
    }
    this.circle(g,x,y,r*.24,'#14292E');this.circle(g,x,y,r*.16,'#AF8C50');this.circle(g,x,y,r*.075,'#EDD4A1');
  }
  private fanPreview() {
    const n=this.group('Fan carriage preview',this.overlayNode);n.setPosition(0,51,0);
    const base=this.layer('Carriage frame',n);
    // Preview uses the installed railcar proportions, with wheels and couplers visible.
    for(const x of [-65,51])for(const y of [-46,18])this.rect(base,x,y,14,30,'#0A171C',4);
    this.rect(base,-13,-82,26,15,'#819489',3);this.rect(base,-13,68,26,13,'#819489',3);
    this.rect(base,-58,-69,116,138,'#6C8174',12);
    if(this.carriageFrame)this.sprite('Armor deck',this.carriageFrame,110,128,n);
    const parts=this.layer('Blower assembly',n);
    if(!this.carriageFrame)this.rect(parts,-52,-62,104,124,'#304C4C',8);
    for(const x of [-51,39])for(const y of [-52,-42,40,50])this.rect(parts,x,y,12,4,'#D79847',1);
    this.drawFan(parts,0,0,42,.25);
    this.rect(parts,-16,49,32,11,'#23393D',3);this.line(parts,[-10,55,10,55],C.teal,3);
  }
  private drawFlame(g:Graphics,angle:number) {
    for(let j=0;j<7;j++){
      const a=angle+(j-3)*.105,length=145+Math.sin(this.visualTime*29+j*1.8)*31+(3-Math.abs(j-3))*22;
      for(let layer=0;layer<2;layer++){
        const points:number[]=[],half=(layer?5:12),reach=length*(layer?.82:1);
        for(let i=0;i<=12;i++){const t=i/12,r=32+t*reach,w=Math.sin(t*Math.PI)*half;
          const bend=Math.sin(t*9-this.visualTime*34+j)*t*8;
          points.push(Math.cos(a)*r-Math.sin(a)*(bend+w),40+Math.sin(a)*r+Math.cos(a)*(bend+w));}
        for(let i=12;i>=0;i--){const t=i/12,r=32+t*reach,w=Math.sin(t*Math.PI)*half,bend=Math.sin(t*9-this.visualTime*34+j)*t*8;
          points.push(Math.cos(a)*r-Math.sin(a)*(bend-w),40+Math.sin(a)*r+Math.cos(a)*(bend-w));}
        this.polygon(g,points,layer?'#FFD68ED9':'#EE7325B0');
      }
    }
    this.circle(g,Math.cos(angle)*37,40+Math.sin(angle)*37,8,'#FFF1BA');
  }
  private polygon(g:Graphics,points:number[],color:string) {
    g.fillColor=new Color(color);g.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.close();g.fill();
  }
  private drawVortex(g:Graphics,x:number,y:number,r:number,spin:number,heading=0,life=1) {
    if(g===this.overlay&&this.fireFrame){
      const n=this.sprite('Vortex preview',this.fireFrame,r*2.45,r*2.45,this.overlayNode);
      n.setPosition(x,y,0);n.angle=spin*180/Math.PI;this.emission(n.getComponent(Sprite)!);
      return;
    }
    const radius=r*(.96+Math.sin(spin*1.8)*.035)*(.65+.35*life);
    this.circle(g,x,y,radius*.87,'#FF80201B');
    // Open spiral ribbons leave enemy silhouettes visible between the flame arms.
    for(let arm=0;arm<3;arm++)for(let layer=0;layer<2;layer++){
      const points:number[]=[];
      for(let side=0;side<2;side++)for(let n=0;n<=27;n++){
        const t=(side?27-n:n)/27,a=spin+arm*Math.PI*2/3+t*4.9;
        const edge=Math.sin(t*32+spin*2)*t*.019;
        const width=(.028+.075*Math.sin(Math.PI*t))*(layer?.42:1)*(side?-1:1);
        const rr=radius*(.13+.83*t+width+edge);
        points.push(x+Math.cos(a)*rr,y+Math.sin(a)*rr);
      }
      this.polygon(g,points,layer?'#FFE4A8ED':'#F58932D9');
    }
    for(let i=0;i<6;i++){
      const a=spin*.72+i*Math.PI/3, rr=radius*(.91+Math.sin(spin+i)*.07);
      this.line(g,[x+Math.cos(a)*rr,y+Math.sin(a)*rr,x+Math.cos(a-.17)*rr*1.07,y+Math.sin(a-.17)*rr*1.07],'#F5A348AA',3);
    }
    for(let i=0;i<3;i++){
      const a=heading+Math.PI+(i-1)*.3,rr=radius*(1.05+(Math.sin(spin+i)*.5+.5)*.35);
      this.line(g,[x+Math.cos(a)*radius*.72,y+Math.sin(a)*radius*.72,x+Math.cos(a)*rr,y+Math.sin(a)*rr],'#E7793048',radius*.07);
    }
    this.circle(g,x,y,radius*.115,'#FFF1BDB0');this.circle(g,x,y,radius*.055,'#FFFFFFD9');
  }
  private drawEffects() {
    const g=this.fx;g.clear();
    for(const p of this.particles){g.fillColor=new Color(p.color);g.fillColor=new Color(g.fillColor.r,g.fillColor.g,g.fillColor.b,Math.min(255,p.life/p.max*255));g.circle(p.x,p.y,Math.max(.5,p.size*p.life/p.max));g.fill();}
  }
  private drawHUD() {
    const g=this.hud,m=this.model;g.clear();
    this.rect(g,-360,432,720,208,C.ink);this.rect(g,-360,-640,720,217,C.ink);
    this.rect(g,-312,505,624,6,'#344745',3);this.rect(g,-312,505,624*m.hp/100,6,m.hp>30?C.teal:C.red,3);
    this.rect(g,-312,-527,624,4,'#314240',2);this.rect(g,-312,-527,624*Math.min(1,m.time/60),4,C.gold,2);
    this.labels.hp.string=`装甲  ${m.hp}`;this.labels.kills.string=`击破  ${m.kills}`;
    const elapsed=Math.min(60,Math.floor(m.time+.00001));
    this.labels.time.string=`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`;
    const t=m.time;
    this.labels.stage.string=t>=50?'最后封锁  ·  冲出去！':t>=45?'封锁线逼近  ·  保持火力':t>=29?'荒原尸潮  ·  全火力推进':t>=25?'进化完成  ·  清开一条路':t>=21?'密集尸群  ·  补给即将到达':t>=11?'火焰龙卷  ·  推进中':t>=8?'改装完成  ·  火力释放':t>=5?'尸群聚集  ·  准备接敌':'前方发现尸群';
    this.labels.form.string={flame:'喷火车',tornado:'火焰龙卷',twin:'双生龙卷',giant:'巨型龙卷'}[m.form];
    this.labels.hint.string=m.phase==='arrange'?'点一下发光车位，接上风扇':m.time<8?'突破尸潮，寻找改装补给':m.time<25?'下一份补给：选择龙卷进化':'守住列车，突破最后封锁';
    this.labels.footer.string=`声音 ${this.sound?'开':'关'}`;this.labels.motion.string=`镜头 ${this.lowMotion?'关':'开'}`;
    this.labels.speed.string=`倍速 ×${this.debugSpeed}`;
    this.labels.tag.string=this.debugSpeed===1?'荒原突围  /  01':`荒原突围  /  01 · 调试 ×${this.debugSpeed}`;
    this.labels.pause.string=m.phase==='paused'?'继续 ▶':'暂停 Ⅱ';
    this.labels.toast.string=this.toastLife>0?this.toastText:'';
    this.labels.chain.string=this.chain>=4&&m.phase==='combat'?`${this.chain} 连破`:'';
  }
  private button(text:string,x:number,y:number,w:number,h:number,action:()=>void,accent=true) {
    this.rect(this.overlay,x-w/2,y-h/2,w,h,accent?C.gold:'#2B4346',12);
    this.label(this.overlayNode,text,x,y,23,accent?C.ink:C.cream,w-20);
    this.hitAreas.push({x,y,w,h,action});
  }
  private panelBase() {
    this.rect(this.overlay,-360,-535,720,1080,'#101E22EC');
    this.rect(this.overlay,-306,-356,612,718,C.panel,24);
    this.rect(this.overlay,-262,314,56,5,C.gold,2);
  }
  private drawPanel() {
    for(const n of this.overlayNode.children.slice())n.destroy();this.overlay.clear();this.hitAreas=[];
    const g=this.overlay,m=this.model,phase=m.phase;
    if(phase==='combat')return;
    if(phase==='arrange'){
      this.rect(g,-290,-390,580,137,C.panel,16);
      this.label(this.overlayNode,'接到喷火车后面',0,-296,27,C.cream,540);
      this.label(this.overlayNode,'点击发光空位  ↑',0,-345,20,C.teal,540);
      this.hitAreas.push({x:0,y:-90,w:140,h:140,action:()=>{m.installFan();this.toast('组合启动 · 火焰龙卷');}});return;
    }
    this.panelBase();
    if(phase==='menu'){
      this.label(this.overlayNode,'WASTELAND EXPRESS',0,259,15,C.teal,560);
      this.label(this.overlayNode,'末日列车',0,188,62,C.cream,560);
      this.label(this.overlayNode,'把火力接上，把尸潮推平。',0,119,23,C.muted,540);
      this.drawVortex(g,0,-7,68,1.3);
      this.label(this.overlayNode,'接上风扇，让喷火进化成龙卷',0,-123,23,C.cream,550);
      this.label(this.overlayNode,'自动开火  ·  亲手改装  ·  突破封锁',0,-166,17,C.muted,550);
      this.button('发车  →',0,-259,474,76,()=>this.begin());
    }else if(phase==='reward'){
      this.label(this.overlayNode,'发现改装补给',0,250,34,C.cream,550);
      this.label(this.overlayNode,'风扇车',0,164,30,C.teal,500);
      this.fanPreview();
      this.label(this.overlayNode,'喷火 ＋ 风扇 → 火焰龙卷',0,-62,27,C.cream,558);
      this.label(this.overlayNode,'旋转火柱穿过怪群，持续灼烧沿途敌人',0,-114,18,C.muted,550);
      this.button('装配风扇车',0,-251,474,76,()=>m.beginArrange());
    }else if(phase==='upgrade'){
      this.label(this.overlayNode,'火力，再进化。',0,251,35,C.cream,550);
      this.label(this.overlayNode,'选择本局的龙卷形态',0,196,19,C.muted,550);
      this.rect(g,-268,-100,258,236,'#284041',16);this.rect(g,10,-100,258,236,'#3B382C',16);
      this.drawVortex(g,-161,73,27,1);this.drawVortex(g,-111,73,27,2);this.drawVortex(g,137,69,47,1);
      this.label(this.overlayNode,'双生龙卷',-138,-8,25,C.teal,235);this.label(this.overlayNode,'巨型龙卷',138,-8,25,C.gold,235);
      this.label(this.overlayNode,'每次两道\n更快出击',-138,-61,18,C.muted,235);this.label(this.overlayNode,'范围更大\n持续更久',138,-61,18,C.muted,235);
      this.button('选择双生',-138,-170,258,64,()=>{m.choose('twin');this.toast('双生龙卷 · 双倍席卷');},false);
      this.button('选择巨型',138,-170,258,64,()=>{m.choose('giant');this.toast('巨型龙卷 · 横扫尸潮');});
      this.label(this.overlayNode,'下一局可以试试另一种',0,-277,18,C.muted,530);
    }else if(phase==='paused'){
      this.label(this.overlayNode,'列车已暂停',0,201,37,C.cream,550);
      this.label(this.overlayNode,'准备好了，再一起冲出去。',0,117,21,C.muted,550);
      this.button('继续前进',0,-40,470,76,()=>m.resume());
      this.button('重新发车',0,-147,470,66,()=>this.begin(),false);
    }else{
      this.label(this.overlayNode,phase==='win'?'封锁已突破':'列车失守',0,224,45,phase==='win'?C.gold:C.red,550);
      this.label(this.overlayNode,phase==='win'?'这一轮尸潮，拦不住你。':'换一种火力，再闯一次。',0,153,22,C.muted,550);
      this.label(this.overlayNode,`${m.kills}`,0,43,75,C.cream,550);
      this.label(this.overlayNode,`击破敌人  /  坚持 ${Math.round(m.time)} 秒`,0,-23,19,C.muted,550);
      this.label(this.overlayNode,`本局改装 · ${{flame:'基础喷火',tornado:'火焰龙卷',twin:'双生龙卷',giant:'巨型龙卷'}[m.form]}`,0,-86,22,C.teal,550);
      this.button('再来一局  →',0,-207,474,76,()=>this.begin());
      this.button('返回车库',0,-294,474,52,()=>{m.phase='menu';},false);
      try{globalThis.localStorage?.setItem('doomsday-last-run',JSON.stringify({seed:m.initialSeed,form:m.form,hp:m.hp,kills:m.kills,time:m.time,result:phase,events:m.events}));}catch{}
    }
  }
}
