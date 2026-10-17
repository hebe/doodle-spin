import { $, $$, h } from './dom.js';
import { go, onView, previousView } from './router.js';
import { getItems, isLoaded, loadItems, onItemsChange } from './gallery-store.js';
import {
  buildPrompts, countsOf, countText, filterPrompts, formatDate, groupByMonth, searchPrompts, sortPrompts, summaryOf,
} from './gallery-data.js';
import { emptyPanel, errorPanel, ICONS, loadingPanel } from './gallery-ui.js';
import { groupingActive, initSort } from './gallery-sort.js';
import { openViewer } from './viewer.js';

const state = {
  filter: 'all', // all | favorites | mine
  sort: 'newest',
  group: true, // group by month (only used for date sorts)
  query: '',
  searching: false,
  failed: false,
  months: new Map(), // month key -> open? (default: first group open)
};

/* ---------- Rows ---------- */
// Wrap the matched part of the title in <mark>.
function highlight(text, query) {
  const q = query.trim().toLowerCase(), at = q ? text.toLowerCase().indexOf(q) : -1;
  if (at < 0) return [text];
  return [text.slice(0, at), h('mark', { text: text.slice(at, at + q.length) }), text.slice(at + q.length)];
}

const tile = (p, { item, tag }) => h('button', {
  class: 'gtile', type: 'button',
  'aria-label': `${p.subject}, ${tag}${item.favorite ? ', favorite' : ''}`,
  onclick: () => openViewer(p.key, item.id),
},
h('span', { class: 'tag' + (item.mine ? ' mine' : ''), text: tag }),
h('div', { class: 'sheet' }, h('img', { src: item.url, alt: '', width: 150, height: 150, loading: 'lazy', decoding: 'async' })),
item.favorite && h('span', { class: 'fav', html: ICONS.favBadge }));

const row = p => h('section', { class: 'prompt', 'aria-label': p.subject },
  h('div', { class: 'prompt-head' },
    h('h3', {}, ...highlight(p.subject, state.query)),
    h('span', { class: 'mute date', text: formatDate(p.newest) })),
  summaryOf(p) && h('div', { class: 'mute summary', text: summaryOf(p) }),
  h('div', { class: 'strip' }, p.entries.map(entry => tile(p, entry))));

// Only the rows of an open month are built, so a few hundred doodles stay light.
function monthGroup(group, index) {
  const open = state.months.get(group.key) ?? index === 0;
  return [
    h('button', {
      class: 'month', type: 'button', 'aria-expanded': String(open),
      onclick: () => { state.months.set(group.key, !open); render(); },
    },
    h('span', {}, group.name, ' ', h('span', { class: 'mute count', text: `${group.prompts.length} prompt${group.prompts.length === 1 ? '' : 's'}` })),
    h('span', { html: open ? ICONS.down : ICONS.right })),
    open && group.prompts.map(row),
  ];
}

/* ---------- Render ---------- */
function setChrome({ pills, status, search }) {
  const pillBox = $('#g-pills');
  pillBox.hidden = pills === 'hidden';
  pillBox.classList.toggle('dim', pills === 'dim');
  pillBox.setAttribute('aria-hidden', pills === 'dim');
  pillBox.inert = pills === 'dim';
  $('#g-status').hidden = !status;
  $('#g-search-open').style.visibility = search ? '' : 'hidden';
}

function render() {
  const scroller = $('#g-scroll'), top = scroller.scrollTop;
  const items = getItems();
  const show = content => { scroller.replaceChildren(...[content].flat(Infinity).filter(Boolean)); scroller.scrollTop = top; };

  $('#g-bar').hidden = state.searching;
  $('#g-search-bar').hidden = !state.searching;
  $('#g-q-clear').hidden = !state.query;
  $$('#g-pills [data-filter]').forEach(btn => {
    const on = btn.dataset.filter === state.filter;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
  });

  if (!isLoaded()) {
    if (state.failed) { setChrome({ pills: 'hidden', status: false, search: false }); show(errorPanel(load)); }
    else { setChrome({ pills: 'dim', status: false, search: false }); show(loadingPanel()); }
    return;
  }
  if (!items.length) {
    setChrome({ pills: 'hidden', status: false, search: false });
    show(emptyPanel('all', { onSpin: () => go('home'), onShowAll: () => {} }));
    return;
  }

  const prompts = buildPrompts(items);

  if (state.searching) {
    setChrome({ pills: 'hidden', status: true, search: true });
    $('#g-sort-open').hidden = true;
    const found = sortPrompts(searchPrompts(prompts, state.query), state.sort);
    $('#g-count').textContent = countText(countsOf(found));
    show(found.length ? found.map(row) : h('p', { class: 'no-results mute', text: `No prompt has “${state.query.trim()}” in it.` }));
    return;
  }

  setChrome({ pills: 'show', status: true, search: true });
  $('#g-sort-open').hidden = false;
  const shown = sortPrompts(filterPrompts(prompts, state.filter), state.sort);
  $('#g-count').textContent = countText(countsOf(shown));
  if (!shown.length) {
    show(emptyPanel(state.filter, { onSpin: () => go('home'), onShowAll: () => setFilter('all') }));
    return;
  }
  show(groupingActive(state) ? groupByMonth(shown).map(monthGroup) : shown.map(row));
}

/* ---------- Loading ---------- */
async function load() {
  state.failed = false;
  if (!isLoaded()) render();
  try { await loadItems(); }
  catch (e) {
    console.error(e);
    // With a list already on screen, keep showing it rather than an error page.
    if (!isLoaded()) { state.failed = true; render(); }
  }
}

/* ---------- Filters + search ---------- */
function setFilter(filter) { state.filter = filter; render(); }

function setSearching(on) {
  state.searching = on;
  state.query = '';
  $('#g-q').value = '';
  render();
  if (on) $('#g-q').focus();
}

export function initGallery() {
  onItemsChange(render);
  onView('gallery', {
    enter() {
      // Coming back from a doodle keeps the scroll position, filter, search and open months.
      if (previousView() === 'viewer') return render();
      state.searching = false;
      state.query = '';
      $('#g-q').value = '';
      load();
    },
  });
  initSort(state, render);
  $$('#g-pills [data-filter]').forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));
  $('#g-search-open').addEventListener('click', () => setSearching(true));
  $('#g-search-close').addEventListener('click', () => setSearching(false));
  $('#g-q').addEventListener('input', e => { state.query = e.target.value; render(); });
  $('#g-q').addEventListener('keydown', e => { if (e.key === 'Escape') setSearching(false); });
  $('#g-q-clear').addEventListener('click', () => { $('#g-q').value = ''; state.query = ''; render(); $('#g-q').focus(); });
}
