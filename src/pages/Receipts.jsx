import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function Receipts() {
  const { isAdmin } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
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

  async function fetchData() {
    const [receiptsSnap, ordersSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, "receipts")),
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "products")),
    ]);

    return {
      receipts: receiptsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
      orders: ordersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => o.status === "approved"),
      products: productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }

  async function refreshData() {
    try {
      const data = await fetchData();
      setReceipts(data.receipts);
      setOrders(data.orders);
      setProducts(data.products);
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ في جلب البيانات");
    }
    setLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const data = await fetchData();
        if (!isMounted) return;
        setReceipts(data.receipts);
        setOrders(data.orders);
        setProducts(data.products);
      } catch (e) {
        console.error(e);
        toast.error("حدث خطأ في جلب البيانات");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const getSalePrice = (productId, fallbackPrice) => {
    const p = products.find((x) => x.id === productId);
    return p?.salePrice ?? fallbackPrice ?? 0;
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    const order = orders.find((item) => item.id === orderId);

    if (order) {
      const enrichedItems = (order.items || []).map((item) => ({
        ...item,
        salePrice: getSalePrice(item.productId, item.salePrice),
        purchasePrice:
          products.find((x) => x.id === item.productId)?.purchasePrice ??
          item.purchasePrice ??
          0,
      }));

      setFormData({
        engineerName: order.engineerName || "",
        items: enrichedItems,
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
      const itemsWithPrices = formData.items.map((item) => ({
        ...item,
        salePrice: item.salePrice || getSalePrice(item.productId, 0),
        lineTotal: (item.salePrice || 0) * item.quantity,
      }));

      const totalRevenue = itemsWithPrices.reduce(
        (s, i) => s + (i.salePrice || 0) * i.quantity,
        0
      );
      const totalCost = itemsWithPrices.reduce(
        (s, i) => s + (i.purchasePrice || 0) * i.quantity,
        0
      );

      const receiptData = {
        orderId: selectedOrderId,
        engineerName: formData.engineerName,
        items: itemsWithPrices,
        notes: formData.notes,
        totalRevenue,
        totalCost,
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
      console.error(error);
      toast.error("فشل إنشاء الفاتورة");
    }
  };

  const handleDeleteReceipt = async (receipt) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الفاتورة رقم "${receipt.receiptNumber}"؟`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "receipts", receipt.id));

      if (showReceipt?.id === receipt.id) {
        setShowReceipt(null);
      }

      toast.success("تم حذف الفاتورة بنجاح");
      await refreshData();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء حذف الفاتورة");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    const receipt = showReceipt;
    const grandTotal = (receipt.items || []).reduce(
      (s, i) => s + (i.salePrice || 0) * i.quantity,
      0
    );

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة ${receipt.receiptNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Tajawal',sans-serif; direction:rtl; background:#fff; color:#1a1208; }
            .receipt { max-width:640px; margin:30px auto; padding:32px; border:1px solid #e7c97a; border-radius:16px; }
            .header { text-align:center; border-bottom:2px dashed #d4a847; padding-bottom:20px; margin-bottom:20px; }
            .logo-icon { width:56px; height:56px; margin:0 auto 10px; background:linear-gradient(135deg,#C9A84C,#9d7d2e); border-radius:14px; display:flex; align-items:center; justify-content:center; }
            .header h1 { font-size:22px; font-weight:800; color:#1a1208; margin-top:8px; }
            .header p { color:#9d7d2e; margin-top:4px; font-size:13px; }
            .meta { display:flex; gap:16px; justify-content:center; margin-top:10px; font-size:12px; color:#7a5f1f; }
            .info-row { display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; }
            table { width:100%; border-collapse:collapse; margin:18px 0; }
            th, td { padding:10px 12px; text-align:right; border-bottom:1px solid #edd98a; font-size:13px; }
            th { background:#fdf3de; color:#C9A84C; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
            .total-row td { font-weight:800; font-size:16px; color:#C9A84C; border-top:2px solid #d4a847; border-bottom:none; padding-top:14px; }
            .footer { text-align:center; margin-top:24px; padding-top:16px; border-top:2px dashed #d4a847; font-size:12px; color:#9d7d2e; }
            .footer .brand { font-size:15px; font-weight:800; color:#C9A84C; margin-bottom:4px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="logo-icon">
                <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
                  <rect x="10" y="7" width="6" height="14" rx="0.8" fill="white"/>
                  <rect x="4" y="11" width="5" height="10" rx="0.8" fill="white" opacity="0.85"/>
                  <rect x="17" y="10" width="5" height="11" rx="0.8" fill="white" opacity="0.85"/>
                  <polygon points="13,2 9,7 17,7" fill="white"/>
                  <polygon points="6.5,8 3.5,11 9.5,11" fill="white" opacity="0.85"/>
                  <polygon points="19.5,7 16.5,10 22.5,10" fill="white" opacity="0.85"/>
                </svg>
              </div>
              <h1>سعود العقارية</h1>
              <p>فاتورة صرف مواد</p>
              <div class="meta">
                <span>رقم الفاتورة: ${receipt.receiptNumber}</span>
                <span>التاريخ: ${new Date(receipt.createdAt).toLocaleDateString("ar-SA", { year:"numeric", month:"long", day:"numeric" })}</span>
              </div>
            </div>
            <div class="info-row">
              <span style="color:#9d7d2e">اسم المهندس:</span>
              <strong>${receipt.engineerName}</strong>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>المنتج</th>
                  <th>سعر الوحدة</th>
                  <th>الكمية</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${(receipt.items || [])
                  .map(
                    (item, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${item.productName || item.name || "منتج"}</td>
                    <td>${(item.salePrice || 0).toLocaleString()} ر.س</td>
                    <td>${item.quantity}</td>
                    <td>${((item.salePrice || 0) * item.quantity).toLocaleString()} ر.س</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="4">الإجمالي الكلي</td>
                  <td>${grandTotal.toLocaleString()} ر.س</td>
                </tr>
              </tfoot>
            </table>
            ${receipt.notes ? `<p style="font-size:13px;color:#7a5f1f;margin-top:8px"><strong>ملاحظات:</strong> ${receipt.notes}</p>` : ""}
            <div class="footer">
              <div class="brand">سعود العقارية</div>
              <p>نبني ثقة ونحقق طموح</p>
            </div>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
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
          <h1
            style={{
              color: "var(--text-primary)",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            الفواتير
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {receipts.length} فاتورة
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn-primary justify-center">
          <HiOutlinePlus size={18} />
          إنشاء فاتورة
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineDocumentText
            size={48}
            style={{ color: "var(--text-muted)", margin: "0 auto 12px" }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
            لا توجد فواتير
          </p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>المهندس</th>
                <th>عدد الأصناف</th>
                <th>إجمالي الفاتورة</th>
                {isAdmin && <th>تكلفة المواد</th>}
                {isAdmin && <th>الربح</th>}
                <th>التاريخ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => {
                const revenue =
                  receipt.items?.reduce(
                    (s, i) => s + (i.salePrice || 0) * i.quantity,
                    0
                  ) || 0;
                const cost =
                  receipt.items?.reduce(
                    (s, i) => s + (i.purchasePrice || 0) * i.quantity,
                    0
                  ) || 0;
                const profit = revenue - cost;

                return (
                  <tr key={receipt.id}>
                    <td style={{ color: "var(--gold-primary)", fontWeight: 700 }}>
                      {receipt.receiptNumber}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {receipt.engineerName}
                    </td>
                    <td>{receipt.items?.length || 0} صنف</td>
                    <td style={{ color: "var(--gold-primary)", fontWeight: 700 }}>
                      {revenue.toLocaleString()} ر.س
                    </td>
                    {isAdmin && (
                      <td style={{ color: "var(--text-muted)" }}>
                        {cost.toLocaleString()} ر.س
                      </td>
                    )}
                    {isAdmin && (
                      <td>
                        <span
                          className={
                            profit >= 0
                              ? "badge badge-success"
                              : "badge badge-danger"
                          }
                        >
                          {profit >= 0 ? "+" : ""}
                          {profit.toLocaleString()} ر.س
                        </span>
                      </td>
                    )}
                    <td style={{ color: "var(--text-muted)" }}>
                      {formatDate(receipt.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowReceipt(receipt)}
                          style={{
                            padding: 7,
                            borderRadius: 9,
                            color: "var(--gold-primary)",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(201,168,76,0.1)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                          title="عرض"
                        >
                          <HiOutlineEye size={17} />
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteReceipt(receipt)}
                            style={{
                              padding: 7,
                              borderRadius: 9,
                              color: "#ef4444",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(239,68,68,0.08)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                            title="حذف"
                          >
                            <HiOutlineTrash size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 800,
                  fontSize: 20,
                }}
              >
                إنشاء فاتورة
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: 7,
                  borderRadius: 9,
                  border: "none",
                  background: "var(--bg-surface-2)",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="flex flex-col gap-4">
              <div>
                <label
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 7,
                  }}
                >
                  اختر طلب معتمد
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
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
                <div
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <label
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 10,
                    }}
                  >
                    أصناف الفاتورة
                  </label>

                  <div className="flex flex-col gap-2">
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              color: "var(--text-primary)",
                              fontWeight: 600,
                              fontSize: 14,
                            }}
                          >
                            {item.productName}
                          </span>
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: 12,
                              marginTop: 2,
                            }}
                          >
                            {item.salePrice?.toLocaleString()} ر.س × {item.quantity} =
                            <strong style={{ color: "var(--gold-primary)" }}>
                              {" "}
                              {(
                                (item.salePrice || 0) * item.quantity
                              ).toLocaleString()}{" "}
                              ر.س
                            </strong>
                          </div>
                        </div>
                        <span className="badge badge-gold">
                          الكمية: {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(201,168,76,0.1)",
                      border: "1px solid rgba(201,168,76,0.3)",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      الإجمالي الكلي
                    </span>
                    <span
                      style={{
                        color: "var(--gold-primary)",
                        fontWeight: 800,
                        fontSize: 16,
                      }}
                    >
                      {formData.items
                        .reduce(
                          (s, i) => s + (i.salePrice || 0) * i.quantity,
                          0
                        )
                        .toLocaleString()}{" "}
                      ر.س
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 7,
                  }}
                >
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="input-field resize-none"
                  rows="2"
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
                  إلغاء
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
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 800,
                  fontSize: 20,
                }}
              >
                فاتورة صرف
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    color: "var(--gold-primary)",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-surface-2)",
                    cursor: "pointer",
                  }}
                  title="طباعة"
                >
                  <HiOutlinePrinter size={19} />
                </button>
                <button
                  onClick={() => setShowReceipt(null)}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: "none",
                    background: "var(--bg-surface-2)",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                  }}
                >
                  <HiOutlineX size={20} />
                </button>
              </div>
            </div>

            <div ref={receiptRef} className="receipt mx-auto w-full">
              <div className="receipt-header">
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 13,
                    margin: "0 auto 10px",
                    background: "linear-gradient(135deg,#C9A84C,#9d7d2e)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <rect x="10" y="7" width="6" height="14" rx="0.8" fill="white" />
                    <rect x="4" y="11" width="5" height="10" rx="0.8" fill="white" opacity="0.85" />
                    <rect x="17" y="10" width="5" height="11" rx="0.8" fill="white" opacity="0.85" />
                    <polygon points="13,2 9,7 17,7" fill="white" />
                  </svg>
                </div>

                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--receipt-text)" }}>
                  سعود العقارية
                </h1>
                <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
                  فاتورة صرف مواد
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 16,
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  <span>رقم الفاتورة: {showReceipt.receiptNumber}</span>
                  <span>التاريخ: {formatDate(showReceipt.createdAt)}</span>
                </div>
              </div>

              <div
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  background: "var(--bg-surface-2)",
                  borderRadius: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    المهندس:
                  </span>
                  <strong style={{ color: "var(--receipt-text)" }}>
                    {showReceipt.engineerName}
                  </strong>
                </div>
              </div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المنتج</th>
                    <th>سعر الوحدة</th>
                    <th>الكمية</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {showReceipt.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: 600 }}>
                        {item.productName || item.name || "منتج"}
                      </td>
                      <td>{(item.salePrice || 0).toLocaleString()} ر.س</td>
                      <td>{item.quantity}</td>
                      <td style={{ fontWeight: 700, color: "var(--gold-primary)" }}>
                        {((item.salePrice || 0) * item.quantity).toLocaleString()} ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="receipt-total-row">
                    <td colSpan="4">الإجمالي الكلي</td>
                    <td>
                      {(showReceipt.items || [])
                        .reduce((s, i) => s + (i.salePrice || 0) * i.quantity, 0)
                        .toLocaleString()}{" "}
                      ر.س
                    </td>
                  </tr>
                </tfoot>
              </table>

              {showReceipt.notes && (
                <p style={{ marginTop: 14, fontSize: 12, color: "var(--text-muted)" }}>
                  <strong>ملاحظات:</strong> {showReceipt.notes}
                </p>
              )}

              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: "2px dashed var(--receipt-border)",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontWeight: 800,
                    color: "var(--gold-primary)",
                    fontSize: 14,
                  }}
                >
                  سعود العقارية
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  نبني ثقة ونحقق طموح
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
