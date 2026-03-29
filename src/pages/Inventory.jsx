import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  HiOutlineSearch,
  HiOutlineExclamationCircle,
} from "react-icons/hi";
import { HiOutlineArchiveBox } from "react-icons/hi2";

const CATEGORIES = [
  { id: "plumbing", name: "سباكة", textClass: "text-sky-400" },
  { id: "electrical", name: "كهرباء", textClass: "text-amber-400" },
  { id: "smart", name: "أنظمة ذكية", textClass: "text-violet-400" },
];

const FALLBACK_CATEGORY = {
  name: "عام",
  textClass: "text-indigo-400",
};

const PROGRESS_WIDTH_CLASSES = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-full",
];

const getProgressWidthClass = (percentage) => {
  const index = Math.max(0, Math.min(20, Math.round(percentage / 5)));
  return PROGRESS_WIDTH_CLASSES[index];
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const snap = await getDocs(collection(db, "products"));
        if (!isMounted) return;
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const getCategoryMeta = (catId) =>
    CATEGORIES.find((c) => c.id === catId) || FALLBACK_CATEGORY;

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalValue = products.reduce(
    (sum, p) => sum + (p.quantity || 0) * (p.purchasePrice || 0),
    0,
  );
  const totalItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockCount = products.filter(
    (p) => (p.quantity || 0) <= (p.minStock || 5),
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="page-stack animate-fade-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-white">المخزون</h1>
        <p className="text-sm text-slate-400">
          عرض الكميات الحالية لجميع المنتجات
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 text-center md:grid-cols-3">
        <div className="stat-card">
          <p className="mb-1 text-sm text-slate-400">إجمالي العناصر</p>
          <p className="text-2xl font-bold text-white">{totalItems}</p>
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)] blur-xl" />
        </div>
        <div className="stat-card">
          <p className="mb-1 text-sm text-slate-400">القيمة الإجمالية</p>
          <p className="text-2xl font-bold text-white">
            {totalValue.toFixed(2)} ر.س
          </p>
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.15)_0%,transparent_70%)] blur-xl" />
        </div>
        <div className="stat-card">
          <p className="mb-1 text-sm text-slate-400">منخفض المخزون</p>
          <p className="text-2xl font-bold text-amber-400">{lowStockCount}</p>
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.15)_0%,transparent_70%)] blur-xl" />
        </div>
      </div>

      <div className="surface-panel flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <HiOutlineSearch
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
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
          className="input-field w-full lg:w-56"
        >
          <option value="all" className="text-center">
            جميع الفئات
          </option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {filteredProducts.map((product) => {
          const isLow = (product.quantity || 0) <= (product.minStock || 5);
          const percentage = Math.min(
            ((product.quantity || 0) / Math.max(product.minStock || 5, 1)) * 100,
            100,
          );
          const category = getCategoryMeta(product.category);
          const progressClass = isLow
            ? "bg-[linear-gradient(90deg,#ef4444,#f59e0b)]"
            : "bg-[linear-gradient(90deg,#6366f1,#0ea5e9)]";

          return (
            <div key={product.id} className="glass-card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white">{product.name}</h3>
                  <span className={`text-xs ${category.textClass}`}>
                    {category.name}
                  </span>
                </div>
                {isLow && (
                  <HiOutlineExclamationCircle
                    className="shrink-0 text-amber-400"
                    size={20}
                  />
                )}
              </div>

              <div className="mb-3">
                <div className="mb-1 flex items-end justify-between gap-3">
                  <span className="text-3xl font-bold text-white">
                    {product.quantity || 0}
                  </span>
                  <span className="text-xs text-slate-500">
                    حد أدنى: {product.minStock || 5}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-dark-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressWidthClass(percentage)} ${progressClass}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">سعر الشراء</span>
                <span className="text-slate-200">
                  {product.purchasePrice || 0} ر.س
                </span>
              </div>

              {isLow && (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2">
                  <p className="flex items-center gap-1 text-xs text-amber-400">
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
          <HiOutlineArchiveBox className="mx-auto mb-4 text-slate-600" size={48} />
          <p className="text-slate-400">لا توجد منتجات مطابقة</p>
        </div>
      )}
    </div>
  );
}
