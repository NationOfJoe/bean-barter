# Bean Barter

A browser version of the card game Bohnanza by Uwe Rosenberg, using the base game rules for 3 to 5 players: 104 cards, 8 bean types, two fields each (three each in a 3-player game).

Play against AI rivals on your own, or host an online room: friends join with a 5-letter code from their own phone or computer, and you can fill any empty seats with AI.

## Playing online

1. Enter your name and press **Create room**. You get a room code and an invite link.
2. Friends open the link (or the site), enter their name and the code, and press **Join game**.
3. Set how many AI rivals to add (3 to 5 players in total) and press **Start game**.

The host's browser runs the game, so the host needs to keep the page open. Players connect directly to the host through [PeerJS](https://peerjs.com/), which uses its free public server only to introduce the browsers to each other; there is no game server. If someone drops out, they can rejoin with the same name and code, or the host can let the AI play their seat.

Online play needs the page served from the web (for example GitHub Pages). It doesn't work inside the claude.ai artifact, which blocks the connection.

This is an unofficial fan project and isn't affiliated with AMIGO or Rio Grande Games. The cards are drawn in plain CSS, not copied from the game's artwork.

**Play it:** https://nationofjoe.github.io/bean-barter/

## How a turn works

1. **Must plant, may plant.** Plant the first card of your hand. You may plant the next one too.
2. **Turn up two.** Two cards from the deck go into the market.
3. **Trade.** Offer market cards or any cards from your hand. Only the active player trades.
4. **Plant trades.** Every card you kept or received must be planted.
5. **Draw three** to the back of your hand.

The game ends when the deck runs out for the third time. Most coins wins.

## Android app

`android/` builds an APK that plays fully offline: the game page, its fonts and PeerJS are packed inside the app. Playing against the AI needs no connection; online rooms still need internet.

```
bash android/build-apk.sh
```

This writes `android/out/BeanBarter.apk`. It uses the plain Android SDK tools (platform 29, build-tools 29.0.2) plus a JDK, Node and Python, with no Gradle. The first build downloads the fonts and PeerJS into `android/.cache` and creates a signing key, `android/beanbarter.keystore`, with its password in `android/keystore-password.txt`. Keep both: Android only installs an update over an existing install when it's signed with the same key. They're kept out of git.

To install, copy the APK to the phone and open it. Android asks you to allow installs from that app (Files, Chrome, etc.) the first time.

## Files

- `bean-barter.html` is the game source.
- `index.html` is generated from it by `build.js`. This is the page GitHub Pages serves, and you can also open it straight from disk.
- `android/` holds the Android wrapper: `MainActivity.java` shows the game in a full-screen WebView, `make-assets.js` packs the offline page, and `build-apk.sh` builds and signs the APK.
- `tests/simulate.js` plays 15 full games without a browser, with 1 to 3 human seats and 0 to 3 AI, and checks that each game ends after the third deck run-out, all 104 cards are accounted for, and 3-player games get three fields.

## Development

After editing `bean-barter.html`:

```
node build.js
node tests/simulate.js
```

Each simulation line shows PASS or FAIL, the coins per player, the winner, and how many trades happened.
