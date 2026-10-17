import { applyHash, initSlot, markRolled } from './slot.js';
import { initSound } from './sound.js';
import { checkSession, onAuthChange } from './auth.js';
import { go, initRouter, currentView } from './router.js';
import { initDraw } from './draw.js';
import { initExample } from './example.js';
import { initCamera } from './camera.js';
import { initGallery } from './gallery.js';
import { initCatalog } from './catalog.js';
import { initLogin } from './login.js';

initRouter();
initSound();
initSlot();
initDraw();
initExample();
initCamera();
initGallery();
initCatalog();
initLogin();

// Boss-only screens are not reachable after logging out.
onAuthChange(boss => { if (!boss && ['example', 'camera'].includes(currentView())) go('home', { replace: true }); });
checkSession();

// A shared link (#r=...) lands straight on the prompt.
if (applyHash()) { markRolled(); go('draw', { replace: true }); }
window.addEventListener('hashchange', () => { if (applyHash()) { markRolled(); go('draw'); } });
