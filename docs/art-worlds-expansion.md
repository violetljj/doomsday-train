# 开放横向入口地表扩展

本轮交付三张实际战斗地表。用户明确敌人从左右进入，因此画面中部90%高度的整个宽度都保留为连续平面，侧边不以障碍装饰构图。风格依据已实际查看的 `docs/art-directions/C2-afterglow-details.png`，提取其手绘墨线、冷暖叠色和余晖色调，不复制概念图两侧的建筑与杂物。

使用内置 image_gen 顺序生成三次，每张一次。图像未经脚本绘制、裁剪或像素修改，均从内置生成目录原样复制入项目。没有改动 Game.ts 或其他运行时代码。

## 通用验收

- 三张实际尺寸均为 **1024×1536**，纵向比例2:3，**RGB、无alpha通道、全幅不透明地面**。
- 逐张查看了完整图及左右进场区域（横向两端约20%，纵向5%–95%）。三张两侧均无直立障碍、悬崖、坑洞、树木、容器、轨道或走廊式框景。
- 地面线、盐纹、风纹、导航痕迹和云光均表现为平面材质，不暗示不可通行区域。
- 图中没有人物、车厢、敌人、文字或按钮。动态轨道与战斗单位由运行时叠加。
- 每张附整图Cocos元数据：稳定独立UUID、实际宽高、no-trim、packable=false、hasAlpha=false。
- 以上为源图验收；本记录不把源图检查当作运行时左右刷怪、缩放、对比度或手机帧率验证。

## 镜盐荒原

- 资产：`assets/resources/art/afterglow-salt-v1.png`
- 来源：`C:/Users/26442/.codex/generated_images/01a08729-5f33-73c2-b7dd-2ee2411942a6/exec-cf2576da-4cc7-412f-9de4-b88503acad8f.png`
- UUID：`bc28f597-a50f-4fde-a885-91c107bf4017`
- SHA256：`9dd5e94bfe082cecf1fc49755f5f123038c409af27469bce619bfff6c3c4c584`
- 视觉检查：浅丁香盐壳、大片多边形结晶地面、横贯画面的柔和银色矿脉。左右从边缘到中央均为同一平整盐地；没有岸壁、盐堆或水坑。

### 完整生成提示词

```text
Use case: stylized-concept. Asset type: actual production battlefield ground texture for a top-down mobile train survival game, NOT a mockup or concept board. One portrait image requested1024x1536. STRICT orthographic camera directly overhead, no horizon, no perspective, no actors, train, weapons, enemies, shadows cast by actors, words, numbers, signs, UI, borders, rails or railway sleepers. Opaque edge-to-edge ground.

CRITICAL PLAYFIELD COMPOSITION: enemies walk IN from BOTH the LEFT and RIGHT edges across the image toward a central train rendered separately. Therefore the entire middle90% of the canvas height must be uninterrupted flat traversable ground across the ENTIRE width. Left and right edges must be as open, flat, low-contrast and usable as the center. NO left/right framing, corridor, vignette, walls, trees, rocks, crates, cliffs, pits, fence, building edges, guardrails, raised props or deep cracks. No blocked corner compositions. Do not draw a central road flanked by scenery. It is an expansive open horizontal traversal surface extending off both side edges. If a landmark is necessary it may only exist inside the TOP or BOTTOM5% under the HUD; prefer no raised landmark at all.

Hand-painted afterglow gouache and variable ink style: broad imperfect color planes, cold muted lilac/indigo shading, restrained dusty peach sunset light, occasional soft dry brush drag that follows material structure. Low contrast everywhere units can move, no dense noise, photorealism or plastic3D. Distinctive material transitions should be FLAT painted texture, never obstacles. Large quiet shapes and visible painterly craftsmanship. No baked strong lighting hotspots.
REGION: MIRROR SALT WILDERNESS / 镜盐荒原. Create a broad pale-lilac dry salt flat continuing off all four edges. Few expansive polygon-shaped salt crust fields, edges shown with delicate silver-gray seams and thin irregular ink accents. Long subdued silvery mineral veins crossing the ground and several very shallow matte silver-lavender reflection patches, all flat and walkable. Paint some broad warm blush off-white crust patches against cool dusty violet salt, varied irregular scale; no repetitive generated microtexture. A subtle diagonal distribution of large planes gives composition but leaves every left and right entry route open. This is solid compact dry salt ground, NOT water, ice cliffs, a lake, fractured floating plates, pits, rocky shores or a canyon. Entire middle90%height is fully unobstructed edge-to-edge flat ground.
```

