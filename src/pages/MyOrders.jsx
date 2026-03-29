import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineClipboardList, HiOutlineEye, HiOutlineX } from 'react-icons/hi';

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchMyOrders();
  }, [user]);

  const fetchMyOrders = async () => {
    if (!user) return;
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const myOrders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => o.engineerId === user.uid)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      setOrders(myOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="badge badge-success">تمت الموافقة ✓</span>;
      case 'rejected':
        return <span className="badge badge-danger">مرفوض ✗</span>;
      case 'completed':
        return <span className="badge badge-info">مكتمل</span>;
      default:
        return <span className="badge badge-pending">قيد الانتظار ⏳</span>;
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-12 w-64 rounded-xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">طلباتي</h1>
        <p className="text-slate-400 text-sm">{orders.length} طلب</p>
      </div>

      {orders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineClipboardList className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 text-lg">لا توجد طلبات بعد</p>
          <p className="text-slate-500 text-sm">اذهب إلى الأقسام لطلب المنتجات</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass-card p-5 cursor-pointer"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <HiOutlineClipboardList size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      طلب #{order.id?.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>{order.items?.length || 0} منتج</span>
                {order.note && <span>• {order.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                طلب #{selectedOrder.id?.slice(-6).toUpperCase()}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">الحالة:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">التاريخ:</span>
                <span className="text-white">{formatDate(selectedOrder.createdAt)}</span>
              </div>
              {selectedOrder.note && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">ملاحظات:</span>
                  <span className="text-white">{selectedOrder.note}</span>
                </div>
              )}

              <div className="border-t border-white/5 pt-4 mt-2">
                <h3 className="text-sm font-bold text-slate-300 mb-3">المنتجات المطلوبة</h3>
                <div className="flex flex-col gap-2">
                  {selectedOrder.items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]"
                    >
                      <span className="text-white text-sm">
                        {item.productName || item.name}
                      </span>
                      <span className="badge badge-info">الكمية: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.status === 'approved' && (
                <div className="mt-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-green-400 text-sm text-center">
                    ✓ تمت الموافقة على طلبك
                  </p>
                </div>
              )}

              {selectedOrder.status === 'rejected' && (
                <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm text-center">
                    ✗ تم رفض طلبك
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
