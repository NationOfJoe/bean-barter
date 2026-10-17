# Bean Barter

A browser version of the card game Bohnanza by Uwe Rosenberg, using the 4-player base game rules: 104 cards, 8 bean types, two fields each. You play against three computer rivals: Mira, Otto and Juno.

This is an unofficial fan project and isn't affiliated with AMIGO or Rio Grande Games. The cards are drawn in plain CSS, not copied from the game's artwork.

**Play it:** https://nationofjoe.github.io/bean-barter/

## How a turn works

1. **Must plant, may plant.** Plant the first card of your hand. You may plant the next one too.
2. **Turn up two.** Two cards from the deck go into the market.
3. **Trade.** Offer market cards or any cards from your hand. Only the active player trades.
4. **Plant trades.** Every card you kept or received must be planted.
5. **Draw three** to the back of your hand.

The game ends when the deck runs out for the third time. Most coins wins.

## Files

- `bean-barter.html` is the game source.
- `index.html` is generated from it by `build.js`. This is the page GitHub Pages serves, and you can also open it straight from disk.
- `tests/simulate.js` plays five full games without a browser and checks that each game ends and all 104 cards are accounted for.

## Development

After editing `bean-barter.html`:

```
node build.js
node tests/simulate.js
```

Each simulation line shows the coins per player (You/Mira/Otto/Juno), whether the game ended, how many times the deck ran out, and the total card count.
