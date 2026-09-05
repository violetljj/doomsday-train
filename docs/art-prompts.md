# Generated game art

Method: built-in `image_gen.imagegen`; one generation call per asset. No API/CLI fallback and no image post-processing. Generated PNG files were copied byte-for-byte to the project, preserving the alpha channel. Source originals remain under `C:\Users\26442\.codex\generated_images\01a072d5-ae4b-7851-a8e3-068bf7836c48`.

## Locomotive

- Project asset: `assets/resources/art/locomotive.png`
- Generated source: `exec-77399bfa-7bbd-4156-b8e4-390ed16e05b0.png`
- Actual dimensions: 1024 × 1536. The generator did not honor the requested square canvas. The source is preserved; consuming sprite code should account for this aspect ratio.
- Visual inspection: one armored steel-teal locomotive, orange panels, nose toward top, roof seen from above, no attached carriages or text. Elongated silhouette.
- Alpha inspection: System.Drawing read-only pixel sampling every four pixels in both axes; 61,941 fully transparent samples, 36,363 partial-alpha samples, 0 alpha-255 samples. Corner alpha is 0; subject interior is predominantly alpha 252–253. Real transparency exists. Original alpha was not normalized.

Exact prompt:

```text
Use case: stylized-concept
Asset type: transparent PNG sprite for a top-down action game
Primary request: One chunky post-apocalyptic armored locomotive, isolated, no attached carriages.
Scene/backdrop: Genuine transparent background with alpha, no background color, no checkerboard artwork, no ground plane, no tracks.
Subject: A single compact armored train locomotive with a broad reinforced nose pointing toward the TOP of the image. Readable steel armor, rooftop engine vents and restrained warm orange hazard-painted panels.
Style/medium: Polished stylized game asset, chunky clear forms, hand-painted 3D-like shading, bold clean silhouette, readable when reduced to game sprite size.
Composition/framing: Square canvas. Exactly straight top-down orthographic view, camera vertically above the roof, zero perspective tilt, zero isometric angle, centered vehicle aligned to vertical image axis. Entire locomotive visible with narrow transparent margin. Front/nose at top, rear at bottom. Elongated body roughly twice as tall as wide.
Lighting/mood: Soft upper-left lighting, restrained self-shading, no external cast shadow.
Color palette: Dark steel teal armor with warm orange warning paint and charcoal undercarriage.
Constraints: No text, letters, numbers, logos, watermark, scenery, rails, people, extra vehicles, smoke or particles. Preserve real transparent pixels around the entire object.
```

## Zombie

- Project asset: `assets/resources/art/zombie.png`
- Generated source: `exec-92533338-4ba6-4a94-b45e-72e794690a56.png`
- Actual dimensions: 1254 × 1254.
- Visual inspection: one green-gray hunched mutant, dark torn clothing with orange accent, crown and shoulders visible from above, facing toward bottom, no gore or text. Head and arms form a broad readable silhouette; fine details naturally disappear at gameplay size.
- Alpha inspection: same read-only sample method; 50,207 fully transparent samples, 48,310 partial-alpha samples, 79 alpha-255 samples. Corner alpha is 0; subject interior is predominantly alpha 252–253. Real transparency exists. Original alpha was not normalized.

Exact prompt:

```text
Use case: stylized-concept
Asset type: single transparent PNG enemy sprite for a top-down action game
Primary request: One chunky stylized green-gray mutant zombie, no gore, readable at only 30 pixels tall in gameplay.
Scene/backdrop: A genuinely transparent background with alpha channel. Every pixel outside the character is transparent, not black, not white, no checkerboard artwork, no ground plane.
Subject: Single broad-shouldered hunched zombie with an oversized round green-gray head, ragged charcoal clothing, chunky arms reaching slightly forward and separated legs. No weapon, no blood.
Style/medium: Polished stylized game sprite with chunky hand-painted 3D-like shading and an extremely clear simple silhouette. Large readable color blocks and minimal surface detail.
Composition/framing: SQUARE CANVAS, 1024 by 1024 composition. Exactly straight top-down ORTHOGRAPHIC camera vertically above character, zero perspective tilt, not isometric, not front view. Character facing toward BOTTOM of image, so the crown of head and shoulders are seen from directly above, arms extending toward image bottom. Center character with narrow transparent margin; complete body visible.
Lighting/mood: Soft upper-left light, subtle self-shading, no cast shadow outside the body.
Color palette: Muted green-gray skin, charcoal torn clothing, small warm orange cloth accent.
Constraints: Exactly one character, no text, logo, watermark, frames, floor, scenery, blood, gore, particles, extra characters. Genuine transparent cutout alpha.
```

