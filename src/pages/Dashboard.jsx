import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  HiOutlineCube,
  HiOutlineShoppingCart,
  HiOutlineClipboardList,
  HiOutlineExclamationCircle,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
} from "react-icons/hi";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { userData, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalPurchases: 0,
    totalOrders: 0,
    lowStockItems: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const productsSnap = await getDocs(collection(db, "products"));
        const products = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const lowStock = products.filter(
          (p) => (p.quantity || 0) <= (p.minStock || 5),
        );

        const purchasesSnap = await getDocs(collection(db, "purchases"));
        const ordersSnap = await getDocs(collection(db, "orders"));
        const orders = ordersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sortedOrders = orders
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate
              ? a.createdAt.toDate()
              : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate
              ? b.createdAt.toDate()
              : new Date(b.createdAt);
            return dateB - dateA;
          })
          .slice(0, 5);

        if (!isMounted) return;

        setStats({
          totalProducts: products.length,
          totalPurchases: purchasesSnap.size,
          totalOrders: orders.length,
          lowStockItems: lowStock.length,
        });
        setRecentOrders(sortedOrders);
        setLowStockProducts(lowStock.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="badge badge-success">تمت الموافقة</span>;
      case "rejected":
        return <span className="badge badge-danger">مرفوض</span>;
      case "pending":
        return <span className="badge badge-pending">قيد الانتظار</span>;
      case "completed":
        return <span className="badge badge-info">مكتمل</span>;
      default:
        return <span className="badge badge-pending">قيد الانتظار</span>;
    }
  };

  const statCards = [
    {
      title: "إجمالي المنتجات",
      value: stats.totalProducts,
      icon: <HiOutlineCube size={24} />,
      iconWrapClass: "bg-indigo-500/15 text-indigo-400",
      glowClass:
        "bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,transparent_70%)]",
      delayClass: "[animation-delay:0ms]",
    },
    {
      title: "المشتريات",
      value: stats.totalPurchases,
      icon: <HiOutlineShoppingCart size={24} />,
      iconWrapClass: "bg-sky-500/15 text-sky-400",
      glowClass:
        "bg-[radial-gradient(circle,rgba(14,165,233,0.18)_0%,transparent_70%)]",
      delayClass: "[animation-delay:100ms]",
    },
    {
      title: "الطلبات",
      value: stats.totalOrders,
      icon: <HiOutlineClipboardList size={24} />,
      iconWrapClass: "bg-emerald-500/15 text-emerald-400",
      glowClass:
        "bg-[radial-gradient(circle,rgba(34,197,94,0.18)_0%,transparent_70%)]",
      delayClass: "[animation-delay:200ms]",
    },
    {
      title: "منخفض المخزون",
      value: stats.lowStockItems,
      icon: <HiOutlineExclamationCircle size={24} />,
      iconWrapClass: "bg-amber-500/15 text-amber-400",
      glowClass:
        "bg-[radial-gradient(circle,rgba(245,158,11,0.18)_0%,transparent_70%)]",
      delayClass: "[animation-delay:300ms]",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="page-stack animate-fade-in px-1 sm:px-2">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-white lg:text-3xl">
          مرحباً، {userData?.name || "مستخدم"} 👋
        </h1>
        <p className="text-slate-400">
          {isAdmin
            ? "لوحة التحكم - نظرة عامة على المخزون"
            : "مرحباً بك في نظام إدارة المخزون"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card animate-fade-in ${card.delayClass}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-sm text-slate-400">{card.title}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
              </div>
              <div className={`rounded-xl p-3 ${card.iconWrapClass}`}>
                {card.icon}
              </div>
            </div>
            <div
              className={`absolute right-0 top-0 h-24 w-24 rounded-full blur-2xl ${card.glowClass}`}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="glass-card px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 px-1 sm:px-2">
            <h2 className="text-lg font-bold text-white">آخر الطلبات</h2>
            {isAdmin && (
              <button
                onClick={() => navigate("/orders")}
                className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
              >
                عرض الكل ←
              </button>
            )}
          </div>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا توجد طلبات بعد</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {order.engineerName || "مهندس"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.items?.length || 0} منتج
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 px-1 sm:px-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <HiOutlineExclamationCircle className="text-amber-400" />
              تنبيه المخزون المنخفض
            </h2>
            <button
              onClick={() => navigate("/inventory")}
              className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
            >
              عرض المخزون ←
            </button>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center">
              <HiOutlineTrendingUp
                className="mx-auto mb-2 text-green-400"
                size={32}
              />
              <p className="text-slate-400">جميع المنتجات في مستوى مخزون جيد</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <HiOutlineTrendingDown className="text-red-400" size={18} />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product.category || "عام"}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-danger">
                    {product.quantity || 0} متبقي
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
