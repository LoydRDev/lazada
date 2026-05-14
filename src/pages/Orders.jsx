import 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';

const statusBadge = {
  pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
  shipped: { color: 'bg-blue-100 text-blue-700', icon: Truck, label: 'Shipped' },
  delivered: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Delivered' },
};

const Orders = () => {
  const { orders, user } = useApp();
  const myOrders = orders.filter(o => o.userId === user?.id);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My Orders</h1>
      {myOrders.length === 0 ? (
        <div className="bg-white rounded-lg p-16 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No orders yet</p>
          <Link to="/" className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded hover:bg-orange-600">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myOrders.map(o => {
            const b = statusBadge[o.status] || statusBadge.pending;
            const Icon = b.icon;
            return (
              <div key={o.id} className="bg-white rounded-lg p-5">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Order {o.id}</div>
                    <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString('en-PH')}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${b.color}`}>
                    <Icon className="w-3.5 h-3.5" />{b.label}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {o.items.map(it => (
                    <div key={it.id} className="py-2 flex items-center gap-3">
                      <img src={it.image} alt={it.name} className="w-14 h-14 object-cover rounded" />
                      <div className="flex-1 text-sm text-gray-800 line-clamp-1">{it.name}</div>
                      <div className="text-xs text-gray-500">x{it.qty}</div>
                      <div className="text-sm font-semibold w-24 text-right">{peso_fmt(it.price * it.qty)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">{o.payment.toUpperCase()} · {o.address.city}</span>
                  <span className="font-bold text-orange-600">Total: {peso_fmt(o.total)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
