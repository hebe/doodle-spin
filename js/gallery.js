import { $ } from './dom.js';
import { api } from './api.js';
import { isBoss, onAuthChange } from './auth.js';
import { onView } from './router.js';

let items = [];
let favoritesOnly = false;

const subjectOf = item => (item.subject.startsWith('My version: ') ? item.subject.slice(12) : item.subject);
// Same words in any order = same prompt (older photos were saved as "thing face extra").
const promptKey = item => subjectOf(item).toLowerCase().split(/\s+/).sort().join(' ');

function button(label, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.addEventListener('click', onClick);
  return el;
}

async function mutate(el, request, apply) {
  el.disabled = true;
  try { await request(); apply(); render(); }
  catch (e) { alert(e.message); el.disabled = false; }
}

function figure(item) {
  const el = document.createElement('figure');
  el.className = 'saved-item';
  const img = Object.assign(document.createElement('img'), { src: item.url, alt: item.subject, loading: 'lazy' });
  const tag = document.createElement('figcaption');
  tag.className = 'tag';
  tag.textContent = item.mine ? 'my photo' : 'example';
  const actions = document.createElement('div');
  actions.className = 'saved-actions';
  actions.append(Object.assign(document.createElement('a'), { href: item.url, target: '_blank', rel: 'noopener noreferrer', textContent: 'Open' }));
  if (isBoss()) {
    const star = button(item.favorite ? '★ Starred' : '☆ Star', () => mutate(star,
      () => api('/api/gallery', { method: 'PATCH', body: JSON.stringify({ id: item.id, favorite: !item.favorite }) }),
      () => { item.favorite = !item.favorite; }));
    const remove = button('Delete', () => {
      if (!confirm(`Delete this ${tag.textContent} of "${subjectOf(item)}" permanently?`)) return;
      mutate(remove,
        () => api('/api/gallery', { method: 'DELETE', body: JSON.stringify({ id: item.id }) }),
        () => { items = items.filter(x => x.id !== item.id); });
    });
    actions.append(star, remove);
  }
  el.append(img, tag, actions);
  return el;
}

// One card per prompt: an example and your own photo of it sit side by side.
function card(group) {
  const el = document.createElement('article');
  el.className = 'saved-card' + (group.length > 1 ? ' multi' : '');
  const title = document.createElement('p');
  title.textContent = subjectOf(group[0]);
  const pair = document.createElement('div');
  pair.className = 'pair';
  // Your photo first, then the example.
  pair.append(...[...group].sort((a, b) => Number(b.mine) - Number(a.mine)).map(figure));
  el.append(title, pair);
  return el;
}

function render() {
  const shown = items.filter(x => !favoritesOnly || x.favorite);
  const groups = new Map(); // keeps newest-first order
  for (const item of shown) {
    const key = promptKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  $('#saved-grid').replaceChildren(...[...groups.values()].map(card));
  // The pill names what a tap will switch to.
  $('#favorites').textContent = favoritesOnly ? 'all' : 'favorites';
  $('#gallery-status').textContent = shown.length
    ? `${groups.size} prompt${groups.size === 1 ? '' : 's'}, ${shown.length} doodle${shown.length === 1 ? '' : 's'}`
    : items.length ? 'No favorites yet.' : 'No saved doodles yet.';
}

async function load() {
  $('#gallery-status').textContent = 'Loading doodles…';
  try { items = (await api('/api/gallery')).items; render(); }
  catch (e) { $('#gallery-status').textContent = e.message; }
}

// Newly generated doodles show up without waiting for a reload.
export const addToGallery = item => { items = [item, ...items.filter(x => x.id !== item.id)]; };

export function initGallery() {
  onView('gallery', { enter: load });
  onAuthChange(render);
  $('#favorites').addEventListener('click', () => { favoritesOnly = !favoritesOnly; render(); });
}
