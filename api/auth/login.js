const kv = require('../_lib/kv');
const { createSessionCookie, verifyPassword } = require('../_lib/customerAuth');

function userKey(email) {
  return `om_user:${email.trim().toLowerCase()}`;
}

module.exports = async (req, res) => {
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
};
