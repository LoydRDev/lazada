import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { peso_fmt } from '../components/ProductCard';

const Cart = () => {
  const { cart, updateCartQty, removeFromCart, buyerUser } = useApp();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState(() => cart.map((item) => String(item.id)));
  const selectedItems = useMemo(
    () => cart.filter((item) => selectedIds.includes(String(item.id))),
    [cart, selectedIds],
  );
  const subtotal = selectedItems.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 499 || subtotal === 0 ? 0 : 50;
  const allSelected = cart.length > 0 && selectedItems.length === cart.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : cart.map((item) => String(item.id)));
  };

  const toggleItem = (id) => {
    const itemId = String(id);
    setSelectedIds((current) => (
      current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]
    ));
  };

  const proceedToCheckout = () => {
    if (!buyerUser) {
      navigate('/login');
      return;
    }
    if (selectedItems.length === 0) return;
    navigate('/checkout', { state: { selectedCartIds: selectedIds } });
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="bg-white rounded-lg p-16 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-5">Add items you want to buy</p>
          <Link to="/" className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded hover:bg-orange-600">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Shopping Cart ({cart.length})</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="bg-white rounded-lg divide-y divide-gray-100">
          <div className="px-4 py-2 text-xs text-gray-500 grid grid-cols-[36px_80px_1fr_140px_120px_40px] gap-3 items-center">
            <label className="cart-checkbox" aria-label="Select all cart items">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            </label>
            <div></div><div>Product</div><div className="text-center">Price</div><div className="text-center">Quantity</div><div></div>
          </div>
          {cart.map(item => (
            <div key={item.id} className="px-4 py-4 grid grid-cols-[36px_80px_1fr_140px_120px_40px] gap-3 items-center">
              <label className="cart-checkbox" aria-label={`Select ${item.name}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(String(item.id))}
                  onChange={() => toggleItem(item.id)}
                />
              </label>
              <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
              <div>
                <Link to={`/product/${item.productId || item.id}`} className="text-sm text-gray-800 hover:text-orange-600 line-clamp-2">{item.name}</Link>
                {(item.variantName || item.sku) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {item.variantName ? `Variation: ${item.variantName}` : null}
                    {item.sku ? `${item.variantName ? ' | ' : ''}SKU: ${item.sku}` : null}
                  </p>
                )}
              </div>
              <div className="text-center text-orange-600 font-semibold">{peso_fmt(item.price)}</div>
              <div className="flex items-center justify-center">
                <div className="flex items-center border border-gray-300 rounded">
                  <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="px-2 py-1 hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                  <span className="px-3 py-1 border-x border-gray-300 min-w-[36px] text-center text-sm">{item.qty}</span>
                  <button
                    onClick={() => updateCartQty(item.id, item.qty + 1)}
                    disabled={Number(item.stock ?? 999999) <= item.qty}
                    className="px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {Number(item.stock ?? 999999) <= item.qty && <span className="ml-2 text-[11px] text-gray-400">Max</span>}
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        <aside className="bg-white rounded-lg p-5 h-fit sticky top-32">
          <h3 className="font-bold text-gray-900 mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Selected Items</span><span>{selectedItems.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{peso_fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{shipping === 0 ? 'FREE' : peso_fmt(shipping)}</span></div>
          </div>
          <div className="border-t border-gray-200 my-3"></div>
          <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-orange-600">{peso_fmt(subtotal + shipping)}</span></div>
          <button
            onClick={proceedToCheckout}
            disabled={selectedItems.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded mt-4 transition-colors"
          >
            Proceed to Checkout ({selectedItems.length})
          </button>
          <Link to="/" className="block text-center text-sm text-orange-600 mt-3 hover:underline">Continue Shopping</Link>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
