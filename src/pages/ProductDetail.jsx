import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PRODUCTS, SELLERS } from '../data/mock';
import { peso_fmt } from '../components/ProductCard';
import { useToast } from '../hooks/use-toast';

const estimatedDeliveryDate = new Date('2026-05-19T00:00:00+08:00');

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, addToCart, sellerProducts, user } = useApp();
  const { toast } = useToast();
  const product = getProductById(id) || PRODUCTS.find((item) => String(item.id) === String(id));
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <div className="max-w-[1400px] mx-auto p-10 text-center text-gray-500">
        Product not found. <Link to="/" className="text-orange-600">Go home</Link>
      </div>
    );
  }

  const seller = SELLERS.find((item) => String(item.id) === String(product.sellerId)) || {
    name: 'LazMart',
    rating: 4.9,
    verified: true,
    followers: '10K',
    products: sellerProducts.length || 50,
  };
  const images = product.images?.length ? product.images : [product.image];
  const ratingCount = Math.max(517, Math.round(Number(product.sold || 0) * 1.7));
  const receiveDate = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(
    estimatedDeliveryDate,
  );

  const requireBuyer = () => {
    if (!user) {
      navigate('/login');
      return false;
    }
    if (user.role !== 'buyer' && user.role !== 'admin') {
      toast({ title: 'Only buyers can purchase', description: 'Seller accounts cannot buy products.' });
      return false;
    }
    return true;
  };

  const handleAdd = () => {
    if (!requireBuyer()) return;
    addToCart(product, qty);
    toast({ title: 'Added to cart!', description: `${qty} x ${product.name}` });
  };

  const handleBuy = () => {
    if (!requireBuyer()) return;
    addToCart(product, qty);
    navigate('/checkout');
  };

  return (
    <div className="product-detail-page">
      <div className="product-breadcrumbs">
        <Link to="/">Groceries</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/category/${product.category}`}>{product.category}</Link>
        <ChevronRight className="h-4 w-4" />
        <span>{product.name}</span>
      </div>

      <section className="product-main-card">
        <div className="product-gallery">
          <div className="product-lazmart-badge">
            <Store className="h-9 w-9" />
            <span>LazMart</span>
          </div>
          <div className="product-main-image">
            <img src={images[Math.min(activeImg, images.length - 1)]} alt={product.name} />
          </div>
          <div className="product-thumbs">
            {images.map((img, index) => (
              <button
                type="button"
                key={`${img}-${index}`}
                className={activeImg === index ? 'active' : ''}
                onClick={() => setActiveImg(index)}
              >
                <img src={img} alt={`${product.name} thumbnail ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="product-info-panel">
          <div className="product-title-row">
            <h1><span>LazMart</span>{product.name}</h1>
            <div className="product-app-qr"><QrCode className="h-7 w-7" /><small>App</small></div>
          </div>

          <div className="product-rating-row">
            {[...Array(5)].map((_, index) => (
              <Star key={index} className={index < Math.round(product.rating || 0) ? 'active' : ''} />
            ))}
            <b>{Number(product.rating || 0).toFixed(1)}({ratingCount})</b>
          </div>

          <p className="product-brand-line">
            Brand: <Link to={`/category/${product.category}`}>{product.brand}</Link> |
            <Link to={`/category/${product.category}`}> More {product.category} from {product.brand}</Link>
          </p>

          <div className="product-flash-bar">
            <strong>LazFlash</strong>
            <span>Ends in <b>01:57:06</b></span>
            <em>2 in LazFlash</em>
          </div>

          <div className="product-price-block">
            <strong>{peso_fmt(product.price)}</strong>
            {product.originalPrice > product.price && <s>{peso_fmt(product.originalPrice)}</s>}
            {product.discount > 0 && <span>-{product.discount}%</span>}
          </div>

          <div className="product-option-grid">
            <span>Promotions:</span>
            <div className="product-promo-row">
              <b>₱20</b>
              <button type="button">Buy 10 Get additional 3% off <ChevronRight className="h-3 w-3" /></button>
            </div>

            <span>Delivery<br />Options:</span>
            <div className="product-delivery">
              <p><MapPin className="h-4 w-4" /> Metro Manila-Quezon City, Quezon City, Project 6 <button type="button">Change</button></p>
              <p><ShoppingCart className="h-4 w-4" /> Guaranteed by {receiveDate} <ChevronRight className="h-4 w-4" /></p>
              <small>Standard, with shipping fee ₱40.00</small>
              <small>Get a shipping fee discount with ₱799.00 minimum spend from <b>LazMart</b></small>
            </div>

            <span>Return &<br />Warranty:</span>
            <div className="product-warranty">
              <p><ShieldCheck className="h-4 w-4" /> 100% Authentic · 30 Days Free Return · Warranty not available <ChevronRight className="h-4 w-4" /></p>
            </div>

            <span>Flavor:</span>
            <div className="product-variants">
              <button type="button" className="active">{product.brand}</button>
              <button type="button">Family Size 552g</button>
            </div>

            <span>Quantity:</span>
            <div className="product-qty">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
              <b>{qty}</b>
              <button type="button" onClick={() => setQty(Math.min(product.stock || 99, qty + 1))}><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="product-action-row">
            <button type="button" className="buy" onClick={handleBuy}>Buy Now</button>
            <button type="button" className="cart" onClick={handleAdd}>Add to Cart</button>
            <button type="button" className="soft"><RotateCcw className="h-5 w-5" /><span>Share</span></button>
            <button type="button" className="soft"><Heart className="h-5 w-5" /><span>Like</span></button>
          </div>
        </div>
      </section>

      <section className="product-store-card">
        <div>
          <Store className="h-8 w-8" />
          <strong>{seller.name}</strong>
          {seller.verified && <span>LazMall</span>}
          <small>Seller Ratings {Math.round(Number(seller.rating || 4.8) * 20)}%</small>
          <small>Preferred Seller</small>
        </div>
        <div>
          <button type="button"><MessageCircle className="h-4 w-4" /> Chat</button>
          <button type="button"><Store className="h-4 w-4" /> Go To Store</button>
        </div>
      </section>

      <section className="product-description-card">
        <h2>Product Details</h2>
        <p>{product.description}</p>
        <ul>
          <li>Brand: {product.brand}</li>
          <li>Category: {product.category}</li>
          <li>Stock: {product.stock} units</li>
          <li>Ships from Lazada Philippines partner warehouse.</li>
        </ul>
      </section>

      <button type="button" className="messages-float">
        <MessageCircle className="h-5 w-5" />
        Messages
      </button>
    </div>
  );
};

export default ProductDetail;
