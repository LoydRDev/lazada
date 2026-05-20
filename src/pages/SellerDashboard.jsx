import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Bot,
  Box,
  ChevronDown,
  Download,
  Edit3,
  ImagePlus,
  Info,
  Languages,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';
import { VISIBLE_CATEGORIES } from '../data/catalog';
import { useToast } from '../hooks/use-toast';
import { isSellerSetupComplete } from '../lib/sellerSetup';

const sellerMenu = [
  { label: 'Common Tools', icon: Box, children: ['Manage Products', 'Orders', 'Promotions'] },
  { label: 'Products', icon: ShoppingBag, children: ['Add Products', 'Decorate Products', 'Fulfilment By Lazada', 'Opportunity Center', 'Assortment Growth Center'] },
  { label: 'Orders', icon: Package },
  { label: 'Marketing Center', icon: Megaphone },
  { label: 'Sponsored Solutions', icon: BarChart3, dot: true },
  { label: 'Store', icon: Store },
  { label: 'Finance', icon: WalletCards },
  { label: 'Data Insight', icon: BarChart3 },
  { label: 'Service Center', icon: Bell },
  { label: 'Setting', icon: Settings },
];

const defaultForm = {
  name: '',
  price: '',
  originalPrice: '',
  stock: '',
  brand: '',
  category: 'electronics',
  subcategory: '',
  images: [],
  promotionImage: '',
  promotionImageName: '',
  videoName: '',
  videoType: '',
  specs: {},
  variantOptions: [],
  variants: [],
  description: '',
};

const specificationTemplates = {
  electronics: {
    default: ['Model', 'Warranty Type', 'Color Family', 'Storage Capacity'],
    Mobiles: ['Model', 'Phone Type', 'Storage Capacity', 'RAM Memory', 'Color Family', 'Network Connections'],
    Laptops: ['Model', 'Processor Type', 'RAM Memory', 'Storage Capacity', 'Screen Size', 'Operating System'],
    'Digital Cameras': ['Model', 'Camera Type', 'Megapixels', 'Lens Mount', 'Video Resolution'],
    'Action/Video Cameras': ['Model', 'Video Resolution', 'Water Resistance', 'Battery Life'],
  },
  accessories: {
    default: ['Model', 'Color Family', 'Compatibility', 'Warranty Type'],
    Audio: ['Model', 'Connectivity', 'Color Family', 'Battery Life', 'Noise Cancellation'],
    'Mobile Accessories': ['Model', 'Compatibility', 'Material', 'Color Family'],
  },
  fashion: { default: ['Material', 'Color Family', 'Pattern', 'Fit Type', 'Care Label'] },
  men: { default: ['Material', 'Color Family', 'Size', 'Pattern', 'Fit Type'] },
  kids: { default: ['Material', 'Color Family', 'Size', 'Age Range', 'Care Label'] },
  beauty: { default: ['Skin Type', 'Shade', 'Volume', 'Formulation', 'Shelf Life'] },
  groceries: { default: ['Flavor', 'Pack Size', 'Weight', 'Ingredients', 'Expiration Date'] },
  home: { default: ['Material', 'Color Family', 'Dimensions', 'Room Type', 'Warranty Type'] },
  tv: { default: ['Model', 'Power Consumption', 'Warranty Type', 'Color Family'] },
  sports: { default: ['Material', 'Color Family', 'Size', 'Sport Type', 'Warranty Type'] },
  auto: { default: ['Compatibility', 'Material', 'Color Family', 'Warranty Type'] },
};

const variantSuggestions = {
  electronics: ['Color Family', 'Storage Capacity'],
  accessories: ['Color Family', 'Connectivity'],
  fashion: ['Color Family', 'Size'],
  men: ['Color Family', 'Size'],
  kids: ['Color Family', 'Size'],
  beauty: ['Shade', 'Size'],
  groceries: ['Flavor', 'Pack Size'],
  home: ['Color Family', 'Size'],
  tv: ['Color Family', 'Plug Type'],
  sports: ['Color Family', 'Size'],
  auto: ['Color Family', 'Compatibility'],
};

