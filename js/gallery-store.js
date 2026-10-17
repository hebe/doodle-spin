import { api } from './api.js';

// The list of saved doodles, shared by the gallery and the viewer.
let items = [];
let loaded = false;
const listeners = [];

const emit = () => listeners.forEach(fn => fn());

export const getItems = () => items;
export const isLoaded = () => loaded;
export const onItemsChange = fn => listeners.push(fn);

export async function loadItems() {
  items = (await api('/api/gallery')).items;
  loaded = true;
  emit();
}

// New doodles show up without waiting for a reload.
export function addItem(item) {
  items = [item, ...items.filter(x => x.id !== item.id)];
  emit();
}

export async function setFavorite(item, favorite) {
  await api('/api/gallery', { method: 'PATCH', body: JSON.stringify({ id: item.id, favorite }) });
  item.favorite = favorite;
  emit();
}

export async function removeItem(item) {
  await api('/api/gallery', { method: 'DELETE', body: JSON.stringify({ id: item.id }) });
  items = items.filter(x => x.id !== item.id);
  emit();
}
