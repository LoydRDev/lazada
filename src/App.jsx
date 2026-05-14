import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useLocation } from 'react-router-dom';
import { api } from './lib/api';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import Category from './pages/Category';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Account from './pages/Account';
import Seller from './pages/Seller';
import SellerLogin from './pages/SellerLogin';
import SellerDashboard from './pages/SellerDashboard';
import AdminPanel from './pages/AdminPanel';
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
  const isSellerStandalone = pathname === '/seller' || pathname === '/seller/login';

  return (
    <div className="App">
      {!isSellerStandalone && <Header />}
      <main className="min-h-[calc(100vh-200px)]">{children}</main>
      {!isSellerStandalone && <Footer />}
      {authMode && <AuthModal mode={authMode} />}
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
            <Route path="/account" element={<Account />} />
            <Route path="/seller" element={<Seller />} />
            <Route path="/seller/login" element={<SellerLogin />} />
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </Layout>
    </AppProvider>
  );
}

export default App;
