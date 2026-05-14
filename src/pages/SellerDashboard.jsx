import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Package, DollarSign, TrendingUp, Store, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';
import { CATEGORIES } from '../data/mock';
import { useToast } from '../hooks/use-toast';

const SellerDashboard = () => {
  const { user, sellerProducts, addSellerProduct, removeSellerProduct, orders } = useApp();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '', price: '', originalPrice: '', stock: '', brand: '', category: 'electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', description: '',
  });

  if (!user || user.role !== 'seller') {
    return <div className="max-w-[1400px] mx-auto p-10 text-center text-gray-500">Seller access only. <Link to="/login" className="text-orange-600">Login</Link></div>;
  }

  const myProducts = sellerProducts.filter(p => p.sellerId === user.id);
  const myOrderItems = orders.flatMap(o => o.items.filter(it => it.sellerId === user.id).map(it => ({ ...it, orderId: o.id })));
  const totalRevenue = myOrderItems.reduce((s, it) => s + it.price * it.qty, 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user.verified) { toast({ title: 'Account not verified', description: 'An admin must approve your seller account before you can list products.' }); return; }
    if (Number(form.price) <= 0 || Number(form.stock) < 0) { toast({ title: 'Invalid price/stock' }); return; }
    if (Number(form.originalPrice) && Number(form.originalPrice) < Number(form.price)) { toast({ title: 'Misleading discount', description: 'Original price must be ≥ selling price (no false discounts).' }); return; }
    const newP = {
      name: form.name,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice) || Number(form.price),
      stock: Number(form.stock),
      brand: form.brand,
      category: form.category,
      image: form.image,
      images: [form.image],
      description: form.description,
      discount: form.originalPrice ? Math.round((1 - form.price / form.originalPrice) * 100) : 0,
    };
    await addSellerProduct(newP);
    toast({ title: 'Product listed!', description: 'Your product is now live on Lazada.' });
    setShowAdd(false);
    setForm({ name: '', price: '', originalPrice: '', stock: '', brand: '', category: 'electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', description: '' });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm opacity-90"><Store className="w-4 h-4" />Seller Center</div>
          <h1 className="text-2xl font-bold mt-1">{user.businessName || user.name}</h1>
          <p className="text-sm opacity-90 mt-1">Welcome back to your dashboard</p>
        </div>
        <div>
          {user.verified ? (
            <span className="inline-flex items-center gap-1 bg-white text-green-600 px-3 py-1.5 rounded-full text-sm font-semibold"><ShieldCheck className="w-4 h-4" />Verified</span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-yellow-400 text-gray-900 px-3 py-1.5 rounded-full text-sm font-semibold"><ShieldAlert className="w-4 h-4" />Pending Verification</span>
          )}
        </div>
      </div>

      {!user.verified && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-4 text-sm">
          Your seller account is awaiting verification by an admin. Submitted document: <strong>{user.idDocument}</strong>. You cannot list products until approved.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><Package className="w-6 h-6" /></div>
          <div><div className="text-2xl font-bold text-gray-900">{myProducts.length}</div><div className="text-xs text-gray-500">Products Listed</div></div>
        </div>
        <div className="bg-white rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
          <div><div className="text-2xl font-bold text-gray-900">{myOrderItems.length}</div><div className="text-xs text-gray-500">Items Sold</div></div>
        </div>
        <div className="bg-white rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><DollarSign className="w-6 h-6" /></div>
          <div><div className="text-2xl font-bold text-gray-900">{peso_fmt(totalRevenue)}</div><div className="text-xs text-gray-500">Revenue</div></div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">My Products</h2>
          <button onClick={() => setShowAdd(!showAdd)} disabled={!user.verified} className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-1">
            <Plus className="w-4 h-4" />Add Product
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="border-2 border-orange-200 rounded-lg p-4 mb-4 bg-orange-50/30">
            <h3 className="font-semibold text-gray-900 mb-3">List a New Product</h3>
            <div className="grid grid-cols-2 gap-3">
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Product name (accurate, descriptive)" className="col-span-2 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input required value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Brand" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500 bg-white">
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input required type="number" min="1" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="Selling Price (₱)" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input type="number" min="0" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} placeholder="Original Price (optional)" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input required type="number" min="0" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="Stock quantity" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input value={form.image} onChange={e => setForm({...form, image: e.target.value})} placeholder="Image URL" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Accurate product description (no prohibited items, no false claims)" rows={3} className="col-span-2 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div className="text-xs text-gray-500 mt-2">All listings must follow Lazada’s content guidelines. Prohibited items and misleading info will be removed.</div>
            <div className="flex gap-2 mt-3">
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-semibold">Submit Listing</button>
              <button type="button" onClick={() => setShowAdd(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm">Cancel</button>
            </div>
          </form>
        )}

        {myProducts.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">No products yet. Click “Add Product” to list one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="py-2">Product</th><th>Price</th><th>Stock</th><th>Sold</th><th>Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {myProducts.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 flex items-center gap-3"><img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded" /><span className="line-clamp-1 max-w-xs">{p.name}</span></td>
                    <td className="text-orange-600 font-semibold">{peso_fmt(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>{p.sold}</td>
                    <td><button onClick={() => removeSellerProduct(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
