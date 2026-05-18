import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Wallet, Truck, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';
import { useToast } from '../hooks/use-toast';

const Checkout = () => {
  const { cart, user, placeOrder, clearCart, clearCartItems } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [address, setAddress] = useState({ name: user?.name || '', phone: '', street: '', city: '', province: 'Metro Manila', zip: '' });
  const [payment, setPayment] = useState('cod');
  const selectedCartIds = state?.selectedCartIds?.map((id) => String(id));
  const checkoutItems = selectedCartIds?.length
    ? cart.filter((item) => selectedCartIds.includes(String(item.id)))
    : cart;

  const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 499 ? 0 : 50;
  const total = subtotal + shipping;

  const submit = async (e) => {
    e.preventDefault();
    if (checkoutItems.length === 0) { toast({ title: 'Cart is empty' }); return; }
    const r = await placeOrder(checkoutItems, address, payment);
    if (r.ok) {
      if (selectedCartIds?.length) clearCartItems(selectedCartIds);
      else clearCart();
      toast({ title: 'Order placed!', description: `Order ID: ${r.order.id}` });
      navigate('/orders');
    } else {
      toast({ title: 'Order failed', description: r.msg });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Checkout</h1>
      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="space-y-4">
          <section className="bg-white rounded-lg p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-600" />Delivery Address</h3>
            <div className="grid grid-cols-2 gap-3">
              <input required value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} placeholder="Full name" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input required value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} placeholder="Phone (+63...)" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input required value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} placeholder="Street, building, unit" className="col-span-2 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input required value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} placeholder="City" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input required value={address.province} onChange={e => setAddress({ ...address, province: e.target.value })} placeholder="Province" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              <input required value={address.zip} onChange={e => setAddress({ ...address, zip: e.target.value })} placeholder="ZIP code" className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
            </div>
          </section>

          <section className="bg-white rounded-lg p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-orange-600" />Items ({checkoutItems.length})</h3>
            <div className="divide-y divide-gray-100">
              {checkoutItems.map(item => (
                <div key={item.id} className="py-3 flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded" />
                  <div className="flex-1 text-sm text-gray-800 line-clamp-2">{item.name}</div>
                  <div className="text-sm text-gray-500">x{item.qty}</div>
                  <div className="text-sm font-semibold text-orange-600 w-24 text-right">{peso_fmt(item.price * item.qty)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-lg p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-orange-600" />Payment Method</h3>
            <div className="space-y-2">
              {[
                { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive the item', icon: Wallet },
                { id: 'gcash', label: 'GCash', desc: 'Pay via Lazada-approved GCash gateway', icon: Wallet },
                { id: 'card', label: 'Credit/Debit Card', desc: 'Visa, Master — secured by Lazada gateway', icon: CreditCard },
              ].map(opt => (
                <label key={opt.id} className={`flex items-center gap-3 p-3 border-2 rounded cursor-pointer ${payment === opt.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                  <input type="radio" name="pay" value={opt.id} checked={payment === opt.id} onChange={() => setPayment(opt.id)} className="accent-orange-500" />
                  <opt.icon className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-start gap-2 mt-3 text-xs text-blue-700 bg-blue-50 p-3 rounded">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>All transactions are processed through Lazada’s approved payment gateways. Direct off-platform payments are prohibited.</span>
            </div>
          </section>
        </div>

        <aside className="bg-white rounded-lg p-5 h-fit sticky top-32">
          <h3 className="font-bold text-gray-900 mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{peso_fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{shipping === 0 ? 'FREE' : peso_fmt(shipping)}</span></div>
          </div>
          <div className="border-t border-gray-200 my-3"></div>
          <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-orange-600">{peso_fmt(total)}</span></div>
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded mt-4 transition-colors">Place Order</button>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
