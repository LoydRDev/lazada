export { CATEGORIES, FLASH_SALE, PRODUCTS, RECOMMENDED, SELLERS, VOUCHERS } from './seedCatalog.js';
import { CATEGORIES } from './seedCatalog.js';

export const VISIBLE_CATEGORIES = CATEGORIES.filter((category) => !category.hidden);
