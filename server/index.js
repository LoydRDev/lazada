import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { CATEGORIES, PRODUCTS, SELLERS } from '../src/data/catalog.js';
import { DEFAULT_ADMIN } from '../src/data/defaultUsers.js';
import { query } from './db.js';
import { ensureSellerForUser, ids } from './seed.js';
import { loadNoSqlStore, nosqlDbPath, saveNoSqlStore } from './nosqlStore.js';
import {
  firebaseStoreName,
  isFirebaseConfigured,
  loadFirebaseStore,
  saveFirebaseStore,
} from './firebaseStore.js';

const app = express();
const port = Number(process.env.PORT || 4000);
let dbReady = false;
const defaultCategories = CATEGORIES.map((category, index) => ({
  id: category.id,
  slug: category.id,
  name: category.name,
  description: category.description || '',
  icon: category.icon || '',
  status: category.hidden ? 'Inactive' : 'Active',
  sortOrder: index,
  subcategories: category.subcategories || [],
}));
const defaultDrivers = [
  { id: 700001, name: 'Juan Dela Cruz', phone: '+639171110001', vehicle: 'Motorcycle', plate: 'NCR-1021', company: 'Lazada Logistics' },
  { id: 700002, name: 'Maria Santos', phone: '+639171110002', vehicle: 'Van', plate: 'NCR-2045', company: 'Lazada Logistics' },
  { id: 700003, name: 'Carlo Reyes', phone: '+639171110003', vehicle: 'Motorcycle', plate: 'NCR-7788', company: 'Lazada Express' },
];

const driverUsers = (drivers) => drivers.map((driver) => ({
  id: driver.id,
  email: `${driver.name.toLowerCase().replace(/\s+/g, '.')}@driver.lazada.ph`,
  password: 'driver123',
  name: driver.name,
  role: 'driver',
  verified: true,
  phone: driver.phone,
}));

const buildSellerDocuments = (users = [], products = []) => {
  const sellers = new Map(SELLERS.map((seller) => [String(seller.id), {
    id: seller.id,
    userId: null,
    storeName: seller.name,
    businessName: seller.name,
    name: seller.name,
    verified: Boolean(seller.verified),
    rating: seller.rating || 0,
    productCount: products.filter((product) => String(product.sellerId) === String(seller.id)).length || seller.products || 0,
    followers: seller.followers || '0',
    status: seller.verified ? 'Active' : 'Pending',
  }]));

  users
    .filter((user) => denormalizeRole(user.role) === 'seller')
    .forEach((user) => {
      const id = String(user.sellerId || user.id);
      sellers.set(id, {
        id,
        userId: user.id,
        storeName: user.storeName || user.businessName || `${user.name}'s Store`,
        businessName: user.businessName || user.storeName || `${user.name}'s Business`,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        verified: Boolean(user.verified),
        rating: user.rating || 0,
        productCount: products.filter((product) => String(product.sellerId) === id || String(product.sellerId) === String(user.id)).length,
        followers: user.followers || '0',
        status: user.verified ? 'Active' : 'Pending',
        idDocument: user.idDocument || null,
        createdAt: user.createdAt || null,
      });
    });

  return [...sellers.values()];
};

const defaultNoSqlCollections = () => ({
  users: [DEFAULT_ADMIN, ...driverUsers(defaultDrivers)],
  sellers: buildSellerDocuments([DEFAULT_ADMIN, ...driverUsers(defaultDrivers)], PRODUCTS),
  products: PRODUCTS,
  orders: [],
  reviews: [],
  categories: defaultCategories,
  adminLogs: [],
  removedProducts: [],
  drivers: defaultDrivers,
});

let memoryUsers = [];
let memoryProducts = [];
let memoryOrders = [];
let memoryReviews = [];
let memoryCategories = [];
let memoryAdminLogs = [];
let memoryRemovedProducts = [];
let memoryDrivers = [];
let activeNoSqlMode = 'nosql';
let activeStoreName = `local JSON document store (${nosqlDbPath})`;
let saveCollections = saveNoSqlStore;

const applyNoSqlCollections = (collections) => {
  memoryDrivers = collections.drivers;
  const requiredUsers = [DEFAULT_ADMIN, ...driverUsers(memoryDrivers)];
  memoryUsers = [
    ...requiredUsers.filter((required) => !collections.users.some((user) => String(user.id) === String(required.id))),
    ...collections.users,
  ];
  memoryProducts = collections.products;
  memoryOrders = collections.orders;
  memoryReviews = collections.reviews;
  memoryCategories = collections.categories;
  memoryAdminLogs = collections.adminLogs;
  memoryRemovedProducts = collections.removedProducts;
};

const saveNoSqlState = () => saveCollections({
  users: memoryUsers,
  sellers: buildSellerDocuments(memoryUsers, memoryProducts),
  products: memoryProducts,
  orders: memoryOrders,
  reviews: memoryReviews,
  categories: memoryCategories,
  adminLogs: memoryAdminLogs,
  removedProducts: memoryRemovedProducts,
  drivers: memoryDrivers,
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '8mb' }));

const authSecret = process.env.AUTH_SECRET || 'lazada-ph-dev-secret';

const encodeTokenPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const signTokenPayload = (payloadPart) => crypto.createHmac('sha256', authSecret).update(payloadPart).digest('base64url');
const createToken = (user) => {
  const payload = encodeTokenPart({
    id: user.id,
    role: denormalizeRole(user.role),
    email: user.email,
    issuedAt: Date.now(),
  });
  return `${payload}.${signTokenPayload(payload)}`;
};

