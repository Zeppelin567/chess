# ♞ Chess

A **two-player chess game** that runs entirely in the browser — no install needed.

## Play

- **Online:** https://zeppelin567.github.io/chess/ (no download, just open the link)
- **Locally:** open `index.html` in a browser (internet required to load the `chess.js` rules library)

## How to play

- Click one of your pieces to select it — green dots show legal moves, then click a target square
- Check / checkmate / stalemate / draws are detected automatically
- Side panel shows captured pieces, material score, and the move list
- Pawn promotion auto-queens
- "Flip board" switches to black-at-bottom view

## Tech

- `index.html` — board UI + interaction logic (single self-contained file)
- Rules engine: [chess.js](https://github.com/jhlywa/chess.js) (via CDN) — legal moves, check, checkmate, castling, en passant, and draw detection

## Roadmap

- [x] Flip board view
- [ ] Play vs computer (Stockfish)
- [ ] Chess clocks
- [ ] Choose promotion piece
