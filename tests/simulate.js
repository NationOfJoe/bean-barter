// Plays full games headlessly through the host engine, driving every human seat
// through the same actions the UI sends, and checks the rules hold.
// Usage: node tests/simulate.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'bean-barter.html'), 'utf8');
const src = html.split('<script>')[1].split('</script>')[0];

function makeContext() {
  const els = {};
  const el = () => ({ textContent: '', innerHTML: '', value: '', hidden: true, classList: { toggle() {} }, focus() {} });
  const ctx = {
    console, Math, JSON, Promise, Array, Object, Set, String, Number,
    document: { querySelector: s => els[s] || (els[s] = el()), addEventListener() {} },
    location: { hash: '', origin: '', pathname: '' },
    localStorage: { getItem() { return null; }, setItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {} },
    setTimeout: f => setImmediate(f),
  };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.api={startGame,handleAction,canHarvest,get S(){return S}, setSpeed(v){speed=v}};', ctx);
  return ctx.api;
}

const tick = () => new Promise(r => setImmediate(r));

function fieldFor(api, p, t) {
  let i = p.fields.findIndex(f => f.t === t);
  if (i < 0) i = p.fields.findIndex(f => !f.n);
  if (i < 0) { i = p.fields.findIndex((f, k) => api.canHarvest(p, k)); return { harvest: i }; }
  return { field: i };
}

async function play(seats) {
  const api = makeContext();
  api.setSpeed(0);
  api.startGame(seats);
  const S = () => api.S;
  const humans = seats.map((s, i) => (s.kind === 'human' ? i : -1)).filter(i => i >= 0);
  let steps = 0, trades = 0, humanTrades = 0, proposedKey = "";
  const startSeq = () => S().tradeSeq;
  while (!S().over && steps < 50000) {
    steps++;
    const st = S();
    let acted = false;
    // Anyone with cards to plant plants them (phase 3, or leftovers).
    for (const i of humans) {
      const p = st.players[i];
      if (p.pending.length && st.phase !== 'trade') {
        const f = fieldFor(api, p, p.pending[0]);
        if (f.harvest != null) api.handleAction(i, 'harvest', { field: f.harvest });
        else api.handleAction(i, 'plant', { field: f.field, pend: 0 });
        acted = true; break;
      }
    }
    if (acted) continue;
    const cur = st.cur, A = st.players[cur];
    if (A.kind === 'human') {
      if (st.phase === 'plant') {
        if (A.hand.length && st.planted < 1) {
          const f = fieldFor(api, A, A.hand[0]);
          if (f.harvest != null) api.handleAction(cur, 'harvest', { field: f.harvest });
          else api.handleAction(cur, 'plant', { field: f.field });
        } else api.handleAction(cur, 'flip');
        continue;
      }
      if (st.phase === 'trade') {
        if (!st.ask && st.faceUp.length) {
          api.handleAction(cur, 'ask', { face: [0], hand: [], want: 'none', qty: 1 });
          // Other humans answer: one offers their first hand card, the rest pass.
          humans.filter(i => i !== cur).forEach((i, k) => {
            api.handleAction(i, 'respond', k === 0 && st.players[i].hand.length ? { id: S().ask.id, hand: [0] } : { id: S().ask.id, pass: true });
          });
          const resp = S().ask ? S().ask.resp : {};
          const pick = Object.keys(resp).find(k => resp[k].gives);
          if (pick != null) {
            const before = startSeq();
            api.handleAction(cur, 'take', { seat: +pick });
            if (S().tradeSeq !== before) { trades++; if (st.players[+pick].kind === 'human') humanTrades++; }
          }
          continue;
        }
        // A non-active human proposes; the active human accepts it.
        const other = humans.find(i => i !== cur);
        if (other != null && !st.proposals.length && st.players[other].hand.length && proposedKey !== `${cur}-${st.runOuts}-${st.deck.length}`) {
          proposedKey = `${cur}-${st.runOuts}-${st.deck.length}`;
          api.handleAction(other, 'propose', { face: [], hand: [0], want: 'none', qty: 1 });
          const pr = S().proposals[0];
          if (pr) { const before = startSeq(); api.handleAction(cur, 'answer', { pid: pr.pid, accept: true }); if (S().tradeSeq !== before) { trades++; humanTrades++; } }
          continue;
        }
        api.handleAction(cur, 'endtrade');
        continue;
      }
      if (st.phase === 'plant3') { api.handleAction(cur, 'endturn'); continue; }
    } else if (st.phase === 'trade') {
      // AI's market: each human proposes to take the first market card for their first hand card, then passes.
      for (const i of humans) {
        if (!st.passed.includes(i)) {
          if (st.faceUp.length && st.players[i].hand.length) {
            const before = startSeq();
            api.handleAction(i, 'propose', { face: [0], hand: [0], want: 'none', qty: 1 });
            if (S().tradeSeq !== before) trades++;
          }
          api.handleAction(i, 'pass');
        }
      }
    }
    await tick();
  }
  const s = S();
  const cards = s.deck.length + s.discard.length + s.faceUp.length +
    s.players.reduce((n, p) => n + p.hand.length + p.pending.length + p.coins + p.fields.reduce((a, f) => a + f.n, 0), 0);
  return { over: s.over, runOuts: s.runOuts, cards, fields: s.players[0].fields.length, trades, humanTrades,
    coins: s.players.map(p => `${p.name}:${p.coins}`).join(' '), winner: s.result && s.result[0].name };
}

const H = n => ({ name: n, kind: 'human' }), B = n => ({ name: n, kind: 'bot' });
const setups = [
  ['1 human + 3 AI', [H('Ana'), B('Mira'), B('Otto'), B('Juno')]],
  ['2 humans + 2 AI', [H('Ana'), H('Ben'), B('Mira'), B('Otto')]],
  ['3 humans, no AI', [H('Ana'), H('Ben'), H('Cy')]],
  ['2 humans + 3 AI', [H('Ana'), H('Ben'), B('Mira'), B('Otto'), B('Juno')]],
  ['1 human + 2 AI', [H('Ana'), B('Mira'), B('Otto')]],
];

(async () => {
  let ok = true;
  for (const [label, seats] of setups) {
    for (let g = 0; g < 3; g++) {
      const r = await play(seats);
      const expectFields = seats.length === 3 ? 3 : 2;
      const pass = r.over && r.runOuts === 3 && r.cards === 104 && r.fields === expectFields;
      if (!pass) ok = false;
      console.log(`${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(16)} ${r.coins}  winner ${r.winner}  trades ${r.trades} (with humans ${r.humanTrades})  cards ${r.cards}  fields ${r.fields}`);
    }
  }
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
