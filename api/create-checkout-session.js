const Stripe = require('stripe');
const products = require('./_data/products.json');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY is not configured' });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ error: 'カートが空です' });
  }

  const productMap = new Map(products.map(p => [p.id, p]));
  const baseUrl = `https://${req.headers.host}`;

  let line_items;
  let totalQty = 0;
  try {
    line_items = items.map(({ id, qty }) => {
      const p = productMap.get(id);
      const quantity = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
      if (!p || !p.active) {
        throw new Error(`商品が見つからないか販売終了です: ${id}`);
      }
      totalQty += quantity;
      return {
        quantity,
        price_data: {
          currency: 'jpy',
          unit_amount: p.price,
          product_data: {
            name: p.name,
            images: [`${baseUrl}/${p.image}`]
          }
        }
      };
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const shippingAmount = 1500 + (totalQty - 1) * 300;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: shippingAmount, currency: 'jpy' },
            display_name: '全国一律送料'
          }
        }
      ],
      success_url: `${baseUrl}/success/index.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel/index.html`
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
