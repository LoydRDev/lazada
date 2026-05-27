import  { createContext, useContext, useEffect, useState } from 'react';
import { PRODUCTS } from '../data/catalog';
import { DEFAULT_ADMIN } from '../data/defaultUsers';
import { MOCK_CART_KEY, MOCK_SESSION_KEY, MOCK_SESSIONS_KEY } from '../data/storageKeys';
import { api } from '../lib/api';

const AppContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);

const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));
const roleOf = (account) => String(account?.role || '').toLowerCase();
const sessionRoles = ['buyer', 'seller', 'admin', 'driver'];
const loadSessions = () => {
  const sessions = load(MOCK_SESSIONS_KEY, null);
  if (sessions) return sessions;
  const legacy = load(MOCK_SESSION_KEY, null);
  const role = roleOf(legacy);
  return role ? { [role]: legacy } : {};
};
const authConfig = (account, config = {}) => ({
  ...config,
  headers: {
    ...(config.headers || {}),
    ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}),
  },
});
const roleName = (role) => {
  const names = { admin: 'admin account', seller: 'seller account', buyer: 'buyer account', driver: 'driver account' };
  return names[role] || `${role} account`;
};

const roleAccessMessage = (accountRole, allowedRoles) => {
  if (accountRole === 'admin') return 'Please use the Admin Center to sign in with an admin account.';
  if (accountRole === 'seller') return 'Please use Seller Center to sign in with a seller account.';
  if (accountRole === 'driver') return 'Please use Driver Center to sign in with a driver account.';
  if (allowedRoles.length === 1) {
    const article = allowedRoles[0] === 'admin' ? 'an' : 'a';
    return `Please use ${article} ${roleName(allowedRoles[0])}.`;
  }
  const allowed = allowedRoles.map(roleName).join(' or ');
  return `Please use a ${allowed}.`;
};

