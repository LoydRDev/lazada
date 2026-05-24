import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Package,
  FolderTree,
  ScrollText,
  Shield,
  Store,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';
import { useToast } from '../hooks/use-toast';

const AdminLogin = ({ login, currentRole }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const result = await login(form.identifier.trim(), form.password, { allowedRoles: ['admin'] });
    if (!result.ok) {
      toast({ title: 'Admin login failed', description: result.msg });
      setIsSubmitting(false);
      return;
    }

    toast({ title: 'Welcome to Admin Center', description: `Logged in as ${result.user.name}.` });
    navigate('/admin');
    setIsSubmitting(false);
  };

  return (
    <div className="admin-dashboard flex items-center justify-center p-6">
      <form className="bg-white rounded-lg p-6 shadow-sm w-full max-w-md" onSubmit={submit}>
        <div className="flex items-center gap-3 mb-5">
          <div className="admin-stat-icon orange"><Shield className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Center Login</h1>
            <p className="text-sm text-gray-500">Use an admin account to manage Lazada PH.</p>
          </div>
        </div>
        {currentRole && currentRole !== 'admin' && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded p-3 mb-4">
            This browser is currently signed in as a {currentRole} account. Admin Center requires an admin account.
          </p>
        )}
        <label className="auth-field mb-3">
          <Mail className="h-4 w-4" />
          <input
            value={form.identifier}
            onChange={(event) => setForm({ ...form, identifier: event.target.value })}
            required
            placeholder="Admin email or phone"
          />
        </label>
        <label className="auth-field mb-4">
          <Lock className="h-4 w-4" />
          <input
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
            type="password"
            placeholder="Admin password"
          />
        </label>
        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login as Admin'}
        </button>
      </form>
    </div>
  );
};

