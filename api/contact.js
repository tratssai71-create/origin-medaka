const RECIPIENT = 'kaito.seino1230@gmail.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  }

  const { name, email, category, message } = req.body || {};
  if (!name || !email || !category || !message) {
    return res.status(400).json({ error: '全ての項目を入力してください' });
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Origin Medaka <onboarding@resend.dev>',
        to: [RECIPIENT],
        reply_to: email,
        subject: `【お問い合わせ】${category} - ${name}様`,
        text: `お名前: ${name}\nメールアドレス: ${email}\n種別: ${category}\n\n${message}`
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(errText || 'メール送信に失敗しました');
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
