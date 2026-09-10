# 开阔地表 v2：废城、花园、要塞

用户修正：敌人从左右两侧进入，不能用墙、植被或道具占据侧边。整张可见画布（包含左右边缘）都应是平整、连续、低对比的可行走地面。中央90%高度不设置任何凸起障碍或侧边框景；美术细节来自材质与光色。

方式：内置 image_gen，分别生成三个新版本，保留旧版作为历史记录。画风参考此前查看的 `C2-afterglow-details.png`、ground-v2、garden-v1 和 citadel-v1；旧版侧边构图不再沿用。

## 废城提示词

```text
Use case: stylized-concept. Create ONE finished opaque 2D terrain texture, portrait 1024x1536, strict 90-degree directly overhead orthographic view. This is a flat scrolling gameplay surface for a hand-painted twilight train survival game.
MOST IMPORTANT COMPOSITION: the ENTIRE visible canvas width, from the extreme LEFT edge to the extreme RIGHT edge, is continuously flat, clear, walkable terrain. Enemies enter from BOTH SIDES, so left and right are active gameplay space and must be as calm and empty as the center. There is no central corridor surrounded by sides. NO flanking frame, border, walls, curbs, architecture, props, furniture, debris heaps, vegetation clumps, trenches, pits, raised objects, or dark edge vignette. For the middle 90 percent of image height, no objects of any kind: only flat material, subtle painted surface marks, and diffuse light. Prefer no raised landmarks anywhere; if any are implied, confine them to the extreme top/bottom 5 percent and never along the left/right edges.
Style: elegant muted afterglow gouache and ink, broad painterly material washes, atmospheric dusty mauve and slate shadows, restrained soft light, delicate paper grain, sparse low-contrast fine marks. Beautiful through material and light, NOT detailed clutter. Maintain even visual quietness across the full width. Flat surface stays at one scale with parallel plan-view geometry. No horizon, perspective vanishing point, isometric view, actors, vehicles, train, railroad rails, enemies, lettering, icons, text, UI, watermark, bright focal object or repeating side borders. Top/bottom values and material should harmonize for vertical scrolling.
Specific terrain: a very broad wet lavender-grey abandoned city street or paved plaza, extending beyond all four image edges. Soft diffused cool rain reflections and broad muted dusty-rose reflected light. A few extremely faded, flush-painted crosswalk fragments or worn pavement paint, sparse fine shallow surface cracks. No sidewalks, buildings, gutters, lamp-posts, cars or road-edge boundaries. The wet pavement fills the entire image. The extreme left and right must remain unobstructed wet pavement, equally low-contrast as the middle.
```

## 花园提示词

```text
Use case: stylized-concept. Create ONE finished opaque 2D terrain texture, portrait 1024x1536, strict 90-degree directly overhead orthographic view. This is a flat scrolling gameplay surface for a hand-painted twilight train survival game.
MOST IMPORTANT COMPOSITION: the ENTIRE visible canvas width, from the extreme LEFT edge to the extreme RIGHT edge, is continuously flat, clear, walkable terrain. Enemies enter from BOTH SIDES, so left and right are active gameplay space and must be as calm and empty as the center. There is no central corridor surrounded by sides. NO flanking frame, border, walls, curbs, architecture, props, furniture, debris heaps, vegetation clumps, trenches, pits, raised objects, or dark edge vignette. For the middle 90 percent of image height, no objects of any kind: only flat material, subtle painted surface marks, and diffuse light. Prefer no raised landmarks anywhere; if any are implied, confine them to the extreme top/bottom 5 percent and never along the left/right edges.
Style: elegant muted afterglow gouache and ink, broad painterly material washes, atmospheric dusty mauve and slate shadows, restrained soft light, delicate paper grain, sparse low-contrast fine marks. Beautiful through material and light, NOT detailed clutter. Maintain even visual quietness across the full width. Flat surface stays at one scale with parallel plan-view geometry. No horizon, perspective vanishing point, isometric view, actors, vehicles, train, railroad rails, enemies, lettering, icons, text, UI, watermark, bright focal object or repeating side borders. Top/bottom values and material should harmonize for vertical scrolling.
Specific terrain: a very broad overgrown paved garden court, entirely flat. Lavender-grey weathered pavement with very thin flat moss staining as broad muted sage-green brush washes, a few dispersed TINY fallen dusty-pink petals lying flat. Beauty comes from soft violet/sage/pink material variation. NO trees, trunks, upright plants, vines, roots, mushrooms, trellises, greenhouse walls, pots, borders, garden beds or raised stones ANYWHERE. Moss is a flat stain, never a clump. Both left/right edges are the same open traversable moss-stained paving as the center.
```

