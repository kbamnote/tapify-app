// Social publishing — API client (thin wrappers over fetchApi).
import { fetchApi } from '../config';

/** { connections:[{id,platform,account_id,account_name,avatar}], connectable:[...] } */
export async function getConnections() {
  const r = await fetchApi('/api/social/connections.php');
  return r.data;
}

/** OAuth consent URL for a platform (e.g. 'facebook'). */
export async function getConnectUrl(platform) {
  const r = await fetchApi('/api/social/connect-url.php', {
    method: 'POST',
    body: JSON.stringify({ platform }),
  });
  return r.data?.auth_url;
}

export async function disconnect(connectionId) {
  const r = await fetchApi('/api/social/disconnect.php', {
    method: 'POST',
    body: JSON.stringify({ connection_id: connectionId }),
  });
  return r.data;
}

/**
 * Upload one picked asset (image/video) to the backend → Cloudinary.
 * @param asset expo-image-picker asset { uri, type:'image'|'video', fileName, mimeType }
 * @returns { type, url }
 */
export async function uploadMedia(asset) {
  const isVideo = asset.type === 'video';
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.fileName || (isVideo ? 'upload.mp4' : 'upload.jpg'),
    type: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
  });
  // fetchApi leaves FormData bodies untouched (no JSON content-type).
  const r = await fetchApi('/api/social/media.php', { method: 'POST', body: form });
  return r.data; // { type, url }
}

/**
 * Publish now or schedule.
 * @param scheduledAt ISO string (UTC) or null for post-now.
 */
export async function publish({ caption, media, connectionIds, scheduledAt }) {
  const body = { caption, media, connection_ids: connectionIds };
  if (scheduledAt) body.scheduled_at = scheduledAt;
  const r = await fetchApi('/api/social/publish.php', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data; // { post_id, status }
}

export async function getPosts(limit = 30) {
  const r = await fetchApi(`/api/social/posts.php?limit=${limit}`);
  return r.data?.posts || [];
}
