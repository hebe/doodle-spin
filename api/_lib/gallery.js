import { list, put, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
const idPattern = /^[a-f0-9-]{36}$/i;
export const validId = id => typeof id === 'string' && idPattern.test(id);
export const starPath = id => `stars/${id}.txt`;

async function all(prefix) {
  const result = [];
  let cursor;
  do {
    const page = await list({prefix, limit:1000, ...(cursor ? {cursor} : {})});
    result.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && result.length < 5000);
  return result;
}
export async function gallery() {
  const [images, marks] = await Promise.all([all('doodles/'),all('stars/')]);
  const starred = new Set(marks.map(b => b.pathname.match(/^stars\/([a-f0-9-]{36})\.txt$/i)?.[1]).filter(Boolean));
  return images.map(blob => {
    const match = blob.pathname.match(/^doodles\/([a-f0-9-]{36})--([A-Za-z0-9_-]+)\.(png|jpg|webp)$/i);
    if (!match) return null;
    let subject;
    try { subject = Buffer.from(match[2], 'base64url').toString('utf8'); } catch { return null; }
    return { id: match[1], subject, url: blob.url, createdAt: blob.uploadedAt, favorite: starred.has(match[1]) };
  }).filter(Boolean).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}
export async function imageById(id) {
  const {blobs} = await list({prefix:`doodles/${id}--`, limit:5});
  return blobs.find(b => b.pathname.startsWith(`doodles/${id}--`));
}
export async function saveImage(bytes, mimeType, subject) {
  const id = randomUUID();
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
  const pathname = `doodles/${id}--${Buffer.from(subject).toString('base64url')}.${ext}`;
  const blob = await put(pathname, bytes, {access:'public', contentType:mimeType, addRandomSuffix:false});
  return {id, subject, url:blob.url, favorite:false, createdAt:new Date().toISOString()};
}
export async function setFavorite(id, favorite) {
  if (favorite) await put(starPath(id), 'star', {access:'public',contentType:'text/plain',addRandomSuffix:false,overwrite:true});
  else await del(starPath(id));
}
export async function deleteImage(id, image) { await del([image.url, starPath(id)]); }