const fallbackDrivers = [
  { id: 700001, name: 'Juan Dela Cruz', phone: '+639171110001', vehicle: 'Motorcycle', plate: 'NCR-1021', company: 'Lazada Logistics' },
  { id: 700002, name: 'Maria Santos', phone: '+639171110002', vehicle: 'Van', plate: 'NCR-2045', company: 'Lazada Logistics' },
  { id: 700003, name: 'Carlo Reyes', phone: '+639171110003', vehicle: 'Motorcycle', plate: 'NCR-7788', company: 'Lazada Express' },
];

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([DEFAULT_ADMIN]);
  const [sessions, setSessions] = useState(loadSessions);
  const [cart, setCart] = useState(() => load(MOCK_CART_KEY, []));
  const [orders, setOrders] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [drivers, setDrivers] = useState(fallbackDrivers);
  const [categories, setCategories] = useState([]);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const buyerUser = sessions.buyer || null;
  const sellerUser = sessions.seller || null;
  const adminUser = sessions.admin || null;
  const driverUser = sessions.driver || null;
  const user = adminUser || sellerUser || driverUser || buyerUser;

  useEffect(() => {
    api.get('/bootstrap')
      .then(({ data }) => {
        setUsers(data.users?.length ? data.users : [DEFAULT_ADMIN]);
        setSellerProducts(data.products?.length ? data.products : PRODUCTS);
        setOrders(data.orders || []);
        setDrivers(data.drivers?.length ? data.drivers : fallbackDrivers);
        setCategories(data.categories || []);
        setIsDbConnected(true);
      })
      .catch(() => {
        setSellerProducts(PRODUCTS);
        setIsDbConnected(false);
      })
      .finally(() => setIsCatalogLoading(false));
  }, []);

  useEffect(() => {
    save(MOCK_SESSIONS_KEY, sessions);
    save(MOCK_SESSION_KEY, user);
  }, [sessions, user]);
  useEffect(() => save(MOCK_CART_KEY, cart), [cart]);

  const setSessionUser = (sessionUser) => {
    const role = roleOf(sessionUser);
    if (!sessionRoles.includes(role)) return;
    setSessions((current) => {
      const next = { ...current, [role]: sessionUser };
      save(MOCK_SESSIONS_KEY, next);
      save(MOCK_SESSION_KEY, sessionUser);
      return next;
    });
  };

  const patchSessionUser = (updatedUser) => {
    const role = roleOf(updatedUser);
    if (!sessionRoles.includes(role)) return;
    setSessions((current) => ({
      ...current,
      [role]: { ...(current[role] || {}), ...updatedUser, token: current[role]?.token || updatedUser.token },
    }));
  };

  const register = async ({ email, password, name, role, storeName, businessName, idDocument, phone, address, firstName, middleInitial, lastName }) => {
    if (users.find(u => u.email === email || (phone && u.phone === phone))) return { ok: false, msg: 'Account already registered' };
    try {
      const { data } = await api.post('/auth/register', { email, password, name, role, storeName, businessName, idDocument, phone, address, firstName, middleInitial, lastName });
      setUsers((current) => [...current, data.user]);
      const sessionUser = { ...data.user, token: data.token };
      setSessionUser(sessionUser);
      return { ok: true, user: sessionUser };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not register account' };
    }
  };

  const login = async (email, password, options = {}) => {
    try {
      const { data } = await api.post('/auth/login', { email, password, identifier: email });
      const allowedRoles = options.allowedRoles?.map((role) => String(role).toLowerCase());
      const accountRole = roleOf(data.user);

      if (allowedRoles?.length && !allowedRoles.includes(accountRole)) {
        return {
          ok: false,
          msg: options.roleError || roleAccessMessage(accountRole, allowedRoles),
          user: data.user,
        };
      }

      const sessionUser = { ...data.user, token: data.token };
      setSessionUser(sessionUser);
      return { ok: true, user: sessionUser };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Invalid credentials' };
    }
  };

  const logout = async (delay = 1000, role = null) => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    setSessions((current) => {
      if (!role) return {};
      const next = { ...current };
      delete next[role];
      return next;
    });
  };

  const updateUser = async (patch, role = null) => {
    const account = role ? sessions[role] : user;
    if (!account) return { ok: false, msg: 'Not logged in' };
    try {
      const { data } = await api.patch(`/users/${account.id}`, patch, authConfig(account));
      const updated = { ...account, ...data.user };
      patchSessionUser(updated);
      setUsers(users.map(u => u.id === account.id ? updated : u));
      return { ok: true, user: updated };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not update account' };
    }
  };

  const verifySeller = async (sellerId, approved) => {
    const { data } = await api.patch(`/users/${sellerId}`, { verified: approved }, authConfig(adminUser || user));
    setUsers(users.map(u => u.id === sellerId ? data.user : u));
    Object.values(sessions).forEach((session) => {
      if (String(session?.id) === String(sellerId)) patchSessionUser(data.user);
    });
  };

  const refreshSessionUser = async (role) => {
    const account = sessions[role];
    if (!account) return { ok: false, msg: 'Not logged in' };
    try {
      const { data } = await api.get('/bootstrap');
      const refreshed = data.users?.find((entry) => String(entry.id) === String(account.id));
      if (!refreshed) return { ok: false, msg: 'Account not found' };
      const updated = { ...account, ...refreshed, token: account.token };
      patchSessionUser(updated);
      setUsers((current) => current.map((entry) => (String(entry.id) === String(updated.id) ? updated : entry)));
      return { ok: true, user: updated };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not refresh account' };
    }
  };

  const addToCart = (product, qty = 1) => {
    const productId = product.productId || product.id;
    const variantId = product.variantId || null;
    const lineId = variantId ? `${productId}:${variantId}` : String(productId);
    const requestedQty = Math.max(1, Number(qty) || 1);
    const stock = Number(product.stock ?? 999999);
    const existing = cart.find(c => String(c.id) === String(lineId));
    if (existing) {
      setCart(cart.map(c => String(c.id) === String(lineId)
        ? { ...c, qty: Math.min(stock, c.qty + requestedQty), stock }
        : c));
    } else {
      setCart([...cart, {
        id: lineId,
        productId,
        variantId,
        variantName: product.variantName || null,
        selectedOptions: product.selectedOptions || {},
        sku: product.sku || null,
        name: product.name,
        price: product.price,
        image: product.image,
        qty: Math.min(stock, requestedQty),
        stock,
        sellerId: product.sellerId,
      }]);
    }
  };
  const updateCartQty = (id, qty) => setCart(cart.map(c => (
    String(c.id) === String(id)
      ? { ...c, qty: Math.min(Number(c.stock ?? 999999), Math.max(1, qty)) }
      : c
  )));
  const removeFromCart = (id) => setCart(cart.filter(c => String(c.id) !== String(id)));
  const clearCart = () => setCart([]);
  const clearCartItems = (ids) => {
    const idSet = new Set(ids.map((id) => String(id)));
    setCart(cart.filter((item) => !idSet.has(String(item.id))));
  };

  const upsertOrder = (nextOrder) => {
    setOrders((current) => {
      const exists = current.some((order) => String(order.id) === String(nextOrder.id));
      if (exists) return current.map((order) => (String(order.id) === String(nextOrder.id) ? nextOrder : order));
      return [nextOrder, ...current];
    });
  };

  const placeOrder = async (items, address, payment) => {
    if (!buyerUser) return { ok: false, msg: 'Please log in with a buyer account to place orders.' };
    try {
      const { data } = await api.post('/orders', { items, address, payment }, authConfig(buyerUser));
      upsertOrder(data.order);
      setSellerProducts((current) => current.map((product) => {
        const purchased = items.filter((item) => String(item.productId || item.id).split(':')[0] === String(product.id));
        if (!purchased.length) return product;
        const nextVariants = product.variants?.map((variant) => {
          const line = purchased.find((item) => String(item.variantId) === String(variant.variantId || variant.id));
          return line ? { ...variant, stock: Math.max(0, Number(variant.stock || 0) - Number(line.qty || 1)) } : variant;
        });
        const baseQty = purchased
          .filter((item) => !item.variantId)
          .reduce((sum, item) => sum + Number(item.qty || 1), 0);
        return {
          ...product,
          stock: baseQty ? Math.max(0, Number(product.stock || 0) - baseQty) : product.stock,
          variants: nextVariants || product.variants,
        };
      }));
      return { ok: true, order: data.order };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not place order' };
    }
  };

  const refreshBuyerOrders = async () => {
    if (!buyerUser) return { ok: false, msg: 'Please log in with a buyer account.' };
    try {
      const { data } = await api.get('/orders', authConfig(buyerUser));
      setOrders((current) => {
        const buyerIds = new Set(data.orders.map((order) => String(order.id)));
        return [...data.orders, ...current.filter((order) => String(order.userId) !== String(buyerUser.id) || !buyerIds.has(String(order.id)))];
      });
      return { ok: true, orders: data.orders };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not load orders' };
    }
  };

  const refreshSellerOrders = async () => {
    if (!sellerUser) return { ok: false, msg: 'Please log in with a seller account.' };
    try {
      const { data } = await api.get('/seller/orders', authConfig(sellerUser));
      data.orders.forEach(upsertOrder);
      return { ok: true, orders: data.orders };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not load seller orders' };
    }
  };

  const refreshDriverDeliveries = async () => {
    if (!driverUser) return { ok: false, msg: 'Please log in with a driver account.' };
    try {
      const { data } = await api.get('/driver/deliveries', authConfig(driverUser));
      data.orders.forEach(upsertOrder);
      return { ok: true, orders: data.orders };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not load driver deliveries' };
    }
  };

  const updateDriverDelivery = async (orderItemId, action) => {
    if (!driverUser) return { ok: false, msg: 'Please log in with a driver account.' };
    try {
      const { data } = await api.patch(`/driver/deliveries/${orderItemId}/${action}`, {}, authConfig(driverUser));
      upsertOrder(data.order);
      return { ok: true, order: data.order };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not update delivery' };
    }
  };

  const cancelOrder = async (orderId) => {
    if (!buyerUser) return { ok: false, msg: 'Please log in with a buyer account.' };
    try {
      const { data } = await api.post(`/orders/${orderId}/cancel`, {}, authConfig(buyerUser));
      upsertOrder(data.order);
      return { ok: true, order: data.order };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not cancel order' };
    }
  };

  const updateSellerOrderItem = async (orderItemId, action, payload = {}) => {
    if (!sellerUser) return { ok: false, msg: 'Please log in with a seller account.' };
    try {
      const { data } = await api.patch(`/seller/order-items/${orderItemId}/${action}`, payload, authConfig(sellerUser));
      upsertOrder(data.order);
      return { ok: true, order: data.order };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not update order item' };
    }
  };

  const submitProductReview = async ({ orderId, orderItemId, productId, rating, comment }) => {
    if (!buyerUser) return { ok: false, msg: 'Please log in with a buyer account.' };
    try {
      const { data } = await api.post('/reviews', {
        orderId,
        orderItemId,
        productId,
        rating,
        comment,
      }, authConfig(buyerUser));
      upsertOrder(data.order);
      return { ok: true, review: data.review, order: data.order };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not submit review' };
    }
  };

  const addSellerProduct = async (product) => {
    const { data } = await api.post('/products', product, authConfig(sellerUser));
    setSellerProducts([data.product, ...sellerProducts]);
    return data.product;
  };
  const updateSellerProduct = async (id, product) => {
    const { data } = await api.patch(`/products/${id}`, product, authConfig(sellerUser));
    setSellerProducts(sellerProducts.map(p => String(p.id) === String(id) ? data.product : p));
    return data.product;
  };
  const removeSellerProduct = async (id) => {
    await api.delete(`/products/${id}`, authConfig(sellerUser));
    setSellerProducts(sellerProducts.filter(p => p.id !== id));
  };

  const refreshAdminCategories = async () => {
    const { data } = await api.get('/admin/categories', authConfig(adminUser));
    setCategories(data.categories || []);
    return data.categories || [];
  };

  const createAdminCategory = async (category) => {
    const { data } = await api.post('/admin/categories', category, authConfig(adminUser));
    setCategories((current) => [...current, data.category].sort((a, b) => a.name.localeCompare(b.name)));
    return data.category;
  };

  const updateAdminCategory = async (slug, patch) => {
    const { data } = await api.patch(`/admin/categories/${slug}`, patch, authConfig(adminUser));
    setCategories((current) => current.map((category) => (category.slug === slug || category.id === slug ? data.category : category)));
    return data.category;
  };

  const deleteAdminCategory = async (slug) => {
    await api.delete(`/admin/categories/${slug}`, authConfig(adminUser));
    setCategories((current) => current.filter((category) => category.slug !== slug && category.id !== slug));
  };

  const getAdminReports = async (params = {}) => {
    const { data } = await api.get('/admin/reports', authConfig(adminUser, { params }));
    return data.report;
  };

  const getProductById = (id) => sellerProducts.find(p => String(p.id) === String(id));

  return (
    <AppContext.Provider value={{
      user, buyerUser, sellerUser, adminUser, driverUser, users, cart, orders, sellerProducts, drivers, categories, isDbConnected, isCatalogLoading,
      register, login, logout, updateUser, verifySeller, refreshSessionUser,
      addToCart, updateCartQty, removeFromCart, clearCart, clearCartItems,
      placeOrder, refreshBuyerOrders, refreshSellerOrders, refreshDriverDeliveries, cancelOrder, updateSellerOrderItem, updateDriverDelivery, submitProductReview,
      addSellerProduct, updateSellerProduct, removeSellerProduct, getProductById,
      refreshAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory, getAdminReports,
    }}>
      {children}
    </AppContext.Provider>
  );
};
