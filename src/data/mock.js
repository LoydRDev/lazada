// Mock data for Lazada PH clone

console.log("mock loaded"); 

export const CATEGORIES = [
  { id: 'electronics', name: 'Electronic Devices', icon: 'Smartphone' },
  { id: 'accessories', name: 'Electronic Accessories', icon: 'Headphones' },
  { id: 'tv', name: 'TV & Home Appliances', icon: 'Tv' },
  { id: 'beauty', name: 'Health & Beauty', icon: 'Sparkles' },
  { id: 'fashion', name: "Women's Fashion", icon: 'Shirt' },
  { id: 'men', name: "Men's Fashion", icon: 'User' },
  { id: 'watches', name: 'Watches & Jewelry', icon: 'Watch' },
  { id: 'baby', name: 'Babies & Toys', icon: 'Baby' },
  { id: 'groceries', name: 'Groceries & Pets', icon: 'ShoppingBasket' },
  { id: 'home', name: 'Home & Lifestyle', icon: 'Home' },
  { id: 'sports', name: 'Sports & Outdoor', icon: 'Bike' },
  { id: 'auto', name: 'Automotive & Motorcycle', icon: 'Car' },
];

export const HERO_BANNERS = [
  {
    id: 1,
    title: 'Mega Sale 11.11',
    subtitle: 'Up to 90% OFF',
    cta: 'Shop Now',
    bg: 'linear-gradient(135deg, #fe4c0a 0%, #ff7a45 100%)',
  },
  {
    id: 2,
    title: 'Free Shipping',
    subtitle: 'On orders over ₱499',
    cta: 'Learn More',
    bg: 'linear-gradient(135deg, #2874f0 0%, #4a8bff 100%)',
  },
  {
    id: 3,
    title: 'LazMall Brand Day',
    subtitle: '100% Authentic Brands',
    cta: 'Explore LazMall',
    bg: 'linear-gradient(135deg, #0F146D 0%, #2a3aa0 100%)',
  },
];

const IMG = {
  phone1: 'https://images.unsplash.com/photo-1634403665481-74948d815f03',
  phone2: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
  phone3: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
  hp1: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
  hp2: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
  hp3: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb',
  hp4: 'https://images.unsplash.com/photo-1545127398-14699f92334b',
  hp5: 'https://images.pexels.com/photos/35235991/pexels-photo-35235991.jpeg',
  hp6: 'https://images.pexels.com/photos/5269759/pexels-photo-5269759.jpeg',
  sn1: 'https://images.unsplash.com/photo-1552346154-21d32810aba3',
  sn2: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a',
  sn3: 'https://images.unsplash.com/photo-1608667508764-33cf0726b13a',
  sn4: 'https://images.pexels.com/photos/13560373/pexels-photo-13560373.jpeg',
  sn5: 'https://images.pexels.com/photos/14337851/pexels-photo-14337851.jpeg',
  sn6: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28',
  w1: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49',
  w2: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa',
  w3: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6',
  w4: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d',
  w5: 'https://images.pexels.com/photos/30508184/pexels-photo-30508184.jpeg',
  w6: 'https://images.pexels.com/photos/29639117/pexels-photo-29639117.jpeg',
  c1: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
  c2: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd',
  c3: 'https://images.unsplash.com/photo-1495707902641-75cac588d2e9',
};

