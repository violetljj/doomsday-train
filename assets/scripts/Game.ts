import { _decorator, Component, Node, Graphics, Color, UITransform, Label, Vec3, EventTouch,
  resources, SpriteFrame, Sprite, view, ResolutionPolicy, game, Game as EngineGame, Layers, profiler, Material, gfx } from 'cc';
import { Combat } from './Combat';
import { CARS, MODS, RECIPES, getRecipe, CarType, ModId } from './Catalog';
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
  private carArt = new Map<number,Node>();
  private selectedSlot = -1;
  private atlas = false; private atlasPage = 0;
  private knownRecipes = new Set<string>(); private newRecipes = new Set<string>();
  private carIcons = new Map<CarType,SpriteFrame>();
  private readonly slotY = [40,-85,-210,-335];
  private supportEffects: {type:string;x:number;y:number;dx:number;dy:number;size:number;life:number;max:number}[] = [];

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
    this.labels.hint = this.label(this.node, '', -307, -484, 21, C.muted, 425, 'left');
    this.labels.footer = this.label(this.node, '声音 开', -270, -577, 21, C.muted, 162);
    this.labels.motion = this.label(this.node, '镜头 开', -90, -577, 21, C.muted, 162);
    this.labels.speed = this.label(this.node, '倍速 ×1', 90, -577, 21, C.gold, 162);
    this.labels.pause = this.label(this.node, '暂停 Ⅱ', 270, -577, 21, C.cream, 162);
    this.labels.toast = this.label(this.node, '', 0, 375, 24, C.gold, 680);
    this.labels.chain = this.label(this.node, '', 245, 305, 28, C.gold, 205);
    this.labels.boss = this.label(this.node, '', 0, 385, 19, C.red, 570);
    this.overlayNode = new Node('Panels'); this.overlayNode.layer=Layers.Enum.UI_2D; this.node.addChild(this.overlayNode);
    this.overlayNode.addComponent(UITransform).setContentSize(720,1280);
    this.overlay = this.overlayNode.addComponent(Graphics);
    this.node.on(Node.EventType.TOUCH_END, this.touch, this);
    game.on(EngineGame.EVENT_HIDE, this.hide, this);
    try { const saved = globalThis.localStorage?.getItem('doomsday-settings'); if(saved){const v=JSON.parse(saved);this.sound=v.sound!==false;this.lowMotion=!!v.lowMotion;} } catch {}
    try {const saved=JSON.parse(globalThis.localStorage?.getItem('doomsday-recipes-v03')||'[]');
      if(Array.isArray(saved))for(const id of saved)if(RECIPES.some(r=>r.id===id))this.knownRecipes.add(id);}catch{}
    resources.load('art/locomotive/spriteFrame', SpriteFrame, (err,frame) => {
      if (err || !this.isValid) return;
      this.loco = this.sprite('Locomotive', frame, 174, 261, this.trainLayer); this.loco.setPosition(0,235,0);
    });
    resources.load('art/zombie/spriteFrame', SpriteFrame, (err,frame) => { if (!err && this.isValid) this.zombieFrame = frame; });
    for(const type of ['cannon','flame','fan','tesla','cryo'] as CarType[]) {
      resources.load(`art/car-${type}-v03/spriteFrame`,SpriteFrame,(err,frame)=>{
        if(!err&&this.isValid){this.carIcons.set(type,frame);this.state='';}
      });
    }
    resources.load('art/carriage-deck/spriteFrame', SpriteFrame, (err,frame) => {
      if(err||!this.isValid)return;this.carriageFrame=frame;this.state='';
    });
    resources.load('art/fire-vortex/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err||!this.isValid)return;this.fireFrame=frame;this.state='';
    });
    // Read-only diagnostic snapshot for smoke checks, without exposing state mutation.
    (globalThis as any).__doomsday = { snapshot: () => ({ phase:this.model.phase,
      time:this.model.time, hp:this.model.hp, kills:this.model.kills, enemies:this.model.enemies.length,
      vortices:this.model.vortices.length, seed:this.model.initialSeed, fps:this.fps, speed:this.debugSpeed,
      slots:this.model.slots.map(c=>c?{id:c.id,type:c.type,level:c.level,angle:c.angle}:null),
      links:this.model.links.map(l=>({index:l.index,id:l.recipe.id})),pendingCar:this.model.pendingCar,
      offers:this.model.offers.slice(),scrap:this.model.scrap,nextScrap:this.model.nextScrap,supplyCount:this.model.supplyCount,
      knownRecipes:Array.from(this.knownRecipes),linkLevel:this.model.linkLevel,
      maxHp:this.model.maxHp,boss:this.model.boss?{hp:this.model.boss.hp,maxHp:this.model.boss.maxHp}:null,
      bossCharge:this.model.bossCharge,endReason:this.model.endReason,
      art:{ locomotive:!!this.loco,zombie:!!this.zombieFrame,carriage:!!this.carriageFrame,fire:!!this.fireFrame,carIcons:Array.from(this.carIcons.keys()) },
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
    this.supportEffects=[];this.selectedSlot=-1;this.atlas=false;this.newRecipes.clear();
    for(const n of this.carArt.values())n.destroy();this.carArt.clear();
    for(const d of this.defeated)d.node.destroy();this.defeated=[];
    for(const n of this.vortexSprites.values())n.destroy();this.vortexSprites.clear();
    this.toast('击破敌人，收集改装废料');this.tone(180,.15);
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
    const frozen=['paused','workshop','supply'].includes(this.model.phase);
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
    if(!frozen)for(const e of this.supportEffects)e.life-=delta;
    this.supportEffects=this.supportEffects.filter(e=>e.life>0);
    let frameKills=0;const discoveries:string[]=[];
    for(const e of this.model.effects.splice(0)) {
      if(e.type==='discovery'&&e.recipeId){
        const recipe=RECIPES.find(r=>r.id===e.recipeId);
        if(recipe&&!this.knownRecipes.has(recipe.id)){
          this.knownRecipes.add(recipe.id);this.newRecipes.add(recipe.id);discoveries.push(recipe.name);this.tone(710,.35,'triangle');
          try{globalThis.localStorage?.setItem('doomsday-recipes-v03',JSON.stringify(Array.from(this.knownRecipes)));}catch{}
        }
        continue;
      }
      const visualKind=({fan:'wind','focused-flame':'beam','burning-arc':'tesla',conduction:'tesla',
        'burn-blast':'blast',thermal:'blast',blizzard:'cryo',shatter:'iceblast'} as Record<string,string>)[e.type]||e.type;
      if(['tesla','cryo','wind','beam','blast','slam','iceblast','burn'].includes(visualKind)){
        const life=e.type==='tesla'?.24:e.type==='repair'?.8:.5;
        this.supportEffects.push({type:visualKind,x:e.x,y:e.y,dx:e.dx??0,dy:e.dy??0,size:e.size,life,max:life});
        if(this.supportEffects.length>32)this.supportEffects.shift();
        if(e.type==='slam'){this.shake=9;this.tone(55,.25,'triangle');this.toast('首领冲击 · 护住列车');}
        if(e.type==='tesla')this.tone(320,.055,'triangle');
        continue;
      }
      if(e.type==='boss'){this.toast('破阵者出现 · 击破它才能突围');this.tone(95,.4,'triangle');continue;}
      if(e.type==='wave'){
        this.toast('尸群正在聚集 · 检验你的组合');
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
    if(discoveries.length)this.toast(`发现联动 · ${discoveries.join(' / ')}`);
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
    const nextState=`${this.model.phase}:${this.model.revision}:${this.selectedSlot}:${this.atlas}:${this.atlasPage}:${this.knownRecipes.size}`;
    if(this.state!==nextState){this.state=nextState;this.drawPanel();}
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
    const g=this.world,d=this.details,a=this.attacks,m=this.model;g.clear();d.clear();a.clear();
    const ids=new Set(m.enemies.map(e=>e.id));
    for(const [id,n]of this.enemySprites)if(!ids.has(id)){n.destroy();this.enemySprites.delete(id);}
    for(const e of m.enemies){
      const size=e.kind===3?78:e.kind===2?45:35;
      this.circle(g,e.x+3,e.y-5,size*.42,'#142321');
      if((e.slow??0)>0){g.strokeColor=new Color('#8ADDEB');g.lineWidth=3;g.circle(e.x,e.y,size*.6);g.stroke();}
      if(e.freeze>0){this.polygon(a,[e.x,e.y+size*.7,e.x+size*.55,e.y,e.x,e.y-size*.7,e.x-size*.55,e.y],'#87D9EF55');}
      if(e.kind===3){a.strokeColor=new Color(m.bossCharge>.72?C.red:C.gold);a.lineWidth=4;a.circle(e.x,e.y,60);a.stroke();}
      if(this.zombieFrame){
        let n=this.enemySprites.get(e.id);if(!n){n=this.sprite('Enemy',this.zombieFrame,size*1.5,size*1.5,this.enemyLayer);this.enemySprites.set(e.id,n);}
        const gait=e.freeze>0?0:Math.sin(this.visualTime*12+e.id*2.4);
        n.setPosition(e.x,e.y+gait*1.6,0);n.angle=(Math.atan2(-e.y,-e.x)+Math.PI/2)*180/Math.PI+gait*5;
        n.setScale(e.flash>0?1.1:1,e.flash>0?1.1:1,1);
        n.getComponent(Sprite)!.color=new Color(e.kind===3?'#F5906B':e.kind===2?'#B9C4D0':e.kind===4?'#FFAF62':e.kind===5?'#B394D9':'#FFFFFF');
      }else this.circle(g,e.x,e.y,size*.4,e.kind===4?C.gold:C.muted);
      if(e.kind===2||e.kind===4||e.kind===5){
        const color=e.kind===2?'#D2DFE5':e.kind===4?'#FFA552':'#C9A1ED';
        this.line(a,[e.x-8,e.y+24,e.x,e.y+32,e.x+8,e.y+24,e.x,e.y+17,e.x-8,e.y+24],color,3);
      }
      if(e.hp<e.maxHp&&e.kind!==3){this.rect(g,e.x-16,e.y+27,32,3,'#152325');this.rect(g,e.x-16,e.y+27,32*Math.max(0,e.hp/e.maxHp),3,C.red);}
    }
    if(!this.loco){this.rect(g,-41,190,82,89,'#5A7772',12);this.rect(g,-31,229,62,32,'#152E35',6);this.rect(g,-45,168,90,17,C.gold,4);}
    const carIds=new Set(m.slots.filter(c=>!!c).map(c=>c!.id));
    for(const [id,n]of this.carArt)if(!carIds.has(id)){n.destroy();this.carArt.delete(id);}
    m.slots.forEach((car,i)=>{
      const y=this.slotY[i];
      this.car(g,y);
      if(!car){this.circle(d,0,y,22,'#182C30');this.line(d,[-12,y,12,y],C.edge,3);this.line(d,[0,y-12,0,y+12],C.edge,3);return;}
      if(this.carriageFrame){let n=this.carArt.get(car.id);if(!n){n=this.sprite('Carriage',this.carriageFrame,90,98,this.trainLayer);this.carArt.set(car.id,n);}n.setPosition(0,y,0);}
      const angle=m.getRenderAngle(i);
      this.drawCarModule(d,car.type,0,y,1,angle);
      if(car.flash>0){
        if(car.type==='flame')this.drawFlame(a,angle,y);
        else if(car.type==='cannon')this.circle(a,Math.cos(angle)*52,y+Math.sin(angle)*52,7,C.cream);
      }
      if(car.level>0)for(let j=0;j<car.level;j++)this.circle(d,-31+j*10,y-39,3,C.gold);
    });
    for(const link of m.links){
      const y=(this.slotY[link.index]+this.slotY[link.index+1])/2;
      const known=this.knownRecipes.has(link.recipe.id);
      this.line(d,[-8,y-7,-8,y+7],known?C.teal:C.gold,4);this.line(d,[8,y-7,8,y+7],known?C.teal:C.gold,4);
      this.circle(d,0,y,4,known?C.cream:C.gold);
    }
    for(const p of m.projectiles){
      const color=p.element==='fire'?'#FF9552':p.element==='ice'?'#95EDFF':p.kind==='magnetic'?'#CFADFF':p.element==='electric'?C.teal:C.gold;
      const length=Math.max(1,Math.hypot(p.dx,p.dy));
      this.line(a,[p.x-p.dx/length*20,p.y-p.dy/length*20,p.x,p.y],color,4);
      this.circle(a,p.x,p.y,Math.max(4,Math.min(9,p.radius)),C.cream);
    }
    const vortexIds=new Set(m.vortices.map(v=>v.id));
    for(const [id,n]of this.vortexSprites)if(!vortexIds.has(id)){n.destroy();this.vortexSprites.delete(id);}
    for(const v of m.vortices){
      const fade=Math.min(1,v.life/.3),spin=this.visualTime*9+v.id;
      if(v.element==='electric'){
        a.strokeColor=new Color('#77E9E3');a.lineWidth=3;a.circle(v.x,v.y,v.radius*.75);a.stroke();
        a.strokeColor=new Color('#BDABEF');a.lineWidth=2;a.circle(v.x,v.y,v.radius*.5);a.stroke();
        for(let i=0;i<4;i++){
          const q=spin+i*Math.PI/2,r=v.radius*.8;
          this.line(a,[v.x+Math.cos(q)*r,v.y+Math.sin(q)*r,v.x+Math.cos(q+.5)*r*.4,v.y+Math.sin(q+.5)*r*.4,v.x,v.y],'#ACFFF0',3);
        }
      }else if(this.fireFrame){
        let n=this.vortexSprites.get(v.id);
        if(!n){n=this.sprite('Linked vortex',this.fireFrame,v.radius*2.45,v.radius*2.45,this.vortexLayer);this.emission(n.getComponent(Sprite)!);this.vortexSprites.set(v.id,n);}
        n.setPosition(v.x,v.y,0);n.angle=spin*180/Math.PI;
        const grow=(.7+.3*Math.min(1,v.age/.12))*(.85+.15*fade);n.setScale(grow,grow,1);
        n.getComponent(Sprite)!.color=new Color(255,241,210,Math.round(185*fade));
      }else this.drawVortex(a,v.x,v.y,v.radius,spin,Math.atan2(v.dy,v.dx),fade);
    }
  }
  private drawCarModule(g:Graphics,type:CarType,x:number,y:number,scale:number,angle=0) {
    if(type==='fan')this.drawFan(g,x,y,29*scale,this.visualTime*16);
    else if(type==='tesla'||type==='cryo')this.drawSupport(g,type,x,y,scale);
    else if(type==='flame')this.drawTurret(g,x,y,angle,scale);
    else{
      this.circle(g,x,y,29*scale,'#253B40');this.circle(g,x,y,23*scale,'#84958C');
      const dx=Math.cos(angle),dy=Math.sin(angle);
      this.line(g,[x-dx*13*scale,y-dy*13*scale,x+dx*48*scale,y+dy*48*scale],'#16292F',22*scale);
      this.line(g,[x,y,x+dx*46*scale,y+dy*46*scale],'#ADAB84',12*scale);
      this.circle(g,x-dx*10*scale,y-dy*10*scale,10*scale,'#4C6564');
      this.circle(g,x+dx*47*scale,y+dy*47*scale,6*scale,C.gold);
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
  private drawSupport(g:Graphics,type:string,x:number,y:number,scale:number) {
    const r=29*scale;
    this.circle(g,x,y,r+4,'#12282D');this.circle(g,x,y,r,'#415C59');
    if(type==='tesla'){
      for(let i=0;i<4;i++){const a=i*Math.PI/2;const xx=x+Math.cos(a)*r*.68,yy=y+Math.sin(a)*r*.68;
        this.circle(g,xx,yy,8*scale,'#B47A3C');this.circle(g,xx,yy,4*scale,C.gold);}
      this.line(g,[x-10*scale,y+17*scale,x+4*scale,y+2*scale,x-4*scale,y-2*scale,x+10*scale,y-17*scale],C.teal,5*scale);
    }else if(type==='cryo'){
      this.polygon(g,[x,y+r*.8,x+r*.58,y,x,y-r*.8,x-r*.58,y],'#79CFE1');
      this.line(g,[x,y+r*.7,x,y-r*.7],'#E1FAED',3*scale);this.line(g,[x-r*.45,y,x+r*.45,y],'#E1FAED',3*scale);
    }else{
      this.rect(g,x-r*.7,y-r*.65,r*1.4,r*1.3,'#AC8745',5*scale);
      this.rect(g,x-4*scale,y-15*scale,8*scale,30*scale,C.cream,2*scale);
      this.rect(g,x-15*scale,y-4*scale,30*scale,8*scale,C.cream,2*scale);
    }
  }
  private drawFlame(g:Graphics,angle:number,originY=40) {
    for(let j=0;j<7;j++){
      const a=angle+(j-3)*.105,length=145+Math.sin(this.visualTime*29+j*1.8)*31+(3-Math.abs(j-3))*22;
      for(let layer=0;layer<2;layer++){
        const points:number[]=[],half=(layer?5:12),reach=length*(layer?.82:1);
        for(let i=0;i<=12;i++){const t=i/12,r=32+t*reach,w=Math.sin(t*Math.PI)*half;
          const bend=Math.sin(t*9-this.visualTime*34+j)*t*8;
          points.push(Math.cos(a)*r-Math.sin(a)*(bend+w),originY+Math.sin(a)*r+Math.cos(a)*(bend+w));}
        for(let i=12;i>=0;i--){const t=i/12,r=32+t*reach,w=Math.sin(t*Math.PI)*half,bend=Math.sin(t*9-this.visualTime*34+j)*t*8;
          points.push(Math.cos(a)*r-Math.sin(a)*(bend-w),originY+Math.sin(a)*r+Math.cos(a)*(bend-w));}
        this.polygon(g,points,layer?'#FFD68ED9':'#EE7325B0');
      }
    }
    this.circle(g,Math.cos(angle)*37,originY+Math.sin(angle)*37,8,'#FFF1BA');
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
    for(const e of this.supportEffects){
      const t=1-e.life/e.max;
      if(e.type==='tesla'){
        const points:number[]=[];const length=Math.max(1,Math.hypot(e.dx,e.dy));
        for(let i=0;i<=6;i++){const p=i/6,offset=i===0||i===6?0:Math.sin(i*5+this.visualTime*55)*13;
          points.push(e.x+e.dx*p-e.dy/length*offset,e.y+e.dy*p+e.dx/length*offset);}
        this.line(g,points,'#67E1D6A0',7);this.line(g,points,'#EBFFF2',2);
      }else if(e.type==='beam'||e.type==='wind'){
        const angle=Math.atan2(e.dy,e.dx),reach=e.size||260;
        if(e.type==='beam'){
          this.line(g,[e.x,e.y,e.x+Math.cos(angle)*reach,e.y+Math.sin(angle)*reach],'#F6813FA0',20*(1-t)+4);
          this.line(g,[e.x,e.y,e.x+Math.cos(angle)*reach,e.y+Math.sin(angle)*reach],'#FFF0BC',5);
        }else for(let i=-1;i<=1;i++){
          const a=angle+i*.3,r=(.3+.7*t)*reach;
          this.line(g,[e.x+Math.cos(a)*r*.55,e.y+Math.sin(a)*r*.55,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r],'#A2EAD999',3);
        }
      }else{
        const color=e.type==='cryo'||e.type==='iceblast'?'#83D5E8':e.type==='slam'?C.red:C.gold;
        g.strokeColor=new Color(color);g.lineWidth=2+3*(1-t);
        const radius=e.type==='repair'?35:e.type==='slam'?120:e.size;
        g.circle(e.x,e.y,radius*(.25+.75*t));g.stroke();
      }
    }
    for(const p of this.particles){g.fillColor=new Color(p.color);g.fillColor=new Color(g.fillColor.r,g.fillColor.g,g.fillColor.b,Math.min(255,p.life/p.max*255));g.circle(p.x,p.y,Math.max(.5,p.size*p.life/p.max));g.fill();}
  }
  private drawHUD() {
    const g=this.hud,m=this.model;g.clear();
    this.rect(g,-360,432,720,208,C.ink);this.rect(g,-360,-640,720,217,C.ink);
    this.rect(g,-312,505,624,6,'#344745',3);this.rect(g,-312,505,624*m.hp/m.maxHp,6,m.hp>30?C.teal:C.red,3);
    this.rect(g,-312,-527,624,4,'#314240',2);
    this.rect(g,-312,-527,624*(m.supplyCount>=6?1:Math.min(1,m.scrap/m.nextScrap)),4,C.gold,2);
    this.labels.hp.string=`装甲 ${Math.ceil(m.hp)}/${m.maxHp}`;this.labels.kills.string=`击破 ${m.kills}`;
    const elapsed=Math.min(80,Math.floor(m.time+.00001));
    this.labels.time.string=`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`;
    this.labels.stage.string=m.time>=60?'关底战 · 80秒前击败首领':m.time>=38?'绝缘怪来袭 · 电击效果减弱':m.time>=30?'耐火怪来袭 · 火焰效果减弱':m.time>=18?'重甲怪来袭 · 炮弹需要破甲':'击破敌人 · 收集改装废料';
    this.labels.form.string=m.slots.map(c=>c?CARS[c.type].name.replace('车',''):'空位').join(' — ');
    this.labels.hint.string=m.supplyCount>=6?`补给已收齐 · 相邻联动 ${m.links.length} 条`:`废料 ${m.scrap} / ${m.nextScrap} · 联动 ${m.links.length} 条`;
    this.labels.footer.string=`声音 ${this.sound?'开':'关'}`;this.labels.motion.string=`镜头 ${this.lowMotion?'关':'开'}`;
    this.labels.speed.string=`倍速 ×${this.debugSpeed}`;
    this.labels.tag.string=this.debugSpeed===1?'四槽改装 / 车头 → 车尾':`四槽改装 / 调试 ×${this.debugSpeed}`;
    this.labels.pause.string=m.phase==='paused'?'继续 ▶':'暂停 Ⅱ';
    const boss=m.boss;
    this.labels.boss.string=boss?`破阵者 ${Math.ceil(boss.hp)} / ${boss.maxHp}${m.bossCharge>.72?' · 冲击蓄力！':''}`:'';
    if(boss){this.rect(g,-260,363,520,7,'#3E302C',3);this.rect(g,-260,363,520*Math.max(0,boss.hp/boss.maxHp),7,C.red,3);}
    this.labels.toast.node.setPosition(0,boss?337:375,0);
    this.labels.toast.string=this.toastLife>0?this.toastText:'';
    this.labels.chain.string=this.chain>=4&&m.phase==='combat'&&!boss?`${this.chain} 连破`:'';
  }
  private button(text:string,x:number,y:number,w:number,h:number,action:()=>void,accent=true) {
    this.rect(this.overlay,x-w/2,y-h/2,w,h,accent?C.gold:'#2B4346',12);
    this.label(this.overlayNode,text,x,y,23,accent?C.ink:C.cream,w-20);
    this.hitAreas.push({x,y,w,h,action});
  }
  private panelBase() {
    this.rect(this.overlay,-360,-535,720,1080,'#101E22EC');
    this.rect(this.overlay,-306,-386,612,798,C.panel,24);
    this.rect(this.overlay,-262,370,56,5,C.gold,2);
  }
  private slotClick(index:number) {
    const m=this.model;
    if(m.pendingCar){if(m.install(index))this.selectedSlot=-1;return;}
    if(this.selectedSlot<0){this.selectedSlot=index;return;}
    if(this.selectedSlot!==index)m.swapSlots(this.selectedSlot,index);
    this.selectedSlot=-1;
  }
  private cardIcon(type:CarType,x:number,y:number,size:number) {
    const frame=this.carIcons.get(type);
    if(frame){const n=this.sprite(`Card ${type}`,frame,size,size,this.overlayNode);n.setPosition(x,y,0);}
    else this.drawCarModule(this.overlay,type,x,y,size/125,Math.PI/2);
  }
  private drawWorkshop() {
    const g=this.overlay,m=this.model;
    this.label(this.overlayNode,'列车工坊',0,322,36,C.cream,560);
    this.label(this.overlayNode,'车头 → 车尾 · 只有相邻车厢联动',0,278,19,C.muted,560);
    this.label(this.overlayNode,m.pendingCar?`待装：${CARS[m.pendingCar].name} · 点槽位装入或替换`:
      this.selectedSlot>=0?`已选 ${this.selectedSlot+1} 号位 · 再点一个槽位交换`:'点两节车厢交换位置，空槽也可以交换',0,235,20,C.gold,565);
    const xs=[-228,-76,76,228];
    m.slots.forEach((car,i)=>{
      const x=xs[i];this.rect(g,x-65,57,130,154,this.selectedSlot===i?'#506249':car?'#30494B':'#203639',12);
      this.label(this.overlayNode,`${i+1}`,x,195,17,C.muted,80);
      if(car){
        this.cardIcon(car.type,x,145,80);
        this.label(this.overlayNode,CARS[car.type].name,x,98,22,CARS[car.type].color,125);
        this.label(this.overlayNode,car.level?`改装 ${car.level} 级`:'基础车厢',x,73,15,C.muted,125);
      }else{this.line(g,[x-13,141,x+13,141],C.muted,3);this.line(g,[x,128,x,154],C.muted,3);this.label(this.overlayNode,'空槽',x,95,23,C.muted,125);}
      this.hitAreas.push({x,y:134,w:130,h:154,action:()=>this.slotClick(i)});
      if(i<3)this.label(this.overlayNode,'›',x+76,135,25,C.gold,24);
    });
    for(let i=0;i<3;i++){
      const a=m.slots[i],b=m.slots[i+1],r=a&&b?getRecipe(a.type,b.type):null,y=13-i*71;
      const known=r&&this.knownRecipes.has(r.id);
      this.rect(g,-270,y-31,540,62,'#203539',8);
      this.label(this.overlayNode,`${i+1} → ${i+2}  ${r?(known?r.name:'未知联动'):'暂无联动'}`,-253,y+12,21,r?C.teal:C.muted,505,'left');
      this.label(this.overlayNode,r?(known?r.description:r.hint):a&&b?'同类车厢独立工作':'相邻两个槽位都需要车厢',-253,y-14,17,C.muted,505,'left');
    }
    if(m.pendingCar){
      this.label(this.overlayNode,'新车需先装入，或放弃本次获得',0,-213,20,C.muted,550);
      this.button('放弃这节车厢',0,-270,380,58,()=>{m.discardOffer();this.selectedSlot=-1;},false);
    }else this.button(`带着 ${m.links.length} 条联动出发 →`,0,-241,530,68,()=>{this.selectedSlot=-1;m.resumeWorkshop();});
    this.button(`联动图鉴 ${this.knownRecipes.size} / ${RECIPES.length}`,0,-331,390,48,()=>{this.atlas=true;this.atlasPage=0;},false);
  }
  private drawAtlas() {
    const pages=Math.ceil(RECIPES.length/3),g=this.overlay;
    this.label(this.overlayNode,'联动图鉴',0,305,36,C.cream,560);
    this.label(this.overlayNode,'未知组合提供线索 · 战斗触发后揭晓',0,256,19,C.muted,560);
    RECIPES.slice(this.atlasPage*3,this.atlasPage*3+3).forEach((r,i)=>{
      const y=145-i*136,known=this.knownRecipes.has(r.id);
      this.rect(g,-272,y-55,544,110,'#263F42',10);
      this.label(this.overlayNode,`${CARS[r.a].name} ${r.directional?'→':'＋'} ${CARS[r.b].name}`,-254,y+33,18,C.muted,505,'left');
      this.label(this.overlayNode,known?r.name:'？？？',-254,y+5,25,known?C.teal:C.gold,505,'left');
      this.label(this.overlayNode,known?r.description:r.hint,-254,y-29,18,C.cream,505,'left');
    });
    this.label(this.overlayNode,`${this.atlasPage+1} / ${pages}`,0,-264,21,C.muted,100);
    this.button('上一页',-180,-264,150,48,()=>{this.atlasPage=(this.atlasPage+pages-1)%pages;},false);
    this.button('下一页',180,-264,150,48,()=>{this.atlasPage=(this.atlasPage+1)%pages;},false);
    this.button('返回',0,-335,260,50,()=>{this.atlas=false;},false);
  }
  private drawPanel() {
    for(const n of this.overlayNode.children.slice())n.destroy();this.overlay.clear();this.hitAreas=[];
    const g=this.overlay,m=this.model,phase=m.phase;
    if(phase==='combat'){
      this.button('改装 ↔',224,-484,170,52,()=>{this.selectedSlot=-1;this.atlas=false;m.openWorkshop();},false);
      return;
    }
    this.panelBase();
    if(this.atlas&&(phase==='menu'||phase==='workshop')){this.drawAtlas();return;}
    if(phase==='workshop'){this.drawWorkshop();return;}
    if(phase==='menu'){
      this.label(this.overlayNode,'WASTELAND EXPRESS',0,293,15,C.teal,560);
      this.label(this.overlayNode,'末日列车',0,225,61,C.cream,560);
      this.label(this.overlayNode,'四节车厢，拼出你的突围火力。',0,156,23,C.muted,555);
      for(const [i,t] of (['cannon','flame','fan'] as CarType[]).entries()){
        const x=(i-1)*136;this.rect(g,x-47,-26,94,109,'#2D4545',10);this.cardIcon(t,x,28,100);
        if(i<2)this.label(this.overlayNode,'?',x+68,25,23,C.gold,26);
      }
      this.label(this.overlayNode,'独立开火 · 相邻联动 · 顺序改变效果',0,-88,22,C.cream,560);
      this.label(this.overlayNode,'击破收集废料，获得新车厢和改装词条',0,-131,18,C.muted,560);
      this.button('发车  →',0,-231,474,74,()=>this.begin());
      this.button(`联动图鉴 ${this.knownRecipes.size}/${RECIPES.length}`,0,-324,370,48,()=>{this.atlas=true;this.atlasPage=0;},false);
    }else if(phase==='supply'){
      this.label(this.overlayNode,'废料补给 · 三选一',0,303,34,C.cream,555);
      this.label(this.overlayNode,'新车可以装入空位，也可以替换旧车',0,250,19,C.muted,555);
      m.offers.forEach((offer,i)=>{
        const y=144-i*154,isCar=offer.kind==='car';
        const data=isCar?CARS[offer.id as CarType]:MODS[offer.id as ModId];
        this.rect(g,-270,y-67,540,134,isCar?'#294447':'#414635',13);
        if(isCar)this.cardIcon(offer.id as CarType,-217,y,97);
        else{this.circle(g,-217,y,29,'#263B3D');this.label(this.overlayNode,'改',-217,y,26,C.gold,60);}
        this.label(this.overlayNode,data.name,-164,y+35,25,isCar?C.teal:C.gold,411,'left');
        this.label(this.overlayNode,data.description,-164,y-6,20,C.cream,410,'left');
        this.label(this.overlayNode,isCar?'车厢 · 选择后安排槽位':'词条 · 改变现有车厢或联动',-164,y-45,15,C.muted,410,'left');
        this.hitAreas.push({x:0,y,w:540,h:134,action:()=>{this.selectedSlot=-1;this.atlas=false;m.chooseOffer(i);}});
      });
      this.label(this.overlayNode,`已收集废料 ${m.scrap} · 第 ${m.supplyCount} 次补给`,0,-286,19,C.muted,550);
    }else if(phase==='paused'){
      this.label(this.overlayNode,'列车已暂停',0,218,37,C.cream,550);
      this.label(this.overlayNode,'准备好了，再一起冲出去。',0,141,21,C.muted,550);
      this.button('继续前进',0,-25,470,76,()=>m.resume());
      this.button('重新发车',0,-136,470,66,()=>this.begin(),false);
    }else{
      this.label(this.overlayNode,phase==='win'?'首领已击破':m.endReason==='timeout'?'突围超时':'列车失守',0,287,44,phase==='win'?C.gold:C.red,550);
      this.label(this.overlayNode,phase==='win'?'这条车厢链，冲破了封锁。':m.endReason==='timeout'?'首领仍在，换种联动再试一次。':'调整车厢顺序，试试另一种组合。',0,224,21,C.muted,550);
      this.label(this.overlayNode,`${m.kills}`,0,127,68,C.cream,550);
      this.label(this.overlayNode,`击破敌人 / 坚持 ${Math.round(m.time)} 秒`,0,70,19,C.muted,550);
      this.label(this.overlayNode,m.slots.map(c=>c?CARS[c.type].name:'空位').join(' → '),0,9,21,C.teal,555);
      this.label(this.overlayNode,m.links.map(l=>this.knownRecipes.has(l.recipe.id)?l.recipe.name:'未知联动').join(' / ')||'本局没有相邻联动',0,-54,18,C.muted,550);
      this.label(this.overlayNode,`本局新发现 ${this.newRecipes.size} 种联动`,0,-115,20,C.gold,550);
      this.button('再组一列  →',0,-218,474,74,()=>this.begin());
      this.button('返回车库',0,-309,474,52,()=>{m.phase='menu';this.atlas=false;},false);
      try{globalThis.localStorage?.setItem('doomsday-last-run',JSON.stringify({version:'0.3.0',seed:m.initialSeed,slots:m.slots.map(c=>c?{type:c.type,level:c.level}:null),links:m.links.map(l=>l.recipe.id),hp:m.hp,kills:m.kills,time:m.time,result:phase,reason:m.endReason,events:m.events}));}catch{}
    }
  }
}
