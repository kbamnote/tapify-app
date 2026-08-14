// Google Business Profile — API client (thin wrappers over fetchApi).
import { fetchApi } from '../config';

/** { configured, connected, location: {id,title}|null } */
export async function getStatus() {
  const r = await fetchApi('/api/google/gbp/status.php');
  return r.data;
}

/** The Google consent URL to open in a browser. */
export async function getConnectUrl() {
  const r = await fetchApi('/api/google/gbp/connect-url.php');
  return r.data?.auth_url;
}

/** { fields, editable } — live from Google. */
export async function getFields() {
  const r = await fetchApi('/api/google/gbp/location.php');
  return r.data;
}

/** PATCH changed fields → returns refreshed { fields, editable }. */
export async function updateFields(fields) {
  const r = await fetchApi('/api/google/gbp/update.php', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return r.data;
}

export async function listLocations() {
  const r = await fetchApi('/api/google/gbp/locations.php');
  return r.data?.locations || [];
}

export async function selectLocation(locationId, title) {
  const r = await fetchApi('/api/google/gbp/select-location.php', {
    method: 'POST',
    body: JSON.stringify({ location_id: locationId, title }),
  });
  return r.data;
}

/**
 * Profile health score.
 * { score, max, band, summary, previous, delta, since, items:[{key,label,points,earned,status,hint,tool,fix_in}] }
 */
export async function getScore() {
  const r = await fetchApi('/api/google/gbp/score.php');
  return r.data;
}

/** { reviews[], total, average, location_title, unanswered, auto_reply:{enabled,min_stars} } */
export async function getReviews(limit = 50) {
  const r = await fetchApi(`/api/google/gbp/reviews.php?limit=${limit}`);
  return r.data;
}

/** Post (or replace) the owner's reply to one review. */
export async function replyToReview(reviewId, comment) {
  const r = await fetchApi('/api/google/gbp/reply.php', {
    method: 'POST',
    body: JSON.stringify({ review_id: reviewId, comment }),
  });
  return r.data;
}

/** Turn automatic replying on/off, and the star floor it applies from. */
export async function setAutoReply(enabled, minStars = 4) {
  const r = await fetchApi('/api/google/gbp/auto-reply.php', {
    method: 'POST',
    body: JSON.stringify({ enabled, min_stars: minStars }),
  });
  return r.data;
}

export async function disconnect() {
  const r = await fetchApi('/api/google/gbp/disconnect.php', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return r.data;
}
