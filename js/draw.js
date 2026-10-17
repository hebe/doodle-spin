import { POOLS } from './art.js';
import { $ } from './dom.js';
import { onView } from './router.js';
import { roll, sentence, shareUrl } from './slot.js';

const LABELS = ['thing', 'face', 'extra'];

function render() {
  $('#sentence').textContent = sentence();
  $('#tiles').innerHTML = roll.map((k, i) =>
    `<figure class="tile" style="margin:0"><div class="pic">${POOLS[i][k][1]}</div><figcaption>${LABELS[i]}</figcaption></figure>`).join('');
}

async function share() {
  const button = $('#share'), url = shareUrl();
  if (navigator.share) {
    try { await navigator.share({ title: 'Doodle Spin', text: sentence(), url }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = 'Link copied!';
    setTimeout(() => { button.textContent = 'Share this roll'; }, 1500);
  } catch { window.prompt('Copy this link to share your roll:', url); }
}

export function initDraw() {
  onView('draw', { enter: render });
  $('#share').addEventListener('click', share);
}
