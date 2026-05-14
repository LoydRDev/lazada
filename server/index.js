import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { DEFAULT_ADMIN, PRODUCTS } from '../src/data/mock.js';
import { isDbConfigured, query } from './db.js';
import { ensureSeedData } from './seed.js';

const app = express();
const port = Number(process.env.PORT || 4000);
let dbReady = isDbConfigured;
let memoryUsers = [DEFAULT_ADMIN];
let memoryProducts = PRODUCTS;
let memoryOrders = [];

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

const toUser = (row) => ({
  id: row.id,
  email: row.email,
  password: row.password,
  name: row.name,
  role: row.role,
  verified: Boolean(row.verified),
  businessName: row.business_name,
  idDocument: row.id_document,
  createdAt: row.created_at,
});

const toProduct = (row) => ({
  id: row.id,
  name: row.name,
  price: Number(row.price),
  originalPrice: Number(row.original_price),
  image: row.image,
  category: row.category,
  rating: Number(row.rating),
  sold: Number(row.sold),
  sellerId: row.seller_id,
  stock: Number(row.stock),
  discount: Number(row.discount),
  brand: row.brand,
  description: row.description,
  images: typeof row.images === 'string' ? JSON.parse(row.images || '[]') : row.images || [],
});

const toOrder = (row) => ({
  id: row.id,
  userId: row.user_id,
  items: typeof row.items === 'string' ? JSON.parse(row.items || '[]') : row.items || [],
  total: Number(row.total),
  address: typeof row.address === 'string' ? JSON.parse(row.address || '{}') : row.address || {},
  payment: row.payment,
  status: row.status,
  createdAt: row.created_at,
});

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
      query('SELECT * FROM users ORDER BY created_at ASC'),
      query('SELECT * FROM products ORDER BY created_at DESC, id ASC'),
      query('SELECT * FROM orders ORDER BY created_at DESC'),
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
    const { email, password, name, role, businessName = null, idDocument = null } = req.body;
    if (!dbReady) {
      if (memoryUsers.find((user) => user.email === email)) return res.status(409).json({ msg: 'Email already registered' });
      const user = {
        id: `u_${Date.now()}`,
        email,
        password,
        name,
        role,
        verified: role === 'buyer',
        businessName: role === 'seller' ? businessName : null,
        idDocument: role === 'seller' ? idDocument : null,
        createdAt: new Date().toISOString(),
      };
      memoryUsers = [...memoryUsers, user];
      res.status(201).json({ user });
      return;
    }

    const existing = await query('SELECT id FROM users WHERE email = :email LIMIT 1', { email });
    if (existing.length) return res.status(409).json({ msg: 'Email already registered' });

    const user = {
      id: `u_${Date.now()}`,
      email,
      password,
      name,
      role,
      verified: role === 'buyer',
      businessName: role === 'seller' ? businessName : null,
      idDocument: role === 'seller' ? idDocument : null,
      createdAt: new Date().toISOString(),
    };

    await query(
      `INSERT INTO users
        (id, email, password, name, role, verified, business_name, id_document)
       VALUES
        (:id, :email, :password, :name, :role, :verified, :businessName, :idDocument)`,
      { ...user, verified: user.verified ? 1 : 0 },
    );

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!dbReady) {
      const user = memoryUsers.find((item) => item.email === email && item.password === password);
      if (!user) return res.status(401).json({ msg: 'Invalid credentials' });
      res.json({ user });
      return;
    }

    const rows = await query(
      'SELECT * FROM users WHERE email = :email AND password = :password LIMIT 1',
      { email, password },
    );
    if (!rows.length) return res.status(401).json({ msg: 'Invalid credentials' });
    res.json({ user: toUser(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/users/:id', async (req, res, next) => {
  try {
    const { verified, businessName, idDocument, name, role, sellerType } = req.body;
    if (!dbReady) {
      const existing = memoryUsers.find((user) => user.id === req.params.id);
      if (!existing) return res.status(404).json({ msg: 'User not found' });
      const updated = {
        ...existing,
        verified: verified ?? existing.verified,
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

    await query(
      `UPDATE users
       SET verified = COALESCE(:verified, verified),
           business_name = COALESCE(:businessName, business_name),
           id_document = COALESCE(:idDocument, id_document),
           name = COALESCE(:name, name),
           role = COALESCE(:role, role)
       WHERE id = :id`,
      {
        id: req.params.id,
        verified: verified === undefined ? null : verified ? 1 : 0,
        businessName: businessName ?? null,
        idDocument: idDocument ?? null,
        name: name ?? null,
        role: role ?? null,
      },
    );
    const rows = await query('SELECT * FROM users WHERE id = :id LIMIT 1', { id: req.params.id });
    res.json({ user: toUser(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', async (req, res, next) => {
  try {
    const product = {
      ...req.body,
      id: `sp_${Date.now()}`,
      rating: 0,
      sold: 0,
      images: req.body.images || [req.body.image],
    };
    if (!dbReady) {
      memoryProducts = [product, ...memoryProducts];
      res.status(201).json({ product });
      return;
    }

    await query(
      `INSERT INTO products
        (id, name, price, original_price, image, category, rating, sold, seller_id, stock, discount, brand, description, images)
       VALUES
        (:id, :name, :price, :originalPrice, :image, :category, :rating, :sold, :sellerId, :stock, :discount, :brand, :description, :images)`,
      { ...product, images: JSON.stringify(product.images) },
    );
    res.status(201).json({ product });
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

    await query('DELETE FROM products WHERE id = :id', { id: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const { userId, items, address, payment } = req.body;
    const order = {
      id: `ORD-${Date.now()}`,
      userId,
      items,
      total: items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0),
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

    await query(
      `INSERT INTO orders (id, user_id, items, total, address, payment, status)
       VALUES (:id, :userId, :items, :total, :address, :payment, :status)`,
      {
        ...order,
        items: JSON.stringify(order.items),
        address: JSON.stringify(order.address),
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
