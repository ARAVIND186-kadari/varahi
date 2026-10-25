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
- **Online Payments (Razorpay)**:
  - Customers can pay by UPI, card or netbanking at checkout.
  - Amount is calculated from the live menu on the server, never trusted from the browser.
  - Payment is verified server-side with an HMAC signature, plus a signed webhook fallback.
  - Cash on Delivery is offered as an alternative.
- **Delivery Dispatch (Shiprocket)**:
  - Pincode serviceability is checked in the cart before a delivery order is placed.
  - The admin panel has an explicit **Dispatch** button that creates the Shiprocket shipment, assigns an AWB and books the pickup.
  - Live tracking is available from the order row once the AWB exists.
- **Admin Dashboard (`/admin.html`)**:
  - Overview metrics (orders, WhatsApp sales, approved rating, low stock alerts).
  - Order Management & live status updates, with payment badges and dispatch actions.
  - Menu & Inventory management with real-time price & stock editing.
  - Feedback moderation with CSV export.
  - Live restaurant settings configuration (contact numbers, hours, address, charges, payments and courier).

---

## 🔐 Payments & Delivery Setup

Everything runs without credentials: payment is simulated and dispatch creates a fake AWB, so you can build the site first and plug in the real services later. Copy `.env.example` to `.env` and fill in what you have.

**Razorpay (payments)**

1. Create an account at [razorpay.com](https://razorpay.com) and complete KYC. Start in **Test Mode**.
2. Dashboard → Account & Settings → API Keys → Generate Key. Put them in `.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. Dashboard → Account & Settings → Webhooks → add a webhook pointing at `https://your-domain/api/payments/webhook`, set a secret, and enable the `payment.captured` and `order.paid` events. Put that secret in `RAZORPAY_WEBHOOK_SECRET`.
4. Test cards: use the ones on [Razorpay's test card page](https://razorpay.com/docs/payments/payments/test-card-details).

**Shiprocket (delivery)**

1. Create an account at [shiprocket.in](https://www.shiprocket.in) and add the restaurant address under **Settings → Pickup Address**.
2. Create an **API user** under **Settings → API**. Put its credentials in `.env` as `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`.
3. In the admin panel → **Restaurant Settings**, set the *Shiprocket Pickup Location Name* to match the pickup address you created, and set the restaurant pincode, city, state and parcel dimensions.

> Until credentials are set, `RAZORPAY_*` and `SHIPROCKET_*` are empty, the cart shows a "Test Mode" notice and the **Dispatch** button returns a simulated AWB. This is intentional so nothing is blocked during development.

---

## 🧪 Tests

```bash
npm test                 # core acceptance suite (settings, menu, orders, feedback, privacy)
npm run test:payments    # Razorpay payment + Shiprocket dispatch suite
```

Both suites expect the server to be running on port 5000 (`npm start`).

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
"# varahi07" 
