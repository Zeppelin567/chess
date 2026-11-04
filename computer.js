// UCI transport only. Chess rules and the current position stay in the page.
export const DIFFICULTIES = Object.freeze({
  easy: { label: 'Easy', skill: 0, time: 200 },
  medium: { label: 'Medium', skill: 5, time: 500 },
  hard: { label: 'Hard', skill: 12, time: 1000 },
  expert: { label: 'Expert', skill: 20, time: 1800 },
});

function cancelled() {
  const error = new Error('Computer search cancelled');
  error.name = 'AbortError';
  return error;
}

export class ComputerEngine {
  constructor({ createWorker, startupTimeout = 30000, searchTimeout = 15000 }) {
    this.createWorker = createWorker;
    this.startupTimeout = startupTimeout;
    this.searchTimeout = searchTimeout;
    this.worker = null;
    this.loading = null;
    this.pending = null;
    this.isReady = false;
    this.epoch = 0;
  }

  ready() {
    if (this.isReady) return Promise.resolve();
    if (this.loading) return this.loading.promise;
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    this.loading = { promise, resolve, reject };
    this.startTimer = setTimeout(() => this.fail(new Error('The chess engine took too long to load.')), this.startupTimeout);
    try {
      const worker = this.createWorker();
      this.worker = worker;
      worker.onmessage = ({ data }) => {
        if (worker !== this.worker || typeof data !== 'string') return;
        for (const line of data.split(/\r?\n/)) this.receive(line.trim());
      };
      worker.onerror = (event) => {
        if (worker !== this.worker) return;
        event.preventDefault?.();
        this.fail(new Error('Could not load the chess engine. Please retry.'));
      };
      worker.onmessageerror = () => {
        if (worker === this.worker) this.fail(new Error('The chess engine stopped responding.'));
      };
      worker.postMessage('uci');
    } catch {
      this.fail(new Error('Computer play needs a browser with Web Workers and WebAssembly. Open the HTTP preview or hosted website.'));
    }
    return promise;
  }

  receive(line) {
    if (line === 'uciok' && this.loading) {
      this.worker.postMessage('setoption name Hash value 16');
      this.worker.postMessage('isready');
    } else if (line === 'readyok' && this.loading) {
      clearTimeout(this.startTimer);
      this.isReady = true;
      const loading = this.loading;
      this.loading = null;
      loading.resolve();
    } else if (line.startsWith('bestmove ') && this.pending) {
      const move = line.split(/\s+/)[1];
      const pending = this.pending;
      this.pending = null;
      clearTimeout(this.searchTimer);
      if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) pending.resolve(move);
      else if (move === '(none)' || move === '0000') pending.resolve(null);
      else this.fail(new Error('The chess engine returned an invalid move.'), pending);
    }
  }

  async search({ moves = [], initialFen, difficulty = 'medium' } = {}) {
    const epoch = this.epoch;
    await this.ready();
    if (epoch !== this.epoch) throw cancelled();
    if (this.pending) throw new Error('A computer search is already running.');
    const level = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.searchTimer = setTimeout(() => this.fail(new Error('The chess engine stopped responding. Please retry.')), this.searchTimeout + level.time);
      try {
        this.worker.postMessage(`setoption name Skill Level value ${level.skill}`);
        // Retain the move history so the engine can recognize repetitions.
        this.worker.postMessage(`position ${initialFen ? 'fen ' + initialFen : 'startpos'}${moves.length ? ' moves ' + moves.join(' ') : ''}`);
        this.worker.postMessage(`go movetime ${level.time}`);
      } catch {
        this.fail(new Error('The chess engine stopped responding. Please retry.'));
      }
    });
  }

  fail(error, extraPending) {
    const loading = this.loading;
    const pending = extraPending || this.pending;
    this.loading = this.pending = null;
    this.isReady = false;
    clearTimeout(this.startTimer);
    clearTimeout(this.searchTimer);
    this.worker?.terminate();
    this.worker = null;
    this.epoch++;
    loading?.reject(error);
    pending?.reject(error);
  }

  stop() {
    this.fail(cancelled());
  }
}
