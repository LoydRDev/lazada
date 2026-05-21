import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, MessageSquareText, Package, Star, Truck, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';
import { useToast } from '../hooks/use-toast';

const buyerStatus = {
  pending_approval: { label: 'Pending Seller Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'To Be Shipped', color: 'bg-blue-100 text-blue-700', icon: Package },
  to_be_packed: { label: 'To Be Shipped', color: 'bg-blue-100 text-blue-700', icon: Package },
  packed: { label: 'Preparing for Shipment', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  to_be_shipped: { label: 'Preparing for Shipment', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  shipping: { label: 'Shipping', color: 'bg-sky-100 text-sky-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const timelineSteps = [
  { id: 'pending_approval', label: 'Pending' },
  { id: 'to_be_packed', label: 'Approved' },
  { id: 'to_be_shipped', label: 'Packed' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'delivered', label: 'Delivered' },
];

const stepIndexByStatus = {
  pending_approval: 0,
  approved: 1,
  to_be_packed: 1,
  packed: 2,
  to_be_shipped: 2,
  shipping: 3,
  delivered: 4,
  completed: 4,
};

const canReview = (status) => ['delivered', 'completed'].includes(status);
const canCancel = (order) => order.items.every((item) => item.status === 'pending_approval');

const OrderTimeline = ({ status }) => {
  const currentIndex = stepIndexByStatus[status] ?? 0;
  const isStopped = ['cancelled', 'rejected'].includes(status);

  return (
    <div className="grid grid-cols-5 gap-2 text-[11px] text-gray-500">
      {timelineSteps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${!isStopped && index <= currentIndex ? 'bg-orange-500' : 'bg-gray-300'}`} />
          <span className={!isStopped && index <= currentIndex ? 'font-semibold text-gray-800' : ''}>{step.label}</span>
        </div>
      ))}
    </div>
  );
};

const ReviewModal = ({ target, onClose, onSubmit, isSubmitting }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!target) return null;

  return (
    <div className="auth-modal-layer" role="presentation" onMouseDown={onClose}>
      <section className="auth-modal compact" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <h2 className="auth-title">Review Product</h2>
        <div className="flex items-center gap-3 mb-4">
          <img src={target.item.image} alt={target.item.name} className="w-14 h-14 object-cover rounded" />
          <div>
            <p className="text-sm font-semibold text-gray-900 line-clamp-2">{target.item.name}</p>
            <span className="text-xs text-gray-500">Order {target.order.id}</span>
          </div>
        </div>
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button type="button" key={value} aria-label={`${value} stars`} onClick={() => setRating(value)}>
              <Star className={`h-7 w-7 ${value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="w-full min-h-28 border border-gray-200 rounded p-3 text-sm outline-none focus:border-orange-500"
          placeholder="Share your experience with this product"
        />
        <div className="auth-actions-row mt-4">
          <button type="button" className="auth-submit outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="auth-submit"
            disabled={isSubmitting}
            onClick={() => onSubmit({ rating, comment })}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </section>
    </div>
  );
};

const Orders = () => {
  const { orders, buyerUser, refreshBuyerOrders, cancelOrder, submitProductReview } = useApp();
  const { toast } = useToast();
  const [reviewTarget, setReviewTarget] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState(null);

  useEffect(() => {
    if (buyerUser) refreshBuyerOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerUser?.id]);

  const myOrders = useMemo(
    () => orders.filter((order) => String(order.userId) === String(buyerUser?.id)),
    [buyerUser?.id, orders],
  );

  const handleCancel = async (orderId) => {
    setBusyOrderId(orderId);
    const result = await cancelOrder(orderId);
    setBusyOrderId(null);
    toast({
      title: result.ok ? 'Order cancelled' : 'Could not cancel order',
      description: result.ok ? 'The seller will no longer process this order.' : result.msg,
    });
  };

  const submitReview = async ({ rating, comment }) => {
    if (!reviewTarget) return;
    setIsReviewing(true);
    const result = await submitProductReview({
      orderId: reviewTarget.order.id,
      orderItemId: reviewTarget.item.orderItemId,
      productId: reviewTarget.item.productId,
      rating,
      comment,
    });
    setIsReviewing(false);
    if (!result.ok) {
      toast({ title: 'Review not submitted', description: result.msg });
      return;
    }
    toast({ title: 'Review submitted', description: 'Thank you for rating this product.' });
    setReviewTarget(null);
  };

  if (!buyerUser) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="bg-white rounded-lg p-16 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Please log in with a buyer account to view orders.</p>
          <Link to="/login" className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded hover:bg-orange-600">Login as Buyer</Link>
        </div>
      </div>
    );
  }

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
          {myOrders.map((order) => (
            <article key={order.id} className="bg-white rounded-lg p-5">
              <header className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div>
                  <Link to={`/orders/${order.id}`} className="text-sm font-semibold text-gray-900 hover:text-orange-600">Order {order.id}</Link>
                  <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('en-PH')}</div>
                </div>
                {canCancel(order) && (
                  <button
                    type="button"
                    disabled={busyOrderId === order.id}
                    onClick={() => handleCancel(order.id)}
                    className="px-3 py-1.5 rounded border border-gray-200 text-xs text-gray-700 hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                  >
                    {busyOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
              </header>

              <div className="divide-y divide-gray-100">
                {order.items.map((item) => {
                  const badge = buyerStatus[item.status] || buyerStatus.pending_approval;
                  const Icon = badge.icon;

                  return (
                    <div key={item.orderItemId} className="py-4">
                      <div className="flex items-start gap-3">
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm text-gray-800 line-clamp-2">{item.name}</p>
                              {(item.variantName || item.sku) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.variantName ? `Variation: ${item.variantName}` : null}
                                  {item.sku ? `${item.variantName ? ' | ' : ''}SKU: ${item.sku}` : null}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">x{item.qty} · {peso_fmt(item.subtotal)}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${badge.color}`}>
                              <Icon className="w-3.5 h-3.5" />{badge.label}
                            </span>
                          </div>
                          <div className="mt-3">
                            <OrderTimeline status={item.status} />
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-3">
                            {item.reviewed && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <MessageSquareText className="w-3.5 h-3.5" />Reviewed
                              </span>
                            )}
                            {canReview(item.status) && !item.reviewed && (
                              <button
                                type="button"
                                className="px-4 py-2 rounded bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
                                onClick={() => setReviewTarget({ order, item })}
                              >
                                Review Product
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <footer className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{order.payment?.toUpperCase()} · {order.address?.city || 'Delivery address'}</span>
                <span className="font-bold text-orange-600">Total: {peso_fmt(order.total)}</span>
              </footer>
            </article>
          ))}
        </div>
      )}

      <ReviewModal
        target={reviewTarget}
        isSubmitting={isReviewing}
        onClose={() => setReviewTarget(null)}
        onSubmit={submitReview}
      />
    </div>
  );
};

export default Orders;
