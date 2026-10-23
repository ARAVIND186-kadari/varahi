const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, rawBody: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING ACCEPTANCE TEST SUITE ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    // 1. Check Public Settings
    const settingsRes = await request('GET', '/api/settings');
    assert(settingsRes.status === 200, 'Public settings returns 200');
    assert(settingsRes.body.restaurantName === 'Varahi Tiffins', 'Restaurant name is Varahi Tiffins');
    assert(settingsRes.body.phone === '+91 94945 00646', 'Business contact number is +91 94945 00646');
    assert(settingsRes.body.whatsapp === '919494500646', 'WhatsApp number is 919494500646');
    assert(settingsRes.body.googleMapsUrl === 'https://maps.app.goo.gl/NxjV16Pa4WxCKj158?g_st=ac', 'Google Maps link matches');
    assert(settingsRes.body.address.includes('Kothapet, Hyderabad'), 'Address includes Kothapet, Hyderabad');
    assert(settingsRes.body.openingHours.includes('7:00 AM'), 'Opening hours configured');

    // 2. Check Menu & Pricing
    const menuRes = await request('GET', '/api/menu');
    assert(menuRes.status === 200, 'Menu returns 200');
    assert(menuRes.body.length >= 10, 'Menu has at least 10 items');
    const karamDosa = menuRes.body.find(i => i.name.includes('Ghee Karam Dosa'));
    assert(karamDosa && karamDosa.price === 80, 'Ghee Karam Dosa price is ₹80');

    // 3. Admin Authentication
    const loginFail = await request('POST', '/api/admin/login', { password: 'wrongpassword' });
    assert(loginFail.status === 401, 'Invalid admin password rejected with 401');

    const loginSuccess = await request('POST', '/api/admin/login', { password: 'admin123' });
    assert(loginSuccess.status === 200 && loginSuccess.body.token, 'Admin login succeeds with token');
    const adminToken = loginSuccess.body.token;

    // 4. Test Settings Update via Admin
    const updateSettingsRes = await request('PUT', '/api/admin/settings', {
      phone: '+91 94945 00646'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert(updateSettingsRes.status === 200, 'Admin can update settings without code changes');

    // 5. Test Customer Order Creation (WhatsApp order flow)
    const orderRes = await request('POST', '/api/orders', {
      customerName: 'Suresh Kumar',
      customerPhone: '9876543210',
      orderType: 'delivery',
      deliveryAddress: 'Flat 302, TNR Apartment, Kothapet, Hyderabad',
      items: [{ id: karamDosa.id, quantity: 2 }],
      specialInstructions: 'Make it extra crispy with podi',
      channel: 'whatsapp'
    });
    assert(orderRes.status === 201, 'Order created successfully with 201');
    assert(orderRes.body.order.status === 'Awaiting WhatsApp Confirmation', 'Channel whatsapp status is Awaiting WhatsApp Confirmation');
    assert(orderRes.body.order.grandTotal > 0, 'Grand total calculated properly');
    const createdOrderId = orderRes.body.order.id;

    // 6. Test Feedback Submissions - Rejection of invalid inputs
    const invalidFeedback1 = await request('POST', '/api/feedback', {
      customerName: '',
      rating: 5,
      category: 'Service',
      reviewText: 'Great food!'
    });
    assert(invalidFeedback1.status === 400, 'Empty customer name rejected with 400');

    const invalidFeedback2 = await request('POST', '/api/feedback', {
      customerName: 'Kiran',
      rating: 9, // Invalid rating
      category: 'Service',
      reviewText: 'Great food!'
    });
    assert(invalidFeedback2.status === 400, 'Invalid rating (9) rejected with 400');

    const invalidFeedback3 = await request('POST', '/api/feedback', {
      customerName: 'Kiran',
      rating: 5,
      category: 'FakeCategory',
      reviewText: 'Great food!'
    });
    assert(invalidFeedback3.status === 400, 'Invalid feedback category rejected with 400');

    const invalidFeedback4 = await request('POST', '/api/feedback', {
      customerName: 'Kiran',
      rating: 5,
      category: 'Service',
      reviewText: 'Too short' // < 10 chars
    });
    assert(invalidFeedback4.status === 400, 'Review shorter than 10 characters rejected with 400');

    // 7. Test Valid Feedback Submission (Pending State)
    const validFeedback = await request('POST', '/api/feedback', {
      customerName: 'Venkatesh Rao',
      customerEmail: 'venkat@example.com',
      rating: 5,
      category: 'Food Quality and Taste',
      reviewText: 'Best Ghee Karam Dosa in Kothapet! The chutney trio is authentic and fresh.',
      suggestions: 'Keep up the good quality sambar!',
      orderRef: createdOrderId
    });
    assert(validFeedback.status === 201, 'Valid feedback created with 201');
    assert(validFeedback.body.isOrderVerified === true, 'Order reference verified against actual database order');
    const feedbackId = validFeedback.body.feedbackId;

    // 8. Verify Pending Feedback is NOT in Public API
    const publicFeedback1 = await request('GET', '/api/feedback/public');
    const foundInPublic = publicFeedback1.body.reviews.find(r => r.id === feedbackId);
    assert(!foundInPublic, 'Pending review is NOT exposed on public reviews endpoint');

    // 9. Moderate Feedback via Admin (Approve)
    const approveRes = await request('PUT', `/api/admin/feedback/${feedbackId}`, {
      status: 'approved',
      adminResponse: 'Thank you Venkatesh garu! We look forward to serving you again.'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert(approveRes.status === 200, 'Admin can approve feedback and add response');

    // 10. Verify Approved Feedback now appears publicly and stats calculate accurately
    const publicFeedback2 = await request('GET', '/api/feedback/public');
    const approvedInPublic = publicFeedback2.body.reviews.find(r => r.id === feedbackId);
    assert(approvedInPublic !== undefined, 'Approved review is now visible on public reviews endpoint');
    assert(approvedInPublic.adminResponse.includes('Thank you Venkatesh garu'), 'Admin response displayed publicly');
    assert(approvedInPublic.customerEmail === undefined, 'Customer email is NOT exposed to public API (Privacy protected)');
    assert(publicFeedback2.body.stats.totalReviews >= 1, 'Review stats reflect actual approved count');
    assert(publicFeedback2.body.stats.averageRating === 5.0, 'Average rating calculated accurately from database');

    console.log(`\nTEST SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    if (failCount === 0) {
      console.log('ALL CRITERIA VERIFIED SUCCESSFULLY!');
    }
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