## Carriage and flame turret: initial generation

Method: built-in `image_gen.imagegen`, one generation call per asset. `assets/resources/art/locomotive.png` was inspected and passed via `referenced_image_paths` as a style reference only. No image post-processing. Originals remain in the generated-images directory listed above.

**Acceptance issue:** Both initial generations produced RGB-only PNGs with a baked checkerboard background. They fail genuine transparency and must not be represented as usable transparent sprites until corrected. Read-only System.Drawing sampling every four pixels found alpha 255 in all 98,596 samples for each image. Both are 1254 × 1254 (`Format24bppRgb`).

### Carriage

- Saved path: `assets/resources/art/carriage.png` (initial generation; transparency failed).
- Source: `exec-7559ea9b-af44-4cad-b618-9af84e8de101.png`.
- Visual inspection: near-square steel-teal flatbed, orange corners, top/bottom couplers, broad empty central ring, top-down view. No weapon/text. Subject suitable; background unsuitable.

Exact prompt:

```text
Use case: stylized-concept
Asset type: separate transparent PNG railcar platform sprite for a top-down action game.
Input image: locomotive.png is STYLE REFERENCE ONLY. Match its steel teal/orange industrial materials, chunky worn armor and upper-left lighting; do not reproduce the locomotive or its long shape.
Primary request: Generate ONE armored flatbed railcar platform with a broad completely EMPTY circular turret mounting ring at its center. No weapon or turret installed.
Composition: Square image canvas. Exactly straight top-down orthographic view vertically above roof, no perspective tilt or isometric projection. Nearly square rectangular railcar body physical width:height ratio 110:120, aligned vertically. Short centered train coupling connectors at both TOP and BOTTOM. Entire body and connectors visible with small transparent margin. A broad clear empty mounting circle occupies the middle half of the flat deck.
Style: Strong chunky silhouette, large readable shapes and worn steel teal panels with restrained orange hazard-painted corners. Clean simplified sprite detail, modest rivets, not noisy photoreal texture. Match reference styling.
Background: GENUINELY TRANSPARENT PNG ALPHA. All space outside object fully transparent, no ground, no rails, no black background, no checkerboard artwork. No external shadow or glow; self-shading inside silhouette only.
Constraints: One platform only, no locomotive, carriages, people, weapon, barrel, fire, smoke, text, letters, logos, watermark or scenery. Mounting ring interior is solid flat deck, not a transparent hole.
```

### Flame turret

- Saved path: `assets/resources/art/flame-turret.png` (initial generation; transparency failed).
- Source: `exec-ee1a458a-0cd8-4838-8806-45da65aa2c9b.png`.
- Visual inspection: circular steel-teal base, two orange fuel tanks, one barrel pointing right, top-down view, no fire/text. Subject suitable; background unsuitable. Base center sits left of full image center because barrel projects right; consuming code should center rotation on the circular base.

Exact prompt:

```text
Use case: stylized-concept
Asset type: separate transparent PNG rotating flamethrower turret sprite for a top-down action game.
Input image: locomotive.png is STYLE REFERENCE ONLY. Match its chunky worn steel-teal armor, warm orange paint, dark industrial machinery, and upper-left lighting. Do not reproduce a train.
Primary request: ONE compact chunky industrial flamethrower turret. Circular rotating base centered in the square canvas, exactly TWO short armored fuel tanks attached behind the mechanism and ONE single thick flamethrower barrel projecting horizontally RIGHT. Muzzle at right. An obvious single-barrel silhouette, not multiple guns. Tanks and turret form a compact readable rotating assembly.
Composition: Square canvas. Exactly straight top-down orthographic camera vertically above the turret, zero isometric tilt. Show rooftop faces and round centered base. Entire turret fully visible, with transparent margin. Barrel points along the image's positive horizontal axis, exactly right.
Style: Polished hand-painted 3D-like game asset, broad simple shapes with bold contour, minimal fine detail. Steel teal body, dark steel barrel, restrained warm orange fuel tank bands and armor accents, worn edges. Strong silhouette readable at 80 pixels.
Background: GENUINELY TRANSPARENT PNG with actual alpha. Every exterior pixel fully transparent, no checkerboard pattern artwork, no white/black background or ground plane. No cast shadow or glow outside object.
Constraints: ONE turret only, ONE barrel only, TWO fuel tanks only. No vehicle, platform, scenery, people, fire, flames, smoke, sparks, text, numbers, logo or watermark.
```

