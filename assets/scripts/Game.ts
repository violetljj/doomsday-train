import { _decorator, Component, Node, Graphics, Color, UITransform, Label, Vec3, EventTouch,
  resources, SpriteFrame, Sprite, view, ResolutionPolicy, game, Game as EngineGame, Layers, profiler } from 'cc';
import { Combat, Phase } from './Combat';
const { ccclass } = _decorator;
const C = { ink: '#101E22', panel: '#192C30', edge: '#355052', gold: '#FFB54D', cream: '#F3E6CD', muted: '#91A7A4', teal: '#70D9C0', red: '#F4785F' };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type HitArea = { x: number; y: number; w: number; h: number; action: () => void };

@ccclass('Game')
export class Game extends Component {
  private model = new Combat();
  private bg!: Graphics; private world!: Graphics; private fx!: Graphics; private hud!: Graphics; private overlay!: Graphics;
  private overlayNode!: Node; private worldNode!: Node; private labels: Record<string, Label> = {};
  private hitAreas: HitArea[] = []; private particles: Particle[] = []; private state = '';
  private visualTime = 0; private shake = 0; private seed = 137;
  private loco: Node | null = null; private zombieFrame: SpriteFrame | null = null;
  private enemySprites = new Map<number, Node>();
  private toastText = ''; private toastLife = 0;
  private audio: any = null; private sound = true; private lowMotion = false;
  private frameCount = 0; private frameSeconds = 0; private fps = 0;

