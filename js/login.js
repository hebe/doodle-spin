import { $ } from './dom.js';
import { login, logout } from './auth.js';
import { back, onView } from './router.js';

export function initLogin() {
  onView('login', { enter: () => { $('#login-status').textContent = ''; $('#password').focus(); } });
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('#login-status').textContent = 'Signing in…';
    try {
      await login($('#password').value);
      $('#password').value = '';
      back();
    } catch (error) { $('#login-status').textContent = error.message; }
  });
  $('#logout').addEventListener('click', logout);
}
