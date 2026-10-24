const fs = require('fs');
const path = require('path');

console.log('--- STARTING FRONTEND & RESPONSIVE VALIDATION SUITE ---');
let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`[PASS] ${msg}`);
    pass++;
  } else {
    console.error(`[FAIL] ${msg}`);
    fail++;
  }
}

// 1. Validate index.html
const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

assert(indexHtml.includes('class="brand-logo-badge"'), 'Header includes brand-logo-badge');
assert(indexHtml.includes('class="btn-cart-header js-open-cart"'), 'Header includes compact Cart button');
assert(indexHtml.includes('class="cart-count-badge js-cart-count"'), 'Header includes cart count badge');
assert(indexHtml.includes('class="btn-admin-link"'), 'Header includes Admin button');
assert(indexHtml.includes('class="btn-mobile-nav-toggle"'), 'Header includes mobile nav hamburger toggle');
assert(indexHtml.includes('class="mobile-nav-drawer"'), 'Mobile navigation drawer exists in DOM');
assert(indexHtml.includes('id="mobileNavBackdrop"'), 'Mobile nav has backdrop overlay');
assert(indexHtml.includes('class="mobile-action-bar"'), 'Sticky mobile action bar exists');
assert(indexHtml.includes('class="mobile-bar-btn call'), 'Mobile action bar includes Call button');
assert(indexHtml.includes('class="mobile-bar-btn whatsapp'), 'Mobile action bar includes WhatsApp button');
assert(indexHtml.includes('class="mobile-bar-btn directions'), 'Mobile action bar includes Directions button');
assert(indexHtml.includes('class="mobile-bar-btn cart'), 'Mobile action bar includes Cart button');
assert(indexHtml.includes('class="cart-drawer"'), 'Interactive Cart Drawer exists');
assert(indexHtml.includes('class="modal-dialog"'), 'Customer Feedback modal exists');

// 2. Validate admin.html
const adminHtml = fs.readFileSync(path.join(__dirname, 'public', 'admin.html'), 'utf8');

assert(adminHtml.includes('id="sidebarNavDashboard"'), 'Admin sidebar includes Dashboard/Home option');
assert(adminHtml.includes('Dashboard / Home'), 'Admin sidebar button explicitly labeled Dashboard / Home');
assert(adminHtml.includes('sidebar-brand-wrapper js-admin-go-dashboard'), 'Sidebar VT brand is clickable to return to Dashboard');
assert(adminHtml.includes('btn-topbar-home'), 'Admin topbar includes dedicated Home button');
assert(adminHtml.includes('topbar-breadcrumbs'), 'Admin topbar includes breadcrumbs navigation');
assert(adminHtml.includes('btn-breadcrumb-home'), 'Admin breadcrumbs include clickable Dashboard root');
assert(adminHtml.includes('btn-sidebar-toggle'), 'Admin topbar includes mobile hamburger sidebar toggle');
assert(adminHtml.includes('btn-card-back js-admin-go-dashboard'), 'Admin sub-pages include Back to Dashboard buttons');

// Check each sub-page has the back to dashboard button
const tabOrdersBack = adminHtml.indexOf('id="tab-orders"') < adminHtml.lastIndexOf('btn-card-back js-admin-go-dashboard');
assert(tabOrdersBack, 'Order management tab has return to dashboard button');

// 3. Validate style.css
const styleCss = fs.readFileSync(path.join(__dirname, 'public', 'css', 'style.css'), 'utf8');

assert(styleCss.includes('.brand-logo-badge'), 'style.css defines .brand-logo-badge');
assert(styleCss.includes('width: 34px'), 'Logo badge reduced to compact 34px on mobile');
assert(styleCss.includes('.btn-cart-header'), 'style.css defines .btn-cart-header');
assert(styleCss.includes('.btn-admin-link'), 'style.css defines .btn-admin-link');
assert(styleCss.includes('.btn-mobile-nav-toggle'), 'style.css defines .btn-mobile-nav-toggle');
assert(styleCss.includes('.mobile-nav-drawer'), 'style.css defines .mobile-nav-drawer');
assert(styleCss.includes('env(safe-area-inset-bottom)'), 'style.css handles mobile safe-area insets');
assert(styleCss.includes('.mobile-action-bar'), 'style.css defines .mobile-action-bar');
assert(styleCss.includes('@media (min-width: 390px)'), 'style.css includes 390px breakpoint');
assert(styleCss.includes('@media (min-width: 480px)'), 'style.css includes 480px breakpoint');
assert(styleCss.includes('@media (min-width: 768px)'), 'style.css includes 768px breakpoint');
assert(styleCss.includes('@media (min-width: 1280px)'), 'style.css includes 1280px breakpoint');

// 4. Validate admin.css
const adminCss = fs.readFileSync(path.join(__dirname, 'public', 'css', 'admin.css'), 'utf8');

assert(adminCss.includes('.topbar-breadcrumbs'), 'admin.css styles breadcrumbs');
assert(adminCss.includes('.btn-topbar-home'), 'admin.css styles topbar Home button');
assert(adminCss.includes('.btn-card-back'), 'admin.css styles card back button');
assert(adminCss.includes('.admin-table-wrapper'), 'admin.css styles responsive table wrapper');
assert(adminCss.includes('overflow-x: auto'), 'Table wrapper has horizontal scrolling for mobile');
assert(adminCss.includes('.admin-sidebar.open'), 'admin.css styles collapsible mobile sidebar');

// 5. Validate admin.js
const adminJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'admin.js'), 'utf8');

assert(adminJs.includes('hashchange'), 'admin.js listens to hashchange for browser back button');
assert(adminJs.includes('adminBreadcrumbCurrent'), 'admin.js dynamically updates current tab breadcrumb');
assert(adminJs.includes('window.location.hash'), 'admin.js updates URL hash on tab switch');

console.log(`\nVALIDATION COMPLETE: ${pass} PASSED, ${fail} FAILED`);
if (fail > 0) process.exit(1);
