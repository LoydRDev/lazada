import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { DEFAULT_ADMIN } from '../src/data/defaultUsers.js';

const port = Number(process.env.WORKFLOW_TEST_PORT || (4300 + (Date.now() % 500)));
const baseUrl = `http://127.0.0.1:${port}/api`;
const startedAt = Date.now();
const stamp = startedAt.toString().slice(-6);
const results = [];

const server = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    DB_HOST: '',
    DB_USER: '',
    DB_NAME: '',
    CLIENT_ORIGIN: `http://127.0.0.1:${port}`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const stopServer = () => {
  if (!server.killed) server.kill();
};

process.on('exit', stopServer);
process.on('SIGINT', () => {
  stopServer();
  process.exit(130);
});

const ok = (name, detail = '') => {
  results.push({ name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ''}`);
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Non-JSON response from ${path}: ${text.slice(0, 80)}`);
  }
  if (!response.ok) {
    const error = new Error(data?.msg || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const expectFailure = async (name, fn, status) => {
  try {
    await fn();
  } catch (error) {
    if (!status || error.status === status) {
      ok(name, error.data?.msg || error.message);
      return;
    }
    throw new Error(`${name} failed with ${error.status}, expected ${status}`);
  }
  throw new Error(`${name} unexpectedly succeeded`);
};

const waitForServer = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await request('/');
      return;
    } catch {
      await delay(150);
    }
  }
  throw new Error('API did not start in time');
};

