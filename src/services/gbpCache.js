/**
 * In-memory cache for the Google Business Profile snapshot.
 *
 * WHY THIS EXISTS: the AI Growth Center screen unmounts whenever you navigate
 * away, so its load ran again on every single visit. That is not one request —
 * getScore() alone fans out to the location read, the v4 media count and the
 * attributes list, so a glance at the screen cost four or more calls to Google
 * and a visible spinner over a connection the customer had already made.
 *
 * Scope is deliberately one app session. It is NOT persisted: a stored
 * "connected" flag could outlive the customer disconnecting on another device
 * or the token being revoked, and showing a stale green tick is worse than a
 * one-second load on a cold start.
 *
 * Freshness is handled by the caller: read the cache to paint immediately, and
 * revalidate in the background only when isStale() says so.
 */

const TTL_MS = 5 * 60 * 1000;   // long enough to stop refetching while browsing

let entry = null;               // { connected, location, fields, score, at }

/** The last snapshot, or null. Safe to render straight away. */
export function getCached() {
  return entry;
}

/** True when there is nothing cached, or what is cached has aged out. */
export function isStale() {
  return !entry || Date.now() - entry.at > TTL_MS;
}

export function setCache(snapshot) {
  entry = { ...snapshot, at: Date.now() };
}

/**
 * Drop the snapshot. Called by every mutating request in googleBusinessApi so a
 * write can never leave a stale score or an old description on screen — putting
 * it there rather than in each screen means a new mutation cannot forget to.
 */
export function invalidate() {
  entry = null;
}
