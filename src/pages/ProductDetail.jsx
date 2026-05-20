import { Fragment, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Heart,
  Check,
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
import { CATEGORIES, PRODUCTS, SELLERS } from '../data/catalog';
import { peso_fmt } from '../components/ProductCard';
import { useToast } from '../hooks/use-toast';

const estimatedDeliveryDate = new Date('2026-05-19T00:00:00+08:00');

const textFor = (product) => `${product.name || ''} ${product.brand || ''} ${product.category || ''}`.toLowerCase();

const uniqueOptions = (values) => [...new Set(values.filter(Boolean))];

const getStorageOptions = (product) => {
  const text = textFor(product);
  const match = text.match(/(\d+)\s*(gb|tb)/i);
  const current = match ? `${match[1]}${match[2].toUpperCase()}` : '';
  const base = current.includes('512') ? ['256GB', '512GB'] : ['128GB', '256GB'];

  return uniqueOptions([...base, current]);
};

const getPhoneColorOptions = (product) => {
  const text = textFor(product);
  if (text.includes('iphone')) return ['Black', 'Blue', 'Pink'];
  if (text.includes('samsung') || text.includes('galaxy')) return ['Titanium Gray', 'Black', 'Violet'];
  if (text.includes('xiaomi') || text.includes('redmi')) return ['Midnight Black', 'Aurora Purple', 'Ocean Teal'];
  return ['Black', 'Silver', 'Blue'];
};

const getProductSpecGroups = (product) => {
  if (Array.isArray(product.specGroups) && product.specGroups.length) return product.specGroups;
  if (Array.isArray(product.variants) && product.variants.length) {
    const labels = Object.keys(product.variants[0].attributes || {});
    return labels.map((label) => ({
      label,
      values: uniqueOptions(product.variants.map((variant) => variant.attributes?.[label])),
    }));
  }

  const text = textFor(product);
  const category = String(product.category || '').toLowerCase();
  const isPhone = ['iphone', 'galaxy', 'redmi', 'smartphone', 'phone'].some((term) => text.includes(term));
  const isCamera = ['camera', 'mirrorless', 'canon', 'fujifilm'].some((term) => text.includes(term));
  const isHeadphones = ['headphone', 'airpods', 'earbuds', 'wireless', 'bluetooth'].some((term) => text.includes(term));
  const isShoe = ['shoe', 'sneaker', 'jordan', 'air force', 'ultraboost', 'chuck taylor'].some((term) => text.includes(term));
  const isWatch = ['watch', 'g-shock', 'garmin', 'seiko', 'tissot', 'fossil'].some((term) => text.includes(term));

  if (isPhone) {
    return [
      { label: 'Color Family', values: getPhoneColorOptions(product) },
      { label: 'Storage Capacity', values: getStorageOptions(product) },
    ];
  }

  if (isCamera) {
    return [
      { label: 'Color Family', values: ['Black', 'Silver'] },
      { label: 'Kit Type', values: ['Body Only', 'With Lens Kit'] },
    ];
  }

  if (isHeadphones) {
    return [
      { label: 'Color Family', values: ['Black', 'Silver', 'White'] },
      { label: 'Connectivity', values: ['Bluetooth', 'USB-C'] },
    ];
  }

  if (isShoe || ['men', 'fashion', 'sports'].includes(category)) {
    return [
      { label: 'Color Family', values: ['Black', 'White', 'Blue'] },
      { label: 'Size', values: ['US 7', 'US 8', 'US 9', 'US 10'] },
    ];
  }

  if (isWatch || category === 'watches') {
    return [
      { label: 'Color Family', values: ['Black', 'Silver', 'Gold'] },
      { label: 'Strap Size', values: ['Standard', 'Large'] },
    ];
  }

  if (['beauty', 'health'].includes(category)) {
    return [
      { label: 'Shade', values: ['Natural', 'Light', 'Medium'] },
      { label: 'Size', values: ['Single', 'Value Pack'] },
    ];
  }

  if (category === 'groceries' || category === 'pets') {
    return [
      { label: 'Flavor', values: uniqueOptions([product.brand, 'Original', 'Chocolate']) },
      { label: 'Pack Size', values: ['Single Pack', 'Family Size 552g'] },
    ];
  }

  return [
    { label: 'Variant', values: uniqueOptions([product.brand, 'Standard']) },
    { label: 'Size', values: ['Regular', 'Large'] },
  ];
};

const getProductTrail = (product) => {
  const category = CATEGORIES.find((item) => item.id === product.category);
  const text = textFor(product);
  const categoryLabel = category?.name || product.category;
  const trail = [{ label: categoryLabel, to: `/category/${product.category}` }];

  const addSubcategory = (label) => {
    trail.push({ label, to: `/category/${product.category}?q=${encodeURIComponent(label)}` });
  };

  if (product.subcategory) {
    addSubcategory(product.subcategory);
    return trail;
  }

  if (['iphone', 'galaxy', 'redmi', 'smartphone', 'phone'].some((term) => text.includes(term))) {
    addSubcategory('Mobiles');
    addSubcategory('Smartphones');
    return trail;
  }

  if (['camera', 'mirrorless', 'canon', 'fujifilm'].some((term) => text.includes(term))) {
    addSubcategory('Digital Cameras');
    return trail;
  }

  if (['headphone', 'airpods', 'earbuds', 'wireless', 'bluetooth'].some((term) => text.includes(term))) {
    addSubcategory('Audio');
    return trail;
  }

  if (['shoe', 'sneaker', 'jordan', 'air force', 'ultraboost', 'chuck taylor'].some((term) => text.includes(term))) {
    addSubcategory("Men's Shoes");
    return trail;
  }

  if (['watch', 'g-shock', 'garmin', 'seiko', 'tissot', 'fossil'].some((term) => text.includes(term))) {
    addSubcategory('Watches');
    return trail;
  }

  if (category?.subcategories?.[0]) addSubcategory(category.subcategories[0]);
  return trail;
};

const getSpecificationRows = (product, specGroups, seller, categoryLabel) => {
  const text = textFor(product);
  const sellerSpecs = Object.entries(product.specs || {})
    .filter(([key, value]) => !['promotionImage', 'videoName', 'variants', 'specGroups'].includes(key) && value)
    .map(([key, value]) => [key, String(value)]);
  const rows = [
    ['Brand', product.brand || 'Generic'],
    ['Category', categoryLabel],
    ['Seller', seller.name],
    ['Stock', `${product.stock || 0} units available`],
    ['Warranty Type', 'Local supplier warranty'],
    ['Ships From', 'Lazada Philippines partner warehouse'],
  ];

  specGroups.forEach((group) => rows.push([group.label, group.values.join(', ')]));
  sellerSpecs.forEach((row) => {
    if (!rows.some(([label]) => label === row[0])) rows.push(row);
  });

  if (['iphone', 'galaxy', 'redmi', 'smartphone', 'phone'].some((term) => text.includes(term))) {
    rows.push(['Phone Type', 'Smartphone']);
    rows.push(['Display', '6.1-inch to 6.7-inch class display']);
    rows.push(['Network Connections', '5G, 4G LTE, Wi-Fi, Bluetooth']);
  } else if (['camera', 'mirrorless'].some((term) => text.includes(term))) {
    rows.push(['Camera Type', 'Mirrorless camera']);
    rows.push(['Included Items', 'Camera body, battery, charger, strap']);
  } else if (['headphone', 'airpods', 'earbuds'].some((term) => text.includes(term))) {
    rows.push(['Audio Features', 'Wireless audio, built-in microphone']);
    rows.push(['Battery Life', 'Up to 24 hours depending on usage']);
  } else if (['shoe', 'sneaker', 'jordan', 'ultraboost'].some((term) => text.includes(term))) {
    rows.push(['Upper Material', 'Synthetic and textile materials']);
    rows.push(['Closure Type', 'Lace-up']);
  } else if (['watch', 'g-shock', 'garmin', 'seiko', 'tissot', 'fossil'].some((term) => text.includes(term))) {
    rows.push(['Watch Movement', 'Brand-specific movement']);
    rows.push(['Water Resistance', 'Available on selected variants']);
  }

  return rows;
};

const getReviewSummary = (product) => {
  const score = Number(product.rating || 4.8).toFixed(1);
  const sold = Number(product.sold || 0);
  const reviewCount = Math.max(18, Math.round(sold * 0.22));

  return {
    score,
    reviewCount,
    reviews: [
      {
        name: 'J***a',
        rating: 5,
        text: `Arrived in good condition. The ${product.brand || 'product'} quality feels nice and it matches the listing.`,
      },
      {
        name: 'M***n',
        rating: Math.max(4, Math.round(product.rating || 5)),
        text: 'Fast delivery and properly packed. I tested it right away and it works as expected.',
      },
      {
        name: 'R***s',
        rating: 5,
        text: 'Good value for the price. I would buy again from this seller.',
      },
    ],
  };
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, addToCart, sellerProducts, user, isCatalogLoading } = useApp();
  const { toast } = useToast();
  const product = getProductById(id) || PRODUCTS.find((item) => String(item.id) === String(id));
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [addAnimation, setAddAnimation] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState({});
  const imageRef = useRef(null);

  if (!product && isCatalogLoading) {
    return (
      <div className="product-detail-page product-detail-skeleton">
        <section className="product-main-card">
          <div className="skeleton-panel product-gallery">
            <div className="product-main-image skeleton-block" />
            <div className="product-thumbs">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton-thumb skeleton-block" />)}
            </div>
          </div>
          <div className="product-info-panel">
            <div className="skeleton-line w-4/5" />
            <div className="skeleton-line w-2/5" />
            <div className="skeleton-line price w-1/3" />
            <div className="product-detail-skeleton-grid">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton-line" />)}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1400px] mx-auto p-10 text-center text-gray-500">
        Product not found. <Link to="/" className="text-orange-600">Go home</Link>
      </div>
    );
  }

  const seller = SELLERS.find((item) => String(item.id) === String(product.sellerId)) || {
    name: product.brand || 'Lazada Seller',
    rating: 4.9,
    verified: true,
    followers: '10K',
    products: sellerProducts.length || 50,
  };
  const images = product.images?.length ? product.images : [product.image];
  const specGroups = getProductSpecGroups(product);
  const breadcrumbTrail = getProductTrail(product);
  const categoryLabel = breadcrumbTrail[0]?.label || product.category;
  const specificationRows = getSpecificationRows(product, specGroups, seller, categoryLabel);
  const reviewSummary = getReviewSummary(product);
  const recommendationPool = [...sellerProducts, ...PRODUCTS].filter(
    (item, index, items) => items.findIndex((entry) => String(entry.id) === String(item.id)) === index,
  );
  const recommendedProducts = recommendationPool
    .filter((item) => String(item.id) !== String(product.id))
    .sort((a, b) => {
      const aSameCategory = a.category === product.category ? 1 : 0;
      const bSameCategory = b.category === product.category ? 1 : 0;
      return bSameCategory - aSameCategory;
    })
    .slice(0, 6);
  const ratingCount = Math.max(517, Math.round(Number(product.sold || 0) * 1.7));
  const receiveDate = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(
    estimatedDeliveryDate,
  );
  const selectedVariant = Array.isArray(product.variants) && product.variants.length
    ? product.variants.find((variant) => Object.entries(variant.attributes || {}).every(([label, value]) => {
        const group = specGroups.find((item) => item.label === label);
        const selectedValue = selectedSpecs[label] || group?.values?.[0];
        return selectedValue === value;
      })) || product.variants[0]
    : null;
  const activePrice = Number(selectedVariant?.price || product.price);
  const activeStock = Number(selectedVariant?.stock ?? product.stock);

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
    launchCartFlyAnimation();
    addToCart({
      ...product,
      id: selectedVariant ? `${product.id}-${selectedVariant.sku}` : product.id,
      name: selectedVariant ? `${product.name} (${Object.values(selectedVariant.attributes || {}).join(' / ')})` : product.name,
      price: activePrice,
      stock: activeStock,
    }, qty);
    setAddAnimation(true);
    window.setTimeout(() => setAddAnimation(false), 900);
    toast({ title: 'Added to cart!', description: `${qty} x ${product.name}` });
  };

  const launchCartFlyAnimation = () => {
    const source = imageRef.current;
    const target = document.querySelector('[data-cart-target]');
    if (!source || !target) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const flyer = document.createElement('img');
    const startSize = Math.min(96, Math.max(56, sourceRect.width * 0.22));

    flyer.src = images[Math.min(activeImg, images.length - 1)];
    flyer.alt = '';
    flyer.className = 'cart-flyer';
    flyer.style.width = `${startSize}px`;
    flyer.style.height = `${startSize}px`;
    flyer.style.left = `${sourceRect.left + sourceRect.width / 2 - startSize / 2}px`;
    flyer.style.top = `${sourceRect.top + sourceRect.height / 2 - startSize / 2}px`;

    document.body.appendChild(flyer);

    const endX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const endY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

    flyer.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 0.96 },
        { transform: `translate3d(${endX * 0.42}px, ${endY - 95}px, 0) scale(0.72)`, opacity: 0.9, offset: 0.55 },
        { transform: `translate3d(${endX}px, ${endY}px, 0) scale(0.18)`, opacity: 0.08 },
      ],
      {
        duration: 760,
        easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)',
      },
    ).addEventListener('finish', () => flyer.remove());
  };

  const handleBuy = () => {
    if (!requireBuyer()) return;
    addToCart({
      ...product,
      id: selectedVariant ? `${product.id}-${selectedVariant.sku}` : product.id,
      name: selectedVariant ? `${product.name} (${Object.values(selectedVariant.attributes || {}).join(' / ')})` : product.name,
      price: activePrice,
      stock: activeStock,
    }, qty);
    navigate('/checkout');
  };

  return (
    <div className="product-detail-page">
      <div className="product-breadcrumbs">
        {breadcrumbTrail.map((item) => (
          <Fragment key={`${item.label}-${item.to}`}>
            <Link to={item.to}>{item.label}</Link>
            <ChevronRight className="h-4 w-4" />
          </Fragment>
        ))}
        <span>{product.name}</span>
      </div>

      <section className="product-main-card">
        <div className="product-gallery">
          <div className="product-main-image">
            <img ref={imageRef} src={images[Math.min(activeImg, images.length - 1)]} alt={product.name} />
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
            <h1>{product.name}</h1>
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
            <Link to={`/category/${product.category}`}> More {categoryLabel} from {product.brand}</Link>
          </p>

          <div className="product-flash-bar">
            <strong>LazFlash</strong>
            <span>Ends in <b>01:57:06</b></span>
            <em>2 in LazFlash</em>
          </div>

          <div className="product-price-block">
            <strong>{peso_fmt(activePrice)}</strong>
            {product.originalPrice > activePrice && <s>{peso_fmt(product.originalPrice)}</s>}
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
              <small>Get a shipping fee discount with ₱799.00 minimum spend from <b>{seller.name}</b></small>
            </div>

            <span>Return &<br />Warranty:</span>
            <div className="product-warranty">
              <p><ShieldCheck className="h-4 w-4" /> 100% Authentic · 30 Days Free Return · Warranty not available <ChevronRight className="h-4 w-4" /></p>
            </div>

            {specGroups.map((group) => {
              const selectedValue = group.values.includes(selectedSpecs[group.label])
                ? selectedSpecs[group.label]
                : group.values[0];

              return (
                <Fragment key={group.label}>
                  <span className="product-spec-label">
                    {group.label}:<br />
                    <b>{selectedValue}</b>
                  </span>
                  <div className="product-variants">
                    {group.values.map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={selectedValue === value ? 'active' : ''}
                        onClick={() => setSelectedSpecs((current) => ({ ...current, [group.label]: value }))}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </Fragment>
              );
            })}

            <span>Quantity:</span>
            <div className="product-qty">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
              <b>{qty}</b>
              <button type="button" onClick={() => setQty(Math.min(activeStock || 99, qty + 1))}><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="product-action-row">
            <button type="button" className="buy" onClick={handleBuy}>Buy Now</button>
            <button
              type="button"
              className={`cart ${addAnimation ? 'added' : ''}`}
              onClick={handleAdd}
              disabled={addAnimation}
            >
              {addAnimation ? (
                <>
                  <Check className="h-4 w-4" />
                  Added
                </>
              ) : 'Add to Cart'}
            </button>
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
          <li>Category: {categoryLabel}</li>
          <li>Stock: {product.stock} units</li>
          <li>Ships from Lazada Philippines partner warehouse.</li>
        </ul>
      </section>

      <section className="product-description-card product-specification-card">
        <h2>Specifications</h2>
        <div className="product-specification-grid">
          {specificationRows.map(([label, value]) => (
            <Fragment key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </Fragment>
          ))}
        </div>
      </section>

      <section className="product-description-card product-reviews-card">
        <div className="product-section-head">
          <h2>Ratings & Reviews</h2>
          <span>{reviewSummary.reviewCount.toLocaleString('en-PH')} reviews</span>
        </div>
        <div className="product-review-summary">
          <strong>{reviewSummary.score}</strong>
          <div>
            <div className="product-review-stars">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className={index < Math.round(product.rating || 0) ? 'active' : ''} />
              ))}
            </div>
            <p>Based on verified buyer feedback</p>
          </div>
        </div>
        <div className="product-review-list">
          {reviewSummary.reviews.map((review) => (
            <article key={review.name}>
              <div>
                <strong>{review.name}</strong>
                <span>Verified Purchase</span>
              </div>
              <div className="product-review-stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className={index < review.rating ? 'active' : ''} />
                ))}
              </div>
              <p>{review.text}</p>
            </article>
          ))}
        </div>
      </section>

      {recommendedProducts.length > 0 && (
        <section className="product-description-card product-recommendations-card">
          <div className="product-section-head">
            <h2>Recommendations</h2>
            <Link to={`/category/${product.category}`}>See more</Link>
          </div>
          <div className="product-detail-recommend-grid">
            {recommendedProducts.map((item) => (
              <Link to={`/product/${item.id}`} className="recommend-card" key={item.id}>
                <div className="recommend-thumb">
                  <img src={item.image} alt={item.name} loading="lazy" />
                </div>
                <h3>{item.name}</h3>
                <div className="recommend-price">
                  <strong>{peso_fmt(item.price)}</strong>
                  {item.discount ? <span>-{item.discount}%</span> : null}
                </div>
                <div className="recommend-rating">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className={index < Math.round(item.rating || 0) ? 'active' : ''} />
                  ))}
                  <span>({item.sold || 0})</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

export default ProductDetail;
