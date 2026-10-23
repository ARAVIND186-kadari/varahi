const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'varahi_admin_secure_2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory rate limiter for feedback
const feedbackRateLimit = new Map();
function rateLimitMiddleware(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 6;

  const userRecord = feedbackRateLimit.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + windowMs;
  } else {
    userRecord.count++;
  }

  feedbackRateLimit.set(ip, userRecord);

  if (userRecord.count > maxAttempts) {
    return res.status(429).json({
      error: 'Too many feedback submissions from this IP. Please wait a few minutes before trying again.'
    });
  }

  next();
}

// Admin Auth Middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing authorization header' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: Invalid admin authorization token' });
  }

  next();
}

// Allowed Feedback Categories
const VALID_CATEGORIES = [
  "Food Quality and Taste",
  "Food Freshness",
  "Service",
  "Staff Behavior",
  "Cleanliness",
  "Order Accuracy",
  "Preparation Time",
  "Packaging and Delivery",
  "Overall Experience",
  "Other Suggestions"
];

// ==========================================
// PUBLIC API ROUTES
// ==========================================

// 1. Restaurant Settings (Public)
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    // Return sanitized public settings
    const publicSettings = {
      restaurantName: settings.restaurantName,
      category: settings.category,
      address: settings.address,
      googleMapsUrl: settings.googleMapsUrl,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      openingHours: settings.openingHours,
      statusNote: settings.statusNote,
      deliveryFee: settings.deliveryFee,
      packagingFee: settings.packagingFee,
      taxPercentage: settings.taxPercentage,
      enableWhatsAppApi: !!settings.enableWhatsAppApi
    };
    res.json(publicSettings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// 2. Menu Items (Public)
app.get('/api/menu', (req, res) => {
  try {
    const menu = db.getMenu();
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve menu' });
  }
});

// 3. Create Order (Public: Website or WhatsApp initiate)
app.post('/api/orders', (req, res) => {
  try {
    const { customerName, customerPhone, orderType, deliveryAddress, items, specialInstructions, channel } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart cannot be empty' });
    }

    const settings = db.getSettings();
    let subtotal = 0;
    const validatedItems = [];

    // Re-verify prices against current menu
    const menu = db.getMenu();
    for (const cartItem of items) {
      const menuItem = menu.find(m => m.id === cartItem.id);
      if (!menuItem) {
        return res.status(400).json({ error: `Item with id ${cartItem.id} no longer exists.` });
      }
      if (!menuItem.inStock) {
        return res.status(400).json({ error: `"${menuItem.name}" is currently sold out.` });
      }

      const qty = Math.max(1, parseInt(cartItem.quantity, 10) || 1);
      const itemTotal = menuItem.price * qty;
      subtotal += itemTotal;

      validatedItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty,
        itemTotal
      });
    }

    const deliveryFee = orderType === 'delivery' ? (settings.deliveryFee || 30) : 0;
    const packagingFee = settings.packagingFee || 15;
    const tax = Math.round((subtotal * (settings.taxPercentage || 5)) / 100);
    const grandTotal = subtotal + deliveryFee + packagingFee + tax;

    const orderRecord = db.createOrder({
      customerName: customerName ? customerName.trim() : 'Guest Customer',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      orderType: orderType === 'delivery' ? 'delivery' : 'pickup',
      deliveryAddress: orderType === 'delivery' ? (deliveryAddress || '').trim() : '',
      items: validatedItems,
      subtotal,
      deliveryFee,
      packagingFee,
      tax,
      grandTotal,
      specialInstructions: (specialInstructions || '').trim(),
      channel: channel || 'whatsapp',
      status: channel === 'whatsapp' ? 'Awaiting WhatsApp Confirmation' : 'Order Placed'
    });

    res.status(201).json({
      success: true,
      message: channel === 'whatsapp' 
        ? 'Order recorded. Awaiting confirmation on WhatsApp.' 
        : 'Order placed successfully.',
      order: orderRecord
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// 4. Track Order Status (Public)
app.get('/api/orders/:id', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    // Return sanitized status
    res.json({
      id: order.id,
      customerName: order.customerName,
      status: order.status,
      orderType: order.orderType,
      itemsCount: order.items.length,
      grandTotal: order.grandTotal,
      createdAt: order.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// 5. Public Customer Reviews (APPROVED ONLY)
app.get('/api/feedback/public', (req, res) => {
  try {
    const approvedReviews = db.getFeedback(false);
    const stats = db.getApprovedReviewStats();

    // Map to sanitized public records (strip private email, phone, IP)
    const sanitizedReviews = approvedReviews.map(r => ({
      id: r.id,
      customerName: r.customerName,
      rating: r.rating,
      category: r.category,
      reviewText: r.reviewText,
      suggestions: r.suggestions,
      isOrderVerified: r.isOrderVerified,
      adminResponse: r.adminResponse,
      createdAt: r.createdAt
    }));

    res.json({
      stats,
      reviews: sanitizedReviews
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public reviews' });
  }
});

// 6. Submit Customer Feedback
app.post('/api/feedback', rateLimitMiddleware, (req, res) => {
  try {
    const { customerName, customerEmail, rating, category, reviewText, suggestions, orderRef, honeypot } = req.body;

    // Honeypot spam trap
    if (honeypot) {
      return res.status(400).json({ error: 'Bot submission detected.' });
    }

    // Validation
    const errors = [];

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      errors.push('Rating must be an integer between 1 and 5 stars.');
    }

    if (!customerName || customerName.trim().length < 2) {
      errors.push('Please provide your name (at least 2 characters).');
    } else if (customerName.trim().length > 60) {
      errors.push('Customer name cannot exceed 60 characters.');
    }

    if (!category || !VALID_CATEGORIES.includes(category.trim())) {
      errors.push('Please select a valid feedback category.');
    }

    if (!reviewText || reviewText.trim().length < 10) {
      errors.push('Please share your review or comments (at least 10 characters).');
    } else if (reviewText.trim().length > 1000) {
      errors.push('Review cannot exceed 1000 characters.');
    }

    if (customerEmail && customerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail.trim())) {
        errors.push('Invalid email address format.');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const newFeedback = db.createFeedback({
      customerName,
      customerEmail,
      rating: numRating,
      category,
      reviewText,
      suggestions,
      orderRef
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your valuable feedback! Your review has been submitted for moderation and will appear publicly once approved.',
      feedbackId: newFeedback.id,
      isOrderVerified: newFeedback.isOrderVerified
    });
  } catch (err) {
    console.error('Feedback creation error:', err);
    res.status(500).json({ error: 'Failed to submit feedback. Please try again.' });
  }
});

// ==========================================
// ADMIN API ROUTES (PROTECTED)
// ==========================================

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Default credentials check
  if (password === 'admin123' || password === ADMIN_TOKEN) {
    return res.json({
      success: true,
      token: ADMIN_TOKEN,
      admin: { username: 'manager', role: 'admin' }
    });
  }

  res.status(401).json({ error: 'Invalid administrator password.' });
});

// Update Restaurant Settings
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const {
      restaurantName,
      category,
      address,
      googleMapsUrl,
      phone,
      whatsapp,
      openingHours,
      statusNote,
      deliveryFee,
      packagingFee,
      taxPercentage,
      enableWhatsAppApi,
      whatsAppApiConfig
    } = req.body;

    const updates = {};
    if (restaurantName) updates.restaurantName = restaurantName.trim();
    if (category) updates.category = category.trim();
    if (address) updates.address = address.trim();
    if (googleMapsUrl) updates.googleMapsUrl = googleMapsUrl.trim();
    if (phone) updates.phone = phone.trim();
    if (whatsapp) updates.whatsapp = whatsapp.trim().replace(/\D/g, '');
    if (openingHours) updates.openingHours = openingHours.trim();
    if (statusNote !== undefined) updates.statusNote = statusNote.trim();
    if (deliveryFee !== undefined) updates.deliveryFee = Number(deliveryFee);
    if (packagingFee !== undefined) updates.packagingFee = Number(packagingFee);
    if (taxPercentage !== undefined) updates.taxPercentage = Number(taxPercentage);
    if (enableWhatsAppApi !== undefined) updates.enableWhatsAppApi = Boolean(enableWhatsAppApi);
    if (whatsAppApiConfig) updates.whatsAppApiConfig = whatsAppApiConfig;

    const updated = db.updateSettings(updates);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Manage Menu (Admin)
app.post('/api/admin/menu', requireAdmin, (req, res) => {
  try {
    const { name, category, price, description, isVeg, isSpecial, spiceLevel, stockQuantity, prepTime } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, category, and price are required.' });
    }
    const newItem = db.addMenuItem({
      name,
      category,
      price: parseFloat(price),
      description: description || '',
      isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
      isSpecial: Boolean(isSpecial),
      spiceLevel: spiceLevel || 'Mild',
      stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity, 10) : 50,
      prepTime: prepTime || '5-10 mins'
    });
    res.status(201).json({ success: true, item: newItem });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

app.put('/api/admin/menu/:id', requireAdmin, (req, res) => {
  try {
    const updated = db.updateMenuItem(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

app.delete('/api/admin/menu/:id', requireAdmin, (req, res) => {
  try {
    db.deleteMenuItem(req.params.id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Manage Orders (Admin)
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  try {
    const orders = db.getOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.put('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const order = db.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Manage Feedback (Admin)
app.get('/api/admin/feedback', requireAdmin, (req, res) => {
  try {
    const feedbackList = db.getFeedback(true);
    const stats = db.getApprovedReviewStats();
    
    // Also calculate admin-level comprehensive analytics
    let totalPending = 0;
    let totalApproved = 0;
    let totalRejected = 0;
    feedbackList.forEach(f => {
      if (f.status === 'pending') totalPending++;
      if (f.status === 'approved') totalApproved++;
      if (f.status === 'rejected') totalRejected++;
    });

    res.json({
      allCount: feedbackList.length,
      pendingCount: totalPending,
      approvedCount: totalApproved,
      rejectedCount: totalRejected,
      stats,
      feedback: feedbackList
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Moderate Feedback (Approve / Reject / Respond)
// Explicit check: Do not allow admin to rewrite customer's reviewText!
app.put('/api/admin/feedback/:id', requireAdmin, (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid moderation status. Must be pending, approved, or rejected.' });
    }

    const updated = db.updateFeedbackStatus(req.params.id, status, adminResponse);
    if (!updated) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }
    res.json({ success: true, feedback: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

app.delete('/api/admin/feedback/:id', requireAdmin, (req, res) => {
  try {
    db.deleteFeedback(req.params.id);
    res.json({ success: true, message: 'Feedback entry deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// Export Feedback Report (CSV)
app.get('/api/admin/export-feedback', requireAdmin, (req, res) => {
  try {
    const feedbackList = db.getFeedback(true);
    let csv = "ID,Customer Name,Rating,Category,Review,Suggestions,Order Ref,Status,Date,Admin Response\n";
    
    feedbackList.forEach(f => {
      const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
      csv += [
        escape(f.id),
        escape(f.customerName),
        escape(f.rating),
        escape(f.category),
        escape(f.reviewText),
        escape(f.suggestions),
        escape(f.orderRef),
        escape(f.status),
        escape(f.createdAt),
        escape(f.adminResponse)
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="varahi_tiffins_feedback.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export feedback' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Varahi Tiffins Server running on http://localhost:${PORT}`);
});
