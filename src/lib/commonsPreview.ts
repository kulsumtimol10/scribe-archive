import {
  checkName,
  checkReply,
  checkThread,
  clean,
  EMPTY_RATINGS,
  POST_GAP,
  type Account,
  type CommonsStore,
  type HallId,
  type NewReply,
  type NewThread,
  type Ratings,
  type Reply,
  type Report,
  type ReportReason,
  type Rider,
  type Thread,
} from './commons';
import type { Book } from './spoilers';
import type { DragonColour } from './threshing';

/**
 * The Commons before it is connected: the same store, kept in this browser
 * only, so the pages can be tried end to end. The reader is their own
 * moderator here, to see how the tools work. Nobody else sees these posts.
 */

const KEY = 'scribe-archive:commons-preview';
const UID = 'preview-rider';

interface Data {
  signedIn: boolean;
  rider: Rider | null;
  lastPostAt: number;
  threads: Thread[];
  replies: Record<string, Reply[]>;
  scales: string[];
  votes: Partial<Record<Book, number>>;
  totals: Record<Book, { total: number; count: number }>;
  reports: Report[];
}

const fresh = (): Data => ({
  signedIn: false,
  rider: null,
  lastPostAt: 0,
  threads: [],
  replies: {},
  scales: [],
  votes: {},
  totals: { 1: { total: 0, count: 0 }, 2: { total: 0, count: 0 }, 3: { total: 0, count: 0 } },
  reports: [],
});

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createPreviewStore(storage: Storage | null = browserStorage(), now = () => Date.now()): CommonsStore {
  let data: Data = (() => {
    try {
      const raw = storage?.getItem(KEY);
      return raw ? { ...fresh(), ...(JSON.parse(raw) as Partial<Data>) } : fresh();
    } catch {
      return fresh();
    }
  })();

  const listeners = new Set<() => void>();
  const commit = (next: Data) => {
    data = next;
    try {
      storage?.setItem(KEY, JSON.stringify(data));
    } catch {
      // A full or blocked storage just means the preview forgets on reload.
    }
    listeners.forEach((fn) => fn());
  };
  const watch = (emit: () => void) => {
    emit();
    listeners.add(emit);
    return () => {
      listeners.delete(emit);
    };
  };

  const account = (): Account | null => (data.signedIn ? { uid: UID, rider: data.rider, moderator: true } : null);
  const rider = (): Rider => {
    if (!data.signedIn) throw new Error('Sign in to post.');
    if (!data.rider) throw new Error('Choose a rider name first.');
    return data.rider;
  };
  const paced = () => {
    const wait = Math.ceil(POST_GAP - (now() - data.lastPostAt) / 1000);
    if (wait > 0) throw new Error(`Take a breath: you can post again in ${wait} ${wait === 1 ? 'second' : 'seconds'}.`);
  };
  let counter = 0;
  const id = () => `p${now().toString(36)}${(counter++).toString(36)}`;

  const ratings = (): Ratings => {
    const out: Ratings = { ...EMPTY_RATINGS };
    for (const book of [1, 2, 3] as Book[]) {
      const { total, count } = data.totals[book];
      out[book] = { average: count ? total / count : null, count, mine: data.votes[book] ?? null };
    }
    return out;
  };

  /** "threads/a" or "threads/a/replies/b", applied to a copy of the data. */
  const withHidden = (path: string, hidden: boolean): Data => {
    const [, threadId, , replyId] = path.split('/');
    if (replyId) {
      const list = (data.replies[threadId] ?? []).map((r) => (r.id === replyId ? { ...r, hidden } : r));
      return { ...data, replies: { ...data.replies, [threadId]: list } };
    }
    return { ...data, threads: data.threads.map((t) => (t.id === threadId ? { ...t, hidden } : t)) };
  };

  return {
    kind: 'preview',

    watchAccount: (cb) => watch(() => cb(account())),
    signInWithGoogle: async () => commit({ ...data, signedIn: true }),
    sendEmailLink: async () => commit({ ...data, signedIn: true }),
    signOut: async () => commit({ ...data, signedIn: false }),
    saveRider: async (name: string, colour: DragonColour) => {
      const problem = checkName(name);
      if (problem) throw new Error(problem);
      commit({ ...data, rider: { uid: UID, name: clean(name), colour } });
    },

    watchThreads: (hall: HallId | null, cb) =>
      watch(() =>
        cb(
          data.threads
            .filter((t) => (hall === null || t.hall === hall) && !t.hidden)
            .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0)),
        ),
      ),
    watchThread: (threadId, cb) => watch(() => cb(data.threads.find((t) => t.id === threadId) ?? null)),
    watchReplies: (threadId, cb) => watch(() => cb((data.replies[threadId] ?? []).filter((r) => !r.hidden))),
    watchMyScales: (cb) => watch(() => cb(new Set(data.scales))),
    watchRatings: (cb) => watch(() => cb(ratings())),
    watchReports: (cb) => watch(() => cb([...data.reports])),

    postThread: async (input: NewThread) => {
      const me = rider();
      const problem = checkThread(input);
      if (problem) throw new Error(problem);
      paced();
      const at = now();
      const thread: Thread = {
        id: id(),
        hall: input.hall,
        title: clean(input.title),
        body: clean(input.body),
        spoiler: input.spoiler,
        authorId: me.uid,
        authorName: me.name,
        authorColour: me.colour,
        createdAt: at,
        lastActivity: at,
        replyCount: 0,
        scaleCount: 0,
        hidden: false,
      };
      commit({ ...data, lastPostAt: at, threads: [thread, ...data.threads] });
      return thread.id;
    },

    postReply: async (threadId: string, input: NewReply) => {
      const me = rider();
      const problem = checkReply(input);
      if (problem) throw new Error(problem);
      const thread = data.threads.find((t) => t.id === threadId);
      if (!thread || thread.hidden) throw new Error('This thread has been taken down.');
      paced();
      const at = now();
      const reply: Reply = {
        id: id(),
        body: clean(input.body),
        spoiler: input.spoiler,
        authorId: me.uid,
        authorName: me.name,
        authorColour: me.colour,
        createdAt: at,
        hidden: false,
      };
      commit({
        ...data,
        lastPostAt: at,
        replies: { ...data.replies, [threadId]: [...(data.replies[threadId] ?? []), reply] },
        threads: data.threads.map((t) => (t.id === threadId ? { ...t, replyCount: t.replyCount + 1, lastActivity: at } : t)),
      });
    },

    toggleScale: async (threadId: string, on: boolean) => {
      rider();
      const has = data.scales.includes(threadId);
      if (has === on) return;
      commit({
        ...data,
        scales: on ? [...data.scales, threadId] : data.scales.filter((s) => s !== threadId),
        threads: data.threads.map((t) => (t.id === threadId ? { ...t, scaleCount: t.scaleCount + (on ? 1 : -1) } : t)),
      });
    },

    rate: async (book: Book, scales: number) => {
      rider();
      if (!Number.isInteger(scales) || scales < 1 || scales > 5) throw new Error('Ratings run from one to five scales.');
      const before = data.votes[book];
      if (before === scales) return;
      const { total, count } = data.totals[book];
      commit({
        ...data,
        votes: { ...data.votes, [book]: scales },
        totals: { ...data.totals, [book]: { total: total - (before ?? 0) + scales, count: count + (before === undefined ? 1 : 0) } },
      });
    },

    report: async (path: string, reason: ReportReason) => {
      rider();
      commit({ ...data, reports: [{ id: id(), path, reason, createdAt: now() }, ...data.reports] });
    },
    setHidden: async (path: string, hidden: boolean) => commit(withHidden(path, hidden)),
    dismissReport: async (reportId: string) => commit({ ...data, reports: data.reports.filter((r) => r.id !== reportId) }),
  };
}
