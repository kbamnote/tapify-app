// AI Growth Center — API client. Thin wrappers over the shared fetchApi so the
// screen/components never build URLs or bodies themselves.
import { fetchApi } from '../config';

/**
 * Generate (or fetch cached) content for a tool.
 * @param {object} tool        entry from aiTools config (needs .endpoint)
 * @param {object} inputs      field values
 * @param {boolean} regenerate bypass the server-side cache
 * @returns {Promise<object>}  data envelope: { feature, result, cached, provider, model, history_id, generated_at }
 */
export async function generate(tool, inputs, regenerate = false) {
  const res = await fetchApi(tool.endpoint, {
    method: 'POST',
    body: JSON.stringify({ ...inputs, regenerate }),
  });
  return res.data;
}

/** List history for a tool (most recent first). */
export async function fetchHistory(featureKey, { savedOnly = false, limit = 30 } = {}) {
  const params = [`limit=${encodeURIComponent(limit)}`];
  if (featureKey) params.push(`feature=${encodeURIComponent(featureKey)}`);
  if (savedOnly) params.push('saved=1');
  const res = await fetchApi(`/api/ai/history.php?${params.join('&')}`);
  return res.data?.items || [];
}

/** Bookmark / un-bookmark a generated result by its history id. */
export async function setSaved(historyId, saved = true) {
  const res = await fetchApi('/api/ai/save.php', {
    method: 'POST',
    body: JSON.stringify({ history_id: historyId, saved }),
  });
  return res.data;
}
