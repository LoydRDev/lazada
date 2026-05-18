import { CATEGORIES, DEFAULT_ADMIN, PRODUCTS, SELLERS } from './seedData.js';
import { isDbConfigured, query } from './db.js';

const ADMIN_USER_ID = 100000;
const CATEGORY_BASE_ID = 10000;
const SELLER_USER_BASE_ID = 100001;
const SELLER_BASE_ID = 100000;
const PRODUCT_BASE_ID = 10000000;

const splitName = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Lazada',
    lastName: parts.slice(1).join(' ') || 'User',
  };
};

const sellerIdByMockId = new Map(SELLERS.map((seller, index) => [seller.id, SELLER_BASE_ID + index]));
const categoryIdBySlug = new Map(CATEGORIES.map((category, index) => [category.id, CATEGORY_BASE_ID + index]));
const subcategoryIdBySlug = new Map();

CATEGORIES.forEach((category, categoryIndex) => {
  category.subcategories?.forEach((subcategory, subcategoryIndex) => {
    const slug = `${category.id}-${subcategory.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
    subcategoryIdBySlug.set(slug, CATEGORY_BASE_ID + CATEGORIES.length + categoryIndex * 100 + subcategoryIndex);
  });
});

const ensureColumn = async (tableName, columnName, definition) => {
  const existing = await query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
        AND COLUMN_NAME = :columnName
      LIMIT 1`,
    { tableName, columnName },
  );

  if (!existing.length) {
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const ensureSchemaPatches = async () => {
  await ensureColumn('users', 'user_default_address', 'JSON NULL AFTER user_phone_no');
};

const paymentGatewayFromMethod = (method) => {
  if (method === 'GCash') return 'PayMongo';
  if (method === 'PayMaya') return 'PayMongo';
  if (method === 'COD') return 'Dragonpay';
  return 'LazadaPay';
};

export const ensureSellerForUser = async (user) => {
  if (!isDbConfigured) return null;

  const existing = await query('SELECT sell_id FROM sellers WHERE sell_user_id = :userId LIMIT 1', {
    userId: user.id,
  });
  if (existing.length) return existing[0].sell_id;

  const nextId = 100000 + (Number(user.id) % 900000);
  await query(
    `INSERT INTO sellers
      (sell_id, sell_user_id, sell_store_name, sell_b_name, sell_b_permit_no, sell_rating, sell_store_status)
     VALUES
      (:sellerId, :userId, :storeName, :businessName, :permitNo, :rating, :status)`,
    {
      sellerId: nextId,
      userId: user.id,
      storeName: user.storeName || user.businessName || `${user.name}'s Store`,
      businessName: user.businessName || `${user.name}'s Business`,
      permitNo: user.idDocument || `PERMIT-${user.id}`,
      rating: null,
      status: user.verified ? 'Active' : 'Pending',
    },
  );
  return nextId;
};

export const ensureSeedData = async () => {
  if (!isDbConfigured) return;

  await ensureSchemaPatches();

  const adminName = splitName(DEFAULT_ADMIN.name);
  await query(
    `INSERT IGNORE INTO users
      (user_id, user_fname, user_lname, user_email, user_pwdhash, user_phone_no, user_role, user_verified, user_acct_stat)
     VALUES
      (:id, :firstName, :lastName, :email, :password, :phone, :role, :verified, :status)`,
    {
      id: ADMIN_USER_ID,
      firstName: adminName.firstName,
      lastName: adminName.lastName,
      email: DEFAULT_ADMIN.email,
      password: DEFAULT_ADMIN.password,
      phone: '+630000000000',
      role: 'Admin',
      verified: DEFAULT_ADMIN.verified ? 1 : 0,
      status: 'Active',
    },
  );

  for (const [index, seller] of SELLERS.entries()) {
    const userId = SELLER_USER_BASE_ID + index;
    const sellerId = SELLER_BASE_ID + index;
    const names = splitName(seller.name);

    await query(
      `INSERT IGNORE INTO users
        (user_id, user_fname, user_lname, user_email, user_pwdhash, user_phone_no, user_role, user_verified, user_acct_stat)
       VALUES
        (:userId, :firstName, :lastName, :email, :password, :phone, 'Seller', 1, 'Active')`,
      {
        userId,
        firstName: names.firstName,
        lastName: names.lastName,
        email: `${seller.id}@seller.lazada.ph`,
        password: 'seller123',
        phone: `+63900000${String(index + 1).padStart(4, '0')}`,
      },
    );

    await query(
      `INSERT IGNORE INTO sellers
        (sell_id, sell_user_id, sell_store_name, sell_b_name, sell_b_permit_no, sell_rating, sell_store_status)
       VALUES
        (:sellerId, :userId, :storeName, :businessName, :permitNo, :rating, 'Active')`,
      {
        sellerId,
        userId,
        storeName: seller.name,
        businessName: seller.name,
        permitNo: `BP-${sellerId}`,
        rating: seller.rating,
      },
    );
  }

  for (const [index, category] of CATEGORIES.entries()) {
    const parentId = CATEGORY_BASE_ID + index;

    await query(
      `INSERT IGNORE INTO categories
        (cat_id, cat_slug, cat_name, cat_description, cat_status)
       VALUES
        (:id, :slug, :name, :description, 'Active')`,
      {
        id: parentId,
        slug: category.id,
        name: category.name,
        description: `${category.name} category`,
      },
    );

    for (const subcategory of category.subcategories || []) {
      const slug = `${category.id}-${subcategory.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      await query(
        `INSERT IGNORE INTO categories
          (cat_id, cat_parent_category_id, cat_slug, cat_name, cat_description, cat_status)
         VALUES
          (:id, :parentId, :slug, :name, :description, 'Active')`,
        {
          id: subcategoryIdBySlug.get(slug),
          parentId,
          slug,
          name: subcategory,
          description: `${subcategory} under ${category.name}`,
        },
      );
    }
  }

  for (const [index, product] of PRODUCTS.entries()) {
    const productId = PRODUCT_BASE_ID + index;
    await query(
      `INSERT IGNORE INTO products
        (prod_id, prod_sell_id, prod_cat_id, prod_name, prod_desc, prod_price, prod_stock_qty, prod_brand,
         prod_weight, prod_status, prod_sku, prod_condition, prod_avr_rating, prod_review_count,
         prod_total_sold, prod_discount_percent, prod_specs, prod_original_price, prod_image, prod_images)
       VALUES
        (:id, :sellerId, :categoryId, :name, :description, :price, :stock, :brand,
         :weight, 'Active', :sku, 'New', :rating, 0,
         :sold, :discount, :specs, :originalPrice, :image, :images)`,
      {
        id: productId,
        sellerId: sellerIdByMockId.get(product.sellerId) || SELLER_BASE_ID,
        categoryId: categoryIdBySlug.get(product.category) || CATEGORY_BASE_ID,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        brand: product.brand,
        weight: 1,
        sku: `SKU-${productId}`,
        rating: product.rating,
        sold: product.sold,
        discount: product.discount,
        specs: JSON.stringify({ sourceId: product.id }),
        originalPrice: product.originalPrice,
        image: product.image,
        images: JSON.stringify(product.images || [product.image]),
      },
    );
  }
};

export const ids = {
  categoryIdBySlug,
  paymentGatewayFromMethod,
};
