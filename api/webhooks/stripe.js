const Stripe = require('stripe');

module.exports.config = {
  api: {
    bodyParser: false
  }
};

const OWNER_EMAIL = 'kaito.seino1230@gmail.com';
const FROM_ADDRESS = 'Origin Medaka <onboarding@resend.dev>';

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function sendEmail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, text })
  });
}

function formatYen(amount) {
  return `¥${(amount || 0).toLocaleString('ja-JP')}`;
}

function formatAddress(details) {
  if (!details || !details.address) return '(住所情報なし)';
  const a = details.address;
  return [a.postal_code, a.state, a.city, a.line1, a.line2].filter(Boolean).join(' ');
}

async function notifyOrder(stripe, session) {
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
  const itemsText = lineItems.data
    .map((li) => `・${li.description} × ${li.quantity} — ${formatYen(li.amount_total)}`)
    .join('\n');

  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || 'お客様';
  const address = formatAddress(session.customer_details);
  const phone = session.customer_details?.phone || '(未登録)';
  const total = formatYen(session.amount_total);

  if (customerEmail) {
    await sendEmail({
      to: customerEmail,
      subject: 'ご注文ありがとうございます｜Origin Medaka',
      text: `${customerName}様\n\nこの度はOrigin Medakaにてご注文いただき、誠にありがとうございます。\n以下の内容でご注文を承りました。\n\n${itemsText}\n\n合計金額（送料込）: ${total}\n\nお届け先: ${address}\n\n発送準備が整い次第、あらためてご連絡いたします。\nご不明な点がございましたら、当メール、公式LINE、Instagramよりお気軽にお問い合わせください。\n\nOrigin Medaka\nhttps://www.originmedaka.com/`
    });
  }

  await sendEmail({
    to: OWNER_EMAIL,
    subject: `【新規注文】${total} - ${customerName}様`,
    text: `新しい注文が入りました。\n\n注文者: ${customerName}\nメール: ${customerEmail || '(未取得)'}\n電話番号: ${phone}\nお届け先: ${address}\n\n${itemsText}\n\n合計金額（送料込）: ${total}\n\nStripeダッシュボードで詳細を確認してください。`
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Stripe webhook is not configured' });
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await notifyOrder(stripe, event.data.object);
    }
  } catch (err) {
    console.error('Failed to process webhook event', err);
  }

  return res.status(200).json({ received: true });
};
