import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  HiOutlineSearch,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { HiOutlineArchiveBox } from 'react-icons/hi2';

const CATEGORIES = [
  { id: 'plumbing', name: 'سباكة', color: '#0ea5e9' },
  { id: 'electrical', name: 'كهرباء', color: '#f59e0b' },
  { id: 'smart', name: 'أنظمة ذكية', color: '#8b5cf6' },
];

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  };

  const getCategoryName = (catId) =>
    CATEGORIES.find((c) => c.id === catId)?.name || 'عام';

  const getCategoryColor = (catId) =>
    CATEGORIES.find((c) => c.id === catId)?.color || '#6366f1';

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalValue = products.reduce(
    (sum, p) => sum + (p.quantity || 0) * (p.purchasePrice || 0),
    0
  );
  const totalItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockCount = products.filter(
    (p) => (p.quantity || 0) <= (p.minStock || 5)
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">المخزون</h1>
        <p className="text-slate-400 text-sm">عرض الكميات الحالية لجميع المنتجات</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-slate-400 text-sm mb-1">إجمالي العناصر</p>
          <p className="text-2xl font-bold text-white">{totalItems}</p>
          <div
            className="absolute top-0 right-0 w-20 h-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
              filter: 'blur(15px)',
            }}
          />
        </div>
        <div className="stat-card">
          <p className="text-slate-400 text-sm mb-1">القيمة الإجمالية</p>
          <p className="text-2xl font-bold text-white">{totalValue.toFixed(2)} ر.س</p>
          <div
            className="absolute top-0 right-0 w-20 h-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
              filter: 'blur(15px)',
            }}
          />
        </div>
        <div className="stat-card">
          <p className="text-slate-400 text-sm mb-1">منخفض المخزون</p>
          <p className="text-2xl font-bold text-amber-400">{lowStockCount}</p>
          <div
            className="absolute top-0 right-0 w-20 h-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
              filter: 'blur(15px)',
            }}
          />
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pr-10"
            placeholder="ابحث عن منتج..."
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field sm:w-48"
        >
          <option value="all">جميع الفئات</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const isLow = (product.quantity || 0) <= (product.minStock || 5);
          const percentage = Math.min(
            ((product.quantity || 0) / Math.max(product.minStock || 5, 1)) * 100,
            100
          );

          return (
            <div key={product.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white">{product.name}</h3>
                  <span
                    className="text-xs"
                    style={{ color: getCategoryColor(product.category) }}
                  >
                    {getCategoryName(product.category)}
                  </span>
                </div>
                {isLow && (
                  <HiOutlineExclamationCircle className="text-amber-400 flex-shrink-0" size={20} />
                )}
              </div>

              <div className="mb-3">
                <div className="flex items-end justify-between mb-1">
                  <span className="text-3xl font-bold text-white">
                    {product.quantity || 0}
                  </span>
                  <span className="text-xs text-slate-500">
                    حد أدنى: {product.minStock || 5}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      background: isLow
                        ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                        : 'linear-gradient(90deg, #6366f1, #0ea5e9)',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">سعر الشراء</span>
                <span className="text-slate-200">{product.purchasePrice || 0} ر.س</span>
              </div>

              {isLow && (
                <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-amber-400 text-xs flex items-center gap-1">
                    <HiOutlineExclamationCircle size={14} />
                    المخزون منخفض - يرجى إعادة التوريد
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="glass-card p-12 text-center">
          <HiOutlineArchiveBox className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">لا توجد منتجات مطابقة</p>
        </div>
      )}
    </div>
  );
}
