# Mechanics 0.5.1

## Supplies and workshop

The first supply offers Fan, Cryo, and an offense car. From the second supply onward, a train with open slots alternates a support or offense car with a mod. When damaged, its third card is a repair. A full five-car train receives one car and two distinct useful mods; it favors a duplicate two times out of three, but can offer an uninstalled car for later rebuilding. When damaged, the third full-train card becomes a repair. Repairs restore up to 30 HP, capped at maximum HP, and show the actual recovered amount.

Choosing a duplicate car opens the workshop as usual. `mergePending(index)` is available for a same-type installed car: it consumes the pending duplicate, increases that car's numerical level, and preserves its ID, installed mode mods, and cooldown state. Numerical car and link upgrades have no level cap; mode modifiers remain capped at two for bounded projectile count and rate.

## Weapons and boss

The cannon fires heavy shells at 390 speed. Ordinary cannon shells explode on their first impact: the direct target takes full snapshot damage and enemies within 45 take 55 percent. Rail shots travel at 620 speed and pierce in a narrow line. Special linked shell behavior remains unchanged.

Boss slams occur every 6 seconds. The first boss wave deals 8 damage per slam, then damage rises by 2 per wave to a maximum of 16.
