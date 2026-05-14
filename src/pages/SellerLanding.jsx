import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, PackageCheck, ShieldCheck, Store, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

const sellerTypes = [
  {
    id: 'LazMall',
    icon: Store,
    title: 'LazMall',
    tone: 'pink',
    description: 'For brand owners and official distributors.',
    points: ['Official store identity', 'LazMall campaigns and tools', 'Boosted visibility and ranking', 'Commission only when you sell'],
  },
  {
    id: 'Marketplace',
    icon: Building2,
    title: 'Marketplace',
    tone: 'blue',
    description: 'Open to individual and corporate sellers.',
    points: ['Sell with low commission fees', 'Access seller tools and trainings', 'Drop-off points near you', 'Good for most online stores'],
  },
  {
    id: 'Delivered by Seller',
    icon: Truck,
    title: 'Delivered by Seller',
    tone: 'rose',
    description: 'For sellers using their own courier or fulfillment.',
    points: ['Fresh food and frozen goods', 'Bulky items outside LEL limits', 'Special shipping arrangements', 'Control your own delivery flow'],
  },
];

const steps = [
  'Choose your seller type',
  'Input registration details',
  'Submit business requirements',
  'Upload your first product',
];

const SellerLanding = () => {
  const { user, updateUser } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('Marketplace');
  const [form, setForm] = useState({ businessName: '', idDocument: '' });

  const apply = async (event) => {
    event.preventDefault();
    if (!user) {
      toast({ title: 'Login required', description: 'Please login or sign up as a buyer first.' });
      navigate('/login');
      return;
    }

    await updateUser({
      role: 'seller',
      verified: false,
      sellerType: selected,
      businessName: form.businessName || `${user.name}'s Store`,
      idDocument: form.idDocument || `${selected}-application`,
    });

    toast({ title: 'Seller application submitted', description: `${selected} application is pending verification.` });
    navigate('/account');
  };

  return (
    <div className="seller-apply-page">
      <section className="seller-hero">
        <div>
          <img src="/lazada_logo.png" alt="Lazada" />
          <h1>Start selling on the leading e-commerce platform in the Philippines today!</h1>
        </div>
        <div className="seller-hero-box">
          <PackageCheck className="h-24 w-24" />
        </div>
      </section>

      <section className="seller-type-section">
        <h2>Choose your seller type below to start your business!</h2>
        <div className="seller-type-grid">
          {sellerTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                type="button"
                key={type.id}
                className={`seller-type-card ${type.tone} ${selected === type.id ? 'active' : ''}`}
                onClick={() => setSelected(type.id)}
              >
                <header>
                  <Icon className="h-8 w-8" />
                  <strong>{type.title}</strong>
                </header>
                <p>{type.description}</p>
                <ul>
                  {type.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
                <span>{type.id === 'LazMall' ? 'Learn More' : 'Sign-Up Now'}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="seller-steps">
        <h2>Start selling in 4 easy steps!</h2>
        <div className="seller-steps-panel">
          <div className="seller-device">
            <Store className="h-16 w-16" />
            <strong>Seller</strong>
            <p>All steps can be done on Lazada Seller Center.</p>
          </div>
          <div className="seller-step-list">
            {steps.map((step, index) => (
              <div key={step}>
                <b>{index + 1}</b>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="seller-application">
        <h2>Apply as {selected}</h2>
        <form onSubmit={apply}>
          <input value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} placeholder="Business or store name" />
          <input value={form.idDocument} onChange={(event) => setForm({ ...form, idDocument: event.target.value })} placeholder="Business document ID / filename" />
          <button type="submit"><ShieldCheck className="h-5 w-5" />Submit Seller Application</button>
        </form>
        {!user && <p>Buyer account required. Login first, then submit your seller application.</p>}
        {user?.role === 'seller' && (
          <p className="seller-current-status">
            Current seller status: <CheckCircle2 className="h-4 w-4" /> {user.verified ? 'Verified' : 'Pending verification'}
          </p>
        )}
      </section>

      <section className="seller-blue-info">
        <h3>Becoming a Lazada Seller Now Made Easier!</h3>
        <p>The top online shopping site and eCommerce platform in the Philippines gives buyers a reliable place to shop and sellers a practical way to grow online.</p>
        <p>Apply as LazMall, Marketplace, or Delivered by Seller depending on how your business operates and how you plan to fulfill orders.</p>
      </section>
    </div>
  );
};

export default SellerLanding;
