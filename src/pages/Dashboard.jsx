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
  HiOutlineCurrencyDollar,
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
    totalRevenue: 0,
    totalExpenses: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const productsSnap  = await getDocs(collection(db, "products"));
        const purchasesSnap = await getDocs(collection(db, "purchases"));
        const ordersSnap    = await getDocs(collection(db, "orders"));

        const products  = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const purchases = purchasesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const orders    = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const lowStock = products.filter((p) => (p.quantity || 0) <= (p.minStock || 5));

        // Financial calculations
        // إجمالي المصروفات = إجمالي سعر شراء المنتجات الموجودة بالمخزون (سعر الصين × الكمية)
        const totalExpenses = products.reduce(
          (sum, p) => sum + (p.purchasePrice || 0) * (p.quantity || 0), 0
        );

        // إجمالي الإيرادات = مجموع سعر البيع (المهندسين) للطلبات الموافق عليها
        const completedOrders = orders.filter((o) => o.status === "completed" || o.status === "approved");
        const totalRevenue = completedOrders.reduce((sum, order) => {
          const orderRevenue = (order.items || []).reduce((s, item) => {
            const product = products.find((p) => p.id === item.productId);
            const salePrice = item.salePrice ?? product?.salePrice ?? 0;
            return s + salePrice * item.quantity;
          }, 0);
          return sum + orderRevenue;
        }, 0);

        const sortedOrders = orders
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 5);

        if (!isMounted) return;

        setStats({
          totalProducts:  products.length,
          totalPurchases: purchases.length,
          totalOrders:    orders.length,
          lowStockItems:  lowStock.length,
          totalRevenue,
          totalExpenses,
        });
        setRecentOrders(sortedOrders);
        setLowStockProducts(lowStock.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadDashboardData();
    return () => { isMounted = false; };
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":  return <span className="badge badge-success">تمت الموافقة</span>;
      case "rejected":  return <span className="badge badge-danger">مرفوض</span>;
      case "pending":   return <span className="badge badge-pending">قيد الانتظار</span>;
      case "completed": return <span className="badge badge-info">مكتمل</span>;
      default:          return <span className="badge badge-pending">قيد الانتظار</span>;
    }
  };

  const netBalance = stats.totalRevenue - stats.totalExpenses;

  const statCards = [
    {
      title: "إجمالي المنتجات",
      value: stats.totalProducts,
      icon: <HiOutlineCube size={22} />,
      iconColor: "var(--gold-primary)",
      iconBg: "rgba(201,168,76,0.12)",
      glowColor: "rgba(201,168,76,0.1)",
    },
    {
      title: "المشتريات",
      value: stats.totalPurchases,
      icon: <HiOutlineShoppingCart size={22} />,
      iconColor: "#0284c7",
      iconBg: "rgba(14,165,233,0.12)",
      glowColor: "rgba(14,165,233,0.08)",
    },
    {
      title: "الطلبات",
      value: stats.totalOrders,
      icon: <HiOutlineClipboardList size={22} />,
      iconColor: "#16a34a",
      iconBg: "rgba(34,197,94,0.12)",
      glowColor: "rgba(34,197,94,0.08)",
    },
    {
      title: "منخفض المخزون",
      value: stats.lowStockItems,
      icon: <HiOutlineExclamationCircle size={22} />,
      iconColor: "#b45309",
      iconBg: "rgba(245,158,11,0.12)",
      glowColor: "rgba(245,158,11,0.08)",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        {isAdmin && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
        )}
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="page-stack animate-fade-in px-1 sm:px-2">
      <div className="page-header">
        <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 800 }}>
          مرحباً، {userData?.name || "مستخدم"} 👋
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {isAdmin ? "لوحة التحكم - نظرة عامة على المخزون" : "مرحباً بك في نظام إدارة المخزون"}
        </p>
      </div>

      {/* General Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <div key={index} className={`stat-card animate-fade-in`} style={{ animationDelay: `${index * 80}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>{card.title}</p>
                <p style={{ color: "var(--text-primary)", fontSize: 32, fontWeight: 800 }}>{card.value}</p>
              </div>
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: card.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: card.iconColor,
                flexShrink: 0,
              }}>
                {card.icon}
              </div>
            </div>
            <div style={{
              position: "absolute", top: 0, right: 0,
              width: 90, height: 90, borderRadius: "50%",
              background: `radial-gradient(circle, ${card.glowColor} 0%, transparent 70%)`,
            }} />
          </div>
        ))}
      </div>

      {/* ── Financial Summary (Admin only) ── */}
      {isAdmin && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 17 }}>الملخص المالي</h2>
            <button
              onClick={() => navigate("/purchases")}
              style={{ color: "var(--gold-primary)", fontSize: 13, background: "none", border: "none", cursor: "pointer", fontFamily: "Tajawal" }}
            >
              التفاصيل ←
            </button>
          </div>
          <div className="finance-summary">
            {/* Revenue */}
            <div className="finance-card stat-card-revenue">
              <div className="finance-card-accent" style={{ background: "var(--gold-primary)" }} />
              <div className="finance-card-label" style={{ paddingRight: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <HiOutlineTrendingUp size={15} style={{ color: "var(--gold-primary)" }} />
                إجمالي الإيرادات
              </div>
              <div className="finance-card-value" style={{ color: "var(--gold-primary)", paddingRight: 8 }}>
                {stats.totalRevenue.toLocaleString()}
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>ر.س</span>
              </div>
            </div>

            {/* Expenses */}
            <div className="finance-card stat-card-expense">
              <div className="finance-card-accent" style={{ background: "#ef4444" }} />
              <div className="finance-card-label" style={{ paddingRight: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <HiOutlineTrendingDown size={15} style={{ color: "#ef4444" }} />
                إجمالي المصروفات
              </div>
              <div className="finance-card-value" style={{ color: "#ef4444", paddingRight: 8 }}>
                {stats.totalExpenses.toLocaleString()}
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>ر.س</span>
              </div>
            </div>

            {/* Net Balance */}
            <div className={`finance-card ${netBalance >= 0 ? "stat-card-balance-positive" : "stat-card-balance-negative"}`}>
              <div className="finance-card-accent" style={{ background: netBalance >= 0 ? "#22c55e" : "#ef4444" }} />
              <div className="finance-card-label" style={{ paddingRight: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <HiOutlineCurrencyDollar size={15} style={{ color: netBalance >= 0 ? "#22c55e" : "#ef4444" }} />
                الرصيد النهائي
              </div>
              <div className="finance-card-value" style={{ color: netBalance >= 0 ? "#16a34a" : "#dc2626", paddingRight: 8 }}>
                {netBalance >= 0 ? "+" : ""}{netBalance.toLocaleString()}
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>ر.س</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders + Low Stock */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Orders */}
        <div className="glass-card px-5 py-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 17 }}>آخر الطلبات</h2>
            {isAdmin && (
              <button onClick={() => navigate("/orders")} style={{ color: "var(--gold-primary)", fontSize: 13, background: "none", border: "none", cursor: "pointer", fontFamily: "Tajawal" }}>
                عرض الكل ←
              </button>
            )}
          </div>
          {recentOrders.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "28px 0" }}>لا توجد طلبات بعد</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentOrders.map((order) => (
                <div key={order.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  background: "var(--bg-surface-2)", border: "1px solid var(--border-color)",
                  transition: "all .2s",
                }}>
                  <div>
                    <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>{order.engineerName || "مهندس"}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{order.items?.length || 0} منتج</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="glass-card px-5 py-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
              <HiOutlineExclamationCircle style={{ color: "#b45309" }} />
              تنبيه المخزون المنخفض
            </h2>
            <button onClick={() => navigate("/inventory")} style={{ color: "var(--gold-primary)", fontSize: 13, background: "none", border: "none", cursor: "pointer", fontFamily: "Tajawal" }}>
              عرض المخزون ←
            </button>
          </div>
          {lowStockProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <HiOutlineTrendingUp size={30} style={{ color: "#22c55e", margin: "0 auto 8px" }} />
              <p style={{ color: "var(--text-muted)" }}>جميع المنتجات في مستوى مخزون جيد</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lowStockProducts.map((product) => (
                <div key={product.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <HiOutlineTrendingDown style={{ color: "#ef4444" }} size={18} />
                    <div>
                      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>{product.name}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{product.category || "عام"}</p>
                    </div>
                  </div>
                  <span className="badge badge-danger">{product.quantity || 0} متبقي</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
