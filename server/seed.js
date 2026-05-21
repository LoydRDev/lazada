import { CATEGORIES, DEFAULT_ADMIN, PRODUCTS, SELLERS } from './seedData.js';
import { isDbConfigured, query } from './db.js';

const ADMIN_USER_ID = 100000;
const CATEGORY_BASE_ID = 10000;
const SELLER_USER_BASE_ID = 100001;
const SELLER_BASE_ID = 100000;
const PRODUCT_BASE_ID = 10000000;
const DEFAULT_COURIERS = [
  { id: 700001, name: 'Juan Dela Cruz', phone: '+639171110001', email: 'juan.driver@lazada.local', vehicle: 'Motorcycle', plate: 'NCR-1021', company: 'Lazada Logistics' },
  { id: 700002, name: 'Maria Santos', phone: '+639171110002', email: 'maria.driver@lazada.local', vehicle: 'Van', plate: 'NCR-2045', company: 'Lazada Logistics' },
  { id: 700003, name: 'Carlo Reyes', phone: '+639171110003', email: 'carlo.driver@lazada.local', vehicle: 'Motorcycle', plate: 'NCR-7788', company: 'Lazada Express' },
];

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

const ensureColumnType = async (tableName, columnName, definition) => {
  const existing = await query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
        AND COLUMN_NAME = :columnName
      LIMIT 1`,
    { tableName, columnName },
  );

  if (existing.length) {
    await query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${definition}`);
  }
};

