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
  image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
  description: '',
};

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

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
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

    await addSellerProduct({
      name: form.name,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice) || Number(form.price),
      stock: Number(form.stock),
      brand: form.brand,
      category: form.category,
      image: form.image,
      images: [form.image],
      description: form.description,
      discount: form.originalPrice ? Math.round((1 - form.price / form.originalPrice) * 100) : 0,
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
          <AddProductPage form={form} setField={setField} handleAdd={handleAdd} />
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

const AddProductPage = ({ form, setField, handleAdd }) => (
  <form onSubmit={handleAdd} className="seller-add-product-layout">
    <div className="seller-add-product-main">
      <section className="seller-add-section">
        <h2>Basic Information</h2>
        <label><span>* Product Images</span></label>
        <div className="seller-add-image-row">
          <img src="/try_our_app/icon3.png" alt="Product upload QR helper" />
          <button type="button"><Plus className="h-8 w-8" /></button>
        </div>
        <label><span>Buyer Promotion Image</span></label>
        <div className="seller-add-promo-row">
          <button type="button"><Plus className="h-8 w-8" /></button>
          <p>White Background Image<br /><a href="#example">See Example</a></p>
        </div>
        <label><span>Video</span></label>
        <div className="seller-add-radio-row">
          <label><input type="radio" checked readOnly /> Upload Video</label>
          <label><input type="radio" readOnly /> Media Center</label>
        </div>
        <label><span>* Product Name</span></label>
        <input required value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Product name" />
        <label><span>* Category</span></label>
        <select value={form.category} onChange={e => setField('category', e.target.value)}>
          {VISIBLE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </section>

      <section className="seller-add-section">
        <header><h2>Product Specification</h2><button type="button">Re-Generate</button></header>
        <div className="seller-add-two-col">
          <label><span>Brand <b>KEY</b></span><input required value={form.brand} onChange={e => setField('brand', e.target.value)} placeholder="Type to search brand.." /></label>
          <label><span>* ISBN/ISSN</span><input placeholder="Input here" /></label>
          <label><span>Language <b>KEY</b></span><input placeholder="Please Input or select option" /></label>
          <label><span>Book Format <b>KEY</b></span><input placeholder="Please Input or select option" /></label>
        </div>
        <button type="button" className="seller-add-link">Show More <ChevronDown className="h-4 w-4" /></button>
      </section>

      <section className="seller-add-section">
        <h2>Price, Stock & Variants</h2>
        <p>You can add variants to a product that has more than one option, such as size or color.</p>
        <button type="button" className="seller-add-outline"><Plus className="h-4 w-4" /> Add Variation(0/2)</button>
        <div className="seller-add-stock-grid">
          <label><span>* Price</span><input required type="number" min="1" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="₱" /></label>
          <label><span>Special Price</span><input type="number" min="0" value={form.originalPrice} onChange={e => setField('originalPrice', e.target.value)} placeholder="Add" /></label>
          <label><span>Stock</span><input required type="number" min="0" value={form.stock} onChange={e => setField('stock', e.target.value)} /></label>
          <label><span>SellerSKU</span><input placeholder="Seller SKU" /></label>
        </div>
      </section>

      <section className="seller-add-section">
        <h2>Product Description</h2>
        <label><span>Main Description</span></label>
        <input value={form.image} onChange={e => setField('image', e.target.value)} placeholder="Image URL" />
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

export default SellerDashboard;
