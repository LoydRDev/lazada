import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { CATEGORIES, PRODUCTS } from '../src/data/catalog.js';
import { DEFAULT_ADMIN } from '../src/data/defaultUsers.js';
import { isDbConfigured, query } from './db.js';
import { ensureSeedData, ensureSellerForUser, ids } from './seed.js';

const app = express();
const port = Number(process.env.PORT || 4000);
let dbReady = isDbConfigured;
let memoryUsers = [DEFAULT_ADMIN];
let memoryProducts = PRODUCTS;
let memoryOrders = [];

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

const normalizeRole = (role = 'buyer') => {
  const value = String(role).toLowerCase();
  if (value === 'seller') return 'Seller';
  if (value === 'admin') return 'Admin';
  if (value === 'moderator') return 'Moderator';
  return 'Buyer';
};

const denormalizeRole = (role = 'Buyer') => String(role).toLowerCase();

const splitName = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Lazada',
    lastName: parts.slice(1).join(' ') || 'User',
  };
};

const userAddress = (row) => {
  if (!row.user_default_address) return null;
  return typeof row.user_default_address === 'string'
    ? JSON.parse(row.user_default_address || '{}')
    : row.user_default_address;
};

const nextId = (base) => base + (Date.now() % 900000);

const toUser = (row) => ({
  id: row.user_id,
  email: row.user_email,
  password: row.user_pwdhash,
  name: `${row.user_fname} ${row.user_lname}`.trim(),
  role: denormalizeRole(row.user_role),
  verified: Boolean(row.user_verified),
  phone: row.user_phone_no,
  address: userAddress(row),
  storeName: row.sell_store_name || null,
  businessName: row.sell_b_name || null,
  idDocument: row.sell_b_permit_no || null,
  createdAt: row.date_registered,
});

const toProduct = (row) => ({
  id: row.prod_id,
  name: row.prod_name,
  price: Number(row.prod_price),
  originalPrice: Number(row.prod_original_price),
  image: row.prod_image,
  category: row.cat_slug || CATEGORIES[0].id,
  rating: Number(row.prod_avr_rating || 0),
  sold: Number(row.prod_total_sold || 0),
  sellerId: row.prod_sell_id,
  stock: Number(row.prod_stock_qty),
  discount: Number(row.prod_discount_percent || 0),
  brand: row.prod_brand || '',
  description: row.prod_desc,
  images: typeof row.prod_images === 'string' ? JSON.parse(row.prod_images || '[]') : row.prod_images || [],
});

const toOrder = (row) => ({
  id: row.order_id,
  userId: row.order_user_id,
  items: typeof row.order_items_snapshot === 'string' ? JSON.parse(row.order_items_snapshot || '[]') : row.order_items_snapshot || [],
  total: Number(row.order_final_amt),
  address: typeof row.order_delivery_address === 'string' ? JSON.parse(row.order_delivery_address || '{}') : row.order_delivery_address || {},
  payment: row.order_payment_method,
  status: String(row.order_status || 'Pending').toLowerCase(),
  createdAt: row.order_date,
});

const paymentMethod = (payment) => {
  const normalized = String(payment || '').toLowerCase();
  if (normalized === 'card') return 'CreditCard';
  if (normalized === 'gcash') return 'GCash';
  if (normalized === 'paymaya') return 'PayMaya';
  if (normalized === 'banktransfer') return 'BankTransfer';
  return 'COD';
};

const userSelect = `
  SELECT u.*, s.sell_store_name, s.sell_b_name, s.sell_b_permit_no
  FROM users u
  LEFT JOIN sellers s ON s.sell_user_id = u.user_id
`;

app.get('/api', (_req, res) => {
  res.json({ ok: true, service: 'lazada-ph-api' });
});

