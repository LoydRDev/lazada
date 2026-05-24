import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  specialPrice: '',
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
  hasVariants: false,
  variantOptions: [],
  variants: [],
  weight: '',
  dimensions: { length: '', width: '', height: '' },
  shippingFee: '',
  status: 'Active',
  description: '',
};

const sellerStatusTabs = [
  { id: 'pending', label: 'Pending Approval', statuses: ['pending_approval'] },
  { id: 'to_pack', label: 'To Be Packed', statuses: ['approved', 'to_be_packed'] },
  { id: 'to_ship', label: 'To Be Shipped', statuses: ['packed', 'to_be_shipped'] },
  { id: 'shipping', label: 'Shipping', statuses: ['shipping'] },
  { id: 'delivered', label: 'Delivered', statuses: ['delivered', 'completed'] },
  { id: 'cancelled', label: 'Cancelled/Rejected', statuses: ['cancelled', 'rejected'] },
];

const sellerStatusLabels = {
  pending_approval: 'Pending Approval',
  approved: 'To Be Packed',
  to_be_packed: 'To Be Packed',
  packed: 'Packed',
  to_be_shipped: 'To Be Shipped',
  shipping: 'Shipping',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const sellerStatusActions = {
  pending_approval: [
    { action: 'approve', label: 'Approve', tone: 'primary' },
    { action: 'reject', label: 'Reject', tone: 'danger' },
  ],
  approved: [{ action: 'packed', label: 'Mark Packed', tone: 'primary' }],
  to_be_packed: [{ action: 'packed', label: 'Mark Packed', tone: 'primary' }],
  packed: [{ action: 'to_be_shipped', label: 'Ready to Ship', tone: 'primary' }],
  to_be_shipped: [{ action: 'shipping', label: 'Ship Order', tone: 'primary' }],
  shipping: [{ action: 'delivered', label: 'Mark Delivered', tone: 'primary' }],
  delivered: [{ action: 'completed', label: 'Complete', tone: 'primary' }],
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

const splitVariantValues = (value) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];

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
    selectedOptions: attributes,
    variantName: Object.values(attributes).join(' / '),
    price: Number(basePrice) || 0,
    stock: Number(baseStock) || 0,
    sku: Object.values(attributes).join('-').toUpperCase().replace(/[^A-Z0-9]+/g, '-'),
    image: '',
    status: 'active',
  }));
};