const verifyToken = (token) => {
  if (!token || !token.includes('.')) return null;
  const [payloadPart, signature] = token.split('.');
  if (signature !== signTokenPayload(payloadPart)) return null;
  try {
    return JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

const normalizeRole = (role = 'buyer') => {
  const value = String(role).toLowerCase();
  if (value === 'seller') return 'Seller';
  if (value === 'admin') return 'Admin';
  if (value === 'driver') return 'Driver';
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

const workflowStatuses = [
  'pending_approval',
  'approved',
  'rejected',
  'to_be_packed',
  'packed',
  'to_be_shipped',
  'shipping',
  'delivered',
  'completed',
  'cancelled',
];

const reviewableStatuses = ['delivered', 'completed'];
const sellerActionTargets = {
  approve: 'to_be_packed',
  reject: 'rejected',
  packed: 'packed',
  to_be_shipped: 'to_be_shipped',
  shipping: 'shipping',
  delivered: 'delivered',
  completed: 'completed',
};

const allowedPreviousStatus = {
  to_be_packed: ['pending_approval', 'approved'],
  rejected: ['pending_approval', 'approved', 'to_be_packed'],
  packed: ['to_be_packed'],
  to_be_shipped: ['packed'],
  shipping: ['to_be_shipped', 'packed'],
  delivered: ['shipping'],
  completed: ['delivered'],
  cancelled: ['pending_approval'],
};

const normalizeOrderStatus = (status = 'pending_approval') => {
  const normalized = String(status).toLowerCase();
  const legacy = {
    pending: 'pending_approval',
    processing: 'to_be_packed',
    shipped: 'shipping',
    returned: 'cancelled',
  };
  const mapped = legacy[normalized] || normalized;
  return workflowStatuses.includes(mapped) ? mapped : 'pending_approval';
};

const toDriver = (row) => ({
  id: row.cr_id,
  name: row.cr_name,
  phone: row.cr_phone_no,
  vehicle: row.cr_vehicle_type,
  plate: row.cr_plate_no,
  company: row.cr_company,
});

const trackingNumber = (orderId, orderItemId) => `LZD-${orderId}-${orderItemId}`;

const toCategory = (row) => ({
  id: row.cat_slug,
  slug: row.cat_slug,
  name: row.cat_name,
  description: row.cat_description || '',
  icon: row.cat_icon || '',
  status: row.cat_status || 'Active',
  active: row.cat_status === 'Active',
  parentId: row.cat_parent_category_id || null,
});

const toCategoryTree = (rows = []) => {
  const categoriesById = new Map();
  const childrenByParentId = new Map();

  rows.forEach((row) => {
    if (row.cat_parent_category_id) {
      const children = childrenByParentId.get(row.cat_parent_category_id) || [];
      children.push(row);
      childrenByParentId.set(row.cat_parent_category_id, children);
      return;
    }

    categoriesById.set(row.cat_id, {
      ...toCategory(row),
      subcategories: [],
    });
  });

  childrenByParentId.forEach((children, parentId) => {
    const parent = categoriesById.get(parentId);
    if (!parent) return;
    parent.subcategories = children.map((child) => child.cat_name);
  });

  return [...categoriesById.values()];
};

const activeMemoryCategories = () => memoryCategories.filter((category) => category.status === 'Active');

const logAdminAction = async (adminId, action, detail = {}) => {
  const entry = {
    id: nextId(60000000),
    adminId,
    action,
    detail,
    createdAt: new Date().toISOString(),
  };
  if (!dbReady) {
    memoryAdminLogs = [entry, ...memoryAdminLogs];
    await saveNoSqlState();
    return entry;
  }
  await query(
    `INSERT INTO admin_logs (log_id, admin_user_id, action, detail, created_at)
     VALUES (:id, :adminId, :action, :detail, CURRENT_TIMESTAMP)`,
    { ...entry, detail: JSON.stringify(detail) },
  );
  return entry;
};

const aggregateOrderStatus = (items = []) => {
  const statuses = items.map((item) => normalizeOrderStatus(item.status));
  if (!statuses.length) return 'pending_approval';
  if (statuses.every((status) => status === 'cancelled')) return 'cancelled';
  if (statuses.every((status) => status === 'rejected')) return 'rejected';
  if (statuses.every((status) => ['delivered', 'completed', 'cancelled', 'rejected'].includes(status))) return 'delivered';
  if (statuses.some((status) => status === 'shipping')) return 'shipping';
  if (statuses.some((status) => ['packed', 'to_be_shipped'].includes(status))) return 'to_be_shipped';
  if (statuses.some((status) => ['approved', 'to_be_packed'].includes(status))) return 'to_be_packed';
  if (statuses.some((status) => status === 'pending_approval')) return 'pending_approval';
  return statuses[0];
};

const productIdFromCartItem = (item) => {
  const raw = String(item.productId || item.id).split(/[-:]/)[0];
  const numeric = Number(raw);
  return Number.isNaN(numeric) ? raw : numeric;
};

const variantIdFromCartItem = (item) => {
  const explicit = item.variantId || item.variant_id;
  if (explicit) return Number.isNaN(Number(explicit)) ? explicit : Number(explicit);
  const id = String(item.id || '');
  if (!id.includes(':')) return null;
  const raw = id.split(':')[1];
  return Number.isNaN(Number(raw)) ? raw : Number(raw);
};

const optionEntries = (value = {}) => Object.entries(value || {})
  .filter(([, option]) => String(option || '').trim())
  .map(([name, option]) => [String(name).trim(), String(option).trim()]);

const variantNameFromOptions = (options = {}) => optionEntries(options).map(([, value]) => value).join(' / ');

const normalizeVariantGroups = (groups = []) => groups
  .map((group, index) => {
    const name = String(group.name || group.label || '').trim();
    const values = Array.isArray(group.values || group.options)
      ? (group.values || group.options)
      : String(group.values || '').split(',');
    return {
      id: group.id || group.groupId || `group-${index + 1}`,
      name,
      values: values.map((value) => String(value).trim()).filter(Boolean),
    };
  })
  .filter((group) => group.name && group.values.length);

const normalizeProductVariant = (variant, productId, index, defaults = {}) => {
  const selectedOptions = variant.selectedOptions || variant.attributes || {};
  const variantName = variant.variantName || variant.name || variantNameFromOptions(selectedOptions) || `Variant ${index + 1}`;
  const numericVariantId = Number(variant.variantId || variant.id);
  const variantId = Number.isNaN(numericVariantId) ? Number(`${productId}${index + 1}`) : numericVariantId;
  const skuBase = variant.sku || `${defaults.sku || `SKU-${productId}`}-${variantName}`;
  return {
    id: variantId,
    variantId,
    productId,
    sku: String(skuBase).toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/(^-|-$)/g, '') || `SKU-${productId}-${index + 1}`,
    variantName,
    name: variantName,
    attributes: Object.fromEntries(optionEntries(selectedOptions)),
    selectedOptions: Object.fromEntries(optionEntries(selectedOptions)),
    price: Number(variant.price ?? defaults.price ?? 0),
    stock: Number(variant.stock ?? defaults.stock ?? 0),
    image: variant.image || variant.imageUrl || defaults.image || '',
    imageUrl: variant.image || variant.imageUrl || defaults.image || '',
    status: String(variant.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
  };
};

const discountPercent = (price, originalPrice) => {
  const current = Number(price || 0);
  const original = Number(originalPrice || 0);
  if (!current || !original || original <= current) return 0;
  return Math.max(0, Math.round((1 - current / original) * 100));
};

const prepareProductPayload = (body) => {
  const productId = body.id || nextId(10000000);
  const price = Number(body.price || 0);
  const originalPrice = Math.max(Number(body.originalPrice || price), price);
  const images = (body.images?.length ? body.images : [body.image]).filter(Boolean);
  const variantGroups = normalizeVariantGroups(body.variantGroups || body.variantOptions || body.specs?.variantGroups || []);
  const hasVariants = Boolean(body.hasVariants ?? body.variants?.length);
  const variants = hasVariants
    ? (body.variants || body.specs?.variants || []).map((variant, index) => normalizeProductVariant(variant, productId, index, {
        price: body.price,
        stock: body.stock,
        image: images[0] || body.image,
        sku: body.sku,
      }))
    : [];

  return {
    ...body,
    id: productId,
    rating: 0,
    sold: 0,
    images,
    image: body.image || images[0],
    price,
    originalPrice,
    discount: discountPercent(price, originalPrice),
    hasVariants: variants.length > 0,
    variantGroups,
    variants,
    specs: {
      ...(body.specs || {}),
      subcategory: body.subcategory || body.specs?.subcategory || '',
      specGroups: body.specGroups || body.specs?.specGroups || [],
      variantGroups,
      hasVariants: variants.length > 0,
      variants,
      weight: body.weight || body.specs?.weight || '',
      dimensions: body.dimensions || body.specs?.dimensions || {},
      shippingFee: body.shippingFee || body.specs?.shippingFee || 0,
    },
  };
};

const syncProductVariantTables = async (product) => {
  await query('DELETE FROM product_images WHERE product_id = :productId', { productId: product.id });
  await query('DELETE FROM product_variant_groups WHERE product_id = :productId', { productId: product.id });
  await query('DELETE FROM product_variants WHERE product_id = :productId', { productId: product.id });

  for (const [index, image] of (product.images || []).entries()) {
    await query(
      `INSERT INTO product_images (image_id, product_id, image_url, sort_order)
       VALUES (:id, :productId, :imageUrl, :sortOrder)`,
      { id: product.id * 10 + index + 1, productId: product.id, imageUrl: image, sortOrder: index },
    );
  }

  let optionIndex = 0;
  for (const [groupIndex, group] of (product.variantGroups || []).entries()) {
    const groupId = product.id * 10 + groupIndex + 1;
    await query(
      `INSERT INTO product_variant_groups (group_id, product_id, name)
       VALUES (:id, :productId, :name)`,
      { id: groupId, productId: product.id, name: group.name },
    );
    for (const value of group.values) {
      optionIndex += 1;
      await query(
        `INSERT INTO product_variant_options (option_id, group_id, value)
         VALUES (:id, :groupId, :value)`,
        { id: product.id * 100 + optionIndex, groupId, value },
      );
    }
  }

  for (const variant of product.variants || []) {
    await query(
      `INSERT INTO product_variants
        (variant_id, product_id, sku, variant_name, price, stock, image_url, status, selected_options)
       VALUES
        (:variantId, :productId, :sku, :variantName, :price, :stock, :imageUrl, :status, :selectedOptions)`,
      {
        variantId: variant.variantId,
        productId: product.id,
        sku: variant.sku,
        variantName: variant.variantName,
        price: variant.price,
        stock: variant.stock,
        imageUrl: variant.imageUrl || variant.image || null,
        status: variant.status,
        selectedOptions: JSON.stringify(variant.selectedOptions || {}),
      },
    );
  }
};

const toUser = (row) => ({
  id: row.user_id,
  email: row.user_email,
  password: row.user_pwdhash,
  name: `${row.user_fname} ${row.user_lname}`.trim(),
  role: denormalizeRole(row.user_role),
  verified: Boolean(row.user_verified),
  phone: row.user_phone_no,
  address: userAddress(row),
  sellerId: row.sell_id || null,
  storeName: row.sell_store_name || null,
  businessName: row.sell_b_name || null,
  idDocument: row.sell_b_permit_no || null,
  createdAt: row.date_registered,
});

const toProduct = (row) => {
  const specs = typeof row.prod_specs === 'string' ? JSON.parse(row.prod_specs || '{}') : row.prod_specs || {};
  const price = Number(row.prod_price);
  const originalPrice = Math.max(Number(row.prod_original_price || price), price);
  const variants = (specs.variants || []).map((variant, index) => normalizeProductVariant(variant, row.prod_id, index, {
    price: row.prod_price,
    stock: row.prod_stock_qty,
    image: row.prod_image,
    sku: row.prod_sku,
  }));

  return {
    id: row.prod_id,
    name: row.prod_name,
    price,
    originalPrice,
    image: row.prod_image,
    category: row.cat_slug || CATEGORIES[0].id,
    subcategory: specs.subcategory || '',
    rating: Number(row.prod_avr_rating || 0),
    sold: Number(row.prod_total_sold || 0),
    sellerId: row.prod_sell_id,
    stock: Number(row.prod_stock_qty),
    discount: discountPercent(price, originalPrice),
    brand: row.prod_brand || '',
    description: row.prod_desc,
    images: typeof row.prod_images === 'string' ? JSON.parse(row.prod_images || '[]') : row.prod_images || [],
    specs,
    specGroups: specs.specGroups || [],
    variantGroups: specs.variantGroups || [],
    hasVariants: Boolean(specs.hasVariants || variants.length),
    variants,
  };
};

const readJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeOrderItem = (order, item, index = 0) => {
  const productId = productIdFromCartItem(item);
  const variantId = variantIdFromCartItem(item);
  const product = memoryProducts.find((entry) => String(entry.id) === String(productId));
  const review = memoryReviews.find((entry) => String(entry.orderItemId) === String(item.orderItemId || item.id));

  return {
    orderItemId: item.orderItemId || item.oitem_id || Number(`${order.id}${index + 1}`),
    orderId: order.id,
    productId,
    variantId,
    variantName: item.variantName || item.name || null,
    selectedOptions: item.selectedOptions || item.attributes || {},
    sku: item.sku || null,
    driver: item.driver || null,
    trackingNumber: item.trackingNumber || null,
    deliveryStatus: item.deliveryStatus || null,
    sellerId: item.sellerId || product?.sellerId,
    buyerId: item.buyerId || order.userId,
    name: item.name || product?.name || 'Product',
    image: item.image || product?.image || '',
    qty: Number(item.qty || item.quantity || 1),
    price: Number(item.price || item.unitPrice || 0),
    subtotal: Number(item.subtotal || Number(item.price || item.unitPrice || 0) * Number(item.qty || item.quantity || 1)),
    status: normalizeOrderStatus(item.status),
    createdAt: item.createdAt || order.createdAt,
    updatedAt: item.updatedAt || order.createdAt,
    reviewed: Boolean(review || item.reviewed),
    review: review || item.review || null,
  };
};

const toMemoryOrder = (order) => {
  const items = (order.items || []).map((item, index) => normalizeOrderItem(order, item, index));

  return {
    ...order,
    items,
    status: aggregateOrderStatus(items),
  };
};

const toOrderFromRows = (orderRow, itemRows = []) => {
  const snapshotItems = readJson(orderRow.order_items_snapshot, []);
  const snapshotByProduct = new Map(snapshotItems.map((item) => [`${productIdFromCartItem(item)}:${variantIdFromCartItem(item) || ''}`, item]));
  const items = itemRows.map((row, index) => {
    const snapshot = snapshotByProduct.get(`${row.oitem_prod_id}:${row.oitem_variant_id || ''}`) || snapshotItems[index] || {};
    const review = row.review_id ? {
      reviewId: row.review_id,
      orderId: row.review_order_id,
      orderItemId: row.review_order_item_id,
      productId: row.review_product_id,
      buyerId: row.review_buyer_id,
      rating: Number(row.review_rating),
      comment: row.review_comment || '',
      createdAt: row.review_created_at,
    } : null;

    return {
      orderItemId: row.oitem_id,
      orderId: row.oitem_order_id,
      productId: row.oitem_prod_id,
      variantId: row.oitem_variant_id || snapshot.variantId || null,
      variantName: row.oitem_variant_name || snapshot.variantName || null,
      selectedOptions: readJson(row.oitem_selected_options, snapshot.selectedOptions || {}),
      sku: snapshot.sku || null,
      driver: row.oitem_driver_id ? {
        id: row.oitem_driver_id,
        name: row.oitem_driver_name,
        phone: row.oitem_driver_phone,
        vehicle: row.oitem_driver_vehicle,
        trackingNumber: row.oitem_tracking_number,
      } : snapshot.driver || null,
      trackingNumber: row.oitem_tracking_number || snapshot.trackingNumber || null,
      deliveryStatus: row.oitem_delivery_status || snapshot.deliveryStatus || null,
      sellerId: row.oitem_sell_id || row.prod_sell_id || snapshot.sellerId,
      buyerId: row.oitem_buyer_id || orderRow.order_user_id,
      name: row.prod_name || snapshot.name || 'Product',
      image: row.prod_image || snapshot.image || '',
      qty: Number(row.oitem_quantity || snapshot.qty || 1),
      price: Number(row.oitem_unit_price || snapshot.price || 0),
      subtotal: Number(row.oitem_subtotal || Number(snapshot.price || 0) * Number(snapshot.qty || 1)),
      status: normalizeOrderStatus(row.oitem_item_status || orderRow.order_status),
      createdAt: row.oitem_created_at || orderRow.order_date,
      updatedAt: row.oitem_updated_at || orderRow.order_status_update,
      reviewed: Boolean(review),
      review,
    };
  });

  const fallbackItems = items.length
    ? items
    : snapshotItems.map((item, index) => normalizeOrderItem({
      id: orderRow.order_id,
      userId: orderRow.order_user_id,
      createdAt: orderRow.order_date,
    }, item, index));

  return {
    id: orderRow.order_id,
    userId: orderRow.order_user_id,
    items: fallbackItems,
    total: Number(orderRow.order_final_amt),
    address: readJson(orderRow.order_delivery_address, {}),
    payment: orderRow.order_payment_method,
    status: aggregateOrderStatus(fallbackItems),
    createdAt: orderRow.order_date,
  };
};

const groupOrderRows = (rows) => {
  const orderMap = new Map();

  rows.forEach((row) => {
    const orderId = row.order_id;
    if (!orderMap.has(orderId)) orderMap.set(orderId, { order: row, items: [] });
    if (row.oitem_id) orderMap.get(orderId).items.push(row);
  });

  return [...orderMap.values()].map(({ order, items }) => toOrderFromRows(order, items));
};

const paymentMethod = (payment) => {
  const normalized = String(payment || '').toLowerCase();
  if (normalized === 'card') return 'CreditCard';
  if (normalized === 'gcash') return 'GCash';
  if (normalized === 'paymaya') return 'PayMaya';
  if (normalized === 'banktransfer') return 'BankTransfer';
  return 'COD';
};

const normalizeRegistrationPhone = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return { phone: null };
  if (!/^[0-9\s()+.-]+$/.test(raw)) {
    return { error: 'Phone number can only use digits and common separators.' };
  }

  const digits = raw.replace(/\D/g, '');
  if (/^09\d{9}$/.test(digits)) return { phone: `+63${digits.slice(1)}` };
  if (/^9\d{9}$/.test(digits)) return { phone: `+63${digits}` };
  if (/^639\d{9}$/.test(digits)) return { phone: `+${digits}` };
  return { error: 'Use a valid Philippine mobile number, for example 09171234567.' };
};

const userSelect = `
  SELECT u.*, s.sell_id, s.sell_store_name, s.sell_b_name, s.sell_b_permit_no
  FROM users u
  LEFT JOIN sellers s ON s.sell_user_id = u.user_id
`;

const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verifyToken(token);
    if (!payload?.id) return res.status(401).json({ msg: 'Authentication required.' });

    if (!dbReady) {
      const user = memoryUsers.find((entry) => String(entry.id) === String(payload.id));
      if (!user) return res.status(401).json({ msg: 'Invalid or expired session.' });
      req.user = user;
      return next();
    }

    const rows = await query(`${userSelect} WHERE u.user_id = :id LIMIT 1`, { id: payload.id });
    if (!rows.length) return res.status(401).json({ msg: 'Invalid or expired session.' });
    req.user = toUser(rows[0]);
    next();
  } catch (error) {
    next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  const allowed = roles.map((role) => String(role).toLowerCase());
  if (!req.user) return res.status(401).json({ msg: 'Authentication required.' });
  if (!allowed.includes(denormalizeRole(req.user.role))) return res.status(403).json({ msg: 'You do not have permission to perform this action.' });
  next();
};

const isAdminUser = (user) => denormalizeRole(user?.role) === 'admin';
const isSellerUser = (user) => denormalizeRole(user?.role) === 'seller';

const orderSelect = `
  SELECT
    o.*,
    oi.oitem_id,
    oi.oitem_order_id,
    oi.oitem_prod_id,
    oi.oitem_sell_id,
    oi.oitem_buyer_id,
    oi.oitem_quantity,
    oi.oitem_unit_price,
    oi.oitem_subtotal,
    oi.oitem_variant_id,
    oi.oitem_variant_name,
    oi.oitem_selected_options,
    oi.oitem_driver_id,
    oi.oitem_driver_name,
    oi.oitem_driver_phone,
    oi.oitem_driver_vehicle,
    oi.oitem_tracking_number,
    oi.oitem_delivery_status,
    oi.oitem_item_status,
    oi.oitem_created_at,
    oi.oitem_updated_at,
    p.prod_name,
    p.prod_image,
    p.prod_sell_id,
    pr.review_id,
    pr.order_id AS review_order_id,
    pr.order_item_id AS review_order_item_id,
    pr.product_id AS review_product_id,
    pr.buyer_id AS review_buyer_id,
    pr.rating AS review_rating,
    pr.comment AS review_comment,
    pr.created_at AS review_created_at
  FROM orders o
  LEFT JOIN order_items oi ON oi.oitem_order_id = o.order_id
  LEFT JOIN products p ON p.prod_id = oi.oitem_prod_id
  LEFT JOIN product_reviews pr ON pr.order_item_id = oi.oitem_id
`;

const orderSort = ' ORDER BY o.order_date DESC, oi.oitem_id ASC';

const loadOrders = async (where = '', params = {}) => {
  const rows = await query(`${orderSelect} ${where}${orderSort}`, params);
  return groupOrderRows(rows);
};

const findMemoryOrder = (orderId) => memoryOrders.map(toMemoryOrder).find((order) => String(order.id) === String(orderId));

const replaceMemoryOrder = async (updatedOrder) => {
  memoryOrders = memoryOrders.map((order) => (String(order.id) === String(updatedOrder.id) ? updatedOrder : order));
  await saveNoSqlState();
};

const addOrderHistory = async ({ orderId, orderItemId, previousStatus, nextStatus, changedById, changedByRole, note = null }) => {
  if (!dbReady) return;
  await query(
    `INSERT INTO order_status_history
      (history_id, order_id, order_item_id, previous_status, next_status, changed_by_id, changed_by_role, note)
     VALUES
      (:id, :orderId, :orderItemId, :previousStatus, :nextStatus, :changedById, :changedByRole, :note)`,
    {
      id: nextId(30000000),
      orderId,
      orderItemId,
      previousStatus,
      nextStatus,
      changedById,
      changedByRole,
      note,
    },
  );
};

const setDbOrderAggregateStatus = async (orderId) => {
  const [order] = await loadOrders('WHERE o.order_id = :orderId', { orderId });
  if (!order) return null;
  await query(
    `UPDATE orders
        SET order_status = :status,
            order_status_update = CURRENT_TIMESTAMP
      WHERE order_id = :orderId`,
    { orderId, status: order.status },
  );
  return order;
};

const getDbDriver = async (driverId) => {
  const rows = await query(
    "SELECT * FROM couriers WHERE cr_id = :driverId AND cr_status = 'Active' LIMIT 1",
    { driverId },
  );
  return rows[0] ? toDriver(rows[0]) : null;
};

app.get('/api', (_req, res) => {
  res.json({ ok: true, service: 'lazada-ph-api' });
});

app.get('/api/bootstrap', async (_req, res, next) => {
  if (!dbReady) {
    res.json({
      users: memoryUsers,
      products: memoryProducts,
      orders: memoryOrders.map(toMemoryOrder),
      drivers: memoryDrivers,
      categories: memoryCategories,
      mode: activeNoSqlMode,
    });
    return;
  }

  try {
    const [users, products, orders, drivers, categories] = await Promise.all([
      query(`${userSelect} ORDER BY u.date_registered ASC, u.user_id ASC`),
      query(`
        SELECT p.*, c.cat_slug
        FROM products p
        JOIN categories c ON c.cat_id = p.prod_cat_id
        ORDER BY p.date_added DESC, p.prod_id ASC
      `),
      loadOrders(),
      query("SELECT * FROM couriers WHERE cr_status = 'Active' ORDER BY cr_name"),
      query('SELECT * FROM categories ORDER BY cat_name ASC'),
    ]);
    res.json({
      users: users.map(toUser),
      products: products.map(toProduct),
      orders,
      drivers: drivers.map(toDriver),
      categories: toCategoryTree(categories),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/drivers', async (_req, res, next) => {
  try {
    if (!dbReady) {
      res.json({ drivers: memoryDrivers });
      return;
    }

    const drivers = await query("SELECT * FROM couriers WHERE cr_status = 'Active' ORDER BY cr_name");
    res.json({ drivers: drivers.map(toDriver) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/categories', authRequired, requireRole('admin'), async (_req, res, next) => {
  try {
    if (!dbReady) {
      res.json({ categories: memoryCategories });
      return;
    }
    const categories = await query('SELECT * FROM categories ORDER BY cat_name ASC');
    res.json({ categories: toCategoryTree(categories) });
  } catch (error) {
    next(error);
  }
});

const categorySlug = (name) => String(name || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

app.post('/api/admin/categories', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const icon = String(req.body.icon || '').trim();
    const status = ['Active', 'Inactive', 'Hidden'].includes(req.body.status) ? req.body.status : 'Active';
    if (!name) return res.status(400).json({ msg: 'Category name is required.' });
    const slug = categorySlug(req.body.slug || name);
    if (!slug) return res.status(400).json({ msg: 'Category slug is required.' });

    if (!dbReady) {
      if (memoryCategories.some((category) => category.name.toLowerCase() === name.toLowerCase() || category.slug === slug)) {
        return res.status(400).json({ msg: 'Category name already exists.' });
      }
      const category = { id: slug, slug, name, description, icon, status, subcategories: [] };
      memoryCategories = [...memoryCategories, category].sort((a, b) => a.name.localeCompare(b.name));
      await logAdminAction(req.user.id, 'category_created', { slug, name });
      res.status(201).json({ category });
      return;
    }

    const duplicate = await query('SELECT cat_id FROM categories WHERE LOWER(cat_name) = LOWER(:name) OR cat_slug = :slug LIMIT 1', { name, slug });
    if (duplicate.length) return res.status(400).json({ msg: 'Category name already exists.' });
    const id = nextId(10000);
    await query(
      `INSERT INTO categories (cat_id, cat_slug, cat_name, cat_description, cat_icon, cat_status)
       VALUES (:id, :slug, :name, :description, :icon, :status)`,
      { id, slug, name, description, icon, status },
    );
    await logAdminAction(req.user.id, 'category_created', { slug, name });
    res.status(201).json({ category: { id: slug, slug, name, description, icon, status, active: status === 'Active' } });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/categories/:slug', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const name = String(req.body.name || '').trim();
    const description = req.body.description === undefined ? undefined : String(req.body.description || '').trim();
    const icon = req.body.icon === undefined ? undefined : String(req.body.icon || '').trim();
    const status = req.body.status === undefined ? undefined : ['Active', 'Inactive', 'Hidden'].includes(req.body.status) ? req.body.status : null;
    if (req.body.name !== undefined && !name) return res.status(400).json({ msg: 'Category name is required.' });
    if (status === null) return res.status(400).json({ msg: 'Invalid category status.' });

    if (!dbReady) {
      const existing = memoryCategories.find((category) => category.slug === slug || category.id === slug);
      if (!existing) return res.status(404).json({ msg: 'Category not found.' });
      if (name && memoryCategories.some((category) => category.id !== existing.id && category.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ msg: 'Category name already exists.' });
      }
      const category = { ...existing, name: name || existing.name, description: description ?? existing.description, icon: icon ?? existing.icon, status: status ?? existing.status };
      memoryCategories = memoryCategories.map((entry) => (entry.id === existing.id ? category : entry));
      await logAdminAction(req.user.id, 'category_updated', { slug, name: category.name, status: category.status });
      res.json({ category });
      return;
    }

    const rows = await query('SELECT * FROM categories WHERE cat_slug = :slug LIMIT 1', { slug });
    if (!rows.length) return res.status(404).json({ msg: 'Category not found.' });
    if (name) {
      const duplicate = await query('SELECT cat_id FROM categories WHERE LOWER(cat_name) = LOWER(:name) AND cat_slug <> :slug LIMIT 1', { name, slug });
      if (duplicate.length) return res.status(400).json({ msg: 'Category name already exists.' });
    }
    await query(
      `UPDATE categories
          SET cat_name = COALESCE(:name, cat_name),
              cat_description = COALESCE(:description, cat_description),
              cat_icon = COALESCE(:icon, cat_icon),
              cat_status = COALESCE(:status, cat_status)
        WHERE cat_slug = :slug`,
      { slug, name: name || null, description: description ?? null, icon: icon ?? null, status: status ?? null },
    );
    await logAdminAction(req.user.id, 'category_updated', { slug, name: name || rows[0].cat_name, status: status || rows[0].cat_status });
    const [updated] = await query('SELECT * FROM categories WHERE cat_slug = :slug LIMIT 1', { slug });
    res.json({ category: toCategory(updated) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/categories/:slug', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!dbReady) {
      const category = memoryCategories.find((entry) => entry.slug === slug || entry.id === slug);
      if (!category) return res.status(404).json({ msg: 'Category not found.' });
      if (memoryProducts.some((product) => product.category === slug)) return res.status(400).json({ msg: 'Cannot delete a category with products assigned.' });
      memoryCategories = memoryCategories.filter((entry) => entry.id !== category.id);
      await logAdminAction(req.user.id, 'category_deleted', { slug });
      res.status(204).end();
      return;
    }
    const rows = await query('SELECT cat_id FROM categories WHERE cat_slug = :slug LIMIT 1', { slug });
    if (!rows.length) return res.status(404).json({ msg: 'Category not found.' });
    const products = await query('SELECT prod_id FROM products WHERE prod_cat_id = :categoryId LIMIT 1', { categoryId: rows[0].cat_id });
    if (products.length) return res.status(400).json({ msg: 'Cannot delete a category with products assigned.' });
    await query('DELETE FROM categories WHERE cat_slug = :slug', { slug });
    await logAdminAction(req.user.id, 'category_deleted', { slug });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/reports', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const { from = null, to = null } = req.query;
    if (!dbReady) {
      const orders = memoryOrders.map(toMemoryOrder);
      const orderItems = orders.flatMap((order) => order.items.map((item) => ({ ...item, order })));
      const sellers = memoryUsers.filter((user) => denormalizeRole(user.role) === 'seller');
      const buyers = memoryUsers.filter((user) => denormalizeRole(user.role) === 'buyer');
      const byStatus = orderItems.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {});
      const topProducts = [...orderItems.reduce((map, item) => {
        const current = map.get(String(item.productId)) || { productId: item.productId, name: item.name, sold: 0, sales: 0 };
        current.sold += item.qty;
        current.sales += item.subtotal;
        map.set(String(item.productId), current);
        return map;
      }, new Map()).values()].sort((a, b) => b.sold - a.sold).slice(0, 8);
      res.json({
        report: {
          totals: {
            sales: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
            orders: orders.length,
            buyers: buyers.length,
            sellers: sellers.length,
            products: memoryProducts.length,
            pendingSellerApprovals: sellers.filter((seller) => !seller.verified).length,
            pendingOrderApprovals: orderItems.filter((item) => item.status === 'pending_approval').length,
            cancelledRejected: orderItems.filter((item) => ['cancelled', 'rejected'].includes(item.status)).length,
            deliveredCompleted: orderItems.filter((item) => ['delivered', 'completed'].includes(item.status)).length,
          },
          topProducts,
          topSellers: sellers.map((seller) => ({
            sellerId: seller.id,
            name: seller.businessName || seller.storeName || seller.name,
            sales: orderItems.filter((item) => String(item.sellerId) === String(seller.sellerId || seller.id)).reduce((sum, item) => sum + item.subtotal, 0),
          })).sort((a, b) => b.sales - a.sales).slice(0, 8),
          recentTransactions: orders.slice(0, 10),
          ordersByStatus: byStatus,
          lowStockProducts: memoryProducts.filter((product) => Number(product.stock || 0) <= 5).slice(0, 10),
          removedProducts: memoryRemovedProducts.slice(0, 10),
          salesByDate: [],
          dateRange: { from, to },
        },
      });
      return;
    }

    const [summary] = await query(
      `SELECT
         COALESCE(SUM(order_final_amt), 0) AS sales,
         COUNT(*) AS orders,
         SUM(CASE WHEN order_status = 'pending_approval' THEN 1 ELSE 0 END) AS pendingOrderApprovals,
         SUM(CASE WHEN order_status IN ('cancelled', 'rejected') THEN 1 ELSE 0 END) AS cancelledRejected,
         SUM(CASE WHEN order_status IN ('delivered', 'completed') THEN 1 ELSE 0 END) AS deliveredCompleted
       FROM orders
       WHERE (:fromDate IS NULL OR DATE(order_date) >= :fromDate)
         AND (:toDate IS NULL OR DATE(order_date) <= :toDate)`,
      { fromDate: from || null, toDate: to || null },
    );
    const [counts] = await query(
      `SELECT
         SUM(CASE WHEN user_role = 'Buyer' THEN 1 ELSE 0 END) AS buyers,
         SUM(CASE WHEN user_role = 'Seller' THEN 1 ELSE 0 END) AS sellers,
         SUM(CASE WHEN user_role = 'Seller' AND user_verified = 0 THEN 1 ELSE 0 END) AS pendingSellerApprovals
       FROM users`,
    );
    const [productCount] = await query('SELECT COUNT(*) AS products FROM products');
    const [topProducts, topSellers, recentTransactions, ordersByStatusRows, lowStockProducts, removedProducts, salesByDate] = await Promise.all([
      query(
        `SELECT p.prod_id AS productId, p.prod_name AS name, SUM(oi.oitem_quantity) AS sold, SUM(oi.oitem_subtotal) AS sales
         FROM order_items oi
         JOIN products p ON p.prod_id = oi.oitem_prod_id
         GROUP BY p.prod_id, p.prod_name
         ORDER BY sold DESC
         LIMIT 8`,
      ),
      query(
        `SELECT s.sell_id AS sellerId, s.sell_store_name AS name, COALESCE(SUM(oi.oitem_subtotal), 0) AS sales
         FROM sellers s
         LEFT JOIN order_items oi ON oi.oitem_sell_id = s.sell_id
         GROUP BY s.sell_id, s.sell_store_name
         ORDER BY sales DESC
         LIMIT 8`,
      ),
      loadOrders('', {}),
      query('SELECT oitem_item_status AS status, COUNT(*) AS count FROM order_items GROUP BY oitem_item_status'),
      query('SELECT prod_id AS id, prod_name AS name, prod_stock_qty AS stock FROM products WHERE prod_stock_qty <= 5 ORDER BY prod_stock_qty ASC LIMIT 10'),
      query('SELECT * FROM product_removal_logs ORDER BY removed_at DESC LIMIT 10'),
      query(
        `SELECT DATE(order_date) AS date, SUM(order_final_amt) AS sales, COUNT(*) AS orders
         FROM orders
         WHERE (:fromDate IS NULL OR DATE(order_date) >= :fromDate)
           AND (:toDate IS NULL OR DATE(order_date) <= :toDate)
         GROUP BY DATE(order_date)
         ORDER BY DATE(order_date) DESC
         LIMIT 30`,
        { fromDate: from || null, toDate: to || null },
      ),
    ]);
    res.json({
      report: {
        totals: {
          sales: Number(summary.sales || 0),
          orders: Number(summary.orders || 0),
          buyers: Number(counts.buyers || 0),
          sellers: Number(counts.sellers || 0),
          products: Number(productCount.products || 0),
          pendingSellerApprovals: Number(counts.pendingSellerApprovals || 0),
          pendingOrderApprovals: Number(summary.pendingOrderApprovals || 0),
          cancelledRejected: Number(summary.cancelledRejected || 0),
          deliveredCompleted: Number(summary.deliveredCompleted || 0),
        },
        topProducts,
        topSellers,
        recentTransactions: recentTransactions.slice(0, 10),
        ordersByStatus: ordersByStatusRows.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {}),
        lowStockProducts,
        removedProducts,
        salesByDate,
        dateRange: { from, to },
      },
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
      phone = null,
      address = null,
      firstName = null,
      middleInitial = null,
      lastName = null,
    } = req.body;
    const phoneResult = normalizeRegistrationPhone(phone);
    if (phoneResult.error) return res.status(400).json({ msg: phoneResult.error });
    const normalizedPhoneValue = phoneResult.phone;

    if (!dbReady) {
      if (memoryUsers.find((user) => user.email === email || (normalizedPhoneValue && user.phone === normalizedPhoneValue))) return res.status(409).json({ msg: 'Account already registered' });
      const user = {
        id: `u_${Date.now()}`,
        email,
        password,
        name,
        role,
        verified: role === 'buyer',
        phone: normalizedPhoneValue,
        address,
        storeName: role === 'seller' ? storeName : null,
        businessName: role === 'seller' ? businessName : null,
        idDocument: role === 'seller' ? idDocument : null,
        createdAt: new Date().toISOString(),
      };
      memoryUsers = [...memoryUsers, user];
      await saveNoSqlState();
      res.status(201).json({ user, token: createToken(user) });
      return;
    }

    const existing = await query('SELECT user_id FROM users WHERE user_email = :email OR (:phone IS NOT NULL AND user_phone_no = :phone) LIMIT 1', { email, phone: normalizedPhoneValue });
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
      phone: normalizedPhoneValue,
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
        phone: normalizedPhoneValue,
        address: address ? JSON.stringify(address) : null,
        role: normalizeRole(role),
        verified: user.verified ? 1 : 0,
      },
    );

    if (role === 'seller') await ensureSellerForUser(user);

    res.status(201).json({ user, token: createToken(user) });
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
      res.json({ user, token: createToken(user) });
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
    const user = toUser(rows[0]);
    res.json({ user, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/users/:id', authRequired, async (req, res, next) => {
  try {
    if (!isAdminUser(req.user) && String(req.user.id) !== String(req.params.id)) return res.status(403).json({ msg: 'You can only update your own profile.' });
    const body = req.body || {};
    if (!isAdminUser(req.user) && ['verified', 'role'].some((field) => body[field] !== undefined)) {
      return res.status(403).json({ msg: 'Only admins can change account role or verification.' });
    }
    const { verified, storeName, businessName, idDocument, name, role, sellerType } = body;
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
      if (isAdminUser(req.user) && verified !== undefined) await logAdminAction(req.user.id, verified ? 'seller_approved' : 'seller_rejected', { userId: req.params.id });
      await saveNoSqlState();
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
    if (isAdminUser(req.user) && verified !== undefined) await logAdminAction(req.user.id, verified ? 'seller_approved' : 'seller_rejected', { userId: req.params.id });

    const refreshed = await query(`${userSelect} WHERE u.user_id = :id LIMIT 1`, { id: req.params.id });
    res.json({ user: toUser(refreshed[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', authRequired, requireRole('seller'), async (req, res, next) => {
  try {
    req.body.sellerId = req.user.id;
    if (!dbReady) {
      const seller = req.user;
      if (!seller || denormalizeRole(seller.role) !== 'seller') return res.status(403).json({ msg: 'Only seller accounts can create products.' });
      if (!seller.verified) return res.status(403).json({ msg: 'Seller account must be verified before listing products.' });
      if (!activeMemoryCategories().some((category) => category.id === req.body.category || category.slug === req.body.category)) return res.status(400).json({ msg: 'Products must use an active category.' });
    }
    const product = prepareProductPayload(req.body);
    if (!dbReady) {
      memoryProducts = [product, ...memoryProducts];
      await saveNoSqlState();
      res.status(201).json({ product });
      return;
    }

    const sellerRows = await query('SELECT sell_id FROM sellers WHERE sell_user_id = :userId LIMIT 1', {
      userId: req.user.id,
    });
    const [sellerUser] = await query('SELECT user_role, user_verified FROM users WHERE user_id = :userId LIMIT 1', {
      userId: req.user.id,
    });
    if (!sellerUser || denormalizeRole(sellerUser.user_role) !== 'seller') return res.status(403).json({ msg: 'Only seller accounts can create products.' });
    if (!sellerUser.user_verified) return res.status(403).json({ msg: 'Seller account must be verified before listing products.' });
    const sellerId = sellerRows[0]?.sell_id || await ensureSellerForUser({
      id: req.user.id,
      name: 'Lazada Seller',
      verified: false,
    });
    const [category] = await query("SELECT cat_id FROM categories WHERE cat_slug = :slug AND cat_status = 'Active' LIMIT 1", { slug: req.body.category });
    if (!category) return res.status(400).json({ msg: 'Products must use an active category.' });

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
        categoryId: category.cat_id,
        weight: product.weight || 1,
        sku: product.sku || `SKU-${product.id}`,
        specs: JSON.stringify(product.specs || {}),
        images: JSON.stringify(product.images),
      },
    );
    await syncProductVariantTables({ ...product, sellerId });
    res.status(201).json({ product: { ...product, sellerId } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    if (!dbReady) {
      const product = memoryProducts.find((entry) => String(entry.id) === String(req.params.id));
      if (!product) return res.status(404).json({ msg: 'Product not found' });
      res.json({ product });
      return;
    }

    const rows = await query('SELECT p.*, c.cat_slug FROM products p LEFT JOIN categories c ON c.cat_id = p.prod_cat_id WHERE p.prod_id = :id LIMIT 1', {
      id: req.params.id,
    });
    if (!rows.length) return res.status(404).json({ msg: 'Product not found' });
    res.json({ product: toProduct(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/seller/products', authRequired, requireRole('seller'), async (req, res, next) => {
  try {
    const sellerUserId = req.user.id;
    if (!sellerUserId) return res.status(400).json({ msg: 'Seller user ID is required' });

    if (!dbReady) {
      const seller = memoryUsers.find((item) => String(item.id) === String(sellerUserId));
      const sellerIds = new Set([String(sellerUserId), String(seller?.sellerId || '')]);
      res.json({ products: memoryProducts.filter((product) => sellerIds.has(String(product.sellerId))) });
      return;
    }

    const rows = await query(
      `SELECT p.*, c.cat_slug
         FROM products p
         LEFT JOIN categories c ON c.cat_id = p.prod_cat_id
        WHERE p.prod_sell_id = (SELECT sell_id FROM sellers WHERE sell_user_id = :sellerUserId LIMIT 1)
        ORDER BY p.date_added DESC`,
      { sellerUserId },
    );
    res.json({ products: rows.map(toProduct) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/products/:id', authRequired, async (req, res, next) => {
  try {
    if (!isSellerUser(req.user) && !isAdminUser(req.user)) return res.status(403).json({ msg: 'Only sellers or admins can edit products.' });
    const price = req.body.price === undefined ? undefined : Number(req.body.price);
    const stock = req.body.stock === undefined ? undefined : Number(req.body.stock);
    if (price !== undefined && price <= 0) return res.status(400).json({ msg: 'Product price must be greater than zero.' });
    if (stock !== undefined && stock < 0) return res.status(400).json({ msg: 'Product stock cannot be negative.' });
    const status = req.body.status || req.body.productStatus;
    const variants = Array.isArray(req.body.variants)
      ? req.body.variants.map((variant, index) => normalizeProductVariant(variant, req.params.id, index, {
          price: price ?? req.body.price,
          stock: stock ?? req.body.stock,
          image: req.body.image,
          sku: req.body.sku,
        }))
      : null;
    if (variants) {
      const keys = variants.map((variant) => JSON.stringify(variant.selectedOptions || variant.attributes || {}));
      if (new Set(keys).size !== keys.length) return res.status(400).json({ msg: 'Duplicate variant combinations are not allowed.' });
      const skus = variants.map((variant) => variant.sku).filter(Boolean);
      if (new Set(skus).size !== skus.length) return res.status(400).json({ msg: 'Duplicate variant SKUs are not allowed.' });
      if (variants.some((variant) => Number(variant.price) <= 0 || Number(variant.stock) < 0)) return res.status(400).json({ msg: 'Variant price and stock are invalid.' });
    }

    if (!dbReady) {
      const product = memoryProducts.find((entry) => String(entry.id) === String(req.params.id));
      if (!product) return res.status(404).json({ msg: 'Product not found.' });
      if (isSellerUser(req.user) && String(product.sellerId) !== String(req.user.id) && String(product.sellerId) !== String(req.user.sellerId)) {
        return res.status(403).json({ msg: 'You can only edit your own products.' });
      }
      if (req.body.category && !activeMemoryCategories().some((category) => category.id === req.body.category || category.slug === req.body.category)) {
        return res.status(400).json({ msg: 'Products must use an active category.' });
      }
      const updated = prepareProductPayload({
        ...product,
        ...req.body,
        id: product.id,
        image: req.body.image || req.body.images?.[0] || product.image,
        images: req.body.images || product.images,
        variants: variants || product.variants || [],
        hasVariants: req.body.hasVariants ?? product.hasVariants,
        variantGroups: req.body.variantGroups || product.variantGroups || [],
      });
      updated.sellerId = product.sellerId;
      updated.status = status || product.status || 'Active';
      memoryProducts = memoryProducts.map((entry) => (String(entry.id) === String(req.params.id) ? updated : entry));
      await saveNoSqlState();
      res.json({ product: updated });
      return;
    }

    const rows = await query(
      `SELECT p.*, c.cat_slug, s.sell_user_id
         FROM products p
         JOIN sellers s ON s.sell_id = p.prod_sell_id
         LEFT JOIN categories c ON c.cat_id = p.prod_cat_id
        WHERE p.prod_id = :id
        LIMIT 1`,
      { id: req.params.id },
    );
    if (!rows.length) return res.status(404).json({ msg: 'Product not found.' });
    if (isSellerUser(req.user) && String(rows[0].sell_user_id) !== String(req.user.id)) return res.status(403).json({ msg: 'You can only edit your own products.' });

    let categoryId = rows[0].prod_cat_id;
    if (req.body.category) {
      const [category] = await query("SELECT cat_id FROM categories WHERE cat_slug = :slug AND cat_status = 'Active' LIMIT 1", { slug: req.body.category });
      if (!category) return res.status(400).json({ msg: 'Products must use an active category.' });
      categoryId = category.cat_id;
    }

    const current = toProduct(rows[0]);
    const nextImages = req.body.images || current.images || [current.image];
    const nextPrice = price ?? current.price;
    const nextOriginalPrice = Math.max(
      req.body.originalPrice === undefined ? current.originalPrice : Number(req.body.originalPrice),
      nextPrice,
    );
    const nextSpecs = {
      ...(current.specs || {}),
      ...(req.body.specs || {}),
      subcategory: req.body.subcategory ?? current.subcategory ?? '',
      specGroups: req.body.specGroups || current.specGroups || [],
      variantGroups: req.body.variantGroups || current.variantGroups || [],
      hasVariants: req.body.hasVariants ?? current.hasVariants,
      variants: variants || current.variants || [],
    };
    await query(
      `UPDATE products
          SET prod_cat_id = :categoryId,
              prod_name = COALESCE(:name, prod_name),
              prod_desc = COALESCE(:description, prod_desc),
              prod_price = COALESCE(:price, prod_price),
              prod_stock_qty = COALESCE(:stock, prod_stock_qty),
              prod_brand = COALESCE(:brand, prod_brand),
              prod_status = COALESCE(:status, prod_status),
              prod_specs = :specs,
              prod_original_price = COALESCE(:originalPrice, prod_original_price),
              prod_discount_percent = :discount,
              prod_image = COALESCE(:image, prod_image),
              prod_images = :images
        WHERE prod_id = :id`,
      {
        id: req.params.id,
        categoryId,
        name: req.body.name || null,
        description: req.body.description || null,
        price: price ?? null,
        stock: stock ?? null,
        brand: req.body.brand || null,
        status: status || null,
        specs: JSON.stringify(nextSpecs),
        originalPrice: req.body.originalPrice === undefined ? null : nextOriginalPrice,
        discount: discountPercent(nextPrice, nextOriginalPrice),
        image: req.body.image || nextImages[0] || null,
        images: JSON.stringify(nextImages),
      },
    );
    if (variants) await syncProductVariantTables({ ...current, id: Number(req.params.id), images: nextImages, variantGroups: nextSpecs.variantGroups, variants });
    const [updatedRow] = await query('SELECT p.*, c.cat_slug FROM products p LEFT JOIN categories c ON c.cat_id = p.prod_cat_id WHERE p.prod_id = :id LIMIT 1', { id: req.params.id });
    res.json({ product: toProduct(updatedRow) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/products/:productId/variants/:variantId', authRequired, async (req, res, next) => {
  try {
    const sellerUserId = req.user.id;
    const { price, stock, imageUrl, image, status } = req.body;
    const allowedStatus = String(status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active';

    if (!isSellerUser(req.user) && !isAdminUser(req.user)) return res.status(403).json({ msg: 'Only sellers or admins can update variants.' });
    if (!dbReady) {
      const product = memoryProducts.find((entry) => String(entry.id) === String(req.params.productId));
      if (!product) return res.status(404).json({ msg: 'Product not found' });
      if (isSellerUser(req.user) && String(product.sellerId) !== String(req.user.id) && String(product.sellerId) !== String(req.user.sellerId)) return res.status(403).json({ msg: 'You can only edit your own products.' });
      product.variants = (product.variants || []).map((variant) => (
        String(variant.variantId || variant.id) === String(req.params.variantId)
          ? {
              ...variant,
              price: price === undefined ? variant.price : Number(price),
              stock: stock === undefined ? variant.stock : Number(stock),
              image: image || imageUrl || variant.image,
              imageUrl: imageUrl || image || variant.imageUrl,
              status: allowedStatus,
            }
          : variant
      ));
      product.specs = { ...(product.specs || {}), variants: product.variants, hasVariants: product.variants.length > 0 };
      await saveNoSqlState();
      res.json({ product });
      return;
    }

    const rows = await query(
      `SELECT p.*
         FROM products p
         JOIN sellers s ON s.sell_id = p.prod_sell_id
        WHERE p.prod_id = :productId
          AND (:isAdmin = 1 OR s.sell_user_id = :sellerUserId)
        LIMIT 1`,
      { productId: req.params.productId, sellerUserId, isAdmin: isAdminUser(req.user) ? 1 : 0 },
    );
    if (!rows.length) return res.status(404).json({ msg: 'Product not found for this seller.' });

    const current = toProduct(rows[0]);
    const variants = current.variants.map((variant) => (
      String(variant.variantId) === String(req.params.variantId)
        ? {
            ...variant,
            price: price === undefined ? variant.price : Number(price),
            stock: stock === undefined ? variant.stock : Number(stock),
            image: image || imageUrl || variant.image,
            imageUrl: imageUrl || image || variant.imageUrl,
            status: allowedStatus,
          }
        : variant
    ));
    const specs = { ...(current.specs || {}), variants, hasVariants: variants.length > 0 };

    await query(
      `UPDATE product_variants
          SET price = COALESCE(:price, price),
              stock = COALESCE(:stock, stock),
              image_url = COALESCE(:imageUrl, image_url),
              status = :status,
              updated_at = CURRENT_TIMESTAMP
        WHERE variant_id = :variantId
          AND product_id = :productId`,
      {
        price: price === undefined ? null : Number(price),
        stock: stock === undefined ? null : Number(stock),
        imageUrl: imageUrl || image || null,
        status: allowedStatus,
        variantId: req.params.variantId,
        productId: req.params.productId,
      },
    );
    await query('UPDATE products SET prod_specs = :specs WHERE prod_id = :productId', {
      specs: JSON.stringify(specs),
      productId: req.params.productId,
    });

    res.json({ product: { ...current, specs, variants, hasVariants: variants.length > 0 } });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', authRequired, async (req, res, next) => {
  try {
    if (!isSellerUser(req.user) && !isAdminUser(req.user)) return res.status(403).json({ msg: 'Only sellers or admins can remove products.' });
    if (!dbReady) {
      const product = memoryProducts.find((entry) => String(entry.id) === String(req.params.id));
      if (!product) return res.status(404).json({ msg: 'Product not found.' });
      if (isSellerUser(req.user) && String(product.sellerId) !== String(req.user.id) && String(product.sellerId) !== String(req.user.sellerId)) return res.status(403).json({ msg: 'You can only remove your own products.' });
      if (isAdminUser(req.user)) {
        memoryRemovedProducts = [{ id: nextId(61000000), productId: product.id, productName: product.name, adminId: req.user.id, removedAt: new Date().toISOString() }, ...memoryRemovedProducts];
        await logAdminAction(req.user.id, 'product_removed', { productId: product.id, name: product.name });
      }
      memoryProducts = memoryProducts.filter((entry) => String(entry.id) !== String(req.params.id));
      await saveNoSqlState();
      res.status(204).end();
      return;
    }

    const rows = await query(
      `SELECT p.prod_id, p.prod_name, s.sell_user_id
         FROM products p
         JOIN sellers s ON s.sell_id = p.prod_sell_id
        WHERE p.prod_id = :id
        LIMIT 1`,
      { id: req.params.id },
    );
    if (!rows.length) return res.status(404).json({ msg: 'Product not found.' });
    if (isSellerUser(req.user) && String(rows[0].sell_user_id) !== String(req.user.id)) return res.status(403).json({ msg: 'You can only remove your own products.' });
    if (isAdminUser(req.user)) {
      await query(
        `INSERT INTO product_removal_logs (removal_id, product_id, product_name, admin_user_id, reason)
         VALUES (:id, :productId, :productName, :adminId, :reason)`,
        { id: nextId(61000000), productId: rows[0].prod_id, productName: rows[0].prod_name, adminId: req.user.id, reason: req.body?.reason || null },
      );
      await logAdminAction(req.user.id, 'product_removed', { productId: rows[0].prod_id, name: rows[0].prod_name });
    }
    await query('DELETE FROM products WHERE prod_id = :id', { id: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

const validateDbOrderItem = async (item) => {
  const [productRow] = await query('SELECT p.*, c.cat_slug FROM products p LEFT JOIN categories c ON c.cat_id = p.prod_cat_id WHERE p.prod_id = :productId LIMIT 1', {
    productId: item.productId,
  });
  if (!productRow) throw new Error(`Product ${item.productId} was not found`);

  const product = toProduct(productRow);
  if (item.variantId) {
    const variants = product.variants || [];
    const variant = variants.find((entry) => (
      String(entry.variantId) === String(item.variantId)
      || String(entry.id) === String(item.variantId)
      || String(entry.sku) === String(item.sku)
    ));
    if (!variant) throw new Error('Please select a valid product variant.');
    if (variant.status !== 'active') throw new Error(`${product.name} - ${variant.variantName} is unavailable.`);
    if (Number(variant.stock) < Number(item.qty)) throw new Error(`${product.name} - ${variant.variantName} only has ${variant.stock} in stock.`);

    return {
      ...item,
      sellerId: productRow.prod_sell_id,
      name: product.name,
      image: item.image || variant.image || product.image,
      variantId: variant.variantId,
      variantName: variant.variantName,
      selectedOptions: variant.selectedOptions || {},
      sku: variant.sku,
      price: Number(variant.price),
      subtotal: Number(variant.price) * Number(item.qty),
    };
  }

  if (product.hasVariants && product.variants.length) throw new Error(`Please select a variant for ${product.name}.`);
  if (Number(product.stock) < Number(item.qty)) throw new Error(`${product.name} only has ${product.stock} in stock.`);

  return {
    ...item,
    sellerId: productRow.prod_sell_id,
    name: product.name,
    image: item.image || product.image,
    price: Number(product.price),
    subtotal: Number(product.price) * Number(item.qty),
  };
};

const deductDbOrderItemStock = async (item) => {
  if (item.variantId) {
    const [productRow] = await query('SELECT prod_specs FROM products WHERE prod_id = :productId LIMIT 1', {
      productId: item.productId,
    });
    const specs = readJson(productRow?.prod_specs, {});
    const variants = (specs.variants || []).map((variant) => (
      String(variant.variantId || variant.id) === String(item.variantId)
        ? { ...variant, stock: Math.max(0, Number(variant.stock || 0) - Number(item.qty)) }
        : variant
    ));

    await query(
      `UPDATE product_variants
          SET stock = GREATEST(stock - :qty, 0),
              updated_at = CURRENT_TIMESTAMP
        WHERE variant_id = :variantId
          AND product_id = :productId`,
      { qty: item.qty, variantId: item.variantId, productId: item.productId },
    );
    await query('UPDATE products SET prod_specs = :specs WHERE prod_id = :productId', {
      specs: JSON.stringify({ ...specs, variants, hasVariants: true }),
      productId: item.productId,
    });
    return;
  }

  await query(
    `UPDATE products
        SET prod_stock_qty = GREATEST(prod_stock_qty - :qty, 0),
            prod_total_sold = COALESCE(prod_total_sold, 0) + :qty
      WHERE prod_id = :productId`,
    { qty: item.qty, productId: item.productId },
  );
};

app.post('/api/orders', authRequired, requireRole('buyer'), async (req, res, next) => {
  try {
    const { items, address, payment } = req.body;
    const userId = req.user.id;
    let normalizedItems = items.map((item, index) => {
      const productId = productIdFromCartItem(item);
      const variantId = variantIdFromCartItem(item);
      const product = memoryProducts.find((entry) => String(entry.id) === String(productId));
      const qty = Number(item.qty || 1);
      const price = Number(item.price || product?.price || 0);
      return {
        orderItemId: null,
        productId,
        variantId,
        variantName: item.variantName || null,
        selectedOptions: item.selectedOptions || {},
        sku: item.sku || null,
        sellerId: item.sellerId || product?.sellerId,
        buyerId: userId,
        name: item.name || product?.name || 'Product',
        image: item.image || product?.image || '',
        qty,
        price,
        subtotal: price * qty,
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cartLineId: item.id,
        itemIndex: index,
      };
    });
    const total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const order = {
      id: nextId(10000000),
      userId,
      items: normalizedItems,
      total,
      address,
      payment,
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
    };
    if (!dbReady) {
      for (const item of normalizedItems) {
        const product = memoryProducts.find((entry) => String(entry.id) === String(item.productId));
        if (!product) return res.status(404).json({ msg: `Product ${item.productId} was not found` });
        if (item.variantId) {
          const variant = (product.variants || []).find((entry) => String(entry.variantId || entry.id) === String(item.variantId));
          if (!variant || variant.status === 'inactive') return res.status(400).json({ msg: 'Please select a valid product variant.' });
          if (Number(variant.stock) < item.qty) return res.status(400).json({ msg: `${product.name} - ${variant.variantName || variant.name} only has ${variant.stock} in stock.` });
          variant.stock = Math.max(0, Number(variant.stock) - item.qty);
        } else if (product.hasVariants && product.variants?.length) {
          return res.status(400).json({ msg: `Please select a variant for ${product.name}.` });
        } else if (Number(product.stock) < item.qty) {
          return res.status(400).json({ msg: `${product.name} only has ${product.stock} in stock.` });
        } else {
          product.stock = Math.max(0, Number(product.stock) - item.qty);
        }
      }
      const memoryOrder = {
        ...order,
        items: normalizedItems.map((item, index) => ({
          ...item,
          orderItemId: Number(`${order.id}${index + 1}`),
          orderId: order.id,
        })),
      };
      memoryOrders = [memoryOrder, ...memoryOrders];
      await saveNoSqlState();
      res.status(201).json({ order: toMemoryOrder(memoryOrder) });
      return;
    }

    try {
      normalizedItems = await Promise.all(normalizedItems.map(validateDbOrderItem));
    } catch (validationError) {
      return res.status(400).json({ msg: validationError.message });
    }
    order.items = normalizedItems;
    order.total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);

    const method = paymentMethod(payment);
    await query(
      `INSERT INTO orders
        (order_id, order_user_id, order_total_amt, order_discount_amt, order_final_amt,
         order_payment_status, order_status, order_delivery_address, order_items_snapshot, order_payment_method)
       VALUES
        (:id, :userId, :total, 0, :total, :paymentStatus, 'pending_approval', :address, :items, :payment)`,
      {
        id: order.id,
        userId,
        total: order.total,
        paymentStatus: method === 'COD' ? 'Pending' : 'Paid',
        address: JSON.stringify(address),
        items: JSON.stringify(normalizedItems),
        payment,
      },
    );

    for (const [index, item] of normalizedItems.entries()) {
      const [productRow] = await query('SELECT prod_sell_id FROM products WHERE prod_id = :productId LIMIT 1', {
        productId: item.productId,
      });
      if (!productRow) throw new Error(`Product ${item.productId} was not found`);
      const orderItemId = Number(`${order.id}${index + 1}`);
      await query(
        `INSERT INTO order_items
          (oitem_id, oitem_order_id, oitem_prod_id, oitem_sell_id, oitem_buyer_id,
           oitem_quantity, oitem_unit_price, oitem_subtotal, oitem_variant_id,
           oitem_variant_name, oitem_selected_options, oitem_item_status)
         VALUES
          (:id, :orderId, :productId, :sellerId, :buyerId,
           :quantity, :unitPrice, :subtotal, :variantId,
           :variantName, :selectedOptions, 'pending_approval')`,
        {
          id: orderItemId,
          orderId: order.id,
          productId: item.productId,
          sellerId: productRow.prod_sell_id,
          buyerId: userId,
          quantity: item.qty,
          unitPrice: item.price,
          subtotal: item.subtotal,
          variantId: item.variantId || null,
          variantName: item.variantName || null,
          selectedOptions: JSON.stringify(item.selectedOptions || {}),
        },
      );
      await deductDbOrderItemStock(item);
      await addOrderHistory({
        orderId: order.id,
        orderItemId,
        previousStatus: null,
        nextStatus: 'pending_approval',
        changedById: userId,
        changedByRole: 'buyer',
        note: 'Order placed',
      });
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
        amount: order.total,
        ref: `PAY-${order.id}`,
        status: method === 'COD' ? 'Pending' : 'Completed',
        gateway: ids.paymentGatewayFromMethod(method),
      },
    );

    const [createdOrder] = await loadOrders('WHERE o.order_id = :orderId', { orderId: order.id });
    res.status(201).json({ order: createdOrder });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders', authRequired, requireRole('buyer'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!dbReady) {
      res.json({ orders: memoryOrders.map(toMemoryOrder).filter((order) => String(order.userId) === String(userId)) });
      return;
    }

    const orders = await loadOrders('WHERE o.order_user_id = :userId', { userId });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/:id', authRequired, requireRole('buyer'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!dbReady) {
      const order = findMemoryOrder(req.params.id);
      if (!order || String(order.userId) !== String(userId)) return res.status(404).json({ msg: 'Order not found' });
      res.json({ order });
      return;
    }

    const [order] = await loadOrders('WHERE o.order_id = :orderId AND o.order_user_id = :userId', {
      orderId: req.params.id,
      userId,
    });
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders/:id/cancel', authRequired, requireRole('buyer'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!dbReady) {
      const order = findMemoryOrder(req.params.id);
      if (!order || String(order.userId) !== String(userId)) return res.status(404).json({ msg: 'Order not found' });
      if (order.items.some((item) => normalizeOrderStatus(item.status) !== 'pending_approval')) {
        return res.status(400).json({ msg: 'Only orders pending seller approval can be cancelled.' });
      }
      const updated = {
        ...order,
        status: 'cancelled',
        items: order.items.map((item) => ({ ...item, status: 'cancelled', updatedAt: new Date().toISOString() })),
      };
      await replaceMemoryOrder(updated);
      res.json({ order: toMemoryOrder(updated) });
      return;
    }

    const [order] = await loadOrders('WHERE o.order_id = :orderId AND o.order_user_id = :userId', {
      orderId: req.params.id,
      userId,
    });
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.items.some((item) => normalizeOrderStatus(item.status) !== 'pending_approval')) {
      return res.status(400).json({ msg: 'Only orders pending seller approval can be cancelled.' });
    }

    await query(
      `UPDATE order_items
          SET oitem_item_status = 'cancelled',
              oitem_updated_at = CURRENT_TIMESTAMP
        WHERE oitem_order_id = :orderId`,
      { orderId: req.params.id },
    );
    await Promise.all(order.items.map((item) => addOrderHistory({
      orderId: order.id,
      orderItemId: item.orderItemId,
      previousStatus: item.status,
      nextStatus: 'cancelled',
      changedById: userId,
      changedByRole: 'buyer',
      note: 'Buyer cancelled pending order',
    })));
    const updatedOrder = await setDbOrderAggregateStatus(req.params.id);
    res.json({ order: updatedOrder });
  } catch (error) {
    next(error);
  }
});

app.get('/api/seller/orders', authRequired, requireRole('seller'), async (req, res, next) => {
  try {
    const sellerUserId = req.user.id;

    if (!dbReady) {
      const seller = memoryUsers.find((item) => String(item.id) === String(sellerUserId));
      const sellerIds = new Set([String(seller?.sellerId || sellerUserId), String(sellerUserId)]);
      const orders = memoryOrders
        .map(toMemoryOrder)
        .map((order) => ({ ...order, items: order.items.filter((item) => sellerIds.has(String(item.sellerId))) }))
        .filter((order) => order.items.length);
      res.json({ orders });
      return;
    }

    const orders = await loadOrders(
      `WHERE oi.oitem_sell_id = (
        SELECT sell_id FROM sellers WHERE sell_user_id = :sellerUserId LIMIT 1
      )`,
      { sellerUserId },
    );
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

const updateSellerOrderItemStatus = async (req, res, next) => {
  try {
    const { note = null, driverId = null } = req.body;
    const sellerUserId = req.user.id;
    const action = req.params.action === 'status' ? req.body.status : req.params.action || req.body.action;
    const targetStatus = normalizeOrderStatus(sellerActionTargets[action] || action);

    if (!workflowStatuses.includes(targetStatus) || !allowedPreviousStatus[targetStatus]) {
      return res.status(400).json({ msg: 'Unsupported order status action.' });
    }

    if (!dbReady) {
      const selectedDriver = targetStatus === 'shipping'
        ? memoryDrivers.find((driver) => String(driver.id) === String(driverId))
        : null;
      let matchedOrder = null;
      let matchedItem = null;
      const seller = memoryUsers.find((item) => String(item.id) === String(sellerUserId));
      const sellerIds = new Set([String(seller?.sellerId || sellerUserId), String(sellerUserId)]);

      memoryOrders.map(toMemoryOrder).some((order) => {
        const item = order.items.find((entry) => String(entry.orderItemId) === String(req.params.id));
        if (!item) return false;
        matchedOrder = order;
        matchedItem = item;
        return true;
      });

      if (!matchedOrder || !matchedItem) return res.status(404).json({ msg: 'Order item not found' });
      if (!sellerIds.has(String(matchedItem.sellerId))) return res.status(403).json({ msg: 'You can only update orders for your own products.' });
      if (!allowedPreviousStatus[targetStatus].includes(normalizeOrderStatus(matchedItem.status))) {
        return res.status(400).json({ msg: `Cannot move item from ${matchedItem.status} to ${targetStatus}.` });
      }
      const bulkOrderApproval = ['to_be_packed', 'rejected'].includes(targetStatus);
      const itemIdsToUpdate = new Set(
        (bulkOrderApproval ? matchedOrder.items : [matchedItem])
          .filter((item) => (
            sellerIds.has(String(item.sellerId))
            && allowedPreviousStatus[targetStatus].includes(normalizeOrderStatus(item.status))
          ))
          .map((item) => String(item.orderItemId)),
      );

      const updated = {
        ...matchedOrder,
        items: matchedOrder.items.map((item) => (
          itemIdsToUpdate.has(String(item.orderItemId))
            ? {
                ...item,
                status: targetStatus,
                driver: selectedDriver ? { ...selectedDriver, trackingNumber: trackingNumber(matchedOrder.id, item.orderItemId) } : item.driver,
                trackingNumber: targetStatus === 'shipping' ? trackingNumber(matchedOrder.id, item.orderItemId) : item.trackingNumber,
                deliveryStatus: targetStatus === 'shipping' ? 'third_party_courier' : item.deliveryStatus,
                updatedAt: new Date().toISOString(),
              }
            : item
        )),
      };
      updated.status = aggregateOrderStatus(updated.items);
      await replaceMemoryOrder(updated);
      res.json({ order: toMemoryOrder(updated) });
      return;
    }

    const rows = await query(
      `SELECT oi.*, s.sell_user_id
         FROM order_items oi
         JOIN sellers s ON s.sell_id = oi.oitem_sell_id
        WHERE oi.oitem_id = :orderItemId
        LIMIT 1`,
      { orderItemId: req.params.id },
    );
    if (!rows.length) return res.status(404).json({ msg: 'Order item not found' });
    const item = rows[0];
    if (String(item.sell_user_id) !== String(sellerUserId)) {
      return res.status(403).json({ msg: 'You can only update orders for your own products.' });
    }

    const currentStatus = normalizeOrderStatus(item.oitem_item_status);
    if (!allowedPreviousStatus[targetStatus].includes(currentStatus)) {
      return res.status(400).json({ msg: `Cannot move item from ${currentStatus} to ${targetStatus}.` });
    }

    const selectedDriver = targetStatus === 'shipping' && driverId ? await getDbDriver(driverId) : null;
    if (driverId && targetStatus === 'shipping' && !selectedDriver) return res.status(400).json({ msg: 'Selected driver was not found.' });
    const nextTrackingNumber = targetStatus === 'shipping' ? trackingNumber(item.oitem_order_id, item.oitem_id) : null;
    const bulkOrderApproval = ['to_be_packed', 'rejected'].includes(targetStatus);
    const rowsToUpdate = bulkOrderApproval
      ? await query(
        `SELECT oi.*
           FROM order_items oi
           JOIN sellers s ON s.sell_id = oi.oitem_sell_id
          WHERE oi.oitem_order_id = :orderId
            AND s.sell_user_id = :sellerUserId`,
        { orderId: item.oitem_order_id, sellerUserId },
      )
      : [item];
    const invalidBulkItem = rowsToUpdate.find((row) => !allowedPreviousStatus[targetStatus].includes(normalizeOrderStatus(row.oitem_item_status)));
    if (invalidBulkItem) {
      return res.status(400).json({ msg: `Cannot move item from ${invalidBulkItem.oitem_item_status} to ${targetStatus}.` });
    }
    const orderItemIds = rowsToUpdate.map((row) => row.oitem_id);

    await query(
      `UPDATE order_items
          SET oitem_item_status = :status,
              oitem_driver_id = COALESCE(:driverId, oitem_driver_id),
              oitem_driver_name = COALESCE(:driverName, oitem_driver_name),
              oitem_driver_phone = COALESCE(:driverPhone, oitem_driver_phone),
              oitem_driver_vehicle = COALESCE(:driverVehicle, oitem_driver_vehicle),
              oitem_tracking_number = COALESCE(:trackingNumber, oitem_tracking_number),
              oitem_delivery_status = COALESCE(:deliveryStatus, oitem_delivery_status),
              oitem_updated_at = CURRENT_TIMESTAMP
        WHERE ${bulkOrderApproval ? 'oitem_order_id = :orderId AND oitem_sell_id = :sellerId' : 'oitem_id = :orderItemId'}`,
      {
        status: targetStatus,
        driverId: selectedDriver?.id || null,
        driverName: selectedDriver?.name || null,
        driverPhone: selectedDriver?.phone || null,
        driverVehicle: selectedDriver ? `${selectedDriver.vehicle} ${selectedDriver.plate || ''}`.trim() : null,
        trackingNumber: nextTrackingNumber,
        deliveryStatus: targetStatus === 'shipping' ? 'third_party_courier' : null,
        orderId: item.oitem_order_id,
        sellerId: item.oitem_sell_id,
        orderItemId: req.params.id,
      },
    );
    if (selectedDriver) {
      const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await query(
        `INSERT INTO shipment_deliveries
          (ship_id, ship_cr_id, ship_order_id, ship_tracking_number, ship_estimated_delivery, ship_delivery_status, ship_fee)
         VALUES
          (:id, :driverId, :orderId, :trackingNumber, :estimatedDelivery, 'InTransit', 0.00)`,
        {
          id: nextId(50000000),
          driverId: selectedDriver.id,
          orderId: item.oitem_order_id,
          trackingNumber: nextTrackingNumber,
          estimatedDelivery,
        },
      );
    }
    await Promise.all(rowsToUpdate.map((row) => addOrderHistory({
      orderId: row.oitem_order_id,
      orderItemId: row.oitem_id,
      previousStatus: row.oitem_item_status,
      nextStatus: targetStatus,
      changedById: sellerUserId,
      changedByRole: 'seller',
      note: selectedDriver ? `Assigned driver: ${selectedDriver.name}` : note || (targetStatus === 'shipping' ? 'Handed to third-party courier' : null),
    })));
    const updatedOrder = await setDbOrderAggregateStatus(item.oitem_order_id);
    res.json({ order: updatedOrder, updatedOrderItemIds: orderItemIds });
  } catch (error) {
    next(error);
  }
};

app.patch('/api/seller/order-items/:id/:action', authRequired, requireRole('seller'), updateSellerOrderItemStatus);
app.patch('/api/seller/order-items/:id/status', authRequired, requireRole('seller'), updateSellerOrderItemStatus);

app.get('/api/driver/deliveries', authRequired, requireRole('driver'), async (req, res, next) => {
  try {
    const driverUserId = req.user.id;

    if (!dbReady) {
      const orders = memoryOrders
        .map(toMemoryOrder)
        .map((order) => ({
          ...order,
          items: order.items.filter((item) => String(item.driver?.id) === String(driverUserId)),
        }))
        .filter((order) => order.items.length);
      res.json({ orders });
      return;
    }

    const [driverUser] = await query('SELECT user_role FROM users WHERE user_id = :driverUserId LIMIT 1', { driverUserId });
    if (!driverUser || denormalizeRole(driverUser.user_role) !== 'driver') return res.status(403).json({ msg: 'Driver access only.' });

    const orders = await loadOrders('WHERE oi.oitem_driver_id = :driverUserId', { driverUserId });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

const driverDeliveryTargets = {
  assigned: 'assigned',
  picked_up: 'picked_up',
  in_transit: 'in_transit',
  delivered: 'delivered',
};

app.patch('/api/driver/deliveries/:id/:action', authRequired, requireRole('driver'), async (req, res, next) => {
  try {
    const driverUserId = req.user.id;
    const deliveryStatus = driverDeliveryTargets[req.params.action] || driverDeliveryTargets[req.body.status];
    if (!deliveryStatus) return res.status(400).json({ msg: 'Unsupported delivery status.' });

    if (!dbReady) {
      let matchedOrder = null;
      let matchedItem = null;
      memoryOrders.map(toMemoryOrder).some((order) => {
        const item = order.items.find((entry) => String(entry.orderItemId) === String(req.params.id));
        if (!item) return false;
        matchedOrder = order;
        matchedItem = item;
        return true;
      });
      if (!matchedOrder || !matchedItem || String(matchedItem.driver?.id) !== String(driverUserId)) {
        return res.status(404).json({ msg: 'Assigned delivery was not found.' });
      }
      const updated = {
        ...matchedOrder,
        items: matchedOrder.items.map((item) => (
          String(item.orderItemId) === String(req.params.id)
            ? {
                ...item,
                deliveryStatus,
                status: deliveryStatus === 'delivered' ? 'delivered' : item.status,
                updatedAt: new Date().toISOString(),
              }
            : item
        )),
      };
      updated.status = aggregateOrderStatus(updated.items);
      await replaceMemoryOrder(updated);
      res.json({ order: toMemoryOrder(updated) });
      return;
    }

    const rows = await query(
      `SELECT oi.*, u.user_role
         FROM order_items oi
         JOIN users u ON u.user_id = :driverUserId
        WHERE oi.oitem_id = :orderItemId
          AND oi.oitem_driver_id = :driverUserId
        LIMIT 1`,
      { orderItemId: req.params.id, driverUserId },
    );
    if (!rows.length || denormalizeRole(rows[0].user_role) !== 'driver') return res.status(404).json({ msg: 'Assigned delivery was not found.' });
    if (normalizeOrderStatus(rows[0].oitem_item_status) !== 'shipping') return res.status(400).json({ msg: 'Only shipping deliveries can be updated by drivers.' });

    const nextOrderStatus = deliveryStatus === 'delivered' ? 'delivered' : 'shipping';
    await query(
      `UPDATE order_items
          SET oitem_delivery_status = :deliveryStatus,
              oitem_item_status = :orderStatus,
              oitem_updated_at = CURRENT_TIMESTAMP
        WHERE oitem_id = :orderItemId`,
      { deliveryStatus, orderStatus: nextOrderStatus, orderItemId: req.params.id },
    );
    await query(
      `UPDATE shipment_deliveries
          SET ship_delivery_status = :shipmentStatus,
              ship_delivery_date = CASE WHEN :deliveryStatus = 'delivered' THEN CURRENT_TIMESTAMP ELSE ship_delivery_date END
        WHERE ship_order_id = :orderId
          AND ship_tracking_number = :trackingNumber`,
      {
        shipmentStatus: deliveryStatus === 'delivered' ? 'Delivered' : 'InTransit',
        deliveryStatus,
        orderId: rows[0].oitem_order_id,
        trackingNumber: rows[0].oitem_tracking_number,
      },
    );
    await addOrderHistory({
      orderId: rows[0].oitem_order_id,
      orderItemId: rows[0].oitem_id,
      previousStatus: rows[0].oitem_item_status,
      nextStatus: nextOrderStatus,
      changedById: driverUserId,
      changedByRole: 'driver',
      note: `Delivery status: ${deliveryStatus}`,
    });
    const updatedOrder = await setDbOrderAggregateStatus(rows[0].oitem_order_id);
    res.json({ order: updatedOrder });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reviews', authRequired, requireRole('buyer'), async (req, res, next) => {
  try {
    const { orderId, orderItemId, productId, rating, comment = '' } = req.body;
    const buyerId = req.user.id;
    const ratingValue = Number(rating);
    if (!orderId || !orderItemId || !productId || !buyerId) return res.status(400).json({ msg: 'Order, item, product, and buyer are required.' });
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) return res.status(400).json({ msg: 'Rating must be between 1 and 5.' });

    if (!dbReady) {
      const order = findMemoryOrder(orderId);
      const item = order?.items.find((entry) => String(entry.orderItemId) === String(orderItemId));
      if (!order || !item || String(order.userId) !== String(buyerId)) return res.status(404).json({ msg: 'Order item not found.' });
      if (!reviewableStatuses.includes(normalizeOrderStatus(item.status))) return res.status(400).json({ msg: 'You can review this product after it is delivered.' });
      if (memoryReviews.some((review) => String(review.orderItemId) === String(orderItemId))) return res.status(409).json({ msg: 'You already reviewed this order item.' });

      const review = {
        reviewId: nextId(40000000),
        orderId,
        orderItemId,
        productId,
        buyerId,
        rating: ratingValue,
        comment: String(comment).trim(),
        createdAt: new Date().toISOString(),
      };
      memoryReviews = [review, ...memoryReviews];
      const updated = toMemoryOrder(order);
      await replaceMemoryOrder(updated);
      res.status(201).json({ review, order: toMemoryOrder(updated) });
      return;
    }

    const rows = await query(
      `SELECT oi.*, o.order_user_id
         FROM order_items oi
         JOIN orders o ON o.order_id = oi.oitem_order_id
        WHERE oi.oitem_id = :orderItemId
          AND oi.oitem_order_id = :orderId
          AND oi.oitem_prod_id = :productId
        LIMIT 1`,
      { orderItemId, orderId, productId },
    );
    if (!rows.length || String(rows[0].order_user_id) !== String(buyerId)) return res.status(404).json({ msg: 'Order item not found.' });
    if (!reviewableStatuses.includes(normalizeOrderStatus(rows[0].oitem_item_status))) {
      return res.status(400).json({ msg: 'You can review this product after it is delivered.' });
    }

    const existing = await query('SELECT review_id FROM product_reviews WHERE order_item_id = :orderItemId LIMIT 1', { orderItemId });
    if (existing.length) return res.status(409).json({ msg: 'You already reviewed this order item.' });

    const review = {
      reviewId: nextId(40000000),
      orderId,
      orderItemId,
      productId,
      buyerId,
      rating: ratingValue,
      comment: String(comment).trim(),
      createdAt: new Date().toISOString(),
    };
    await query(
      `INSERT INTO product_reviews
        (review_id, order_id, order_item_id, product_id, buyer_id, rating, comment)
       VALUES
        (:reviewId, :orderId, :orderItemId, :productId, :buyerId, :rating, :comment)`,
      review,
    );
    await query(
      `UPDATE products p
          SET prod_review_count = (
                SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.prod_id
              ),
              prod_avr_rating = (
                SELECT AVG(pr.rating) FROM product_reviews pr WHERE pr.product_id = p.prod_id
              )
        WHERE p.prod_id = :productId`,
      { productId },
    );
    const [order] = await loadOrders('WHERE o.order_id = :orderId', { orderId });
    res.status(201).json({ review, order });
  } catch (error) {
    next(error);
  }
});

app.use((err, _req, res) => {
  console.error(err);
  res.status(500).json({ msg: 'Server error', detail: err.message });
});

const loadPersistentNoSqlStore = async (defaults) => {
  if (isFirebaseConfigured) {
    try {
      const collections = await loadFirebaseStore(defaults);
      if (collections) {
        activeNoSqlMode = 'firebase';
        activeStoreName = firebaseStoreName;
        saveCollections = saveFirebaseStore;
        return collections;
      }
    } catch (error) {
      console.warn('Firebase Firestore unavailable; falling back to local JSON document store.');
      console.warn(error.message);
    }
  }

  activeNoSqlMode = 'nosql';
  activeStoreName = `local JSON document store (${nosqlDbPath})`;
  saveCollections = saveNoSqlStore;
  return loadNoSqlStore(defaults);
};

loadPersistentNoSqlStore(defaultNoSqlCollections())
  .then(async (collections) => {
    applyNoSqlCollections(collections);
    await saveNoSqlState();
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
      console.log(`NoSQL document database: ${activeStoreName}`);
    });
  })
  .catch((error) => {
    dbReady = false;
    applyNoSqlCollections(defaultNoSqlCollections());
    console.warn('NoSQL database unavailable; using in-memory fallback.');
    console.warn(error.message);
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  });
