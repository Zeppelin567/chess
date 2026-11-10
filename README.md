# ♞ Chess

A **two-player chess game** that runs entirely in the browser — no install needed. Play locally, or online with a friend via a room code.

## Play

- **Online:** https://zeppelin567.github.io/chess/ (no download, just open the link)
- **Locally:** open `index.html` in a browser (internet required to load the `chess.js` and Firebase libraries)

## Features

- Click a piece to select it — green dots mark legal moves (ring = capture), then click a target square
- **Chess clocks** — configurable time control (1/3/5/10/15/30 min per side); flagging loses the game
- **Promotion picker** — choose queen / rook / bishop / knight when a pawn promotes
- **Online play** — create or join a room with a code; moves, clocks and results sync in realtime (first to join plays White)
- Flip board view, captured pieces + material score, move list
- Check / checkmate / stalemate / draws detected automatically

## Puzzles

Weekly puzzles from the De Anza Chess Club — same puzzles as the club's
Instagram ([@deanzachessclub](https://www.instagram.com/deanzachessclub)).
Open the **🧩 Puzzles** tab (or go straight to
https://zeppelin567.github.io/chess/#puzzles).

- Click a piece to select it — green dots mark legal moves, then click a
  target square. Every move is checked against the solution: a correct move
  plays the opponent's reply, a wrong move shakes the board and counts as a
  miss. Solve it to see the full solution.
- **Hint / Reset / Flip** buttons; the board auto-flips so the side to move
  is at the bottom. The **Archive** lists every posted puzzle — click one to
  play it.
- Puzzle data lives in the club repo
  ([Zeppelin567/chess-club-puzzles](https://github.com/Zeppelin567/chess-club-puzzles))
  and is fetched at runtime (`data/queue.json` + `data/puzzles.csv`), so the
  puzzle here always matches the latest Instagram post.
- **No account, no backend, no analytics.** Attempts and solved puzzles are
  stored only in your own browser (localStorage) — nothing leaves your device.

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
- [x] Puzzles mode — weekly puzzles from the De Anza Chess Club (data from Zeppelin567/chess-club-puzzles)
- [ ] Play vs computer (Stockfish)
