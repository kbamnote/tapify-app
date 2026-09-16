/**
 * ActivityTracker — records which features a customer uses in the app.
 *
 * Feeds the Customer Manager dashboard in the Sales CRM: Tapify's account
 * managers see which features each customer has opened or used, when, and how
 * often, so they know who to help and with what.
 *
 * What's sent (to POST /api/activity/track.php):
 *   - screen   — every screen opened (the server maps screen → feature)
 *   - action   — the few things that never reach the server on their own:
 *                sharing the card, downloading/sharing a design, calling or
 *                WhatsApp-ing a lead
 *   - app_open — the app launched, or came back after a while away
 *
 * Saving, publishing, deleting etc. are NOT sent from here: the server already
 * sees those API calls and records them itself.
 *
 * Events are queued in AsyncStorage and sent in batches, so a customer with no
 * signal loses nothing and a busy session isn't one request per tap. Nothing
 * here may ever throw into a screen — tracking failing must be invisible.
 */
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, CLIENT_HEADER } from '../config';

const QUEUE_KEY = 'tapify_activity_queue_v1';
const MAX_QUEUE = 500;          // cap for a long offline spell (oldest dropped)
const BATCH_SIZE = 100;         // server's per-request limit
const FLUSH_EVERY_MS = 30000;
const FLUSH_AT = 20;            // send early once this many are waiting
const NEW_OPEN_AFTER_MS = 5 * 60 * 1000; // back after this long = a new app open
const SAME_SCREEN_MS = 2000;    // ignore a repeat of the same screen within this

const USER_KEY = `${QUEUE_KEY}_user`;

let userId = null;
let queue = [];
let flushing = false;
let timer = null;
let appStateSub = null;
let backgroundedAt = null;
let lastScreen = { name: null, at: 0 };

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

async function persist() {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch (_) { /* best effort */ }
}

/**
 * Every change to the queue runs in order on this chain. It starts with loading
 * whatever was saved last session, so an event recorded in the first moments of
 * a launch can never persist over — and wipe — the queue still being read back.
 */
let ready = (async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    if (Array.isArray(saved)) queue = saved.slice(-MAX_QUEUE);
  } catch (_) { /* start empty */ }
})();

const inOrder = (fn) => {
  ready = ready.then(fn).catch(() => {});
  return ready;
};

/**
 * One write for a burst of events rather than one per event: each write stores
 * the whole queue, so writing per tap would pile up behind itself on a phone.
 * Queued behind everything already on the chain, so it captures all of them.
 */
let persistQueued = false;
function persistSoon() {
  if (persistQueued) return;
  persistQueued = true;
  inOrder(async () => {
    persistQueued = false;
    await persist();
  });
}

function push(event) {
  if (!userId) return; // only while logged in — events must belong to someone
  const entry = { id: newId(), at: Date.now(), ...event }; // stamped now, stored in order
  inOrder(() => {
    queue.push(entry);
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    persistSoon();
    if (queue.length >= FLUSH_AT) flush();
  });
}

export async function flush() {
  if (flushing || !userId) return;
  flushing = true;
  try {
    await ready;
    while (queue.length) {
      const batch = queue.slice(0, BATCH_SIZE);
      let res;
      try {
        res = await fetch(`${API_BASE}/api/activity/track.php`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Tapify-Client': CLIENT_HEADER,
          },
          body: JSON.stringify({ events: batch }),
        });
      } catch (_) {
        return; // offline — keep everything for the next try
      }

      if (res.status >= 500) return; // server trouble — retry later
      // 2xx: stored (duplicates are de-duplicated server-side by id).
      // 4xx: the batch will never be accepted (logged out, malformed) — drop it
      // rather than retry forever.
      const sent = new Set(batch.map((e) => e.id));
      queue = queue.filter((e) => !sent.has(e.id));
      await persist();
      if (res.status >= 400) return;
    }
  } finally {
    flushing = false;
  }
}

function onAppStateChange(next) {
  if (next === 'active') {
    if (backgroundedAt && Date.now() - backgroundedAt >= NEW_OPEN_AFTER_MS) {
      push({ type: 'app_open' });
    }
    backgroundedAt = null;
    flush();
  } else if (next === 'background') {
    backgroundedAt = Date.now();
    flush(); // best effort before the OS suspends us
  }
}

/**
 * Call once the logged-in user is known (session restored or fresh login).
 * A different user than before on this phone discards the previous user's
 * unsent events, so they can never be recorded against the wrong account.
 */
export async function start(id) {
  try {
    if (!id) return;
    const next = String(id);
    const newSession = userId !== next;

    // Take the user synchronously. The caller opens the dashboard right after
    // calling this, and that screen must not be lost while storage is read.
    userId = next;

    // Queued ahead of any event from this session, so a switch of account can
    // only ever clear the previous user's events.
    inOrder(async () => {
      const prev = await AsyncStorage.getItem(USER_KEY);
      if (prev && prev !== next) {
        queue = [];
        await persist();
      }
      await AsyncStorage.setItem(USER_KEY, next);
    });

    if (newSession) push({ type: 'app_open' });

    if (!timer) timer = setInterval(flush, FLUSH_EVERY_MS);
    if (!appStateSub) appStateSub = AppState.addEventListener('change', onAppStateChange);
    await ready;
    flush();
  } catch (_) { /* tracking must never break login */ }
}

/** Call on logout. Tries to send what's queued, then stops. */
export async function stop() {
  try {
    await flush();
  } catch (_) { /* ignore */ }
  userId = null;
  lastScreen = { name: null, at: 0 };
  if (timer) { clearInterval(timer); timer = null; }
  if (appStateSub) { appStateSub.remove(); appStateSub = null; }
}

/** A screen was opened. */
export function screen(name) {
  try {
    if (!name || name === 'login' || !userId) return;
    const now = Date.now();
    // navigate() can fire twice for one tap; don't count that as two opens.
    if (lastScreen.name === name && now - lastScreen.at < SAME_SCREEN_MS) return;
    lastScreen = { name, at: now };
    push({ type: 'screen', screen: name });
  } catch (_) { /* ignore */ }
}

/**
 * Something done in the app that the server never sees on its own.
 * `feature` must be a key from the server's FeatureCatalog.
 */
export function action(feature, actionName) {
  try {
    if (!feature || !actionName) return;
    push({ type: 'action', feature, action: actionName });
  } catch (_) { /* ignore */ }
}

export default { start, stop, flush, screen, action };
