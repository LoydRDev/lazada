import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgePercent,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Gift,
  Headphones,
  HeartHandshake,
  MessageCircleQuestion,
  PackageCheck,
  Percent,
  Store,
  UsersRound,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

const benefits = [
  { icon: BadgePercent, title: '0% commission fee', copy: '0% Platform commission fee for first 90 days' },
  { icon: Percent, title: 'Free Campaign Voucher', copy: '0% Campaign Vouchers Commission Rate for 1 Campaign' },
  { icon: Gift, title: 'Seller Coins & Boost Traffic', copy: 'Extra seller coins & 14 days free trial for traffic exchange' },
  { icon: HeartHandshake, title: 'Ads Credit for you', copy: 'Get PHP 1,200 Ads Credit' },
  { icon: UsersRound, title: 'Incubation support', copy: 'Personal consultant with Lazada University' },
];

const steps = [
  'Sign up with your local phone number.',
  'Fill in Email and Address',
  'Submit ID and Bank Account',
  'Upload Products and Start Selling',
];

const support = [
  {
    icon: Store,
    title: 'Lazada University',
    copy: 'Free onboarding video course which will teach you the essential e-commerce knowledge in content, operations, order fulfillment, and policies.',
  },
  {
    icon: Headphones,
    title: 'Help Center',
    copy: 'Helping sellers with the problems they face when starting a shop on Lazada.',
  },
  {
    icon: UsersRound,
    title: "Seller's Community",
    copy: 'Go-to hub where sellers gather to elevate their ecommerce business and share insights.',
  },
  {
    icon: PackageCheck,
    title: 'Lazada Service Marketplace',
    copy: 'We helps sellers find digital services provided by selected Lazada partners.',
  },
];

const faqs = [
  'What documentation is required for registering on Lazada?',
  'What are Prohibited and Restricted product for sale on Lazada?',
  'What happens when sellers list Prohibited Products?',
  'Why we need the return process and what is the benefit of return process?',
];

const SellerLanding = () => {
  const { register, login } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    password: '',
  });

  const updatePhone = (event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 11) });
  const updatePassword = (event) => setForm({ ...form, password: event.target.value });

  const apply = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedPhone = form.phone.replace(/^0/, '');

    if (!/^9\d{9}$/.test(normalizedPhone)) {
      toast({ title: 'Invalid phone number', description: 'Enter a valid PH mobile number like 9123456789 or 09123456789.' });
      return;
    }

    if (form.password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters for your seller account.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const sellerPhone = `+63${normalizedPhone}`;
      const result = await register({
        email: `seller${normalizedPhone}@seller.lazada.ph`,
        password: form.password,
        name: `Seller ${normalizedPhone.slice(-4)}`,
        role: 'seller',
        phone: sellerPhone,
      });

      if (!result.ok) {
        const loginResult = await login(normalizedPhone, form.password, { allowedRoles: ['seller'] });
        if (!loginResult.ok) {
          toast({ title: 'Seller registration failed', description: result.msg });
          return;
        }
      }

      toast({ title: 'Seller account created', description: 'Complete your business setup to continue.' });
      navigate('/seller/setup');
    } catch (error) {
      toast({
        title: 'Seller registration failed',
        description: error?.response?.data?.msg || error?.message || 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToHero = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="seller-center-page">
      <nav className="seller-center-nav">
        <div className="seller-center-brand">
          <span className="seller-brand-mark">S</span>
          <strong>Lazada<br /><b>Seller Center</b></strong>
        </div>
        <div className="seller-center-tabs">
          <button type="button" className="active"><span>₱</span> MarketPlace</button>
          <button type="button"><span>G</span> LazGlobal</button>
        </div>
        <div className="seller-center-locale">
          <button type="button"><span className="seller-flag" /> Pilipinas <ChevronDown className="h-4 w-4" /></button>
          <button type="button">English <ChevronDown className="h-4 w-4" /></button>
        </div>
      </nav>

      <section className="seller-market-hero">
        <div className="seller-hero-overlay" />
        <div className="seller-market-inner">
          <div className="seller-market-copy">
            <h1>Grow your<br />business<br />with us!</h1>
            <div className="seller-market-stats">
              <div><strong>80</strong><span>M</span><p>Monthly Active Users<br />on Lazada</p></div>
              <div><strong>1</strong><span>M</span><p>Products across 100+<br />countries</p></div>
              <div><strong>70</strong><span>%</span><p>New sellers make their<br />first sale within 4 weeks</p></div>
            </div>
          </div>

          <form className="seller-create-card" onSubmit={apply}>
            <h2>Create your Lazada Store now</h2>
            <p>Already have an account? Click to <button type="button" onClick={() => navigate('/seller/login')}>Log in</button></p>
            <div className="seller-verify-tabs">
              <button type="button">Voice Call</button>
              <button type="button" className="active">SMS</button>
            </div>
            <label className="seller-phone-field">
              <span><span className="seller-flag" /> +63</span>
              <input value={form.phone} onChange={updatePhone} placeholder="Phone number" inputMode="numeric" />
            </label>
            <label className="seller-password-field">
              <input value={form.password} onChange={updatePassword} type={showPassword ? 'text' : 'password'} placeholder="New Password" />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </label>
            <button type="submit" className="seller-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify with SMS'}
            </button>
            <small>By clicking Next, you agree to these <a href="#terms">Terms & Conditions</a>, <a href="#seller-terms">Seller Instant Messaging AI Terms</a> and <a href="#privacy">Privacy Policy</a></small>
            <div className="seller-form-divider"><span />or<span /></div>
            <div className="seller-social-row">
              <button type="button"><span className="seller-brand-mini">Laz</span> Lazada App</button>
              <button type="button">G</button>
            </div>
            <button type="button" className="seller-global-link">Sign up as LazGlobal Seller <ChevronRight className="h-4 w-4" /></button>
          </form>
        </div>
      </section>

      <section className="seller-benefits">
        <h2>New Seller Benefits</h2>
        <div className="seller-benefit-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title}>
                <div><Icon className="h-9 w-9" /></div>
                <h3>{benefit.title}</h3>
                <p>{benefit.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="seller-start-steps">
        <h2>Steps to Start Selling</h2>
        <div className="seller-start-layout">
          <div>
            <p>Selling on Lazada provides you with good opportunity to step into the SEA market and access to learning materials and support you to achieve your business goals. Seller can be easily benefited through Lazada's platform since product would be displayed to a wide rang of buyers.</p>
            <button type="button" onClick={scrollToHero}>Sign up now</button>
          </div>
          <div className="seller-step-accordion">
            {steps.map((step, index) => (
              <button type="button" key={step}>
                <strong>{index + 1}.</strong> {step}
                <ChevronDown className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="seller-support">
        <h2>Seller's Support</h2>
        <div className="seller-support-grid">
          {support.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <h3><Icon className="h-8 w-8" /> {item.title} <ChevronRight className="h-5 w-5" /></h3>
                <p>{item.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="seller-faq">
        <h2>FAQ</h2>
        <div>
          {faqs.map((faq) => (
            <button type="button" key={faq}>
              {faq}
              <ChevronDown className="h-5 w-5" />
            </button>
          ))}
        </div>
        <button type="button" className="seller-more-help">Need more help</button>
      </section>

      <button type="button" className="seller-floating-signup" onClick={scrollToHero}>Sign Up ↑</button>
      <button type="button" className="seller-help"><MessageCircleQuestion className="h-5 w-5" /> Need Help</button>
    </div>
  );
};

export default SellerLanding;