const ensureSchemaPatches = async () => {
  await ensureColumn('users', 'user_default_address', 'JSON NULL AFTER user_phone_no');
  await ensureColumnType('users', 'user_role', "ENUM('Buyer', 'Seller', 'Admin', 'Moderator', 'Driver') NOT NULL DEFAULT 'Buyer'");
  await ensureColumn('categories', 'cat_icon', 'VARCHAR(80) NULL AFTER cat_description');
  await ensureColumnType('orders', 'order_status', "VARCHAR(40) NOT NULL DEFAULT 'pending_approval'");
  await ensureColumnType('order_items', 'oitem_item_status', "VARCHAR(40) NOT NULL DEFAULT 'pending_approval'");
  await ensureColumn('order_items', 'oitem_sell_id', 'INT NULL AFTER oitem_prod_id');
  await ensureColumn('order_items', 'oitem_buyer_id', 'INT NULL AFTER oitem_sell_id');
  await ensureColumn('order_items', 'oitem_variant_id', 'INT NULL AFTER oitem_subtotal');
  await ensureColumn('order_items', 'oitem_variant_name', 'VARCHAR(255) NULL AFTER oitem_variant_id');
  await ensureColumn('order_items', 'oitem_selected_options', 'JSON NULL AFTER oitem_variant_name');
  await ensureColumn('order_items', 'oitem_driver_id', 'INT NULL AFTER oitem_selected_options');
  await ensureColumn('order_items', 'oitem_driver_name', 'VARCHAR(100) NULL AFTER oitem_driver_id');
  await ensureColumn('order_items', 'oitem_driver_phone', 'VARCHAR(30) NULL AFTER oitem_driver_name');
  await ensureColumn('order_items', 'oitem_driver_vehicle', 'VARCHAR(60) NULL AFTER oitem_driver_phone');
  await ensureColumn('order_items', 'oitem_tracking_number', 'VARCHAR(80) NULL AFTER oitem_driver_vehicle');
  await ensureColumn('order_items', 'oitem_delivery_status', 'VARCHAR(40) NULL AFTER oitem_tracking_number');
  await ensureColumn('order_items', 'oitem_created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER oitem_item_status');
  await ensureColumn('order_items', 'oitem_updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER oitem_created_at');
  await ensureColumn('cart_items', 'citem_variant_id', 'INT NULL AFTER citem_prod_id');
  await ensureColumn('cart_items', 'citem_variant_name', 'VARCHAR(255) NULL AFTER citem_variant_id');
  await ensureColumn('cart_items', 'citem_selected_options', 'JSON NULL AFTER citem_variant_name');
  await ensureColumn('cart_items', 'citem_price_at_purchase', 'DECIMAL(10, 2) NULL AFTER citem_selected_options');

  await query(`
    CREATE TABLE IF NOT EXISTS product_images (
      image_id INT PRIMARY KEY,
      product_id INT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_product_images_product (product_id),
      CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (prod_id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS product_variant_groups (
      group_id INT PRIMARY KEY,
      product_id INT NOT NULL,
      name VARCHAR(80) NOT NULL,
      INDEX idx_variant_groups_product (product_id),
      CONSTRAINT fk_variant_groups_product FOREIGN KEY (product_id) REFERENCES products (prod_id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS product_variant_options (
      option_id INT PRIMARY KEY,
      group_id INT NOT NULL,
      value VARCHAR(120) NOT NULL,
      INDEX idx_variant_options_group (group_id),
      CONSTRAINT fk_variant_options_group FOREIGN KEY (group_id) REFERENCES product_variant_groups (group_id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      variant_id INT PRIMARY KEY,
      product_id INT NOT NULL,
      sku VARCHAR(80) NOT NULL,
      variant_name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      image_url TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      selected_options JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_product_variant_sku (product_id, sku),
      INDEX idx_product_variants_product (product_id),
      INDEX idx_product_variants_status (status),
      CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products (prod_id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      log_id INT PRIMARY KEY,
      admin_user_id INT NOT NULL,
      action VARCHAR(80) NOT NULL,
      detail JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_logs_admin (admin_user_id),
      INDEX idx_admin_logs_action (action),
      CONSTRAINT fk_admin_logs_user FOREIGN KEY (admin_user_id) REFERENCES users (user_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS product_removal_logs (
      removal_id INT PRIMARY KEY,
      product_id INT NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      admin_user_id INT NOT NULL,
      reason TEXT NULL,
      removed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_product_removal_logs_admin (admin_user_id),
      INDEX idx_product_removal_logs_product (product_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS couriers (
      cr_id INT PRIMARY KEY,
      cr_name VARCHAR(100) NOT NULL,
      cr_phone_no VARCHAR(20) NOT NULL,
      cr_email VARCHAR(100) NULL,
      cr_vehicle_type ENUM('Motorcycle', 'Car', 'Van', 'Truck', 'Bicycle') NOT NULL,
      cr_plate_no VARCHAR(20) NOT NULL,
      cr_company VARCHAR(100) NOT NULL,
      cr_status ENUM('Active', 'Inactive', 'OnLeave', 'Suspended') NOT NULL DEFAULT 'Active',
      cr_date_registered DATE NOT NULL DEFAULT (CURRENT_DATE),
      cr_rating DECIMAL(2, 1) NULL,
      cr_delivery_count INT NULL DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS shipment_deliveries (
      ship_id INT PRIMARY KEY,
      ship_cr_id INT NOT NULL,
      ship_order_id INT NOT NULL,
      ship_tracking_number VARCHAR(50) NOT NULL,
      ship_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ship_estimated_delivery DATE NOT NULL,
      ship_delivery_date DATETIME NULL,
      ship_fee DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
      ship_delivery_status ENUM('Pending', 'PickedUp', 'InTransit', 'OutForDelivery', 'Delivered', 'Failed', 'Returned') NOT NULL DEFAULT 'Pending',
      ship_delivery_notes TEXT NULL,
      ship_receiver_signature VARCHAR(100) NULL,
      CONSTRAINT fk_shipments_courier FOREIGN KEY (ship_cr_id) REFERENCES couriers (cr_id),
      CONSTRAINT fk_shipments_order FOREIGN KEY (ship_order_id) REFERENCES orders (order_id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      review_id INT PRIMARY KEY,
      order_id INT NOT NULL,
      order_item_id INT NOT NULL,
      product_id INT NOT NULL,
      buyer_id INT NOT NULL,
      rating TINYINT NOT NULL,
      comment TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_product_reviews_order_item (order_item_id),
      INDEX idx_product_reviews_product (product_id),
      INDEX idx_product_reviews_buyer (buyer_id),
      CONSTRAINT fk_product_reviews_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
      CONSTRAINT fk_product_reviews_order_item FOREIGN KEY (order_item_id) REFERENCES order_items (oitem_id) ON DELETE CASCADE,
      CONSTRAINT fk_product_reviews_product FOREIGN KEY (product_id) REFERENCES products (prod_id),
      CONSTRAINT fk_product_reviews_buyer FOREIGN KEY (buyer_id) REFERENCES users (user_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      history_id INT PRIMARY KEY,
      order_id INT NOT NULL,
      order_item_id INT NOT NULL,
      previous_status VARCHAR(40) NULL,
      next_status VARCHAR(40) NOT NULL,
      changed_by_id INT NOT NULL,
      changed_by_role VARCHAR(20) NOT NULL,
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_order_status_history_order (order_id),
      INDEX idx_order_status_history_item (order_item_id),
      CONSTRAINT fk_status_history_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
      CONSTRAINT fk_status_history_item FOREIGN KEY (order_item_id) REFERENCES order_items (oitem_id) ON DELETE CASCADE
    )
  `);

  await query(`
    UPDATE order_items oi
    JOIN orders o ON o.order_id = oi.oitem_order_id
    JOIN products p ON p.prod_id = oi.oitem_prod_id
       SET oi.oitem_sell_id = COALESCE(oi.oitem_sell_id, p.prod_sell_id),
           oi.oitem_buyer_id = COALESCE(oi.oitem_buyer_id, o.order_user_id),
           oi.oitem_item_status = CASE LOWER(oi.oitem_item_status)
             WHEN 'pending' THEN 'pending_approval'
             WHEN 'processing' THEN 'to_be_packed'
             WHEN 'shipped' THEN 'shipping'
             WHEN 'delivered' THEN 'delivered'
             WHEN 'returned' THEN 'cancelled'
             ELSE LOWER(oi.oitem_item_status)
           END
  `);

  await query(`
    UPDATE orders
       SET order_status = CASE LOWER(order_status)
         WHEN 'pending' THEN 'pending_approval'
         WHEN 'processing' THEN 'to_be_packed'
         WHEN 'shipped' THEN 'shipping'
         WHEN 'delivered' THEN 'delivered'
         WHEN 'cancelled' THEN 'cancelled'
         WHEN 'returned' THEN 'cancelled'
         ELSE LOWER(order_status)
       END
  `);
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

  for (const courier of DEFAULT_COURIERS) {
    const names = splitName(courier.name);
    await query(
      `INSERT IGNORE INTO users
        (user_id, user_fname, user_lname, user_email, user_pwdhash, user_phone_no, user_role, user_verified, user_acct_stat)
       VALUES
        (:id, :firstName, :lastName, :email, 'driver123', :phone, 'Driver', 1, 'Active')`,
      {
        id: courier.id,
        firstName: names.firstName,
        lastName: names.lastName,
        email: courier.email,
        phone: courier.phone,
      },
    );
    await query(
      `INSERT IGNORE INTO couriers
        (cr_id, cr_name, cr_phone_no, cr_email, cr_vehicle_type, cr_plate_no, cr_company, cr_status)
       VALUES
        (:id, :name, :phone, :email, :vehicle, :plate, :company, 'Active')`,
      courier,
    );
  }

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