app.get('/api/bootstrap', async (_req, res, next) => {
  if (!dbReady) {
    res.json({
      users: memoryUsers,
      products: memoryProducts,
      orders: memoryOrders,
      mode: 'memory',
    });
    return;
  }

  try {
    const [users, products, orders] = await Promise.all([
      query(`${userSelect} ORDER BY u.date_registered ASC, u.user_id ASC`),
      query(`
        SELECT p.*, c.cat_slug
        FROM products p
        JOIN categories c ON c.cat_id = p.prod_cat_id
        ORDER BY p.date_added DESC, p.prod_id ASC
      `),
      query('SELECT * FROM orders ORDER BY order_date DESC'),
    ]);
    res.json({
      users: users.map(toUser),
      products: products.map(toProduct),
      orders: orders.map(toOrder),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const {
      email,
      password,
      name,
      role,
      storeName = null,
      businessName = null,
      idDocument = null,
      phone = '+630000000000',
      address = null,
      firstName = null,
      middleInitial = null,
      lastName = null,
    } = req.body;
    if (!dbReady) {
      if (memoryUsers.find((user) => user.email === email || user.phone === phone)) return res.status(409).json({ msg: 'Account already registered' });
      const user = {
        id: `u_${Date.now()}`,
        email,
        password,
        name,
        role,
        verified: role === 'buyer',
        phone,
        address,
        storeName: role === 'seller' ? storeName : null,
        businessName: role === 'seller' ? businessName : null,
        idDocument: role === 'seller' ? idDocument : null,
        createdAt: new Date().toISOString(),
      };
      memoryUsers = [...memoryUsers, user];
      res.status(201).json({ user });
      return;
    }

    const existing = await query('SELECT user_id FROM users WHERE user_email = :email OR user_phone_no = :phone LIMIT 1', { email, phone });
    if (existing.length) return res.status(409).json({ msg: 'Account already registered' });

    const names = firstName || lastName
      ? {
          firstName: [firstName, middleInitial].filter(Boolean).join(' '),
          lastName: lastName || 'User',
        }
      : splitName(name);
    const user = {
      id: nextId(100000),
      email,
      password,
      name: name || [firstName, middleInitial, lastName].filter(Boolean).join(' '),
      role,
      verified: role === 'buyer',
      phone,
      address,
      storeName: role === 'seller' ? storeName : null,
      businessName: role === 'seller' ? businessName : null,
      idDocument: role === 'seller' ? idDocument : null,
      createdAt: new Date().toISOString(),
    };

    await query(
      `INSERT INTO users
        (user_id, user_fname, user_lname, user_email, user_pwdhash, user_phone_no, user_default_address, user_role, user_verified, user_acct_stat)
       VALUES
        (:id, :firstName, :lastName, :email, :password, :phone, :address, :role, :verified, 'Active')`,
      {
        id: user.id,
        firstName: names.firstName,
        lastName: names.lastName,
        email,
        password,
        phone,
        address: address ? JSON.stringify(address) : null,
        role: normalizeRole(role),
        verified: user.verified ? 1 : 0,
      },
    );

    if (role === 'seller') await ensureSellerForUser(user);

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password, identifier = email } = req.body;
    if (!dbReady) {
      const user = memoryUsers.find((item) => (
        item.email === identifier ||
        item.phone === identifier ||
        String(item.phone || '').replace(/^\+63/, '') === identifier
      ) && item.password === password);
      if (!user) return res.status(401).json({ msg: 'Invalid credentials' });
      res.json({ user });
      return;
    }

    const rows = await query(
      `${userSelect}
       WHERE (u.user_email = :identifier OR u.user_phone_no = :identifier OR REPLACE(u.user_phone_no, '+63', '') = :identifier)
         AND u.user_pwdhash = :password
       LIMIT 1`,
      { identifier, password },
    );
    if (!rows.length) return res.status(401).json({ msg: 'Invalid credentials' });
    res.json({ user: toUser(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/users/:id', async (req, res, next) => {
  try {
    const { verified, storeName, businessName, idDocument, name, role, sellerType } = req.body;
    if (!dbReady) {
      const existing = memoryUsers.find((user) => user.id === req.params.id);
      if (!existing) return res.status(404).json({ msg: 'User not found' });
      const updated = {
        ...existing,
        verified: verified ?? existing.verified,
        storeName: storeName ?? existing.storeName,
        businessName: businessName ?? existing.businessName,
        idDocument: idDocument ?? existing.idDocument,
        name: name ?? existing.name,
        role: role ?? existing.role,
        sellerType: sellerType ?? existing.sellerType,
      };
      memoryUsers = memoryUsers.map((user) => (user.id === req.params.id ? updated : user));
      res.json({ user: updated });
      return;
    }

    const names = name ? splitName(name) : { firstName: null, lastName: null };
    await query(
      `UPDATE users
       SET user_verified = COALESCE(:verified, user_verified),
           user_fname = COALESCE(:firstName, user_fname),
           user_lname = COALESCE(:lastName, user_lname),
           user_role = COALESCE(:role, user_role)
       WHERE user_id = :id`,
      {
        id: req.params.id,
        verified: verified === undefined ? null : verified ? 1 : 0,
        firstName: names.firstName,
        lastName: names.lastName,
        role: role ? normalizeRole(role) : null,
      },
    );

    const rows = await query(`${userSelect} WHERE u.user_id = :id LIMIT 1`, { id: req.params.id });
    if (!rows.length) return res.status(404).json({ msg: 'User not found' });
    const updated = toUser(rows[0]);

    if (updated.role === 'seller') {
      await ensureSellerForUser({
        ...updated,
        storeName: storeName ?? updated.storeName,
        businessName: businessName ?? updated.businessName,
        idDocument: idDocument ?? updated.idDocument,
      });
      await query(
        `UPDATE sellers
         SET sell_b_name = COALESCE(:businessName, sell_b_name),
             sell_store_name = COALESCE(:storeName, sell_store_name),
             sell_b_permit_no = COALESCE(:idDocument, sell_b_permit_no),
             sell_store_status = :status
         WHERE sell_user_id = :id`,
        {
          id: req.params.id,
          businessName: businessName ?? null,
          storeName: storeName || sellerType || null,
          idDocument: idDocument ?? null,
          status: (verified ?? updated.verified) ? 'Active' : 'Pending',
        },
      );
    }

    const refreshed = await query(`${userSelect} WHERE u.user_id = :id LIMIT 1`, { id: req.params.id });
    res.json({ user: toUser(refreshed[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', async (req, res, next) => {
  try {
    const product = {
      ...req.body,
      id: nextId(10000000),
      rating: 0,
      sold: 0,
      images: req.body.images || [req.body.image],
      originalPrice: req.body.originalPrice || req.body.price,
      discount: req.body.discount || 0,
    };
    if (!dbReady) {
      memoryProducts = [product, ...memoryProducts];
      res.status(201).json({ product });
      return;
    }

    const sellerRows = await query('SELECT sell_id FROM sellers WHERE sell_user_id = :userId LIMIT 1', {
      userId: req.body.sellerId,
    });
    const sellerId = sellerRows[0]?.sell_id || await ensureSellerForUser({
      id: req.body.sellerId,
      name: 'Lazada Seller',
      verified: false,
    });
    const categoryId = ids.categoryIdBySlug.get(req.body.category) || ids.categoryIdBySlug.get(CATEGORIES[0].id);

    await query(
      `INSERT INTO products
        (prod_id, prod_sell_id, prod_cat_id, prod_name, prod_desc, prod_price, prod_stock_qty, prod_brand,
         prod_weight, prod_status, prod_sku, prod_condition, prod_avr_rating, prod_review_count,
         prod_total_sold, prod_discount_percent, prod_specs, prod_original_price, prod_image, prod_images)
       VALUES
        (:id, :sellerId, :categoryId, :name, :description, :price, :stock, :brand,
         :weight, 'Active', :sku, 'New', :rating, 0,
         :sold, :discount, :specs, :originalPrice, :image, :images)`,
      {
        ...product,
        sellerId,
        categoryId,
        weight: product.weight || 1,
        sku: product.sku || `SKU-${product.id}`,
        specs: JSON.stringify(product.specs || {}),
        images: JSON.stringify(product.images),
      },
    );
    res.status(201).json({ product: { ...product, sellerId } });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    if (!dbReady) {
      memoryProducts = memoryProducts.filter((product) => product.id !== req.params.id);
      res.status(204).end();
      return;
    }

    await query('DELETE FROM products WHERE prod_id = :id', { id: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const { userId, items, address, payment } = req.body;
    const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
    const order = {
      id: nextId(10000000),
      userId,
      items,
      total,
      address,
      payment,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    if (!dbReady) {
      memoryOrders = [order, ...memoryOrders];
      res.status(201).json({ order });
      return;
    }

    const method = paymentMethod(payment);
    await query(
      `INSERT INTO orders
        (order_id, order_user_id, order_total_amt, order_discount_amt, order_final_amt,
         order_payment_status, order_status, order_delivery_address, order_items_snapshot, order_payment_method)
       VALUES
        (:id, :userId, :total, 0, :total, :paymentStatus, 'Pending', :address, :items, :payment)`,
      {
        id: order.id,
        userId,
        total,
        paymentStatus: method === 'COD' ? 'Pending' : 'Paid',
        address: JSON.stringify(address),
        items: JSON.stringify(items),
        payment,
      },
    );

    for (const [index, item] of items.entries()) {
      await query(
        `INSERT INTO order_items
          (oitem_id, oitem_order_id, oitem_prod_id, oitem_quantity, oitem_unit_price, oitem_subtotal, oitem_item_status)
         VALUES
          (:id, :orderId, :productId, :quantity, :unitPrice, :subtotal, 'Pending')`,
        {
          id: order.id + index + 1,
          orderId: order.id,
          productId: item.id,
          quantity: item.qty,
          unitPrice: item.price,
          subtotal: Number(item.price) * Number(item.qty),
        },
      );
    }

    await query(
      `INSERT INTO payments
        (paymt_id, paymt_order_id, paymt_method, paymt_amount_paid, paymt_transac_ref, paymt_status, paymt_gateway)
       VALUES
        (:id, :orderId, :method, :amount, :ref, :status, :gateway)`,
      {
        id: order.id,
        orderId: order.id,
        method,
        amount: total,
        ref: `PAY-${order.id}`,
        status: method === 'COD' ? 'Pending' : 'Completed',
        gateway: ids.paymentGatewayFromMethod(method),
      },
    );

    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
});

app.use((err, _req, res) => {
  console.error(err);
  res.status(500).json({ msg: 'Server error', detail: err.message });
});

ensureSeedData()
  .then(() => app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
    if (!dbReady) console.log('Database is not configured; using in-memory mock data.');
  }))
  .catch((error) => {
    dbReady = false;
    console.warn('Database unavailable; using in-memory mock data.');
    console.warn(error.message);
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  });