const getPricing = (form) => {
  const regularPrice = Number(form.price);
  const specialPrice = Number(form.specialPrice);
  const sellingPrice = specialPrice > 0 ? specialPrice : regularPrice;
  return { regularPrice, sellingPrice };
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
  const { sellerUser: user, sellerProducts, drivers, categories, addSellerProduct, updateSellerProduct, removeSellerProduct, orders, refreshSellerOrders, updateSellerOrderItem } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id: editProductId } = useParams();
  const isAddProductPage = pathname.endsWith('/add-product');
  const isEditProductPage = pathname.includes('/edit-product/');
  const [activePanel, setActivePanel] = useState('products');
  const [activeOrderTab, setActiveOrderTab] = useState('pending');
  const [busyOrderItemId, setBusyOrderItemId] = useState(null);
  const [driverSelections, setDriverSelections] = useState({});
  const [openMenus, setOpenMenus] = useState({ 'Common Tools': true, Products: true });
  const [form, setForm] = useState(defaultForm);
  const isOrdersPage = activePanel === 'orders' && !isAddProductPage && !isEditProductPage;
  const sellerIds = useMemo(() => new Set([String(user?.id || ''), String(user?.sellerId || '')]), [user?.id, user?.sellerId]);
  const myProducts = sellerProducts.filter(p => sellerIds.has(String(p.sellerId)));
  const editableProduct = myProducts.find((product) => String(product.id) === String(editProductId));
  const activeCategories = (categories.length ? categories : VISIBLE_CATEGORIES).filter(category => (category.status || 'Active') === 'Active' && !category.hidden);

  useEffect(() => {
    if (user?.role === 'seller') refreshSellerOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!isEditProductPage || !editableProduct) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      ...defaultForm,
      name: editableProduct.name || '',
      price: editableProduct.originalPrice || editableProduct.price || '',
      specialPrice: editableProduct.originalPrice > editableProduct.price ? editableProduct.price : '',
      originalPrice: editableProduct.originalPrice || editableProduct.price || '',
      stock: editableProduct.stock || '',
      brand: editableProduct.brand || '',
      category: editableProduct.category || activeCategories[0]?.id || 'electronics',
      subcategory: editableProduct.subcategory || '',
      images: editableProduct.images?.length ? editableProduct.images : [editableProduct.image].filter(Boolean),
      specs: editableProduct.specs || {},
      hasVariants: Boolean(editableProduct.hasVariants || editableProduct.variants?.length),
      variantOptions: (editableProduct.variantGroups || []).map((group) => ({ name: group.name || group.label, values: (group.values || []).join(', ') })),
      variants: editableProduct.variants || [],
      description: editableProduct.description || '',
      weight: editableProduct.specs?.weight || '',
      dimensions: editableProduct.specs?.dimensions || defaultForm.dimensions,
      shippingFee: editableProduct.specs?.shippingFee || '',
      status: editableProduct.status || 'Active',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditProductPage, editableProduct?.id]);
  const myOrderItems = orders.flatMap(o => o.items.filter(it => sellerIds.has(String(it.sellerId))).map(it => ({ ...it, orderId: o.id, order: o })));

  if (!user || user.role !== 'seller') {
    return <div className="max-w-[1400px] mx-auto p-10 text-center text-gray-500">Seller access only. <Link to="/seller/login" className="text-orange-600">Seller Login</Link></div>;
  }

  if (!isSellerSetupComplete(user)) {
    return <Navigate to="/seller/setup" replace />;
  }

  const setField = (field, value) => setForm((current) => {
    if (field === 'category') return { ...current, category: value, subcategory: '', specs: {}, variantOptions: [], variants: [] };
    if (field === 'subcategory') return { ...current, subcategory: value, specs: {} };
    return { ...current, [field]: value };
  });
  const patchForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const toggleMenu = (label) => setOpenMenus((current) => ({ ...current, [label]: !current[label] }));
  const handleMenuChild = (child) => {
    if (child === 'Manage Products') {
      setActivePanel('products');
      navigate('/seller/dashboard');
      return;
    }
    if (child === 'Add Products') {
      setActivePanel('products');
      navigate('/seller/dashboard/add-product');
      return;
    }
    if (child === 'Orders') {
      setActivePanel('orders');
      navigate('/seller/dashboard');
      return;
    }
    toast({ title: child, description: 'This Seller Center section is coming soon.' });
  };

  const handleTopMenu = (item) => {
    if (item.label === 'Orders') {
      setActivePanel('orders');
      navigate('/seller/dashboard');
      return;
    }
    if (item.children) toggleMenu(item.label);
  };

  const handleOrderAction = async (orderItemId, action) => {
    const driverId = driverSelections[orderItemId];
    if (action === 'shipping' && !driverId) {
      toast({ title: 'Driver required', description: 'Select a driver before shipping this order.' });
      return;
    }
    setBusyOrderItemId(orderItemId);
    const result = await updateSellerOrderItem(orderItemId, action, driverId ? { driverId } : {});
    setBusyOrderItemId(null);
    toast({
      title: result.ok ? 'Order updated' : 'Order update failed',
      description: result.ok ? 'The buyer order status has been updated.' : result.msg,
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user.verified) {
      toast({ title: 'Account not verified', description: 'An admin must approve your seller account before you can list products.' });
      return;
    }
    const { regularPrice, sellingPrice } = getPricing(form);
    if (regularPrice <= 0 || sellingPrice <= 0 || Number(form.stock) < 0) {
      toast({ title: 'Invalid price/stock' });
      return;
    }
    if (form.specialPrice && sellingPrice >= regularPrice) {
      toast({ title: 'Misleading discount', description: 'Special price must be lower than the regular price.' });
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
    const variants = form.hasVariants
      ? (form.variants.length ? form.variants : buildVariantRows(form.variantOptions, sellingPrice, form.stock))
      : [];
    if (form.hasVariants && variants.length === 0) {
      toast({ title: 'Variants required', description: 'Add variant groups and generate variant combinations, or turn variants off.' });
      return;
    }
    const variantSkus = variants.map((variant) => String(variant.sku || '').trim()).filter(Boolean);
    if (new Set(variantSkus).size !== variantSkus.length) {
      toast({ title: 'Duplicate SKU', description: 'Each generated variant needs a unique seller SKU.' });
      return;
    }
    if (variants.some((variant) => Number(variant.price) <= 0 || Number(variant.stock) < 0)) {
      toast({ title: 'Invalid variant price/stock', description: 'Each generated variant must have a valid price and stock.' });
      return;
    }

    await addSellerProduct({
      name: form.name,
      price: sellingPrice,
      originalPrice: regularPrice,
      stock: Number(form.stock),
      brand: form.brand,
      category: form.category,
      subcategory: form.subcategory,
      image: form.images[0],
      images: form.images,
      promotionImage: form.promotionImage || null,
      videoName: form.videoName || null,
      videoType: form.videoType || null,
      hasVariants: form.hasVariants,
      variantGroups: form.variantOptions.map((option) => ({
        name: option.name,
        values: splitVariantValues(option.values),
      })).filter((option) => option.name && option.values.length),
      variants,
      specGroups,
      weight: Number(form.weight) || 1,
      dimensions: form.dimensions,
      shippingFee: Number(form.shippingFee) || 0,
      description: form.description,
      discount: form.specialPrice ? Math.round((1 - sellingPrice / regularPrice) * 100) : 0,
      specs: {
        ...form.specs,
        subcategory: form.subcategory,
        promotionImage: Boolean(form.promotionImage),
        videoName: form.videoName || '',
        weight: Number(form.weight) || 1,
        dimensions: form.dimensions,
        shippingFee: Number(form.shippingFee) || 0,
      },
    });

    toast({ title: 'Product listed!', description: 'Your product is now live on Lazada.' });
    setForm(defaultForm);
    navigate('/seller/dashboard');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editableProduct) {
      toast({ title: 'Product not found', description: 'You can only edit your own products.' });
      return;
    }
    const variants = form.hasVariants ? form.variants : [];
    const combinations = variants.map((variant) => JSON.stringify(variant.selectedOptions || variant.attributes || {}));
    if (new Set(combinations).size !== combinations.length) {
      toast({ title: 'Duplicate variants', description: 'Variant combinations must be unique.' });
      return;
    }
    const { regularPrice, sellingPrice } = getPricing(form);
    if (regularPrice <= 0 || sellingPrice <= 0 || Number(form.stock) < 0 || variants.some((variant) => Number(variant.price) <= 0 || Number(variant.stock) < 0)) {
      toast({ title: 'Invalid price/stock', description: 'Price must be positive and stock cannot be negative.' });
      return;
    }
    if (form.specialPrice && sellingPrice >= regularPrice) {
      toast({ title: 'Misleading discount', description: 'Special price must be lower than the regular price.' });
      return;
    }
    try {
      await updateSellerProduct(editableProduct.id, {
        name: form.name,
        price: sellingPrice,
        originalPrice: regularPrice,
        stock: Number(form.stock),
        brand: form.brand,
        category: form.category,
        subcategory: form.subcategory,
        image: form.images[0],
        images: form.images,
        hasVariants: form.hasVariants,
        variantGroups: form.variantOptions.map((option) => ({ name: option.name, values: splitVariantValues(option.values) })).filter((option) => option.name && option.values.length),
        variants,
        description: form.description,
        status: form.status || 'Active',
        specs: { ...form.specs, subcategory: form.subcategory, weight: Number(form.weight) || 1, dimensions: form.dimensions, shippingFee: Number(form.shippingFee) || 0 },
      });
      toast({ title: 'Product updated', description: 'Changes are now visible to buyers.' });
      navigate('/seller/dashboard');
    } catch (error) {
      toast({ title: 'Product update failed', description: error.response?.data?.msg || 'Could not update product.' });
    }
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
                (item.label === 'Common Tools' && !isAddProductPage && !isEditProductPage && !isOrdersPage)
                || (item.label === 'Products' && (isAddProductPage || isEditProductPage))
                || (item.label === 'Orders' && isOrdersPage) ? 'active' : ''
              }`}
            >
              <button type="button" onClick={() => handleTopMenu(item)}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.dot && <i />}
                {item.children && <ChevronDown className="seller-menu-chevron h-4 w-4" />}
              </button>
              {item.children && openMenus[item.label] && (
                <div className="seller-manage-subnav">
                  {item.children.map((child) => {
                    const selected = (child === 'Manage Products' && !isAddProductPage && !isEditProductPage && !isOrdersPage)
                      || (child === 'Add Products' && (isAddProductPage || isEditProductPage))
                      || (child === 'Orders' && isOrdersPage);
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
            <h1>{isOrdersPage ? 'Orders' : isAddProductPage ? 'Add Product' : isEditProductPage ? 'Edit Product' : 'Manage Products'}</h1>
            <p>{user.storeName || user.businessName || user.name}</p>
          </div>
          {!isAddProductPage && !isEditProductPage && !isOrdersPage && (
            <div>
              <button type="button">Find Trending Opportunities</button>
              <button type="button">Analysis Tools <ChevronDown className="h-4 w-4" /></button>
              <button type="button">Bulk Manage <ChevronDown className="h-4 w-4" /></button>
              <button type="button" className="primary" onClick={() => navigate('/seller/dashboard/add-product')} disabled={!user.verified}><Plus className="h-4 w-4" /> New Product</button>
            </div>
          )}
        </header>

        {isOrdersPage ? (
          <SellerOrdersPage
            activeTab={activeOrderTab}
            setActiveTab={setActiveOrderTab}
            myOrderItems={myOrderItems}
            busyOrderItemId={busyOrderItemId}
            drivers={drivers}
            driverSelections={driverSelections}
            setDriverSelections={setDriverSelections}
            onAction={handleOrderAction}
          />
        ) : isAddProductPage || isEditProductPage ? (
          isEditProductPage && !editableProduct ? (
            <section className="seller-manage-card p-10 text-center text-gray-500">Product not found or not owned by this seller.</section>
          ) : (
            <AddProductPage
              form={form}
              setField={setField}
              patchForm={patchForm}
              handleAdd={isEditProductPage ? handleEdit : handleAdd}
              categories={activeCategories}
              isEditing={isEditProductPage}
            />
          )
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
                  <td>
                    <img src={p.image} alt={p.name} />
                    <span>
                      {p.name}
                      {p.variants?.length ? <small className="block text-xs text-gray-500">{p.variants.length} variant(s)</small> : null}
                    </span>
                  </td>
                  <td>{peso_fmt(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{p.sold || 0}</td>
                  <td className="flex gap-2">
                    <button type="button" onClick={() => navigate(`/seller/dashboard/edit-product/${p.id}`)}><Edit3 className="h-4 w-4" /></button>
                    <button type="button" onClick={() => removeSellerProduct(p.id)}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </>
);

const SellerOrdersPage = ({ activeTab, setActiveTab, myOrderItems, busyOrderItemId, drivers, driverSelections, setDriverSelections, onAction }) => {
  const activeConfig = sellerStatusTabs.find((tab) => tab.id === activeTab) || sellerStatusTabs[0];
  const groupedCounts = sellerStatusTabs.reduce((counts, tab) => ({
    ...counts,
    [tab.id]: myOrderItems.filter((item) => tab.statuses.includes(item.status)).length,
  }), {});
  const visibleItems = myOrderItems.filter((item) => activeConfig.statuses.includes(item.status));

  return (
    <section className="seller-manage-card">
      <div className="flex flex-wrap gap-2 mb-5">
        {sellerStatusTabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={`px-3 py-2 rounded border text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 bg-white text-gray-600'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} ({groupedCounts[tab.id] || 0})
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <div className="seller-manage-empty">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h2>No orders in this status</h2>
          <p>Buyer orders for your products will appear here as they move through fulfillment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => {
            const actions = sellerStatusActions[item.status] || [];
            const shouldChooseDriver = ['packed', 'to_be_shipped'].includes(item.status);
            return (
              <article key={item.orderItemId} className="border border-gray-100 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <strong className="block text-sm text-gray-900 line-clamp-2">{item.name}</strong>
                        {(item.variantName || item.sku) && (
                          <span className="block text-xs text-gray-500">
                            {item.variantName ? `Variation: ${item.variantName}` : null}
                            {item.sku ? `${item.variantName ? ' | ' : ''}SKU: ${item.sku}` : null}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          Order {item.orderId} · Item {item.orderItemId} · Buyer {item.buyerId}
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        {sellerStatusLabels[item.status] || item.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                      <div><span className="text-gray-500">Quantity</span><p className="font-semibold">{item.qty}</p></div>
                      <div><span className="text-gray-500">Unit Price</span><p className="font-semibold">{peso_fmt(item.price)}</p></div>
                      <div><span className="text-gray-500">Subtotal</span><p className="font-semibold text-orange-600">{peso_fmt(item.subtotal)}</p></div>
                      <div><span className="text-gray-500">Payment</span><p className="font-semibold uppercase">{item.order?.payment || 'COD'}</p></div>
                    </div>
                    {(shouldChooseDriver || item.driver) && (
                      <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-3 text-sm">
                        {item.driver ? (
                          <div>
                            <span className="text-gray-500">Assigned Driver</span>
                            <p className="font-semibold text-gray-900">{item.driver.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.driver.phone} | {item.driver.vehicle}
                              {item.trackingNumber ? ` | Tracking ${item.trackingNumber}` : ''}
                            </p>
                          </div>
                        ) : (
                          <label className="block">
                            <span className="text-gray-500">Driver</span>
                            <select
                              className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                              value={driverSelections[item.orderItemId] || ''}
                              onChange={event => setDriverSelections((current) => ({ ...current, [item.orderItemId]: event.target.value }))}
                            >
                              <option value="">Select delivery driver</option>
                              {drivers.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.name} - {driver.vehicle}{driver.plate ? ` (${driver.plate})` : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap justify-end gap-2 mt-4">
                      {actions.length === 0 ? (
                        <span className="text-xs text-gray-500">No further seller action required.</span>
                      ) : actions.map((action) => (
                        <button
                          type="button"
                          key={action.action}
                          disabled={busyOrderItemId === item.orderItemId || (action.action === 'shipping' && !driverSelections[item.orderItemId])}
                          onClick={() => onAction(item.orderItemId, action.action)}
                          className={`px-4 py-2 rounded text-sm font-semibold disabled:opacity-60 ${
                            action.tone === 'danger'
                              ? 'border border-red-200 text-red-600 hover:bg-red-50'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {busyOrderItemId === item.orderItemId ? 'Updating...' : action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

const AddProductPage = ({ form, setField, patchForm, handleAdd, categories = VISIBLE_CATEGORIES, isEditing = false }) => {
  const selectedCategory = categories.find((category) => (category.id || category.slug) === form.category) || categories[0] || VISIBLE_CATEGORIES[0];
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
    if (form.variantOptions.length >= 5) return;
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
    patchForm({ variants: buildVariantRows(form.variantOptions, getPricing(form).sellingPrice, form.stock) });
  };

  const updateVariant = (variantId, field, value) => {
    const nextValue = ['price', 'stock'].includes(field) ? Number(value) : value;
    setField('variants', form.variants.map((variant) => (
      variant.id === variantId ? { ...variant, [field]: nextValue } : variant
    )));
  };

  const updateVariantImage = async (variantId, event) => {
    const [file] = Array.from(event.target.files || []).filter((item) => item.type.startsWith('image/'));
    if (!file) return;
    const image = await readResizedImage(file, 700, 0.82);
    updateVariant(variantId, 'image', image);
    event.target.value = '';
  };

  const setDimension = (field, value) => {
    setField('dimensions', { ...form.dimensions, [field]: value });
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
            {categories.map(c => <option key={c.id || c.slug} value={c.slug || c.id}>{c.name}</option>)}
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
        <p>You can add variants to a product that has more than one option, such as size, color, storage, material, or style.</p>
        <label className="seller-add-radio-row">
          <input
            type="checkbox"
            checked={form.hasVariants}
            onChange={e => patchForm({
              hasVariants: e.target.checked,
              variantOptions: e.target.checked ? form.variantOptions : [],
              variants: e.target.checked ? form.variants : [],
            })}
          />
          <span>Enable product variants</span>
        </label>
        {form.hasVariants && (
          <button type="button" className="seller-add-outline" onClick={addVariantOption} disabled={form.variantOptions.length >= 5}><Plus className="h-4 w-4" /> Add Variation({form.variantOptions.length}/5)</button>
        )}
        {form.hasVariants && form.variantOptions.length > 0 && (
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
          <label><span>* Price</span><input required type="number" min="1" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="Regular price" /></label>
          <label><span>Special Price</span><input type="number" min="0" value={form.specialPrice} onChange={e => setField('specialPrice', e.target.value)} placeholder="Sale price" /></label>
          <label><span>Stock</span><input required type="number" min="0" value={form.stock} onChange={e => setField('stock', e.target.value)} /></label>
          <label><span>SellerSKU</span><input placeholder="Seller SKU" /></label>
          <label><span>Status</span><select value={form.status} onChange={e => setField('status', e.target.value)}><option value="Active">Active</option><option value="OutOfStock">Out of Stock</option><option value="Discontinued">Discontinued</option></select></label>
        </div>
        {form.hasVariants && form.variants.length > 0 && (
          <div className="seller-add-variant-table">
            <table>
              <thead>
                <tr><th>Variant</th><th>Image</th><th>Price</th><th>Stock</th><th>SellerSKU</th><th>Status</th></tr>
              </thead>
              <tbody>
                {form.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>{Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(' / ')}</td>
                    <td>
                      <label className="seller-add-upload-tile">
                        {variant.image ? <img src={variant.image} alt={variant.variantName} /> : <ImagePlus className="h-5 w-5" />}
                        <input type="file" accept="image/*" onChange={event => updateVariantImage(variant.id, event)} />
                      </label>
                    </td>
                    <td><input type="number" min="1" value={variant.price} onChange={e => updateVariant(variant.id, 'price', e.target.value)} /></td>
                    <td><input type="number" min="0" value={variant.stock} onChange={e => updateVariant(variant.id, 'stock', e.target.value)} /></td>
                    <td><input value={variant.sku} onChange={e => updateVariant(variant.id, 'sku', e.target.value)} /></td>
                    <td>
                      <select value={variant.status || 'active'} onChange={e => updateVariant(variant.id, 'status', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
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
        <label><span>* Package Weight</span><input required type="number" min="0.001" step="0.001" value={form.weight} onChange={e => setField('weight', e.target.value)} placeholder="0.001~300 kg" /></label>
        <label><span>* Package Length(cm) * Width(cm) * Height(cm)</span></label>
        <div className="seller-add-dimensions">
          <input required type="number" min="0.01" step="0.01" value={form.dimensions.length} onChange={e => setDimension('length', e.target.value)} placeholder="Length" />
          <input required type="number" min="0.01" step="0.01" value={form.dimensions.width} onChange={e => setDimension('width', e.target.value)} placeholder="Width" />
          <input required type="number" min="0.01" step="0.01" value={form.dimensions.height} onChange={e => setDimension('height', e.target.value)} placeholder="Height" />
        </div>
        <label><span>Shipping Fee</span><input type="number" min="0" value={form.shippingFee} onChange={e => setField('shippingFee', e.target.value)} placeholder="Optional seller shipping fee" /></label>
        <label><span>Dangerous Goods</span></label>
        <div className="seller-add-radio-row">
          <label><input type="radio" checked readOnly /> None</label>
          <label><input type="radio" readOnly /> Contains battery / flammables / liquid</label>
        </div>
      </section>

      <footer className="seller-add-submitbar">
        <p>By clicking “Submit”, you acknowledge and agree that you have used the AI Services provided by Lazada.</p>
        <div><button type="button">Save Draft</button><button type="submit">{isEditing ? 'Save Changes' : 'Submit'}</button></div>
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