## 风蚀沙海

- 资产：`assets/resources/art/afterglow-dunes-v1.png`
- 来源：`C:/Users/26442/.codex/generated_images/01a08729-5f33-73c2-b7dd-2ee2411942a6/exec-ea8de7ab-ac7e-4564-8f6f-371e9dc369e6.png`
- UUID：`bc28f597-a50f-4fde-a885-91c107bf4018`
- SHA256：`cc0d83116306430f7faf7c2e1ca3f09747f6dedf1773a28f0aa00c7e49afd133`
- 视觉检查：灰玫瑰与低饱和赭色夯实沙地，浅风纹斜向扫过整幅。左右边缘保持同样的开放地面；没有高沙丘、巨石或峡谷夹道。最新的画外远古飞船投影要求在本图生成完成后收到，因此此源图不含该投影；未将其标为已完成。

### 完整生成提示词

```text
Use case: stylized-concept. Asset type: actual production battlefield ground texture for a top-down mobile train survival game, NOT a mockup or concept board. One portrait image requested1024x1536. STRICT orthographic camera directly overhead, no horizon, no perspective, no actors, train, weapons, enemies, shadows cast by actors, words, numbers, signs, UI, borders, rails or railway sleepers. Opaque edge-to-edge ground.

CRITICAL PLAYFIELD COMPOSITION: enemies walk IN from BOTH the LEFT and RIGHT edges across the image toward a central train rendered separately. Therefore the entire middle90% of the canvas height must be uninterrupted flat traversable ground across the ENTIRE width. Left and right edges must be as open, flat, low-contrast and usable as the center. NO left/right framing, corridor, vignette, walls, trees, rocks, crates, cliffs, pits, fence, building edges, guardrails, raised props or deep cracks. No blocked corner compositions. Do not draw a central road flanked by scenery. It is an expansive open horizontal traversal surface extending off both side edges. If a landmark is necessary it may only exist inside the TOP or BOTTOM5% under the HUD; prefer no raised landmark at all.

Hand-painted afterglow gouache and variable ink style: broad imperfect color planes, cold muted lilac/indigo shading, restrained dusty peach sunset light, occasional soft dry brush drag that follows material structure. Low contrast everywhere units can move, no dense noise, photorealism or plastic3D. Distinctive material transitions should be FLAT painted texture, never obstacles. Large quiet shapes and visible painterly craftsmanship. No baked strong lighting hotspots.
REGION: WIND-ERODED SAND SEA / 风蚀沙海. Paint an expansive COMPACTED FLAT sandy plateau from directly above. Dusty gray-rose sand, a few broad desaturated ochre and mauve underpaint planes, long shallow wind-ripple bands and flattened sand-grain brush drags swept diagonally across the entire width. The wind patterns are small raised texture at most, no dunes, hills or dramatic shadow slopes. Gentle transitions alternate pale dusty clay/sand patches with cool lavender wind-brushed patches; a few faint flat abrasion trails and erased ancient horizontal scrape marks imply history without props. Avoid uniform noise, use deliberate broad painted composition. The terrain extends uninterrupted off both left and right sides; NO rock walls, boulders, side cliffs, tall dunes, central path or framed corridor. Both side entry regions must be open level sandy ground with the SAME quiet material as the center. Low contrast throughout the middle90%height. Warm dusty sand distinct from pale salt or gray concrete, but cohesive with cold twilight shadows.
```

