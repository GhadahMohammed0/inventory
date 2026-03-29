import { useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { HiOutlineCube, HiOutlineShoppingCart } from "react-icons/hi";
import { useCart } from "../contexts/CartContext";

const CATEGORIES = [
  {
    id: "plumbing",
    name: "سباكة",
    description: "جميع مواد ومعدات السباكة",
    emoji: "🔧",
    cardClass: "bg-[linear-gradient(135deg,#0ea5e9,#0284c7)]",
    accentClass: "bg-sky-500/15 text-sky-300",
    buttonClass:
      "bg-[linear-gradient(135deg,#0ea5e9,#0284c7)] hover:shadow-[0_12px_30px_rgba(14,165,233,0.35)]",
    delayClass: "[animation-delay:0ms]",
  },
  {
    id: "electrical",
    name: "كهرباء",
    description: "المعدات والمواد الكهربائية",
    emoji: "⚡",
    cardClass: "bg-[linear-gradient(135deg,#f59e0b,#d97706)]",
    accentClass: "bg-amber-500/15 text-amber-200",
    buttonClass:
      "bg-[linear-gradient(135deg,#f59e0b,#d97706)] hover:shadow-[0_12px_30px_rgba(245,158,11,0.35)]",
    delayClass: "[animation-delay:100ms]",
  },
  {
    id: "smart",
    name: "أنظمة ذكية",
    description: "الأنظمة الذكية والتحكم الآلي",
    emoji: "🏠",
    cardClass: "bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)]",
    accentClass: "bg-violet-500/15 text-violet-200",
    buttonClass:
      "bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] hover:shadow-[0_12px_30px_rgba(139,92,246,0.35)]",
    delayClass: "[animation-delay:200ms]",
  },
];

export default function Categories() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCart();

  const handleCategoryClick = async (category) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      const allProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(allProducts.filter((p) => p.category === category.id));
    } catch (error) {
      console.error("Error fetching products:", error);
    }
    setLoading(false);
  };

  return (
    <div className="page-stack animate-fade-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-white">أقسام المنتجات</h1>
        <p className="text-sm text-slate-400">اختر القسم لطلب المنتجات</p>
      </div>

      {!selectedCategory ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`animate-fade-in cursor-pointer overflow-hidden rounded-2xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${cat.delayClass}`}
            >
              <div
                className={`relative flex h-64 flex-col justify-between overflow-hidden p-6 pt-8 sm:h-72 sm:p-8 sm:pt-10 ${cat.cardClass}`}
              >
                <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.55)_0%,transparent_70%)] opacity-20" />
                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,transparent_70%)] opacity-10" />

                <div className="text-6xl">{cat.emoji}</div>
                <div className="relative z-10">
                  <h2 className="mb-2 text-2xl font-bold text-white">{cat.name}</h2>
                  <p className="text-sm text-white/80">{cat.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="page-stack">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setSelectedCategory(null)}
              className="btn-secondary w-full justify-center sm:w-auto"
            >
              ← العودة للأقسام
            </button>
            <div className="sm:text-left">
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                {selectedCategory.emoji} {selectedCategory.name}
              </h2>
              <p className="text-sm text-slate-400">{products.length} منتج</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-40 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <HiOutlineCube className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400">لا توجد منتجات في هذا القسم</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 px-1 sm:px-2 md:grid-cols-2 2xl:grid-cols-3">
              {products.map((product) => {
                const isUnavailable = (product.quantity || 0) <= 0;

                return (
                  <div
                    key={product.id}
                    className="glass-card flex h-full flex-col justify-between p-5"
                  >
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-1 text-sm text-slate-400">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className={`rounded-lg p-2 ${selectedCategory.accentClass}`}>
                          <HiOutlineCube size={20} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={isUnavailable}
                      className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all ${
                        isUnavailable
                          ? "cursor-not-allowed bg-slate-700/60 text-slate-300"
                          : selectedCategory.buttonClass
                      }`}
                    >
                      <HiOutlineShoppingCart size={16} />
                      {isUnavailable ? "غير متوفر" : "إضافة للسلة"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
