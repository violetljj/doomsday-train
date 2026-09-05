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
