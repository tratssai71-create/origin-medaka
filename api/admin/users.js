const { isAuthed } = require('../_lib/auth');
const kv = require('../_lib/kv');

const USER_INDEX_KEY = 'om_user_index';

module.exports = async (req, res) => {
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
};
