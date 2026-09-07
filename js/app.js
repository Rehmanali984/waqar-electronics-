// Waqar Electronics - Main Application Controller

const STORE_KEY_CART = 'waqar_cart_items_v2';
const STORE_KEY_WISHLIST = 'waqar_wishlist_items_v2';
const STORE_KEY_COMPARE = 'waqar_compare_items_v2';

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

const App = {
  cart: [],
  wishlist: [],
  compare: [],

  init() {
    this.loadState();
    this.updateCounters();
    this.bindGlobalEvents();
    this.setupLiveSearch();
    this.setupShowroomLocation();
  },

  setupShowroomLocation() {
    const showroomAddress = 'G113/11 Area Malir, Tauseef Colony, Karachi, Pakistan';
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(showroomAddress)}`;

    document.querySelectorAll('footer div').forEach(addressRow => {
      const address = addressRow.querySelector('span:last-child');
      if (address?.textContent.trim() !== showroomAddress || addressRow.querySelector('a')) return;

      const mapLink = document.createElement('a');
      mapLink.href = mapUrl;
      mapLink.target = '_blank';
      mapLink.rel = 'noopener noreferrer';
      mapLink.className = addressRow.className + ' hover:text-secondary-fixed transition-colors';
      mapLink.setAttribute('aria-label', 'Open Waqar Electronics showroom location in Google Maps');
      mapLink.innerHTML = addressRow.innerHTML;
      addressRow.replaceWith(mapLink);
    });
  },

  loadState() {
    try {
      this.cart = JSON.parse(localStorage.getItem(STORE_KEY_CART)) || [];
      this.wishlist = JSON.parse(localStorage.getItem(STORE_KEY_WISHLIST)) || [];
      this.compare = JSON.parse(localStorage.getItem(STORE_KEY_COMPARE)) || [];
    } catch (e) {
      this.cart = [];
      this.wishlist = [];
      this.compare = [];
    }
  },

  saveState() {
    localStorage.setItem(STORE_KEY_CART, JSON.stringify(this.cart));
    localStorage.setItem(STORE_KEY_WISHLIST, JSON.stringify(this.wishlist));
    localStorage.setItem(STORE_KEY_COMPARE, JSON.stringify(this.compare));
    this.updateCounters();
  },

  updateCounters() {
    const totalCartCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.querySelectorAll('.cart-count-badge').forEach(el => el.textContent = totalCartCount);
    document.querySelectorAll('.cart-total-text').forEach(el => el.textContent = formatPKR(cartTotalAmount));
    document.querySelectorAll('.wishlist-count-badge').forEach(el => el.textContent = this.wishlist.length);
    document.querySelectorAll('.compare-count-badge').forEach(el => el.textContent = this.compare.length);
  },

  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast bg-primary-container text-on-primary border-l-4 border-secondary px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-sm font-medium';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-secondary text-[22px]">${type === 'success' ? 'check_circle' : 'info'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 20);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  addToCart(productId, qty = 1) {
    const prod = ALL_PRODUCTS.find(p => p.id === Number(productId));
    if (!prod) return;

    const existing = this.cart.find(item => item.id === prod.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.cart.push({
        id: prod.id,
        title: prod.title,
        brand: prod.brand,
        price: prod.price,
        image: prod.image || '',
        icon: prod.icon || 'inventory_2',
        quantity: qty
      });
    }

    this.saveState();
    this.showToast(`Added <strong>${prod.brand}</strong> to cart!`);
    this.renderCartDrawer();
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.id !== Number(productId));
    this.saveState();
    this.renderCartDrawer();
    this.showToast('Item removed from cart', 'info');
  },

  updateCartQty(productId, delta) {
    const item = this.cart.find(i => i.id === Number(productId));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(productId);
    } else {
      this.saveState();
      this.renderCartDrawer();
    }
  },

  toggleWishlist(productId) {
    const id = Number(productId);
    const prod = ALL_PRODUCTS.find(p => p.id === id);
    if (!prod) return;

    const idx = this.wishlist.indexOf(id);
    if (idx > -1) {
      this.wishlist.splice(idx, 1);
      this.showToast(`Removed from Wishlist`, 'info');
    } else {
      this.wishlist.push(id);
      this.showToast(`Added to Wishlist!`);
    }
    this.saveState();
  },

  toggleCompare(productId) {
    const id = Number(productId);
    const idx = this.compare.indexOf(id);
    if (idx > -1) {
      this.compare.splice(idx, 1);
      this.showToast(`Removed from comparison`, 'info');
    } else {
      if (this.compare.length >= 4) {
        this.showToast(`You can compare up to 4 products at a time`, 'info');
        return;
      }
      this.compare.push(id);
      this.showToast(`Added to comparison list!`);
    }
    this.saveState();
  },

  openCartDrawer() {
    this.renderCartDrawer();
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer && backdrop) {
      backdrop.classList.remove('hidden');
      setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        drawer.classList.remove('translate-x-full');
      }, 10);
    }
  },

  closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('translate-x-full');
      backdrop.classList.add('opacity-0');
      setTimeout(() => backdrop.classList.add('hidden'), 300);
    }
  },

  renderCartDrawer() {
    const listEl = document.getElementById('cart-drawer-items');
    const subtotalEl = document.getElementById('cart-drawer-subtotal');
    const emptyEl = document.getElementById('cart-drawer-empty');
    const footerEl = document.getElementById('cart-drawer-footer');

    if (!listEl) return;

    const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotalEl) subtotalEl.textContent = formatPKR(total);

    if (this.cart.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (footerEl) footerEl.classList.add('hidden');
      listEl.innerHTML = '';
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    if (footerEl) footerEl.classList.remove('hidden');

    listEl.innerHTML = this.cart.map(item => `
      <div class="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
        <div class="w-16 h-16 bg-surface-container-lowest rounded-lg flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
          ${item.image ? `<img src="${item.image}" alt="${item.title}" class="w-full h-full object-contain">` : `<span class="material-symbols-outlined text-secondary text-[28px]">${item.icon}</span>`}
        </div>
        <div class="flex-1 min-w-0">
          <span class="text-[11px] font-bold text-secondary uppercase">${item.brand}</span>
          <h4 class="font-headline-sm text-xs font-bold text-on-surface line-clamp-1">${item.title}</h4>
          <span class="font-price-md text-sm font-extrabold text-on-surface">${formatPKR(item.price)}</span>
          <div class="flex items-center gap-2 mt-1">
            <button onclick="App.updateCartQty(${item.id}, -1)" class="w-6 h-6 rounded bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-bold text-xs">-</button>
            <span class="font-bold text-xs px-1">${item.quantity}</span>
            <button onclick="App.updateCartQty(${item.id}, 1)" class="w-6 h-6 rounded bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-bold text-xs">+</button>
          </div>
        </div>
        <button onclick="App.removeFromCart(${item.id})" class="p-2 text-on-surface-variant hover:text-error transition-colors" title="Remove">
          <span class="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>
    `).join('');
  },

  checkoutViaWhatsApp() {
    if (this.cart.length === 0) {
      this.showToast('Your cart is empty', 'info');
      return;
    }

    let text = `Salam Waqar Electronics! I want to order the following appliances from Karachi Showroom:\n\n`;
    let subtotal = 0;
    this.cart.forEach((item, i) => {
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      text += `${i + 1}. *${item.title}*\n   Qty: ${item.quantity} x ${formatPKR(item.price)} = ${formatPKR(lineTotal)}\n\n`;
    });
    text += `*Total Order Value: ${formatPKR(subtotal)}*\n`;
    text += `*Payment Preference:* Cash on Delivery / Direct Bank Transfer\n`;
    text += `*Delivery Location:* Karachi / Nationwide Shipping\n\nPlease confirm availability and delivery dispatch timeline.`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/923008983094?text=${encoded}`, '_blank');
  },

  openBankCheckoutModal() {
    if (this.cart.length === 0) {
      this.showToast('Your cart is empty', 'info');
      return;
    }
    const modal = document.getElementById('bank-checkout-modal');
    if (modal) {
      const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDisplay = document.getElementById('bank-modal-total');
      if (totalDisplay) totalDisplay.textContent = formatPKR(total);
      modal.classList.remove('hidden');
    }
  },

  closeBankCheckoutModal() {
    const modal = document.getElementById('bank-checkout-modal');
    if (modal) modal.classList.add('hidden');
  },

  openQuickView(productId) {
    const prod = ALL_PRODUCTS.find(p => p.id === Number(productId));
    if (!prod) return;

    const modal = document.getElementById('quick-view-modal');
    const container = document.getElementById('quick-view-content');
    if (!modal || !container) return;

    const saveBadge = prod.was_price ? `<span class="bg-secondary text-on-secondary px-2.5 py-0.5 rounded text-xs font-bold uppercase">SAVE ${formatPKR(prod.was_price - prod.price)}</span>` : '';
    const wasPrice = prod.was_price ? `<span class="text-on-surface-variant line-through text-sm">${formatPKR(prod.was_price)}</span>` : '';

    let specsHtml = '';
    if (prod.specs) {
      specsHtml = Object.entries(prod.specs).map(([k, v]) => `
        <div class="flex justify-between py-1 border-b border-surface-container text-xs">
          <span class="text-on-surface-variant">${k}</span>
          <span class="font-bold text-on-surface">${v}</span>
        </div>
      `).join('');
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div class="bg-surface-container-low rounded-2xl p-6 flex flex-col items-center justify-center relative">
          ${saveBadge ? `<div class="absolute top-3 left-3">${saveBadge}</div>` : ''}
          <div class="w-full h-64 flex items-center justify-center">
            ${prod.image ? `<img src="${prod.image}" alt="${prod.title}" class="max-h-full max-w-full object-contain">` : `<span class="material-symbols-outlined text-secondary" style="font-size:100px">${prod.icon || 'inventory_2'}</span>`}
          </div>
          <div class="mt-4 flex items-center gap-1.5 text-xs text-on-tertiary-container font-bold bg-tertiary-fixed/30 px-3 py-1 rounded-full">
            <span class="material-symbols-outlined text-[16px]">verified</span> ${prod.warranty || 'Official Manufacturer Warranty'}
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="bg-surface-container text-secondary font-bold text-xs px-2.5 py-1 rounded">${prod.brand}</span>
            <div class="flex items-center gap-1 text-secondary font-bold text-xs">
              <span class="material-symbols-outlined text-[16px]">star</span> ${prod.rating} (${prod.reviews} reviews)
            </div>
          </div>
          <h2 class="font-headline-md text-xl font-bold text-on-surface">${prod.title}</h2>
          <div class="flex items-baseline gap-3 my-1">
            <span class="font-price-xl text-2xl font-extrabold text-on-surface">${formatPKR(prod.price)}</span>
            ${wasPrice}
          </div>
          <div class="bg-surface-container-low p-3 rounded-xl flex items-center justify-between text-xs font-medium">
            <span class="text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-secondary text-[18px]">credit_card</span> 0% EMI Installments:</span>
            <span class="font-bold text-on-surface">${formatPKR(prod.emi)}/month</span>
          </div>
          <div class="mt-2">
            <span class="font-label-sm text-xs font-bold text-on-surface uppercase block mb-1">Key Specifications</span>
            <div class="flex flex-col">${specsHtml}</div>
          </div>
          <div class="flex gap-3 pt-3">
            <button onclick="App.addToCart(${prod.id}); App.closeQuickView();" class="flex-1 bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all">
              <span class="material-symbols-outlined text-[18px]">shopping_cart</span> Add to Cart
            </button>
            <a href="https://wa.me/923008983094?text=Salam,%20I%20am%20interested%20in%20buying%20${encodeURIComponent(prod.title)}%20for%20${formatPKR(prod.price)}" target="_blank" rel="noopener noreferrer" class="bg-on-tertiary-container hover:brightness-110 text-on-tertiary px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition-all">
              <span class="material-symbols-outlined text-[18px]">chat</span> WhatsApp
            </a>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  },

  closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) modal.classList.add('hidden');
  },

  setupLiveSearch() {
    const searchInputs = document.querySelectorAll('.global-search-input');
    searchInputs.forEach(input => {
      const dropdown = input.closest('.search-container')?.querySelector('.search-results-dropdown');
      if (!dropdown) return;

      input.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 2) {
          dropdown.classList.add('hidden');
          dropdown.innerHTML = '';
          return;
        }

        const matches = ALL_PRODUCTS.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.brand.toLowerCase().includes(query) ||
          (p.model && p.model.toLowerCase().includes(query)) ||
          p.category.toLowerCase().includes(query)
        ).slice(0, 6);

        if (matches.length === 0) {
          dropdown.innerHTML = `<div class="p-3 text-xs text-on-surface-variant text-center">No products found matching "${escapeHTML(query)}"</div>`;
        } else {
          dropdown.innerHTML = matches.map(m => `
            <a href="category.html?cat=${m.category}" class="flex items-center gap-3 p-2.5 hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0">
              <div class="w-10 h-10 bg-surface-container rounded flex items-center justify-center shrink-0">
                ${m.image ? `<img src="${m.image}" alt="${m.title}" class="w-full h-full object-contain p-1">` : `<span class="material-symbols-outlined text-secondary text-[20px]">${m.icon || 'inventory_2'}</span>`}
              </div>
              <div class="flex-1 min-w-0 text-left">
                <span class="text-[10px] font-bold text-secondary uppercase">${m.brand}</span>
                <h5 class="text-xs font-bold text-on-surface truncate">${m.title}</h5>
                <span class="text-xs font-extrabold text-on-surface">${formatPKR(m.price)}</span>
              </div>
            </a>
          `).join('');
        }
        dropdown.classList.remove('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!input.closest('.search-container')?.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    });
  },

  bindGlobalEvents() {
    // Open cart drawer buttons
    document.querySelectorAll('.open-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openCartDrawer();
      });
    });

    // Close buttons
    const cartBackdrop = document.getElementById('cart-backdrop');
    if (cartBackdrop) {
      cartBackdrop.addEventListener('click', () => this.closeCartDrawer());
    }
    const cartCloseBtn = document.getElementById('close-cart-btn');
    if (cartCloseBtn) {
      cartCloseBtn.addEventListener('click', () => this.closeCartDrawer());
    }

    // Quick view modal backdrop
    const qvModal = document.getElementById('quick-view-modal');
    if (qvModal) {
      qvModal.addEventListener('click', (e) => {
        if (e.target === qvModal) this.closeQuickView();
      });
    }

    // Bank checkout modal backdrop
    const bankModal = document.getElementById('bank-checkout-modal');
    if (bankModal) {
      bankModal.addEventListener('click', (e) => {
        if (e.target === bankModal) this.closeBankCheckoutModal();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
