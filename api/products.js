const kv = require('./_lib/kv');
const seed = require('./_data/products-full.json');

const KEY = 'om_products';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let products = await kv.get(KEY);
  if (!products) {
    products = seed;
    await kv.set(KEY, products);
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ products: products.filter(p => p.active !== false) });
};
