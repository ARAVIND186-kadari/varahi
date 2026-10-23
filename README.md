# Varahi Tiffins 🍛

> Authentic South Indian Vegetarian Restaurant Web Application & Management Portal.
> Located at Plot No. 265, Vasavi Colony Road, beside TNR Apartment, Kothapet, Hyderabad, Telangana 500102, India.

---

## 🌟 Features

- **South Indian Culinary Aesthetics**: Warm saffron, spice gold, banana-leaf green, and ivory color palette with typography powered by *Outfit* and *Plus Jakarta Sans*.
- **Direct Call-to-Order**: Telephony integration (`tel:+919494500646`) accessible from the Navbar, Hero banner, Food Menu, and Cart.
- **WhatsApp Ordering**:
  - Add dishes to cart, choose pickup or home delivery, specify instructions.
  - Generates a structured, URL-encoded click-to-chat order message (`https://wa.me/919494500646`).
  - Records orders in the database with status `Awaiting WhatsApp Confirmation`.
- **Google Maps Integration**: "Get Directions" buttons linking directly to the restaurant's confirmed Google Maps destination with embedded map.
- **Customer Feedback & Moderated Review System**:
  - 1–5 star interactive rating, category selection, and optional order reference verification.
  - Review moderation in Admin Dashboard (only approved reviews appear on the public website).
  - Dynamic score calculations from actual database records (no fabricated testimonials).
  - Privacy protected (emails and personal details are strictly excluded from public display).
- **Admin Dashboard (`/admin.html`)**:
  - Overview metrics (orders, WhatsApp sales, approved rating, low stock alerts).
  - Order Management & live status updates.
  - Menu & Inventory management with real-time price & stock editing.
  - Feedback moderation with CSV export.
  - Live restaurant settings configuration (contact numbers, hours, address, charges).

---

## 🚀 Quick Start Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

- **Customer Website**: [http://localhost:5000](http://localhost:5000)
- **Admin Portal**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html) *(Password: `admin123`)*

---

## 🌐 Deploy to Cloud (Render / Railway)

1. Push this repository to GitHub: `https://github.com/ARAVIND186-kadari/varahi.git`
2. In **Render.com** or **Railway.app**, click **New Web Service** and connect this repository.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Your live restaurant website is deployed with free automatic SSL/HTTPS!
