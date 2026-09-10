# 0.7 场景与车头素材记录

使用内置 ImageGen 生成，最终素材已复制到项目资源目录。车头采用首版真实 RGBA；第二版比例调整输出烘焙棋盘格的 RGB，因此未接入。运行时按完整透明轮廓矩形切片。

## 城市地表

文件：`assets/resources/art/afterglow-ground-v2.png`

完整提示词：

```text
Use case: stylized-concept. Create a production-ready game terrain bitmap for the portrait top-down auto-battler '末日列车 / Afterglow Defense'. Input image 1 is ONLY a style reference, a painted art-direction board. Input image 2 is the old terrain, a layout reference to improve. Generate ONE full-bleed portrait terrain, 1024x1536 or same 2:3 proportion. Orthographic strict directly overhead view, no horizon, no perspective walls. Sophisticated gouache and ink, handmade broad layered pigment shapes, dusk lavender stone, dusty mauve, muted peach light from upper-left, cool indigo shadows. A derelict railway service road across a ruined city with rain-dark stone, shallow soft reflected light, sparse weeds and cracked concrete. Central 70 percent width must be an uninterrupted LOW-CONTRAST softly painted ground on which small enemies and the central train will read clearly. Much less tiny rubble/crack noise than reference 2. On the extreme left and right margins only: cropped abandoned platform slabs, small broken drainage channels, a few copper pipes, restrained dry brush weeds and abandoned freight remnants, asymmetrical beautiful composition. Center vertical 18 percent width calm and clear for rails drawn by game code. Entire terrain usable for scrolling with very similar palette/value at top and bottom edges, no strong seam. Edge landmarks subtle, not bright props. Rich handpainted structure rather than flat colored noise; distinct warm/cool brushwork, no photorealism, no pixel art, no UI. NO train, NO enemies, NO tracks, NO text, NO signs with writing, NO glowing icons, NO interface, NO mockup frames. This image will replace terrain while existing train sprites and attacks remain game-rendered.
```

## 孢雾花园

文件：`assets/resources/art/afterglow-garden-v1.png`

完整提示词：

```text
Create one production portrait game terrain painting for 'Afterglow Defense', strict directly overhead orthographic view, 1024x1536, entire canvas filled. Style reference image is painterly ink/gouache twilight art direction. Region: abandoned botanic railway courtyard engulfed by pale bioluminescent fungal growth. VERY QUIET central70percent width weathered desaturated plum-grey paving and soft green-grey shadows, unobstructed for train/enemy gameplay, no actors. Distinct edge landmarks ONLY in outer15percent strips: crumbling greenhouse iron ribs, pale branching roots crawling around cropped stone planters, large muted mauve shelf fungi, moss patches and a few softly pale mint spore lanterns. Elegant overgrown ruined garden rather than horror gore. Soft mist and broad layered painted shade. Hand-ink contours and gouache brush shapes, sophisticated warm/cool depth, thin subdued amber dust, restrained luminous mint accents confined to margins. Top and bottom same values and similar ground for vertical repetition. NO horizon/perspective, NO rails, NO train, NO enemies/people, NO UI/text/borders/numbers. Avoid tiny allover crack noise; central area smooth low contrast, edge details more interesting. Distinct from generic city rubble; genuine narrative garden environment, no shiny3D.
```

## 三种车头

文件：`assets/resources/art/afterglow-locomotives-v1.png`

完整提示词：

```text
Use case: stylized-concept. Production GAME SPRITE ATLAS, not a concept board. Create one transparent PNG atlas containing exactly THREE distinct armored locomotive HEAD units for a top-down portrait game. Reference image is style only (twilight gouache and ink), never copy text/UI. Layout: three evenly spaced equal-width columns, ONE row. Each column contains ONE complete isolated engine, pointing straight UP in strict orthographic overhead view. No perspective/isometric view. Each locomotive has a 2:3 width:height silhouette and ample transparent padding, no overlap, no shadows outside sprite. Image roughly1536x1024, each sprite centered in its column. Left: DAWN, warm weathered peach/brass iron, strong triangular plow at top, paired round lamps, compact central cannon/vent machinery, industrial asymmetric armor. Middle: STORM, desaturated indigo/purple armored engine, twin copper induction coils and subtle cyan electrical core, angular mechanical lightning shape worked into armor (no written symbol). Right: HAVEN, sage/teal and dusty ivory heavy locomotive, broader shield plow, rounded layered protection and small amber rescue lantern, visible mechanical shield generator. All recognizably train engines with same base scale, wheels tucked along sides, coupler at BOTTOM joining following carriage. Sophisticated handdrawn ink edges, broad gouache pigment with warm/cool layered shadow shapes, highlights carefully painted, no photorealistic metal, no pixel art, no toy3D, no generic UI icons. Fine mechanical detail only where legible at100px tall. Silhouette must read strongly against dark lavender ground. Do not include smoke or active attack effects. Exactly3engines, transparent background, no ground/rails/environment, no captions, no frames, no digits, no words, no watermark.
```