## 要塞提示词

```text
Use case: stylized-concept. Create ONE finished opaque 2D terrain texture, portrait 1024x1536, strict 90-degree directly overhead orthographic view. This is a flat scrolling gameplay surface for a hand-painted twilight train survival game.
MOST IMPORTANT COMPOSITION: the ENTIRE visible canvas width, from the extreme LEFT edge to the extreme RIGHT edge, is continuously flat, clear, walkable terrain. Enemies enter from BOTH SIDES, so left and right are active gameplay space and must be as calm and empty as the center. There is no central corridor surrounded by sides. NO flanking frame, border, walls, curbs, architecture, props, furniture, debris heaps, vegetation clumps, trenches, pits, raised objects, or dark edge vignette. For the middle 90 percent of image height, no objects of any kind: only flat material, subtle painted surface marks, and diffuse light. Prefer no raised landmarks anywhere; if any are implied, confine them to the extreme top/bottom 5 percent and never along the left/right edges.
Style: elegant muted afterglow gouache and ink, broad painterly material washes, atmospheric dusty mauve and slate shadows, restrained soft light, delicate paper grain, sparse low-contrast fine marks. Beautiful through material and light, NOT detailed clutter. Maintain even visual quietness across the full width. Flat surface stays at one scale with parallel plan-view geometry. No horizon, perspective vanishing point, isometric view, actors, vehicles, train, railroad rails, enemies, lettering, icons, text, UI, watermark, bright focal object or repeating side borders. Top/bottom values and material should harmonize for vertical scrolling.
Specific terrain: a vast scorched mauve/slate stone fortress apron, continuous open flat paving across the entire canvas. Very faint embedded metal plates FLUSH with the stone, understated superficial burn marks and broad smoky violet-brown washes. Hint at an ember fortress only through ground materials and subdued residual warm reflected color, without visible fortress structures. NO bulwarks, walls, spikes, barricades, vents, furnaces, rubble, flaming cracks or raised metal along any side. Both extreme left/right edges are clear smooth traversable pavement with no frames and no objects. Avoid black outlines of huge plates; flat marks stay soft and subtle.
```

## 生成、尺寸与左右通道检查

三张均在第一次内置生成后采用，未做程序化像素编辑；实际尺寸均为 **1024×1536、24位RGB**。原始生成文件保留，项目使用新的版本化副本，旧版未覆盖。

| 资产 | 字节数 | SHA256 |
| --- | ---: | --- |
| `assets/resources/art/afterglow-city-v2.png` | 3027018 | `95a6624e02763b38bfab1bb91b7a247d65c1bc6eb7875f9c1d4dda46d0f3c9a2` |
| `assets/resources/art/afterglow-garden-v2.png` | 3085556 | `86fe567af852a7e5c490e51fecdb864d04ccf27596e392639625a48621a3ad35` |
| `assets/resources/art/afterglow-citadel-v2.png` | 3072059 | `5b7c4294d13c198119462df8a1e287c2b50c8e383cb797dcdc69e2ec2dd765dd` |

已目视分别检查左侧、中部和右侧：

- 废城全宽连续湿路面，交叉线条仅为褪色平面涂漆；无路缘、建筑或侧边障碍。
- 花园全宽平整铺地，苔色为薄平面色斑，花瓣分散且微小；无树干、树根、花坛、绿植侧框或温室墙体。
- 要塞全宽连续焦灰地面，金属板嵌平、烧痕浅表；无尖刺墙、堡垒侧框或凸起障碍。
- 三者均未见轨道、列车、敌人、文字、UI、地平线或透视缩窄。美术通过材质和色光变化区分地区。

独立 PNG/source 路径、导入 UUID、像素格式、字节数、SHA256和生成次数记录在 `artifacts/optimization-20260910/twelve-regions/open-terrain-receipts.json`。相邻 `.meta` 从已有1024×1536地表模板派生，使用各自的新UUID；原始 source 仍位于内置生成目录。

整图可见通道已检查；游戏中的实际叠层和纵向滚动由最终集成检查覆盖。
