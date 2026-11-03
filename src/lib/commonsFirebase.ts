import type { FirebaseOptions } from 'firebase/app';
import type { User } from 'firebase/auth';
import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import {
  checkName,
  checkReply,
  checkThread,
  clean,
  EMPTY_RATINGS,
  type Account,
  type CommonsStore,
  type HallId,
  type Ratings,
  type Reply,
  type Report,
  type Rider,
  type Thread,
} from './commons';
import type { Book } from './spoilers';

/**
 * The real Commons, on Firebase: Google or email-link sign-in, posts in
 * Firestore. firestore.rules checks every write again on the server, so this
 * file's own checks are only there to give friendly messages first.
 *
 * Collections:
 *   threads/{id}                 a thread; replies/{id} beneath it
 *   riders/{uid}                 name, colour and when they last posted
 *   riders/{uid}/scales/{thread} the threads this rider gave a scale
 *   riders/{uid}/votes/{book}    this rider's rating of a book
 *   ratings/{book}               running total and count of ratings
 *   reports/{id}                 posts flagged for the moderators
 *   moderators/{uid}             who can hide posts (set in the console)
 */

const EMAIL_KEY = 'scribe-archive:sign-in-email';
/** A rider's first post is never held back: their clock starts long ago. */
const LONG_AGO = Date.UTC(2000, 0, 1);

const millis = (value: unknown): number | null => (value && typeof (value as Timestamp).toMillis === 'function' ? (value as Timestamp).toMillis() : null);

