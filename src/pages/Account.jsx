import { Link, useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';

const maskEmail = (email = '') => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(4, name.length))}@${domain}`;
};

const Account = () => {
  const { user } = useApp();
  const navigate = useNavigate();

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

  return (
    <div className="account-page">
      <aside className="account-sidebar">
        <p>Hello, {user.name}</p>
        <h3>Manage My Account</h3>
        <Link to="/account">My Profile</Link>
        <a href="#address">Address Book</a>
        <a href="#payment">My Payment Options</a>
        <h4>My Orders</h4>
        <Link to="/orders">My Returns</Link>
        <Link to="/orders">My Cancellations</Link>
        <h4>My Reviews</h4>
        <h4>My Wishlist &amp;<br />Followed Stores</h4>
        <Link to="/seller">Sell On Lazada</Link>
      </aside>

      <main className="account-main">
        <h1>Manage My Account</h1>
        <div className="account-cards">
          <section className="account-card profile-card">
            <h2>Personal Profile <button type="button">Edit</button></h2>
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

          <section className="account-card address-card" id="address">
            <div>
              <h2>Address Book <button type="button">Add</button></h2>
              <p>Save your shipping address here.</p>
              <MapPin className="h-10 w-10" />
            </div>
            <div>
              <p>Save your billing address here.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Account;
