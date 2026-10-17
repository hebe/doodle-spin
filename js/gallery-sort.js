import { $, $$ } from './dom.js';
import { SORTS } from './gallery-data.js';
import { closeOnBackdrop } from './dialogs.js';

// Sort order and month grouping. `state` is shared with the gallery; `onChange` re-renders it.
export const groupingActive = state => Boolean(state.group && SORTS[state.sort].byDate);

function sync(state) {
  $$('#sort-dialog [data-sort]').forEach(btn => btn.setAttribute('aria-checked', btn.dataset.sort === state.sort));
  const sw = $('#group-switch'), usable = SORTS[state.sort].byDate;
  sw.setAttribute('aria-checked', groupingActive(state));
  sw.setAttribute('aria-disabled', !usable);
  $('#g-sort-open').textContent = `${SORTS[state.sort].label} ▾`;
  $('#g-sort-open').setAttribute('aria-label', `Sort order: ${SORTS[state.sort].label}`);
}

export function initSort(state, onChange) {
  const dialog = $('#sort-dialog');
  closeOnBackdrop(dialog);
  $('#g-sort-open').addEventListener('click', () => dialog.showModal());
  $('#sort-done').addEventListener('click', () => dialog.close());
  $$('#sort-dialog [data-sort]').forEach(btn => btn.addEventListener('click', () => {
    state.sort = btn.dataset.sort;
    sync(state);
    onChange();
  }));
  $('#group-switch').addEventListener('click', () => {
    // Grouping only makes sense for date sorts, where the switch is locked off.
    if (!SORTS[state.sort].byDate) return;
    state.group = !state.group;
    sync(state);
    onChange();
  });
  sync(state);
}
