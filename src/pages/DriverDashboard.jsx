import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, LogOut, Package, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

const deliveryLabels = {
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
};

const driverActions = {
  assigned: [{ action: 'picked_up', label: 'Mark Picked Up' }],
  picked_up: [{ action: 'in_transit', label: 'Mark In Transit' }],
  in_transit: [{ action: 'delivered', label: 'Mark Delivered' }],
};

const DriverDashboard = () => {
  const { user, driverUser, orders, refreshDriverDeliveries, updateDriverDelivery, logout } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busyItemId, setBusyItemId] = useState(null);

  useEffect(() => {
    if (driverUser) refreshDriverDeliveries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverUser?.id]);

  const deliveries = useMemo(() => (
    orders.flatMap((order) => order.items
      .filter((item) => String(item.driver?.id) === String(driverUser?.id))
      .map((item) => ({ ...item, order })))
  ), [driverUser?.id, orders]);

  const updateDelivery = async (item, action) => {
    setBusyItemId(item.orderItemId);
    const result = await updateDriverDelivery(item.orderItemId, action);
    setBusyItemId(null);
    toast({
      title: result.ok ? 'Delivery updated' : 'Delivery update failed',
      description: result.ok ? 'The buyer and seller order status has been updated.' : result.msg,
    });
  };

  const signOut = async () => {
    await logout(200);
    navigate('/driver/login');
  };

  if (!user || user.role !== 'driver') {
    return (
      <div className="max-w-[1400px] mx-auto p-10 text-center text-gray-500">
        Driver access only. <Link to="/driver/login" className="text-orange-600">Driver Login</Link>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span>D</span>
          <div><strong>Driver Center</strong><small>Lazada Logistics</small></div>
        </div>
        <nav>
          <button type="button" className="active"><Truck className="w-5 h-5" />Assigned Deliveries</button>
        </nav>
        <button type="button" className="admin-sidebar-logout" onClick={signOut}>
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </aside>
      <main className="admin-dashboard-main">
        <header className="admin-content-header">
          <div><span>Driver Dashboard</span><h1>Assigned Deliveries</h1></div>
          <p>{user.name}</p>
        </header>

        {deliveries.length === 0 ? (
          <section className="bg-white rounded-lg p-12 text-center text-gray-500">
            <Package className="w-14 h-14 mx-auto text-gray-300 mb-3" />
            <p>No assigned deliveries yet.</p>
          </section>
        ) : (
          <div className="space-y-4">
            {deliveries.map((item) => {
              const deliveryStatus = item.deliveryStatus || 'assigned';
              const actions = driverActions[deliveryStatus] || [];
              return (
                <article key={item.orderItemId} className="bg-white rounded-lg p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
                    <div>
                      <h2 className="font-semibold text-gray-900">Order {item.order.id}</h2>
                      <p className="text-xs text-gray-500">Tracking {item.trackingNumber || item.driver?.trackingNumber || 'Pending'}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700">
                      <Truck className="w-3.5 h-3.5" />{deliveryLabels[deliveryStatus] || deliveryStatus}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty {item.qty} | Buyer {item.buyerId}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Deliver to: {item.order.address?.street || 'Address'}, {item.order.address?.city || item.order.address?.province || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 mt-4">
                    {actions.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle className="w-3.5 h-3.5" />Delivery complete</span>
                    ) : actions.map((action) => (
                      <button
                        type="button"
                        key={action.action}
                        disabled={busyItemId === item.orderItemId}
                        onClick={() => updateDelivery(item, action.action)}
                        className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {busyItemId === item.orderItemId ? 'Updating...' : action.label}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default DriverDashboard;
