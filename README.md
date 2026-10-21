# ♞ Chess

A **two-player chess game** that runs entirely in the browser — no install needed. Play locally, or online with a friend via a room code.

## Play

- **Online:** https://zeppelin567.github.io/chess/ (no download, just open the link)
- **Locally:** open `index.html` in a browser (internet required to load the `chess.js` and Firebase libraries)

## Features

- Click/tap a piece and its target square, or drag the piece with a mouse, pen or touch screen. Dots mark legal moves; rings mark captures.
- **Responsive board** — coordinates, last-move and check highlights, with player clocks above and below the board on desktop and mobile
- **Keyboard controls** — Tab into the board, use arrow keys to explore, Enter/Space to select or move, and Escape to deselect. Promotion choices support Tab and Escape.
- **Chess clocks** — configurable time control (1/3/5/10/15/30 min per side); flagging loses the game
- **Promotion picker** — choose queen / rook / bishop / knight when a pawn promotes
- **Online play** — create or join a room with a code; moves, clocks and results sync in realtime (first to join plays White)
- Flip board view, captured pieces + material score, move list
- Check / checkmate / stalemate / draws detected automatically
- **PGN export** — copy or download the move history with date, result and original time control for use in chess analysis tools. Unfinished games export with result `*`.

Clocks start after White's first move locally. The current player is charged for elapsed time even when the tab is in the background. Choose a time control before starting a game; use **New game** to reset the board and clocks.

## Development and checks

No build step is required. To preview with a local web server:

```sh
python3 -m http.server 3011 --bind 127.0.0.1
```

Open http://127.0.0.1:3011/. Internet access is still needed for the CDN libraries.

With Node.js 22 or newer, install the development dependencies and run the regression tests:

```sh
npm ci
npm test
```

Tests run the page's actual game module in JSDOM with the same chess.js version, a controlled clock and no Firebase connection. They cover elapsed time, move deadlines, promotion, material counts, board controls and PGN round trips. Browser checks are still needed for visual layout, physical pointer input, clipboard permissions and downloads. Online clocks remain client-controlled; these tests do not validate real two-device Firebase synchronization.

## Tech

- `index.html` — board UI + game logic (single self-contained file)
- `firebase-config.js` — your Firebase web config for online play (see below)
- Rules engine: [chess.js](https://github.com/jhlywa/chess.js) (via CDN)
- Online sync: [Firebase Realtime Database](https://firebase.google.com/docs/database) (via CDN)

## Enabling online play

GitHub Pages only serves static files, so realtime sync needs a free Firebase project (5 minutes, one time):

1. Go to https://console.firebase.google.com → **Add project** (skip Google Analytics).
2. Left menu → **Build → Realtime Database** → **Create database** → **Start in test mode**.
3. Gear ⚙ → **Project settings** → **Your apps** → Web (`</>`) → register an app, then paste the config values into `firebase-config.js`.
4. In **Realtime Database → Rules**, paste and Publish:
   ```json
   { "rules": { "rooms": { "$room": { ".read": true, ".write": true } } } }
   ```
   (Open rules are fine for casual games with friends; don't put anything sensitive in room codes.)

Until a real config is pasted, the page shows "Online play is not configured yet" when you try to join.

## Roadmap

- [x] Flip board view
- [x] Chess clocks
- [x] Promotion piece choice
- [x] Online play via room codes
- [ ] Play vs computer (Stockfish)
