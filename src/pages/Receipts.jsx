import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlinePrinter,
  HiOutlineEye,
} from 'react-icons/hi';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [formData, setFormData] = useState({
    engineerName: '',
    items: [],
    notes: '',
  });
  const receiptRef = useRef();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [receiptsSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, 'receipts')),
        getDocs(collection(db, 'orders')),
      ]);
      setReceipts(
        receiptsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const dateA = a.createdAt || '';
            const dateB = b.createdAt || '';
            return dateB.localeCompare(dateA);
          })
      );
      setOrders(
        ordersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) => o.status === 'approved')
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setFormData({
        engineerName: order.engineerName || '',
        items: order.items || [],
        notes: '',
      });
    }
  };

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (!selectedOrderId || formData.items.length === 0) {
      toast.error('يرجى اختيار طلب');
      return;
    }

    try {
      const receiptData = {
        orderId: selectedOrderId,
        engineerName: formData.engineerName,
        items: formData.items,
        notes: formData.notes,
        receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'receipts'), receiptData);

      // Update order status to completed
      await updateDoc(doc(db, 'orders', selectedOrderId), {
        status: 'completed',
      });

      toast.success('تم إنشاء الفاتورة بنجاح');
      setShowModal(false);
      setSelectedOrderId('');
      setFormData({ engineerName: '', items: [], notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast.error('حدث خطأ في إنشاء الفاتورة');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Tajawal', sans-serif; direction: rtl; padding: 20px; }
            .receipt { max-width: 600px; margin: auto; }
            .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 16px; margin-bottom: 16px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { color: #666; margin: 4px 0; }
            .info { margin-bottom: 16px; }
            .info p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { padding: 10px; text-align: right; border-bottom: 1px solid #eee; }
            th { background: #f5f5f5; font-weight: 700; }
            .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 2px dashed #ccc; color: #666; }
          </style>
        </head>
        <body>
          ${receiptRef.current?.innerHTML || ''}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
          <h1 className="text-2xl font-bold text-white">الفواتير</h1>
          <p className="text-slate-400 text-sm">{receipts.length} فاتورة</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <HiOutlinePlus size={18} />
          إنشاء فاتورة
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineDocumentText className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 text-lg">لا توجد فواتير</p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>المهندس</th>
                <th>المنتجات</th>
                <th>التاريخ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="font-medium text-indigo-400">
                    {receipt.receiptNumber}
                  </td>
                  <td className="text-white">{receipt.engineerName}</td>
                  <td>{receipt.items?.length || 0} منتج</td>
                  <td className="text-slate-400">{formatDate(receipt.createdAt)}</td>
                  <td>
                    <button
                      onClick={() => setShowReceipt(receipt)}
                      className="p-2 rounded-lg hover:bg-indigo-500/10 text-indigo-400 transition-colors"
                      title="عرض"
                    >
                      <HiOutlineEye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Receipt Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">إنشاء فاتورة</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  اختر الطلب (الموافق عليه)
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className="input-field"
                >
                  <option value="">اختر طلب</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.engineerName} - {order.items?.length || 0} منتج
                    </option>
                  ))}
                </select>
              </div>

              {formData.items.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    المنتجات
                  </label>
                  <div className="flex flex-col gap-2">
                    {formData.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]"
                      >
                        <span className="text-white text-sm">{item.productName}</span>
                        <span className="badge badge-info">الكمية: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field resize-none"
                  rows="2"
                  placeholder="ملاحظات اختيارية"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  إنشاء الفاتورة
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {showReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceipt(null)}>
          <div
            className="modal-content max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">فاتورة</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-lg hover:bg-indigo-500/10 text-indigo-400"
                  title="طباعة"
                >
                  <HiOutlinePrinter size={20} />
                </button>
                <button
                  onClick={() => setShowReceipt(null)}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
                >
                  <HiOutlineX size={20} />
                </button>
              </div>
            </div>

            <div ref={receiptRef} className="receipt">
              <div className="receipt-header">
                <h1 style={{ fontSize: '22px', fontWeight: '700' }}>فاتورة صرف مواد</h1>
                <p style={{ color: '#666', marginTop: '4px' }}>نظام إدارة المخزون</p>
                <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                  رقم الفاتورة: {showReceipt.receiptNumber}
                </p>
                <p style={{ fontSize: '14px', color: '#999' }}>
                  التاريخ: {formatDate(showReceipt.createdAt)}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#333' }}>
                  <strong>المهندس:</strong> {showReceipt.engineerName}
                </p>
              </div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المنتج</th>
                    <th>الكمية</th>
                  </tr>
                </thead>
                <tbody>
                  {showReceipt.items?.map((item, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {showReceipt.notes && (
                <p style={{ color: '#666', marginTop: '12px', fontSize: '14px' }}>
                  <strong>ملاحظات:</strong> {showReceipt.notes}
                </p>
              )}

              <div
                style={{
                  textAlign: 'center',
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '2px dashed #ccc',
                  color: '#999',
                  fontSize: '12px',
                }}
              >
                <p>شكراً لكم</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
