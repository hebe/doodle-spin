import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'doodle_spin_session';
const TTL = 7 * 24 * 60 * 60;
const sign = (message) => createHmac('sha256', process.env.SESSION_SECRET || '').update(message).digest('base64url');

export function authorized(request) {
  if (!process.env.SESSION_SECRET || !process.env.DOODLE_PASSWORD) return false;
  const cookies = request.headers.get('cookie') || '';
  const token = cookies.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!token) return false;
  const [expiry, signature] = token.split('.');
  if (!/^\d{10,13}$/.test(expiry || '') || !signature || Number(expiry) < Date.now()) return false;
  const expected = Buffer.from(sign(expiry));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function matchesPassword(value) {
  const expected = Buffer.from(process.env.DOODLE_PASSWORD || '');
  const received = Buffer.from(typeof value === 'string' ? value : '');
  return expected.length > 0 && expected.length === received.length && timingSafeEqual(expected, received);
}

export function sessionCookie(request) {
  const expiry = String(Date.now() + TTL * 1000);
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${expiry}.${sign(expiry)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL}${secure}`;
}
export function clearCookie(request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const url = new URL(request.url);
  // Compare Host header for production and local forwarded requests.
  return new URL(origin).host === (request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host) && new URL(origin).protocol === url.protocol;
}
export const unauthorized = () => Response.json({error:'Please sign in to continue.'},{status:401});
