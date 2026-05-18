import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { VISIBLE_CATEGORIES } from '../data/catalog';

const CategoryDropdown = () => {
  const [activeCategoryId, setActiveCategoryId] = useState(VISIBLE_CATEGORIES[0]?.id);
  const [isOpen, setIsOpen] = useState(false);
  const activeCategory = VISIBLE_CATEGORIES.find((category) => category.id === activeCategoryId) || VISIBLE_CATEGORIES[0];

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
          {VISIBLE_CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link
                to={`/category/${category.id}`}
                className={activeCategory?.id === category.id ? 'active' : ''}
                onMouseEnter={() => setActiveCategoryId(category.id)}
                onFocus={() => setActiveCategoryId(category.id)}
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
              to={`/category/${activeCategory.id}?q=${encodeURIComponent(subcategory)}`}
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