## Carriage and flame turret: background-extraction correction

Method: one targeted built-in `image_gen.imagegen` edit for each failed asset; inspected the local edit targets first, then passed each via `referenced_image_paths`. Subject preservation and genuine alpha were requested explicitly. No image post-processing or fallback API/CLI.

**Final result: transparency still failed for both.** Both edited outputs are 1254 × 1254, `Format24bppRgb`; all 98,596 read-only sampled pixels per image have alpha 255. Baked checkerboards remain. Carriage geometry visually retained; turret was slightly enlarged/repositioned, so exact subject invariance also was not fully honored. No further generation calls were made after this failure.

The two failed PNGs were removed from `assets/resources/art` after hashes proved them identical to retained generated originals. No baked-checkerboard `carriage.png` or `flame-turret.png` remains active. Original failed generations and both failed corrections remain in the generated-images folder above. Other assets and metadata were not modified.

### Carriage correction

- Input: initial `carriage.png` from `exec-7559ea9b-af44-4cad-b618-9af84e8de101.png`.
- Retained failed edit: `exec-3578d71c-4ef4-4d78-8023-0ebc0b48d6cb.png`.

Exact edit prompt:

```text
Use case: background-extraction
Edit target: the supplied armored flatbed carriage image.
Change ONLY the background: remove the entire white/light-gray checkerboard pattern and replace it with genuine transparent pixels in a PNG alpha channel. The input checkerboard is baked RGB artwork, not real transparency; fix this. Deliver a true RGBA cutout with alpha zero outside the carriage. Do NOT render a checkerboard, white, black, colored background, shadow or glow.
Keep the carriage itself exactly unchanged: same top-down view, silhouette, geometry, empty circular mounting ring, connectors, steel-teal and orange colors, panel wear, lighting, original position and proportions. Keep the solid deck inside the ring opaque. Preserve all connectors and clean object edges. No new objects or text. Preserve the square canvas and framing.
```

### Flame turret correction

- Input: initial `flame-turret.png` from `exec-ee1a458a-0cd8-4838-8806-45da65aa2c9b.png`.
- Retained failed edit: `exec-3bd6eecb-238f-4577-b97b-9e684a43080b.png`.

Exact edit prompt:

```text
Use case: background-extraction
Edit target: the supplied flamethrower turret image.
Perform a genuine background removal cutout. Output a PNG file with a real alpha channel. Set ALL white/light-gray checkerboard background pixels to alpha zero, including open negative spaces around tubing. The checkerboard in the supplied image is painted into RGB and MUST be removed. Do not paint any replacement checkerboard, white, black or colored background. Actual transparent background is the required deliverable.
Preserve the turret itself exactly: same square canvas, same position, same top-down orthographic camera, same circular pivot location, same steel-teal armor and orange fuel tanks, same single barrel pointing right, same detailed geometry and colors. Keep object pixels opaque. Crisp clean edges, no cast shadow, glow or halo. Change nothing except removing the background; do not redesign or add fire, smoke or text.
```

## Final opaque carriage deck texture

The implementation changed to an intentionally opaque full-bleed deck material, avoiding the failed transparent-cutout requirement. Root integration supplies external wheels/connectors and separate rotating weapon geometry. This is a new texture generation, not another background-extraction attempt.

- Final asset: `assets/resources/art/carriage-deck.png`.
- Method: one built-in `image_gen.imagegen` generation, with `assets/resources/art/locomotive.png` as style reference via `referenced_image_paths`.
- Source: `exec-9afba7bf-1dc0-42b8-9aca-870b3872b42c.png` in the generated-images directory above; preserved.
- Actual dimensions: 1254 × 1254 (square, although prompt requested 1024 × 1024). `Format24bppRgb` is correct for this intentionally opaque material.
- Verification: visual inspection confirms full-bleed steel-teal deck, top/bottom orange hazard stripes, beveled riveted frame, empty dark central circular mounting socket, no checkerboard, weapon, fan, text, surrounding ground or negative space. Read-only sampling every four pixels found 98,596 alpha-255 samples and zero non-opaque samples.
- Copied byte-for-byte to the project; SHA-256 source/destination match. No image post-processing.

