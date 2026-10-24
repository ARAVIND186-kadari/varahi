// Varahi Tiffins - Main Application Controller

const App = {
  settings: null,
  menu: [],
  activeCategory: 'all',

  async init() {
    await this.loadSettings();
    await this.loadMenu();
    Cart.init();
    Feedback.init();
    this.bindEvents();
  },

  async loadSettings() {
    try {
      const res = await fetch('/api/settings');
      this.settings = await res.json();
      Cart.setSettings(this.settings);
      this.applySettingsToUI();
    } catch (err) {
      console.error('Failed to load restaurant settings:', err);
    }
  },

  applySettingsToUI() {
    if (!this.settings) return;

    const {
      restaurantName,
      category,
      address,
      googleMapsUrl,
      phone,
      whatsapp,
      openingHours,
      statusNote
    } = this.settings;

    // Restaurant names
    document.querySelectorAll('.js-restaurant-name').forEach(el => {
      el.textContent = restaurantName || 'Varahi Tiffins';
    });

    // Restaurant category
    document.querySelectorAll('.js-restaurant-category').forEach(el => {
      el.textContent = category || 'South Indian vegetarian restaurant';
    });

    // Clean phone number for tel: link
    const cleanPhone = (phone || '+91 94945 00646').replace(/[^0-9+]/g, '');

    // Phone buttons (Call to Order)
    document.querySelectorAll('.js-call-btn').forEach(btn => {
      btn.href = `tel:${cleanPhone}`;
      btn.title = `Call Varahi Tiffins: ${phone}`;
    });

    // Phone text labels
    document.querySelectorAll('.js-phone-text').forEach(el => {
      el.textContent = phone || '+91 94945 00646';
    });

    // WhatsApp buttons & links
    const cleanWhatsApp = (whatsapp || '919494500646').replace(/\D/g, '');
    document.querySelectorAll('.js-whatsapp-link').forEach(btn => {
      btn.href = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent("Namaste! I would like to inquire about Varahi Tiffins menu and orders.")}`;
    });
    document.querySelectorAll('.js-whatsapp-text').forEach(el => {
      el.textContent = cleanWhatsApp;
    });

    // Google Maps Get Directions buttons & links
    const mapsLink = googleMapsUrl || 'https://maps.app.goo.gl/NxjV16Pa4WxCKj158?g_st=ac';
    document.querySelectorAll('.js-directions-link').forEach(btn => {
      btn.href = mapsLink;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
    });

    // Address text
    document.querySelectorAll('.js-address-text').forEach(el => {
      el.textContent = address || 'Plot No. 265, Vasavi Colony Road, beside TNR Apartment, Kothapet, Hyderabad, Telangana 500102, India.';
    });

    // Opening Hours text
    document.querySelectorAll('.js-opening-hours').forEach(el => {
      el.textContent = openingHours || '7:00 AM–12:00 PM and 6:00 PM–10:00 PM daily';
    });

    // Status / Owner confirmation notice
    const noticeEl = document.getElementById('ownerNoticeText');
    if (noticeEl && statusNote) {
      noticeEl.textContent = statusNote;
    }
  },

  async loadMenu() {
    try {
      const res = await fetch('/api/menu');
      this.menu = await res.json();
      this.renderMenu();
    } catch (err) {
      console.error('Failed to load menu items:', err);
    }
  },

  bindEvents() {
    // Menu Category filter buttons
    const filterButtons = document.querySelectorAll('.js-category-filter');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.activeCategory = e.currentTarget.dataset.category;
        this.renderMenu();
      });
    });

    // Mobile navigation drawer toggle
    const mobileNavToggle = document.getElementById('btnMobileNavToggle');
    const mobileNavDrawer = document.getElementById('mobileNavDrawer');
    const closeMobileNav = document.getElementById('btnCloseMobileNav');
    const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');

    const openNav = () => {
      if (mobileNavDrawer) {
        mobileNavDrawer.classList.add('open');
        mobileNavDrawer.setAttribute('aria-hidden', 'false');
        if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      }
    };

    const closeNav = () => {
      if (mobileNavDrawer) {
        mobileNavDrawer.classList.remove('open');
        mobileNavDrawer.setAttribute('aria-hidden', 'true');
        if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    };

    if (mobileNavToggle) mobileNavToggle.addEventListener('click', openNav);
    if (closeMobileNav) closeMobileNav.addEventListener('click', closeNav);
    if (mobileNavBackdrop) mobileNavBackdrop.addEventListener('click', closeNav);

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        closeNav();
      });
    });

    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId && targetId !== '#') {
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  },

  renderMenu() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    let items = this.menu;
    if (this.activeCategory !== 'all') {
      items = items.filter(item => item.category === this.activeCategory);
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          No menu items found in this category.
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(item => {
      const isOutOfStock = !item.inStock || (item.stockQuantity !== undefined && item.stockQuantity <= 0);
      return `
        <div class="dish-card" data-id="${item.id}">
          <div class="dish-card-header">
            <div>
              <div class="dish-badges">
                <span class="veg-badge" title="100% Pure Vegetarian"></span>
                ${item.isSpecial ? '<span class="special-badge">★ Chef’s Special</span>' : ''}
                <span class="spice-tag">${escapeHtml(item.spiceLevel || 'Mild')}</span>
              </div>
              <h3 class="dish-title">${escapeHtml(item.name)}</h3>
            </div>
            <div class="dish-price">₹${item.price}</div>
          </div>
          <div class="dish-card-body">
            <p class="dish-desc">${escapeHtml(item.description)}</p>
            <div class="dish-meta">
              <span>⏱ ${escapeHtml(item.prepTime || '5-10 mins')}</span>
              <span class="stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}">
                ● ${isOutOfStock ? 'Sold Out' : (item.stockQuantity < 10 ? `Only ${item.stockQuantity} left` : 'Fresh & Available')}
              </span>
            </div>
          </div>
          <div class="dish-card-footer">
            <button class="btn-add-cart" 
              ${isOutOfStock ? 'disabled' : ''} 
              onclick='Cart.addItem(${JSON.stringify({ id: item.id, name: item.name, price: item.price, category: item.category }).replace(/'/g, "&#39;")})'>
              ${isOutOfStock ? 'Sold Out' : '+ Add to Order'}
            </button>
            <a href="tel:${(this.settings ? this.settings.phone : '+919494500646').replace(/[^0-9+]/g, '')}" 
              class="js-call-btn" 
              style="font-size: 0.8rem; font-weight: 700; color: var(--phone); text-decoration: none;"
              title="Call to Order this item">
              📞 Quick Call
            </a>
          </div>
        </div>
      `;
    }).join('');
  }
};

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
