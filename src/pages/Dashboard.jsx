import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import {
  HiOutlineCube,
  HiOutlineShoppingCart,
  HiOutlineClipboardList,
  HiOutlineExclamationCircle,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
} from 'react-icons/hi';
import { HiOutlineArchiveBox } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';

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
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products
      const productsSnap = await getDocs(collection(db, 'products'));
      const products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const lowStock = products.filter((p) => (p.quantity || 0) <= (p.minStock || 5));

      // Fetch purchases
      const purchasesSnap = await getDocs(collection(db, 'purchases'));

      // Fetch orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const orders = ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Recent orders (last 5)
      const sortedOrders = orders
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 5);

      setStats({
        totalProducts: products.length,
        totalPurchases: purchasesSnap.size,
        totalOrders: orders.length,
        lowStockItems: lowStock.length,
      });
      setRecentOrders(sortedOrders);
      setLowStockProducts(lowStock.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="badge badge-success">تمت الموافقة</span>;
      case 'rejected':
        return <span className="badge badge-danger">مرفوض</span>;
      case 'pending':
        return <span className="badge badge-pending">قيد الانتظار</span>;
      case 'completed':
        return <span className="badge badge-info">مكتمل</span>;
      default:
        return <span className="badge badge-pending">قيد الانتظار</span>;
    }
  };

  const statCards = [
    {
      title: 'إجمالي المنتجات',
      value: stats.totalProducts,
      icon: <HiOutlineCube size={24} />,
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.15)',
    },
    {
      title: 'المشتريات',
      value: stats.totalPurchases,
      icon: <HiOutlineShoppingCart size={24} />,
      color: '#0ea5e9',
      bgColor: 'rgba(14, 165, 233, 0.15)',
    },
    {
      title: 'الطلبات',
      value: stats.totalOrders,
      icon: <HiOutlineClipboardList size={24} />,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.15)',
    },
    {
      title: 'منخفض المخزون',
      value: stats.lowStockItems,
      icon: <HiOutlineExclamationCircle size={24} />,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
          مرحباً، {userData?.name || 'مستخدم'} 👋
        </h1>
        <p className="text-slate-400">
          {isAdmin ? 'لوحة التحكم - نظرة عامة على المخزون' : 'مرحباً بك في نظام إدارة المخزون'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="stat-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ background: card.bgColor, color: card.color }}
              >
                {card.icon}
              </div>
            </div>
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full"
              style={{
                background: `radial-gradient(circle, ${card.bgColor} 0%, transparent 70%)`,
                filter: 'blur(20px)',
              }}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">آخر الطلبات</h2>
            {isAdmin && (
              <button
                onClick={() => navigate('/orders')}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                عرض الكل ←
              </button>
            )}
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-slate-500 text-center py-8">لا توجد طلبات بعد</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {order.engineerName || 'مهندس'}
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

        {/* Low Stock Alert */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HiOutlineExclamationCircle className="text-amber-400" />
              تنبيه المخزون المنخفض
            </h2>
            <button
              onClick={() => navigate('/inventory')}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              عرض المخزون ←
            </button>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8">
              <HiOutlineTrendingUp className="mx-auto text-green-400 mb-2" size={32} />
              <p className="text-slate-400">جميع المنتجات في مستوى مخزون جيد</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <HiOutlineTrendingDown className="text-red-400" size={18} />
                    <div>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.category || 'عام'}</p>
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
