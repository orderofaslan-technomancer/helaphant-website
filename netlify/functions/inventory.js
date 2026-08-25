const crypto = require('crypto');

function config() {
  const url = (process.env.SUPABASE_URL || 'https://hxisuvcyfmsotiavhiav.supabase.co').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) throw new Error('Inventory is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Netlify.');
  return { url, key };
}

async function request(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(body || `Inventory service returned ${response.status}`);
  return body ? JSON.parse(body) : null;
}

function normalizeItems(cart) {
  const grouped = new Map();
  for (const item of cart) {
    const id = Number(item.id);
    const quantity = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));
    if (!Number.isInteger(id) || id < 1) throw new Error('Each item must have a valid product ID.');
    grouped.set(id, (grouped.get(id) || 0) + quantity);
  }
  return [...grouped.entries()].map(([id, quantity]) => ({ id, quantity }));
}

async function getProducts(ids) {
  const list = ids.join(',');
  return request(`/rest/v1/products?select=id,title,category,price,description,inventory_count,is_active,is_digital,digital_file_path&id=in.(${list})&is_active=eq.true`);
}

async function getDigitalProducts(ids) {
  const list = ids.map(Number).filter(Number.isInteger).join(',');
  if (!list) return [];
  return request(`/rest/v1/products?select=id,title,is_digital,digital_file_path&id=in.(${list})`);
}

async function createSignedDownloadUrl(filePath) {
  const encodedPath = String(filePath).split('/').map(encodeURIComponent).join('/');
  const result = await request(`/storage/v1/object/sign/digital-downloads/${encodedPath}`, {
    method: 'POST',
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!result?.signedURL) throw new Error('Could not create download link.');
  const { url } = config();
  return `${url}/storage/v1${result.signedURL}`;
}

async function callRpc(name, payload) {
  return request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(payload) });
}

async function reserve(items) {
  const holdId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await callRpc('reserve_inventory_hold', {
    p_hold_id: holdId,
    p_items: items,
    p_expires_at: expiresAt,
  });
  return { holdId, expiresAt };
}

async function confirm(holdId) {
  return callRpc('confirm_inventory_hold', { p_hold_id: holdId });
}

async function release(holdId) {
  return callRpc('release_inventory_hold', { p_hold_id: holdId });
}

module.exports = { normalizeItems, getProducts, getDigitalProducts, createSignedDownloadUrl, reserve, confirm, release };
