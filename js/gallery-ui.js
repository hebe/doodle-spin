import { h } from './dom.js';

// Static pieces for the gallery: icons and the loading / empty / error panels.
const STAR = '12,3 14.8,9 21,9.6 16.3,13.8 17.8,20 12,16.7 6.2,20 7.7,13.8 3,9.6 9.2,9';

export const ICONS = {
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8l7 7 7-7"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l7 7-7 7"/></svg>',
  favBadge: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="${STAR}" fill="var(--accent)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>`,
};

const PENCIL = `<svg class="art" viewBox="0 0 170 150" role="img" aria-label="An empty sketch frame with a pencil"><rect x="20" y="14" width="110" height="110" rx="14" stroke-dasharray="3 12"/><path d="M104 118l40-60 14 9-40 60-18 6z" fill="var(--paper)"/><path d="M104 118l6 11 12-5" fill="var(--accent)"/><path d="M144 58l6-9 14 9-6 9"/></svg>`;
const TORN = `<svg class="art" viewBox="0 0 170 150" role="img" aria-label="A torn sketch page"><path d="M28 14h96l-6 16 10 14-8 16 10 14-8 16 8 18H28z" fill="var(--soft)"/><path d="M62 52c0-14 30-14 30 0 0 12-14 12-14 24"/><circle cx="78" cy="94" r="2.5" fill="var(--ink)"/></svg>`;

const panel = (props, art, title, text, action) =>
  h('div', { class: 'panel', ...props }, h('span', { html: art }), h('h2', { text: title }), h('p', { class: 'mute', text }), action);

export const loadingPanel = () => h('div', { class: 'skeleton', role: 'status', 'aria-live': 'polite' },
  h('span', { class: 'mute', text: 'Loading your doodles…' }),
  [58, 40].map(width => h('div', { class: 'row', 'aria-hidden': 'true' },
    h('div', { class: 'bar', style: `width:${width}%` }),
    h('div', { class: 'ghosts' }, h('div', { class: 'ghost' }), h('div', { class: 'ghost' })))));

export const errorPanel = onRetry => panel({ role: 'alert' }, TORN, 'Could not load gallery.',
  'Your doodles are safe. Check the connection and try again.',
  h('button', { class: 'big', type: 'button', text: 'Try again', onclick: onRetry }));

// Variants: 'all' (nothing saved), 'favorites', 'mine'.
export function emptyPanel(variant, { onSpin, onShowAll }) {
  if (variant === 'favorites') return panel({}, PENCIL, 'No favorites yet', 'Open a drawing and tap Star to keep it here.',
    h('button', { class: 'pill', type: 'button', text: 'show all', onclick: onShowAll }));
  if (variant === 'mine') return panel({}, PENCIL, 'No photos yet', 'Photograph a drawing from the prompt screen.',
    h('button', { class: 'pill', type: 'button', text: 'show all', onclick: onShowAll }));
  return panel({}, PENCIL, 'Nothing drawn yet', 'Spin a prompt, draw it on paper, then photograph it or ask for an example. It lands here.',
    h('button', { class: 'big', type: 'button', text: 'Spin a prompt', onclick: onSpin }));
}
