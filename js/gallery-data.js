// Pure helpers: turn the flat list of saved images into prompts, filters, sorting and month groups.

export const subjectOf = item => (item.subject.startsWith('My version: ') ? item.subject.slice(12) : item.subject);
// Same words in any order = same prompt (older photos were saved as "thing face extra").
const promptKey = item => subjectOf(item).toLowerCase().split(/\s+/).sort().join(' ');
const time = item => Date.parse(item.createdAt) || 0;
const oldestFirst = (a, b) => time(a) - time(b);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const formatDate = ts => new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });

// One prompt per set of images. Entries are { item, tag }, my photos first, then examples, oldest to newest.
export function buildPrompts(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = promptKey(item);
    byKey.set(key, [...(byKey.get(key) || []), item]);
  }
  return [...byKey].map(([key, list]) => {
    const photos = list.filter(i => i.mine).sort(oldestFirst);
    const examples = list.filter(i => !i.mine).sort(oldestFirst);
    const label = (word, n) => (n ? `${word} ${n + 1}` : word);
    const entries = [
      ...photos.map((item, n) => ({ item, tag: label('my photo', n) })),
      ...examples.map((item, n) => ({ item, tag: label('example', n) })),
    ];
    return {
      key,
      subject: subjectOf(examples[0] || photos[0]),
      entries,
      photos: photos.length,
      examples: examples.length,
      newest: Math.max(...list.map(time)),
    };
  });
}

// Shown under the title only when a prompt has more than one image, e.g. "1 photo · 3 examples".
export const summaryOf = p => (p.entries.length < 2 ? '' : [
  p.photos && plural(p.photos, 'photo'),
  p.examples && plural(p.examples, 'example'),
].filter(Boolean).join(' · '));

// Item-level filters: a row keeps only the tiles that match.
const KEEP = { all: () => true, favorites: e => e.item.favorite, mine: e => e.item.mine };
export const filterPrompts = (prompts, filter) =>
  prompts.map(p => ({ ...p, entries: p.entries.filter(KEEP[filter]) })).filter(p => p.entries.length);

export const searchPrompts = (prompts, query) => {
  const q = query.trim().toLowerCase();
  return q ? prompts.filter(p => p.subject.toLowerCase().includes(q)) : prompts;
};

export const SORTS = {
  newest: { label: 'newest first', compare: (a, b) => b.newest - a.newest, byDate: true },
  oldest: { label: 'oldest first', compare: (a, b) => a.newest - b.newest, byDate: true },
  az: { label: 'A to Z', compare: (a, b) => a.subject.localeCompare(b.subject) },
  examples: { label: 'most examples', compare: (a, b) => b.examples - a.examples || b.newest - a.newest },
};
export const sortPrompts = (prompts, sort) => [...prompts].sort(SORTS[sort].compare);

// A prompt belongs to the month of its newest image. Order follows the (already sorted) prompts.
export function groupByMonth(prompts) {
  const thisYear = new Date().getFullYear();
  const groups = new Map();
  for (const p of prompts) {
    const d = new Date(p.newest);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(key)) {
      const name = d.toLocaleDateString('en', { month: 'long' });
      groups.set(key, { key, name: d.getFullYear() === thisYear ? name : `${name} ${d.getFullYear()}`, prompts: [] });
    }
    groups.get(key).prompts.push(p);
  }
  return [...groups.values()];
}

export const countsOf = prompts => ({
  prompts: prompts.length,
  doodles: prompts.reduce((sum, p) => sum + p.entries.length, 0),
});
export const countText = ({ prompts, doodles }) => `${plural(prompts, 'prompt')} · ${plural(doodles, 'doodle')}`;
