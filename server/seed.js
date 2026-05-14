import { DEFAULT_ADMIN, PRODUCTS } from '../src/data/mock.js';
import { isDbConfigured, query } from './db.js';

const toProductRows = () => PRODUCTS.map((product) => ({
  ...product,
  images: JSON.stringify(product.images || [product.image]),
}));

export const ensureSeedData = async () => {
  if (!isDbConfigured) return;

  await query(
    `INSERT IGNORE INTO users
      (id, email, password, name, role, verified, business_name, id_document, created_at)
     VALUES
      (:id, :email, :password, :name, :role, :verified, :businessName, :idDocument, NOW())`,
    {
      id: DEFAULT_ADMIN.id,
      email: DEFAULT_ADMIN.email,
      password: DEFAULT_ADMIN.password,
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role,
      verified: DEFAULT_ADMIN.verified ? 1 : 0,
      businessName: DEFAULT_ADMIN.businessName || null,
      idDocument: DEFAULT_ADMIN.idDocument || null,
    },
  );

  for (const product of toProductRows()) {
    await query(
      `INSERT IGNORE INTO products
        (id, name, price, original_price, image, category, rating, sold, seller_id, stock, discount, brand, description, images)
       VALUES
        (:id, :name, :price, :originalPrice, :image, :category, :rating, :sold, :sellerId, :stock, :discount, :brand, :description, :images)`,
      product,
    );
  }
};
