const kv = require('../_lib/kv');
const { getSessionEmail } = require('../_lib/customerAuth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const email = getSessionEmail(req);
  if (!email) return res.status(401).json({ error: '認証が必要です' });

  const user = await kv.get(`om_user:${email}`);
  if (!user) return res.status(401).json({ error: '認証が必要です' });

  return res.status(200).json({ name: user.name, email: user.email });
};
