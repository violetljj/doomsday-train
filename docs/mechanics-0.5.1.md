# Mechanics 0.5.1

## Supplies and workshop

The first supply offers Fan, Cryo, and an offense car. From the second supply onward, a train with open slots alternates a support or offense car with a mod. When damaged, its third card is a repair. A full five-car train receives one car and two distinct useful mods; it favors a duplicate two times out of three, but can offer an uninstalled car for later rebuilding. When damaged, the third full-train card becomes a repair. Repairs restore up to 30 HP, capped at maximum HP, and show the actual recovered amount.

Choosing a duplicate car opens the workshop as usual. `mergePending(index)` is available for a same-type installed car: it consumes the pending duplicate, increases that car's numerical level, and preserves its ID, installed mode mods, and cooldown state. Numerical car and link upgrades have no level cap; mode modifiers remain capped at two for bounded projectile count and rate.

## Weapons and boss

While damaged and in active combat, the train restores 1 HP every 5 simulated seconds, capped at maximum HP. Arrival, pause, supply, workshop and results do not advance recovery. Full HP clears stored recovery time; a fresh run resets it. Lethal damage resolves before regeneration, so it cannot revive a defeated train.

The cannon fires heavy shells at 390 speed. Ordinary cannon shells explode on their first impact: the direct target takes full snapshot damage and enemies within 45 take 55 percent. Rail attacks resolve along a complete piercing beam, with 0.18 seconds of visual persistence.

Boss slams occur every 6 seconds. The first boss wave deals 8 damage per slam, then damage rises by 2 per wave to a maximum of 16.

## Presentation 0.6.0

The active train has five slots. Repair and shield cars use dedicated roof-view painted modules (`afterglow-support-top-v08`), matching the camera of other combat equipment. Modifier offers use the 18-cell atlas (`afterglow-mods-v07`), with drawn fallbacks during loading. Flame bursts use four individually cropped stages (`afterglow-flame-v08`) plus ribbons and embers; the black sheet is rendered with additive blending. The UI uses the painted paper surface, restrained card fills, serif headings and sans-serif body text. See [production art notes](art-directions/production-v060.md).

The first boss appears from the middle of the left or right edge (`x = ±285`, `y = -180`), so the entrance composition stays clear of the train. These changes are presentation-only unless noted above; combat state remains deterministic at 1×, 2× and 4×.
