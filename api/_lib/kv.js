/* Minimal Upstash Redis REST client (no extra npm dependency). */
const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function command(parts) {
  if (!BASE || !TOKEN) {
    throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN is not configured');
  }
  const url = `${BASE}/${parts.map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function get(key) {
  const result = await command(['get', key]);
  if (result == null) return null;
  try { return JSON.parse(result); } catch (e) { return result; }
}

async function set(key, value) {
  return command(['set', key, JSON.stringify(value)]);
}

module.exports = { get, set };
