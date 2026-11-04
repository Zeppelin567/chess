import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Chess } from 'chess.js';
import { JSDOM } from 'jsdom';
import { ComputerEngine, DIFFICULTIES } from '../computer.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*?;\s*$/gm, '');

function app(t) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/chess/' });
  t.after(async () => { window.testing?.engine.stop(); await new Promise(resolve => setImmediate(resolve)); dom.window.close(); });
  const { window } = dom;
  let now = 1_000_000;
  let tick;
  const workers = [];
  window.Worker = class {
    constructor() { this.commands = []; workers.push(this); }
    postMessage(command) { this.commands.push(command); }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage?.({ data }); }
  };
  window.ComputerEngine = ComputerEngine;
  window.DIFFICULTIES = DIFFICULTIES;
  window.Chess = Chess;
  window.Date.now = () => now;
  window.setInterval = (callback) => { tick = callback; };
  window.eval(source + `\nwindow.testing = {
    game, doMove, render, renderCaptured, pgnText, engine, playComputerMove,
    state: () => ({ clocks: { ...clockMs }, gameOver, pendingPromo, mode, humanColor, computerState }),
  };`);
  const clickSquare = (sq) => window.document.querySelector(`[data-square="${sq}"]`).click();
  return {
    ...window.testing, workers, window, document: window.document, clickSquare,
    advance(ms, runTimer = true) { now += ms; if (runTimer) tick(); },
    control(minutes) {
      const select = window.document.querySelector('#timeControl');
      select.value = String(minutes);
      select.dispatchEvent(new window.Event('change'));
    },
  };
}

test('background-tab elapsed time is fully charged to the active player', (t) => {
  const a = app(t);
  a.control(1);
  a.doMove('e2', 'e4', 'q');
  a.advance(65_000);
  assert.equal(a.state().clocks.b, 0);
  assert.equal(a.state().gameOver?.winner, 'w');
});

test('a move after the deadline is rejected even before the next timer callback', (t) => {
  const a = app(t);
  a.control(1);
  a.doMove('e2', 'e4', 'q');
  a.advance(60_001, false);
  a.doMove('e7', 'e5', 'q');
  assert.deepEqual(a.game.history(), ['e4']);
  assert.equal(a.state().gameOver?.winner, 'w');
});

test('elapsed time before a move belongs to the player who made it', (t) => {
  const a = app(t);
  a.doMove('e2', 'e4', 'q');
  a.advance(475, false);
  a.doMove('e7', 'e5', 'q');
  a.advance(125);
  assert.equal(a.state().clocks.b, 600_000 - 475);
  assert.equal(a.state().clocks.w, 600_000 - 125);
});

test('flagging closes a promotion picker and prevents a stale choice from moving', (t) => {
  const a = app(t);
  a.control(1);
  a.game.load('7k/P7/8/8/8/8/8/7K b - - 0 1');
  a.doMove('h8', 'h7');
  a.clickSquare('a7');
  a.clickSquare('a8');
  const staleChoice = a.document.querySelector('.promo-btn');
  assert.ok(staleChoice);
  a.advance(60_001);
  assert.equal(a.state().pendingPromo, null);
  assert.ok(a.document.querySelector('#promoModal').classList.contains('hidden'));
  staleChoice.click();
  assert.equal(a.game.get('a7')?.type, 'p');
  assert.equal(a.game.get('a8'), null);
});

test('an ongoing game cannot have its clocks reset by changing the time control', (t) => {
  const a = app(t);
  a.control(1);
  a.doMove('e2', 'e4');
  a.advance(2_000);
  assert.ok(a.document.querySelector('#timeControl').disabled);
  a.control(30);
  assert.equal(a.state().clocks.b, 58_000);
});

test('promotion captures show actual captured pieces, not a vanished promoted pawn', (t) => {
  const a = app(t);
  a.game.load('1r5k/P7/8/8/8/8/8/7K w - - 0 1');
  a.game.move({ from: 'a7', to: 'b8', promotion: 'q' });
  a.renderCaptured();
  const captured = a.document.querySelector('#captured');
  assert.equal(captured.querySelectorAll('.piece.b').length, 1);
  assert.equal(captured.querySelectorAll('.piece.w').length, 0);
  assert.match(captured.textContent, /White \+9/);
});