function toThread(snap: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Thread {
  const d = snap.data({ serverTimestamps: 'estimate' }) ?? {};
  return {
    id: snap.id,
    hall: d.hall,
    title: d.title,
    body: d.body,
    spoiler: d.spoiler,
    authorId: d.authorId,
    authorName: d.authorName,
    authorColour: d.authorColour,
    createdAt: millis(d.createdAt),
    lastActivity: millis(d.lastActivity),
    replyCount: d.replyCount ?? 0,
    scaleCount: d.scaleCount ?? 0,
    hidden: Boolean(d.hidden),
  };
}

function toReply(snap: QueryDocumentSnapshot<DocumentData>): Reply {
  const d = snap.data({ serverTimestamps: 'estimate' });
  return {
    id: snap.id,
    body: d.body,
    spoiler: d.spoiler,
    authorId: d.authorId,
    authorName: d.authorName,
    authorColour: d.authorColour,
    createdAt: millis(d.createdAt),
    hidden: Boolean(d.hidden),
  };
}

/** Turns Firebase's error codes into something a reader can act on. */
function friendly(err: unknown): Error {
  const code = (err as { code?: string }).code ?? '';
  if (code === 'permission-denied') return new Error('That didn’t go through. If you just posted, wait a few seconds and try again.');
  if (code === 'unavailable') return new Error('The Commons can’t be reached right now. Check your connection.');
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return new Error('Sign-in was closed before it finished.');
  if (code === 'auth/invalid-email') return new Error('That email address doesn’t look right.');
  if (code === 'auth/unauthorized-domain') return new Error('Sign-in isn’t switched on for this site yet.');
  return err instanceof Error ? err : new Error(String(err));
}

export async function createFirebaseStore(config: FirebaseOptions): Promise<CommonsStore> {
  const [{ initializeApp }, authLib, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  const app = initializeApp(config);
  const auth = authLib.getAuth(app);
  const db = fs.getFirestore(app);

  // Coming back through an emailed sign-in link: finish signing in, then tidy the address bar.
  if (authLib.isSignInWithEmailLink(auth, window.location.href)) {
    let email: string | null = null;
    try {
      email = window.localStorage.getItem(EMAIL_KEY);
    } catch {
      // Opened on another device; ask below.
    }
    email ??= window.prompt('Which email did you use to sign in?');
    if (email) {
      try {
        await authLib.signInWithEmailLink(auth, email, window.location.href);
      } catch {
        // An old or used link; the reader can ask for a new one.
      }
    }
    try {
      window.localStorage.removeItem(EMAIL_KEY);
    } catch {
      // Nothing to clean up.
    }
    window.history.replaceState(null, '', window.location.pathname);
  }

  const user = (): User => {
    if (!auth.currentUser) throw new Error('Sign in to post.');
    return auth.currentUser;
  };
  const riderRef = (uid: string) => fs.doc(db, 'riders', uid);
  const rider = async (): Promise<Rider> => {
    const { uid } = user();
    const snap = await fs.getDoc(riderRef(uid));
    if (!snap.exists()) throw new Error('Choose a rider name first.');
    return { uid, name: snap.data().name, colour: snap.data().colour };
  };

  /** Runs `start` for whoever is signed in, restarting it when that changes. */
  const perUser = (start: (u: User | null) => () => void) => {
    let stop = () => {};
    const stopAuth = authLib.onAuthStateChanged(auth, (u) => {
      stop();
      stop = start(u);
    });
    return () => {
      stopAuth();
      stop();
    };
  };

  return {
    kind: 'firebase',

    watchAccount: (cb) =>
      perUser((u) => {
        if (!u) {
          cb(null);
          return () => {};
        }
        let current: Rider | null = null;
        let moderator: boolean | null = null;
        let riderKnown = false;
        const emit = () => {
          if (riderKnown && moderator !== null) cb({ uid: u.uid, rider: current, moderator });
        };
        fs.getDoc(fs.doc(db, 'moderators', u.uid))
          .then((snap) => (moderator = snap.exists()))
          .catch(() => (moderator = false))
          .finally(emit);
        return fs.onSnapshot(
          riderRef(u.uid),
          (snap) => {
            current = snap.exists() ? { uid: u.uid, name: snap.data().name, colour: snap.data().colour } : null;
            riderKnown = true;
            emit();
          },
          () => {
            riderKnown = true;
            emit();
          },
        );
      }),

    signInWithGoogle: async () => {
      const provider = new authLib.GoogleAuthProvider();
      try {
        await authLib.signInWithPopup(auth, provider);
      } catch (err) {
        if ((err as { code?: string }).code === 'auth/popup-blocked') await authLib.signInWithRedirect(auth, provider);
        else throw friendly(err);
      }
    },

    sendEmailLink: async (email: string) => {
      try {
        await authLib.sendSignInLinkToEmail(auth, email.trim(), {
          url: window.location.origin + window.location.pathname,
          handleCodeInApp: true,
        });
        try {
          window.localStorage.setItem(EMAIL_KEY, email.trim());
        } catch {
          // They'll be asked for it when they come back.
        }
      } catch (err) {
        throw friendly(err);
      }
    },

    signOut: () => authLib.signOut(auth),

    saveRider: async (name, colour) => {
      const problem = checkName(name);
      if (problem) throw new Error(problem);
      const { uid } = user();
      const ref = riderRef(uid);
      try {
        const snap = await fs.getDoc(ref);
        if (snap.exists()) await fs.updateDoc(ref, { name: clean(name), colour });
        else await fs.setDoc(ref, { name: clean(name), colour, lastPostAt: fs.Timestamp.fromMillis(LONG_AGO) });
      } catch (err) {
        throw friendly(err);
      }
    },

    watchThreads: (hall: HallId | null, cb, onError) => {
      const filters = [fs.where('hidden', '==', false), ...(hall ? [fs.where('hall', '==', hall)] : [])];
      const q = fs.query(fs.collection(db, 'threads'), ...filters, fs.orderBy('lastActivity', 'desc'), fs.limit(60));
      return fs.onSnapshot(
        q,
        (snap) => cb(snap.docs.map(toThread)),
        (err) => onError?.(friendly(err)),
      );
    },

    watchThread: (id, cb) =>
      fs.onSnapshot(
        fs.doc(db, 'threads', id),
        (snap) => cb(snap.exists() ? toThread(snap) : null),
        () => cb(null),
      ),

    watchReplies: (threadId, cb) => {
      const q = fs.query(fs.collection(db, 'threads', threadId, 'replies'), fs.where('hidden', '==', false), fs.orderBy('createdAt', 'asc'), fs.limit(500));
      return fs.onSnapshot(
        q,
        (snap) => cb(snap.docs.map(toReply)),
        () => cb([]),
      );
    },

    watchMyScales: (cb) =>
      perUser((u) => {
        if (!u) {
          cb(new Set());
          return () => {};
        }
        return fs.onSnapshot(
          fs.collection(db, 'riders', u.uid, 'scales'),
          (snap) => cb(new Set(snap.docs.map((d) => d.id))),
          () => cb(new Set()),
        );
      }),

    watchRatings: (cb) =>
      perUser((u) => {
        const ratings: Ratings = { 1: { ...EMPTY_RATINGS[1] }, 2: { ...EMPTY_RATINGS[2] }, 3: { ...EMPTY_RATINGS[3] } };
        const emit = () => cb({ 1: { ...ratings[1] }, 2: { ...ratings[2] }, 3: { ...ratings[3] } });
        const stopTotals = fs.onSnapshot(
          fs.collection(db, 'ratings'),
          (snap) => {
            for (const d of snap.docs) {
              const book = Number(d.id) as Book;
              if (!ratings[book]) continue;
              const { total = 0, count = 0 } = d.data();
              ratings[book] = { ...ratings[book], average: count ? total / count : null, count };
            }
            emit();
          },
          () => emit(),
        );
        const stopMine = u
          ? fs.onSnapshot(
              fs.collection(db, 'riders', u.uid, 'votes'),
              (snap) => {
                for (const book of [1, 2, 3] as Book[]) ratings[book] = { ...ratings[book], mine: null };
                for (const d of snap.docs) {
                  const book = Number(d.id) as Book;
                  if (ratings[book]) ratings[book] = { ...ratings[book], mine: d.data().scales };
                }
                emit();
              },
              () => {},
            )
          : () => {};
        return () => {
          stopTotals();
          stopMine();
        };
      }),

    watchReports: (cb) => {
      const q = fs.query(fs.collection(db, 'reports'), fs.orderBy('createdAt', 'desc'), fs.limit(100));
      return fs.onSnapshot(
        q,
        (snap) =>
          cb(
            snap.docs.map((d): Report => {
              const data = d.data({ serverTimestamps: 'estimate' });
              return { id: d.id, path: data.path, reason: data.reason, createdAt: millis(data.createdAt) };
            }),
          ),
        // Only moderators may read reports; everyone else just sees none.
        () => cb([]),
      );
    },

    postThread: async (input) => {
      const problem = checkThread(input);
      if (problem) throw new Error(problem);
      const me = await rider();
      const ref = fs.doc(fs.collection(db, 'threads'));
      const batch = fs.writeBatch(db);
      batch.set(ref, {
        hall: input.hall,
        title: clean(input.title),
        body: clean(input.body),
        spoiler: input.spoiler,
        authorId: me.uid,
        authorName: me.name,
        authorColour: me.colour,
        createdAt: fs.serverTimestamp(),
        lastActivity: fs.serverTimestamp(),
        replyCount: 0,
        scaleCount: 0,
        hidden: false,
      });
      batch.update(riderRef(me.uid), { lastPostAt: fs.serverTimestamp() });
      try {
        await batch.commit();
      } catch (err) {
        throw friendly(err);
      }
      return ref.id;
    },

    postReply: async (threadId, input) => {
      const problem = checkReply(input);
      if (problem) throw new Error(problem);
      const me = await rider();
      const thread = fs.doc(db, 'threads', threadId);
      const ref = fs.doc(fs.collection(thread, 'replies'));
      const batch = fs.writeBatch(db);
      batch.set(ref, {
        body: clean(input.body),
        spoiler: input.spoiler,
        authorId: me.uid,
        authorName: me.name,
        authorColour: me.colour,
        createdAt: fs.serverTimestamp(),
        hidden: false,
      });
      batch.update(thread, { replyCount: fs.increment(1), lastActivity: fs.serverTimestamp(), lastReplyId: ref.id });
      batch.update(riderRef(me.uid), { lastPostAt: fs.serverTimestamp() });
      try {
        await batch.commit();
      } catch (err) {
        throw friendly(err);
      }
    },

    toggleScale: async (threadId, on) => {
      const { uid } = user();
      const mark = fs.doc(db, 'riders', uid, 'scales', threadId);
      const batch = fs.writeBatch(db);
      if (on) batch.set(mark, { at: fs.serverTimestamp() });
      else batch.delete(mark);
      batch.update(fs.doc(db, 'threads', threadId), { scaleCount: fs.increment(on ? 1 : -1) });
      try {
        await batch.commit();
      } catch (err) {
        throw friendly(err);
      }
    },

    rate: async (book, scales) => {
      if (!Number.isInteger(scales) || scales < 1 || scales > 5) throw new Error('Ratings run from one to five scales.');
      const { uid } = user();
      const vote = fs.doc(db, 'riders', uid, 'votes', String(book));
      const before = await fs.getDoc(vote);
      const old: number | null = before.exists() ? before.data().scales : null;
      if (old === scales) return;
      const batch = fs.writeBatch(db);
      batch.set(vote, { scales });
      batch.set(
        fs.doc(db, 'ratings', String(book)),
        { total: fs.increment(scales - (old ?? 0)), count: fs.increment(old === null ? 1 : 0) },
        { merge: true },
      );
      try {
        await batch.commit();
      } catch (err) {
        throw friendly(err);
      }
    },

    report: async (path, reason) => {
      const { uid } = user();
      try {
        await fs.addDoc(fs.collection(db, 'reports'), { path, reason, reporterId: uid, createdAt: fs.serverTimestamp() });
      } catch (err) {
        throw friendly(err);
      }
    },

    setHidden: async (path, hidden) => {
      try {
        await fs.updateDoc(fs.doc(db, path), { hidden });
      } catch (err) {
        throw friendly(err);
      }
    },

    dismissReport: async (id) => {
      try {
        await fs.deleteDoc(fs.doc(db, 'reports', id));
      } catch (err) {
        throw friendly(err);
      }
    },
  };
}
