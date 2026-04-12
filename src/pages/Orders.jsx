import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  writeBatch,
  addDoc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineClipboardList,
  HiOutlineEye,
  HiOutlineTrash,
} from 'react-icons/hi';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const normalizeOrderItems = (order) => {
    const rawItems = Array.isArray(order?.items)
      ? order.items
      : Array.isArray(order?.products)
      ? order.products
      : Array.isArray(order?.cartItems)
      ? order.cartItems
      : [];

    return rawItems.map((item, index) => ({
      id: item.id || item.productId || `item-${index}`,
      productId: item.productId || item.id || '',
      productName: item.productName || item.name || item.title || 'منتج',
      name: item.name || item.productName || item.title || 'منتج',
      quantity: Number(item.quantity || item.qty || 0),
      salePrice: Number(item.salePrice || item.price || 0),
      purchasePrice: Number(item.purchasePrice || item.costPrice || 0),
      imageUrl: item.imageUrl || item.image || '',
      image: item.image || item.imageUrl || '',
    }));
  };

  const fetchOrders = async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const data = snap.docs
        .map((d) => {
          const orderData = d.data();
          return {
            id: d.id,
            ...orderData,
            items: normalizeOrderItems(orderData),
          };
        })
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

  const restoreOrderStock = async (order) => {
    const items = normalizeOrderItems(order);
    if (!items.length) return;

    for (const item of items) {
      if (item.productId) {
        await updateDoc(doc(db, 'products', item.productId), {
          quantity: increment(Number(item.quantity || 0)),
        });
      }
    }
  };

  const deductOrderStock = async (order) => {
    const items = normalizeOrderItems(order);
    if (!items.length) return;

    for (const item of items) {
      if (item.productId) {
        await updateDoc(doc(db, 'products', item.productId), {
          quantity: increment(-Number(item.quantity || 0)),
        });
      }
    }
  };

  const deleteRelatedReceipts = async (orderId) => {
    const receiptsSnap = await getDocs(collection(db, 'receipts'));
    const relatedReceipts = receiptsSnap.docs.filter(
      (receiptDoc) => receiptDoc.data()?.orderId === orderId
    );

    for (const receiptDoc of relatedReceipts) {
      await deleteDoc(doc(db, 'receipts', receiptDoc.id));
    }
  };

  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getTime()).slice(-5);
    return `REC-${year}${month}${day}-${time}`;
  };

  const createReceiptForOrder = async (order) => {
    const normalizedItems = normalizeOrderItems(order);

    if (!normalizedItems.length) {
      throw new Error('لا توجد منتجات داخل الطلب');
    }

    const receiptsSnap = await getDocs(collection(db, 'receipts'));
    const existingReceipt = receiptsSnap.docs.find(
      (receiptDoc) => receiptDoc.data()?.orderId === order.id
    );

    if (existingReceipt) {
      return existingReceipt.id;
    }

    const receiptData = {
      orderId: order.id,
      engineerId: order.engineerId || order.userId || '',
      engineerName: order.engineerName || 'مهندس',
      receiptNumber: generateReceiptNumber(),
      items: normalizedItems.map((item) => ({
        productId: item.productId || '',
        productName: item.productName || item.name || 'منتج',
        name: item.name || item.productName || 'منتج',
        quantity: Number(item.quantity || 0),
        salePrice: Number(item.salePrice || 0),
        purchasePrice: Number(item.purchasePrice || 0),
        imageUrl: item.imageUrl || '',
        image: item.image || item.imageUrl || '',
      })),
      notes: order.note || '',
      createdAt: new Date().toISOString(),
    };

    const newReceiptRef = await addDoc(collection(db, 'receipts'), receiptData);
    return newReceiptRef.id;
  };

  const handleApprove = async (order) => {
    try {
      if (order.status === 'approved' || order.status === 'completed') {
        toast('الطلب معتمد بالفعل');
        return;
      }

      const normalizedItems = normalizeOrderItems(order);

      if (!normalizedItems.length) {
        toast.error('هذا الطلب لا يحتوي على منتجات');
        return;
      }

      await deductOrderStock({ ...order, items: normalizedItems });

      const receiptId = await createReceiptForOrder({
        ...order,
        items: normalizedItems,
      });

      await updateDoc(doc(db, 'orders', order.id), {
        status: 'approved',
        updatedAt: new Date().toISOString(),
        items: normalizedItems,
        receiptId,
      });

      toast.success('تمت الموافقة على الطلب وإضافته للفواتير');
      fetchOrders();
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('حدث خطأ في الموافقة على الطلب');
    }
  };

  const handleReject = async (order) => {
    try {
      if (order.status === 'approved' || order.status === 'completed') {
        await restoreOrderStock(order);
        await deleteRelatedReceipts(order.id);
      }

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

  const handleDeleteOrder = async (order) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف طلب "${order.engineerName || 'مهندس'}"؟`
    );
    if (!confirmed) return;

    try {
      if (order.status === 'approved' || order.status === 'completed') {
        await restoreOrderStock(order);
      }

      await deleteRelatedReceipts(order.id);
      await deleteDoc(doc(db, 'orders', order.id));

      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }

      toast.success('تم حذف الطلب بنجاح');
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('حدث خطأ أثناء حذف الطلب');
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const receiptsSnap = await getDocs(collection(db, 'receipts'));

      const ordersData = ordersSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ref: d.ref,
          ...data,
          items: normalizeOrderItems(data),
        };
      });

      for (const order of ordersData) {
        if (order.status === 'approved' || order.status === 'completed') {
          await restoreOrderStock(order);
        }
      }

      const batch = writeBatch(db);

      ordersData.forEach((order) => batch.delete(order.ref));
      receiptsSnap.docs.forEach((receiptDoc) => batch.delete(receiptDoc.ref));

      await batch.commit();

      setOrders([]);
      setShowDeleteConfirm(false);
      toast.success('تم حذف جميع الطلبات بنجاح');
    } catch (error) {
      console.error('Error deleting all orders:', error);
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setDeleting(false);
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
    <div className="page-stack animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">إدارة الطلبات</h1>
          <p className="text-slate-400 text-sm">{orders.length} طلب</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field flex-1 sm:w-56"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="approved">تمت الموافقة</option>
            <option value="rejected">مرفوض</option>
            <option value="completed">مكتمل</option>
          </select>

          {isAdmin && orders.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'Tajawal',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'all .2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(239,68,68,0.22)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')
              }
            >
              <HiOutlineTrash size={16} />
              حذف الكل
            </button>
          )}
        </div>
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
                  <td className="font-medium text-[var(--text-primary)]">
                    {order.engineerName || 'مهندس'}
                  </td>

                  <td>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <HiOutlineEye size={14} />
                      {normalizeOrderItems(order).length || 0} منتج
                    </button>
                  </td>

                  <td className="text-slate-400">{formatDate(order.createdAt)}</td>
                  <td>{getStatusBadge(order.status)}</td>

                  <td className="text-slate-400 max-w-[150px] truncate">
                    {order.note || '-'}
                  </td>

                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-2">
                        {(!order.status || order.status === 'pending') && (
                          <>
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
                          </>
                        )}

                        {(order.status === 'approved' || order.status === 'completed') && (
                          <button
                            onClick={() => handleReject(order)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                            title="إلغاء الموافقة / رفض"
                          >
                            <HiOutlineX size={16} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteOrder(order)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                          title="حذف الطلب"
                        >
                          <HiOutlineTrash size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <HiOutlineTrash size={28} style={{ color: '#f87171' }} />
              </div>

              <h2
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 800,
                  fontSize: 20,
                  marginBottom: 8,
                }}
              >
                حذف جميع الطلبات
              </h2>

              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginBottom: 24,
                }}
              >
                هل أنت متأكد من حذف <strong style={{ color: '#f87171' }}>جميع الطلبات ({orders.length})</strong>؟
                <br />
                سيتم حذف الطلبات والفواتير المرتبطة بها وإرجاع المخزون.
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 12,
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'Tajawal',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  إلغاء
                </button>

                <button
                  onClick={handleDeleteAll}
                  disabled={deleting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 12,
                    background: deleting
                      ? 'rgba(239,68,68,0.4)'
                      : 'rgba(239,68,68,0.85)',
                    border: 'none',
                    color: '#fff',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontFamily: 'Tajawal',
                    fontWeight: 700,
                    fontSize: 14,
                    transition: 'all .2s',
                  }}
                >
                  {deleting ? 'جاري الحذف...' : 'نعم، احذف الكل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">تفاصيل الطلب</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">المهندس:</span>
                <span className="text-[var(--text-primary)]">{selectedOrder.engineerName}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">الحالة:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">التاريخ:</span>
                <span className="text-[var(--text-primary)]">{formatDate(selectedOrder.createdAt)}</span>
              </div>

              {selectedOrder.note && (
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-slate-400">ملاحظات:</span>
                  <span className="text-[var(--text-primary)] text-left">{selectedOrder.note}</span>
                </div>
              )}

              <div className="border-t border-black/5 dark:border-white/5 pt-4 mt-2">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-3">المنتجات المطلوبة</h3>
                <div className="flex flex-col gap-2">
                  {normalizeOrderItems(selectedOrder).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.03]"
                    >
                      <span className="text-[var(--text-primary)] text-sm">
                        {item.productName || item.name || 'منتج'}
                      </span>
                      <span className="badge badge-info">
                        الكمية: {item.quantity}
                      </span>
                    </div>
                  ))}

                  {normalizeOrderItems(selectedOrder).length === 0 && (
                    <div className="p-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.03] text-slate-400 text-sm text-center">
                      لا توجد منتجات داخل هذا الطلب
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