test('board arrows follow the displayed orientation and preserve a single tab stop', (t) => {
  const a = app(t);
  const key = () => a.document.activeElement.dispatchEvent(new a.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  a.document.querySelector('[data-square="e2"]').focus();
  key();
  assert.equal(a.document.activeElement.dataset.square, 'e3');
  a.document.querySelector('#flipBoard').click();
  a.document.querySelector('[data-square="e3"]').focus();
  key();
  assert.equal(a.document.activeElement.dataset.square, 'e2');
  assert.equal(a.document.querySelectorAll('#board .sq[tabindex="0"]').length, 1);
  assert.equal(a.document.querySelector('#playArea').firstElementChild.id, 'playerW');
});

test('the checked king is highlighted without highlighting the other king', (t) => {
  const a = app(t);
  for (const san of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) a.game.move(san);
  a.render();
  assert.equal(a.document.querySelectorAll('.in-check').length, 1);
  assert.equal(a.document.querySelector('.in-check').dataset.square, 'e8');
});

test('dragging makes a legal move, while releasing off the board leaves the position unchanged', (t) => {
  const a = app(t);
  function pointer(type, square, x, y) {
    const event = new a.window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    (square ? a.document.querySelector(`[data-square="${square}"]`) : a.document.querySelector('#board')).dispatchEvent(event);
  }
  a.document.elementFromPoint = () => a.document.querySelector('[data-square="e4"]');
  pointer('pointerdown', 'e2', 200, 300);
  pointer('pointermove', 'e2', 200, 200);
  pointer('pointerup', null, 200, 200);
  assert.deepEqual(a.game.history(), ['e4']);
  assert.equal(a.document.querySelector('.drag-ghost'), null);
  a.document.elementFromPoint = () => null;
  pointer('pointerdown', 'e7', 200, 100);
  pointer('pointermove', 'e7', 200, 200);
  pointer('pointerup', null, 200, 600);
  assert.deepEqual(a.game.history(), ['e4']);
});

test('promotion choices have keyboard focus and Escape cancels without moving', (t) => {
  const a = app(t);
  a.game.load('7k/P7/8/8/8/8/8/7K w - - 0 1');
  a.render();
  a.clickSquare('a7');
  a.clickSquare('a8');
  assert.equal(a.document.activeElement.getAttribute('aria-label'), 'Promote to queen');
  a.document.activeElement.dispatchEvent(new a.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(a.state().pendingPromo, null);
  assert.equal(a.game.get('a7')?.type, 'p');
  assert.ok(a.document.activeElement.matches('#board .sq'));
});

test('exported PGN round-trips the position, moves and checkmate result', (t) => {
  const a = app(t);
  a.control(3);
  for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) a.doMove(from, to);
  const pgn = a.pgnText();
  assert.match(pgn, /\[Result "0-1"\]/);
  assert.match(pgn, /\[TimeControl "180"\]/);
  const replay = new Chess();
  assert.ok(replay.load_pgn(pgn));
  assert.deepEqual(replay.history(), a.game.history());
  assert.equal(replay.fen(), a.game.fen());
});

test('PGN retains the game time control when the next game setting changes', (t) => {
  const a = app(t);
  a.control(1);
  a.doMove('e2', 'e4');
  a.advance(60_001);
  a.control(30);
  assert.match(a.pgnText(), /\[TimeControl "60"\]/);
  a.document.querySelector('#newGame').click();
  assert.equal(a.game.history().length, 0);
  assert.ok(a.document.querySelector('#copyPgn').disabled);
  assert.equal(a.state().clocks.w, 30 * 60_000);
});

test('clipboard failure provides a download fallback instead of reporting success', async (t) => {
  const a = app(t);
  a.doMove('e2', 'e4');
  Object.defineProperty(a.window.navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } } });
  a.document.querySelector('#copyPgn').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(a.document.querySelector('#exportStatus').textContent, /Download PGN/);
});

const flush = () => new Promise(resolve => setImmediate(resolve));
function start(a, color = 'w') {
  a.document.querySelector('#gameMode').value = 'computer';
  a.document.querySelector('#computerColor').value = color;
  a.document.querySelector('#newGame').click();
  return a.workers.at(-1);
}
async function ready(worker) { worker.emit('uciok'); worker.emit('readyok'); await flush(); }

