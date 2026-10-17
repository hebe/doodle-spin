import { $, h } from './dom.js';
import { back, currentView, go, onView } from './router.js';
import { getItems, onItemsChange, removeItem, setFavorite } from './gallery-store.js';
import { buildPrompts, formatDate } from './gallery-data.js';
import { closeOnBackdrop } from './dialogs.js';

// Which prompt and image are showing. The images come from the store, so edits show up here too.
let promptKey = null;
let itemId = null;

export function openViewer(key, id) {
  promptKey = key;
  itemId = id;
  go('viewer');
}

const currentPrompt = () => buildPrompts(getItems()).find(p => p.key === promptKey);

function render() {
  const prompt = currentPrompt();
  if (!prompt) return back();
  const { entries } = prompt;
  const index = Math.max(0, entries.findIndex(e => e.item.id === itemId));
  const { item, tag } = entries[index];
  itemId = item.id;

  $('#v-count').textContent = entries.length > 1 ? `${index + 1} of ${entries.length} for this prompt` : '';
  $('#v-img').src = item.url;
  $('#v-img').alt = `${tag} of ${prompt.subject}`;
  $('#v-title').textContent = prompt.subject;
  $('#v-meta').textContent = `${tag} · ${formatDate(Date.parse(item.createdAt))}`;

  $('#v-strip').hidden = entries.length < 2;
  $('#v-strip').replaceChildren(...entries.map((entry, i) => h('button', {
    class: 'thumb' + (i === index ? ' cur' : ''), type: 'button',
    'aria-label': i === index ? `${entry.tag}, showing` : entry.tag,
    'aria-current': i === index ? 'true' : null,
    onclick: () => { itemId = entry.item.id; render(); },
  }, h('img', { src: entry.item.url, alt: '', width: 56, height: 56 }))));

  $('#v-star').setAttribute('aria-pressed', item.favorite);
  $('#v-star span').textContent = item.favorite ? 'Starred' : 'Star';
  return null;
}

// Step to the neighbouring image of the same prompt.
function step(by) {
  const { entries } = currentPrompt();
  const next = entries.findIndex(e => e.item.id === itemId) + by;
  if (next < 0 || next >= entries.length) return;
  itemId = entries[next].item.id;
  render();
}

async function share() {
  const prompt = currentPrompt(), { item } = prompt.entries.find(e => e.item.id === itemId);
  try {
    const blob = await (await fetch(item.url)).blob();
    const file = new File([blob], 'doodle-spin.png', { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: prompt.subject }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  if (navigator.share) {
    try { await navigator.share({ title: prompt.subject, url: item.url }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const label = $('#v-share');
  try {
    await navigator.clipboard.writeText(item.url);
    label.lastChild.textContent = 'Link copied';
    setTimeout(() => { label.lastChild.textContent = 'Share'; }, 1500);
  } catch { window.prompt('Copy this link:', item.url); }
}

function askDelete() {
  const prompt = currentPrompt(), { item, tag } = prompt.entries.find(e => e.item.id === itemId);
  $('#del-title').textContent = `Delete this ${item.mine ? 'photo' : 'example'}?`;
  $('#del-img').src = item.url;
  $('#del-text').textContent = `“${prompt.subject}”, ${tag}. This can’t be undone.`;
  $('#delete-dialog').showModal();
}

async function confirmDelete() {
  $('#delete-dialog').close();
  const { entries } = currentPrompt();
  const index = entries.findIndex(e => e.item.id === itemId);
  try {
    await removeItem(entries[index].item);
  } catch (e) { alert(e.message); return; }
  // The store has re-rendered: show the next image of this prompt, or leave when none are left.
  const left = currentPrompt();
  if (!left) return back();
  itemId = left.entries[Math.min(index, left.entries.length - 1)].item.id;
  return render();
}

export function initViewer() {
  onView('viewer', { enter: render });
  onItemsChange(() => { if (currentView() === 'viewer' && currentPrompt()) render(); });

  $('#v-star').addEventListener('click', async e => {
    const button = e.currentTarget, { item } = currentPrompt().entries.find(x => x.item.id === itemId);
    button.disabled = true;
    try { await setFavorite(item, !item.favorite); }
    catch (err) { alert(err.message); }
    finally { button.disabled = false; }
  });
  $('#v-share').addEventListener('click', share);
  $('#v-delete').addEventListener('click', askDelete);
  $('#del-keep').addEventListener('click', () => $('#delete-dialog').close());
  $('#del-confirm').addEventListener('click', confirmDelete);
  closeOnBackdrop($('#delete-dialog'));

  // Swipe or arrow keys move between the images of this prompt.
  let startX = null;
  const stage = $('#v-stage');
  stage.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  });
  document.addEventListener('keydown', e => {
    if (currentView() !== 'viewer' || document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}
