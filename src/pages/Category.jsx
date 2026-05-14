import  { useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Filter, Star } from 'lucide-react';
import { CATEGORIES } from '../data/mock';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

const Category = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q');
  const { sellerProducts } = useApp();
  const [sortBy, setSortBy] = useState('popular');
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  const cat = CATEGORIES.find(c => c.id === id);

  const filtered = useMemo(() => {
    let list = sellerProducts;
    if (id) list = list.filter(p => p.category === id);
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.brand.toLowerCase().includes(q.toLowerCase()));
    if (minRating > 0) list = list.filter(p => p.rating >= minRating);
    if (priceRange.min) list = list.filter(p => p.price >= Number(priceRange.min));
    if (priceRange.max) list = list.filter(p => p.price <= Number(priceRange.max));
    if (sortBy === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sortBy === 'sold') list = [...list].sort((a, b) => b.sold - a.sold);
    return list;
  }, [sellerProducts, id, q, sortBy, minRating, priceRange]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <div className="text-xs text-gray-500 mb-3">
        <Link to="/" className="hover:text-orange-600">Home</Link>
        {cat && <> &rsaquo; <span className="text-gray-700">{cat.name}</span></>}
        {q && <> &rsaquo; <span className="text-gray-700">Search: "{q}"</span></>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar Filters */}
        <aside className="bg-white rounded-lg p-4 h-fit sticky top-32">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Filter className="w-4 h-4" />Filters</h3>

          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Categories</div>
            <div className="space-y-1.5 text-sm">
              {CATEGORIES.slice(0, 8).map(c => (
                <Link key={c.id} to={`/category/${c.id}`} className={`block hover:text-orange-600 ${id === c.id ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>{c.name}</Link>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Price Range</div>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={priceRange.min} onChange={e => setPriceRange({ ...priceRange, min: e.target.value })} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" />
              <input type="number" placeholder="Max" value={priceRange.max} onChange={e => setPriceRange({ ...priceRange, max: e.target.value })} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" />
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Min Rating</div>
            {[4, 3, 2, 1, 0].map(r => (
              <button key={r} onClick={() => setMinRating(r)} className={`flex items-center gap-1 mb-1 text-sm ${minRating === r ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < r ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
                <span className="ml-1">{r === 0 ? 'All' : `& up`}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Results */}
        <main>
          <div className="bg-white rounded-lg p-3 mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">{filtered.length} results {cat && `in ${cat.name}`}</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Sort by:</span>
              {[['popular', 'Popular'], ['sold', 'Top Sales'], ['price_asc', 'Price ↑'], ['price_desc', 'Price ↓'], ['rating', 'Rating']].map(([v, l]) => (
                <button key={v} onClick={() => setSortBy(v)} className={`px-3 py-1 rounded ${sortBy === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{l}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-lg p-10 text-center text-gray-500">No products found. Try different filters.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Category;
