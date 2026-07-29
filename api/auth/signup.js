const kv = require('../_lib/kv');
const { createSessionCookie, hashPassword } = require('../_lib/customerAuth');

function userKey(email) {
  return `om_user:${email.trim().toLowerCase()}`;
}

module.exports = async (req, res) => {
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

  res.setHeader('Set-Cookie', createSessionCookie(user.email));
  return res.status(200).json({ name: user.name, email: user.email });
};