const getSpecFields = (categoryId, subcategory) => {
  const categoryTemplate = specificationTemplates[categoryId] || {};
  return categoryTemplate[subcategory] || categoryTemplate.default || ['Model', 'Material', 'Color Family', 'Warranty Type'];
};

const getVariantOptionLabel = (categoryId, index) => {
  const labels = variantSuggestions[categoryId] || ['Variant', 'Size'];
  return labels[index] || `Option ${index + 1}`;
};

const splitVariantValues = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

const buildVariantRows = (options, basePrice, baseStock) => {
  const activeOptions = options
    .map((option) => ({ ...option, values: splitVariantValues(option.values) }))
    .filter((option) => option.name.trim() && option.values.length);

  if (!activeOptions.length) return [];

  const combinations = activeOptions.reduce(
    (rows, option) => rows.flatMap((row) => option.values.map((value) => ({ ...row, [option.name.trim()]: value }))),
    [{}],
  );

  return combinations.map((attributes, index) => ({
    id: `variant-${index + 1}`,
    attributes,
    price: Number(basePrice) || 0,
    stock: Number(baseStock) || 0,
    sku: Object.values(attributes).join('-').toUpperCase().replace(/[^A-Z0-9]+/g, '-'),
  }));
};

const readResizedImage = (file, maxSize = 900, quality = 0.82) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = reject;
    image.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const SellerDashboard = () => {
  const { user, sellerProducts, addSellerProduct, removeSellerProduct, orders } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAddProductPage = pathname.endsWith('/add-product');
  const [openMenus, setOpenMenus] = useState({ 'Common Tools': true, Products: true });
  const [form, setForm] = useState(defaultForm);

  if (!user || user.role !== 'seller') {
    return <div className="max-w-[1400px] mx-auto p-10 text-center text-gray-500">Seller access only. <Link to="/login" className="text-orange-600">Login</Link></div>;
  }

  if (!isSellerSetupComplete(user)) {
    return <Navigate to="/seller/setup" replace />;
  }

  const myProducts = sellerProducts.filter(p => String(p.sellerId) === String(user.id));
  const myOrderItems = orders.flatMap(o => o.items.filter(it => String(it.sellerId) === String(user.id)).map(it => ({ ...it, orderId: o.id })));

  const setField = (field, value) => setForm((current) => {
    if (field === 'category') return { ...current, category: value, subcategory: '', specs: {}, variantOptions: [], variants: [] };
    if (field === 'subcategory') return { ...current, subcategory: value, specs: {} };
    return { ...current, [field]: value };
  });
  const patchForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const toggleMenu = (label) => setOpenMenus((current) => ({ ...current, [label]: !current[label] }));
  const handleMenuChild = (child) => {
    if (child === 'Manage Products') {
      navigate('/seller/dashboard');
      return;
    }
    if (child === 'Add Products') {
      navigate('/seller/dashboard/add-product');
      return;
    }
    toast({ title: child, description: 'This Seller Center section is coming soon.' });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user.verified) {
      toast({ title: 'Account not verified', description: 'An admin must approve your seller account before you can list products.' });
      return;
    }
    if (Number(form.price) <= 0 || Number(form.stock) < 0) {
      toast({ title: 'Invalid price/stock' });
      return;
    }
    if (Number(form.originalPrice) && Number(form.originalPrice) < Number(form.price)) {
      toast({ title: 'Misleading discount', description: 'Original price must be greater than or equal to selling price.' });
      return;
    }
    if (!form.images.length) {
      toast({ title: 'Product image required', description: 'Upload at least one product image before submitting.' });
      return;
    }
    if (!form.subcategory) {
      toast({ title: 'Sub-category required', description: 'Choose a sub-category before submitting.' });
      return;
    }

    const specGroups = Object.entries(form.specs)
      .filter(([, value]) => String(value || '').trim())
      .map(([label, value]) => ({ label, values: [String(value).trim()] }));
    const variants = form.variants.length ? form.variants : buildVariantRows(form.variantOptions, form.price, form.stock);
    if (variants.some((variant) => Number(variant.price) <= 0 || Number(variant.stock) < 0)) {
      toast({ title: 'Invalid variant price/stock', description: 'Each generated variant must have a valid price and stock.' });
      return;
    }

    await addSellerProduct({
      name: form.name,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice) || Number(form.price),
      stock: Number(form.stock),
      brand: form.brand,
      category: form.category,
      subcategory: form.subcategory,
      image: form.images[0],
      images: form.images,
      promotionImage: form.promotionImage || null,
      videoName: form.videoName || null,
      videoType: form.videoType || null,
      variants,
      specGroups,
      description: form.description,
      discount: form.originalPrice ? Math.round((1 - form.price / form.originalPrice) * 100) : 0,
      specs: {
        ...form.specs,
        subcategory: form.subcategory,
        promotionImage: Boolean(form.promotionImage),
        videoName: form.videoName || '',
      },
    });

    toast({ title: 'Product listed!', description: 'Your product is now live on Lazada.' });
    setForm(defaultForm);
    navigate('/seller/dashboard');
  };

  return (
    <div className="seller-manage-page">
      <aside className="seller-manage-sidebar">
        <Link to="/seller" className="seller-manage-brand">
          <span>S</span>
          <strong>Lazada<br /><b>Seller Center</b></strong>
        </Link>
        <label className="seller-manage-search">
          <Search className="h-4 w-4" />
          <input placeholder="Search with Ctrl + K" />
        </label>
        <nav>
          {sellerMenu.map((item) => (
            <div
              key={item.label}
              className={`${openMenus[item.label] ? 'open' : ''} ${
                (item.label === 'Common Tools' && !isAddProductPage) || (item.label === 'Products' && isAddProductPage) ? 'active' : ''
              }`}
            >
              <button type="button" onClick={() => item.children && toggleMenu(item.label)}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.dot && <i />}
                {item.children && <ChevronDown className="seller-menu-chevron h-4 w-4" />}
              </button>
              {item.children && openMenus[item.label] && (
                <div className="seller-manage-subnav">
                  {item.children.map((child) => {
                    const selected = (child === 'Manage Products' && !isAddProductPage) || (child === 'Add Products' && isAddProductPage);
                    return (
                      <button
                        type="button"
                        className={selected ? 'selected' : ''}
                        key={child}
                        onClick={() => handleMenuChild(child)}
                      >
                        {child}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="seller-manage-sidebar-footer">
          <button type="button"><Languages className="h-4 w-4" /> English <ChevronDown className="h-4 w-4" /></button>
          <span>Lazada</span>
        </div>
      </aside>

      <main className="seller-manage-main">
        <div className="seller-manage-breadcrumb">
          Home <span>›</span> Manage Products {isAddProductPage ? <><span>›</span> <b>Add Product</b></> : <b>Manage Products</b>}
        </div>
        <header className="seller-manage-header">
          <div>
            <h1>{isAddProductPage ? 'Add Product' : 'Manage Products'}</h1>
            <p>{user.storeName || user.businessName || user.name}</p>
          </div>
          {!isAddProductPage && (
            <div>
              <button type="button">Find Trending Opportunities</button>
              <button type="button">Analysis Tools <ChevronDown className="h-4 w-4" /></button>
              <button type="button">Bulk Manage <ChevronDown className="h-4 w-4" /></button>
              <button type="button" className="primary" onClick={() => navigate('/seller/dashboard/add-product')} disabled={!user.verified}><Plus className="h-4 w-4" /> New Product</button>
            </div>
          )}
        </header>

        {isAddProductPage ? (
          <AddProductPage form={form} setField={setField} patchForm={patchForm} handleAdd={handleAdd} />
        ) : (
          <ManageProductsPage
            user={user}
            myProducts={myProducts}
            myOrderItems={myOrderItems}
            removeSellerProduct={removeSellerProduct}
            navigate={navigate}
          />
        )}

        <footer className="seller-manage-footer">
          <span>Lazada 2024. All rights reserved.</span>
          <div>
            <a href="#university">Lazada University</a>
            <a href="#marketplace">Service Marketplace</a>
            <a href="#api">API Document</a>
            <a href="#help">Help Center</a>
            <a href="#app">Lazada Seller App</a>
          </div>
        </footer>
      </main>

      <aside className="seller-manage-tools">
        <button type="button"><MessageCircle className="h-5 w-5" /></button>
        <button type="button"><Bell className="h-5 w-5" /></button>
        <button type="button"><Bot className="h-5 w-5" /></button>
        <button type="button"><Download className="h-5 w-5" /></button>
        <button type="button"><Edit3 className="h-5 w-5" /></button>
      </aside>
    </div>
  );
};

const ManageProductsPage = ({ user, myProducts, myOrderItems, removeSellerProduct, navigate }) => (
  <>
    <section className="seller-manage-notice">
      <Info className="h-5 w-5" />
      <div>
        <p>Welcome to Product Management Page. <button type="button">Learn more</button> and share more Feedback to us.</p>
        {!user.verified && <p>Your products are not visible to buyers yet. Please wait for admin verification.</p>}
      </div>
      <button type="button">×</button>
    </section>

    <section className="seller-manage-card">
      {myProducts.length === 0 ? (
        <div className="seller-manage-empty">
          <div className="seller-empty-illustration">
            <span />
            <b />
          </div>
          <h2>Currently, you do not have any product</h2>
          <p>This is where you will manage your product listing. Let’s add new product to start selling at Lazada.</p>
          <button type="button" onClick={() => navigate('/seller/dashboard/add-product')} disabled={!user.verified}>New Product</button>
        </div>
      ) : (
        <div className="seller-manage-table">
          <div>
            <strong>{myProducts.length} product(s)</strong>
            <span>{myOrderItems.length} sold item(s)</span>
          </div>
          <table>
            <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Sold</th><th>Action</th></tr></thead>
            <tbody>
              {myProducts.map(p => (
                <tr key={p.id}>
                  <td><img src={p.image} alt={p.name} /><span>{p.name}</span></td>
                  <td>{peso_fmt(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{p.sold || 0}</td>
                  <td><button type="button" onClick={() => removeSellerProduct(p.id)}><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </>
);

const AddProductPage = ({ form, setField, patchForm, handleAdd }) => {
  const selectedCategory = VISIBLE_CATEGORIES.find((category) => category.id === form.category) || VISIBLE_CATEGORIES[0];
  const specFields = getSpecFields(form.category, form.subcategory);

  const handleProductImages = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/')).slice(0, 8);
    if (!files.length) return;
    const images = await Promise.all(files.map((file) => readResizedImage(file)));
    setField('images', [...form.images, ...images].slice(0, 8));
    event.target.value = '';
  };

  const handlePromotionImage = async (event) => {
    const [file] = Array.from(event.target.files || []).filter((item) => item.type.startsWith('image/'));
    if (!file) return;
    const image = await readResizedImage(file, 900, 0.8);
    setField('promotionImage', image);
    setField('promotionImageName', file.name);
    event.target.value = '';
  };

  const handleVideo = (event) => {
    const [file] = Array.from(event.target.files || []).filter((item) => item.type.startsWith('video/'));
    if (!file) return;
    setField('videoName', file.name);
    setField('videoType', file.type);
    event.target.value = '';
  };

  const removeProductImage = (indexToRemove) => {
    setField('images', form.images.filter((_, index) => index !== indexToRemove));
  };

  const setSpec = (label, value) => {
    setField('specs', { ...form.specs, [label]: value });
  };

  const addVariantOption = () => {
    if (form.variantOptions.length >= 2) return;
    setField('variantOptions', [
      ...form.variantOptions,
      { name: getVariantOptionLabel(form.category, form.variantOptions.length), values: '' },
    ]);
  };

  const updateVariantOption = (indexToUpdate, field, value) => {
    patchForm({
      variantOptions: form.variantOptions.map((option, index) => (
        index === indexToUpdate ? { ...option, [field]: value } : option
      )),
      variants: [],
    });
  };

  const removeVariantOption = (indexToRemove) => {
    patchForm({
      variantOptions: form.variantOptions.filter((_, index) => index !== indexToRemove),
      variants: [],
    });
  };

  const generateVariants = () => {
    patchForm({ variants: buildVariantRows(form.variantOptions, form.price, form.stock) });
  };

  const updateVariant = (variantId, field, value) => {
    setField('variants', form.variants.map((variant) => (
      variant.id === variantId ? { ...variant, [field]: field === 'sku' ? value : Number(value) } : variant
    )));
  };

  return (
    <form onSubmit={handleAdd} className="seller-add-product-layout">
      <div className="seller-add-product-main">
        <section className="seller-add-section">
          <h2>Basic Information</h2>
          <label><span>* Product Images</span></label>
          <div className="seller-add-image-row">
            {form.images.map((image, index) => (
              <div className="seller-add-image-preview" key={image}>
                <img src={image} alt={`Product upload ${index + 1}`} />
                <button type="button" aria-label="Remove product image" onClick={() => removeProductImage(index)}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <label className="seller-add-upload-tile">
              <ImagePlus className="h-7 w-7" />
              <input type="file" accept="image/*" multiple onChange={handleProductImages} />
            </label>
          </div>

          <label><span>Buyer Promotion Image</span></label>
          <div className="seller-add-promo-row">
            {form.promotionImage ? (
              <div className="seller-add-promo-preview">
                <img src={form.promotionImage} alt="Buyer promotion" />
                <button type="button" onClick={() => {
                  setField('promotionImage', '');
                  setField('promotionImageName', '');
                }}>Remove</button>
              </div>
            ) : (
              <label className="seller-add-upload-tile">
                <Plus className="h-8 w-8" />
                <input type="file" accept="image/*" onChange={handlePromotionImage} />
              </label>
            )}
            <p>Optional white background image<br />{form.promotionImageName || 'No promotion image selected'}</p>
          </div>

          <label><span>Video</span></label>
          <div className="seller-add-video-row">
            <label className="seller-add-video-upload">
              <Plus className="h-4 w-4" />
              Upload Video
              <input type="file" accept="video/*" onChange={handleVideo} />
            </label>
            {form.videoName ? (
              <span>{form.videoName}<button type="button" onClick={() => {
                setField('videoName', '');
                setField('videoType', '');
              }}>Remove</button></span>
            ) : <small>Optional</small>}
          </div>

          <label><span>* Product Name</span></label>
          <input required value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Product name" />
          <label><span>* Category</span></label>
          <select value={form.category} onChange={e => setField('category', e.target.value)}>
            {VISIBLE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label><span>* Sub-category</span></label>
          <select required value={form.subcategory} onChange={e => setField('subcategory', e.target.value)}>
            <option value="">Select sub-category</option>
            {selectedCategory?.subcategories?.map((subcategory) => (
              <option key={subcategory} value={subcategory}>{subcategory}</option>
            ))}
          </select>
        </section>

      <section className="seller-add-section">
        <header><h2>Product Specification</h2><button type="button" onClick={() => setField('specs', {})}>Re-Generate</button></header>
        <div className="seller-add-two-col">
          <label><span>Brand <b>KEY</b></span><input required value={form.brand} onChange={e => setField('brand', e.target.value)} placeholder="Type to search brand.." /></label>
          {specFields.map((field) => (
            <label key={field}>
              <span>{field}</span>
              <input value={form.specs[field] || ''} onChange={e => setSpec(field, e.target.value)} placeholder={`Input ${field.toLowerCase()}`} />
            </label>
          ))}
        </div>
      </section>

      <section className="seller-add-section">
        <h2>Price, Stock & Variants</h2>
        <p>You can add variants to a product that has more than one option, such as size or color.</p>
        <button type="button" className="seller-add-outline" onClick={addVariantOption} disabled={form.variantOptions.length >= 2}><Plus className="h-4 w-4" /> Add Variation({form.variantOptions.length}/2)</button>
        {form.variantOptions.length > 0 && (
          <div className="seller-add-variant-options">
            {form.variantOptions.map((option, index) => (
              <div key={`${option.name}-${index}`}>
                <label>
                  <span>Option Name</span>
                  <input value={option.name} onChange={e => updateVariantOption(index, 'name', e.target.value)} placeholder="Color Family" />
                </label>
                <label>
                  <span>Option Values</span>
                  <input value={option.values} onChange={e => updateVariantOption(index, 'values', e.target.value)} placeholder="Black, White, Blue" />
                </label>
                <button type="button" onClick={() => removeVariantOption(index)}>Remove</button>
              </div>
            ))}
            <button type="button" className="seller-add-link" onClick={generateVariants}>Generate Variant Rows</button>
          </div>
        )}
        <div className="seller-add-stock-grid">
          <label><span>* Price</span><input required type="number" min="1" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="₱" /></label>
          <label><span>Special Price</span><input type="number" min="0" value={form.originalPrice} onChange={e => setField('originalPrice', e.target.value)} placeholder="Add" /></label>
          <label><span>Stock</span><input required type="number" min="0" value={form.stock} onChange={e => setField('stock', e.target.value)} /></label>
          <label><span>SellerSKU</span><input placeholder="Seller SKU" /></label>
        </div>
        {form.variants.length > 0 && (
          <div className="seller-add-variant-table">
            <table>
              <thead>
                <tr><th>Variant</th><th>Price</th><th>Stock</th><th>SellerSKU</th></tr>
              </thead>
              <tbody>
                {form.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>{Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(' / ')}</td>
                    <td><input type="number" min="1" value={variant.price} onChange={e => updateVariant(variant.id, 'price', e.target.value)} /></td>
                    <td><input type="number" min="0" value={variant.stock} onChange={e => updateVariant(variant.id, 'stock', e.target.value)} /></td>
                    <td><input value={variant.sku} onChange={e => updateVariant(variant.id, 'sku', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="seller-add-section">
        <h2>Product Description</h2>
        <label><span>Main Description</span></label>
        <textarea required value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Please input" rows={9} />
      </section>

      <section className="seller-add-section">
        <h2>Shipping & Warranty</h2>
        <label><span>* Package Weight</span><input placeholder="0.001~300 kg" /></label>
        <label><span>* Package Length(cm) * Width(cm) * Height(cm)</span></label>
        <div className="seller-add-dimensions">
          <input placeholder="0.01~300" /><input placeholder="0.01~300" /><input placeholder="0.01~300" />
        </div>
        <label><span>Dangerous Goods</span></label>
        <div className="seller-add-radio-row">
          <label><input type="radio" checked readOnly /> None</label>
          <label><input type="radio" readOnly /> Contains battery / flammables / liquid</label>
        </div>
      </section>

      <footer className="seller-add-submitbar">
        <p>By clicking “Submit”, you acknowledge and agree that you have used the AI Services provided by Lazada.</p>
        <div><button type="button">Save Draft</button><button type="submit">Submit</button></div>
      </footer>
    </div>
    <aside className="seller-add-score">
      <section>
        <h3>Content Score</h3>
        <div className="seller-score-bar"><span /></div>
        <b>Poor</b>
        {['Basic Information', 'Product Specification', 'Price, Stock & Variants', 'Product Description', 'Shipping & Warranty'].map((item, index) => (
          <p key={item} className={index === 0 ? 'active' : ''}>{item}</p>
        ))}
      </section>
      <section>
        <h3>Tips</h3>
        <p>Please make sure to upload product image(s), fill product name, and select the correct category to publish a product.</p>
      </section>
    </aside>
  </form>
  );
};

export default SellerDashboard;
