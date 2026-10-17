import { POOLS } from './art.js';
import { $ } from './dom.js';
import { onView } from './router.js';

const SECTIONS = ['Things', 'Faces', 'Extras'];
const TABS = ['All', ...SECTIONS];
let active = 0; // 0 = All (default)

const tiles = pool => `<div class="grid">${pool.map(([name, svg]) =>
  `<div class="tile"><div class="pic">${svg}</div><span>${name}</span></div>`).join('')}</div>`;

function render() {
  $('#catalog-tabs').replaceChildren(...TABS.map((label, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'chip';
    tab.setAttribute('aria-pressed', i === active);
    tab.textContent = i === 0 ? label : `${label} (${POOLS[i - 1].length})`;
    tab.addEventListener('click', () => { active = i; render(); $('#catalog-body').scrollTo(0, 0); });
    return tab;
  }));
  const shown = active === 0 ? [0, 1, 2] : [active - 1];
  $('#catalog-body').innerHTML = shown.map(i =>
    (active === 0 ? `<h2>${SECTIONS[i]} (${POOLS[i].length})</h2>` : '') + tiles(POOLS[i])).join('');
}

export function initCatalog() {
  onView('catalog', { enter: render });
}