export const PRODUCTS = [
  { id: 'p1', name: 'iPhone 15 Pro Max 256GB Titanium', price: 78990, originalPrice: 89990, image: IMG.phone1, category: 'electronics', rating: 4.9, sold: 2300, sellerId: 's1', stock: 25, discount: 12, brand: 'Apple', description: 'Latest A17 Pro chip, titanium design, 48MP camera system. 1-year warranty included.', images: [IMG.phone1, IMG.phone2, IMG.phone3] },
  { id: 'p2', name: 'Samsung Galaxy S24 Ultra 512GB', price: 69990, originalPrice: 84990, image: IMG.phone2, category: 'electronics', rating: 4.8, sold: 1850, sellerId: 's2', stock: 40, discount: 18, brand: 'Samsung', description: 'AI-powered photography, S Pen included, 200MP camera. Galaxy AI features.', images: [IMG.phone2, IMG.phone1] },
  { id: 'p3', name: 'Xiaomi Redmi Note 13 Pro 256GB', price: 14990, originalPrice: 19990, image: IMG.phone3, category: 'electronics', rating: 4.7, sold: 5600, sellerId: 's3', stock: 120, discount: 25, brand: 'Xiaomi', description: '200MP main camera, 67W turbo charging, AMOLED 120Hz display.', images: [IMG.phone3, IMG.phone1] },
  { id: 'p4', name: 'Sony WH-1000XM5 Noise Cancelling Headphones', price: 19990, originalPrice: 24990, image: IMG.hp1, category: 'accessories', rating: 4.9, sold: 980, sellerId: 's1', stock: 35, discount: 20, brand: 'Sony', description: 'Industry-leading noise cancellation, 30-hour battery life, multi-device pairing.', images: [IMG.hp1, IMG.hp2] },
  { id: 'p5', name: 'Apple AirPods Pro 2nd Gen USB-C', price: 13490, originalPrice: 15990, image: IMG.hp2, category: 'accessories', rating: 4.8, sold: 3400, sellerId: 's1', stock: 60, discount: 16, brand: 'Apple', description: 'Adaptive Audio, Active Noise Cancellation, MagSafe charging case.', images: [IMG.hp2, IMG.hp3] },
  { id: 'p6', name: 'JBL Tune 760NC Wireless Headphones', price: 4990, originalPrice: 7990, image: IMG.hp3, category: 'accessories', rating: 4.6, sold: 2100, sellerId: 's2', stock: 80, discount: 38, brand: 'JBL', description: 'Pure Bass sound, Active Noise Cancellation, 50-hour battery life.', images: [IMG.hp3, IMG.hp4] },
  { id: 'p7', name: 'Bose QuietComfort 45 Wireless', price: 17990, originalPrice: 22990, image: IMG.hp4, category: 'accessories', rating: 4.8, sold: 720, sellerId: 's3', stock: 22, discount: 22, brand: 'Bose', description: 'TriPort acoustic, 24-hour battery, hands-free calls.', images: [IMG.hp4, IMG.hp5] },
  { id: 'p8', name: 'Marshall Major IV On-Ear Bluetooth', price: 8990, originalPrice: 11990, image: IMG.hp5, category: 'accessories', rating: 4.7, sold: 540, sellerId: 's2', stock: 18, discount: 25, brand: 'Marshall', description: '80+ hours playtime, wireless charging, classic Marshall design.', images: [IMG.hp5, IMG.hp6] },
  { id: 'p9', name: 'Beats Studio Pro Wireless', price: 16490, originalPrice: 19990, image: IMG.hp6, category: 'accessories', rating: 4.6, sold: 880, sellerId: 's1', stock: 30, discount: 18, brand: 'Beats', description: 'Personalized Spatial Audio, Lossless Audio via USB-C.', images: [IMG.hp6, IMG.hp1] },
  { id: 'p10', name: 'Nike Air Jordan 1 Retro High OG', price: 12500, originalPrice: 16500, image: IMG.sn1, category: 'men', rating: 4.9, sold: 1230, sellerId: 's4', stock: 45, discount: 24, brand: 'Nike', description: 'Iconic high-top silhouette, premium leather upper, Air-Sole cushioning.', images: [IMG.sn1, IMG.sn2] },
  { id: 'p11', name: 'Nike Air Force 1 Low White', price: 6995, originalPrice: 8500, image: IMG.sn2, category: 'men', rating: 4.8, sold: 4200, sellerId: 's4', stock: 200, discount: 18, brand: 'Nike', description: 'Classic basketball style, durable leather construction, low-cut comfort.', images: [IMG.sn2, IMG.sn3] },
  { id: 'p12', name: 'Puma RS-X Reinvention Sneakers', price: 5990, originalPrice: 7990, image: IMG.sn3, category: 'men', rating: 4.7, sold: 1560, sellerId: 's4', stock: 75, discount: 25, brand: 'Puma', description: 'Bold chunky design, RS cushioning technology, breathable mesh.', images: [IMG.sn3, IMG.sn4] },
  { id: 'p13', name: 'Adidas Ultraboost 22 Running Shoes', price: 9990, originalPrice: 12990, image: IMG.sn4, category: 'sports', rating: 4.8, sold: 980, sellerId: 's5', stock: 60, discount: 23, brand: 'Adidas', description: 'Boost midsole responsiveness, Primeknit upper, Continental rubber outsole.', images: [IMG.sn4, IMG.sn5] },
  { id: 'p14', name: 'New Balance 574 Classic Sneakers', price: 5499, originalPrice: 6990, image: IMG.sn5, category: 'fashion', rating: 4.7, sold: 1340, sellerId: 's5', stock: 90, discount: 21, brand: 'New Balance', description: 'ENCAP midsole, suede and mesh upper, all-day comfort.', images: [IMG.sn5, IMG.sn6] },
  { id: 'p15', name: 'Converse Chuck Taylor All Star Hi', price: 3490, originalPrice: 4500, image: IMG.sn6, category: 'fashion', rating: 4.8, sold: 5600, sellerId: 's5', stock: 300, discount: 22, brand: 'Converse', description: 'Timeless canvas sneaker, rubber toe cap, OrthoLite insole.', images: [IMG.sn6, IMG.sn1] },
  { id: 'p16', name: 'Casio G-Shock GA-2100 CasiOak', price: 5990, originalPrice: 7990, image: IMG.w1, category: 'watches', rating: 4.9, sold: 3200, sellerId: 's6', stock: 110, discount: 25, brand: 'Casio', description: 'Carbon Core Guard, 200m water resistance, shock resistant.', images: [IMG.w1, IMG.w2] },
  { id: 'p17', name: 'Seiko 5 Sports Automatic Watch', price: 12500, originalPrice: 15990, image: IMG.w2, category: 'watches', rating: 4.8, sold: 680, sellerId: 's6', stock: 28, discount: 22, brand: 'Seiko', description: 'Automatic movement, day-date display, 100m water resistance.', images: [IMG.w2, IMG.w3] },
  { id: 'p18', name: 'Apple Watch Series 9 GPS 45mm', price: 22990, originalPrice: 26990, image: IMG.w3, category: 'watches', rating: 4.9, sold: 1450, sellerId: 's1', stock: 50, discount: 15, brand: 'Apple', description: 'S9 chip, Double Tap gesture, brightest Retina display ever.', images: [IMG.w3, IMG.w4] },
  { id: 'p19', name: 'Fossil Gen 6 Smartwatch', price: 11990, originalPrice: 16990, image: IMG.w4, category: 'watches', rating: 4.6, sold: 420, sellerId: 's6', stock: 35, discount: 29, brand: 'Fossil', description: 'Wear OS by Google, SpO2 tracking, fast charging.', images: [IMG.w4, IMG.w5] },
  { id: 'p20', name: 'Garmin Forerunner 265 GPS Watch', price: 24990, originalPrice: 29990, image: IMG.w5, category: 'sports', rating: 4.8, sold: 320, sellerId: 's5', stock: 18, discount: 17, brand: 'Garmin', description: 'AMOLED display, advanced running metrics, multi-band GPS.', images: [IMG.w5, IMG.w6] },
  { id: 'p21', name: 'Tissot PRX Powermatic 80 Watch', price: 32990, originalPrice: 38990, image: IMG.w6, category: 'watches', rating: 4.9, sold: 180, sellerId: 's6', stock: 12, discount: 15, brand: 'Tissot', description: 'Swiss automatic movement, integrated bracelet, 80-hour power reserve.', images: [IMG.w6, IMG.w1] },
  { id: 'p22', name: 'Sony Alpha A7 IV Mirrorless Camera Body', price: 124990, originalPrice: 139990, image: IMG.c1, category: 'electronics', rating: 4.9, sold: 85, sellerId: 's3', stock: 8, discount: 11, brand: 'Sony', description: '33MP full-frame sensor, 4K 60p video, advanced autofocus.', images: [IMG.c1, IMG.c2] },
  { id: 'p23', name: 'Canon EOS R6 Mark II Mirrorless', price: 134990, originalPrice: 149990, image: IMG.c2, category: 'electronics', rating: 4.9, sold: 62, sellerId: 's3', stock: 6, discount: 10, brand: 'Canon', description: '24.2MP CMOS, 40fps burst shooting, 6K oversampled 4K video.', images: [IMG.c2, IMG.c3] },
  { id: 'p24', name: 'Fujifilm X-T5 Mirrorless Body', price: 89990, originalPrice: 99990, image: IMG.c3, category: 'electronics', rating: 4.8, sold: 110, sellerId: 's3', stock: 14, discount: 10, brand: 'Fujifilm', description: '40MP X-Trans CMOS 5 HR sensor, 5-axis IBIS, retro design.', images: [IMG.c3, IMG.c1] },
];