Exact prompt:

```text
Use case: stylized-concept
Asset type: OPAQUE full-bleed square game material texture for a rectangular armored train carriage deck.
Input image: locomotive.png is a material and style reference only. Match its worn steel-teal armor and warm orange hazard paint. Do not reproduce the locomotive shape.
Primary request: A square industrial armored deck panel seen from directly above, with beveled metal border frame, restrained corner rivets, steel-teal weathered large metal plates, warm orange diagonal hazard stripes along TOP and BOTTOM edges, and one dark recessed circular mounting socket centered in the deck. The center socket is EMPTY, a solid dark metal recess: no weapon, fan, grate or machinery protruding from it.
Composition: 1024x1024 SQUARE. Straight top-down orthographic view, no perspective or isometric tilt. Every edge of the deck touches its corresponding image edge. The deck fills 100 percent of the canvas corner to corner. The metal texture continues fully to all four canvas edges. No visible exterior object silhouette or surrounding space. Large simple readable forms with modest wear; avoid fine noisy detail.
Output: Fully OPAQUE image. Entire canvas filled with metal armor surface; no transparent pixels are needed or wanted. No checkerboard pattern anywhere. No background, floor, ground, scenery, external shadow, glow or negative space.
Constraints: NO locomotive, wheels, connectors, weapon, turret, barrel, fan, vents, fire, smoke, text, letters, numbers, logo or watermark. This is a flat full-bleed industrial deck texture, not an isolated cutout or product picture.
```

## Fire vortex additive emission texture

- Final asset: `assets/resources/art/fire-vortex.png`.
- Method: one built-in `image_gen.imagegen` generation, no reference image and no post-processing. Intended as an opaque black-background emission texture for additive sprite blending; no alpha requested.
- Source: `exec-6ee1c6a2-9798-42f7-93e9-545892185a37.png` in the generated-images directory above; preserved.
- Actual dimensions: 1254 × 1254, `Format24bppRgb`.
- Visual inspection: three broad orange/amber spiral flame arms, yellow cores, open dark center and gaps, sparse embers, no solid orange disc, checkerboard, scene, text or side-view funnel. Fire lies within the canvas with a dark exterior margin.
- Read-only verification: corners RGB (1,1,1), (1,1,0), (0,0,0), (0,1,0). Scanned every perimeter pixel: maximum channel value 1/255. Exterior edges are near-black rather than mathematically exact black; this is a minor additive residual to consider in integration. No texture pixels were altered.
- Project copy matches source SHA-256 `AD551BB40DB656B9A3874D0C1B8E49883E6E9FB1B4DFEAE76BE092B879A304F8`.

Exact prompt:

```text
Use case: stylized-concept
Asset type: raw EMISSION VFX texture for a top-down action game using standard ADDITIVE sprite blending.
Primary request: ONE circular fiery tornado swirl viewed from exactly straight above, centered in a square image. Exactly THREE distinct broad curved spiral flame arms swirling around a small dark open center. Orange and amber flame arms have vivid warm yellow cores and detailed wispy flame tongues. Deep black open gaps clearly separate all three arms so gameplay remains visible through additive blending. Add only a few sparse dim embers close to the arms.
Composition: Square canvas, straight top-down flat texture, no perspective. Entire fire swirl occupies the central approximately 80 percent of the image. Broad readable spiral arms, lively uneven tongues with restrained fine detail. The flame curves rotate around the image center. No solid circular orange disc, no filled orange center.
Background and output: Intentionally fully OPAQUE RGB image, no alpha requested. PURE BLACK #000000 exterior and every corner. Fire intensity fades seamlessly to exact black well before all four edges. Wide black exterior margin, no border, no checkerboard, no gray haze, no colored background or ambient illumination. Black pixels contribute zero emission when rendered with additive blending.
Style: Gritty polished stylized industrial action-game fire lighting, bright but readable amber/orange energy, crisp fiery silhouette against black.
Constraints: No text, letters, numbers, logo, watermark, scene, objects, ground, cast shadow, side-view tornado tower, three-dimensional funnel, solid orange disc, colored exterior, or checkerboard. This is only the flat top-down fire emission texture.
```
