import  { createContext, useContext, useEffect, useState } from 'react';
import { MOCK_SESSION_KEY, MOCK_CART_KEY, DEFAULT_ADMIN, PRODUCTS } from '../data/mock';
import { api } from '../lib/api';

const AppContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);

const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([DEFAULT_ADMIN]);
  const [user, setUser] = useState(() => load(MOCK_SESSION_KEY, null));
  const [cart, setCart] = useState(() => load(MOCK_CART_KEY, []));
  const [orders, setOrders] = useState([]);
  const [sellerProducts, setSellerProducts] = useState(PRODUCTS);
  const [isDbConnected, setIsDbConnected] = useState(false);

  useEffect(() => {
    api.get('/bootstrap')
      .then(({ data }) => {
        setUsers(data.users?.length ? data.users : [DEFAULT_ADMIN]);
        setSellerProducts(data.products?.length ? data.products : PRODUCTS);
        setOrders(data.orders || []);
        setIsDbConnected(true);
      })
      .catch(() => setIsDbConnected(false));
  }, []);

  useEffect(() => save(MOCK_SESSION_KEY, user), [user]);
  useEffect(() => save(MOCK_CART_KEY, cart), [cart]);

  const register = async ({ email, password, name, role, businessName, idDocument, phone, address, firstName, middleInitial, lastName }) => {
    if (users.find(u => u.email === email)) return { ok: false, msg: 'Email already registered' };
    try {
      const { data } = await api.post('/auth/register', { email, password, name, role, businessName, idDocument, phone, address, firstName, middleInitial, lastName });
      setUsers([...users, data.user]);
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not register account' };
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Invalid credentials' };
    }
  };

  const logout = () => setUser(null);

  const updateUser = async (patch) => {
    if (!user) return;
    const { data } = await api.patch(`/users/${user.id}`, patch);
    const updated = { ...user, ...data.user };
    setUser(updated);
    setUsers(users.map(u => u.id === user.id ? updated : u));
  };

  const verifySeller = async (sellerId, approved) => {
    const { data } = await api.patch(`/users/${sellerId}`, { verified: approved });
    setUsers(users.map(u => u.id === sellerId ? data.user : u));
    if (user?.id === sellerId) setUser(data.user);
  };

  const addToCart = (product, qty = 1) => {
    const existing = cart.find(c => c.id === product.id);
    if (existing) setCart(cart.map(c => c.id === product.id ? { ...c, qty: c.qty + qty } : c));
    else setCart([...cart, { id: product.id, name: product.name, price: product.price, image: product.image, qty, sellerId: product.sellerId }]);
  };
  const updateCartQty = (id, qty) => setCart(cart.map(c => c.id === id ? { ...c, qty: Math.max(1, qty) } : c));
  const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));
  const clearCart = () => setCart([]);

  const placeOrder = async (items, address, payment) => {
    if (!user) return { ok: false, msg: 'Not logged in' };
    try {
      const { data } = await api.post('/orders', { userId: user.id, items, address, payment });
      setOrders([data.order, ...orders]);
      return { ok: true, order: data.order };
    } catch (error) {
      return { ok: false, msg: error.response?.data?.msg || 'Could not place order' };
    }
  };

  const addSellerProduct = async (product) => {
    const { data } = await api.post('/products', { ...product, sellerId: user.id });
    setSellerProducts([data.product, ...sellerProducts]);
    return data.product;
  };
  const removeSellerProduct = async (id) => {
    await api.delete(`/products/${id}`);
    setSellerProducts(sellerProducts.filter(p => p.id !== id));
  };

  const getProductById = (id) => sellerProducts.find(p => p.id === id);

  return (
    <AppContext.Provider value={{
      user, users, cart, orders, sellerProducts, isDbConnected,
      register, login, logout, updateUser, verifySeller,
      addToCart, updateCartQty, removeFromCart, clearCart,
      placeOrder, addSellerProduct, removeSellerProduct, getProductById,
    }}>
      {children}
    </AppContext.Provider>
  );
};
