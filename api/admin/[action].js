const { createSessionCookie, clearSessionCookie, isAuthed } = require('../_lib/auth');
const kv = require('../_lib/kv');

const USER_INDEX_KEY = 'om_user_index';

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured' });
  }
  const { password } = req.body || {};
  if (typeof password !== 'string' || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'パスワードが正しくありません' });
  }
  res.setHeader('Set-Cookie', createSessionCookie());
  return res.status(200).json({ ok: true });
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ ok: true });
}

async function handleUsers(req, res) {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const index = (await kv.get(USER_INDEX_KEY)) || [];
  const users = [];
  for (const email of index) {
    const user = await kv.get(`om_user:${email}`);
    if (user) {
      users.push({ name: user.name, email: user.email, createdAt: user.createdAt });
    }
  }
  users.sort((a, b) => b.createdAt - a.createdAt);
  return res.status(200).json({ users });
}

module.exports = async (req, res) => {
  const { action } = req.query;
  switch (action) {
    case 'login': return handleLogin(req, res);
    case 'logout': return handleLogout(req, res);
    case 'users': return handleUsers(req, res);
    default: return res.status(404).json({ error: 'Not found' });
  }
};
