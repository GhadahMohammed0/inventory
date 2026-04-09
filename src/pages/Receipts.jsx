import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePrinter,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function Receipts() {
  const { isAdmin } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(null);

  async function fetchData() {
    const receiptsSnap = await getDocs(collection(db, "receipts"));

    return {
      receipts: receiptsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    };
  }

  async function refreshData() {
    try {
      const data = await fetchData();
      setReceipts(data.receipts);
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

  const buildReceiptCardHtml = (receipt) => {
    const grandTotal = (receipt.items || []).reduce(
      (s, i) => s + (i.salePrice || 0) * i.quantity,
      0
    );

    return `
      <div class="receipt-card">
        <div class="receipt-header">
          <div class="company-title">شركة سعود العقارية</div>
          <div class="receipt-subtitle">فاتورة صرف مواد</div>
          <div class="receipt-meta">
            <span>رقم الفاتورة: ${receipt.receiptNumber || "-"}</span>
            <span>التاريخ: ${formatDate(receipt.createdAt)}</span>
          </div>
        </div>

        <div class="customer-box">
          <div><strong>اسم صاحب الطلب:</strong> ${receipt.engineerName || "-"}</div>
        </div>

        <table class="receipt-table-print">
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
                        ? `<img src="${item.image}" alt="${item.productName || "منتج"}" class="product-image-print" />`
                        : `<span class="no-image">لا توجد صورة</span>`
                    }
                  </td>
                  <td>${item.productName || item.name || "منتج"}</td>
                  <td>${item.quantity || 0}</td>
                  <td>${Number(item.salePrice || 0).toLocaleString()} ر.س</td>
                  <td>${(Number(item.salePrice || 0) * Number(item.quantity || 0)).toLocaleString()} ر.س</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>

        <div class="receipt-total-box">
          <span>المبلغ الإجمالي</span>
          <strong>${grandTotal.toLocaleString()} ر.س</strong>
        </div>

        ${
          receipt.notes
            ? `<div class="receipt-notes"><strong>ملاحظات:</strong> ${receipt.notes}</div>`
            : ""
        }

        <div class="receipt-footer">
          شركة سعود العقارية
        </div>
      </div>
    `;
  };

  const buildPrintPageHtml = (receiptsList, title = "الفواتير") => {
    const cards = receiptsList
      .map((receipt, index) => {
        return `
          <div class="${index > 0 ? "page-break" : ""}">
            ${buildReceiptCardHtml(receipt)}
          </div>
        `;
      })
      .join("");

    return `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${title}</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 24px;
              direction: rtl;
              font-family: Arial, sans-serif;
              background: #ffffff;
              color: #1f2937;
            }
            .receipt-card {
              max-width: 900px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              padding: 24px;
              background: #fff;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px solid #f3f4f6;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            .company-title {
              font-size: 28px;
              font-weight: 800;
              color: #111827;
              margin-bottom: 6px;
            }
            .receipt-subtitle {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .receipt-meta {
              display: flex;
              justify-content: center;
              gap: 20px;
              flex-wrap: wrap;
              font-size: 13px;
              color: #4b5563;
            }
            .customer-box {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 12px 14px;
              margin-bottom: 18px;
              font-size: 14px;
            }
            .receipt-table-print {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .receipt-table-print th,
            .receipt-table-print td {
              border: 1px solid #e5e7eb;
              padding: 10px;
              text-align: right;
              vertical-align: middle;
              font-size: 13px;
            }
            .receipt-table-print th {
              background: #f9fafb;
              font-weight: 700;
            }
            .product-image-print {
              width: 52px;
              height: 52px;
              object-fit: cover;
              border-radius: 10px;
              border: 1px solid #d1d5db;
              display: block;
            }
            .no-image {
              color: #9ca3af;
              font-size: 12px;
            }
            .receipt-total-box {
              margin-top: 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 14px 16px;
              border: 1px solid #e7d39a;
              background: #fff8e6;
              border-radius: 12px;
              font-size: 16px;
            }
            .receipt-total-box strong {
              color: #b58900;
              font-size: 20px;
            }
            .receipt-notes {
              margin-top: 14px;
              font-size: 13px;
              color: #4b5563;
            }
            .receipt-footer {
              margin-top: 24px;
              text-align: center;
              padding-top: 12px;
              border-top: 1px dashed #d1d5db;
              color: #6b7280;
              font-size: 13px;
              font-weight: 700;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          ${cards}
        </body>
      </html>
    `;
  };

  const handlePrintSingleReceipt = (receipt) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    printWindow.document.write(
      buildPrintPageHtml([receipt], `فاتورة ${receipt.receiptNumber}`)
    );
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

    printWindow.document.write(buildPrintPageHtml(receipts, "طباعة كل الفواتير"));
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

        <button
          onClick={handlePrintAllReceipts}
          className="btn-secondary justify-center"
          type="button"
        >
          <HiOutlinePrinter size={18} />
          طباعة كل الفواتير
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
                          title="عرض"
                        >
                          <HiOutlineEye size={17} />
                        </button>

                        <button
                          onClick={() => handlePrintSingleReceipt(receipt)}
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
                  onClick={() => handlePrintSingleReceipt(showReceipt)}
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
                <h1
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  شركة سعود العقارية
                </h1>
                <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
                  فاتورة صرف مواد
                </p>
                <div
                  style={{
                    marginTop: 8,
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
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
                      <td
                        style={{
                          fontWeight: 700,
                          color: "var(--gold-primary)",
                        }}
                      >
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
                <p
                  style={{
                    marginTop: 14,
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
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
