import { _decorator, Component, Node, Graphics, Color, UITransform, Label, Vec3, EventTouch,
  resources, SpriteFrame, Sprite, view, ResolutionPolicy, game, Game as EngineGame, Layers, profiler, Material, gfx, Rect, EffectAsset, Vec4, Vec2 } from 'cc';
import { Combat, SLOT_Y } from './Combat';
import { renderPanel } from './PanelRenderer';
import { CARS, RECIPES, CarType, ModId } from './Catalog';
const { ccclass } = _decorator;
const C = { ink: '#1D1D2E', panel: '#302D43', edge: '#625C78', gold: '#E6B99D', cream: '#F0DFD0', muted: '#B9B3C4', teal: '#A8DADE', red: '#EA937F' };
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
  private atlas = false; private atlasPage = 0; private atlasCars = true;
  private knownRecipes = new Set<string>(); private newRecipes = new Set<string>();
  private carIcons = new Map<CarType,SpriteFrame>();
  private weaponFrames = new Map<CarType,SpriteFrame>();
  private weaponSprites = new Map<number,Node>();
  private hullFrame:SpriteFrame|null=null;
  private menuFrame:SpriteFrame|null=null;
  private groundArt:Node|null=null;
  private menuArt:Node|null=null;
  private paperArt:Node|null=null;
  private unitMaterial:Material|null=null;
  private unitAtlas:SpriteFrame|null=null;
  private expansionAtlas:SpriteFrame|null=null;
  private enemyFrames=new Map<number,SpriteFrame>();
  private unitFrames=new Set<SpriteFrame>();
  private unitPivots=new Map<SpriteFrame,[number,number]>();
  private slicedFrames:SpriteFrame[]=[];
  private fxFrames:SpriteFrame[]=[];
  private flameFrames:SpriteFrame[]=[];
  private modFrames=new Map<ModId|'repair',SpriteFrame>();
  private fxPool:Node[]=[];
  private fxUsed=0;
  private flowMaterial:Material|null=null;
  private flowParams=new Vec4(0,1,0,0);
  private readonly slotY = SLOT_Y;
  private readonly combatOffset=-(SLOT_Y[0]+SLOT_Y[SLOT_Y.length-1])/2;
  private entranceRemaining=0;
  private supportEffects: {type:string;x:number;y:number;dx:number;dy:number;size:number;life:number;max:number;color?:string;recipeId?:string}[] = [];

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
    this.labels.brand = this.label(this.node, '末日列车', -310, 570, 32, C.cream, 350, 'left','display');
    this.labels.tag = this.label(this.node, '余晖防线  /  01', -310, 535, 20, C.muted, 350, 'left');
    this.labels.time = this.label(this.node, '00:00', 224, 570, 26, C.cream, 115);
    this.labels.hp = this.label(this.node, '装甲  100', -310, 475, 23, C.cream, 240, 'left');
    this.labels.kills = this.label(this.node, '击破  0', 212, 475, 23, C.gold, 175);
    this.labels.stage = this.label(this.node, '', 0, 415, 22, C.teal, 650);
    this.labels.form = this.label(this.node, '', 0, -442, 25, C.cream, 620);
    this.labels.hint = this.label(this.node, '', -307, -484, 21, C.muted, 425, 'left');
    this.labels.reorder = this.label(this.node, '调整车序', 222, -483, 27, C.teal, 190, 'center','display');
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
    try {
      const current=globalThis.localStorage?.getItem('doomsday-recipes-v04');
      const saved=JSON.parse(current??globalThis.localStorage?.getItem('doomsday-recipes-v03')??'[]');
      if(Array.isArray(saved))for(const oldId of saved){
        // The old reverse wind/fire recipe is now the single order-independent recipe.
        const id=current===null?(oldId==='fan-flame'?'flame-fan':oldId==='flame-fan'?null:oldId):oldId;
        if(RECIPES.some(r=>r.id===id))this.knownRecipes.add(id);
      }
      globalThis.localStorage?.setItem('doomsday-recipes-v04',JSON.stringify(Array.from(this.knownRecipes)));
    }catch{}
    this.loadAfterglowArt();
    // Read-only diagnostic snapshot for smoke checks, without exposing state mutation.
    (globalThis as any).__doomsday = { snapshot: () => ({ phase:this.model.phase,
      time:this.model.time,wave:this.model.wave,entranceRemaining:this.entranceRemaining,cameraY:this.worldNode.position.y, hp:this.model.hp, kills:this.model.kills, enemies:this.model.enemies.length,
      vortices:this.model.vortices.length, shield:this.model.shieldHp,maxShield:this.model.maxShield, seed:this.model.initialSeed, fps:this.fps, speed:this.debugSpeed,
      slots:this.model.slots.map((c,i)=>c?{id:c.id,type:c.type,level:c.level,mods:{...c.mods},range:this.model.getCarRange(i),angle:c.angle}:null),
      links:this.model.links.map(l=>({index:l.index,id:l.recipe.id,driver:l.driver,support:l.support})),pendingCar:this.model.pendingCar,
      offers:this.model.offers.slice(),scrap:this.model.scrap,nextScrap:this.model.nextScrap,supplyCount:this.model.supplyCount,
      knownRecipes:Array.from(this.knownRecipes),linkLevel:this.model.linkLevel,
      maxHp:this.model.maxHp,boss:this.model.boss?{hp:this.model.boss.hp,maxHp:this.model.boss.maxHp}:null,
      bossCharge:this.model.bossCharge,endReason:this.model.endReason,
       art:{style:'afterglow',paper:!!this.paperArt,flow:!!this.flowMaterial,enemyKinds:Array.from(this.enemyFrames.keys()),menu:!!this.menuFrame,ground:!!this.groundArt,unitMaterial:!!this.unitMaterial,fx:this.fxFrames.length,flame:this.flameFrames.length,mods:this.modFrames.size,activeFx:this.fxUsed,locomotive:!!this.loco,headVisible:!!this.loco?.active,zombie:!!this.zombieFrame,hull:!!this.hullFrame,weapons:Array.from(this.weaponFrames.keys()) },
      effects:{particles:this.particles.length,defeated:this.defeated.length,chain:this.chain,
        feeds:this.supportEffects.filter(e=>e.type==='feed').map(e=>({fromY:e.y,toY:e.y+e.dy,life:e.life}))}, events:this.model.events.slice() }) };
  }
  onDestroy() {
    game.off(EngineGame.EVENT_HIDE, this.hide, this);
    this.node.off(Node.EventType.TOUCH_END, this.touch, this);
    this.audio?.close?.(); delete (globalThis as any).__doomsday;
    this.fireMaterial?.destroy();
    this.unitMaterial?.destroy();
    this.flowMaterial?.destroy();
    for(const frame of this.slicedFrames)frame.destroy();
  }
  private hide() { this.model.pause(); }
  private group(name:string,parent:Node) {const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(720,1280);return n;}
  private layer(name: string, parent=this.node) { const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(720,1280);return n.addComponent(Graphics); }
  private label(parent: Node, text: string, x: number, y: number, size: number, color: string, width=600, align='center',font:'display'|'body'='body') {
    const n=new Node('Text');n.layer=Layers.Enum.UI_2D; parent.addChild(n); const t=n.addComponent(UITransform);t.setContentSize(width,size*2.7);
    if(align==='left')t.setAnchorPoint(0,.5);
    n.setPosition(x,y,0);const l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=size*1.35;l.color=new Color(color);
    // Cocos expects one canvas font family, not a CSS fallback list.
    l.fontFamily=font==='display'?'serif':'sans-serif';l.isBold=false;
    l.spacingX=font==='display'?1:.2;l.enableShadow=font==='display';l.shadowColor=new Color(8,10,18,100);l.shadowOffset=new Vec2(0,-1);l.shadowBlur=1;
    l.horizontalAlign=align==='left'?Label.HorizontalAlign.LEFT:Label.HorizontalAlign.CENTER;
    l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;return l;
  }
  private sprite(name: string, frame: SpriteFrame, w: number, h: number, parent: Node) {
    const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);
    const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=frame;
    if(this.unitFrames.has(frame)&&this.unitMaterial)s.customMaterial=this.unitMaterial;
    const pivot=this.unitPivots.get(frame);if(pivot)n.getComponent(UITransform)!.setAnchorPoint(pivot[0],pivot[1]);
    return n;
  }
  private atlasCell(atlas:SpriteFrame,index:number) {
    const texture=atlas.texture,w=texture.width/4,h=texture.height/2;
    const x=Math.round(index%4*w),y=Math.round(Math.floor(index/4)*h);
    const frame=new SpriteFrame();
    frame.reset({texture,rect:new Rect(x,y,Math.round((index%4+1)*w)-x,Math.round((Math.floor(index/4)+1)*h)-y)});
    frame.packable=false;this.slicedFrames.push(frame);return frame;
  }
  private loadAfterglowArt() {
    resources.load('art/afterglow-mods-v07/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Modifier artwork failed',err);return;}if(!this.isValid)return;
      const frames=this.stripFrames(frame,6,3),ids:(ModId|'repair')[]=['caliber','fuel','pressure','voltage','coolant','resonance','railpower','prismfocus','acidpotency','rapid','reach','surge','lanes','scatter','burst','repairkit','capacitor','repair'];
      ids.forEach((id,i)=>this.modFrames.set(id,frames[i]));this.state='';
    });
    resources.load('art/afterglow-support-top-v08/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Support artwork failed',err);return;}if(!this.isValid)return;
      const frames=this.stripFrames(frame,2);
      // Roof-view equipment shares the same camera and green-screen material
      // as the other combat modules; side-view concepts stay in the art archive.
      (['repair','shield'] as CarType[]).forEach((type,i)=>{this.unitFrames.add(frames[i]);this.weaponFrames.set(type,frames[i]);});this.state='';
    });
    resources.load('art/afterglow-flame-v08/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Flame artwork failed',err);return;}if(!this.isValid)return;
      // Generated stages have unequal widths. Crop each full silhouette and
      // exclude the sheet guides instead of truncating them with equal cells.
      this.flameFrames=[[20,170,360,540],[392,170,416,540],[806,170,570,540],[1390,170,370,540]].map(([x,y,w,h])=>{
        const cell=new SpriteFrame(),texture=frame.texture;
        cell.reset({texture,rect:new Rect(x,y,w,h)});cell.packable=false;this.slicedFrames.push(cell);return cell;
      });
    });
    resources.load('art/afterglow-expansion-v06/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Expansion artwork failed',err);return;}if(!this.isValid)return;
      this.expansionAtlas=frame;this.finishExpansionArt();
    });
    resources.load('art/afterglow-paper-v2/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Painted paper failed',err);return;}if(!this.isValid)return;
      this.paperArt=this.sprite('Gouache panel ground',frame,720,1280,this.node);
      this.paperArt.setSiblingIndex(this.hud.node.getSiblingIndex());this.paperArt.active=false;this.state='';
    });
    resources.load('afterglow-flow',EffectAsset,(err,effect)=>{
      if(err){console.error('Flow material failed',err);return;}if(!this.isValid)return;
      this.flowMaterial=new Material();this.flowMaterial.initialize({effectAsset:effect,defines:{USE_TEXTURE:true}});
      for(const n of this.fxPool)n.getComponent(Sprite)!.customMaterial=this.flowMaterial;
    });
    resources.load('art/afterglow-menu/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Menu artwork failed',err);return;}if(!this.isValid)return;
      this.menuFrame=frame;
      this.menuArt=this.sprite('Afterglow menu',frame,720,1280,this.node);
      this.menuArt.setSiblingIndex(this.overlayNode.getSiblingIndex());this.menuArt.active=false;this.state='';
    });
    resources.load('art/afterglow-ground/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Terrain artwork failed',err);return;}if(!this.isValid)return;
      this.groundArt=this.sprite('Painted ground',frame,720,1000,this.node);this.groundArt.setSiblingIndex(0);
    });
    resources.load('art/afterglow-units-v06/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Unit artwork failed',err);return;}if(!this.isValid)return;
      this.unitAtlas=frame;this.finishUnitArt();
    });
    resources.load('afterglow-key',EffectAsset,(err,effect)=>{
      if(err){console.error('Unit material failed',err);return;}if(!this.isValid)return;
      this.unitMaterial=new Material();this.unitMaterial.initialize({effectAsset:effect,defines:{USE_TEXTURE:true}});this.finishUnitArt();this.finishExpansionArt();
      for(const parent of [this.trainLayer,this.overlayNode])for(const n of parent.children){const s=n.getComponent(Sprite);if(s?.spriteFrame&&this.unitFrames.has(s.spriteFrame))s.customMaterial=this.unitMaterial;}
    });
    resources.load('art/afterglow-fx-v06/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Effect artwork failed',err);return;}if(!this.isValid)return;
      this.fxFrames=Array.from({length:8},(_,i)=>this.atlasCell(frame,i));this.state='';
    });
  }
  private finishUnitArt() {
    if(!this.unitAtlas||!this.unitMaterial||this.hullFrame)return;
    const frames=Array.from({length:8},(_,i)=>this.atlasCell(this.unitAtlas!,i));
    for(const frame of frames)this.unitFrames.add(frame);
    const pivots:[number,number][]=[[.54,.47],[.44,.435],[.48,.435],[.34,.435],[.535,.57],[.485,.55],[.425,.605],[.33,.57]];
    frames.forEach((frame,i)=>this.unitPivots.set(frame,pivots[i]));
    this.hullFrame=frames[0];
    (['cannon','fan','flame','tesla','cryo'] as CarType[]).forEach((type,i)=>this.weaponFrames.set(type,frames[i+1]));
    this.zombieFrame=frames[6];
    this.loco=this.sprite('Locomotive',frames[7],124,155,this.trainLayer);this.loco.angle=180;this.state='';
  }
  private finishExpansionArt() {
    if(!this.expansionAtlas||!this.unitMaterial||this.enemyFrames.size)return;
    const frames=Array.from({length:8},(_,i)=>this.atlasCell(this.expansionAtlas!,i));
    for(const frame of frames)this.unitFrames.add(frame);
    this.unitPivots.set(frames[0],[241/444,1-301/444]);
    (['rail','prism','acid'] as CarType[]).forEach((type,i)=>this.weaponFrames.set(type,frames[i]));
    this.enemyFrames.set(0,frames[3]);this.enemyFrames.set(1,frames[3]);
    this.enemyFrames.set(6,frames[4]);this.enemyFrames.set(7,frames[5]);this.enemyFrames.set(8,frames[6]);
    for(const kind of [2,3,4,5])this.enemyFrames.set(kind,frames[7]);
    for(const n of this.enemySprites.values())n.destroy();this.enemySprites.clear();this.state='';
  }
  /** Reuse effect sprites; their black source canvas vanishes through additive blending. */
  private stripFrames(atlas:SpriteFrame,columns:number,rows=1) {
    return Array.from({length:columns*rows},(_,i)=>{const frame=new SpriteFrame(),texture=atlas.texture;
      const column=i%columns,row=Math.floor(i/columns),x=Math.round(texture.width*column/columns),right=Math.round(texture.width*(column+1)/columns);
      const y=Math.round(texture.height*row/rows),bottom=Math.round(texture.height*(row+1)/rows);
      frame.reset({texture,rect:new Rect(x,y,right-x,bottom-y)});frame.packable=false;this.slicedFrames.push(frame);return frame;});
  }
  private artEffect(index:number,x:number,y:number,w:number,h=w,angle=0,alpha=1,tint='#FFFFFF') {
    const frame=index>=8?this.flameFrames[index-8]:this.fxFrames[index];if(!frame||this.fxUsed>=100)return false;
    let n=this.fxPool[this.fxUsed];
    if(!n){n=this.sprite('Painted effect',frame,w,h,this.vortexLayer);if(this.flowMaterial)n.getComponent(Sprite)!.customMaterial=this.flowMaterial;else this.emission(n.getComponent(Sprite)!);this.fxPool.push(n);}
    this.fxUsed++;n.active=true;n.setPosition(x,y,0);n.angle=angle;n.setScale(1,1,1);
    n.getComponent(UITransform)!.setContentSize(w,h);
    const sprite=n.getComponent(Sprite)!;sprite.spriteFrame=frame;
    if(index>=8||!this.flowMaterial)this.emission(sprite);else sprite.customMaterial=this.flowMaterial;
    const color=new Color(tint);color.a=Math.round(255*Math.max(0,Math.min(1,alpha)));sprite.color=color;
    return true;
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
  /** Fixed, broad pigment patches and broken edges: never frame-random texture. */
  private paintRect(g:Graphics,x:number,y:number,w:number,h:number,color:string) {
    if(w<=0||h<=0)return;
    const e=Math.min(7,h*.13,w*.035);
    this.polygon(g,[x+e,y+2,x+w*.29,y,x+w*.57,y+e*.3,x+w-e,y,x+w,y+h*.36,x+w-e*.6,y+h-e,x+w*.72,y+h,x+w*.4,y+h-e*.4,x+e,y+h,x,y+h*.58],color);
    if(h<18||w<35)return;
    const base=new Color(color),alpha=Math.round(base.a*.09).toString(16).padStart(2,'0');
    this.polygon(g,[x+e,y+h*.56,x+w*.16,y+h*.48,x+w*.42,y+h*.65,x+w*.63,y+h*.62,x+w*.56,y+h-e,x+e,y+h-e],'#E6B99D'+alpha);
    this.polygon(g,[x+w*.53,y+e,x+w*.88,y+e,x+w-e,y+h*.32,x+w*.73,y+h*.42,x+w*.62,y+h*.24],'#A8DADE'+alpha);
    this.line(g,[x+e*2,y+h-e,x+w*.24,y+h-e*1.4,x+w*.43,y+h-e*.7],'#D4BDD033',1);
    this.line(g,[x+w*.65,y+e*.8,x+w*.91,y+e*1.3],'#11162366',1.5);
  }
  private line(g:Graphics,points:number[],color:string,width=2) {
    g.strokeColor=new Color(color);g.lineWidth=width;g.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke();
  }
  private begin() {
    this.unlockAudio();this.model.start(this.seed++,true);this.particles=[];this.chain=0;this.chainLife=0;
    this.entranceRemaining=1;
    this.visualTime=0;this.shake=0;this.emberClock=0;
    this.supportEffects=[];this.selectedSlot=-1;this.atlas=false;this.newRecipes.clear();
    for(const n of this.enemySprites.values())n.destroy();this.enemySprites.clear();
    for(const n of this.fxPool)n.active=false;this.fxUsed=0;
    for(const n of this.carArt.values())n.destroy();this.carArt.clear();
    for(const n of this.weaponSprites.values())n.destroy();this.weaponSprites.clear();
    for(const d of this.defeated)d.node.destroy();this.defeated=[];
    for(const n of this.vortexSprites.values())n.destroy();this.vortexSprites.clear();
    this.toast('击破敌人，收集改装废料');this.tone(180,.15);
  }
  private openWorkshop(slot=-1) {
    if(this.model.openWorkshop()){this.selectedSlot=slot;this.atlas=false;}
  }
  private touch(event: EventTouch) {
    this.unlockAudio();
    const p=event.getUILocation(), local=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
    for(let i=this.hitAreas.length-1;i>=0;i--){const a=this.hitAreas[i];if(Math.abs(local.x-a.x)<=a.w/2&&Math.abs(local.y-a.y)<=a.h/2){a.action();this.tone(470,.045);return;}}
    if(this.model.phase==='combat'&&Math.abs(local.x)<65){
      const worldY=local.y-this.worldNode.position.y;
      const slot=this.slotY.findIndex(y=>Math.abs(y-worldY)<52);
      if(slot>=0){this.openWorkshop(slot);return;}
    }
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
    const entering=this.entranceRemaining>0;
    if(entering&&before==='combat'){
      this.entranceRemaining=Math.max(0,this.entranceRemaining-realDelta*this.debugSpeed);
      if(this.entranceRemaining===0)this.model.startEncounter();
    }
    const elapsed=entering?0:this.model.advance(dt,this.debugSpeed);
    const delta=before==='combat'?(this.model.phase==='combat'?realDelta*this.debugSpeed:elapsed):
      ['menu','win','lose'].includes(before)?realDelta:0;
    if(before==='combat'||before==='menu')this.visualTime+=delta;
    if(this.flowMaterial){this.flowParams.x=this.visualTime;this.flowMaterial.setProperty('flowParams',this.flowParams);}
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
          try{globalThis.localStorage?.setItem('doomsday-recipes-v04',JSON.stringify(Array.from(this.knownRecipes)));}catch{}
        }
        continue;
      }
      if(e.type==='link-feed'){
        const recipe=RECIPES.find(r=>r.id===e.recipeId);
        const support=recipe&&(recipe.a===recipe.executor?recipe.b:recipe.a);
        const color=support?CARS[support].color:C.teal;
        this.supportEffects.push({type:'feed',x:e.x,y:e.y,dx:e.dx??0,dy:e.dy??0,size:20,life:.38,max:.38,color});
        if(this.supportEffects.length>48)this.supportEffects.shift();
        continue;
      }
      if(e.type==='chain-reaction'){
        // A shared driver has multiple live recipes: surface that moment as a
        // distinct beat so the player understands why a dense build spikes.
        this.supportEffects.push({type:'blast',x:e.x,y:e.y,dx:0,dy:0,size:e.size,life:.42,max:.42,recipeId:e.recipeId});
        this.shake=Math.max(this.shake,3);this.tone(180,.16,'sawtooth');
        this.toast('链式共鸣 · 联动增幅');
        continue;
      }
      if(e.type==='link-shot'){
        const recipe=RECIPES.find(r=>r.id===e.recipeId),electric=recipe?.executor==='tesla';
        this.supportEffects.push({type:electric?'tesla':'thermal-shot',x:e.x,y:e.y,dx:e.dx??0,dy:e.dy??0,size:e.size,life:.24,max:.24});
        continue;
      }
      const visualKind=e.type==='focused-flame'&&e.recipeId==='flame-prism'?'prismbeam':({fan:'wind','focused-flame':'beam','burning-arc':'tesla',conduction:'tesla',
        'burn-blast':'blast',thermal:'thermalburst',blizzard:'cryo',shatter:'iceblast'} as Record<string,string>)[e.type]||e.type;
      if(['rail-beam','train-shield','flame','tesla','cryo','wind','beam','prismbeam','blast','thermalburst','slam','iceblast','burn','acid','prism','regen','shield','brood','repair','passive-repair','cannon-impact'].includes(visualKind)){
        const life=e.type==='rail-beam'?.22:e.type==='flame'?.36:e.type==='tesla'?.24:e.type==='repair'?.8:e.type==='cannon-impact'?.38:.5;
        this.supportEffects.push({type:visualKind,x:e.x,y:e.y,dx:e.dx??0,dy:e.dy??0,size:e.size,life,max:life,recipeId:e.recipeId});
        if(this.supportEffects.length>32)this.supportEffects.shift();
        if(e.type==='slam'){this.shake=9;this.tone(55,.25,'triangle');this.toast('首领冲击 · 护住列车');}
        if(e.type==='tesla')this.tone(320,.055,'triangle');
        if(e.type==='repair'){this.toast(`应急维修 · 装甲 +${e.size}`);this.tone(520,.22);}
        if(e.type==='cannon-impact'){this.shake=Math.max(this.shake,2);this.tone(75,.09,'triangle');}
        continue;
      }
      if(e.type==='boss'){this.toast('精英破阵者 · 击破后继续前进');this.tone(95,.4,'triangle');continue;}
      if(e.type==='wave'){
        this.toast(`第 ${this.model.wave} 波 · 敌群正在增强`);
        this.tone(210,.28,'triangle');continue;
      }
      if(e.type==='hit'&&this.supportEffects.length<42)this.supportEffects.push({type:'impact',x:e.x,y:e.y,dx:0,dy:0,size:40,life:.18,max:.18});
      const count=e.type==='upgrade'?40:e.type==='kill'?7:e.type==='hit'?2:9;
      const color=e.type==='kill'?C.gold:e.type==='damage'?C.red:e.type==='upgrade'?C.teal:C.gold;
      for(let i=0;i<count&&this.particles.length<200;i++){
        const a=(i/count)*Math.PI*2+this.visualTime, speed=e.type==='upgrade'?150:45+Math.random()*100;
        this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.4+Math.random()*.3,max:.7,size:e.type==='kill'?3:5,color});
      }
      if(e.type==='kill'){
        frameKills++;
        if(this.zombieFrame&&this.defeated.length<24){
          const size=e.enemyKind===2?67:52,n=this.sprite('Defeated',this.enemyFrames.get(e.enemyKind??0)||this.zombieFrame,size,size,this.enemyLayer);
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
    const cameraY=this.combatOffset-650*Math.pow(this.entranceRemaining,3);
    this.worldNode.setPosition(!this.lowMotion?Math.sin(this.visualTime*85)*this.shake:0,cameraY,0);
    this.fx.node.setPosition(0,cameraY,0);
    if(this.loco){this.loco.active=this.model.phase==='menu'||entering||this.model.time<1.4;this.loco.setPosition(0,235+185*Math.min(1,this.model.time/1.4),0);}
    this.fxUsed=0;
    this.drawGround();this.drawWorld();this.drawEffects();this.drawHUD();
    for(let i=this.fxUsed;i<this.fxPool.length;i++)this.fxPool[i].active=false;
    const nextState=`${this.model.phase}:${this.model.revision}:${this.selectedSlot}:${this.atlas}:${this.atlasPage}:${this.atlasCars}:${this.knownRecipes.size}`;
    if(this.state!==nextState){this.state=nextState;this.drawPanel();}
  }
  private drawGround() {
    const g=this.bg;g.clear();
    if(!this.groundArt)this.rect(g,-360,-640,720,1280,C.ink);
    this.rect(g,-61,-450,122,930,'#181B2D55');
    for(let i=0;i<25;i++){
      const y=((i*40-this.visualTime*66)%1000+1000)%1000-500;
      const tilt=Math.sin(i*7)*2;
      this.paintRect(g,-56,y,112,9,'#242133B8');
      this.line(g,[-52,y+3,-8,y+5+tilt,36,y+4],'#88728B80',2);
    }
    for(const x of [-39,39]){this.line(g,[x,-500,x,500],'#171728',7);this.line(g,[x+1,-500,x+1,500],'#92819B88',2);}
    // Sparse projected coordinates do not compete with the painted terrain.
    for(const x of [-290,290])this.line(g,[x,-380,x,385],'#A8DADE13',1);
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
      const size=e.kind===3?78:e.kind===2||e.kind>=6?46:35;
      this.circle(g,e.x+3,e.y-5,size*.42,'#17162399');
      if((e.slow??0)>0){g.strokeColor=new Color('#8ADDEB88');g.lineWidth=2;g.circle(e.x,e.y,size*.58);g.stroke();}
      if(e.freeze>0){this.polygon(a,[e.x,e.y+size*.7,e.x+size*.55,e.y,e.x,e.y-size*.7,e.x-size*.55,e.y],'#87D9EF66');
        this.line(a,[e.x-size*.3,e.y+size*.15,e.x,e.y-size*.3,e.x+size*.22,e.y+size*.3],'#E7FFFF',2);}
      if(e.kind===3){
        a.strokeColor=new Color('#F4785F33');a.lineWidth=10;a.circle(e.x,e.y,60);a.stroke();
        a.strokeColor=new Color(m.bossCharge>.72?C.red:C.gold);a.lineWidth=4;a.arc(e.x,e.y,60,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.01,m.bossCharge),false);a.stroke();
      }
      const enemyFrame=this.enemyFrames.get(e.kind)||this.zombieFrame;
      if(enemyFrame){
        let n=this.enemySprites.get(e.id);if(!n){n=this.sprite('Enemy',enemyFrame,size*1.5,size*1.5,this.enemyLayer);this.enemySprites.set(e.id,n);}
        const gait=e.freeze>0?0:Math.sin(this.visualTime*12+e.id*2.4);
        n.setPosition(e.x,e.y+gait*1.6,0);n.angle=(Math.atan2(-e.y,-e.x)+Math.PI/2)*180/Math.PI+gait*5;
        n.setScale(e.flash>0?1.1:1,e.flash>0?1.1:1,1);
        n.getComponent(Sprite)!.color=new Color(e.kind===3?'#F5906B':e.kind===2?'#B9C4D0':e.kind===4?'#FFAF62':e.kind===5?'#B394D9':'#FFFFFF');
      }else this.circle(g,e.x,e.y,size*.4,e.kind===4?C.gold:C.muted);
      if(e.kind===2||e.kind===4||e.kind===5){
        const color=e.kind===2?'#D2DFE5':e.kind===4?'#FFA552':'#C9A1ED';
        this.line(a,[e.x-8,e.y+24,e.x,e.y+32,e.x+8,e.y+24,e.x,e.y+17,e.x-8,e.y+24],color,3);
      }
      if(e.hp<e.maxHp&&e.kind!==3){this.rect(a,e.x-16,e.y-29,32,4,'#102023',2);this.rect(a,e.x-16,e.y-29,32*Math.max(0,e.hp/e.maxHp),4,C.red,2);}
      if((e.barrier??0)>0){
        const ward:number[]=[];
        for(let j=0;j<=10;j++){const q=-.2+j*.36,r=size*.62+Math.sin(j*2.3)*2;ward.push(e.x+Math.cos(q)*r,e.y+Math.sin(q)*r);}
        this.line(a,ward,'#BED8E2AA',2);
      }
      if((e.corrosion??0)>0)this.paintRect(a,e.x-14,e.y-19,28,7,'#C9BE86B0');
    }
    if(!this.loco&&(this.entranceRemaining>0||m.time<1.4)){this.rect(g,-35,210,70,92,'#5A7772',12);this.rect(g,-28,256,56,28,'#152E35',6);}
    const carIds=new Set(m.slots.map((c,i)=>c?c.id:-i-1));
    for(const [id,n]of this.carArt)if(!carIds.has(id)){n.destroy();this.carArt.delete(id);}
    for(const [id,n]of this.weaponSprites)if(!carIds.has(id)){n.destroy();this.weaponSprites.delete(id);}
    m.slots.forEach((car,i)=>{
      const y=this.slotY[i];
      if(!this.hullFrame)this.car(g,y);
      const hull=this.hullFrame||this.carriageFrame;
      const carId=car?car.id:-i-1;
      if(hull){let n=this.carArt.get(carId);if(!n){n=this.sprite('Carriage',hull,170,144,this.trainLayer);this.carArt.set(carId,n);}n.getComponent(Sprite)!.spriteFrame=hull;n.setPosition(0,y,0);n.getComponent(Sprite)!.color=new Color(car?'#FFFFFF':'#9E96AD');}
      if(!car){this.line(d,[-8,y,8,y],C.cream,1.5);this.line(d,[0,y-8,0,y+8],C.cream,1.5);return;}
      const angle=m.getRenderAngle(i);
      const accent=CARS[car.type].color;
      this.line(d,[-40,y-38,-40,y-27],accent+'99',2);
      const weapon=this.weaponFrames.get(car.type);
      if(weapon){
        let n=this.weaponSprites.get(car.id);
        if(!n){const size=car.type==='fan'?109:117;n=this.sprite('Weapon',weapon,size,size,this.trainLayer);this.weaponSprites.set(car.id,n);}
        const directional=car.type==='cannon'||car.type==='flame'||car.type==='rail',recoil=directional?Math.sin(Math.min(1,car.flash/.15)*Math.PI*.85)*6:0;
        n.angle=car.type==='fan'?this.visualTime*420:directional?angle*180/Math.PI-(car.type==='rail'?90:0):0;
        n.setPosition(-Math.cos(angle)*recoil,y-Math.sin(angle)*recoil,0);
        const pulse=directional||car.type==='fan'?1:1+car.flash*.22;n.setScale(pulse,pulse,1);
      }else{this.circle(d,0,y,34,'#0C1D2290');this.drawCarModule(d,car.type,0,y,1,angle);}
      if(car.flash>0){
        if(car.type==='cannon'||car.type==='rail'){
          const mx=Math.cos(angle)*53,my=y+Math.sin(angle)*53;
          const rail=car.type==='rail';
          this.artEffect(5,mx,my,rail?94:64,rail?20:58,angle*180/Math.PI,car.flash/.15,rail?'#B9EBEC':'#EDB080');
        }
      }
      if(car.level>0)for(let j=0;j<Math.min(7,car.level);j++)this.circle(d,-31+j*10,y-39,3,C.gold);
    });
    for(const link of m.links){
      const y=(this.slotY[link.index]+this.slotY[link.index+1])/2;
      const known=this.knownRecipes.has(link.recipe.id);
      this.line(d,[-8,y-7,-8,y+7],known?C.teal:C.gold,4);this.line(d,[8,y-7,8,y+7],known?C.teal:C.gold,4);
      this.circle(d,0,y,4,known?C.cream:C.gold);
      const toward=this.slotY[link.driver]>this.slotY[link.support]?1:-1;
      this.line(d,[-5,y-toward*3,0,y+toward*3,5,y-toward*3],known?C.teal:C.gold,2);
      const side=toward>0?-67:67,sourceY=this.slotY[link.support],targetY=this.slotY[link.driver];
      this.line(d,[0,sourceY,side,sourceY,side,targetY,0,targetY],'#7BB5A633',2);
    }
    for(const p of m.projectiles){
      if(p.beam)continue;
      const color=p.corrosion?'#D4C78B':p.element==='ice'?'#B5DFEA':p.kind==='pierce'?'#C9BDDB':p.element==='fire'?'#E9B191':p.element==='electric'?C.teal:C.gold;
      const length=Math.max(1,Math.hypot(p.dx,p.dy));
      const trail=p.kind==='pierce'?54:p.kind==='shatter'?32:22;
      const angle=Math.atan2(p.dy,p.dx)*180/Math.PI;
      const dx=p.dx/length,dy=p.dy/length;
      if(p.kind==='pierce'){
        this.artEffect(0,p.x-dx*58,p.y-dy*58,156,13,angle,.8,'#B3DEEA');
        this.line(a,[p.x-dx*112,p.y-dy*112,p.x+dx*7,p.y+dy*7],'#A8DADE66',5);
        this.line(a,[p.x-dx*70,p.y-dy*70,p.x+dx*7,p.y+dy*7],'#EFF4E5',1.8);
        for(const side of[-1,1])this.line(a,[p.x-dx*76-dy*side*5,p.y-dy*76+dx*side*5,p.x-dx*32-dy*side*4,p.y-dy*32+dx*side*4],'#C0B2DB88',1);
        continue;
      }
      if(p.kind==='cannon'){
        this.artEffect(0,p.x-dx*10,p.y-dy*10,33,26,angle,.9,color);
        for(let j=1;j<=3;j++){
          const drift=Math.sin(p.id+j)*j*1.7,tail=j*10;
          this.line(a,[p.x-dx*tail-dy*drift,p.y-dy*tail+dx*drift,p.x-dx*(tail+5)-dy*drift,p.y-dy*(tail+5)+dx*drift],j===1?'#E6B99DBB':'#BC9DA45A',6-j);
        }
        const r=Math.max(5,p.radius);
        this.polygon(a,[p.x+dx*r,p.y+dy*r,p.x-dy*r*.7,p.y+dx*r*.7,p.x-dx*r,p.y-dy*r,p.x+dy*r*.65,p.y-dx*r*.65],'#E6B99D');
        this.line(a,[p.x+dx*r*.6,p.y+dy*r*.6,p.x-dy*r*.4,p.y+dx*r*.4],'#FFF0CA',3);
        continue;
      }
      for(let j=1;j<=4;j++){
        const tail=j*11,wave=Math.sin(this.visualTime*32+p.id+j)*j*.6;
        this.line(a,[p.x-dx*tail-dy*wave,p.y-dy*tail+dx*wave,p.x-dx*(tail+7)-dy*wave,p.y-dy*(tail+7)+dx*wave],color+(j<3?'99':'44'),Math.max(1,4-j));
      }
      if(this.artEffect(0,p.x-p.dx/length*15,p.y-p.dy/length*15,p.kind==='pierce'?100:66,32,angle,.9,color)){
        if(p.kind==='shatter')this.artEffect(2,p.x,p.y,34,34,angle,.6);
        continue;
      }
      this.line(a,[p.x-p.dx/length*trail,p.y-p.dy/length*trail,p.x,p.y],color+'44',12);
      this.line(a,[p.x-p.dx/length*trail,p.y-p.dy/length*trail,p.x,p.y],color,3);
      if(p.kind==='pierce'){a.strokeColor=new Color(color);a.lineWidth=2;a.circle(p.x,p.y,13);a.stroke();}
      if(p.kind==='shatter')this.polygon(a,[p.x,p.y+13,p.x+9,p.y,p.x,p.y-13,p.x-9,p.y],color+'AA');
      this.circle(a,p.x,p.y,Math.max(4,Math.min(9,p.radius)),C.cream);
    }
    const vortexIds=new Set(m.vortices.map(v=>v.id));
    for(const [id,n]of this.vortexSprites)if(!vortexIds.has(id)){n.destroy();this.vortexSprites.delete(id);}
    for(const v of m.vortices){
      const fade=Math.min(1,v.life/.3),spin=this.visualTime*9+v.id;
      if(v.element==='electric'){
        const bloom=Math.min(1,v.age/.22),pulse=1+Math.sin(spin*1.3)*.09;
        if(this.artEffect(6,v.x,v.y,v.radius*2.2*pulse*bloom,v.radius*1.7/pulse*bloom,spin*26,.42*fade)){
          this.artEffect(6,v.x,v.y,v.radius*1.3*bloom,v.radius*1.3*bloom,-spin*43,.28*fade);
          for(let j=0;j<4;j++){
            const q=spin*1.4+j*Math.PI/2,r=v.radius*(.55+.2*Math.sin(q*1.7));
            this.ribbon(a,v.x,v.y,q,r,3,spin+j,'#C0B2DB99');
            this.circle(a,v.x+Math.cos(q)*r,v.y+Math.sin(q)*r,2,C.teal);
          }
          continue;
        }
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
    else if(type==='rail')this.drawRail(g,x,y,scale,angle);
    else if(type==='prism')this.drawPrism(g,x,y,scale);
    else if(type==='acid')this.drawAcid(g,x,y,scale);
    else if(type==='repair')this.drawRepair(g,x,y,scale);
    else if(type==='shield')this.drawShield(g,x,y,scale);
    else{
      this.circle(g,x,y,29*scale,'#253B40');this.circle(g,x,y,23*scale,'#84958C');
      const dx=Math.cos(angle),dy=Math.sin(angle);
      this.line(g,[x-dx*13*scale,y-dy*13*scale,x+dx*48*scale,y+dy*48*scale],'#16292F',22*scale);
      this.line(g,[x,y,x+dx*46*scale,y+dy*46*scale],'#ADAB84',12*scale);
      this.circle(g,x-dx*10*scale,y-dy*10*scale,10*scale,'#4C6564');
      this.circle(g,x+dx*47*scale,y+dy*47*scale,6*scale,C.gold);
    }
  }
  private drawRail(g:Graphics,x:number,y:number,scale:number,angle:number) {
    const c=Math.cos(angle),s=Math.sin(angle),p=(px:number,py:number)=>[x+(px*c-py*s)*scale,y+(px*s+py*c)*scale];
    const poly=(v:number[],color:string)=>{const out:number[]=[];for(let i=0;i<v.length;i+=2)out.push(...p(v[i],v[i+1]));this.polygon(g,out,color);};
    this.circle(g,x+2*scale,y-3*scale,31*scale,'#101D25');
    poly([-28,-17,39,-17,46,-9,46,9,39,17,-28,17,-35,8,-35,-8],'#3D545A');
    for(const off of[-10,10]){poly([-25,off-3,39,off-3,39,off+3,-25,off+3],'#AEC7C3');this.line(g,[...p(-25,off),...p(39,off)],'#CFEDE3',1.7*scale);}
    for(const xx of[-20,20]){const q=p(xx,-20);this.circle(g,q[0],q[1],3.2*scale,'#D19A55');}
    const muzzle=p(50,0);this.circle(g,muzzle[0],muzzle[1],8*scale,'#172C32');this.circle(g,muzzle[0],muzzle[1],3.2*scale,C.teal);
  }
  private drawPrism(g:Graphics,x:number,y:number,scale:number) {
    const r=31*scale;
    this.circle(g,x+2*scale,y-2*scale,r+6*scale,'#121C29');
    this.polygon(g,[x,y-r,x+r*.65,y-r*.22,x+r*.47,y+r*.68,x,y+r,x-r*.52,y+r*.52,x-r*.7,y-r*.18],'#5D4E70');
    this.polygon(g,[x,y-r*.78,x+r*.32,y-r*.12,x+r*.18,y+r*.53,x-r*.2,y+r*.28,x-r*.34,y-r*.2],'#E6B5D9');
    this.line(g,[x,y-r*.78,x,y+r*.8],C.cream,2*scale);this.line(g,[x-r*.34,y-r*.2,x+r*.32,y-r*.12],C.cream+'B0',1.4*scale);
    this.line(g,[x-r*1.15,y+r*.3,x-r*.48,y,x-r*1.12,y-r*.32],C.teal+'99',2*scale);
    this.line(g,[x+r*1.15,y-r*.3,x+r*.48,y,x+r*1.12,y+r*.32],C.gold+'99',2*scale);
  }
  private drawAcid(g:Graphics,x:number,y:number,scale:number) {
    const r=30*scale;
    this.circle(g,x+2*scale,y-2*scale,r+5*scale,'#121C24');
    this.polygon(g,[x-r*.34,y-r*.9,x+r*.34,y-r*.9,x+r*.26,y-r*.52,x+r*.58,y+r*.63,x+r*.4,y+r*.84,x-r*.4,y+r*.84,x-r*.58,y+r*.63,x-r*.26,y-r*.52],'#5A6A50');
    this.polygon(g,[x-r*.47,y+r*.18,x+r*.47,y+r*.18,x+r*.4,y+r*.7,x-r*.4,y+r*.7],'#B7D26E');
    this.line(g,[x-r*.26,y-r*.92,x+r*.26,y-r*.92],C.gold,4*scale);
    this.circle(g,x-r*.18,y+r*.38,3.2*scale,'#EAF0B3');this.circle(g,x+r*.2,y+r*.53,2.2*scale,'#EAF0B3');
    this.line(g,[x+r*.75,y-r*.18,x+r*1.05,y-r*.42],C.teal+'99',2*scale);
  }
  private drawRepair(g:Graphics,x:number,y:number,scale:number) {
    const r=28*scale;this.circle(g,x+2*scale,y-2*scale,r+6*scale,'#111D22');
    this.polygon(g,[x-r*.72,y-r*.57,x+r*.72,y-r*.57,x+r*.78,y+r*.6,x-r*.78,y+r*.6],'#788B7C');
    this.line(g,[x-r*.56,y-r*.27,x+r*.56,y-r*.27],C.gold,2*scale);
    this.line(g,[x-r*.38,y,x+r*.38,y],C.teal,5*scale);this.line(g,[x,y-r*.38,x,y+r*.38],C.teal,5*scale);
    this.line(g,[x-r*.86,y+r*.78,x-r*.22,y+r*.12,x+r*.03,y+r*.35,x+r*.82,y-r*.45],C.cream,4*scale);
    this.circle(g,x-r*.9,y+r*.78,3*scale,C.gold);this.circle(g,x+r*.82,y-r*.45,3*scale,C.gold);
  }
  private drawShield(g:Graphics,x:number,y:number,scale:number) {
    const r=29*scale;this.circle(g,x+2*scale,y-2*scale,r+6*scale,'#101C28');
    this.polygon(g,[x-r*.72,y-r*.68,x+r*.22,y-r*.68,x+r*.7,y-r*.2,x+r*.7,y+r*.62,x-r*.72,y+r*.62],'#4F6979');
    this.circle(g,x-r*.08,y+r*.05,9*scale,'#203B4B');this.circle(g,x-r*.08,y+r*.05,4*scale,C.teal);
    g.strokeColor=new Color('#BDEDF0CC');g.lineWidth=3*scale;g.arc(x+r*.08,y+r*.02,r*.98,-Math.PI*.82,Math.PI*.82,false);g.stroke();
    this.line(g,[x-r*.62,y-r*.54,x+r*.32,y-r*.54],C.gold,2*scale);this.circle(g,x+r*.4,y-r*.54,3*scale,C.gold);
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
  /** Tapered painted contours bend independently from the textured light layer. */
  private ribbon(g:Graphics,x:number,y:number,angle:number,length:number,width:number,phase:number,color:string) {
    const points:number[]=[],dx=Math.cos(angle),dy=Math.sin(angle);
    for(let side=0;side<2;side++)for(let j=0;j<=12;j++){
      const u=(side?12-j:j)/12;
      const bend=Math.sin(u*5-phase)*width*.8*u;
      const edge=Math.sin(Math.PI*u)*width*(side?-1:1)*(.7+.21*Math.sin(u*9+phase)+.09*Math.sin(u*37+phase*.5));
      points.push(x+dx*u*length-dy*(bend+edge),y+dy*u*length+dx*(bend+edge));
    }
    this.polygon(g,points,color);
  }
  /** Short pigment lobes roll along the jet; no full-length stretched flame sprite. */
  private flameJet(x:number,y:number,angle:number,reach:number,phase:number,power:number,age?:number) {
    const dx=Math.cos(angle),dy=Math.sin(angle),length=Math.max(20,reach-37);
    const packet=age!==undefined,progress=age??0;
    // The attached core dies first, leaving detached tips to curl and cool.
    const core=packet?Math.max(0,1-progress*2.1):1;
    if(core>0){
      this.artEffect(3,x+dx*59,y+dy*59,55,24*power,angle*180/Math.PI,core*.65,'#F4D2A4');
      this.ribbon(this.attacks,x+dx*36,y+dy*36,angle,44,4*power,phase*12,'#FFF0C2'+Math.round(core*210).toString(16).padStart(2,'0'));
    }
    for(let j=0;j<5;j++){
      const u=packet?Math.min(1,.08+j*.11+progress*.62):.12+j*.17;
      const turn=phase*9-j*1.8,spread=(j%2?1:-1)*u*u*length*.19;
      const bend=spread+Math.sin(turn)*u*13;
      const cx=x+dx*(37+length*u)-dy*bend,cy=y+dy*(37+length*u)+dx*bend;
      const fade=(packet?Math.sin(Math.PI*progress):1)*(1-u*.65);
      const size=(22+u*48)*power,roll=angle+Math.sin(turn)*(.13+u*.35);
      const frame=this.flameFrames.length?8+Math.min(3,Math.floor((packet?progress:u)*4)):3;
      this.artEffect(frame,cx,cy,size*1.65,size*1.2,roll*180/Math.PI,fade*.65,'#F2C5AD');
      const inkAlpha=Math.round(fade*120).toString(16).padStart(2,'0');
      this.ribbon(this.attacks,cx-dx*size*.3,cy-dy*size*.3,roll,size*.85,size*.16,turn,'#D78672'+inkAlpha);
      this.ribbon(this.attacks,cx-dx*size*.3,cy-dy*size*.3,roll-.1,size*.68,size*.07,turn+.5,'#FFE3B2'+inkAlpha);
    }
    for(let j=0;j<5;j++){
      const u=packet?Math.min(1,progress*.75+.2+j*.035):(phase*1.7+j*.21)%1;
      const q=angle+Math.sin(j*9.3)*.28,distance=37+length*u;
      const cx=x+Math.cos(q)*distance,cy=y+Math.sin(q)*distance;
      const fade=Math.sin(Math.PI*u)*(packet?1-progress:1),alpha=Math.round(fade*185).toString(16).padStart(2,'0');
      this.ribbon(this.attacks,cx,cy,q+.35,7+u*9,1.5*power,phase*8+j,'#F2C59D'+alpha);
    }
  }
  private drawEffects() {
    const g=this.fx;g.clear();
    for(const e of this.supportEffects){
      const t=1-e.life/e.max;
      if(e.type==='rail-beam'){
        const fade=Math.pow(1-t,1.8),color=e.recipeId?.includes('cryo')?'#B4DDEB':e.recipeId?.includes('acid')?'#D3D9A5':'#B4CDD9';
        const length=Math.max(1,Math.hypot(e.dx,e.dy)),angle=Math.atan2(e.dy,e.dx);
        const width=(t<.12?1+t*5:1.6-t)*Math.max(3,e.size*.45),alpha=Math.round(fade*210).toString(16).padStart(2,'0');
        this.line(g,[e.x,e.y,e.x+e.dx,e.y+e.dy],color+Math.round(fade*52).toString(16).padStart(2,'0'),width*3.6);
        // Two offset pigment strokes make the beam read as a painted ribbon,
        // while the narrow ivory core preserves the high-energy focal line.
        this.ribbon(g,e.x,e.y,angle,length,width*.42,this.visualTime*18,color+alpha);
        this.line(g,[e.x,e.y,e.x+e.dx,e.y+e.dy],'#F4F1DD'+Math.round(fade*245).toString(16).padStart(2,'0'),Math.max(.6,width*.25));
        const ex=e.x+e.dx,ey=e.y+e.dy;
        this.artEffect(5,ex,ey,24+width*3,18+width*2,angle*180/Math.PI,fade*.7,color);
        this.artEffect(5,e.x,e.y,18+width*2,14+width,angle*180/Math.PI+180,fade*.45,color);
      }else if(e.type==='train-shield'){
        for(const y of this.slotY){const fade=1-t,w=56+8*t;
          this.line(g,[-w,y+38,-w-8,y+18,-w-8,y-24,-w,y-38],'#B9DCE2'+Math.round(fade*190).toString(16).padStart(2,'0'),2);
          this.line(g,[w,y+38,w+8,y+18,w+8,y-24,w,y-38],'#B9DCE2'+Math.round(fade*190).toString(16).padStart(2,'0'),2);}
      }else if(e.type==='flame'){
        this.flameJet(e.x,e.y,Math.atan2(e.dy,e.dx),e.size,this.visualTime,1,t);
      }else if(e.type==='cannon-impact'){
        const grow=1-Math.pow(1-t,3),r=e.size*grow;
        this.artEffect(5,e.x,e.y,30+e.size*1.7*grow,24+e.size*1.5*grow,t*17,(1-t)*.85,'#EDB080');
        for(let j=0;j<7;j++){
          const q=j*Math.PI*2/7+e.x*.03,spread=r*(.8+(j%3)*.12);
          const x=e.x+Math.cos(q)*spread,y=e.y+Math.sin(q)*spread;
          this.ribbon(g,x,y,q+Math.PI/2,7+12*grow,3*(1-t),j,'#D5AB8E88');
          this.line(g,[e.x+Math.cos(q)*r*.5,e.y+Math.sin(q)*r*.5,x,y],'#EAC9A7AA',2*(1-t)+.5);
        }
      }else if(e.type==='repair'||e.type==='passive-repair'){
        for(const y of this.slotY)for(let j=0;j<3;j++){
          const u=(t+j/3)%1,x=-44+j*44,py=y-30+u*80,alpha=Math.round(Math.sin(Math.PI*u)*(1-t)*210).toString(16).padStart(2,'0');
          this.line(g,[x-5,py,x+5,py],'#A8DADE'+alpha,3);
          this.line(g,[x,py-5,x,py+5],'#A8DADE'+alpha,3);
        }
      }else if(e.type==='feed'){
        const color=e.color||C.teal,travel=Math.min(1,t*3.5),side=e.dy>0?-56:56,points:number[]=[];
        for(let j=0;j<=16;j++){
          const u=j/16;points.push(e.x+Math.sin(Math.PI*u)*side,e.y+e.dy*u);
        }
        this.line(g,points,color+'33',2);
        for(let i=0;i<4;i++){
          const u=Math.max(0,travel-i*.07),x=e.x+Math.sin(Math.PI*u)*side,y=e.y+e.dy*u;
          this.line(g,[x-3,y,x,y+5,x+3,y,x,y-5,x-3,y],color,1.5);
        }
        const charge=1-Math.min(1,t/.35);
        this.artEffect(4,e.x+e.dx,e.y+e.dy,46+charge*60,64+charge*55,-this.visualTime*45,Math.sin(Math.PI*t)*.72);
      }else if(e.type==='thermal-shot'){
        this.line(g,[e.x,e.y,e.x+e.dx,e.y+e.dy],'#FF814E99',8*(1-t)+2);
        this.line(g,[e.x,e.y,e.x+e.dx,e.y+e.dy],'#FFEACD',2);
      }else if(e.type==='tesla'){
        const points:number[]=[];const length=Math.max(1,Math.hypot(e.dx,e.dy));
        for(let i=0;i<=6;i++){const p=i/6,offset=i===0||i===6?0:Math.sin(i*5+this.visualTime*55)*13;
          points.push(e.x+e.dx*p-e.dy/length*offset,e.y+e.dy*p+e.dx/length*offset);}
        this.line(g,points,'#B2A1DC77',5*(1-t)+1);this.line(g,points,'#D6F4F3',1.5);
        this.artEffect(5,e.x+e.dx,e.y+e.dy,45*(1-t)+12,70*(1-t)+12,35,.55*(1-t));
      }else if(e.type==='prismbeam'){
        const angle=Math.atan2(e.dy,e.dx);
        for(const offset of[-.32,0,.32])this.flameJet(e.x,e.y,angle+offset,e.size,this.visualTime,.55);
      }else if(e.type==='beam'||e.type==='wind'){
        const angle=Math.atan2(e.dy,e.dx),reach=e.size||260;
        if(e.type==='beam'){this.flameJet(e.x,e.y,angle,reach,this.visualTime,.6);continue;}
        for(let j=0;j<3;j++){
          const u=Math.max(0,Math.min(1,(t-j*.10)/.8));if(u<=0)continue;
          const grow=1-Math.pow(1-u,3),q=angle+(j-1)*.14+Math.sin(u*4+j)*.035;
          const radius=25+grow*reach*.64,fade=Math.sin(Math.PI*u)*.42;
          this.artEffect(1,e.x+Math.cos(q)*radius,e.y+Math.sin(q)*radius,34+grow*reach*.5,26+grow*reach*.48,q*180/Math.PI+(j-1)*9,fade);
          this.ribbon(g,e.x+Math.cos(q)*30,e.y+Math.sin(q)*30,q,radius,3+j,u*8+j,'#A8DADE77');
        }
        continue;
      }else if(['acid','prism','regen','shield','brood'].includes(e.type)){
        const color=e.type==='acid'?'#D4C78BAA':e.type==='prism'?'#D4B8E9BB':e.type==='regen'?'#D6C5AABB':e.type==='shield'?'#ACCEDCAA':'#D09DADAA';
        for(let j=0;j<5;j++){
          const q=j*Math.PI*.4+e.x*.01,r=(e.size||40)*(.15+.65*t),x=e.x+Math.cos(q)*r,y=e.y+Math.sin(q)*r;
          this.ribbon(g,x,y,q+Math.PI/2,12+18*Math.sin(Math.PI*t),3*(1-t),j+t*5,color);
        }
      }else{
        const index=e.type==='cryo'||e.type==='iceblast'?2:e.type==='thermalburst'?7:5;
        const size=e.type==='impact'?e.size:e.type==='slam'?240:Math.max(50,e.size*2);
        if(index===2){
          const grow=1-Math.pow(1-t,3),r=size*.42;
          this.artEffect(2,e.x,e.y,size*(.35+.65*grow),size*(.35+.65*grow),t*8,(1-t)*.28);
          for(let j=0;j<7;j++){
            const u=Math.max(0,(t-(j%3)*.035)/.92),q=j*Math.PI*2/7+e.x*.01;
            const distance=r*(.25+.75*(1-Math.pow(1-u,3))),cx=e.x+Math.cos(q)*distance,cy=e.y+Math.sin(q)*distance;
            const h=(9+j%3*4)*Math.sin(Math.PI*Math.min(1,u)),w=h*.26;
            this.polygon(g,[cx+Math.cos(q)*h,cy+Math.sin(q)*h,cx-Math.sin(q)*w,cy+Math.cos(q)*w,cx-Math.cos(q)*h*.5,cy-Math.sin(q)*h*.5,cx+Math.sin(q)*w,cy-Math.cos(q)*w],'#BCDDEBC0');
          }
          continue;
        }
        const pop=t<.18?.35+t*4:1.07-(t-.18)*.44;
        this.artEffect(index,e.x,e.y,size*pop,size*pop*(.72+.28*Math.sin(t*Math.PI)),index===7?t*24:0,Math.pow(1-t,1.6));
        for(let j=0;j<5;j++){
          const q=j*Math.PI*2/5+e.x*.03,r=size*.55*(1-Math.pow(1-t,2));
          this.line(g,[e.x+Math.cos(q)*r*.75,e.y+Math.sin(q)*r*.75,e.x+Math.cos(q)*r,e.y+Math.sin(q)*r],index===7?'#BBCFE999':'#E6B99D99',2*(1-t)+.5);
        }
        continue;
      }
    }
    for(const p of this.particles){
      const fade=Math.max(0,Math.min(1,p.life/p.max)),r=Math.max(.5,p.size*fade);
      const pigment=new Color(p.color);pigment.a=Math.round(255*fade);g.fillColor=pigment;
      g.moveTo(p.x-r,p.y-r*.2);g.lineTo(p.x+r*.55,p.y+r*.7);g.lineTo(p.x+r*.8,p.y-r*.45);g.lineTo(p.x-r*.6,p.y-r*.6);g.close();g.fill();
    }
  }
  private drawHUD() {
    const g=this.hud,m=this.model;g.clear();
    const fighting=m.phase==='combat';
    for(const key of ['hp','kills','stage','form','hint','toast','chain','boss','reorder'])this.labels[key].node.active=fighting;
    this.paintRect(g,-365,430,730,217,'#26243BD0');this.paintRect(g,-365,-645,730,222,'#26243BD0');
    // Broken pigment tabs keep the HUD attached to the same paper language as
    // the workshop cards, while the lower opacity lets the terrain breathe.
    this.polygon(g,[-360,640,-220,640,-187,619,-241,610,-295,570,-360,566],'#6D546F3D');
    this.polygon(g,[130,-640,360,-640,360,-577,309,-565,275,-590,210,-595],'#6D546F32');
    this.line(g,[-310,512,310,512],'#C0B2DB55',1);
    this.line(g,[173,548,295,548],'#A8DADE66',1);
    this.line(g,[-303,468,-244,466,-198,469],'#E6C9B33D',1.5);
    this.line(g,[194,-593,256,-596,310,-592],'#E6C9B32B',1.5);
    this.paintRect(g,-312,444,624,9,'#4A435E');this.paintRect(g,-312,444,624*m.hp/m.maxHp,9,m.hp>30?C.teal:C.red);
    for(let i=1;i<10;i++)this.rect(g,-312+i*62.4,446,2,9,C.ink);
    this.line(g,[-310,-510,310,-510],'#C0B2DB44',1);
    this.rect(g,-312,-527,624,3,'#4A435E');
    this.rect(g,-312,-527,624*(Math.min(1,m.scrap/m.nextScrap)),3,C.gold);
    this.labels.hp.string=`装甲 ${Math.ceil(m.hp)}/${m.maxHp}`;this.labels.kills.string=m.shieldHp>0?`护盾 ${Math.ceil(m.shieldHp)} · 击破 ${m.kills}`:`击破 ${m.kills}`;
    const elapsed=Math.floor(m.time+.00001);
    this.labels.time.string=`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`;
    this.labels.stage.string=this.entranceRemaining>0?'列车驶入 · 准备迎敌':`第 ${m.wave} 波 · ${m.wave<2?'收集废料，组成车厢联动':m.wave<3?'护盾怪出现 · 蚀酸可穿盾':m.wave<4?'分裂怪出现 · 范围攻击清理幼体':'再生怪出现 · 燃烧抑制恢复'}`;
    this.labels.form.string=m.phase==='menu'?'进攻  /  增益  /  减益':m.slots.map(c=>c?CARS[c.type].name.replace('车',''):'空位').join(' — ');
    this.labels.hint.string=`废料 ${m.scrap}/${m.nextScrap} · ${m.links.length} 条联动`;
    if(fighting){
      this.paintRect(g,122,-514,197,64,'#61687A78');
      this.line(g,[135,-513,304,-513],C.teal,2);
      this.line(g,[125,-475,132,-483,125,-491],C.teal,2);
      this.line(g,[310,-475,303,-483,310,-491],C.teal,2);
    }
    this.labels.footer.string=`声音 ${this.sound?'开':'关'}`;this.labels.motion.string=`镜头 ${this.lowMotion?'关':'开'}`;
    this.labels.speed.string=`倍速 ×${this.debugSpeed}`;
    this.labels.tag.string=this.debugSpeed===1?'余晖防线 / 无尽远征':`无尽远征 / 调试 ×${this.debugSpeed}`;
    this.labels.pause.string=m.phase==='paused'?'继续 ▶':'暂停 Ⅱ';
    for(let i=0;i<4;i++)this.line(g,[-339+i*180,-606,-201+i*180,-606],i===2?'#A8DADE99':'#C0B2DB44',1);
    const boss=m.boss;
    this.labels.tag.node.active=!boss&&fighting;
    this.labels.boss.node.setPosition(0,531,0);
    this.labels.boss.fontSize=22;this.labels.boss.color=new Color(C.cream);
    this.labels.boss.string=boss?`破阵者 ${Math.ceil(boss.hp)} / ${boss.maxHp}${m.bossCharge>.72?' · 冲击蓄力！':''}`:'';
    if(boss&&fighting){this.rect(g,-290,511,580,5,'#514156',2);this.rect(g,-290,511,580*Math.max(0,boss.hp/boss.maxHp),5,C.red,2);}
    this.labels.toast.node.setPosition(0,375,0);
    this.labels.toast.string=this.toastLife>0?this.toastText:'';
    this.labels.chain.string=this.chain>=4&&m.phase==='combat'&&!boss?`${this.chain} 连破`:'';
    if(m.phase==='combat'&&m.hp<30){
      const alpha=Math.round(24+18*(1+Math.sin(this.visualTime*5)));
      const warning=new Color(244,120,95,alpha);g.strokeColor=warning;g.lineWidth=8;g.rect(-349,-414,698,840);g.stroke();
    }
  }
  private button(text:string,x:number,y:number,w:number,h:number,action:()=>void,accent=true) {
    const wash=accent?'#D5B5A4D8':'#443C5768';
    this.paintRect(this.overlay,x-w/2,y-h/2,w,h,wash);
    this.line(this.overlay,[x-w/2+18,y-h/2+7,x-w*.12,y-h/2+5,x+w*.13,y-h/2+8],accent?'#5E536C99':'#9A859B77',1.5);
    this.line(this.overlay,[x-w/2+28,y+h/2-8,x-w*.08,y+h/2-6,x+w*.31,y+h/2-9],accent?'#F3D7C055':'#CBBACF44',1);
    this.line(this.overlay,[x-w/2+10,y-h/2+18,x-w/2+10,y+h/2-18],accent?'#F4D5BE66':'#A8DADE3D',1);
    this.label(this.overlayNode,text,x,y+1,28,accent?'#302A40':C.cream,w-30,'center','display');
    this.hitAreas.push({x,y,w,h,action});
  }
  private slotClick(index:number) {
    const m=this.model;
    if(m.pendingCar){this.selectedSlot=index;return;}
    if(this.selectedSlot<0){this.selectedSlot=index;return;}
    if(this.selectedSlot!==index)m.swapSlots(this.selectedSlot,index);
    this.selectedSlot=-1;
  }
  /**
   * Cards use an equipment emblem rather than a tiny carriage pasted over a
   * coloured rectangle.  The irregular paper medallion gives every sprite a
   * common visual language while leaving the hand-painted silhouette visible.
   */
  private cardIcon(type:CarType,x:number,y:number,size:number) {
    const accent=CARS[type].color;
    this.paintRect(this.overlay,x-size*.48,y-size*.48,size*.96,size*.96,'#1C2633B8');
    this.circle(this.overlay,x,y,size*.37,'#111A2690');
    const g=this.overlay;g.strokeColor=new Color(accent+'B0');g.lineWidth=Math.max(1.4,size*.018);
    g.circle(x,y,size*.39);g.stroke();
    this.line(g,[x-size*.39,y+size*.34,x-size*.16,y+size*.39,x+size*.12,y+size*.35],accent+'55',1.5);
    this.line(g,[x+size*.26,y-size*.37,x+size*.41,y-size*.29],C.cream+'46',1.2);
    const weapon=this.weaponFrames.get(type)||this.carIcons.get(type);
    if(weapon){
      const n=this.sprite(`Card ${type}`,weapon,size*.79,size*.79,this.overlayNode);n.setPosition(x,y,0);
      n.getComponent(UITransform)!.setAnchorPoint(.5,.5);
      if(type==='cannon'||type==='flame')n.angle=90;
      n.getComponent(Sprite)!.color=new Color(255,255,255,242);
      return;
    }
    this.drawCarModule(this.overlay,type,x,y,size/125,Math.PI/2);
  }

  /** A readable hand-drawn fallback while an optional modifier atlas loads. */
  private drawModIcon(type:ModId|'repair',x:number,y:number,size:number) {
    const accent=(type==='repair'||type==='repairkit')?C.teal:
      type==='fuel'?'#F08B50':type==='coolant'?'#9DDBEA':type==='voltage'||type==='surge'||type==='capacitor'?C.teal:
      type==='acidpotency'?'#C7D98B':type==='prismfocus'?'#E3B5E2':type==='lanes'||type==='railpower'?'#C8D4DE':C.gold;
    const r=size*.43;this.paintRect(this.overlay,x-r,y-r,r*2,r*2,'#1C2633B8');
    const g=this.overlay;g.strokeColor=new Color(accent+'AA');g.lineWidth=Math.max(1.4,size*.018);g.circle(x,y,r*.84);g.stroke();
    const s=size/100;
    if(type==='repair'||type==='repairkit'){
      this.line(g,[x-25*s,y,x+25*s,y],accent,6*s);this.line(g,[x,y-25*s,x,y+25*s],accent,6*s);
      this.line(g,[x-26*s,y+22*s,x-5*s,y+3*s,x+4*s,y+12*s,x+28*s,y-15*s],C.cream,4*s);
    }else if(type==='lanes'||type==='railpower'){
      for(const off of[-13,0,13])this.line(g,[x-29*s,y+off*s,x+29*s,y+off*s],accent,4*s);
      this.line(g,[x-31*s,y-22*s,x-20*s,y-30*s,x-7*s,y-22*s],C.cream,2*s);
    }else if(type==='reach'){
      this.line(g,[x-28*s,y+10*s,x+24*s,y+10*s],accent,10*s);this.line(g,[x+18*s,y-3*s,x+35*s,y+10*s,x+18*s,y+23*s],C.cream,3*s);
      this.line(g,[x-27*s,y-10*s,x-4*s,y-10*s],C.cream,3*s);
    }else if(type==='fuel'){
      this.polygon(g,[x-8*s,y+27*s,x-22*s,y+2*s,x-8*s,y-9*s,x-4*s,y-30*s,x+13*s,y-7*s,x+23*s,y+3*s,x+8*s,y+27*s],'#E97843CC');
      this.line(g,[x-3*s,y+17*s,x+5*s,y+2*s,x+2*s,y-12*s],C.cream,3*s);
    }else if(type==='voltage'||type==='surge'||type==='capacitor'){
      this.line(g,[x-25*s,y-14*s,x-8*s,y-14*s,x-17*s,y+5*s,x+3*s,y+5*s,x-7*s,y+26*s,x+27*s,y-2*s,x+10*s,y-2*s,x+20*s,y-23*s],accent,4*s);
      this.circle(g,x-25*s,y-14*s,3*s,C.cream);this.circle(g,x+27*s,y-2*s,3*s,C.cream);
    }else if(type==='caliber'||type==='rapid'||type==='scatter'||type==='burst'){
      for(const off of[-16,0,16]){this.circle(g,x+off*s,y-3*s,7*s,'#A5A69A');this.line(g,[x+off*s-3*s,y-17*s,x+off*s+3*s,y-17*s],accent,3*s);}
      if(type==='burst')this.line(g,[x-28*s,y+22*s,x-7*s,y+22*s,x+3*s,y+10*s,x+26*s,y+10*s],C.cream,3*s);
    }else if(type==='prismfocus'){
      this.polygon(g,[x,y-29*s,x+22*s,y,x,y+29*s,x-22*s,y],accent+'CC');
      this.line(g,[x-35*s,y+18*s,x-8*s,y,x-35*s,y-18*s],C.cream,2*s);this.line(g,[x+35*s,y-18*s,x+8*s,y,x+35*s,y+18*s],C.cream,2*s);
    }else if(type==='acidpotency'){
      this.line(g,[x-12*s,y-27*s,x+12*s,y-27*s,x+8*s,y-17*s,x+19*s,y+22*s,x-19*s,y+22*s,x-8*s,y-17*s,x-12*s,y-27*s],accent,4*s);
      this.circle(g,x-7*s,y+7*s,3*s,C.cream);this.circle(g,x+8*s,y+1*s,4*s,accent);
    }else{
      this.circle(g,x,y,17*s,'#9E8D68');this.circle(g,x,y,8*s,'#1C2633');
      for(let i=0;i<6;i++){const a=i*Math.PI/3;this.circle(g,x+Math.cos(a)*23*s,y+Math.sin(a)*23*s,5*s,accent);}
    }
  }
  private drawPanel() {
    for(const n of this.overlayNode.children.slice())n.destroy();
    this.overlay.clear();this.hitAreas=[];
    const m=this.model,g=this.overlay;
    if(this.menuArt)this.menuArt.active=m.phase==='menu'&&!this.atlas;
    if(this.paperArt)this.paperArt.active=false;
    if(m.phase==='combat'){
      this.hitAreas.push({x:222,y:-483,w:197,h:64,action:()=>this.openWorkshop()});
      return;
    }
    renderPanel({model:m,knownRecipes:this.knownRecipes,newRecipes:this.newRecipes,
      atlas:this.atlas,atlasPage:this.atlasPage,atlasCars:this.atlasCars,selectedSlot:this.selectedSlot,
      draw:{
        rect:(x,y,w,h,color,radius)=>this.rect(g,x,y,w,h,color,radius),
        label:(text,x,y,size,color,width,align,font)=>{this.label(this.overlayNode,text,x,y,size,color,width,align,font);},
        art:(name)=>{if(name==='paper'){if(this.paperArt)this.paperArt.active=true;}else if(this.menuArt)this.menuArt.active=true;},
        button:(text,x,y,w,h,action,accent)=>this.button(text,x,y,w,h,action,accent),
        cardIcon:(type,x,y,size)=>this.cardIcon(type,x,y,size),
        modIcon:(type,x,y,size)=>{
          const frame=this.modFrames.get(type);
          if(frame){
            this.paintRect(this.overlay,x-size*.48,y-size*.48,size*.96,size*.96,'#1C2633B8');
            const n=this.sprite('Modification',frame,size*.82,size*.82,this.overlayNode);n.setPosition(x,y,0);
            n.getComponent(UITransform)!.setAnchorPoint(.5,.5);
            n.getComponent(Sprite)!.color=new Color(255,255,255,238);
          }else this.drawModIcon(type,x,y,size);
        },
        line:(points,color,width)=>this.line(g,points,color,width),
        circle:(x,y,r,color)=>this.circle(g,x,y,r,color),
        addHitArea:(x,y,w,h,action)=>{this.hitAreas.push({x,y,w,h,action});}
      },actions:{
        begin:()=>this.begin(),selectSlot:i=>this.slotClick(i),
        openWorkshop:()=>this.openWorkshop(),
        setAtlas:(open,page,cars)=>{this.atlas=open;this.atlasPage=page;if(cars!==undefined)this.atlasCars=cars;},
        installPending:()=>{if(m.install(this.selectedSlot))this.selectedSlot=-1;},
        mergePending:()=>{if(m.mergePending(this.selectedSlot)){this.selectedSlot=-1;this.toast('同车合并 · 强化升级');}},
        chooseOffer:i=>{this.selectedSlot=-1;this.atlas=false;m.chooseOffer(i);},
        discardOffer:()=>{m.discardOffer();this.selectedSlot=-1;},
        resumeWorkshop:()=>{this.selectedSlot=-1;m.resumeWorkshop();},
        resume:()=>m.resume(),backToMenu:()=>{m.phase='menu';this.atlas=false;}
      }
    });
    if(m.phase==='win'||m.phase==='lose')try{
      globalThis.localStorage?.setItem('doomsday-last-run',JSON.stringify({version:'0.5.1',wave:m.wave,seed:m.initialSeed,
        slots:m.slots.map(c=>c?{type:c.type,level:c.level}:null),links:m.links.map(l=>l.recipe.id),
        hp:m.hp,kills:m.kills,time:m.time,result:m.phase,reason:m.endReason,events:m.events}));
    }catch{}
  }
}
