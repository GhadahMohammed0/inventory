import { useEffect, useState } from "react";
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

  const getProductImage = (productId, fallbackImage = "") => {
    const p = products.find((x) => x.id === productId);
    return p?.image || fallbackImage || "";
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    const order = orders.find((item) => item.id === orderId);

    if (order) {
      const enrichedItems = (order.items || []).map((item) => ({
        ...item,
        salePrice: getSalePrice(item.productId, item.salePrice),
        image: getProductImage(item.productId, item.image),
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
        image: item.image || getProductImage(item.productId, ""),
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

      if (receipt.orderId) {
        await updateDoc(doc(db, "orders", receipt.orderId), {
          status: "approved",
        });
      }

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

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const buildReceiptHtml = (receipt) => {
    const grandTotal = (receipt.items || []).reduce(
      (s, i) => s + (i.salePrice || 0) * i.quantity,
      0
    );

    return `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>فاتورة ${receipt.receiptNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              background: #fff;
              color: #222;
              padding: 24px;
            }
            .receipt {
              max-width: 820px;
              margin: 0 auto;
              border: 1px solid #ddd;
              border-radius: 16px;
              padding: 24px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #eee;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .company {
              font-size: 26px;
              font-weight: 800;
              margin-bottom: 8px;
            }
            .meta {
              display: flex;
              justify-content: center;
              gap: 18px;
              font-size: 13px;
              color: #666;
              flex-wrap: wrap;
            }
            .customer-box {
              background: #f8f8f8;
              border-radius: 10px;
              padding: 12px 14px;
              margin-bottom: 18px;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 14px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: right;
              vertical-align: middle;
              font-size: 13px;
            }
            th {
              background: #f5f5f5;
            }
            .img-box {
              width: 52px;
              height: 52px;
              border-radius: 10px;
              object-fit: cover;
              border: 1px solid #ddd;
            }
            .total-box {
              margin-top: 18px;
              text-align: left;
              font-size: 18px;
              font-weight: 800;
            }
            .notes {
              margin-top: 18px;
              font-size: 13px;
              color: #555;
            }
            .footer {
              margin-top: 28px;
              padding-top: 14px;
              border-top: 1px dashed #bbb;
              text-align: center;
              font-size: 13px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="company">شركة سعود العقارية</div>
              <div class="meta">
                <span>رقم الفاتورة: ${receipt.receiptNumber}</span>
                <span>التاريخ: ${formatDate(receipt.createdAt)}</span>
              </div>
            </div>

            <div class="customer-box">
              <strong>اسم صاحب الطلب:</strong> ${receipt.engineerName || "-"}
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الصورة</th>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${(receipt.items || [])
                  .map(
                    (item, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>
                        ${
                          item.image
                            ? `<img src="${item.image}" alt="${item.productName || "منتج"}" class="img-box" />`
                            : `-`
                        }
                      </td>
                      <td>${item.productName || item.name || "منتج"}</td>
                      <td>${item.quantity}</td>
                      <td>${(item.salePrice || 0).toLocaleString()} ر.س</td>
                      <td>${((item.salePrice || 0) * item.quantity).toLocaleString()} ر.س</td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="total-box">
              المبلغ الإجمالي: ${grandTotal.toLocaleString()} ر.س
            </div>

            ${
              receipt.notes
                ? `<div class="notes"><strong>ملاحظات:</strong> ${receipt.notes}</div>`
                : ""
            }

            <div class="footer">
              شركة سعود العقارية
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (!showReceipt) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    printWindow.document.write(buildReceiptHtml(showReceipt));
    printWindow.document.write(`
      <script>
        window.onload = function () {
          window.print();
          window.close();
        };
      </script>
    `);
    printWindow.document.close();
  };

  const handlePrintAllReceipts = () => {
    if (!receipts.length) {
      toast.error("لا توجد فواتير للطباعة");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    const allReceiptsHtml = receipts
      .map(
        (receipt, index) => `
          <div style="${index > 0 ? "page-break-before: always;" : ""}">
            ${buildReceiptHtml(receipt)}
          </div>
        `
      )
      .join("");

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>طباعة جميع الفواتير</title>
          <style>
            body { margin: 0; padding: 0; }
            @media print {
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${allReceiptsHtml}
          <script>
            window.onload = function () {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handlePrintAllReceipts}
            className="btn-secondary justify-center"
            type="button"
          >
            <HiOutlinePrinter size={18} />
            طباعة كل الفواتير
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary justify-center"
          >
            <HiOutlinePlus size={18} />
            إنشاء فاتورة
          </button>
        </div>
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
                          title="عرض"
                        >
                          <HiOutlineEye size={17} />
                        </button>

                        <button
                          onClick={() => {
                            setShowReceipt(receipt);
                            setTimeout(() => handlePrint(), 100);
                          }}
                          style={{
                            padding: 7,
                            borderRadius: 9,
                            color: "#2563eb",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                          title="طباعة الفاتورة"
                        >
                          <HiOutlinePrinter size={17} />
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
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.productName}
                              style={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 10,
                                border: "1px solid var(--border-color)",
                              }}
                            />
                          ) : null}
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
                        </div>

                        <span className="badge badge-gold">
                          الكمية: {item.quantity}
                        </span>
                      </div>
                    ))}
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
            className="modal-content"
            style={{ maxWidth: 760 }}
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
                فاتورة
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
                  title="طباعة الفاتورة"
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

            <div
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: 16,
                padding: 20,
                background: "var(--bg-card)",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <h1 style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 800 }}>
                  شركة سعود العقارية
                </h1>
                <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
                  فاتورة صرف مواد
                </p>
                <div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 13 }}>
                  <span>رقم الفاتورة: {showReceipt.receiptNumber}</span>
                  <span style={{ marginRight: 14 }}>
                    التاريخ: {formatDate(showReceipt.createdAt)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-surface-2)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              >
                <strong style={{ color: "var(--text-primary)" }}>
                  اسم صاحب الطلب:
                </strong>
                <span style={{ color: "var(--text-primary)", marginRight: 8 }}>
                  {showReceipt.engineerName}
                </span>
              </div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الصورة</th>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {showReceipt.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName || "منتج"}
                            style={{
                              width: 48,
                              height: 48,
                              objectFit: "cover",
                              borderRadius: 10,
                              border: "1px solid var(--border-color)",
                            }}
                          />
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>-</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {item.productName || item.name || "منتج"}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{(item.salePrice || 0).toLocaleString()} ر.س</td>
                      <td style={{ fontWeight: 700, color: "var(--gold-primary)" }}>
                        {((item.salePrice || 0) * item.quantity).toLocaleString()} ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(201,168,76,0.08)",
                  border: "1px solid rgba(201,168,76,0.25)",
                }}
              >
                <strong style={{ color: "var(--text-primary)" }}>
                  المبلغ الإجمالي
                </strong>
                <strong style={{ color: "var(--gold-primary)", fontSize: 18 }}>
                  {(showReceipt.items || [])
                    .reduce((s, i) => s + (i.salePrice || 0) * i.quantity, 0)
                    .toLocaleString()}{" "}
                  ر.س
                </strong>
              </div>

              {showReceipt.notes ? (
                <p style={{ marginTop: 14, fontSize: 12, color: "var(--text-muted)" }}>
                  <strong>ملاحظات:</strong> {showReceipt.notes}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