const AdminPanel = () => {
  const {
    adminUser: user,
    users,
    sellerProducts,
    orders,
    categories,
    verifySeller,
    removeSellerProduct,
    login,
    logout,
    refreshAdminCategories,
    createAdminCategory,
    updateAdminCategory,
    deleteAdminCategory,
    getAdminReports,
  } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '', status: 'Active' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [reports, setReports] = useState(null);
  const [reportRange, setReportRange] = useState({ from: '', to: '' });

  useEffect(() => {
    if (user?.role === 'admin') refreshAdminCategories().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user?.role === 'admin' && activeView === 'reports') {
      getAdminReports({ from: reportRange.from || undefined, to: reportRange.to || undefined }).then(setReports).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, reportRange.from, reportRange.to, user?.id]);

  if (!user || user.role !== 'admin') {
    return <AdminLogin login={login} currentRole={user?.role} />;
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
    await logout(1000, 'admin');
    navigate('/login');
    setIsLoggingOut(false);
  };

  const pageTitle = {
    overview: 'Platform Overview',
    logs: 'Logs & History',
    buyers: 'Buyers Management',
    sellers: 'Sellers Management',
    categories: 'Category Management',
    reports: 'Advanced Reports',
  }[activeView];

  const saveCategory = async (event) => {
    event.preventDefault();
    try {
      if (editingCategory) {
        await updateAdminCategory(editingCategory.slug || editingCategory.id, categoryForm);
        toast({ title: 'Category updated' });
      } else {
        await createAdminCategory(categoryForm);
        toast({ title: 'Category created' });
      }
      setCategoryForm({ name: '', description: '', icon: '', status: 'Active' });
      setEditingCategory(null);
    } catch (error) {
      toast({ title: 'Category save failed', description: error.response?.data?.msg || 'Could not save category.' });
    }
  };

  const editCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '',
      status: category.status || 'Active',
    });
  };

  const removeCategory = async (category) => {
    try {
      await deleteAdminCategory(category.slug || category.id);
      toast({ title: 'Category deleted' });
    } catch (error) {
      toast({ title: 'Category delete failed', description: error.response?.data?.msg || 'Could not delete category.' });
    }
  };

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
            { id: 'categories', label: 'Categories', icon: FolderTree },
            { id: 'reports', label: 'Reports', icon: TrendingUp },
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

        {activeView === 'categories' && (
          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
            <form className="admin-panel-card bg-white rounded-lg p-5 h-fit" onSubmit={saveCategory}>
              <h2 className="font-bold text-gray-900 mb-3">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <label className="block mb-3">
                <span className="text-xs text-gray-500">Name</span>
                <input required value={categoryForm.name} onChange={event => setCategoryForm({ ...categoryForm, name: event.target.value })} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </label>
              <label className="block mb-3">
                <span className="text-xs text-gray-500">Description</span>
                <textarea value={categoryForm.description} onChange={event => setCategoryForm({ ...categoryForm, description: event.target.value })} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" rows={3} />
              </label>
              <label className="block mb-3">
                <span className="text-xs text-gray-500">Icon/Image label</span>
                <input value={categoryForm.icon} onChange={event => setCategoryForm({ ...categoryForm, icon: event.target.value })} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="Smartphone, Shirt, image URL..." />
              </label>
              <label className="block mb-4">
                <span className="text-xs text-gray-500">Status</span>
                <select value={categoryForm.status} onChange={event => setCategoryForm({ ...categoryForm, status: event.target.value })} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Hidden">Hidden</option>
                </select>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded text-sm font-semibold">{editingCategory ? 'Save' : 'Create'}</button>
                {editingCategory && <button type="button" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', icon: '', status: 'Active' }); }} className="border border-gray-200 px-4 py-2 rounded text-sm">Cancel</button>}
              </div>
            </form>
            <section className="admin-panel-card bg-white rounded-lg p-5">
              <h2 className="font-bold text-gray-900 mb-3">All Categories ({categories.length})</h2>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="py-2">Category</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((category) => (
                    <tr key={category.slug || category.id}>
                      <td className="py-2"><b>{category.name}</b><p className="text-xs text-gray-500">{category.slug || category.id}</p></td>
                      <td className="text-gray-600">{category.description || 'No description'}</td>
                      <td><span className={category.status === 'Active' ? 'text-green-600 text-xs font-semibold' : 'text-gray-500 text-xs font-semibold'}>{category.status}</span></td>
                      <td className="space-x-2">
                        <button type="button" onClick={() => editCategory(category)} className="text-orange-600 text-xs hover:underline">Edit</button>
                        <button type="button" onClick={() => updateAdminCategory(category.slug || category.id, { status: category.status === 'Active' ? 'Inactive' : 'Active' })} className="text-blue-600 text-xs hover:underline">{category.status === 'Active' ? 'Disable' : 'Enable'}</button>
                        <button type="button" onClick={() => removeCategory(category)} className="text-red-500 text-xs hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {activeView === 'reports' && (
          <div className="space-y-4">
            <section className="admin-panel-card bg-white rounded-lg p-5">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <h2 className="font-bold text-gray-900">Advanced Reports</h2>
                <div className="flex gap-2 text-sm">
                  <input type="date" value={reportRange.from} onChange={event => setReportRange({ ...reportRange, from: event.target.value })} className="border border-gray-200 rounded px-3 py-2" />
                  <input type="date" value={reportRange.to} onChange={event => setReportRange({ ...reportRange, to: event.target.value })} className="border border-gray-200 rounded px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(reports?.totals || {}).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded p-4">
                    <span className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <p className="text-lg font-bold text-gray-900">{key === 'sales' ? peso_fmt(value) : value}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="admin-panel-card bg-white rounded-lg p-5">
                <h3 className="font-bold text-gray-900 mb-3">Top-selling Products</h3>
                {(reports?.topProducts || []).map((item) => <p key={item.productId} className="flex justify-between text-sm py-1"><span>{item.name}</span><b>{item.sold || 0} sold</b></p>)}
              </div>
              <div className="admin-panel-card bg-white rounded-lg p-5">
                <h3 className="font-bold text-gray-900 mb-3">Top Sellers</h3>
                {(reports?.topSellers || []).map((item) => <p key={item.sellerId} className="flex justify-between text-sm py-1"><span>{item.name}</span><b>{peso_fmt(item.sales || 0)}</b></p>)}
              </div>
              <div className="admin-panel-card bg-white rounded-lg p-5">
                <h3 className="font-bold text-gray-900 mb-3">Orders by Status</h3>
                {Object.entries(reports?.ordersByStatus || {}).map(([status, count]) => <p key={status} className="flex justify-between text-sm py-1"><span>{status}</span><b>{count}</b></p>)}
              </div>
              <div className="admin-panel-card bg-white rounded-lg p-5">
                <h3 className="font-bold text-gray-900 mb-3">Low Stock Products</h3>
                {(reports?.lowStockProducts || []).map((item) => <p key={item.id} className="flex justify-between text-sm py-1"><span>{item.name}</span><b>{item.stock}</b></p>)}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
