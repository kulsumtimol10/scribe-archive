import { describe, expect, it } from 'vitest';
import { checkName, checkReply, checkThread, defaultSpoiler, excerpt, isSealed, linkify, timeAgo, type CommonsStore, type Thread } from './commons';
import { createPreviewStore } from './commonsPreview';

class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

const valid = { hall: 'fourth-wing' as const, title: 'The Parapet chapter', body: 'I held my breath the whole way.', spoiler: 1 as const };

describe('posting rules', () => {
  it('wants a real rider name', () => {
    expect(checkName(' V ')).toMatch(/two letters/);
    expect(checkName('Violet')).toBeNull();
    expect(checkName('x'.repeat(25))).toMatch(/under 25/);
  });

  it('wants a title, a body, a hall and a spoiler tag', () => {
    expect(checkThread(valid)).toBeNull();
    expect(checkThread({ ...valid, title: '  ' })).toMatch(/title/);
    expect(checkThread({ ...valid, body: '' })).toMatch(/more/);
    expect(checkThread({ ...valid, hall: 'nope' as never })).toMatch(/hall/);
    expect(checkThread({ ...valid, spoiler: 4 as never })).toMatch(/spoils/);
    expect(checkReply({ body: '   ', spoiler: 0 })).toMatch(/reply/);
    expect(checkReply({ body: 'Same!', spoiler: 0 })).toBeNull();
  });

  it("tags a book's hall with that book by default", () => {
    expect(defaultSpoiler('iron-flame')).toBe(2);
    expect(defaultSpoiler('theories')).toBe(0);
  });
});

describe('the spoiler shield', () => {
  it('seals posts past the reader, unless they chose to look', () => {
    expect(isSealed(2, 1, false)).toBe(true);
    expect(isSealed(2, 1, true)).toBe(false);
    expect(isSealed(1, 1, false)).toBe(false);
    expect(isSealed(0, 1, false)).toBe(false);
  });
});

describe('display helpers', () => {
  it('says how long ago', () => {
    const now = Date.UTC(2026, 10, 3, 12);
    expect(timeAgo(null, now)).toBe('now');
    expect(timeAgo(now - 30_000, now)).toBe('now');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5m');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3h');
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe('2d');
  });

  it('finds links without swallowing the punctuation after them', () => {
    expect(linkify('Art: https://example.com/tairn. Love it')).toEqual([
      { text: 'Art: ' },
      { url: 'https://example.com/tairn' },
      { text: '. Love it' },
    ]);
    expect(linkify('no links here')).toEqual([{ text: 'no links here' }]);
  });

  it('shortens long posts on a word', () => {
    expect(excerpt('short')).toBe('short');
    const long = excerpt('word '.repeat(100), 30);
    expect(long.length).toBeLessThanOrEqual(30);
    expect(long.endsWith('word…')).toBe(true);
  });
});

