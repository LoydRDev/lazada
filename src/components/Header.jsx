import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Search, Shield, ShoppingCart, Store, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CategoryDropdown from './CategoryDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Header = () => {
  const { buyerUser, cart, logout } = useApp();
  const [q, setQ] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const navigate = useNavigate();
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const previousCartCount = useRef(cartCount);
  const user = buyerUser;

  useEffect(() => {
    if (cartCount > previousCartCount.current) {
      setCartPulse(true);
      const timer = window.setTimeout(() => setCartPulse(false), 520);
      previousCartCount.current = cartCount;
      return () => window.clearTimeout(timer);
    }

    previousCartCount.current = cartCount;
    return undefined;
  }, [cartCount]);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    await logout(1000, 'buyer');
    navigate('/');
    setIsLoggingOut(false);
  };

  return (
    <header className="lazada-shell-header">
      <div className="lazada-topbar">
        <div className="lazada-container lazada-topbar-inner">
          <nav className="lazada-utility-links" aria-label="Utility navigation">
            <a href="#feedback" className="text-fuchsia-500">Feedback</a>
            <a href="#app">Save More on App</a>
            <Link to="/seller">Sell on Lazada</Link>
            <a href="#care">Customer Care</a>
            <a href="#track">Track My Order</a>
          </nav>

          <div className="lazada-account-links">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 outline-none hover:text-[#f57224]">
                  <User className="h-3.5 w-3.5" />
                  {user.name}
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="lazada-account-menu w-64">
                  <div className="lazada-account-menu-meta">
                    {user.email} / <span className="font-semibold capitalize text-orange-600">{user.role}</span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="lazada-account-menu-item" onClick={() => navigate('/account')}>Manage My Account</DropdownMenuItem>
                  <DropdownMenuItem className="lazada-account-menu-item" onClick={() => navigate('/orders')}>My Orders</DropdownMenuItem>
                  <DropdownMenuItem className="lazada-account-menu-item" onClick={() => navigate('/seller')}>
                    <Store className="mr-2 h-4 w-4" />Sell on Lazada
                  </DropdownMenuItem>
                  {user.role === 'seller' && (
                    <DropdownMenuItem className="lazada-account-menu-item" onClick={() => navigate('/seller/dashboard')}>
                      <Store className="mr-2 h-4 w-4" />Seller Center
                    </DropdownMenuItem>
                  )}
                  {user.role === 'admin' && (
                    <DropdownMenuItem className="lazada-account-menu-item" onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="lazada-account-menu-item" onClick={handleLogout} disabled={isLoggingOut}>
                    <LogOut className="mr-2 h-4 w-4" />{isLoggingOut ? 'Logging out...' : 'Logout'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Signup</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="lazada-mainbar">
        <div className="lazada-container lazada-mainbar-inner">
          <div className="lazada-brand-stack">
            <Link to="/" className="lazada-brand" aria-label="Lazada home">
              <img src="/lazada_logo.png" alt="Lazada" />
            </Link>
            <CategoryDropdown />
          </div>

          <form onSubmit={submit} className="lazada-search" role="search">
            <div className="lazada-search-box">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search in Lazada"
                aria-label="Search in Lazada"
              />
              <button type="submit" aria-label="Search">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>

          <Link to="/cart" className={`lazada-cart ${cartPulse ? 'cart-pulse' : ''}`} aria-label="Cart" data-cart-target>
            <ShoppingCart className="h-8 w-8" />
            {cartCount > 0 && <span>{cartCount}</span>}
          </Link>

          <a href="#loans" className="lazada-loans" aria-label="Lazada loans">
            <img src="/Lazada_loan.png" alt="Apply now with Lazada Loans" />
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
