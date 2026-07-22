/* Origin Medaka — shared front-end behaviour (static demo, no backend) */
(function () {
  const BASE = window.OM_BASE || '';
  const CART_KEY = 'om_cart';
  const FAV_KEY = 'om_favorites';

  const store = {
    get(key) {
      try { return JSON.parse(localStorage.getItem(key)) || []; }
      catch (e) { return []; }
    },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  };

  function getProduct(id) {
    return (window.PRODUCTS || []).find(p => p.id === id);
  }

  function formatPrice(n) { return '¥' + n.toLocaleString(); }

  /* ---------------- toast ---------------- */
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ---------------- cart / favorites ---------------- */
  function cartCount() {
    return store.get(CART_KEY).reduce((sum, i) => sum + i.qty, 0);
  }
  function addToCart(id) {
    const cart = store.get(CART_KEY);
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty += 1; else cart.push({ id, qty: 1 });
    store.set(CART_KEY, cart);
    updateBadges();
    toast('カートに追加しました');
  }
  function removeFromCart(id) {
    store.set(CART_KEY, store.get(CART_KEY).filter(i => i.id !== id));
    updateBadges();
  }
  function setCartQty(id, qty) {
    const cart = store.get(CART_KEY);
    const item = cart.find(i => i.id === id);
    if (!item) return;
    if (qty <= 0) { removeFromCart(id); return; }
    item.qty = Math.min(99, qty);
    store.set(CART_KEY, cart);
    updateBadges();
  }
  function toggleFavorite(id) {
    const favs = store.get(FAV_KEY);
    const idx = favs.indexOf(id);
    if (idx >= 0) { favs.splice(idx, 1); toast('お気に入りから削除しました'); }
    else { favs.push(id); toast('お気に入りに追加しました'); }
    store.set(FAV_KEY, favs);
    updateBadges();
    return favs.includes(id);
  }
  function isFavorite(id) { return store.get(FAV_KEY).includes(id); }
  function isInCart(id) { return store.get(CART_KEY).some(i => i.id === id); }

  function normalizePath(path) {
    path = path.replace(/\/index\.html$/, '/');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
  }
  function highlightActiveNav() {
    const current = normalizePath(location.pathname);
    document.querySelectorAll('.nav-links a, .mobile-menu nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href.includes('#')) return;
      if (normalizePath(a.pathname) === current) a.classList.add('nav-active');
    });
  }

  function updateBadges() {
    document.querySelectorAll('[data-cart-badge]').forEach(b => {
      const n = cartCount();
      b.textContent = n;
      b.style.display = n > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('[data-fav-badge]').forEach(b => {
      const n = store.get(FAV_KEY).length;
      b.textContent = n;
      b.style.display = n > 0 ? 'flex' : 'none';
    });
  }

  /* ---------------- product card rendering ---------------- */
  function productCardHTML(p) {
    const soldOut = !!p.isSoldOut || p.stock === 0;
    const fav = isFavorite(p.id);
    const inCart = isInCart(p.id);
    let stockNote = '';
    if (!soldOut && p.stock <= 3) {
      stockNote = `<span class="stock-dot"></span>${p.type === 'actual' ? '一点物個体' : `残り${p.stock}点`}`;
    } else if (!soldOut && p.type === 'actual' && p.individualId) {
      stockNote = p.individualId;
    }
    return `<div class="product-card ${soldOut ? 'is-soldout' : ''}" data-product-card="${p.id}" data-goto="${BASE}product/index.html?id=${p.id}">
      <div class="thumb">
        <span class="type-tag">${p.type === 'actual' ? '現物' : 'イメージ'}</span>
        ${p.isNew && !soldOut ? '<span class="new-tag">NEW</span>' : ''}
        <img src="${BASE}${p.image}" alt="${p.name}" loading="lazy">
        ${soldOut ? '<div class="soldout-overlay"><span><span class="line"></span>SOLD OUT<span class="line"></span></span></div>' : ''}
        <button class="card-fav-btn ${fav ? 'active' : ''}" data-fav-btn="${p.id}" aria-label="お気に入り">
          <i class="${fav ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
        </button>
      </div>
      <div class="body">
        <h3>${p.name}</h3>
        <span class="grade-pill">${p.grade || p.rarity}</span>
        <div class="bloodline">${p.bloodline || ''}</div>
        <div class="price-row">
          <span class="price">${formatPrice(p.price)}</span>
          <span class="tax">税込</span>
        </div>
        <div class="stock-note">${stockNote}</div>
        <div class="actions">
          <button class="card-btn ${inCart ? 'active' : ''}" data-add-cart="${p.id}" ${soldOut ? 'disabled' : ''}>
            <i class="${inCart ? 'ri-check-line' : 'ri-shopping-bag-line'}"></i>${inCart ? '追加済' : 'カートへ'}
          </button>
        </div>
      </div>
    </div>`;
  }

  function renderProductGrid(container, products) {
    container.innerHTML = products.map(productCardHTML).join('');
    container.querySelectorAll('[data-product-card]').forEach(card => {
      card.addEventListener('click', () => { location.href = card.dataset.goto; });
    });
    container.querySelectorAll('[data-add-cart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); e.preventDefault();
        addToCart(btn.dataset.addCart);
        btn.classList.add('active');
        btn.innerHTML = '<i class="ri-check-line"></i>追加済';
      });
    });
    container.querySelectorAll('[data-fav-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); e.preventDefault();
        const active = toggleFavorite(btn.dataset.favBtn);
        btn.classList.toggle('active', active);
        btn.querySelector('i').className = active ? 'ri-heart-fill' : 'ri-heart-line';
      });
    });
  }

  /* ---------------- header / mobile menu ---------------- */
  function initHeader() {
    const header = document.querySelector('.site-header');
    const onScroll = () => {
      if (!header) return;
      header.classList.toggle('scrolled', window.scrollY > 50);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const menuBtn = document.querySelector('.menu-btn');
    const menu = document.querySelector('.mobile-menu');
    const menuClose = document.querySelector('.mobile-menu .close-btn');
    const setMenu = (open) => {
      menu?.classList.toggle('open', open);
      menuBtn?.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn?.addEventListener('click', () => setMenu(!menu?.classList.contains('open')));
    menuClose?.addEventListener('click', () => setMenu(false));
    menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  }

  /* ---------------- fade-up on scroll ---------------- */
  function initFadeUp() {
    const els = document.querySelectorAll('.fade-up');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
    }, { threshold: 0.1 });
    els.forEach(e => io.observe(e));
  }

  /* ---------------- filterable product grids ---------------- */
  function initProductGrids() {
    document.querySelectorAll('[data-product-grid]').forEach(grid => {
      const key = grid.dataset.productGrid;
      const filterBar = document.querySelector(`[data-filter-for="${key}"]`);
      const limit = grid.dataset.limit ? parseInt(grid.dataset.limit, 10) : null;
      function apply() {
        let list = window.PRODUCTS || [];
        if (filterBar) {
          const activeBtn = filterBar.querySelector('[data-type-value].active');
          const activeType = activeBtn ? activeBtn.dataset.typeValue : 'all';
          if (activeType !== 'all') list = list.filter(p => p.type === activeType);
          const hideBtn = filterBar.querySelector('[data-hide-soldout]');
          if (hideBtn && hideBtn.classList.contains('active')) list = list.filter(p => !(p.isSoldOut || p.stock === 0));
        }
        if (limit) list = list.slice(0, limit);
        renderProductGrid(grid, list);
      }
      filterBar?.querySelectorAll('[data-type-value]').forEach(btn => {
        btn.addEventListener('click', () => {
          filterBar.querySelectorAll('[data-type-value]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          apply();
        });
      });
      filterBar?.querySelector('[data-hide-soldout]')?.addEventListener('click', function () {
        this.classList.toggle('active');
        apply();
      });
      apply();
    });
  }

  /* ---------------- cart page ---------------- */
  function renderCartPage() {
    const root = document.getElementById('cart-page');
    if (!root) return;
    const cart = store.get(CART_KEY);
    if (!cart.length) {
      root.innerHTML = '<div class="list-empty"><i class="ri-shopping-bag-line"></i>カートに商品がありません</div>';
      return;
    }
    let total = 0;
    let itemCount = 0;
    const rows = cart.map(item => {
      const p = getProduct(item.id);
      if (!p) return '';
      total += p.price * item.qty;
      itemCount += item.qty;
      return `<div class="cart-row">
        <img src="${BASE}${p.image}" alt="${p.name}">
        <div class="info">
          <h4>${p.name}</h4>
          <span class="price">${formatPrice(p.price)}</span>
          <div class="qty-stepper" data-qty-id="${p.id}">
            <button type="button" class="qty-btn" data-qty-dec aria-label="数量を減らす">−</button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" class="qty-btn" data-qty-inc aria-label="数量を増やす">+</button>
          </div>
        </div>
        <button class="remove" data-remove-cart="${p.id}" aria-label="削除"><i class="ri-delete-bin-line"></i></button>
      </div>`;
    }).join('');
    const shipping = itemCount > 0 ? 1500 + (itemCount - 1) * 300 : 0;
    root.innerHTML = `<div class="cart-list">${rows}</div>
      <div class="cart-summary">
        <div class="row"><span>商品小計</span><span>${formatPrice(total)}</span></div>
        <div class="row"><span>送料</span><span>${formatPrice(shipping)}</span></div>
        <div class="row total"><span>合計（税込）</span><span class="total">${formatPrice(total + shipping)}</span></div>
        <button id="checkout-btn" class="btn btn-gold btn-block" style="margin-top:20px;">購入手続きへ進む</button>
        <p class="form-hint" id="checkout-error" style="color:var(--red);"></p>
      </div>`;
    root.querySelectorAll('[data-remove-cart]').forEach(btn => {
      btn.addEventListener('click', () => { removeFromCart(btn.dataset.removeCart); renderCartPage(); });
    });
    root.querySelectorAll('.qty-stepper').forEach(stepper => {
      const id = stepper.dataset.qtyId;
      const current = store.get(CART_KEY).find(i => i.id === id)?.qty || 1;
      stepper.querySelector('[data-qty-dec]').addEventListener('click', () => { setCartQty(id, current - 1); renderCartPage(); });
      stepper.querySelector('[data-qty-inc]').addEventListener('click', () => { setCartQty(id, current + 1); renderCartPage(); });
    });
    document.getElementById('checkout-btn')?.addEventListener('click', startCheckout);
  }

  async function startCheckout() {
    const btn = document.getElementById('checkout-btn');
    const errEl = document.getElementById('checkout-error');
    const cart = store.get(CART_KEY);
    if (!cart.length) return;
    btn.disabled = true;
    btn.textContent = '処理中…';
    if (errEl) errEl.textContent = '';
    try {
      const res = await fetch(`${BASE}api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart })
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || '決済ページの作成に失敗しました');
      location.href = data.url;
    } catch (err) {
      if (errEl) errEl.textContent = err.message;
      btn.disabled = false;
      btn.textContent = '購入手続きへ進む';
    }
  }

  /* ---------------- favorites page ---------------- */
  function renderFavoritesPage() {
    const root = document.getElementById('favorites-page');
    if (!root) return;
    const favs = store.get(FAV_KEY).map(getProduct).filter(Boolean);
    if (!favs.length) {
      root.innerHTML = '<div class="list-empty"><i class="ri-heart-line"></i>お気に入りはまだありません</div>';
      return;
    }
    root.innerHTML = `<div class="product-grid"></div>`;
    renderProductGrid(root.querySelector('.product-grid'), favs);
  }

  /* ---------------- product detail page ---------------- */
  function renderProductDetail() {
    const root = document.getElementById('product-detail');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    const p = getProduct(id);
    if (!p) {
      root.innerHTML = '<div class="list-empty"><i class="ri-error-warning-line"></i>商品が見つかりませんでした</div>';
      return;
    }
    document.title = `${p.name}｜Origin Medaka`;
    const soldOut = !!p.isSoldOut || p.stock === 0;
    const fav = isFavorite(p.id);
    root.innerHTML = `
      <div class="pd-grid">
        <div class="pd-image"><img src="${BASE}${p.image}" alt="${p.name}"></div>
        <div>
          <p class="pd-eyebrow">${p.type === 'actual' ? '現物個体' : 'イメージ個体'} ／ ${p.grade || p.rarity}</p>
          <h1 class="pd-title">${p.name}</h1>
          <p class="pd-en">${p.nameEn || ''}</p>
          <p class="pd-price">${soldOut ? `<s>${formatPrice(p.price)}</s>` : formatPrice(p.price)} <span style="font-size:0.9rem;color:var(--text-3);">税込</span></p>
          <p class="pd-desc">${p.description || ''}</p>
          <div class="pd-actions">
            <button class="btn btn-gold" id="pd-add-cart" ${soldOut ? 'disabled' : ''}>${soldOut ? 'SOLD OUT' : 'カートに追加する'}</button>
            <button class="pd-fav-btn ${fav ? 'active' : ''}" id="pd-fav-btn" aria-label="お気に入り"><i class="${fav ? 'ri-heart-fill' : 'ri-heart-line'}"></i></button>
          </div>
          <dl class="pd-specs">
            ${p.bloodline ? `<dt>血統</dt><dd>${p.bloodline}</dd>` : ''}
            ${p.pairInfo ? `<dt>構成</dt><dd>${p.pairInfo}</dd>` : ''}
            ${p.generationInfo ? `<dt>系統情報</dt><dd>${p.generationInfo.replace(/\n/g, '<br>')}</dd>` : ''}
            ${p.birthMonth ? `<dt>生年月</dt><dd>${p.birthMonth}</dd>` : ''}
            ${p.individualId ? `<dt>個体番号</dt><dd>${p.individualId}</dd>` : ''}
          </dl>
        </div>
      </div>
      ${p.emotionalDescription ? `<div class="pd-block"><h3>この個体について</h3><p>${p.emotionalDescription}</p></div>` : ''}
      ${p.selectionPhilosophy ? `<div class="pd-block"><h3>選別の思想</h3><p>${p.selectionPhilosophy}</p></div>` : ''}
      ${p.careTips ? `<div class="pd-block"><h3>飼育のポイント</h3><p>${p.careTips}</p></div>` : ''}
      ${(p.reviews && p.reviews.length) ? `<div class="pd-block"><h3>お客様の声</h3>${p.reviews.map(r => `<div class="pd-review"><div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div><p>${r.comment}</p><div class="author">${r.author} ・ ${r.date}</div></div>`).join('')}</div>` : ''}
      <div class="center" style="margin-top:56px;">
        <a href="${BASE}collection/index.html" class="btn btn-outline">他の個体を見る</a>
      </div>
    `;
    document.getElementById('pd-add-cart')?.addEventListener('click', () => addToCart(p.id));
    document.getElementById('pd-fav-btn')?.addEventListener('click', function () {
      const active = toggleFavorite(p.id);
      this.classList.toggle('active', active);
      this.querySelector('i').className = active ? 'ri-heart-fill' : 'ri-heart-line';
    });
  }

  /* ---------------- init ---------------- */
  async function loadProducts() {
    try {
      const res = await fetch(`${BASE}api/products`);
      const data = await res.json();
      window.PRODUCTS = data.products || [];
    } catch (e) {
      window.PRODUCTS = window.PRODUCTS || [];
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initHeader();
    initFadeUp();
    highlightActiveNav();
    await loadProducts();
    updateBadges();
    initProductGrids();
    renderCartPage();
    renderFavoritesPage();
    renderProductDetail();
  });

  window.OM = { addToCart, removeFromCart, setCartQty, toggleFavorite, isFavorite, isInCart, renderProductGrid, productCardHTML, formatPrice, toast, store, CART_KEY, FAV_KEY, getProduct, updateBadges };
})();
