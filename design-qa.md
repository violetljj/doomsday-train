# Last Light theme implementation QA

final result: passed

Scope: selected theme implemented in the existing playable Cocos game. This is a theme/interaction acceptance, not a claim that a generative illustration and a live game are pixel-identical or that aesthetic preference is objectively settled.

## Evidence

- Reference: `docs/art-directions/last-light-battle-concept-v1.png`, 941×1672.
- Runtime: `artifacts/lastlight/battle.png`, 470×836 CSS pixels, deviceScaleFactor 1.
- Normalized joint comparison: `artifacts/lastlight/comparison.png`. Reference scaled to 470×836 alongside actual capture; inspected together in one image.
- Additional inspected captures: menu, opening, workshop, pause, battle-tall, pause-tall in `artifacts/lastlight/`.
- Runtime data: `artifacts/lastlight/receipt.json`, zero runtime/resource errors.
- Full opening-flow receipt/video: `artifacts/lastlight/opening/`, 60.0333 seconds of game time; 3 station choices, 6-hit opening piercing chain. This is a functional spot check, not a balance claim.

The five-car frame is a controlled composition using real models, independent sprites and live attacks. Its wave, armor, effects and enemy counts derive from the existing runtime; it does not pretend the concept's wave/time/HP combination or damage values are real baseline mechanics.

## Review and corrections

First rendered pass: P2 header/time footprint over-weighted the scene; P2 footer module assets touched the paper edge; P2 pause footer text reached the light paper edge. Corrected by reducing/moving the upper-left block, using a serif timer, giving the footer more vertical space, moving the module row inward, and extending the dispatch paper. Rebuilt and recaptured; the joint final comparison and pause captures were inspected after the fixes.

Menu was initially an empty scenic screen with vertical generic text. Replaced with the custom brush title and a real selected engine plus light crystal carriage. This follows the selected theme in a state not explicitly pictured by the reference.

## Five fidelity surfaces

- Typography: custom raster brush logo preserves the selected visual language; game copy remains real text. Timer uses Georgia/serif. Body/UI text uses the existing licensed font, regenerated to cover all 648 CJK source characters. No missing-glyph findings in final captures.
- Layout: clear central train lane, upper-left operational information, lower carriage strip/primary action; no primary CTA blocked. Gameplay hit targets and pause/workshop positions exercised. Source is 9:16; 390×844 retains the game's letterboxed viewport, with controls inside the visible game area.
- Color: petrol/jade city, warm ivory sunlight, vermilion lacquer and paper-tickets; active light couplings correspond to actual links. Status/damage channels retain distinguishable color semantics.
- Imagery: independent generated city/train/enemy/UI assets, measured crop bounds, no fake checkerboard shown in-game. Magenta-key material preserves red rather than desaturating it. Weapon proportions and rotation origins respected; front-facing ink enemies stay upright.
- Copy/content: real timer/armor/modules and actual synergy summaries; no decorative fake metrics. New flavor copy avoids inventing gameplay capabilities. Main menu, workshop, pause, garage and supply text retained meaningful actions.

No remaining P0/P1/P2 blocker identified for this theme implementation. P3 differences retained intentionally: live unit density/attack shapes depend on combat, illustration camera perspective is not imposed on simulation coordinates, and tall phones retain aspect-preserving bars. Static sunlight-city scenery is currently shared by all existing regions; this is not twelve newly illustrated environments.

## Validation

- Cocos web build: passed.
- TypeScript: passed.
- Core combat suite: passed.
- Panel and garage panel suites: passed.
- CJK font coverage: passed.
- New Last Light runtime integration at 470×836 and 390×844: passed.
- Existing full opening interaction check updated for the new footer and panel identity: passed (natural offer → workshop → install → link feedback → station choices).

No online deployment performed. Build is available through the project's existing `玩一下.cmd` launcher. Test browsers close in finally paths; the temporary validation server is released at handoff. Existing user WIP and old durable assets are preserved.