try {
  await waitForServer();
  ok('API starts');

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: DEFAULT_ADMIN.email, email: DEFAULT_ADMIN.email, password: DEFAULT_ADMIN.password },
  });
  const adminToken = adminLogin.token;
  ok('Admin login', adminLogin.user.email);

  const buyer = (await request('/auth/register', {
    method: 'POST',
    body: {
      email: `buyer.${stamp}@test.local`,
      password: 'buyer123',
      name: 'Workflow Buyer',
      role: 'buyer',
      phone: `+63991${stamp}`,
      address: { city: 'Quezon City', street: 'QA Street' },
    },
  })).user;
  const buyerLogin = await request('/auth/login', { method: 'POST', body: { identifier: buyer.email, email: buyer.email, password: 'buyer123' } });
  const buyerToken = buyerLogin.token;
  ok('Buyer registration/login seed', String(buyer.id));

  const sellerRegistration = await request('/auth/register', {
    method: 'POST',
    body: {
      email: `seller.${stamp}@test.local`,
      password: 'seller123',
      name: 'Workflow Seller',
      role: 'seller',
      phone: `+63992${stamp}`,
      storeName: 'Workflow Store',
      businessName: 'Workflow Business',
      idDocument: `QA-${stamp}`,
    },
  });
  const seller = sellerRegistration.user;
  const sellerToken = sellerRegistration.token;
  await request(`/users/${seller.id}`, {
    method: 'PATCH',
    headers: auth(adminToken),
    body: { verified: true, storeName: 'Workflow Store', businessName: 'Workflow Business', idDocument: `QA-${stamp}` },
  });
  ok('Admin approves seller', String(seller.id));

  const otherSellerRegistration = await request('/auth/register', {
    method: 'POST',
    body: {
      email: `other.seller.${stamp}@test.local`,
      password: 'seller123',
      name: 'Other Seller',
      role: 'seller',
      phone: `+63993${stamp}`,
      storeName: 'Other Store',
      businessName: 'Other Business',
      idDocument: `QA-OTHER-${stamp}`,
    },
  });
  const otherSeller = otherSellerRegistration.user;
  const otherSellerToken = otherSellerRegistration.token;
  await request(`/users/${otherSeller.id}`, { method: 'PATCH', headers: auth(adminToken), body: { verified: true } });

  await expectFailure('Buyer cannot create seller product through API', () => request('/products', {
    method: 'POST',
    headers: auth(buyerToken),
    body: {
      sellerId: buyer.id,
      name: 'Blocked Buyer Product',
      price: 99,
      stock: 1,
      brand: 'QA',
      category: 'electronics',
      subcategory: 'Mobiles',
      image: 'https://placehold.co/600x600',
      images: ['https://placehold.co/600x600'],
      description: 'Should not be allowed',
    },
  }), 403);

  await expectFailure('Missing token returns 401 on protected route', () => request('/orders'), 401);

  const inactiveCategory = (await request('/admin/categories', {
    method: 'POST',
    headers: auth(adminToken),
    body: { name: `Workflow Inactive ${stamp}`, description: 'QA inactive category', icon: 'Box', status: 'Inactive' },
  })).category;
  await expectFailure('Seller cannot use inactive category', () => request('/products', {
    method: 'POST',
    headers: auth(sellerToken),
    body: {
      name: 'Blocked Inactive Category Product',
      price: 99,
      stock: 1,
      brand: 'QA',
      category: inactiveCategory.slug,
      subcategory: '',
      image: 'https://placehold.co/600x600',
      images: ['https://placehold.co/600x600'],
      description: 'Should not be allowed',
    },
  }), 400);

  const activeCategory = (await request('/admin/categories', {
    method: 'POST',
    headers: auth(adminToken),
    body: { name: `Workflow Active ${stamp}`, description: 'QA active category', icon: 'Box', status: 'Active' },
  })).category;
  await request(`/admin/categories/${activeCategory.slug}`, {
    method: 'PATCH',
    headers: auth(adminToken),
    body: { description: 'Updated QA active category' },
  });
  ok('Admin creates and edits category', activeCategory.name);

  const baseProduct = (await request('/products', {
    method: 'POST',
    headers: auth(sellerToken),
    body: {
      sellerId: seller.id,
      name: `Workflow Base Product ${stamp}`,
      price: 150,
      stock: 3,
      brand: 'QA Brand',
      category: 'electronics',
      subcategory: 'Mobiles',
      image: 'https://placehold.co/600x600',
      images: ['https://placehold.co/600x600'],
      description: 'Base product without variants',
      weight: 1,
      dimensions: { length: 10, width: 10, height: 10 },
    },
  })).product;
  ok('Seller creates product without variants', String(baseProduct.id));

  const editedBaseProduct = (await request(`/products/${baseProduct.id}`, {
    method: 'PATCH',
    headers: auth(sellerToken),
    body: { name: `${baseProduct.name} Edited`, price: 175, stock: 4, category: baseProduct.category, description: 'Edited base product' },
  })).product;
  if (editedBaseProduct.name !== `${baseProduct.name} Edited`) throw new Error('Seller product edit did not persist');
  ok('Seller edits own product', editedBaseProduct.name);

  await expectFailure('Seller cannot edit another seller product', () => request(`/products/${baseProduct.id}`, {
    method: 'PATCH',
    headers: auth(otherSellerToken),
    body: { name: 'Unauthorized Edit' },
  }), 403);

  const variantProduct = (await request('/products', {
    method: 'POST',
    headers: auth(sellerToken),
    body: {
      sellerId: seller.id,
      name: `Workflow Variant Product ${stamp}`,
      price: 200,
      stock: 5,
      brand: 'QA Brand',
      category: 'electronics',
      subcategory: 'Mobiles',
      image: 'https://placehold.co/600x600',
      images: ['https://placehold.co/600x600'],
      description: 'Variant product',
      hasVariants: true,
      variantGroups: [
        { name: 'Color', values: ['Red', 'Blue'] },
        { name: 'Size', values: ['Small', 'Large'] },
      ],
      variants: [
        { id: 'variant-1', selectedOptions: { Color: 'Red', Size: 'Small' }, price: 210, stock: 2, sku: 'RED-SMALL', status: 'active' },
        { id: 'variant-2', selectedOptions: { Color: 'Red', Size: 'Large' }, price: 220, stock: 1, sku: 'RED-LARGE', status: 'active' },
        { id: 'variant-3', selectedOptions: { Color: 'Blue', Size: 'Small' }, price: 230, stock: 0, sku: 'BLUE-SMALL', status: 'inactive' },
        { id: 'variant-4', selectedOptions: { Color: 'Blue', Size: 'Large' }, price: 240, stock: 1, sku: 'BLUE-LARGE', status: 'active' },
      ],
      weight: 1,
      dimensions: { length: 10, width: 10, height: 10 },
    },
  })).product;
  const activeVariant = variantProduct.variants.find((variant) => variant.sku === 'RED-SMALL');
  const inactiveVariant = variantProduct.variants.find((variant) => variant.sku === 'BLUE-SMALL');
  ok('Seller creates product with variants', `${variantProduct.variants.length} variants`);

  await expectFailure('Inactive variant cannot be checked out', () => request('/orders', {
    method: 'POST',
    headers: auth(buyerToken),
    body: {
      userId: buyer.id,
      payment: 'cod',
      address: { city: 'Quezon City', street: 'QA Street' },
      items: [{ productId: variantProduct.id, variantId: inactiveVariant.variantId, qty: 1 }],
    },
  }), 400);

  await expectFailure('Variant checkout blocks insufficient stock', () => request('/orders', {
    method: 'POST',
    headers: auth(buyerToken),
    body: {
      userId: buyer.id,
      payment: 'cod',
      address: { city: 'Quezon City', street: 'QA Street' },
      items: [{ productId: variantProduct.id, variantId: activeVariant.variantId, qty: 99 }],
    },
  }), 400);

  const order = (await request('/orders', {
    method: 'POST',
    headers: auth(buyerToken),
    body: {
      userId: buyer.id,
      payment: 'cod',
      address: { city: 'Quezon City', street: 'QA Street' },
      items: [{
        productId: variantProduct.id,
        variantId: activeVariant.variantId,
        variantName: activeVariant.variantName,
        selectedOptions: activeVariant.selectedOptions,
        sku: activeVariant.sku,
        qty: 1,
      }],
    },
  })).order;
  const item = order.items[0];
  ok('Buyer checkout creates pending order', item.status);

  await expectFailure('Buyer cannot review before delivery', () => request('/reviews', {
    method: 'POST',
    headers: auth(buyerToken),
    body: { orderId: order.id, orderItemId: item.orderItemId, productId: item.productId, buyerId: buyer.id, rating: 5, comment: 'Too early' },
  }), 400);

  await expectFailure('Invalid status jump is blocked', () => request(`/seller/order-items/${item.orderItemId}/delivered`, {
    method: 'PATCH',
    headers: auth(sellerToken),
    body: {},
  }), 400);

  await expectFailure('Other seller cannot update this order', () => request(`/seller/order-items/${item.orderItemId}/approve`, {
    method: 'PATCH',
    headers: auth(otherSellerToken),
    body: {},
  }), 403);

  await request(`/seller/order-items/${item.orderItemId}/approve`, { method: 'PATCH', headers: auth(sellerToken), body: {} });
  await request(`/seller/order-items/${item.orderItemId}/packed`, { method: 'PATCH', headers: auth(sellerToken), body: {} });
  await request(`/seller/order-items/${item.orderItemId}/to_be_shipped`, { method: 'PATCH', headers: auth(sellerToken), body: {} });
  ok('Seller moves order to ready to ship');

  await expectFailure('Seller cannot ship without driver', () => request(`/seller/order-items/${item.orderItemId}/shipping`, {
    method: 'PATCH',
    headers: auth(sellerToken),
    body: {},
  }), 400);

  const drivers = (await request('/drivers')).drivers;
  const driver = drivers[0];
  const shippingOrder = (await request(`/seller/order-items/${item.orderItemId}/shipping`, {
    method: 'PATCH',
    headers: auth(sellerToken),
    body: { driverId: driver.id },
  })).order;
  ok('Seller ships order with assigned driver', shippingOrder.items[0].driver.name);

  const driverLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: 'juan.driver@lazada.local', email: 'juan.driver@lazada.local', password: 'driver123' },
  }).catch(async () => request('/auth/login', {
    method: 'POST',
    body: { identifier: driver.phone, email: driver.phone, password: 'driver123' },
  }));
  const driverToken = driverLogin.token;
  ok('Driver login', driverLogin.user.name);

  const deliveries = (await request('/driver/deliveries', { headers: auth(driverToken) })).orders;
  if (!deliveries.length) throw new Error('Driver did not receive assigned delivery');
  await request(`/driver/deliveries/${item.orderItemId}/picked_up`, { method: 'PATCH', headers: auth(driverToken), body: {} });
  await request(`/driver/deliveries/${item.orderItemId}/in_transit`, { method: 'PATCH', headers: auth(driverToken), body: {} });
  const deliveredOrder = (await request(`/driver/deliveries/${item.orderItemId}/delivered`, { method: 'PATCH', headers: auth(driverToken), body: {} })).order;
  ok('Driver delivery updates reflect on order', deliveredOrder.items[0].status);

  const review = await request('/reviews', {
    method: 'POST',
    headers: auth(buyerToken),
    body: { orderId: order.id, orderItemId: item.orderItemId, productId: item.productId, buyerId: 'fake-buyer-id', rating: 5, comment: 'Delivered successfully' },
  });
  ok('Buyer can review delivered order', String(review.review.reviewId));

  await expectFailure('Buyer cannot review same item twice', () => request('/reviews', {
    method: 'POST',
    headers: auth(buyerToken),
    body: { orderId: order.id, orderItemId: item.orderItemId, productId: item.productId, buyerId: buyer.id, rating: 5, comment: 'Duplicate' },
  }), 409);

  const after = await request('/bootstrap');
  const stockedProduct = after.products.find((product) => String(product.id) === String(variantProduct.id));
  const stockedVariant = stockedProduct.variants.find((variant) => String(variant.variantId) === String(activeVariant.variantId));
  if (Number(stockedVariant.stock) !== Number(activeVariant.stock) - 1) throw new Error('Variant stock was not deducted correctly');
  ok('Variant stock deducted correctly', `${activeVariant.stock} -> ${stockedVariant.stock}`);

  const report = (await request('/admin/reports', { headers: auth(adminToken) })).report;
  if (!report?.totals || report.totals.orders < 1) throw new Error('Admin reports did not include order totals');
  ok('Admin advanced reports load', `${report.totals.orders} order(s)`);

  await request(`/admin/categories/${activeCategory.slug}`, { method: 'DELETE', headers: auth(adminToken) });
  ok('Admin deletes unused category');

  console.log(`\n${results.length} workflow checks passed.`);
} catch (error) {
  console.error(`FAIL ${error.message}`);
  if (error.data) console.error(JSON.stringify(error.data, null, 2));
  process.exitCode = 1;
} finally {
  stopServer();
}
