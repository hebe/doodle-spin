import { $, $$ } from './dom.js';

// One screen at a time. Each screen is a <section class="view" data-view="name">.
// Screens are pushed on the browser history so the phone's back gesture works.
const views = $$('.view');
const hooks = {};
let current = 'home';

export const currentView = () => current;
export const onView = (name, { enter, leave } = {}) => { hooks[name] = { enter, leave }; };

function show(name) {
  hooks[current]?.leave?.();
  current = name;
  for (const view of views) {
    const active = view.dataset.view === name;
    view.classList.toggle('active', active);
    view.inert = !active;
  }
  hooks[name]?.enter?.();
  $(`[data-view="${name}"] :is(h1,h2)`)?.setAttribute('tabindex', '-1');
  $(`[data-view="${name}"] :is(h1,h2)`)?.focus({ preventScroll: true });
}

export function go(name, { replace = false } = {}) {
  if (name === current) return;
  const depth = (history.state?.depth ?? 0) + (replace ? 0 : 1);
  history[replace ? 'replaceState' : 'pushState']({ view: name, depth }, '', location.href);
  show(name);
}

// Step back inside the app; if there is nothing to step back to (e.g. a shared link), go home.
export function back() {
  if ((history.state?.depth ?? 0) > 0) history.back();
  else go('home', { replace: true });
}

export function initRouter() {
  history.replaceState({ view: 'home', depth: 0 }, '', location.href);
  views.forEach(v => { v.inert = v.dataset.view !== 'home'; });
  window.addEventListener('popstate', e => show(e.state?.view || 'home'));
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-go],[data-back]');
    if (!target) return;
    if (target.dataset.go) go(target.dataset.go);
    else back();
  });
}
