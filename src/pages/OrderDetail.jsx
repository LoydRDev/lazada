import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Clock, Package, Truck, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';

const detailStatus = {
  pending_approval: { label: 'Pending Seller Approval', icon: Clock, color: 'text-yellow-700 bg-yellow-50' },
  approved: { label: 'To Be Shipped', icon: Package, color: 'text-blue-700 bg-blue-50' },
  to_be_packed: { label: 'To Be Shipped', icon: Package, color: 'text-blue-700 bg-blue-50' },
  packed: { label: 'Preparing for Shipment', icon: Package, color: 'text-indigo-700 bg-indigo-50' },
  to_be_shipped: { label: 'Preparing for Shipment', icon: Package, color: 'text-indigo-700 bg-indigo-50' },
  shipping: { label: 'Shipping', icon: Truck, color: 'text-sky-700 bg-sky-50' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'text-green-700 bg-green-50' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-700 bg-green-50' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-700 bg-red-50' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-gray-700 bg-gray-50' },
};

const OrderDetail = () => {
  const { id } = useParams();
  const { buyerUser, orders, refreshBuyerOrders } = useApp();

  useEffect(() => {
    if (buyerUser) refreshBuyerOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerUser?.id]);

  const order = useMemo(() => orders.find((item) => String(item.id) === String(id) && String(item.userId) === String(buyerUser?.id)), [buyerUser?.id, id, orders]);

  if (!buyerUser) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="bg-white rounded-lg p-10 text-center">
          <p className="text-gray-500 mb-4">Please log in with a buyer account to view this order.</p>
          <Link to="/login" className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded hover:bg-orange-600">Login as Buyer</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="bg-white rounded-lg p-10 text-center text-gray-500">
          Order not found. <Link to="/orders" className="text-orange-600">Back to My Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <div className="text-xs text-gray-500 mb-3">
        <Link to="/orders" className="hover:text-orange-600">My Orders</Link> &rsaquo; Order {order.id}
      </div>
      <section className="bg-white rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order {order.id}</h1>
            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('en-PH')}</p>
          </div>
          <strong className="text-orange-600">{peso_fmt(order.total)}</strong>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p><b>Payment:</b> {order.payment?.toUpperCase()}</p>
          <p><b>Delivery:</b> {order.address?.street || 'Delivery address'}, {order.address?.city || ''}</p>
        </div>
      </section>

      <section className="bg-white rounded-lg divide-y divide-gray-100">
        {order.items.map((item) => {
          const status = detailStatus[item.status] || detailStatus.pending_approval;
          const Icon = status.icon;
          return (
            <article key={item.orderItemId} className="p-5">
              <div className="flex items-start gap-3">
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">{item.name}</h2>
                      {(item.variantName || item.sku) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.variantName ? `Variation: ${item.variantName}` : null}
                          {item.sku ? `${item.variantName ? ' | ' : ''}SKU: ${item.sku}` : null}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">Item {item.orderItemId} · Product {item.productId}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                      <Icon className="w-3.5 h-3.5" />{status.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                    <p><span className="text-gray-500">Qty</span><br /><b>{item.qty}</b></p>
                    <p><span className="text-gray-500">Price</span><br /><b>{peso_fmt(item.price)}</b></p>
                    <p><span className="text-gray-500">Subtotal</span><br /><b>{peso_fmt(item.subtotal)}</b></p>
                  </div>
                  {item.driver && (
                    <div className="mt-3 rounded border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
                      <p className="font-semibold">Shipping Driver: {item.driver.name}</p>
                      <p className="text-xs mt-1">
                        {item.driver.phone} | {item.driver.vehicle}
                        {item.trackingNumber ? ` | Tracking ${item.trackingNumber}` : ''}
                      </p>
                    </div>
                  )}
                  {item.reviewed && <p className="text-xs text-green-700 mt-3">Review submitted.</p>}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default OrderDetail;
