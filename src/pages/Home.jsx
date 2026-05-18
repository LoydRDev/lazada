import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { FLASH_SALE, PRODUCTS } from '../data/catalog';
import { useApp } from '../context/AppContext';
import { ProductCardSkeleton } from '../components/ProductCard';

const peso = (n) => `\u20b1${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const saleProducts = [
  {
    id: 'socket',
    name: 'OMNI Universal Socket Adapter 10A 250V - Travel Outlet',
    price: 55,
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=420&q=80',
    badge: 'OMNI',
    art: 'adapter',
  },
  {
    id: 'shorts',
    name: 'PRO COMBAT Running Shorts Sports Crossfit Training',
    price: 137,
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=420&q=80',
    badge: 'Pro Combat',
    art: 'shorts',
  },
  {
    id: 'freshener',
    name: 'Rivers Car Air Freshener / Hanging Diffuser Marine',
    price: 41.97,
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=420&q=80',
    badge: 'Rivers',
    art: 'bottle',
  },
  {
    id: 'powerbank',
    name: 'BAVIN PC091 20000mAh / PC097 10000mAh Powerbank',
    price: 362.81,
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=420&q=80',
    badge: 'BAVIN',
    art: 'powerbank',
  },
  {
    id: 'cable',
    name: 'UGREEN USB Type C Fast Charger Data Cord for Android',
    price: 78,
    image: 'https://images.unsplash.com/photo-1603539444875-76e7684265f6?auto=format&fit=crop&w=420&q=80',
    badge: 'UGREEN',
    art: 'cable',
  },
  {
    id: 'milk',
    name: 'Birch Tree Fortified Powdered Milk Lakas Pack 2kg',
    price: 506,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=420&q=80',
    badge: 'LazMart',
    art: 'milk',
  },
];

const categoryTiles = [
  { name: 'Thermal Flasks & Containers', category: 'home', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=240&q=80' },
  { name: 'Mini/Hand-Held Fans', category: 'tv', image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=240&q=80' },
  { name: 'Book Coverings & Accessories', category: 'baby', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=240&q=80' },
  { name: 'Blended Cooking Oil', category: 'groceries', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=240&q=80' },
  { name: "Women's Socks & Tights", category: 'fashion', image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=240&q=80' },
  { name: 'Phone Cables & Converters', category: 'accessories', image: 'https://images.unsplash.com/photo-1603539444875-76e7684265f6?auto=format&fit=crop&w=240&q=80' },
  { name: 'Hair Coloring', category: 'beauty', image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=240&q=80' },
  { name: 'Motorcycle Cleaners', category: 'auto', image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=240&q=80' },
  { name: 'Mobiles', category: 'electronics', image: PRODUCTS[0].image },
  { name: 'Fixture Parts & Valves', category: 'home', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=240&q=80' },
  { name: 'Body Moisturizers', category: 'beauty', image: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?auto=format&fit=crop&w=240&q=80' },
  { name: 'Outdoor Furniture Accessories', category: 'home', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=240&q=80' },
  { name: 'Toothpaste', category: 'beauty', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=240&q=80' },
  { name: 'Brooms', category: 'home', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=240&q=80' },
  { name: 'Safety Gloves', category: 'auto', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=240&q=80' },
  { name: 'Cookware Sets', category: 'home', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=240&q=80' },
];

const recommendationExtras = [
  { id: 'jfy1', name: 'Hisoo 10KG Auto Rice Dispenser | Sealed Container', price: 456.8, originalPrice: 1171.28, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=420&q=80', rating: 4.8, sold: 3382, discount: 61, badge: 'LazMall' },
  { id: 'jfy2', name: 'Dellcross Dishwashing Liquid - 1 Gallon Power Wash', price: 130.51, originalPrice: 352.73, image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=420&q=80', rating: 4.9, sold: 21799, discount: 63 },
  { id: 'jfy3', name: 'JISULIFE Life4 5000mAh Turbo Portable Fan', price: 799, originalPrice: 1331.67, image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=420&q=80', rating: 4.9, sold: 24051, discount: 40, badge: 'LazMall' },
  { id: 'jfy4', name: 'Panda 757 Crystal Tech Gel Pen 0.7mm 25pcs', price: 88, originalPrice: 157.14, image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=420&q=80', rating: 4.8, sold: 1495, discount: 44 },
  { id: 'jfy5', name: 'Running sneaker shoes for women korean flat Tennis', price: 199, originalPrice: 603.03, image: PRODUCTS[13].image, rating: 4.8, sold: 2999, discount: 67 },
  { id: 'jfy6', name: 'BritePH Anti-bacterial Dishwashing Liquid Kit', price: 265, originalPrice: 301.14, image: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=420&q=80', rating: 4.9, sold: 1912, discount: 12, badge: 'LazMall' },
  { id: 'jfy7', name: 'Hana Shampoo Pink Passion 2x200ml', price: 128, originalPrice: 128, image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=420&q=80', rating: 4.8, sold: 1331, badge: 'LazMall' },
  { id: 'jfy8', name: '12 Pairs/6 Pairs School Student Socks Calf High', price: 95, originalPrice: 158.33, image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=420&q=80', rating: 4.8, sold: 3501, discount: 40 },
  { id: 'jfy9', name: 'PULLSTRING CROPTOP FABRIC COTTON FIT T-shirt', price: 85, originalPrice: 85, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=420&q=80', rating: 4.7, sold: 684 },
  { id: 'jfy10', name: 'Double-Sided Baby Playmat - Big Size Odorless Mat', price: 126, originalPrice: 150, image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=420&q=80', rating: 4.8, sold: 1053, discount: 16 },
  { id: 'jfy11', name: '1-2 Layers Stainless Steel Bento Lunch Box Food Container', price: 77.81, originalPrice: 89.44, image: 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?auto=format&fit=crop&w=420&q=80', rating: 4.8, sold: 1789, discount: 13 },
  { id: 'jfy12', name: 'Plain Fully Garterized Fitted Sheet Only', price: 110, originalPrice: 229.17, image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=420&q=80', rating: 4.8, sold: 14593, discount: 52 },
];

const heroSlides = [
  '/slides/slide1.avif',
  '/slides/slide2.avif',
  '/slides/slide3.avif',
];

const HeroBanner = () => {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSlide((value) => (value + 1) % heroSlides.length), 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="lazada-hero" aria-label="Featured promotion">
      <img className="lazada-hero-image" src={heroSlides[slide]} alt="" aria-hidden="true" />
      <button
        type="button"
        className="lazada-hero-arrow left-2"
        aria-label="Previous promotion"
        onClick={() => setSlide((slide + heroSlides.length - 1) % heroSlides.length)}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        className="lazada-hero-arrow right-2"
        aria-label="Next promotion"
        onClick={() => setSlide((slide + 1) % heroSlides.length)}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="lazada-hero-dots" aria-label="Promotion slides">
        {heroSlides.map((_, idx) => (
          <button
            type="button"
            key={idx}
            aria-label={`Promotion ${idx + 1}`}
            className={idx === slide ? 'active' : ''}
            onClick={() => setSlide(idx)}
          />
        ))}
      </div>
    </section>
  );
};

const AppCard = () => (
  <aside id="app" className="lazada-app-card" aria-label="Try our app">
    <div className="lazada-app-title">
      <img className="lazada-app-icon" src="/try_our_app/Laz.png" alt="" aria-hidden="true" />
      <strong>Try Our App</strong>
    </div>
    <div className="lazada-app-promo">
      <span>4.8 Rated</span>
      <b>Get the Lazada app to enjoy</b>
      <div className="lazada-app-benefits">
        <div><img src="/try_our_app/icon2.png" alt="" aria-hidden="true" />Free<br />Shipping</div>
        <div><img src="/try_our_app/icon1.png" alt="" aria-hidden="true" />Exclusive<br />Vouchers</div>
      </div>
    </div>
    <div className="lazada-app-bottom">
      <img className="qr-grid" src="/try_our_app/icon3.png" alt="Lazada app QR code" />
      <div className="store-buttons">
        <button type="button">App Store</button>
        <button type="button">Google Play</button>
      </div>
    </div>
    <small>Download the app now by scanning the QR code</small>
  </aside>
);

const ServiceTiles = () => (
  <section className="lazada-service-grid" aria-label="Quick services">
    <Link to="/checkout" className="lazada-service-tile">
      <div>
        <strong>Top Up</strong>
        <span>Top Up &amp; Pay Bills</span>
      </div>
      <div className="service-image">
        <img src="/upload.png" alt="Top Up" />
      </div>
    </Link>
    <Link to="/category/fashion" className="lazada-service-tile">
      <div>
        <strong>LazMall</strong>
        <span>Shop Best Brands</span>
      </div>
      <div className="service-image">
        <img src="/laada_mall.png" alt="LazMall" />
      </div>
    </Link>
  </section>
);

const Countdown = () => {
  const [remaining, setRemaining] = useState(14 * 3600 + 54 * 60 + 3);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 24 * 3600 - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const pad = (value) => String(value).padStart(2, '0');

  return (
    <div className="sale-time" aria-label={`Flash sale ends in ${pad(hours)} hours ${pad(minutes)} minutes ${pad(seconds)} seconds`}>
      <b>{pad(hours)}</b>
      <b>{pad(minutes)}</b>
      <b>{pad(seconds)}</b>
    </div>
  );
};

const FlashSale = () => {
  return (
    <section className="lazada-flash">
      <h2>Flash Sale</h2>
      <div className="lazada-flash-panel">
        <div className="lazada-flash-head">
          <span className="sale-now">On Sale Now</span>
          <span>Ending in</span>
          <Countdown />
          <Link to="/category/electronics">Shop All Products</Link>
        </div>
        <div className="lazada-product-row">
          {FLASH_SALE.slice(0, 6).map((product, index) => {
            const badge = saleProducts[index]?.badge || 'LazFlash';
            return (
              <Link to={`/product/${product.id}`} className="lazada-sale-card" key={product.id}>
                <div className="sale-thumb">
                  <img src={product.image} alt={product.name} loading="lazy" />
                  <span className="sale-badge">{badge}</span>
                </div>
                <h3>{product.name}</h3>
                <p>{peso(product.flashPrice || product.price)}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const Categories = () => (
  <section className="home-categories">
    <h2>Categories</h2>
    <div className="home-category-grid">
      {categoryTiles.map((category) => (
        <Link to={`/category/${category.category}`} className="home-category-tile" key={category.name}>
          <div className="category-thumb">
            <img src={category.image} alt={category.name} loading="lazy" />
          </div>
          <span>{category.name}</span>
        </Link>
      ))}
    </div>
  </section>
);

const RecommendationCard = ({ product }) => (
  <Link to={`/product/${product.id}`} className="recommend-card">
    <div className="recommend-thumb">
      <img src={product.image} alt={product.name} loading="lazy" />
      {product.badge && <span>{product.badge}</span>}
    </div>
    <h3>{product.name}</h3>
    <div className="recommend-price">
      <strong>{peso(product.price)}</strong>
      {product.discount ? <span>-{product.discount}%</span> : null}
    </div>
    <div className="recommend-rating">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={index < Math.round(product.rating) ? 'active' : ''} />
      ))}
      <span>({product.sold})</span>
    </div>
  </Link>
);

const JustForYou = () => {
  const { isCatalogLoading, sellerProducts } = useApp();
  const [visibleCount, setVisibleCount] = useState(12);
  const productBackfill = (sellerProducts.length ? sellerProducts : PRODUCTS).map((product, index) => ({
    ...product,
    image: product.image || recommendationExtras[index]?.image,
  }));
  const visibleProducts = productBackfill.slice(0, visibleCount);
  const canShowMore = visibleCount < productBackfill.length;

  return (
    <section className="just-for-you">
      <h2>Just For You</h2>
      <div className="recommend-grid">
        {isCatalogLoading
          ? Array.from({ length: 12 }).map((_, index) => <ProductCardSkeleton key={index} />)
          : visibleProducts.map((product) => <RecommendationCard key={product.id} product={product} />)}
      </div>
      {!isCatalogLoading && canShowMore && (
        <button
          type="button"
          className="recommend-show-more"
          onClick={() => setVisibleCount((count) => Math.min(count + 6, productBackfill.length))}
        >
          Show More
        </button>
      )}
    </section>
  );
};

const Home = () => (
  <div className="lazada-home">
    <div className="lazada-container">
      <div className="lazada-hero-layout">
        <HeroBanner />
        <AppCard />
      </div>
      <ServiceTiles />
      <FlashSale />
      <Categories />
      <JustForYou />
    </div>
  </div>
);

export default Home;
