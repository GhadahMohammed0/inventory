import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineClipboardList,
  HiOutlineEye,
} from 'react-icons/hi';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ في جلب الطلبات');
    }
    setLoading(false);
  };

  const handleApprove = async (order) => {
    try {
      // Update order status
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'approved',
        updatedAt: new Date().toISOString(),
      });

      // Decrease inventory for each item
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.productId) {
            await updateDoc(doc(db, 'products', item.productId), {
              quantity: increment(-item.quantity),
            });
          }
        }
      }

      toast.success('تمت الموافقة على الطلب');
      fetchOrders();
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('حدث خطأ في الموافقة على الطلب');
    }
  };

  const handleReject = async (order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      });
      toast.success('تم رفض الطلب');
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('حدث خطأ في رفض الطلب');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="badge badge-success">تمت الموافقة</span>;
      case 'rejected':
        return <span className="badge badge-danger">مرفوض</span>;
      case 'completed':
        return <span className="badge badge-info">مكتمل</span>;
      default:
        return <span className="badge badge-pending">قيد الانتظار</span>;
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredOrders = orders.filter(
    (o) => filterStatus === 'all' || o.status === filterStatus
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الطلبات</h1>
          <p className="text-slate-400 text-sm">{orders.length} طلب</p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field w-48"
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="approved">تمت الموافقة</option>
          <option value="rejected">مرفوض</option>
          <option value="completed">مكتمل</option>
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineClipboardList className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 text-lg">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>المهندس</th>
                <th>المنتجات</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>ملاحظات</th>
                {isAdmin && <th>الإجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="font-medium text-white">
                    {order.engineerName || 'مهندس'}
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <HiOutlineEye size={14} />
                      {order.items?.length || 0} منتج
                    </button>
                  </td>
                  <td className="text-slate-400">{formatDate(order.createdAt)}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td className="text-slate-400 max-w-[150px] truncate">
                    {order.note || '-'}
                  </td>
                  {isAdmin && (
                    <td>
                      {(!order.status || order.status === 'pending') && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(order)}
                            className="p-2 rounded-lg hover:bg-green-500/10 text-green-400 transition-colors"
                            title="موافقة"
                          >
                            <HiOutlineCheck size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(order)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                            title="رفض"
                          >
                            <HiOutlineX size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">تفاصيل الطلب</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">المهندس:</span>
                <span className="text-white">{selectedOrder.engineerName}</span>
              </div>
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
                        {item.productName || item.name || 'منتج'}
                      </span>
                      <span className="badge badge-info">
                        الكمية: {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
