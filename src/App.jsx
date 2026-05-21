import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useLocation } from 'react-router-dom';
import { api } from './lib/api';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import MessagesWidget from './components/MessagesWidget';
import Home from './pages/Home';
import Category from './pages/Category';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Account from './pages/Account';
import Seller from './pages/Seller';
import SellerLogin from './pages/SellerLogin';
import SellerSetup from './pages/SellerSetup';
import SellerDashboard from './pages/SellerDashboard';
import AdminPanel from './pages/AdminPanel';
import DriverLogin from './pages/DriverLogin';
import DriverDashboard from './pages/DriverDashboard';
import { AppProvider } from './context/AppContext';
import { Toaster } from './components/ui/toaster';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const authMode = pathname === '/login' ? 'login' : pathname === '/register' ? 'register' : null;
  const isSellerStandalone = pathname.startsWith('/seller');
  const isAdminStandalone = pathname === '/admin';
  const isDriverStandalone = pathname.startsWith('/driver');
  const hideStorefrontChrome = isSellerStandalone || isAdminStandalone || isDriverStandalone;

  return (
    <div className="App">
      {!hideStorefrontChrome && <Header />}
      <main className={hideStorefrontChrome ? 'min-h-screen' : 'min-h-[calc(100vh-200px)]'}>{children}</main>
      {!hideStorefrontChrome && <Footer />}
      {authMode && <AuthModal mode={authMode} />}
      {!hideStorefrontChrome && <MessagesWidget />}
      <Toaster />
    </div>
  );
};

function App() {
  useEffect(() => {
    api.get('/').catch(() => {});
  }, []);

  return (
    <AppProvider>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/category/:id" element={<Category />} />
            <Route path="/search" element={<Category />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Home />} />
            <Route path="/register" element={<Home />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/account" element={<Account />} />
            <Route path="/seller" element={<Seller />} />
            <Route path="/seller/login" element={<SellerLogin />} />
            <Route path="/seller/setup" element={<SellerSetup />} />
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/seller/dashboard/add-product" element={<SellerDashboard />} />
            <Route path="/seller/dashboard/edit-product/:id" element={<SellerDashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/driver/login" element={<DriverLogin />} />
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
          </Routes>
        </Layout>
    </AppProvider>
  );
}

export default App;
