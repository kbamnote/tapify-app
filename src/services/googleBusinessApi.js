// Google Business Profile — API client (thin wrappers over fetchApi).
import { fetchApi } from '../config';
import { invalidate } from './gbpCache';

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
  invalidate();   // the listing changed — force the next read to be fresh
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
  invalidate();   // the listing changed — force the next read to be fresh
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

/**
 * Marketing score — the one the app shows.
 * { score, max, earned, possible, band, summary, previous, delta, since,
 *   groups:[{group,earned,points}],
 *   items:[{group,key,label,points,earned,status,hint,fix_in,decays}] }
 *
 * Unlike getScore() this measures activity, so it moves down as well as up.
 */
export async function getMarketingScore() {
  const r = await fetchApi('/api/google/gbp/marketing-score.php');
  return r.data;
}

/** { posts[], total, actions[] } — Google Posts on the live listing. */
export async function getPosts(limit = 20) {
  const r = await fetchApi(`/api/google/gbp/posts.php?limit=${limit}`);
  return r.data;
}

/**
 * Publish a Google Post.
 * @param {{summary:string, action?:string, action_url?:string, image_url?:string}} post
 * Google fetches image_url itself, so it must already be publicly hosted.
 */
export async function createPost(post) {
  const r = await fetchApi('/api/google/gbp/posts.php', {
    method: 'POST',
    body: JSON.stringify(post),
  });
  invalidate();   // posting moves the score — do not serve a stale one
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

/** { photos[], total, categories[] } */
export async function getPhotos() {
  const r = await fetchApi('/api/google/gbp/photos.php');
  return r.data;
}

/**
 * Add a photo to the Google listing.
 * `sourceUrl` must already be publicly hosted — Google fetches it itself.
 * Upload the file through the existing media pipeline first and pass that URL.
 */
export async function addPhoto(sourceUrl, category = 'ADDITIONAL') {
  const r = await fetchApi('/api/google/gbp/photos.php', {
    method: 'POST',
    body: JSON.stringify({ source_url: sourceUrl, category }),
  });
  invalidate();   // the listing changed — force the next read to be fresh
  return r.data;
}

/**
 * Everything the Request a Review screen needs.
 * { review_link, business_name, requests[] }
 */
export async function getReviewRequests(limit = 100) {
  const r = await fetchApi(`/api/google/gbp/review-requests.php?limit=${limit}`);
  return r.data;
}

/**
 * Record that a customer was asked for a review.
 * Call this AFTER handing the message off to WhatsApp/SMS — the server sends
 * nothing, it only keeps the log.
 * @returns { id, name, phone, channel, last_asked }
 */
export async function logReviewRequest({ name, phone, channel = 'whatsapp' }) {
  const r = await fetchApi('/api/google/gbp/review-requests.php', {
    method: 'POST',
    body: JSON.stringify({ name, phone, channel }),
  });
  return r.data;
}

/* ── Performance ─────────────────────────────────────────────────────────── */

/** { days, range, prev_range, lag_days, split, cards[], series{} } */
export async function getInsights(days = 30) {
  const r = await fetchApi(`/api/google/gbp/insights.php?days=${days}`);
  return r.data;
}

/* ── Questions & Answers ─────────────────────────────────────────────────── */

/** { questions[], total, unanswered } */
export async function getQuestions(limit = 10) {   // Google caps this endpoint at 10
  const r = await fetchApi(`/api/google/gbp/questions.php?limit=${limit}`);
  return r.data;
}

/** Answer one question as the business (replaces any previous answer). */
export async function answerQuestion(questionId, answer) {
  const r = await fetchApi('/api/google/gbp/questions.php', {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, answer }),
  });
  return r.data;
}

/**
 * Publish generated FAQs as owner-posted question/answer pairs.
 * @param faqs [{ question, answer }] — the server caps how many go per run.
 * @returns { posted, results[] }
 */
export async function publishFaqs(faqs) {
  const r = await fetchApi('/api/google/gbp/questions.php', {
    method: 'POST',
    body: JSON.stringify({ faqs }),
  });
  return r.data;
}

/* ── Attributes ──────────────────────────────────────────────────────────── */

/** { groups:[{group, items:[{id,label,value}]}], set, available } */
export async function getAttributes() {
  const r = await fetchApi('/api/google/gbp/attributes.php');
  return r.data;
}

/** Save only what changed. @param changes { "attributes/xxx": true, … } */
export async function setAttributes(changes) {
  const r = await fetchApi('/api/google/gbp/attributes.php', {
    method: 'POST',
    body: JSON.stringify({ changes }),
  });
  invalidate();   // the listing changed — force the next read to be fresh
  return r.data;
}

/* ── Services ────────────────────────────────────────────────────────────── */

/** { services[], suggested[], category, category_id } */
export async function getServices() {
  const r = await fetchApi('/api/google/gbp/services.php');
  return r.data;
}

/**
 * Replace the whole service list — Google has no per-item endpoint, so send
 * everything you want to keep. Anything omitted is deleted from the listing.
 */
export async function setServices(services) {
  const r = await fetchApi('/api/google/gbp/services.php', {
    method: 'POST',
    body: JSON.stringify({ services }),
  });
  invalidate();   // the listing changed — force the next read to be fresh
  return r.data;
}

export async function disconnect() {
  const r = await fetchApi('/api/google/gbp/disconnect.php', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  invalidate();   // the listing changed — force the next read to be fresh
  return r.data;
}
