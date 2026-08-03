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

function formatDateJP(unixSeconds) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(unixSeconds * 1000));
}

function paymentMethodLabel(types) {
  const map = { card: 'クレジットカード', konbini: 'コンビニ払い', customer_balance: '銀行振込', paypay: 'PayPay' };
  if (!types || !types.length) return 'クレジットカード';
  return types.map((t) => map[t] || t).join('・');
}

async function notifyOrder(stripe, session) {
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
  const itemsText = lineItems.data
    .map((li) => `・${li.description} × ${li.quantity} — ${formatYen(li.amount_total)}`)
    .join('\n');
  const itemsBlock = lineItems.data
    .map((li) => `商品名：${li.description}\n数量：${li.quantity}\n商品金額：${formatYen(li.amount_total)}`)
    .join('\n\n');

  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || 'お客様';
  const address = formatAddress(session.customer_details);
  const addressObj = session.customer_details?.address || {};
  const phone = session.customer_details?.phone || '(未登録)';
  const total = formatYen(session.amount_total);
  const shipping = formatYen(session.total_details?.amount_shipping || 0);
  const orderNumber = session.id;
  const orderDate = formatDateJP(session.created);
  const paymentMethod = paymentMethodLabel(session.payment_method_types);

  if (customerEmail) {
    const addressLine = [addressObj.state, addressObj.city, addressObj.line1, addressObj.line2].filter(Boolean).join('');
    const text = `${customerName}様

この度は、Origin Medakaをご利用いただき、誠にありがとうございます。

下記の内容でご注文を承りました。

━━━━━━━━━━━━━━━━━━
ご注文内容
━━━━━━━━━━━━━━━━━━

ご注文番号：${orderNumber}
ご注文日時：${orderDate}

${itemsBlock}

送料：${shipping}
お支払い合計：${total}

お支払い方法：${paymentMethod}

━━━━━━━━━━━━━━━━━━
お届け先
━━━━━━━━━━━━━━━━━━

〒${addressObj.postal_code || ''}
${addressLine}
${customerName} 様
電話番号：${phone}

━━━━━━━━━━━━━━━━━━

ご注文いただいた個体は、状態を丁寧に確認したうえで、発送準備を進めてまいります。

お届けに関するご希望の日時がございましたら、お気軽にご連絡ください。

可能な限りお客様のご都合に合わせて発送いたしますが、個体の状態や配送上の都合により、すべてのご希望に沿えない場合がございます。あらかじめご了承ください。

また、生体という商品の特性上、個体の状態や天候、配送環境などを考慮し、発送日についてご相談させていただく場合がございます。

発送が完了しましたら、追跡番号とあわせて改めてご連絡いたします。

ご不明な点やご希望がございましたら、お気軽にお問い合わせください。

この度は、数ある販売店の中からOrigin Medakaをお選びいただき、誠にありがとうございました。

━━━━━━━━━━━━━━━━━━
Origin Medaka

Web：https://www.originmedaka.com
Instagram：@origin_medaka
━━━━━━━━━━━━━━━━━━

※本メールは、ご注文完了後に自動送信されています。
※お心当たりのない場合は、お手数ですがお問い合わせください。`;

    await sendEmail({
      to: customerEmail,
      subject: 'ご注文ありがとうございます｜Origin Medaka',
      text
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
