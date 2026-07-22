const { put } = require('@vercel/blob');
const { isAuthed } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured' });
  }

  const { filename, dataBase64, contentType } = req.body || {};
  if (!filename || !dataBase64) {
    return res.status(400).json({ error: 'ファイルデータが必要です' });
  }

  try {
    const buffer = Buffer.from(dataBase64, 'base64');
    const safeName = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const blob = await put(`products/${Date.now()}-${safeName}`, buffer, {
      access: 'public',
      contentType: contentType || 'application/octet-stream'
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
