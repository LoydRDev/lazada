import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, Heart, Home, MapPin, Meh, ShoppingCart } from 'lucide-react';
import { PRODUCTS } from '../data/catalog';
import { useApp } from '../context/AppContext';
import { getDiscountPercent, peso_fmt } from '../lib/utils';

const maskEmail = (email = '') => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(8, name.length))}@${domain}`;
};

const accountSections = {
  overview: 'Manage My Account',
  profile: 'My profile',
  address: 'Address Book',
  addAddress: 'Add New Address',
  returns: 'My Returns',
  cancellations: 'My Cancellations',
  reviews: 'My Reviews',
  wishlist: 'My Wishlist & Followed Stores (0)',
};

const hashToSection = (hash) => {
  const key = hash.replace('#', '');
  if (key === 'add-address') return 'addAddress';
  return accountSections[key] ? key : 'overview';
};

const Account = () => {
  const { buyerUser, sellerProducts } = useApp();
  const navigate = useNavigate();
  const user = buyerUser;
  const [section, setSection] = useState(() => hashToSection(window.location.hash));
  const [reviewTab, setReviewTab] = useState('pending');
  const [addressLabel, setAddressLabel] = useState('home');
  const [addressForm, setAddressForm] = useState({
    fullName: user?.name || '',
    mobile: user?.phone || '',
    address: user?.address?.street || '',
    floor: '',
    province: user?.address?.municipality || '',
    district: user?.address?.city || '',
    ward: user?.address?.postalCode || '',
  });

  useEffect(() => {
    const syncHash = () => setSection(hashToSection(window.location.hash));
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const switchSection = (next) => {
    const hash = next === 'addAddress' ? 'add-address' : next;
    window.location.hash = hash;
    setSection(next);
  };

  const wishlistProducts = useMemo(() => {
    const source = sellerProducts?.length ? sellerProducts : PRODUCTS;
    return source.slice(8, 18);
  }, [sellerProducts]);

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-empty">
          <h1>Manage My Account</h1>
          <p>Please login to manage your account.</p>
          <button type="button" onClick={() => navigate('/login')}>Login</button>
        </div>
      </div>
    );
  }

  const address = user.address || {};

  return (
    <div className="account-page">
      <aside className="account-sidebar">
        <p>Hello, {user.name}</p>
        <h3>Manage My Account</h3>
        <button type="button" className={section === 'profile' ? 'active' : ''} onClick={() => switchSection('profile')}>My Profile</button>
        <button type="button" className={section === 'address' || section === 'addAddress' ? 'active' : ''} onClick={() => switchSection('address')}>Address Book</button>
        <button type="button" onClick={() => switchSection('overview')}>My Payment Options</button>
        <button type="button" onClick={() => switchSection('overview')}>Lazada Wallet</button>
        <h4>My Orders</h4>
        <button type="button" className={section === 'returns' ? 'active' : ''} onClick={() => switchSection('returns')}>My Returns</button>
        <button type="button" className={section === 'cancellations' ? 'active' : ''} onClick={() => switchSection('cancellations')}>My Cancellations</button>
        <h4>
          <button type="button" className={section === 'reviews' ? 'active heading-link' : 'heading-link'} onClick={() => switchSection('reviews')}>My Reviews</button>
        </h4>
        <h4>
          <button type="button" className={section === 'wishlist' ? 'active heading-link multi' : 'heading-link multi'} onClick={() => switchSection('wishlist')}>My Wishlist &<br />Followed Stores</button>
        </h4>
        <Link to="/seller">Sell On Lazada</Link>
      </aside>

      <main className="account-main">
        <h1>{accountSections[section]}</h1>
        {section === 'overview' && <OverviewPanel user={user} address={address} switchSection={switchSection} />}
        {section === 'profile' && <ProfilePanel user={user} />}
        {section === 'address' && <AddressBookPanel address={address} switchSection={switchSection} />}
        {section === 'addAddress' && (
          <AddressFormPanel
            form={addressForm}
            label={addressLabel}
            setForm={setAddressForm}
            setLabel={setAddressLabel}
            switchSection={switchSection}
          />
        )}
        {section === 'returns' && <EmptyOrderPanel message="There are no returns yet." />}
        {section === 'cancellations' && <EmptyOrderPanel message="There are no cancellations yet." />}
        {section === 'reviews' && <ReviewsPanel tab={reviewTab} setTab={setReviewTab} />}
        {section === 'wishlist' && <WishlistPanel products={wishlistProducts} />}
      </main>
    </div>
  );
};

const OverviewPanel = ({ user, address, switchSection }) => (
  <div className="account-overview-grid">
    <section className="account-card profile-card">
      <h2>Personal Profile <button type="button" onClick={() => switchSection('profile')}>Edit</button></h2>
      <p>{user.name}</p>
      <p>{maskEmail(user.email)}</p>
      <label>
        <input type="checkbox" />
        Receive marketing emails
      </label>
      {user.role === 'seller' && (
        <div className="seller-status">
          Seller application: <strong>{user.verified ? 'Verified' : 'Pending verification'}</strong>
        </div>
      )}
    </section>

    <section className="account-card overview-address-card">
      <div>
        <h2>Address Book <button type="button" onClick={() => switchSection('addAddress')}>Add</button></h2>
        <p>Save your shipping address here.</p>
        <MapPin className="account-pin" />
        {address.street && <strong>{address.street}, {address.city}</strong>}
      </div>
      <div>
        <p>Save your billing address here.</p>
      </div>
    </section>
  </div>
);

const ProfilePanel = ({ user }) => (
  <section className="account-panel profile-detail-panel">
    <div className="profile-detail-grid">
      <ProfileField label="Full Name" value={user.name} />
      <ProfileField label="Email Address" action="Change" value={maskEmail(user.email)} />
      <ProfileField label="Mobile" action="Add" value={user.phone || 'Please enter your mobile'} muted={!user.phone} />
      <ProfileField label="Birthday" value="Please enter your birthday" muted />
      <ProfileField label="Gender" value="Please enter your gender" muted />
    </div>
    <label className="profile-marketing">
      <input type="checkbox" />
      Receive marketing emails
    </label>
    <div className="profile-actions">
      <button type="button">Edit Profile</button>
      <button type="button">Change Password</button>
      <button type="button">Account Security</button>
    </div>
  </section>
);

const ProfileField = ({ label, action, value, muted = false }) => (
  <div className="profile-field">
    <span>{label}{action && <button type="button">{action}</button>}</span>
    <p className={muted ? 'muted' : ''}>{value}</p>
  </div>
);

const AddressBookPanel = ({ address, switchSection }) => (
  <section className="account-panel address-book-panel">
    <div>
      <p>Save your shipping and billing address here.</p>
      <MapPin className="account-pin large" />
      {address.street && (
        <strong>{address.street}, {address.municipality}, {address.city} {address.postalCode}</strong>
      )}
    </div>
    <button type="button" onClick={() => switchSection('addAddress')}>+ Add New Address</button>
  </section>
);

const AddressFormPanel = ({ form, label, setForm, setLabel, switchSection }) => {
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <section className="account-panel add-address-panel">
      <div className="address-form-grid">
        <label>
          <span>Full Name</span>
          <input value={form.fullName} onChange={update('fullName')} placeholder="First Last" />
        </label>
        <label>
          <span>Province</span>
          <select value={form.province} onChange={update('province')}>
            <option value="">Please choose your province</option>
            <option>Metro Manila</option>
            <option>Cavite</option>
            <option>Laguna</option>
            <option>Bulacan</option>
          </select>
        </label>
        <label>
          <span>Mobile Number</span>
          <input value={form.mobile} onChange={update('mobile')} placeholder="Please enter your phone number" />
        </label>
        <label>
          <span>District</span>
          <select value={form.district} onChange={update('district')}>
            <option value="">Please choose your district</option>
            <option>Manila</option>
            <option>Quezon City</option>
            <option>Makati</option>
            <option>Taguig</option>
          </select>
        </label>
        <label>
          <span>Address</span>
          <input value={form.address} onChange={update('address')} placeholder="Please enter your address" />
        </label>
        <label>
          <span>Ward</span>
          <select value={form.ward} onChange={update('ward')}>
            <option value="">Please choose your ward</option>
            <option>Barangay 1</option>
            <option>Barangay 2</option>
            <option>Barangay 3</option>
          </select>
        </label>
        <label>
          <span>Floor/Unit Number</span>
          <input value={form.floor} onChange={update('floor')} placeholder="Please enter your floor/unit number" />
        </label>
        <div className="address-label-picker">
          <span>Select a label for effective delivery:</span>
          <div>
            <button type="button" className={label === 'office' ? 'selected office' : 'office'} onClick={() => setLabel('office')}>
              <BriefcaseBusiness className="h-4 w-4" /> Office
            </button>
            <button type="button" className={label === 'home' ? 'selected home' : 'home'} onClick={() => setLabel('home')}>
              <Home className="h-4 w-4" /> Home
            </button>
          </div>
        </div>
      </div>
      <div className="address-form-actions">
        <button type="button" className="cancel" onClick={() => switchSection('address')}>Cancel</button>
        <button type="button" className="save" onClick={() => switchSection('address')}>Save</button>
      </div>
    </section>
  );
};

const EmptyOrderPanel = ({ message }) => (
  <div className="account-empty-state minimal">
    <p>{message}</p>
    <Link to="/">Continue Shopping</Link>
  </div>
);

const ReviewsPanel = ({ tab, setTab }) => (
  <>
    <div className="account-tabs">
      <button type="button" className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>To Be Reviewed</button>
      <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History</button>
    </div>
    <section className="account-panel review-empty-panel">
      <Meh className="review-empty-icon" />
      <p>{tab === 'pending' ? "You don't have any purchases to review" : "You haven't written any review"}</p>
    </section>
  </>
);

const WishlistPanel = ({ products }) => (
  <section className="wishlist-panel">
    <div className="wishlist-tabs">
      <button type="button" className="active">My Wishlist</button>
      <button type="button">Past Purchases</button>
      <button type="button">Followed Stores</button>
    </div>
    <div className="wishlist-toolbar">
      <button type="button">Add All To Cart</button>
    </div>
    <div className="wishlist-empty-copy">
      <Heart className="h-7 w-7" />
      <p>There are no item(s) in your wishlist</p>
      <span>Add your favors to wishlist and they will show here.</span>
      <Link to="/">Continue Shopping</Link>
    </div>
    <div className="wishlist-product-grid">
      {products.map((product) => (
        <article className="wishlist-product" key={product.id}>
          <img src={product.image} alt={product.name} loading="lazy" />
          <p>{product.name}</p>
          <strong>{peso_fmt(product.price)}</strong>
          {getDiscountPercent(product) > 0 && <span><s>{peso_fmt(product.originalPrice)}</s> -{getDiscountPercent(product)}%</span>}
          <div>
            <small>★★★★★ ({product.sold})</small>
            <button type="button" aria-label={`Add ${product.name} to cart`}>
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default Account;