  onLoad() {
    profiler.hideStats();
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
    this.node.getComponent(UITransform)?.setContentSize(720,1280);
    this.bg = this.layer('Ground');
    this.worldNode = new Node('World'); this.worldNode.layer=Layers.Enum.UI_2D; this.node.addChild(this.worldNode); this.worldNode.addComponent(UITransform).setContentSize(720,1280);
    this.world = this.layer('World drawing', this.worldNode);
    this.fx = this.layer('Effects'); this.hud = this.layer('HUD');
    this.labels.brand = this.label(this.node, '末日列车', -310, 570, 29, C.cream, 350, 'left');
    this.labels.tag = this.label(this.node, '荒原突围  /  01', -310, 535, 15, C.muted, 350, 'left');
    this.labels.time = this.label(this.node, '00:00', 224, 570, 26, C.cream, 115);
    this.labels.hp = this.label(this.node, '装甲  100', -310, 475, 17, C.cream, 240, 'left');
    this.labels.kills = this.label(this.node, '击破  0', 212, 475, 17, C.gold, 175);
    this.labels.stage = this.label(this.node, '', 0, 415, 16, C.teal, 650);
    this.labels.form = this.label(this.node, '', 0, -442, 25, C.cream, 620);
    this.labels.hint = this.label(this.node, '', 0, -479, 17, C.muted, 640);
    this.labels.footer = this.label(this.node, '声音 开', -236, -577, 17, C.muted, 170);
    this.labels.motion = this.label(this.node, '震动 开', 0, -577, 17, C.muted, 170);
    this.labels.pause = this.label(this.node, '暂停 Ⅱ', 236, -577, 17, C.cream, 160);
    this.labels.toast = this.label(this.node, '', 0, 332, 25, C.gold, 680);
    this.overlayNode = new Node('Panels'); this.overlayNode.layer=Layers.Enum.UI_2D; this.node.addChild(this.overlayNode);
    this.overlayNode.addComponent(UITransform).setContentSize(720,1280);
    this.overlay = this.overlayNode.addComponent(Graphics);
    this.node.on(Node.EventType.TOUCH_END, this.touch, this);
    game.on(EngineGame.EVENT_HIDE, this.hide, this);
    try { const saved = globalThis.localStorage?.getItem('doomsday-settings'); if(saved){const v=JSON.parse(saved);this.sound=v.sound!==false;this.lowMotion=!!v.lowMotion;} } catch {}
    resources.load('art/locomotive/spriteFrame', SpriteFrame, (err,frame) => {
      if (err || !this.isValid) return;
      this.loco = this.sprite('Locomotive', frame, 174, 261, this.worldNode); this.loco.setPosition(0,235,0);
    });
    resources.load('art/zombie/spriteFrame', SpriteFrame, (err,frame) => { if (!err && this.isValid) this.zombieFrame = frame; });
    // Read-only diagnostic snapshot for smoke checks, without exposing state mutation.
    (globalThis as any).__doomsday = { snapshot: () => ({ phase:this.model.phase, form:this.model.form,
      time:this.model.time, hp:this.model.hp, kills:this.model.kills, enemies:this.model.enemies.length,
      vortices:this.model.vortices.length, seed:this.model.initialSeed, fps:this.fps,
      art:{ locomotive:!!this.loco,zombie:!!this.zombieFrame }, events:this.model.events.slice() }) };
  }
  onDestroy() {
    game.off(EngineGame.EVENT_HIDE, this.hide, this);
    this.node.off(Node.EventType.TOUCH_END, this.touch, this);
    this.audio?.close?.(); delete (globalThis as any).__doomsday;
  }
  private hide() { this.model.pause(); }
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
  private rect(g:Graphics,x:number,y:number,w:number,h:number,color:string,r=0) {
    g.fillColor=new Color(color);if(r)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);g.fill();
  }
  private circle(g:Graphics,x:number,y:number,r:number,color:string) {g.fillColor=new Color(color);g.circle(x,y,r);g.fill();}
  private line(g:Graphics,points:number[],color:string,width=2) {
    g.strokeColor=new Color(color);g.lineWidth=width;g.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke();
  }
  private begin() {
    this.unlockAudio();this.model.start(this.seed++);this.particles=[];this.toast('清出一条路');this.tone(180,.15);
  }
  private touch(event: EventTouch) {
    this.unlockAudio();
    const p=event.getUILocation(), local=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
    for(let i=this.hitAreas.length-1;i>=0;i--){const a=this.hitAreas[i];if(Math.abs(local.x-a.x)<=a.w/2&&Math.abs(local.y-a.y)<=a.h/2){a.action();this.tone(470,.045);return;}}
    if(local.y < -540) {
      if(local.x < -120) this.sound=!this.sound;
      else if(local.x<120) this.lowMotion=!this.lowMotion;
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
    const delta=Math.min(dt,.1);this.model.advance(delta);
    if(this.model.phase==='combat'||this.model.phase==='menu')this.visualTime+=delta;
    this.frameCount++;this.frameSeconds+=dt;if(this.frameSeconds>=1){this.fps=Math.round(this.frameCount/this.frameSeconds);this.frameCount=0;this.frameSeconds=0;}
    this.toastLife=Math.max(0,this.toastLife-delta);this.shake=Math.max(0,this.shake-delta*20);
    const frozen=['paused','reward','arrange','upgrade'].includes(this.model.phase);
    if(!frozen)for(const p of this.particles){p.life-=delta;p.x+=p.vx*delta;p.y+=p.vy*delta;p.vx*=.96;p.vy*=.96;}
    this.particles=this.particles.filter(p=>p.life>0);
    let killSound=false;
    for(const e of this.model.effects.splice(0)) {
      const count=e.type==='upgrade'?40:e.type==='kill'?5:9;
      const color=e.type==='kill'?C.gold:e.type==='damage'?C.red:e.type==='upgrade'?C.teal:C.gold;
      for(let i=0;i<count&&this.particles.length<230;i++){
        const a=(i/count)*Math.PI*2+this.visualTime, speed=e.type==='upgrade'?150:45+Math.random()*100;
        this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.4+Math.random()*.3,max:.7,size:e.type==='kill'?3:5,color});
      }
      if(e.type==='kill')killSound=true;
      if(e.type==='damage'){this.shake=6;this.tone(65,.15,'triangle');}
      if(e.type==='upgrade'){this.shake=8;this.tone(660,.35,'triangle');}
      if(e.type==='fire')this.tone(100,.09,'triangle');
    }
    if(killSound)this.tone(130,.06,'triangle');
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
    const g=this.world;g.clear();const m=this.model;
    const ids=new Set(m.enemies.map(e=>e.id));
    for(const [id,n]of this.enemySprites)if(!ids.has(id)){n.destroy();this.enemySprites.delete(id);}
    for(const e of m.enemies){
      const size=e.kind===2?45:e.kind===1?30:35;
      this.circle(g,e.x+3,e.y-5,size*.42,'#142321');
      if(this.zombieFrame){
        let n=this.enemySprites.get(e.id);if(!n){n=this.sprite('Enemy',this.zombieFrame,size*1.5,size*1.5,this.worldNode);this.enemySprites.set(e.id,n);}
        n.setPosition(e.x,e.y,0);n.angle=Math.atan2(-e.x,40-e.y)*180/Math.PI;
        n.getComponent(Sprite)!.color=new Color(e.flash>0?'#FFF4DA':e.kind===2?'#D2AD78':e.kind===1?'#BAE899':'#FFFFFF');
      }else{
        this.circle(g,e.x,e.y, size*.39,e.flash>0?C.cream:e.kind===2?'#9A9872':'#809D69');
        this.rect(g,e.x-size*.4,e.y-14,size*.8,14,e.kind===1?'#73624A':'#45544C',5);
        this.circle(g,e.x-5,e.y+4,2,'#EBB35B');this.circle(g,e.x+5,e.y+4,2,'#EBB35B');
      }
      if(e.hp<e.maxHp){this.rect(g,e.x-16,e.y+26,32,3,'#152325');this.rect(g,e.x-16,e.y+26,32*Math.max(0,e.hp/e.maxHp),3,C.red);}
    }
    this.car(g,210);this.car(g,40);this.car(g,-90);
    if(!this.loco){
      this.rect(g,-41,190,82,89,'#5A7772',12);this.rect(g,-31,229,62,32,'#152E35',6);
      this.line(g,[-25,234,-25,254,25,254],C.teal,3);this.rect(g,-45,168,90,17,C.gold,4);
      for(let i=0;i<5;i++)this.line(g,[-38+i*18,168,-28+i*18,185],'#343D34',6);
    }
    // Sprites sit on their own railcars; moving weapon parts are drawn separately.
    this.circle(g,0,40,33,'#172A30');this.circle(g,0,40,26,'#778C80');this.circle(g,0,40,17,'#364C4B');
    const angle=Math.atan2(m.aim.y-40,m.aim.x),dx=Math.cos(angle),dy=Math.sin(angle);
    this.line(g,[0,40,dx*46,40+dy*46],'#1B2A2B',24);
    this.line(g,[0,40,dx*46,40+dy*46],'#B8A77E',15);
    this.line(g,[dx*28,40+dy*28,dx*49,40+dy*49],C.gold,18);
    if(m.form!=='flame'){
      this.circle(g,0,-90,33,'#172B31');this.circle(g,0,-90,29,'#688C88');
      for(let i=0;i<4;i++){const a=this.visualTime*15+i*Math.PI/2;this.line(g,[Math.cos(a)*6,-90+Math.sin(a)*6,Math.cos(a+.36)*24,-90+Math.sin(a+.36)*24],C.teal,12);}
      this.circle(g,0,-90,8,'#E3C787');this.line(g,[0,-32,0,-11],C.teal,5);
      this.circle(g,0,-24,5,C.gold);
    }else{
      this.line(g,[-20,-90,20,-90],C.muted,3);this.line(g,[0,-110,0,-70],C.muted,3);
    }
    if(m.phase==='arrange'){
      g.lineWidth=4;g.strokeColor=new Color(C.teal);g.roundRect(-61,-153,122,126,14);g.stroke();
    }
    if(m.form==='flame'&&m.fireFlash>0&&m.phase!=='menu'){
      g.fillColor=new Color(255,128,40,135);
      g.moveTo(dx*35,40+dy*35);
      for(let i=0;i<=12;i++){const a=angle-.42+i*.07,r=220+Math.sin(this.visualTime*45+i)*18;g.lineTo(Math.cos(a)*r,40+Math.sin(a)*r);}
      g.close();g.fill();this.line(g,[dx*30,40+dy*30,dx*170,40+dy*170],'#FFDC7A',13);
    }
    for(const v of m.vortices)this.drawVortex(g,v.x,v.y,v.radius,this.visualTime*9+v.id);
    // Foreground embers make the moving attack easy to follow.
  }
  private drawVortex(g:Graphics,x:number,y:number,r:number,spin:number) {
    this.circle(g,x,y,r*.84,'#D45428');this.circle(g,x,y,r*.62,'#EE872E');
    for(let j=0;j<3;j++){
      const points:number[]=[];
      for(let i=0;i<20;i++){const a=spin+j*Math.PI*2/3+i*.18,rr=r*(.15+i*.035);points.push(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}
      this.line(g,points,j===1?'#FFE6A1':'#FFC05A',Math.max(5,r*.13));
    }
    this.circle(g,x,y,r*.16,'#FFF2C2');
    for(let i=0;i<5;i++){const a=spin*.5+i*1.256;this.circle(g,x+Math.cos(a)*r*1.06,y+Math.sin(a)*r*1.06,3,C.gold);}
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
    this.labels.stage.string=m.time>=50?'最后封锁  ·  冲出去！':m.time>=25?'尸潮升级  ·  全火力推进':m.time>=8?'改装完成  ·  火力释放':'前方发现尸群';
    this.labels.form.string={flame:'喷火车',tornado:'火焰龙卷',twin:'双生龙卷',giant:'巨型龙卷'}[m.form];
    this.labels.hint.string=m.phase==='arrange'?'点一下发光车位，接上风扇':m.time<8?'突破尸潮，寻找改装补给':m.time<25?'下一份补给：选择龙卷进化':'守住列车，突破最后封锁';
    this.labels.footer.string=`声音 ${this.sound?'开':'关'}`;this.labels.motion.string=`震动 ${this.lowMotion?'关':'开'}`;
    this.labels.pause.string=m.phase==='paused'?'继续 ▶':'暂停 Ⅱ';
    this.labels.toast.string=this.toastLife>0?this.toastText:'';
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
      this.circle(g,0,53,57,'#304D50');
      for(let i=0;i<4;i++){const a=i*Math.PI/2;this.line(g,[Math.cos(a)*10,53+Math.sin(a)*10,Math.cos(a+.4)*42,53+Math.sin(a+.4)*42],C.teal,19);}
      this.circle(g,0,53,13,C.gold);
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
