import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { HiOutlineCube, HiOutlineShoppingCart } from 'react-icons/hi';
import { useCart } from '../contexts/CartContext';

const CATEGORIES = [
  {
    id: 'plumbing',
    name: 'سباكة',
    description: 'جميع مواد ومعدات السباكة',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    emoji: '🔧',
  },
  {
    id: 'electrical',
    name: 'كهرباء',
    description: 'المعدات والمواد الكهربائية',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    emoji: '⚡',
  },
  {
    id: 'smart',
    name: 'أنظمة ذكية',
    description: 'الأنظمة الذكية والتحكم الآلي',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    emoji: '🏠',
  },
];

export default function Categories() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCart();

  const handleCategoryClick = async (category) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      const allProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(allProducts.filter((p) => p.category === category.id));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">أقسام المنتجات</h1>
        <p className="text-slate-400 text-sm">اختر القسم لطلب المنتجات</p>
      </div>

      {!selectedCategory ? (
        /* Category Selection */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {CATEGORIES.map((cat, index) => (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className="cursor-pointer rounded-2xl overflow-hidden transition-all duration-400 hover:scale-[1.03] hover:shadow-2xl"
              style={{
                animationDelay: `${index * 0.1}s`,
                animation: 'fadeIn 0.5s ease-out forwards',
              }}
            >
              <div
                className="p-8 h-64 flex flex-col justify-between relative overflow-hidden"
                style={{ background: cat.gradient }}
              >
                {/* Decorative elements */}
                <div
                  className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
                />
                <div
                  className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
                />

                <div className="text-6xl">{cat.emoji}</div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-white mb-2">{cat.name}</h2>
                  <p className="text-white/80 text-sm">{cat.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Products in Category */
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="btn-secondary"
            >
              ← العودة للأقسام
            </button>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {selectedCategory.emoji} {selectedCategory.name}
              </h2>
              <p className="text-slate-400 text-sm">{products.length} منتج</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-40 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <HiOutlineCube className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400">لا توجد منتجات في هذا القسم</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className="glass-card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white text-lg">{product.name}</h3>
                      {product.description && (
                        <p className="text-slate-400 text-sm mt-1">{product.description}</p>
                      )}
                    </div>
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        background: `${selectedCategory.color}20`,
                        color: selectedCategory.color,
                      }}
                    >
                      <HiOutlineCube size={20} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-slate-400 text-xs">المتوفر</span>
                      <p className="text-lg font-bold text-white">{product.quantity || 0}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => addToCart(product)}
                    disabled={(product.quantity || 0) <= 0}
                    className="btn-primary w-full justify-center"
                    style={{
                      background:
                        (product.quantity || 0) <= 0
                          ? 'rgba(100,100,100,0.3)'
                          : selectedCategory.gradient,
                      cursor: (product.quantity || 0) <= 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <HiOutlineShoppingCart size={16} />
                    {(product.quantity || 0) <= 0 ? 'غير متوفر' : 'إضافة للسلة'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
