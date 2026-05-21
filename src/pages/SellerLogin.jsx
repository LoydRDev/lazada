import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, MessageCircleQuestion, Package, QrCode, ShoppingBasket } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';
import { isSellerSetupComplete } from '../lib/sellerSetup';

const SellerLogin = () => {
  const { login } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ identifier: '', password: '' });

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const result = await login(form.identifier.trim(), form.password, { allowedRoles: ['seller'] });
    if (!result.ok) {
      toast({ title: 'Seller login failed', description: result.msg });
      setIsSubmitting(false);
      return;
    }

    toast({ title: 'Welcome to Seller Center', description: `Logged in as ${result.user.name}.` });
    if (!isSellerSetupComplete(result.user)) {
      navigate('/seller/setup');
    } else {
      navigate('/seller/dashboard');
    }
  };

  return (
    <div className="seller-login-page">
      <nav className="seller-login-nav">
        <button type="button" className="seller-center-brand" onClick={() => navigate('/seller')}>
          <span className="seller-brand-mark">S</span>
          <strong>Lazada<br /><b>Seller Center</b></strong>
        </button>
        <div className="seller-center-locale">
          <button type="button"><span className="seller-flag" /> Pilipinas <ChevronDown className="h-4 w-4" /></button>
          <button type="button">English <ChevronDown className="h-4 w-4" /></button>
        </div>
      </nav>

      <main className="seller-login-main">
        <section className="seller-login-art" aria-label="Seller onboarding overview">
          <h1>Sell on Lazada!<br /><span>No.1 E-commerce Platform</span></h1>
          <div className="seller-login-visual">
            <div className="seller-phone-plate">
              <ShoppingBasket className="basket blue" />
              <ShoppingBasket className="basket orange" />
              <Package className="parcel" />
              <div className="seller-mascot">
                <span />
                <b>Seller</b>
              </div>
            </div>
          </div>
          <h2>4 Steps to Become a Lazada Seller <small>(Using a Phone Number)</small></h2>
          <div className="seller-login-steps">
            <span>Fill in Email</span>
            <span>Fill in Address</span>
            <span>Submit ID<br />and Bank Account</span>
            <span>Add Product</span>
          </div>
        </section>

        <form className="seller-login-card" onSubmit={submit}>
          <div className="seller-login-head">
            <h2>Login with Password</h2>
            <button type="button">Log In with QR Code</button>
            <QrCode className="h-10 w-10" />
          </div>
          <label>
            <input
              value={form.identifier}
              onChange={(event) => setForm({ ...form, identifier: event.target.value })}
              required
              placeholder="Mobile Number/ Email"
            />
          </label>
          <label>
            <input
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
            />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </label>
          <button type="submit" className="seller-login-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
          <button type="button" className="seller-login-otp">Login with OTP</button>
          <button type="button" className="seller-reset">Reset password</button>
          <div className="seller-login-connect">
            <span>-- Connect with --</span>
            <div>
              <button type="button"><span className="seller-brand-mini">Laz</span> Lazada Buyer APP</button>
              <button type="button"><FcGoogle className="h-5 w-5" /></button>
            </div>
          </div>
          <footer>
            <span>Don't have an account yet?</span>
            <button type="button" onClick={() => navigate('/seller')}>Create a new account</button>
          </footer>
        </form>
      </main>

      <button type="button" className="seller-help"><MessageCircleQuestion className="h-5 w-5" /> Need Help</button>
    </div>
  );
};

export default SellerLogin;
