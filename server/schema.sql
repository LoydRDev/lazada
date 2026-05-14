CREATE DATABASE IF NOT EXISTS lazada_ph;
USE lazada_ph;

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY,
  user_fname VARCHAR(50) NOT NULL,
  user_lname VARCHAR(50) NOT NULL,
  user_email VARCHAR(100) NOT NULL UNIQUE,
  user_pwdhash VARCHAR(255) NOT NULL,
  user_phone_no VARCHAR(20) NOT NULL DEFAULT '+630000000000',
  user_default_address JSON NULL,
  date_registered DATE NOT NULL DEFAULT (CURRENT_DATE),
  user_acct_stat ENUM('Active', 'Suspended', 'Banned', 'Inactive') NOT NULL DEFAULT 'Active',
  user_role ENUM('Buyer', 'Seller', 'Admin', 'Moderator') NOT NULL DEFAULT 'Buyer',
  user_verified BOOLEAN NOT NULL DEFAULT FALSE,
  INDEX idx_users_email (user_email),
  INDEX idx_users_role (user_role)
);

CREATE TABLE IF NOT EXISTS sellers (
  sell_id INT PRIMARY KEY,
  sell_user_id INT NOT NULL UNIQUE,
  sell_store_name VARCHAR(100) NOT NULL,
  sell_b_name VARCHAR(150) NOT NULL,
  sell_b_permit_no VARCHAR(50) NOT NULL,
  sell_rating DECIMAL(2, 1) NULL,
  date_joined DATE NOT NULL DEFAULT (CURRENT_DATE),
  sell_store_status ENUM('Pending', 'Active', 'Suspended', 'Closed') NOT NULL DEFAULT 'Pending',
  CONSTRAINT fk_sellers_user FOREIGN KEY (sell_user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  cat_id INT PRIMARY KEY,
  cat_parent_category_id INT NULL,
  cat_slug VARCHAR(80) NOT NULL UNIQUE,
  cat_name VARCHAR(100) NOT NULL,
  cat_description TEXT NULL,
  cat_status ENUM('Active', 'Inactive', 'Hidden') NOT NULL DEFAULT 'Active',
  CONSTRAINT fk_categories_parent FOREIGN KEY (cat_parent_category_id) REFERENCES categories (cat_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
  prod_id INT PRIMARY KEY,
  prod_sell_id INT NOT NULL,
  prod_cat_id INT NOT NULL,
  prod_name VARCHAR(200) NOT NULL,
  prod_desc TEXT NOT NULL,
  prod_price DECIMAL(10, 2) NOT NULL,
  prod_stock_qty INT NOT NULL DEFAULT 0,
  prod_brand VARCHAR(100) NULL,
  prod_weight DECIMAL(6, 2) NOT NULL DEFAULT 0.01,
  date_added DATE NOT NULL DEFAULT (CURRENT_DATE),
  prod_status ENUM('Pending', 'Active', 'OutOfStock', 'Discontinued', 'Rejected') NOT NULL DEFAULT 'Active',
  prod_sku VARCHAR(50) NOT NULL,
  prod_condition ENUM('New', 'Used', 'Refurbished') NOT NULL DEFAULT 'New',
  prod_wrty_mnths INT NULL,
  prod_avr_rating DECIMAL(2, 1) NULL,
  prod_review_count INT NULL DEFAULT 0,
  prod_total_sold INT NULL DEFAULT 0,
  prod_discount_percent DECIMAL(5, 2) NULL DEFAULT 0.00,
  prod_disc_end_date DATE NULL,
  prod_specs JSON NULL,
  prod_original_price DECIMAL(10, 2) NOT NULL,
  prod_image TEXT NOT NULL,
  prod_images JSON NULL,
  CONSTRAINT fk_products_seller FOREIGN KEY (prod_sell_id) REFERENCES sellers (sell_id),
  CONSTRAINT fk_products_category FOREIGN KEY (prod_cat_id) REFERENCES categories (cat_id),
  INDEX idx_products_category (prod_cat_id),
  INDEX idx_products_seller (prod_sell_id),
  INDEX idx_products_status (prod_status)
);

CREATE TABLE IF NOT EXISTS orders (
  order_id INT PRIMARY KEY,
  order_user_id INT NOT NULL,
  order_vouch_id INT NULL,
  order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  order_total_amt DECIMAL(10, 2) NOT NULL,
  order_discount_amt DECIMAL(10, 2) NULL DEFAULT 0.00,
  order_final_amt DECIMAL(10, 2) NOT NULL,
  order_payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
  order_status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned') NOT NULL DEFAULT 'Pending',
  order_cancel_reason TEXT NULL,
  order_status_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  order_delivery_address JSON NOT NULL,
  order_items_snapshot JSON NOT NULL,
  order_payment_method VARCHAR(40) NOT NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (order_user_id) REFERENCES users (user_id),
  INDEX idx_orders_user (order_user_id),
  INDEX idx_orders_status (order_status)
);

CREATE TABLE IF NOT EXISTS order_items (
  oitem_id INT PRIMARY KEY,
  oitem_order_id INT NOT NULL,
  oitem_prod_id INT NOT NULL,
  oitem_quantity INT NOT NULL,
  oitem_unit_price DECIMAL(10, 2) NOT NULL,
  oitem_subtotal DECIMAL(10, 2) NOT NULL,
  oitem_item_status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Returned') NOT NULL DEFAULT 'Pending',
  CONSTRAINT fk_order_items_order FOREIGN KEY (oitem_order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (oitem_prod_id) REFERENCES products (prod_id),
  INDEX idx_order_items_order (oitem_order_id)
);

CREATE TABLE IF NOT EXISTS payments (
  paymt_id INT PRIMARY KEY,
  paymt_order_id INT NOT NULL,
  paymt_method ENUM('CreditCard', 'DebitCard', 'GCash', 'PayMaya', 'BankTransfer', 'COD') NOT NULL,
  paymt_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paymt_amount_paid DECIMAL(10, 2) NOT NULL,
  paymt_transac_ref VARCHAR(100) NOT NULL,
  paymt_status ENUM('Pending', 'Completed', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
  paymt_gateway ENUM('LazadaPay', 'PayMongo', 'Dragonpay', 'PayPal') NOT NULL DEFAULT 'LazadaPay',
  paymt_fail_reason TEXT NULL,
  CONSTRAINT fk_payments_order FOREIGN KEY (paymt_order_id) REFERENCES orders (order_id) ON DELETE CASCADE
);

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
);

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
);

CREATE TABLE IF NOT EXISTS review_ratings (
  rrate_id INT PRIMARY KEY,
  rrate_user_id INT NOT NULL,
  rrate_prod_id INT NOT NULL,
  rrate_order_id INT NOT NULL,
  rrate_rating_value TINYINT NOT NULL,
  rrate_comment TEXT NULL,
  rrate_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rrate_status ENUM('Pending', 'Approved', 'Rejected', 'Flagged') NOT NULL DEFAULT 'Pending',
  rrate_helpful_count INT NULL DEFAULT 0,
  rrate_unhelpful_count INT NULL DEFAULT 0,
  rrate_response TEXT NULL,
  rrate_response_date DATETIME NULL,
  rrate_rating_accuracy TINYINT NULL,
  rrate_rating_shipping TINYINT NULL,
  CONSTRAINT fk_reviews_user FOREIGN KEY (rrate_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (rrate_prod_id) REFERENCES products (prod_id),
  CONSTRAINT fk_reviews_order FOREIGN KEY (rrate_order_id) REFERENCES orders (order_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS voucher_coupons (
  vouch_id INT PRIMARY KEY,
  vouch_code VARCHAR(50) NOT NULL UNIQUE,
  vouch_discount_type ENUM('Percent', 'Fixed') NOT NULL,
  vouch_discount_value DECIMAL(10, 2) NOT NULL,
  vouch_expiry_date DATE NOT NULL,
  vouch_minimum_spend DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  vouch_usage_limit INT NOT NULL,
  vouch_used_count INT NULL DEFAULT 0,
  vouch_status ENUM('Active', 'Expired', 'Disabled', 'FullyUsed') NOT NULL DEFAULT 'Active',
  vouch_user_id INT NULL,
  vouch_date_used DATETIME NULL,
  vouch_type ENUM('Welcome', 'Seasonal', 'FlashSale', 'StoreSpecific', 'Category Specific') NOT NULL,
  vouch_cat_id INT NULL,
  vouch_sell_id INT NULL,
  CONSTRAINT fk_vouchers_user FOREIGN KEY (vouch_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_vouchers_category FOREIGN KEY (vouch_cat_id) REFERENCES categories (cat_id) ON DELETE SET NULL,
  CONSTRAINT fk_vouchers_seller FOREIGN KEY (vouch_sell_id) REFERENCES sellers (sell_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS carts (
  cart_id INT PRIMARY KEY,
  cart_user_id INT NOT NULL,
  cart_date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cart_last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cart_total_amount DECIMAL(10, 2) NULL DEFAULT 0.00,
  cart_item_count INT NULL DEFAULT 0,
  CONSTRAINT fk_carts_user FOREIGN KEY (cart_user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cart_items (
  citem_id INT PRIMARY KEY,
  citem_cart_id INT NOT NULL,
  citem_prod_id INT NOT NULL,
  citem_qty INT NOT NULL,
  citem_date_added DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  citem_is_selected BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (citem_cart_id) REFERENCES carts (cart_id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (citem_prod_id) REFERENCES products (prod_id)
);
