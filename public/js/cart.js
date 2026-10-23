// Varahi Tiffins - Cart & WhatsApp Order Management Engine

const Cart = {
  items: [],
  settings: null,

  init() {
    this.loadFromStorage();
    this.bindEvents();
    this.render();
  },

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('varahi_cart');
      this.items = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.items = [];
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem('varahi_cart', JSON.stringify(this.items));
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  },

  setSettings(settings) {
    this.settings = settings;
    this.render();
  },

  addItem(item) {
    const existing = this.items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        category: item.category || ''
      });
    }
    this.saveToStorage();
    this.render();
    this.openDrawer();
    showToast(`Added ${item.name} to cart!`, 'success');
  },

  updateQuantity(id, delta) {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) return;

    this.items[index].quantity += delta;
    if (this.items[index].quantity <= 0) {
      this.items.splice(index, 1);
    }
    this.saveToStorage();
    this.render();
  },

  clearCart() {
    this.items = [];
    this.saveToStorage();
    this.render();
  },

  getCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  openDrawer() {
    const overlay = document.getElementById('cartDrawerOverlay');
    if (overlay) overlay.classList.add('active');
  },

  closeDrawer() {
    const overlay = document.getElementById('cartDrawerOverlay');
    if (overlay) overlay.classList.remove('active');
  },

  bindEvents() {
    // Open cart drawer triggers
    const cartTriggers = document.querySelectorAll('.js-open-cart');
    cartTriggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openDrawer();
      });
    });

    // Close cart drawer triggers
    const closeTriggers = document.querySelectorAll('.js-close-cart');
    closeTriggers.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeDrawer();
      });
    });

    // Order Type toggle (Pickup vs Delivery)
    const typeButtons = document.querySelectorAll('.order-type-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        typeButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const isDelivery = e.currentTarget.dataset.type === 'delivery';
        const addressGroup = document.getElementById('deliveryAddressGroup');
        if (addressGroup) {
          addressGroup.style.display = isDelivery ? 'block' : 'none';
        }
        this.renderTotals();
      });
    });

    // WhatsApp Order Button
    const btnWhatsApp = document.getElementById('btnOrderWhatsApp');
    if (btnWhatsApp) {
      btnWhatsApp.addEventListener('click', () => this.handleWhatsAppOrder());
    }

    // Call Button from Cart
    const btnCallCart = document.getElementById('btnCallFromCart');
    if (btnCallCart) {
      btnCallCart.addEventListener('click', () => {
        if (!this.settings || !this.settings.phone) return;
        const cleanPhone = this.settings.phone.replace(/[^0-9+]/g, '');
        window.location.href = `tel:${cleanPhone}`;
      });
    }
  },

  renderTotals() {
    const subtotal = this.getSubtotal();
    const typeBtn = document.querySelector('.order-type-btn.active');
    const isDelivery = typeBtn && typeBtn.dataset.type === 'delivery';

    const deliveryFee = isDelivery ? (this.settings ? this.settings.deliveryFee : 30) : 0;
    const packagingFee = this.items.length > 0 ? (this.settings ? this.settings.packagingFee : 15) : 0;
    const taxRate = this.settings ? this.settings.taxPercentage : 5;
    const tax = Math.round((subtotal * taxRate) / 100);
    const grandTotal = subtotal + deliveryFee + packagingFee + tax;

    // Update labels in Cart UI
    const subtotalEl = document.getElementById('cartSubtotal');
    const deliveryEl = document.getElementById('cartDeliveryFee');
    const packagingEl = document.getElementById('cartPackagingFee');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartGrandTotal');
    const btnWhatsApp = document.getElementById('btnOrderWhatsApp');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
    if (deliveryEl) deliveryEl.textContent = isDelivery ? `₹${deliveryFee}` : 'FREE';
    if (packagingEl) packagingEl.textContent = `₹${packagingFee}`;
    if (taxEl) taxEl.textContent = `₹${tax}`;
    if (totalEl) totalEl.textContent = `₹${grandTotal}`;

    if (btnWhatsApp) {
      btnWhatsApp.disabled = this.items.length === 0;
    }

    return { subtotal, deliveryFee, packagingFee, tax, grandTotal, isDelivery };
  },

  render() {
    // Update badge counts
    const count = this.getCount();
    const countBadges = document.querySelectorAll('.js-cart-count');
    countBadges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });

    // Render items list
    const container = document.getElementById('cartItemsList');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty-message">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🍽️</div>
          <p style="font-weight: 700; margin-bottom: 4px;">Your cart is empty</p>
          <p style="font-size: 0.85rem;">Explore our delicious South Indian tiffins and add your favorites!</p>
        </div>
      `;
      this.renderTotals();
      return;
    }

    container.innerHTML = this.items.map(item => `
      <div class="cart-item-row" data-id="${item.id}">
        <div class="cart-item-details">
          <div class="name">${escapeHtml(item.name)}</div>
          <div class="price">₹${item.price} each &bull; <strong>₹${item.price * item.quantity}</strong></div>
        </div>
        <div class="qty-stepper">
          <button class="btn-qty" onclick="Cart.updateQuantity('${item.id}', -1)">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="btn-qty" onclick="Cart.updateQuantity('${item.id}', 1)">+</button>
        </div>
      </div>
    `).join('');

    this.renderTotals();
  },

  async handleWhatsAppOrder() {
    if (this.items.length === 0) {
      showToast('Your cart is empty. Please add items to proceed.', 'error');
      return;
    }

    const nameInput = document.getElementById('orderCustomerName');
    const phoneInput = document.getElementById('orderCustomerPhone');
    const addressInput = document.getElementById('orderDeliveryAddress');
    const notesInput = document.getElementById('orderSpecialInstructions');

    const customerName = nameInput ? nameInput.value.trim() : '';
    const customerPhone = phoneInput ? phoneInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';

    const typeBtn = document.querySelector('.order-type-btn.active');
    const isDelivery = typeBtn && typeBtn.dataset.type === 'delivery';
    const deliveryAddress = isDelivery && addressInput ? addressInput.value.trim() : '';

    if (!customerName) {
      showToast('Please enter your name for the order.', 'error');
      if (nameInput) nameInput.focus();
      return;
    }

    if (isDelivery && !deliveryAddress) {
      showToast('Please enter your delivery address in Hyderabad / Kothapet.', 'error');
      if (addressInput) addressInput.focus();
      return;
    }

    const { subtotal, deliveryFee, packagingFee, tax, grandTotal } = this.renderTotals();

    // First, record the order in website database with status: Awaiting WhatsApp Confirmation
    let orderId = `VT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          orderType: isDelivery ? 'delivery' : 'pickup',
          deliveryAddress,
          items: this.items,
          specialInstructions: notes,
          channel: 'whatsapp'
        })
      });
      const data = await response.json();
      if (data.order && data.order.id) {
        orderId = data.order.id;
      }
    } catch (err) {
      console.warn('Backend order recording note:', err);
    }

    // Build the properly structured and URL-encoded WhatsApp message
    const restaurantName = this.settings ? this.settings.restaurantName : 'Varahi Tiffins';
    const destinationNumber = this.settings ? (this.settings.whatsapp || '919494500646') : '919494500646';

    let message = `*Namaste! New Order for ${restaurantName}*\n`;
    message += `*Order Reference:* #${orderId}\n`;
    message += `------------------------------------\n`;
    message += `*Customer:* ${customerName}\n`;
    if (customerPhone) message += `*Contact:* ${customerPhone}\n`;
    message += `*Order Preference:* ${isDelivery ? '🛵 Home Delivery' : '🛍️ Takeaway / Pickup'}\n`;
    if (isDelivery && deliveryAddress) {
      message += `*Delivery Address:* ${deliveryAddress}\n`;
    }
    message += `------------------------------------\n`;
    message += `*ITEMS ORDERED:*\n`;

    this.items.forEach((item, idx) => {
      message += `${idx + 1}. ${item.name} x ${item.quantity} = ₹${item.price * item.quantity}\n`;
    });

    message += `------------------------------------\n`;
    message += `*Subtotal:* ₹${subtotal}\n`;
    if (isDelivery) message += `*Delivery Fee:* ₹${deliveryFee}\n`;
    message += `*Packaging:* ₹${packagingFee}\n`;
    message += `*GST (5%):* ₹${tax}\n`;
    message += `*GRAND TOTAL:* ₹${grandTotal}\n`;
    message += `------------------------------------\n`;

    if (notes) {
      message += `*Special Instructions:* ${notes}\n`;
    }

    message += `\n_Please confirm availability, estimated preparation time, and acceptance of this order._`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${destinationNumber}?text=${encodedText}`;

    // Show friendly clarification modal / message
    showWhatsAppConfirmationModal(whatsappUrl, orderId);
  }
};

function showWhatsAppConfirmationModal(url, orderId) {
  const modalHtml = `
    <div class="modal-overlay active" id="waOrderModal">
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header">
          <h3>Order Prepared (#${orderId})</h3>
          <button class="btn-close-drawer" onclick="document.getElementById('waOrderModal').remove()">&times;</button>
        </div>
        <div class="modal-body" style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 12px; color: #25D366;">💬</div>
          <h4 style="font-family: var(--font-heading); font-size: 1.2rem; margin-bottom: 8px;">Review & Send on WhatsApp</h4>
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 18px;">
            We have prefilled your complete order message. Tapping the button below will open WhatsApp. 
            <strong style="color: var(--text-main); display: block; margin-top: 6px;">
              Please review the message and press 'Send' to submit your order to Varahi Tiffins.
            </strong>
          </p>
          <div style="background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; padding: 10px 14px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 20px; text-align: left;">
            ℹ️ <strong>Note:</strong> Opening WhatsApp does not confirm order payment or acceptance. Our counter team will acknowledge and confirm your order on WhatsApp.
          </div>
          <a href="${url}" target="_blank" class="btn-primary" style="background: #25D366; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 14px; font-size: 1rem;" onclick="handleWhatsAppModalProceed()">
            Open WhatsApp to Send Order &rarr;
          </a>
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById('waOrderModal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function handleWhatsAppModalProceed() {
  const modal = document.getElementById('waOrderModal');
  if (modal) modal.remove();
  Cart.clearCart();
  Cart.closeDrawer();
  showToast('Order saved! Please tap Send in WhatsApp to complete.', 'success');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Global Toast Helper
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
