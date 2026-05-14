import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Share2, Truck, ShieldCheck, RotateCcw, Plus, Minus, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SELLERS } from '../data/mock';
import ProductCard, { peso_fmt } from '../components/ProductCard';
import { useToast } from '../hooks/use-toast';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, addToCart, sellerProducts, user } = useApp();
  const { toast } = useToast();
  const product = getProductById(id);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  if (!product) {
    return <div className="max-w-[1400px] mx-auto p-10 text-center text-gray-500">Product not found. <Link to="/" className="text-orange-600">Go home</Link></div>;
  }

  const seller = SELLERS.find(s => s.id === product.sellerId) || { name: 'Lazada Seller', rating: 4.5, verified: true, followers: '10K', products: 50 };
  const images = product.images || [product.image];
  const related = sellerProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 6);

  const handleAdd = () => {
    if (!user) { toast({ title: 'Please login first', description: 'You need to login to add items to cart.' }); navigate('/login'); return; }
    if (user.role !== 'buyer' && user.role !== 'admin') { toast({ title: 'Only buyers can purchase', description: 'Sellers cannot buy products.' }); return; }
    addToCart(product, qty);
    toast({ title: 'Added to cart!', description: `${qty} × ${product.name}` });
  };

  const handleBuy = () => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'buyer' && user.role !== 'admin') { toast({ title: 'Only buyers can purchase' }); return; }
    addToCart(product, qty);
    navigate('/checkout');
  };

  const fiveDaysLater = new Date();
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

  const receiveDate = fiveDaysLater.toLocaleDateString('en-PH', {
  month: 'short',
  day: 'numeric',
  });

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <div className="text-xs text-gray-500">
        <Link to="/" className="hover:text-orange-600">Home</Link> &rsaquo;
        <Link to={`/category/${product.category}`} className="hover:text-orange-600"> {product.category}</Link> &rsaquo;
        <span className="text-gray-700"> {product.name}</span>
      </div>

      <div className="bg-white rounded-lg p-5 grid grid-cols-1 lg:grid-cols-[480px_1fr_280px] gap-6">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-50 rounded-md overflow-hidden mb-3">
            <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded border-2 overflow-hidden ${activeImg === i ? 'border-orange-500' : 'border-gray-200'}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3">
          <h1 className="text-xl font-medium text-gray-900 leading-snug">{product.name}</h1>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-orange-600 font-semibold">{product.rating.toFixed(1)}</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
              </div>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">{product.sold} sold</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">Brand: <span className="text-blue-600">{product.brand}</span></span>
          </div>

          <div className="bg-orange-50 p-4 rounded-md">
            <div className="flex items-baseline gap-3">
              <span className="text-orange-600 text-3xl font-bold">{peso_fmt(product.price)}</span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-gray-400 line-through">{peso_fmt(product.originalPrice)}</span>
                  <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded">-{product.discount}%</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-y-3 text-sm pt-2">
            <div className="text-gray-500">Quantity</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-gray-300 rounded">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-2 py-1 hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                <span className="px-4 py-1 border-x border-gray-300 min-w-[40px] text-center">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-2 py-1 hover:bg-gray-100"><Plus className="w-3 h-3" /></button>
              </div>
              <span className="text-xs text-gray-500">{product.stock} pieces available</span>
            </div>

            <div className="text-gray-500">Shipping</div>
            <div className="flex items-start gap-2 text-gray-700">
              <Truck className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <div>Standard Delivery <span className="font-semibold">FREE</span></div>
                <div className="text-xs text-gray-500">Receive by {receiveDate}</div>
              </div>
            </div>

            <div className="text-gray-500">Protection</div>
            <div className="flex items-center gap-2 text-gray-700">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs">Buyer Protection · Refund on incorrect/defective items</span>
            </div>

            <div className="text-gray-500">Returns</div>
            <div className="flex items-center gap-2 text-gray-700">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <span className="text-xs">15 Days Easy Return</span>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button onClick={handleBuy} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-md transition-colors">Buy Now</button>
            <button onClick={handleAdd} className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold py-3 rounded-md border-2 border-orange-500 transition-colors flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />Add to Cart
            </button>
            <button className="w-12 h-12 rounded-md border border-gray-200 flex items-center justify-center hover:border-orange-500 hover:text-orange-500"><Heart className="w-5 h-5" /></button>
            <button className="w-12 h-12 rounded-md border border-gray-200 flex items-center justify-center hover:border-orange-500 hover:text-orange-500"><Share2 className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Seller card */}
        <div className="bg-gray-50 rounded-lg p-4 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold"><Store className="w-5 h-5" /></div>
            <div>
              <div className="font-semibold text-sm text-gray-900">{seller.name}</div>
              {seller.verified && <div className="text-xs text-green-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Verified Seller</div>}
            </div>
          </div>
          <div className="grid grid-cols-3 text-center text-xs gap-1 py-2 border-y border-gray-200">
            <div><div className="font-bold text-gray-900">{seller.rating}</div><div className="text-gray-500">Rating</div></div>
            <div><div className="font-bold text-gray-900">{seller.products}</div><div className="text-gray-500">Products</div></div>
            <div><div className="font-bold text-gray-900">{seller.followers}</div><div className="text-gray-500">Followers</div></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 border border-orange-500 text-orange-600 py-1.5 rounded text-sm hover:bg-orange-50">Chat</button>
            <button className="flex-1 bg-orange-500 text-white py-1.5 rounded text-sm hover:bg-orange-600">Visit Store</button>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg p-5">
        <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">Product Description</h3>
        <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
        <ul className="mt-3 text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Brand: {product.brand}</li>
          <li>Category: {product.category}</li>
          <li>Stock: {product.stock} units</li>
          <li>Compliant with Lazada content guidelines</li>
        </ul>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="bg-white rounded-lg p-5">
          <h3 className="font-bold text-gray-900 mb-4">Related Products</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
