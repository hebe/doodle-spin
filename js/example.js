import { $ } from './dom.js';
import { post } from './api.js';
import { go } from './router.js';
import { names, subject } from './slot.js';
import { addToGallery } from './gallery.js';

let runId = 0;

function setBusy(busy, status = '') {
  $('#example-spinner').hidden = !busy;
  $('#example-status').textContent = status;
  if (busy) {
    $('#example-result').hidden = true;
    $('#example-save').hidden = true;
    $('#example-retry').hidden = true;
  }
}

// Ask the server for an example of the current roll. It is saved to the gallery automatically.
async function generate() {
  const id = ++runId;
  const [object, expression, accessory] = names();
  setBusy(true, 'Nano Banana is scribbling…');
  try {
    const saved = await post('/api/generate', { object, expression, accessory });
    if (id !== runId) return;
    $('#example-img').src = saved.url;
    $('#example-img').alt = `Example doodle: ${subject()}`;
    $('#example-caption').textContent = subject();
    $('#example-save').href = saved.url;
    $('#example-save').download = `doodle-spin-${saved.id}.png`;
    setBusy(false, 'Saved to the gallery!');
    $('#example-result').hidden = false;
    $('#example-save').hidden = false;
    addToGallery(saved);
  } catch (error) {
    if (id !== runId) return;
    setBusy(false, error.message);
    $('#example-retry').hidden = false;
  }
}

export function initExample() {
  $('#make-example').addEventListener('click', () => { go('example'); generate(); });
  $('#example-retry').addEventListener('click', generate);
}
