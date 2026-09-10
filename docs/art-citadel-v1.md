# 余烬要塞地表 v1

用途：第六区域的独立地表，配合既有列车、敌人和轨道叠层。生成方式为内置 image_gen，单图生成；未使用 API/CLI。

风格参考（已查看）：`docs/art-directions/C2-afterglow-details.png`、`assets/resources/art/afterglow-ground-v2.png`。参考用于构图与画风判断，生成调用未将它们作为待编辑图片。

目标：`assets/resources/art/afterglow-citadel-v1.png`，1024×1536，严格俯视，中央70%安静可读，两侧各15%为焦黑要塞残骸。禁止轨道、列车、敌人、文字、UI与地平线。上下边缘保持相近明度，降低纵向重复接缝。

## 生成提示词

```text
Use case: stylized-concept.
Asset type: one finished 2D scrolling ground tile for the portrait survival train game "Doomsday Train". Generate ONE new image, exactly 1024 pixels wide by 1536 pixels high, portrait 2:3. Opaque PNG appearance.
Primary request: a strict directly overhead, orthographic, plan-view ruined fortress road for the final region "Ember Citadel". This is TERRAIN ONLY, a playable ground texture, not an establishing scene, not a poster.
Style: sophisticated hand-painted twilight gouache with fine dark ink edge accents, dusty paper-grain texture, broad broken brushwork. Muted slate, dusty mauve and ink navy stone, desaturated rust. Match an afterglow fantasy-industrial game's painterly ground: irregular subdued stone wear, narrow perimeter rubble, gentle uneven violet-grey values.
Composition: central 70 percent of the entire width is a quiet broad dark mauve/slate fortress roadway with subtle worn flat pavement, low contrast and very sparse small cracks. This central gameplay lane must remain calm, clear and unobstructed from top to bottom. All large recognizable architecture is tightly confined to the outermost 15 percent strip on the LEFT and outermost 15 percent strip on the RIGHT, cropped by those image edges: massive charred iron bulwark plates, broken iron barricade fragments, tiny subdued red-orange furnace vents. Bulwarks should feel heavy and threatening without becoming large buildings inside the playing lane. Long angular cool shadows from edge objects, subtle enough not to obscure sprites. Only restrained ember illumination close to the perimeter; no large flame.
Lighting: diffuse twilight from above, quiet dark middle values, slight warm edge glints. Top and bottom edges must have matching roadway color and value and no horizontal boundary, to support vertical scrolling/repetition. Broad continuous central corridor; identical scale throughout, no tapering, no vanishing point.
Absolutely no rails, railroad tracks, train, vehicles, enemies, characters, creatures, UI, labels, lettering, symbols, logos, text, border frame, horizon, sky, isometric perspective, tilted camera, scenic vista, central focal object, giant embers or bright center. All surfaces viewed straight down. Produce terrain art only.
```

## 检查记录

- 第一次生成即采用；未进行二次生成或程序化像素编辑。
- 内置生成源：`C:\Users\26442\.codex\generated_images\01a08729-41f7-74b0-bc0a-1598f54047f0\exec-29fa672f-0bf6-4362-b133-15c353716e5f.png`。原始输出保留，项目使用独立副本。
- 最终资产：`assets/resources/art/afterglow-citadel-v1.png`，实际 **1024×1536**，24位 RGB，3,033,505 字节。
- SHA256：`eeb7f99451170a89564d35239f3b73e4a4113e7ff675160286f6aaea55010f55`。
- Cocos UUID：`ae295cae-b00c-49a7-b76b-c8c3fd554a76`；元数据沿用已有地表的导入设置，使用独立纹理及 sprite-frame 引用，尺寸匹配实际 PNG。
- 已目视检查：严格俯视；中央为连续暗灰紫路面；两侧为焦黑尖刺装甲与低亮度炉口，区别于废城街道；未见轨道、车、人形敌人、文字、UI或地平线。
- 上下均延续相近色值的路面与边缘堡垒；游戏内纵向滚动接缝和最终叠层可读性由集成试玩继续检查。
