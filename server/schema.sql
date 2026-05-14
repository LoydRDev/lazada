CREATE DATABASE IF NOT EXISTS lazada_ph;
USE lazada_ph;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('buyer', 'seller', 'admin') NOT NULL DEFAULT 'buyer',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  business_name VARCHAR(255) NULL,
  id_document VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  original_price DECIMAL(12, 2) NOT NULL,
  image TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  rating DECIMAL(3, 2) NOT NULL DEFAULT 0,
  sold INT NOT NULL DEFAULT 0,
  seller_id VARCHAR(64) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  discount INT NOT NULL DEFAULT 0,
  brand VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  images JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_category (category),
  INDEX idx_products_seller (seller_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  items JSON NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  address JSON NOT NULL,
  payment VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_user (user_id)
);
