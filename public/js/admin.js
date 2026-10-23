// Varahi Tiffins - Admin Portal Controller

const Admin = {
  token: null,
  currentTab: 'overview',
  orders: [],
  menu: [],
  feedbackList: [],
  settings: {},

  init() {
    this.token = sessionStorage.getItem('varahi_admin_token');
    if (this.token) {
      this.showDashboard();
    } else {
      this.showLogin();
    }
    this.bindEvents();
  },

  bindEvents() {
    // Login form
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Sidebar tab buttons
    document.querySelectorAll('.js-admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Logout button
    const logoutBtn = document.getElementById('btnAdminLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Settings form
    const settingsForm = document.getElementById('restaurantSettingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    // Add Menu Item form
    const addDishForm = document.getElementById('addDishForm');
    if (addDishForm) {
      addDishForm.addEventListener('submit', (e) => this.handleAddDish(e));
    }

    // Export Feedback CSV
    const exportBtn = document.getElementById('btnExportFeedback');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExportFeedback());
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const passInput = document.getElementById('adminPassword');
    const password = passInput.value;
    const errorEl = document.getElementById('loginError');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok) {
        if (errorEl) {
          errorEl.textContent = data.error || 'Login failed';
          errorEl.style.display = 'block';
        }
        return;
      }

      this.token = data.token;
      sessionStorage.setItem('varahi_admin_token', this.token);
      this.showDashboard();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = 'Server connection error';
        errorEl.style.display = 'block';
      }
    }
  },

  handleLogout() {
    this.token = null;
    sessionStorage.removeItem('varahi_admin_token');
    this.showLogin();
  },

  showLogin() {
    document.getElementById('adminLoginView').style.display = 'flex';
    document.getElementById('adminDashboardView').style.display = 'none';
  },

  showDashboard() {
    document.getElementById('adminLoginView').style.display = 'none';
    document.getElementById('adminDashboardView').style.display = 'flex';
    this.switchTab(this.currentTab);
  },

  switchTab(tab) {
    this.currentTab = tab;

    // Update sidebar nav active
    document.querySelectorAll('.js-admin-tab-btn').forEach(b => {
      if (b.dataset.tab === tab) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Hide all tab views
    document.querySelectorAll('.admin-tab-content').forEach(view => {
      view.style.display = 'none';
    });

    // Show target tab view
    const targetView = document.getElementById(`tab-${tab}`);
    if (targetView) targetView.style.display = 'block';

    // Load data for the tab
    if (tab === 'overview') this.loadOverview();
    if (tab === 'orders') this.loadOrders();
    if (tab === 'menu') this.loadMenu();
    if (tab === 'feedback') this.loadFeedback();
    if (tab === 'settings') this.loadSettings();
    if (tab === 'whatsapp') this.loadWhatsAppSettings();
  },

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  },

  // 1. Overview Tab
  async loadOverview() {
    try {
      const [ordersRes, feedbackRes, menuRes] = await Promise.all([
        fetch('/api/admin/orders', { headers: this.getHeaders() }),
        fetch('/api/admin/feedback', { headers: this.getHeaders() }),
        fetch('/api/menu')
      ]);

      const orders = await ordersRes.json();
      const fbData = await feedbackRes.json();
      const menu = await menuRes.json();

      document.getElementById('statTotalOrders').textContent = orders.length;
      document.getElementById('statWhatsAppOrders').textContent = orders.filter(o => o.channel === 'whatsapp').length;
      document.getElementById('statAvgRating').textContent = fbData.stats ? `${fbData.stats.averageRating} ★` : '0.0 ★';
      document.getElementById('statPendingReviews').textContent = fbData.pendingCount || 0;
      
      const outOfStockCount = menu.filter(m => !m.inStock || m.stockQuantity === 0).length;
      document.getElementById('statOutOfStock').textContent = outOfStockCount;

      // Update sidebar badges
      const fbBadge = document.getElementById('badgePendingFeedback');
      if (fbBadge) {
        fbBadge.textContent = fbData.pendingCount || 0;
        fbBadge.style.display = (fbData.pendingCount > 0) ? 'inline-block' : 'none';
      }

      // Render recent activity preview
      const recentOrdersEl = document.getElementById('overviewRecentOrders');
      if (recentOrdersEl) {
        const top5 = orders.slice(0, 5);
        if (top5.length === 0) {
          recentOrdersEl.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748B;">No orders recorded yet.</td></tr>`;
        } else {
          recentOrdersEl.innerHTML = top5.map(o => `
            <tr>
              <td><strong>#${o.id}</strong></td>
              <td>${escapeHtml(o.customerName)}</td>
              <td>₹${o.grandTotal}</td>
              <td><span class="badge-status ${o.channel === 'whatsapp' ? 'approved' : 'pending'}">${o.channel.toUpperCase()}</span></td>
              <td><span class="badge-status ${o.status.includes('Confirmed') ? 'approved' : 'pending'}">${o.status}</span></td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Overview load error:', err);
    }
  },

  // 2. Orders Tab
  async loadOrders() {
    try {
      const res = await fetch('/api/admin/orders', { headers: this.getHeaders() });
      this.orders = await res.json();
      this.renderOrdersTable(this.orders);
    } catch (err) {
      console.error('Orders load error:', err);
    }
  },

  renderOrdersTable(orders) {
    const tableBody = document.getElementById('adminOrdersTableBody');
    if (!tableBody) return;

    if (orders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #64748B;">No orders in database.</td></tr>`;
      return;
    }

    tableBody.innerHTML = orders.map(o => {
      const dateStr = new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
      const itemsSummary = o.items ? o.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'None';
      
      return `
        <tr>
          <td><strong>#${o.id}</strong><br><small style="color: #64748B;">${dateStr}</small></td>
          <td>
            <strong>${escapeHtml(o.customerName)}</strong><br>
            <small style="color: #64748B;">${escapeHtml(o.customerPhone || 'No phone')}</small>
          </td>
          <td style="max-width: 200px;">
            <div style="font-size: 0.82rem; color: #334155;">${escapeHtml(itemsSummary)}</div>
            ${o.specialInstructions ? `<small style="color: #B45309;">Note: ${escapeHtml(o.specialInstructions)}</small>` : ''}
          </td>
          <td>
            <span class="badge-status ${o.orderType === 'delivery' ? 'pending' : 'approved'}">
              ${o.orderType === 'delivery' ? '🛵 Delivery' : '🛍️ Pickup'}
            </span>
            ${o.deliveryAddress ? `<br><small style="color: #64748B;">${escapeHtml(o.deliveryAddress)}</small>` : ''}
          </td>
          <td><strong>₹${o.grandTotal}</strong></td>
          <td>
            <select class="admin-status-select" onchange="Admin.updateOrderStatus('${o.id}', this.value)" style="padding: 6px; border-radius: 6px; border: 1px solid #CBD5E1; font-size: 0.82rem;">
              <option value="Awaiting WhatsApp Confirmation" ${o.status === 'Awaiting WhatsApp Confirmation' ? 'selected' : ''}>Awaiting WhatsApp Confirmation</option>
              <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
              <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready for Pickup / Out</option>
              <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Completed / Delivered</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>
            <a href="tel:${(o.customerPhone || '').replace(/[^0-9+]/g, '')}" class="btn-action respond" title="Call customer">
              📞 Call
            </a>
          </td>
        </tr>
      `;
    }).join('');
  },

  async updateOrderStatus(id, newStatus) {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Order #${id} status updated to ${newStatus}`, 'success');
      }
    } catch (err) {
      showToast('Failed to update order status', 'error');
    }
  },

  // 3. Menu & Inventory Tab
  async loadMenu() {
    try {
      const res = await fetch('/api/menu');
      this.menu = await res.json();
      this.renderMenuTable(this.menu);
    } catch (err) {
      console.error('Menu load error:', err);
    }
  },

  renderMenuTable(menu) {
    const tableBody = document.getElementById('adminMenuTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = menu.map(item => `
      <tr>
        <td>
          <strong>${escapeHtml(item.name)}</strong>
          ${item.isSpecial ? '<span style="color: #D97706; font-size: 0.75rem;"> ★ Special</span>' : ''}
          <br><small style="color: #64748B;">${escapeHtml(item.category)}</small>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span>₹</span>
            <input type="number" value="${item.price}" style="width: 70px; padding: 4px 6px; border: 1px solid #CBD5E1; border-radius: 4px;" 
              onchange="Admin.updateItemPrice('${item.id}', this.value)">
          </div>
        </td>
        <td>
          <input type="number" value="${item.stockQuantity !== undefined ? item.stockQuantity : 50}" style="width: 70px; padding: 4px 6px; border: 1px solid #CBD5E1; border-radius: 4px;" 
            onchange="Admin.updateItemStock('${item.id}', this.value)">
        </td>
        <td>
          <button class="btn-action ${item.inStock ? 'approve' : 'reject'}" onclick="Admin.toggleItemStock('${item.id}', ${!item.inStock})">
            ${item.inStock ? '✓ In Stock' : '✕ Out of Stock'}
          </button>
        </td>
        <td>
          <button class="btn-action reject" onclick="Admin.deleteItem('${item.id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
  },

  async updateItemPrice(id, newPrice) {
    try {
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ price: parseFloat(newPrice) })
      });
      if (res.ok) showToast('Price updated!', 'success');
    } catch (e) {
      showToast('Failed to update price', 'error');
    }
  },

  async updateItemStock(id, newQty) {
    try {
      const qty = parseInt(newQty, 10);
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ stockQuantity: qty, inStock: qty > 0 })
      });
      if (res.ok) {
        showToast('Stock quantity updated!', 'success');
        this.loadMenu();
      }
    } catch (e) {
      showToast('Failed to update stock', 'error');
    }
  },

  async toggleItemStock(id, inStock) {
    try {
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ inStock })
      });
      if (res.ok) {
        showToast(`Item availability updated to ${inStock ? 'In Stock' : 'Out of Stock'}`, 'success');
        this.loadMenu();
      }
    } catch (e) {
      showToast('Failed to update stock', 'error');
    }
  },

  async deleteItem(id) {
    if (!confirm('Are you sure you want to delete this menu dish?')) return;
    try {
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (res.ok) {
        showToast('Item deleted successfully', 'success');
        this.loadMenu();
      }
    } catch (e) {
      showToast('Failed to delete item', 'error');
    }
  },

  async handleAddDish(e) {
    e.preventDefault();
    const name = document.getElementById('newDishName').value;
    const category = document.getElementById('newDishCategory').value;
    const price = document.getElementById('newDishPrice').value;
    const description = document.getElementById('newDishDesc').value;
    const stockQuantity = document.getElementById('newDishStock').value;
    const isSpecial = document.getElementById('newDishSpecial').checked;

    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name, category, price, description, stockQuantity, isSpecial, isVeg: true })
      });
      if (res.ok) {
        showToast('Dish added to menu!', 'success');
        document.getElementById('addDishForm').reset();
        this.loadMenu();
      }
    } catch (e) {
      showToast('Failed to add dish', 'error');
    }
  },

  // 4. Feedback & Reviews Moderation Tab
  async loadFeedback() {
    try {
      const res = await fetch('/api/admin/feedback', { headers: this.getHeaders() });
      const data = await res.json();
      this.feedbackList = data.feedback || [];
      this.renderFeedbackTable(this.feedbackList);
      this.renderFeedbackAnalytics(data);
    } catch (err) {
      console.error('Feedback load error:', err);
    }
  },

  filterFeedback() {
    const statusFilter = document.getElementById('feedbackStatusFilter').value;
    const ratingFilter = document.getElementById('feedbackRatingFilter').value;
    const categoryFilter = document.getElementById('feedbackCategoryFilter').value;

    let filtered = this.feedbackList;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter);
    }
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(f => f.rating === parseInt(ratingFilter, 10));
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(f => f.category === categoryFilter);
    }

    this.renderFeedbackTable(filtered);
  },

  renderFeedbackAnalytics(data) {
    const statsContainer = document.getElementById('feedbackAnalyticsBox');
    if (!statsContainer) return;

    const stats = data.stats || { averageRating: 0, totalReviews: 0 };
    statsContainer.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 0.85rem; color: #64748B; font-weight: 700;">APPROVED PUBLIC SCORE</div>
          <div style="font-size: 2.2rem; font-weight: 800; color: #D97706;">${stats.averageRating} ★ <span style="font-size: 1rem; color: #64748B;">(${stats.totalReviews} approved)</span></div>
        </div>
        <div style="display: flex; gap: 16px;">
          <div style="background: #FEF3C7; padding: 10px 16px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: #92400E; font-weight: 700;">PENDING MODERATION</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #B45309;">${data.pendingCount || 0}</div>
          </div>
          <div style="background: #DCFCE7; padding: 10px 16px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: #166534; font-weight: 700;">APPROVED REVIEWS</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #15803D;">${data.approvedCount || 0}</div>
          </div>
          <div style="background: #FEE2E2; padding: 10px 16px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: #991B1B; font-weight: 700;">REJECTED / SPAM</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #B91C1C;">${data.rejectedCount || 0}</div>
          </div>
        </div>
      </div>
    `;
  },

  renderFeedbackTable(feedback) {
    const tableBody = document.getElementById('adminFeedbackTableBody');
    if (!tableBody) return;

    if (feedback.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #64748B;">No feedback submissions match filters.</td></tr>`;
      return;
    }

    tableBody.innerHTML = feedback.map(item => {
      const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
      const dateStr = new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.customerName)}</strong>
            ${item.customerEmail ? `<br><small style="color: #64748B;">${escapeHtml(item.customerEmail)}</small>` : ''}
            ${item.orderRef ? `<br><small style="color: #059669;">Ref: ${escapeHtml(item.orderRef)} ${item.isOrderVerified ? '✓ Verified' : ''}</small>` : ''}
          </td>
          <td>
            <div style="color: #F59E0B; font-weight: 700;">${stars}</div>
            <small style="color: #64748B;">${escapeHtml(item.category)}</small>
          </td>
          <td style="max-width: 320px;">
            <div style="font-size: 0.88rem; line-height: 1.4; color: #1E293B;">
              ${escapeHtml(item.reviewText)}
            </div>
            ${item.suggestions ? `
              <div style="margin-top: 6px; font-size: 0.8rem; color: #B45309; background: #FFFBEB; padding: 4px 8px; border-radius: 4px;">
                Suggestion: ${escapeHtml(item.suggestions)}
              </div>
            ` : ''}
            ${item.adminResponse ? `
              <div style="margin-top: 6px; font-size: 0.8rem; color: #1D4ED8; background: #EFF6FF; padding: 4px 8px; border-radius: 4px;">
                Admin Response: ${escapeHtml(item.adminResponse)}
              </div>
            ` : ''}
          </td>
          <td>
            <span class="badge-status ${item.status}">
              ${item.status.toUpperCase()}
            </span>
          </td>
          <td><small style="color: #64748B;">${dateStr}</small></td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${item.status !== 'approved' ? `
                <button class="btn-action approve" onclick="Admin.moderateFeedback('${item.id}', 'approved')">
                  ✓ Approve
                </button>
              ` : ''}
              ${item.status !== 'rejected' ? `
                <button class="btn-action reject" onclick="Admin.moderateFeedback('${item.id}', 'rejected')">
                  ✕ Reject
                </button>
              ` : ''}
              <button class="btn-action respond" onclick="Admin.openResponseModal('${item.id}', '${escapeHtml(item.customerName).replace(/'/g, "\\'")}')">
                💬 Respond
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async moderateFeedback(id, status) {
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Review status updated to ${status}!`, 'success');
        this.loadFeedback();
      }
    } catch (e) {
      showToast('Failed to moderate review', 'error');
    }
  },

  openResponseModal(id, customerName) {
    const existing = this.feedbackList.find(f => f.id === id);
    const existingReply = existing && existing.adminResponse ? existing.adminResponse : '';

    const modalHtml = `
      <div class="modal-overlay active" id="adminReplyModal">
        <div class="modal-dialog" style="max-width: 500px;">
          <div class="modal-header">
            <h3>Respond to ${customerName}</h3>
            <button class="btn-close-drawer" onclick="document.getElementById('adminReplyModal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.85rem; color: #64748B; margin-bottom: 12px;">
              Your response will appear publicly below the review once approved. (You cannot alter customer's text).
            </p>
            <div class="admin-input-group">
              <label>Official Response from Varahi Tiffins Team</label>
              <textarea id="adminReplyText" rows="4" placeholder="e.g. Thank you for your feedback! We will ensure your next dosa is made to perfection." style="width: 100%;">${escapeHtml(existingReply)}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="document.getElementById('adminReplyModal').remove()">Cancel</button>
            <button class="btn-primary" onclick="Admin.saveFeedbackResponse('${id}')">Save & Publish Response</button>
          </div>
        </div>
      </div>
    `;

    const old = document.getElementById('adminReplyModal');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  async saveFeedbackResponse(id) {
    const text = document.getElementById('adminReplyText').value.trim();
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ adminResponse: text })
      });
      if (res.ok) {
        showToast('Admin response published!', 'success');
        document.getElementById('adminReplyModal').remove();
        this.loadFeedback();
      }
    } catch (e) {
      showToast('Failed to save response', 'error');
    }
  },

  async handleExportFeedback() {
    try {
      const res = await fetch('/api/admin/export-feedback', { headers: this.getHeaders() });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `varahi_tiffins_feedback_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Feedback CSV exported successfully!', 'success');
    } catch (err) {
      showToast('Export failed', 'error');
    }
  },

  // 5. Settings Tab
  async loadSettings() {
    try {
      const res = await fetch('/api/settings');
      this.settings = await res.json();

      document.getElementById('setRestaurantName').value = this.settings.restaurantName || '';
      document.getElementById('setCategory').value = this.settings.category || '';
      document.getElementById('setPhone').value = this.settings.phone || '';
      document.getElementById('setWhatsApp').value = this.settings.whatsapp || '';
      document.getElementById('setAddress').value = this.settings.address || '';
      document.getElementById('setGoogleMapsUrl').value = this.settings.googleMapsUrl || '';
      document.getElementById('setOpeningHours').value = this.settings.openingHours || '';
      document.getElementById('setStatusNote').value = this.settings.statusNote || '';
      document.getElementById('setDeliveryFee').value = this.settings.deliveryFee || 30;
      document.getElementById('setPackagingFee').value = this.settings.packagingFee || 15;
      document.getElementById('setTaxPercentage').value = this.settings.taxPercentage || 5;
    } catch (err) {
      console.error('Settings load error:', err);
    }
  },

  async handleSaveSettings(e) {
    e.preventDefault();

    const updates = {
      restaurantName: document.getElementById('setRestaurantName').value,
      category: document.getElementById('setCategory').value,
      phone: document.getElementById('setPhone').value,
      whatsapp: document.getElementById('setWhatsApp').value,
      address: document.getElementById('setAddress').value,
      googleMapsUrl: document.getElementById('setGoogleMapsUrl').value,
      openingHours: document.getElementById('setOpeningHours').value,
      statusNote: document.getElementById('setStatusNote').value,
      deliveryFee: Number(document.getElementById('setDeliveryFee').value),
      packagingFee: Number(document.getElementById('setPackagingFee').value),
      taxPercentage: Number(document.getElementById('setTaxPercentage').value)
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        showToast('Restaurant details updated successfully! Live website refreshed.', 'success');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch (err) {
      showToast('Network error saving settings', 'error');
    }
  },

  // 6. WhatsApp Settings Tab
  loadWhatsAppSettings() {
    // Optional Cloud API display
    const btnTest = document.getElementById('btnTestWhatsApp');
    if (btnTest) {
      btnTest.onclick = () => {
        showToast('WhatsApp Click-to-chat active on +91 94945 00646 with prefilled orders.', 'success');
      };
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});
