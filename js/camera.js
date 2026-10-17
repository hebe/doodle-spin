import { $ } from './dom.js';
import { post } from './api.js';
import { go, onView } from './router.js';
import { subject } from './slot.js';
import { addItem } from './gallery-store.js';

let stream = null;
let photo = null;

const BUTTONS = { open: '#cam-open', shoot: '#cam-shoot', save: '#cam-save', retake: '#cam-retake', gallery: '#cam-gallery' };
// Which buttons each step shows: idle -> live -> captured -> saved.
const STEPS = {
  idle: ['open'], live: ['shoot'], captured: ['save', 'retake'], saved: ['gallery'],
};

function step(name, status = '') {
  for (const [key, selector] of Object.entries(BUTTONS)) $(selector).hidden = !STEPS[name].includes(key);
  $('#camera-status').textContent = status;
}

function setStage(media) {
  const stage = $('#stage');
  if (media) { stage.replaceChildren(media); stage.dataset.hasMedia = ''; }
  else { stage.innerHTML = '<p id="stage-hint">Draw it on paper, then snap it.</p>'; delete stage.dataset.hasMedia; }
}

function stopStream() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
}

function reset() { stopStream(); photo = null; setStage(null); step('idle'); }

async function open() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = Object.assign(document.createElement('video'), { srcObject: stream, playsInline: true, autoplay: true, muted: true });
    setStage(video);
    step('live', 'Frame your drawing, then take a photo.');
  } catch {
    step('idle', 'Could not open the camera. Check camera permission and try again.');
  }
}

const MAX_SIDE = 1600; // keeps the upload comfortably under the server's 8 MB limit

// Photos are saved square: crop the middle of the frame, which is what the preview shows.
function shoot() {
  const video = $('#stage video'), canvas = $('#canvas');
  const side = Math.min(video.videoWidth, video.videoHeight);
  const size = Math.min(side, MAX_SIDE);
  canvas.width = canvas.height = size;
  canvas.getContext('2d').drawImage(
    video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, size, size);
  photo = canvas.toDataURL('image/jpeg', 0.9);
  stopStream();
  setStage(Object.assign(document.createElement('img'), { src: photo, alt: 'Your photo' }));
  step('captured', 'Happy with it?');
}

async function save() {
  $('#cam-save').disabled = true;
  $('#camera-status').textContent = 'Saving photo…';
  try {
    addItem({ ...await post('/api/my-version', { image: photo, subject: subject() }), mine: true });
    photo = null;
    step('saved', 'Your version is in the gallery!');
  } catch (e) {
    $('#camera-status').textContent = e.message;
  } finally { $('#cam-save').disabled = false; }
}

export function initCamera() {
  onView('camera', { enter: reset, leave: stopStream });
  $('#cam-open').addEventListener('click', open);
  $('#cam-shoot').addEventListener('click', shoot);
  $('#cam-save').addEventListener('click', save);
  $('#cam-retake').addEventListener('click', () => { photo = null; open(); });
  $('#cam-gallery').addEventListener('click', () => go('gallery'));
}
