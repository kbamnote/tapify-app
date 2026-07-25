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

export async function disconnect() {
  const r = await fetchApi('/api/google/gbp/disconnect.php', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return r.data;
}