test('computer replies to human moves and blocks input on its turn', async t => {
  const a = app(t), worker = start(a);
  a.advance(120_000);
  assert.equal(a.state().clocks.w, 600_000);
  await ready(worker);
  a.doMove('e2', 'e4');
  a.doMove('e7', 'e5');
  assert.deepEqual(a.game.history(), ['e4']);
  await flush();
  assert.ok(worker.commands.includes('position startpos moves e2e4'));
  worker.emit('bestmove e7e5');
  await flush();
  assert.deepEqual(a.game.history(), ['e4', 'e5']);
});

test('playing Black flips the board and starts with a computer move', async t => {
  const a = app(t), worker = start(a, 'b');
  await ready(worker);
  assert.equal(a.document.querySelector('#board .sq').dataset.square, 'h1');
  worker.emit('bestmove d2d4');
  await flush();
  assert.deepEqual(a.game.history(), ['d4']);
  a.doMove('d7', 'd5');
  assert.deepEqual(a.game.history(), ['d4', 'd5']);
});

test('restarting terminates the old engine and ignores its late reply', async t => {
  const a = app(t), old = start(a, 'b');
  await ready(old);
  const next = start(a);
  old.emit('bestmove e2e4');
  await ready(next);
  assert.ok(old.terminated);
  assert.equal(a.game.history().length, 0);
  assert.equal(a.state().computerState, 'ready');
});

test('engine failures pause clocks and retry continues the same position', async t => {
  const a = app(t), worker = start(a);
  await ready(worker);
  a.doMove('e2', 'e4');
  await flush();
  a.advance(1000);
  worker.onerror({ preventDefault() {} });
  await flush();
  assert.equal(a.state().computerState, 'error');
  const before = a.state().clocks.b;
  a.advance(120_000);
  assert.equal(a.state().clocks.b, before);
  a.document.querySelector('#retryComputer').click();
  const retry = a.workers.at(-1);
  await ready(retry);
  assert.ok(retry.commands.includes('position startpos moves e2e4'));
  retry.emit('bestmove c7c5'); await flush();
  assert.deepEqual(a.game.history(), ['e4', 'c5']);
});

test('timeout cancels the search and late moves cannot change a finished game', async t => {
  const a = app(t); a.control(1);
  const worker = start(a); await ready(worker);
  a.doMove('e2', 'e4'); await flush();
  a.advance(60_001);
  worker.emit('bestmove e7e5'); await flush();
  assert.equal(a.state().gameOver.winner, 'w');
  assert.ok(worker.terminated);
  assert.deepEqual(a.game.history(), ['e4']);
});

test('resignation exports the computer opponent and result; local mode restores both players', async t => {
  const a = app(t), worker = start(a); await ready(worker);
  a.window.confirm = () => true;
  a.document.querySelector('#resignComputer').click();
  assert.match(a.pgnText(), /Stockfish \(Medium\)/);
  assert.match(a.pgnText(), /\[Result "0-1"\]/);
  a.document.querySelector('#gameMode').value = 'local';
  a.document.querySelector('#newGame').click();
  a.doMove('e2', 'e4'); a.doMove('e7', 'e5');
  assert.deepEqual(a.game.history(), ['e4', 'e5']);
});

test('computer underpromotion uses the setup FEN and ends a drawn game', async t => {
  const a = app(t), worker = start(a); await ready(worker);
  a.game.load('7k/8/8/8/8/8/p7/7K b - - 0 1');
  a.render(); a.playComputerMove(); await flush();
  assert.ok(worker.commands.some(command => command.startsWith('position fen 7k/')));
  worker.emit('bestmove a2a1n'); await flush();
  assert.equal(a.game.get('a1').type, 'n');
  assert.equal(a.state().gameOver.reason, 'draw');
  assert.ok(worker.terminated);
});

test('human checkmate ends the game without starting another search', async t => {
  const a = app(t), worker = start(a); await ready(worker);
  for (const san of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6']) a.game.move(san);
  const searches = worker.commands.filter(command => command.startsWith('go ')).length;
  a.doMove('h5', 'f7'); await flush();
  assert.equal(a.state().gameOver.winner, 'w');
  assert.equal(worker.commands.filter(command => command.startsWith('go ')).length, searches);
  assert.ok(worker.terminated);
});
