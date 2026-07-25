// Meta Ads (boost) — API client.
import { fetchApi } from '../config';

/** Recent published posts on a connected Facebook Page. */
export async function getPagePosts(connectionId) {
  const r = await fetchApi(`/api/ads/page-posts.php?connection_id=${connectionId}`);
  return r.data?.posts || [];
}

/**
 * Launch a boost.
 * @param {object} p { connectionId, postId, budgetInr, durationDays, targeting }
 */
export async function boost(p) {
  const r = await fetchApi('/api/ads/boost.php', {
    method: 'POST',
    body: JSON.stringify({
      connection_id: p.connectionId,
      post_id: p.postId,
      budget_inr: p.budgetInr,
      duration_days: p.durationDays,
      targeting: p.targeting,
    }),
  });
  return r.data;
}

/** Search Meta ad geo-locations (cities/regions) for the location picker. */
export async function searchGeo(q) {
  const r = await fetchApi(`/api/ads/geo-search.php?q=${encodeURIComponent(q)}`);
  return r.data?.results || [];
}

/** Search Meta interests/behaviours for detailed targeting. */
export async function searchInterests(q) {
  const r = await fetchApi(`/api/ads/targeting-search.php?type=interest&q=${encodeURIComponent(q)}`);
  return r.data?.results || [];
}

/** Search Meta languages (locales) — each result's `key` is the locale id. */
export async function searchLanguages(q) {
  const r = await fetchApi(`/api/ads/targeting-search.php?type=language&q=${encodeURIComponent(q)}`);
  return r.data?.results || [];
}

export async function getCampaigns(limit = 30) {
  const r = await fetchApi(`/api/ads/campaigns.php?limit=${limit}`);
  return r.data?.campaigns || [];
}

export async function getInsights(campaignId) {
  const r = await fetchApi(`/api/ads/insights.php?campaign_id=${encodeURIComponent(campaignId)}`);
  return r.data?.insights || null;
}

export async function setStatus(campaignId, active) {
  const r = await fetchApi('/api/ads/status.php', {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId, active }),
  });
  return r.data;
}