export const FLASH_SALE = PRODUCTS.slice(0, 8).map(p => ({ ...p, flashPrice: Math.round(p.price * 0.7) }));
export const RECOMMENDED = PRODUCTS;

export const SELLERS = [
  { id: 's1', name: 'Apple Authorized Store', verified: true, rating: 4.9, products: 156, followers: '125K' },
  { id: 's2', name: 'Samsung Official', verified: true, rating: 4.8, products: 230, followers: '98K' },
  { id: 's3', name: 'TechHub Manila', verified: true, rating: 4.7, products: 420, followers: '54K' },
  { id: 's4', name: 'Sneaker Plug PH', verified: true, rating: 4.8, products: 89, followers: '32K' },
  { id: 's5', name: 'SportsCentral', verified: true, rating: 4.6, products: 312, followers: '21K' },
  { id: 's6', name: 'Timepiece Gallery', verified: true, rating: 4.9, products: 67, followers: '18K' },
];

export const VOUCHERS = [
  { code: 'NEW50', label: '₱50 OFF', desc: 'Min. spend ₱500. New users only.' },
  { code: 'FREESHIP', label: 'Free Shipping', desc: 'Min. spend ₱299.' },
  { code: 'MEGA15', label: '15% OFF', desc: 'Max ₱300. Min. spend ₱1000.' },
];

export const MOCK_USERS_KEY = 'lazada_users';
export const MOCK_SESSION_KEY = 'lazada_session';
export const MOCK_CART_KEY = 'lazada_cart';
export const MOCK_ORDERS_KEY = 'lazada_orders';
export const MOCK_SELLER_PRODUCTS_KEY = 'lazada_seller_products';

// Default seeded admin
export const DEFAULT_ADMIN = {
  id: 'admin1', email: 'admin@lazada.ph', password: 'admin123', name: 'Admin', role: 'admin', verified: true,
};
