import { api, post } from './api.js';

let signedIn = false;
const listeners = [];

export const isBoss = () => signedIn;
export const onAuthChange = fn => listeners.push(fn);

function set(value) {
  signedIn = value;
  document.body.classList.toggle('is-boss', value);
  listeners.forEach(fn => fn(value));
}

export async function checkSession() {
  try { set((await api('/api/auth')).signedIn); } catch { set(false); }
}

export async function login(password) {
  await post('/api/auth', { password });
  set(true);
}

export async function logout() {
  try { await api('/api/auth', { method: 'DELETE' }); } catch (e) { console.error(e); }
  set(false);
}
