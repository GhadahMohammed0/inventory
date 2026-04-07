import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlineShoppingCart,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineCurrencyDollar,
} from "react-icons/hi";

export default function Purchases() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const [ordersSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "products")),
    ]);

    return {
      orders: ordersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => o.status === "approved" || o.status === "completed")
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return dateB - dateA;
        }),
      products: productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const data = await fetchData();
        if (!isMounted) return;
        setOrders(data.orders);
        setProducts(data.products);
      } catch (error) {
        console.error(error);
        toast.error("حدث خطأ في جلب البيانات");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalExpenses = products.reduce((sum, product) => {
    const quantity = Number(product.quantity || 0);
    const purchasePrice = Number(product.purchasePrice || 0);
    return sum + quantity * purchasePrice;
  }, 0);

  const totalRevenue = orders.reduce((sum, order) => {
    const orderRevenue = (order.items || []).reduce((itemSum, item) => {
      const product = products.find((p) => p.id === item.productId);
      const salePrice = Number(item.salePrice ?? product?.salePrice ?? 0);
      const quantity = Number(item.quantity || 0);
      return itemSum + salePrice * quantity;
    }, 0);

    return sum + orderRevenue;
  }, 0);

  const netBalance = totalRevenue - totalExpenses;

  const getOrderTotal = (order) => {
    return (order.items || []).reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      const salePrice = Number(item.salePrice ?? product?.salePrice ?? 0);
      const quantity = Number(item.quantity || 0);
      return sum + salePrice * quantity;
    }, 0);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="page-stack animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="page-header">
          <h1 style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 800 }}>
            إدارة المشتريات
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {orders.length} طلب معتمد / مكتمل
          </p>
        </div>
      </div>

      <div className="finance-summary">
        <div className="finance-card stat-card-revenue">
          <div className="finance-card-accent" style={{ background: "var(--gold-primary)" }} />
          <div className="finance-card-label" style={{ paddingRight: 8 }}>
            <div className="flex items-center gap-2">
              <HiOutlineTrendingUp size={16} style={{ color: "var(--gold-primary)" }} />
              إجمالي الإيرادات
            </div>
          </div>
          <div className="finance-card-value" style={{ color: "var(--gold-primary)", paddingRight: 8 }}>
            {totalRevenue.toLocaleString()}
            <span style={{ fontSize: 14, fontWeight: 600, marginRight: 4 }}>ر.س</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", paddingRight: 8, marginTop: 4 }}>
            من الطلبات المعتمدة والمكتملة ({orders.length} طلب)
          </p>
        </div>

        <div className="finance-card stat-card-expense">
          <div className="finance-card-accent" style={{ background: "#ef4444" }} />
          <div className="finance-card-label" style={{ paddingRight: 8 }}>
            <div className="flex items-center gap-2">
              <HiOutlineTrendingDown size={16} style={{ color: "#ef4444" }} />
              إجمالي المصروفات
            </div>
          </div>
          <div className="finance-card-value" style={{ color: "#ef4444", paddingRight: 8 }}>
            {totalExpenses.toLocaleString()}
            <span style={{ fontSize: 14, fontWeight: 600, marginRight: 4 }}>ر.س</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", paddingRight: 8, marginTop: 4 }}>
            قيمة المخزون الحالية بسعر الشراء من الصين
          </p>
        </div>

        <div className={`finance-card ${netBalance >= 0 ? "stat-card-balance-positive" : "stat-card-balance-negative"}`}>
          <div className="finance-card-accent" style={{ background: netBalance >= 0 ? "#22c55e" : "#ef4444" }} />
          <div className="finance-card-label" style={{ paddingRight: 8 }}>
            <div className="flex items-center gap-2">
              <HiOutlineCurrencyDollar size={16} style={{ color: netBalance >= 0 ? "#22c55e" : "#ef4444" }} />
              الرصيد النهائي
            </div>
          </div>
          <div className="finance-card-value" style={{ color: netBalance >= 0 ? "#16a34a" : "#dc2626", paddingRight: 8 }}>
            {netBalance >= 0 ? "+" : ""}
            {netBalance.toLocaleString()}
            <span style={{ fontSize: 14, fontWeight: 600, marginRight: 4 }}>ر.س</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", paddingRight: 8, marginTop: 4 }}>
            {netBalance >= 0 ? "✅ الإيرادات - قيمة المخزون" : "⚠️ قيمة المخزون أعلى من الإيرادات"}
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineShoppingCart
            size={48}
            style={{ color: "var(--text-muted)", margin: "0 auto 12px" }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
            لا توجد طلبات معتمدة أو مكتملة
          </p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>المهندس / العميل</th>
                <th>عدد المنتجات</th>
                <th>إجمالي الطلب</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {order.engineerName || "عميل"}
                  </td>
                  <td>{order.items?.length || 0}</td>
                  <td style={{ fontWeight: 700, color: "var(--gold-primary)" }}>
                    {getOrderTotal(order).toLocaleString()} ر.س
                  </td>
                  <td>
                    <span className={order.status === "completed" ? "badge badge-info" : "badge badge-success"}>
                      {order.status === "completed" ? "مكتمل" : "تمت الموافقة"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
