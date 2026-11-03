# Connecting the Commons to Firebase

The Commons runs in **preview mode** until it's connected: anything posted stays in that visitor's own
browser. Connecting it to a free Firebase project turns it into a real, shared discussion space. It takes
about 15 minutes in the Firebase console, and nothing here costs money: the free **Spark** plan needs no
card.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and sign in with the Google account that should own the
   Commons.
2. **Create a project**. Any name works (for example `scribe-archive`). Google Analytics isn't needed.

## 2. Turn on sign-in

1. **Build › Authentication › Get started**.
2. Under **Sign-in method**, enable **Google** (choose a support email when asked).
3. Enable **Email/Password**, and inside it switch on **Email link (passwordless sign-in)**. Readers never
   make a password; they get a link by email.
4. Under **Settings › Authorized domains**, add `kulsumtimol10.github.io`.

## 3. Create the database

1. **Build › Firestore Database › Create database**. Pick **production mode** and a location close to most
   readers (it can't be changed later).
2. Open the **Rules** tab, replace everything with the contents of [`firestore.rules`](firestore.rules) and
   press **Publish**. These rules are what keep the Commons safe: they check every post, reply, scale and
   rating on Google's side.
3. Open the **Indexes** tab and add these three **composite** indexes (they're also listed in
   [`firestore.indexes.json`](firestore.indexes.json)):

   | Collection | Fields |
   | --- | --- |
   | `threads` | `hidden` Ascending, `lastActivity` Descending |
   | `threads` | `hidden` Ascending, `hall` Ascending, `lastActivity` Descending |
   | `replies` | `hidden` Ascending, `createdAt` Ascending |

   Each takes a few minutes to build.

## 4. Get the web settings

1. Click the gear icon next to **Project overview**, then **Project settings**.
2. Under **Your apps**, click the web icon (`</>`), give the app a name, and leave Firebase Hosting off.
3. Firebase shows a `firebaseConfig` with `apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId` and `appId`. Copy those values.

These values are **meant to be public**: every Firebase website includes them in its code. The rules from
step 3 are what protect the data. They go into [`src/lib/firebaseConfig.ts`](src/lib/firebaseConfig.ts),
in place of `null`. Once that's published, the preview banner disappears and the Commons is live.

## 5. Make yourself a moderator

1. Sign in to the Commons on the live site once and choose a rider name.
2. In the console, open **Authentication › Users** and copy your **User UID**.
3. Open **Firestore Database › Data**, **Start collection** named `moderators`, use your UID as the
   **Document ID**, add any field (for example `name` = your name) and save.

Moderators see a **Reports** panel and a **Hide** button on every post. Repeat for anyone else who
helps moderate.

## 6. Paste the rules again when the site grows

Whenever the site adds something that saves to Firebase, `firestore.rules` gains a section, and the console
needs the new copy: **Firestore Database › Rules**, replace everything with the current
[`firestore.rules`](firestore.rules), **Publish**. Threshing Night is the latest: until its rules are
published, its counts can't be saved.

## 7. Optional: lock the key to your site

The web settings' key only works for this project, and the rules protect the data, so this is extra
safety rather than a must. It stops other websites from using your key and your free quota.

1. Open <https://console.cloud.google.com/apis/credentials?project=scribe-archive-747a9>, signed in with
   the same Google account.
2. Under **API keys**, open **Browser key (auto created by Firebase)**.
3. Under **Application restrictions**, choose **Websites** and add these three:
   - `https://kulsumtimol10.github.io/*`
   - `https://scribe-archive-747a9.firebaseapp.com/*` (Google sign-in's pop-up runs here; leave it out and
     sign-in stops working)
   - `http://localhost:5190/*` (only for trying the site on a computer while building it)
4. Leave **API restrictions** as they are, and **Save**. It can take five minutes to apply.

## Threshing Night

Threshing Night runs on the first Saturday of every month, 6 pm to midnight UTC (each reader sees it in
their own time). To change that, edit `SCHEDULE` in `src/lib/threshingNight.ts`. Readers sign in with their
Commons account to add the dragon the Threshing gave them, once per night. Moderators see an
**Open the practice field** button on the Threshing Night page that works exactly like the real field but
never counts, and **Empty the practice field** to start again.

## What the free plan allows

Roughly 50,000 reads and 20,000 writes a day, and 1 GB of stored posts. That's plenty for a growing fan
community; Firebase's usage page shows how close you are. If the Commons ever outgrows it, the Blaze plan
charges only for what goes over, and you can set a budget alert first.

## What's built in

- Sign-in with Google or an emailed link. Other readers only ever see the rider name you choose, never
  your email.
- Each account can post at most once every 20 seconds, which slows spam down.
- Every post is tagged with the latest book it spoils, and readers' spoiler shields blur anything past
  their book.
- Anyone signed in can report a post; moderators review reports and can hide posts. Authors can take down
  their own posts.
