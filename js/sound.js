import { $ } from './dom.js';

let muted = true;
let ctx = null;

function unlock() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* audio is optional */ }
}

export function tone(freq, duration, type = 'sine', volume = 0.06, delay = 0) {
  if (muted || !ctx) return;
  try {
    const osc = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  } catch { /* audio is optional */ }
}

// Browsers only allow audio after a user gesture, so call this from a click.
export const prepareAudio = () => { if (!muted) unlock(); };

export function initSound() {
  $('#sound').addEventListener('click', e => {
    muted = !muted;
    e.currentTarget.setAttribute('aria-pressed', muted);
    e.currentTarget.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');
    if (!muted) { unlock(); tone(520, 0.08, 'triangle', 0.05); }
  });
}
