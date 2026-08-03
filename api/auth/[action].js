const kv = require('../_lib/kv');
const { createSessionCookie, clearSessionCookie, getSessionEmail, hashPassword, verifyPassword } = require('../_lib/customerAuth');

const USER_INDEX_KEY = 'om_user_index';

function userKey(email) {
  return `om_user:${email.trim().toLowerCase()}`;
}

async function handleSignup(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'お名前・メールアドレス・パスワードは必須です' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'パスワードは8文字以上で入力してください' });
  }

  const key = userKey(email);
  const existing = await kv.get(key);
  if (existing) {
    return res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    salt,
    hash,
    createdAt: Date.now()
  };
  await kv.set(key, user);

  const index = (await kv.get(USER_INDEX_KEY)) || [];
  if (!index.includes(user.email)) {
    index.push(user.email);
    await kv.set(USER_INDEX_KEY, index);
  }

  res.setHeader('Set-Cookie', createSessionCookie(user.email));
  return res.status(200).json({ name: user.name, email: user.email });
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
  }
  const user = await kv.get(userKey(email));
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
  }
  res.setHeader('Set-Cookie', createSessionCookie(user.email));
  return res.status(200).json({ name: user.name, email: user.email });
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ ok: true });
}

async function handleMe(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const email = getSessionEmail(req);
  if (!email) return res.status(401).json({ error: '認証が必要です' });
  const user = await kv.get(`om_user:${email}`);
  if (!user) return res.status(401).json({ error: '認証が必要です' });
  return res.status(200).json({ name: user.name, email: user.email });
}

module.exports = async (req, res) => {
  const { action } = req.query;
  switch (action) {
    case 'signup': return handleSignup(req, res);
    case 'login': return handleLogin(req, res);
    case 'logout': return handleLogout(req, res);
    case 'me': return handleMe(req, res);
    default: return res.status(404).json({ error: 'Not found' });
  }
};
