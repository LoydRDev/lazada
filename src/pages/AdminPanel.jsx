import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
  Store,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';
import { useToast } from '../hooks/use-toast';

const AdminPanel = () => {
  const { user, users, sellerProducts, orders, verifySeller, removeSellerProduct, logout } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user || user.role !== 'admin') {
    return <div className="max-w-[1400px] mx-auto p-10 text-center text-gray-500">Admin access only. <Link to="/login" className="text-orange-600">Login</Link></div>;
  }

  const sellers = users.filter(u => u.role === 'seller');
  const pendingSellers = sellers.filter(s => !s.verified);
  const buyers = users.filter(u => u.role === 'buyer');
  const gmv = orders.reduce((s, o) => s + o.total, 0);
  const logItems = [
    ...orders.slice(0, 8).map((order) => ({
      id: `order-${order.id}`,
      type: 'Order',
      title: `Order ${order.id} placed`,
      detail: `${order.items?.length || 0} item(s) · ${peso_fmt(order.total || 0)}`,
      status: 'Completed',
    })),
    ...pendingSellers.map((seller) => ({
      id: `seller-${seller.id}`,
      type: 'Seller Review',
      title: `${seller.businessName || seller.name} submitted verification`,
      detail: seller.idDocument || 'Valid ID pending review',
      status: 'Pending',
    })),
  ];

  const approve = async (id, approved) => {
    await verifySeller(id, approved);
    toast({ title: approved ? 'Seller approved' : 'Seller rejected', description: approved ? 'Seller can now list products.' : 'Seller verification revoked.' });
  };

  const signOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
    navigate('/login');
    setIsLoggingOut(false);
  };

  const pageTitle = {
    overview: 'Platform Overview',
    logs: 'Logs & History',
    buyers: 'Buyers Management',
    sellers: 'Sellers Management',
  }[activeView];

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span>A</span>
          <div>
            <strong>Admin Center</strong>
            <small>Lazada PH</small>
          </div>
        </div>
        <nav>
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'logs', label: 'Logs', icon: ScrollText },
            { id: 'buyers', label: 'Buyers Management', icon: UserRound },
            { id: 'sellers', label: 'Sellers Management', icon: Store },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeView === item.id ? 'active' : ''}
              onClick={() => setActiveView(item.id)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="admin-sidebar-logout" onClick={signOut} disabled={isLoggingOut}>
          <LogOut className="w-4 h-4" /> {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-content-header">
          <div>
            <span>Admin Dashboard</span>
            <h1>{pageTitle}</h1>
          </div>
          <p>{user.name || user.email}</p>
        </header>

        {activeView === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { icon: Users, label: 'Buyers', value: buyers.length, color: 'orange' },
                { icon: Users, label: 'Sellers', value: sellers.length, color: 'blue' },
                { icon: Package, label: 'Products', value: sellerProducts.length, color: 'green' },
                { icon: TrendingUp, label: 'GMV', value: peso_fmt(gmv), color: 'pink' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-lg p-5 flex items-center gap-4">
                  <div className={`admin-stat-icon ${s.color}`}><s.icon className="w-6 h-6" /></div>
                  <div><div className="text-xl font-bold text-gray-900">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
                </div>
              ))}
            </div>

            <div className="admin-panel-card bg-white rounded-lg p-5 mb-4">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" />Pending Seller Verifications ({pendingSellers.length})</h2>
              {pendingSellers.length === 0 ? (
                <p className="text-sm text-gray-500">No pending sellers.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingSellers.map(s => (
                    <div key={s.id} className="py-3 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{s.businessName || s.name}</div>
                        <div className="text-xs text-gray-500">{s.email} · Doc: {s.idDocument}</div>
                      </div>
                      <button onClick={() => approve(s.id, true)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Check className="w-3.5 h-3.5" />Approve</button>
                      <button onClick={() => approve(s.id, false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm flex items-center gap-1"><X className="w-3.5 h-3.5" />Reject</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeView === 'logs' && (
          <div className="admin-panel-card bg-white rounded-lg p-5 mb-4">
            <h2 className="font-bold text-gray-900 mb-3">Logs Interview / Log History</h2>
            <div className="divide-y divide-gray-100">
              {logItems.length === 0 ? <p className="text-sm text-gray-500">No log history yet.</p> : logItems.map((log) => (
                <div key={log.id} className="admin-log-row">
                  <span>{log.type}</span>
                  <div>
                    <strong>{log.title}</strong>
                    <p>{log.detail}</p>
                  </div>
                  <em>{log.status}</em>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'buyers' && (
          <div className="admin-panel-card bg-white rounded-lg p-5 mb-4">
            <h2 className="font-bold text-gray-900 mb-3">All Buyers ({buyers.length})</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="py-2">Name</th><th>Email</th><th>Phone</th><th>Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {buyers.map(b => (
                  <tr key={b.id}>
                    <td className="py-2">{b.name}</td>
                    <td className="text-gray-600">{b.email}</td>
                    <td className="text-gray-600">{b.phone || 'Not set'}</td>
                    <td><span className="text-green-600 text-xs font-semibold">Active</span></td>
                  </tr>
                ))}
                {buyers.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-500">No buyers registered yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeView === 'sellers' && (
          <>
            <div className="admin-panel-card bg-white rounded-lg p-5 mb-4">
              <h2 className="font-bold text-gray-900 mb-3">All Sellers</h2>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="py-2">Business</th><th>Email</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {sellers.map(s => (
                    <tr key={s.id}>
                      <td className="py-2">{s.businessName || s.name}</td>
                      <td className="text-gray-600">{s.email}</td>
                      <td>{s.verified ? <span className="text-green-600 text-xs font-semibold">Verified</span> : <span className="text-yellow-600 text-xs font-semibold">Pending</span>}</td>
                      <td><button onClick={() => approve(s.id, !s.verified)} className="text-orange-600 text-xs hover:underline">{s.verified ? 'Revoke' : 'Approve'}</button></td>
                    </tr>
                  ))}
                  {sellers.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-500">No sellers registered yet.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="admin-panel-card bg-white rounded-lg p-5">
              <h2 className="font-bold text-gray-900 mb-3">All Listings ({sellerProducts.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2">Product</th><th>Brand</th><th>Price</th><th>Stock</th><th>Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {sellerProducts.slice(0, 15).map(p => (
                      <tr key={p.id}>
                        <td className="py-2 flex items-center gap-2"><img src={p.image} alt="" className="w-10 h-10 object-cover rounded" /><span className="line-clamp-1 max-w-md">{p.name}</span></td>
                        <td>{p.brand}</td>
                        <td className="text-orange-600">{peso_fmt(p.price)}</td>
                        <td>{p.stock}</td>
                        <td><button onClick={() => { removeSellerProduct(p.id); toast({ title: 'Listing removed' }); }} className="text-red-500 text-xs hover:underline">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