describe('the preview store', () => {
  let clock = Date.UTC(2026, 10, 3);
  const make = () => createPreviewStore(new MemoryStorage() as unknown as Storage, () => clock);
  const latest = (store: CommonsStore) => {
    let threads: Thread[] = [];
    store.watchThreads(null, (t) => (threads = t))();
    return threads;
  };
  const ready = async () => {
    const store = make();
    await store.signInWithGoogle();
    await store.saveRider('Violet', 'black');
    return store;
  };

  it("won't let anyone post before they sign in and pick a name", async () => {
    const store = make();
    await expect(store.postThread(valid)).rejects.toThrow(/Sign in/);
    await store.signInWithGoogle();
    await expect(store.postThread(valid)).rejects.toThrow(/rider name/);
  });

  it('posts threads and replies, newest activity first', async () => {
    const store = await ready();
    const first = await store.postThread(valid);
    clock += 30_000;
    await store.postThread({ ...valid, title: 'Second thread' });
    expect(latest(store).map((t) => t.title)).toEqual(['Second thread', 'The Parapet chapter']);
    clock += 30_000;
    await store.postReply(first, { body: 'Same!', spoiler: 0 });
    const threads = latest(store);
    expect(threads[0].id).toBe(first);
    expect(threads[0].replyCount).toBe(1);
    expect(threads[0].authorName).toBe('Violet');
  });

  it('makes riders wait between posts', async () => {
    const store = await ready();
    await store.postThread(valid);
    clock += 5_000;
    await expect(store.postThread(valid)).rejects.toThrow(/15 seconds/);
  });

  it('counts each scale once and takes it back', async () => {
    const store = await ready();
    clock += 30_000;
    const id = await store.postThread(valid);
    await store.toggleScale(id, true);
    await store.toggleScale(id, true);
    expect(latest(store)[0].scaleCount).toBe(1);
    await store.toggleScale(id, false);
    expect(latest(store)[0].scaleCount).toBe(0);
  });

  it('averages ratings, changing a vote without counting it twice', async () => {
    const store = await ready();
    await store.rate(1, 5);
    await store.rate(1, 3);
    let average: number | null = null;
    let count = 0;
    store.watchRatings((r) => ({ average, count } = r[1]))();
    expect(average).toBe(3);
    expect(count).toBe(1);
    await expect(store.rate(1, 6)).rejects.toThrow(/one to five/);
  });

  it('hides taken-down threads from everyone', async () => {
    const store = await ready();
    clock += 30_000;
    const id = await store.postThread(valid);
    await store.setHidden(`threads/${id}`, true);
    expect(latest(store)).toHaveLength(0);
    await expect(store.postReply(id, { body: 'Hello?', spoiler: 0 })).rejects.toThrow(/taken down/);
  });

  it('keeps the preview between visits', async () => {
    const storage = new MemoryStorage() as unknown as Storage;
    const a = createPreviewStore(storage, () => clock);
    await a.signInWithGoogle();
    await a.saveRider('Violet', 'black');
    clock += 30_000;
    await a.postThread(valid);
    expect(latest(createPreviewStore(storage, () => clock))).toHaveLength(1);
  });
});

describe('Threshing Night in the preview store', () => {
  const clock = Date.UTC(2026, 10, 7, 19);
  const ready = async () => {
    const store = createPreviewStore(new MemoryStorage() as unknown as Storage, () => clock);
    await store.signInWithGoogle();
    await store.saveRider('violet', 'blue');
    return store;
  };
  const tairn = { dragonName: 'Tairn', colour: 'black' as const, tail: 'morningstartail' as const };

  it('counts each rider once per night, by colour', async () => {
    const store = await ready();
    await store.addBond('2026-11', tairn);
    await expect(store.addBond('2026-11', tairn)).rejects.toThrow(/already/);
    let total = 0;
    let black = 0;
    store.watchNight('2026-11', (c) => ({ total, black } = c))();
    expect({ total, black }).toEqual({ total: 1, black: 1 });
  });

  it('puts the newest bond at the top of the feed, and knows it is yours', async () => {
    const store = await ready();
    await store.addBond('2026-11', tairn);
    let feed: string[] = [];
    let mine: string | null = null;
    store.watchBonds('2026-11', (b) => (feed = b.map((x) => `${x.riderName}:${x.dragonName}`)))();
    store.watchMyBond('2026-11', (b) => (mine = b?.dragonName ?? null))();
    expect(feed).toEqual(['violet:Tairn']);
    expect(mine).toBe('Tairn');
  });

  it('keeps nights apart and empties the practice field', async () => {
    const store = await ready();
    await store.addBond('practice', tairn);
    await store.addBond('2026-11', tairn);
    await store.resetPractice();
    const totals: Record<string, number> = {};
    for (const id of ['practice', '2026-11']) store.watchNight(id, (c) => (totals[id] = c.total))();
    expect(totals).toEqual({ practice: 0, '2026-11': 1 });
  });
});
