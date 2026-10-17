import { POOLS } from './art.js';
import { $, $$ } from './dom.js';
import { go } from './router.js';
import { tone, prepareAudio } from './sound.js';

const wins = $$('#reels .win');
const holds = $$('#reels .chip');
const rnd = n => Math.random() * n | 0;
const slug = s => s.toLowerCase().replace(/\s+/g, '-');
const isHeld = i => holds[i].getAttribute('aria-pressed') === 'true';

// Index of the chosen item in each pool: [thing, face, extra].
export const roll = POOLS.map(pool => rnd(pool.length));
let spinning = false;

export const names = () => roll.map((k, i) => POOLS[i][k][0]);
// Same wording the example generator uses, so photos and examples of one roll match.
export const subject = () => { const [thing, face, extra] = names(); return `${face} ${thing} ${extra}`; };
export const sentence = () => {
  const [thing, face, extra] = names();
  return `Draw ${/^[aeiou]/i.test(face) ? 'an' : 'a'} ${face} ${thing} ${extra}`;
};

/* ---------- Share links: #r=thing.face.extra ---------- */
export const shareUrl = () =>
  location.origin + location.pathname + location.search + '#r=' + roll.map((k, i) => slug(POOLS[i][k][0])).join('.');

// Returns true when the URL carried a valid roll.
export function applyHash() {
  const match = location.hash.match(/^#r=([^.]*)\.([^.]*)\.([^.]*)$/);
  let slugs = [];
  try { slugs = match ? match.slice(1).map(decodeURIComponent) : []; } catch { slugs = []; }
  roll.forEach((_, i) => {
    const found = slugs[i] ? POOLS[i].findIndex(item => slug(item[0]) === slugs[i]) : -1;
    roll[i] = found < 0 ? rnd(POOLS[i].length) : found;
  });
  renderAll();
  return Boolean(match);
}

/* ---------- Rendering ---------- */
const show = i => { wins[i].innerHTML = POOLS[i][roll[i]][1]; };
const renderAll = () => roll.forEach((_, i) => show(i));

// "fresh" = nothing spun yet (big Spin button); "rolled" = Draw this / Spin again.
function setStage(stage) {
  $('#primary').textContent = stage === 'fresh' ? 'Spin!' : 'Draw this →';
  $('#primary').dataset.action = stage === 'fresh' ? 'spin' : 'draw';
  $('#again').hidden = stage === 'fresh';
  $('#note').textContent = stage === 'fresh' ? 'Pull the lever!' : sentence();
}

function setSpinning(on) {
  spinning = on;
  for (const el of [$('#lever'), $('#primary'), $('#again'), ...holds]) el.disabled = on;
}

/* ---------- Spinning ---------- */
function spin() {
  if (spinning) return;
  if (holds.every((_, i) => isHeld(i))) { $('#note').textContent = 'Unhold a reel to spin.'; return; }
  prepareAudio();
  setSpinning(true);
  const lever = $('#lever');
  lever.classList.remove('pull');
  void lever.offsetWidth;
  lever.classList.add('pull');
  $('#note').textContent = 'Spinning…';
  tone(140, 0.2, 'square', 0.04);

  const free = [0, 1, 2].filter(i => !isHeld(i));
  let left = free.length;
  free.forEach(i => {
    const target = rnd(POOLS[i].length);
    wins[i].classList.add('spin');
    const ticker = setInterval(() => {
      wins[i].innerHTML = POOLS[i][rnd(POOLS[i].length)][1];
      if (i === free[0]) tone(650 + rnd(350), 0.03, 'triangle', 0.025);
    }, 75);
    setTimeout(() => {
      clearInterval(ticker);
      roll[i] = target;
      show(i);
      wins[i].classList.remove('spin');
      wins[i].classList.add('land');
      setTimeout(() => wins[i].classList.remove('land'), 420);
      tone(150, 0.18, 'square', 0.05);
      tone(330 * [1, 1.25, 1.5][i], 0.3, 'sine', 0.08);
      if (--left === 0) landed();
    }, 850 + i * 420 + rnd(200));
  });
}

function landed() {
  setSpinning(false);
  setStage('rolled');
  history.replaceState(history.state, '', shareUrl());
}

export function initSlot() {
  renderAll();
  $('#lever').addEventListener('click', spin);
  $('#again').addEventListener('click', spin);
  $('#primary').addEventListener('click', () => ($('#primary').dataset.action === 'spin' ? spin() : go('draw')));
  holds.forEach((hold, i) => hold.addEventListener('click', () => {
    const on = !isHeld(i);
    hold.setAttribute('aria-pressed', on);
    hold.textContent = on ? 'held' : 'hold';
    tone(on ? 520 : 380, 0.08, 'triangle', 0.04);
  }));
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && e.target === document.body && $('.view.active')?.dataset.view === 'home') {
      e.preventDefault();
      spin();
    }
  });
  setStage('fresh');
}

// Called when a shared link (or hash change) sets the roll from outside.
export const markRolled = () => setStage('rolled');
