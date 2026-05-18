import 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

const peso = (n) => '₱' + n.toLocaleString('en-PH');

const ProductCard = ({ product, compact = false }) => {
  return (
    <Link to={`/product/${product.id}`} className="product-card block bg-white rounded-md overflow-hidden border border-gray-100">
      <div className="aspect-square bg-gray-50 overflow-hidden">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className={`p-3 ${compact ? 'space-y-1' : 'space-y-1.5'}`}>
        <div className="text-sm text-gray-800 line-clamp-2 min-h-[2.5rem]">{product.name}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-orange-600 font-bold text-base">{peso(product.price)}</span>
          {product.originalPrice > product.price && (
            <span className="text-xs text-gray-400 line-through">{peso(product.originalPrice)}</span>
          )}
        </div>
        {product.discount > 0 && (
          <div className="inline-block text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 font-semibold rounded">
            -{product.discount}%
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
            ))}
          </div>
          <span>{product.sold > 1000 ? `${(product.sold/1000).toFixed(1)}k` : product.sold} sold</span>
        </div>
      </div>
    </Link>
  );
};

export const ProductCardSkeleton = ({ compact = false }) => (
  <article className="product-card product-card-skeleton block bg-white rounded-md overflow-hidden border border-gray-100" aria-hidden="true">
    <div className="aspect-square skeleton-block" />
    <div className={`p-3 ${compact ? 'space-y-1' : 'space-y-1.5'}`}>
      <div className="skeleton-line w-full" />
      <div className="skeleton-line w-4/5" />
      <div className="skeleton-line price w-2/5" />
      <div className="flex items-center justify-between">
        <div className="skeleton-line w-1/3" />
        <div className="skeleton-line w-1/4" />
      </div>
    </div>
  </article>
);

// eslint-disable-next-line react-refresh/only-export-components
export const peso_fmt = peso;
export default ProductCard;
