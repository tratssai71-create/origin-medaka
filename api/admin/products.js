const { isAuthed } = require('../_lib/auth');
const kv = require('../_lib/kv');
const seed = require('../_data/products-full.json');

const KEY = 'om_products';

async function loadProducts() {
  let products = await kv.get(KEY);
  if (!products) {
    products = seed;
    await kv.set(KEY, products);
  }
  return products;
}

function genId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  if (req.method === 'GET') {
    const products = await loadProducts();
    return res.status(200).json({ products });
  }

  if (req.method === 'POST') {
    const { name, description, price, stock, image } = req.body || {};
    if (!name || price == null || stock == null) {
      return res.status(400).json({ error: '名前・価格・在庫数は必須です' });
    }
    const products = await loadProducts();
    const product = {
      id: genId(),
      name: String(name),
      description: description ? String(description) : '',
      price: Math.max(0, parseInt(price, 10) || 0),
      stock: Math.max(0, parseInt(stock, 10) || 0),
      image: image ? String(image) : '',
      active: true
    };
    products.push(product);
    await kv.set(KEY, products);
    return res.status(200).json({ product });
  }

  if (req.method === 'PUT') {
    const { id, name, description, price, stock, image, active } = req.body || {};
    if (!id) return res.status(400).json({ error: 'idが必要です' });
    const products = await loadProducts();
    const p = products.find(p => p.id === id);
    if (!p) return res.status(404).json({ error: '商品が見つかりません' });
    if (name != null) p.name = String(name);
    if (description != null) p.description = String(description);
    if (price != null) p.price = Math.max(0, parseInt(price, 10) || 0);
    if (stock != null) p.stock = Math.max(0, parseInt(stock, 10) || 0);
    if (image != null) p.image = String(image);
    if (active != null) p.active = !!active;
    await kv.set(KEY, products);
    return res.status(200).json({ product: p });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'idが必要です' });
    const products = await loadProducts();
    const p = products.find(p => p.id === id);
    if (!p) return res.status(404).json({ error: '商品が見つかりません' });
    p.active = false;
    await kv.set(KEY, products);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
