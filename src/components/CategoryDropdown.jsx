import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { VISIBLE_CATEGORIES } from '../data/catalog';
import { useApp } from '../context/AppContext';

const CategoryDropdown = () => {
  const { categories } = useApp();
  const visibleCategories = (categories.length ? categories : VISIBLE_CATEGORIES).filter(category => (category.status || 'Active') === 'Active' && !category.hidden);
  const [activeCategoryId, setActiveCategoryId] = useState(visibleCategories[0]?.id);
  const [isOpen, setIsOpen] = useState(false);
  const activeCategory = visibleCategories.find((category) => (category.id || category.slug) === activeCategoryId) || visibleCategories[0];

  return (
    <nav
      className="lazada-category-dropdown"
      aria-label="Shop by category"
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className={isOpen ? 'active' : ''}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onMouseEnter={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
      >
        Categories
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className={`lazada-category-menu ${isOpen ? 'open' : ''}`}>
        <ul>
          {visibleCategories.map((category) => (
            <li key={category.id || category.slug}>
              <Link
                to={`/category/${category.slug || category.id}`}
                className={(activeCategory?.id || activeCategory?.slug) === (category.id || category.slug) ? 'active' : ''}
                onMouseEnter={() => setActiveCategoryId(category.id || category.slug)}
                onFocus={() => setActiveCategoryId(category.id || category.slug)}
              >
                <span>{category.name}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="lazada-category-submenu">
          {activeCategory?.subcategories?.map((subcategory) => (
            <Link
              key={subcategory}
              to={`/category/${activeCategory.slug || activeCategory.id}?q=${encodeURIComponent(subcategory)}`}
            >
              {subcategory}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default CategoryDropdown;