## 断桥高架

- 资产：`assets/resources/art/afterglow-viaduct-v1.png`
- 来源：`C:/Users/26442/.codex/generated_images/01a08729-5f33-73c2-b7dd-2ee2411942a6/exec-ba00dd22-5920-4dbb-8845-497724da3f9a.png`
- UUID：`bc28f597-a50f-4fde-a885-91c107bf4019`
- SHA256：`bc0235b4ae789367d1056c8cbcbcd35609dcf7076c2885502307692fad48ca43`
- 视觉检查：宽阔灰紫混凝土地板、嵌入地面的残损导航环、褪色横向车道短线，以及与平面材质相融的余晖云光倒影。两侧画面均延续完整桥面，没有栏杆、边坎、桥外深渊或断面；导航环也是地面纹理，不是战斗UI。

### 完整生成提示词

```text
Use case: stylized-concept. Asset type: actual production battlefield ground texture for a top-down mobile train survival game, NOT a mockup or concept board. One portrait image requested1024x1536. STRICT orthographic camera directly overhead, no horizon, no perspective, no actors, train, weapons, enemies, shadows cast by actors, words, numbers, signs, UI, borders, rails or railway sleepers. Opaque edge-to-edge ground.

CRITICAL PLAYFIELD COMPOSITION: enemies walk IN from BOTH the LEFT and RIGHT edges across the image toward a central train rendered separately. Therefore the entire middle90% of the canvas height must be uninterrupted flat traversable ground across the ENTIRE width. Left and right edges must be as open, flat, low-contrast and usable as the center. NO left/right framing, corridor, vignette, walls, trees, rocks, crates, cliffs, pits, fence, building edges, guardrails, raised props or deep cracks. No blocked corner compositions. Do not draw a central road flanked by scenery. It is an expansive open horizontal traversal surface extending off both side edges. If a landmark is necessary it may only exist inside the TOP or BOTTOM5% under the HUD; prefer no raised landmark at all.

Hand-painted afterglow gouache and variable ink style: broad imperfect color planes, cold muted lilac/indigo shading, restrained dusty peach sunset light, occasional soft dry brush drag that follows material structure. Low contrast everywhere units can move, no dense noise, photorealism or plastic3D. Distinctive material transitions should be FLAT painted texture, never obstacles. Large quiet shapes and visible painterly craftsmanship. No baked strong lighting hotspots.
REGION: BROKEN SKY VIADUCT / 断桥高架. Imaginative premise: the last endlessly rebuilt train crosses a strange ruined world that still operates. This is a VERY WIDE, completely unbroken flat old suspended infrastructure deck far above clouds. The deck continues beyond BOTH LEFT AND RIGHT image edges, so no bridge edge or abyss appears anywhere. High altitude is suggested ONLY through beautiful faint cloud-light/spectral-sky REFLECTIONS painted INTO the concrete, as though the old deck material remembers the sky. No literal holes, glass window into a chasm, open sky strip or vertical scenery.

Create pale graphite-lilac broad concrete panels, irregular hand-inked hairline joints and mellow worn smoky violet planes. Quiet faded horizontal lane dashes and subtle embedded navigation traces run through the floor, like a forgotten guidance network still barely awake. One memorable large broken circular navigation-rose trace is sunk FLUSH into the ground near the upper third: a incomplete thin desaturated silver-cyan arc with several old short radial ticks and warm blush luminous residue, no text or glowingUI. A long extremely soft cloudlike indigo reflection and narrow dusty pearl slivers drift diagonally over that worn ring; material reflections, not objects or deep puddles. These painterly layers create atmosphere without high contrast. Entire left/right middle90%height remains flat safe unobstructed concrete. No side guardrails, edge curb, cliff, chasm, rocks, walls or framing clutter. If needed one faint buried old rail-remnant abrasion lies ONLY in the top5% and does not cross into combat space. This is a usable battlefield ground plate, not a view of a bridge, no visible bridge sides.
```
