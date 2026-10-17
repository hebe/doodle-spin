// Tapping the dimmed backdrop closes a native <dialog> (Esc already does).
export function closeOnBackdrop(dialog) {
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
}
