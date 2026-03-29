import { useEffect, useRef, useState } from "react";
import { collection, addDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineX,
} from "react-icons/hi";
import { db } from "../firebase";

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [formData, setFormData] = useState({
    engineerName: "",
    items: [],
    notes: "",
  });
  const receiptRef = useRef();

  async function fetchReceiptData() {
    const [receiptsSnap, ordersSnap] = await Promise.all([
      getDocs(collection(db, "receipts")),
      getDocs(collection(db, "orders")),
    ]);

    return {
      receipts: receiptsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const dateA = a.createdAt || "";
          const dateB = b.createdAt || "";
          return dateB.localeCompare(dateA);
        }),
      orders: ordersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((order) => order.status === "approved"),
    };
  }

  async function refreshData() {
    try {
      const data = await fetchReceiptData();
      setReceipts(data.receipts);
      setOrders(data.orders);
    } catch (error) {
      console.error("Error fetching data:", error);
    }

    setLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await fetchReceiptData();
        if (!isMounted) return;
        setReceipts(data.receipts);
        setOrders(data.orders);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    const order = orders.find((item) => item.id === orderId);

    if (order) {
      setFormData({
        engineerName: order.engineerName || "",
        items: order.items || [],
        notes: "",
      });
    }
  };

  const handleCreateReceipt = async (event) => {
    event.preventDefault();

    if (!selectedOrderId || formData.items.length === 0) {
      toast.error("يرجى اختيار طلب معتمد");
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

      await addDoc(collection(db, "receipts"), receiptData);
      await updateDoc(doc(db, "orders", selectedOrderId), {
        status: "completed",
      });

      toast.success("تم إنشاء الفاتورة بنجاح");
      setShowModal(false);
      setSelectedOrderId("");
      setFormData({ engineerName: "", items: [], notes: "" });
      await refreshData();
    } catch (error) {
      console.error("Error creating receipt:", error);
      toast.error("فشل إنشاء الفاتورة");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>Receipt</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Tajawal', sans-serif; direction: rtl; padding: 20px; }
            .receipt { max-width: 600px; margin: auto; }
            .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 16px; margin-bottom: 16px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { color: #666; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { padding: 10px; text-align: right; border-bottom: 1px solid #eee; }
            th { background: #f5f5f5; font-weight: 700; }
          </style>
        </head>
        <body>
          ${receiptRef.current?.innerHTML || ""}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";

    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
    <div className="page-stack animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-white">الفواتير</h1>
          <p className="text-sm text-slate-400">{receipts.length} فاتورة</p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn-primary justify-center">
          <HiOutlinePlus size={18} />
          إنشاء فاتورة
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineDocumentText className="mx-auto mb-4 text-slate-600" size={48} />
          <p className="text-lg text-slate-400">لا توجد فواتير</p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>المهندس</th>
                <th>عدد الاصناف</th>
                <th>التاريخ</th>
                <th>الاجراءات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="font-medium text-indigo-400">{receipt.receiptNumber}</td>
                  <td className="text-white">{receipt.engineerName}</td>
                  <td>{receipt.items?.length || 0} صنف</td>
                  <td className="text-slate-400">{formatDate(receipt.createdAt)}</td>
                  <td>
                    <button
                      onClick={() => setShowReceipt(receipt)}
                      className="rounded-lg p-2 text-indigo-400 transition-colors hover:bg-indigo-500/10"
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">إنشاء فاتورة</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 mt-1 block text-sm font-medium text-slate-300">
                  اختر طلب معتمد
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(event) => handleOrderSelect(event.target.value)}
                  className="input-field"
                >
                  <option value="">اختر طلب معتمد</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.engineerName} - {order.items?.length || 0} صنف
                    </option>
                  ))}
                </select>
              </div>

              {formData.items.length > 0 && (
                <div className="surface-panel surface-panel-muted p-4">
                  <label className="mb-3 block text-sm font-medium text-slate-300">
                    اصناف الفاتورة
                  </label>
                  <div className="flex flex-col gap-2">
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.04] p-3"
                      >
                        <span className="text-sm text-white">{item.productName}</span>
                        <span className="badge badge-info">الكمية: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                  className="input-field resize-none"
                  rows="3"
                  placeholder="ملاحظات اختيارية"
                />
              </div>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  إنشاء فاتورة
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary justify-center"
                >
                  الغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceipt(null)}>
          <div
            className="modal-content max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">فاتورة صرف</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="rounded-lg p-2 text-indigo-400 hover:bg-indigo-500/10"
                  title="طباعة"
                >
                  <HiOutlinePrinter size={20} />
                </button>
                <button
                  onClick={() => setShowReceipt(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
                >
                  <HiOutlineX size={20} />
                </button>
              </div>
            </div>

            <div ref={receiptRef} className="receipt mx-auto w-full max-w-2xl">
              <div className="receipt-header">
                <h1 className="text-[22px] font-bold">فاتورة صرف</h1>
                <p className="mt-1 text-[#666]">نظام إدارة المخزون</p>
                <p className="mt-2 text-sm text-[#999]">
                  رقم الفاتورة: {showReceipt.receiptNumber}
                </p>
                <p className="text-sm text-[#999]">
                  التاريخ: {formatDate(showReceipt.createdAt)}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-[#333]">
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
                  {showReceipt.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {showReceipt.notes && (
                <p className="mt-3 text-sm text-[#666]">
                  <strong>ملاحظات:</strong> {showReceipt.notes}
                </p>
              )}

              <div className="mt-6 border-t-2 border-dashed border-[#ccc] pt-4 text-center text-xs text-[#999]">
                <p>شكراً لكم</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
