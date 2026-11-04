import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerEngine } from '../computer.js';
function setup(t, options = {}) {
  const workers = [];
  const engine = new ComputerEngine({ ...options, createWorker() {
    const worker = { commands: [], postMessage(s) { this.commands.push(s); }, terminate() { this.terminated = true; }, emit(data) { this.onmessage({ data }); } };
    workers.push(worker); return worker;
  }});
  t.after(() => engine.stop());
  return { engine, workers };
}
test('UCI handshake sets skill, budget and full position history', async t => {
  const { engine, workers } = setup(t);
  const waiting = engine.ready(), worker = workers[0];
  assert.equal(engine.ready(), waiting);
  worker.emit('uciok'); worker.emit('readyok'); await waiting;
  const search = engine.search({difficulty:'expert', initialFen:'8/8/8/8/8/8/7k/K7 w - - 0 1',moves:['a1a2']});
  await Promise.resolve();
  assert.ok(worker.commands.includes('setoption name Skill Level value 20'));
  assert.ok(worker.commands.includes('go movetime 1800'));
  assert.ok(worker.commands.includes('position fen 8/8/8/8/8/8/7k/K7 w - - 0 1 moves a1a2'));
  worker.emit('info depth 4\nbestmove h2h3');
  assert.equal(await search,'h2h3');
});
test('startup timeout rejects and terminates the worker', async t => {
  const { engine, workers } = setup(t,{startupTimeout:10});
  await assert.rejects(engine.ready(), /too long/);
  assert.ok(workers[0].terminated);
});
test('invalid bestmove rejects rather than leaving a pending search', async t => {
  const { engine, workers } = setup(t);
  const ready=engine.ready(); workers[0].emit('uciok'); workers[0].emit('readyok'); await ready;
  const search=engine.search(); const rejected=assert.rejects(search,/invalid move/);
  await Promise.resolve(); workers[0].emit('bestmove bad'); await rejected;
  assert.ok(workers[0].terminated);
});
