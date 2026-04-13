import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineReceiptTax,
  HiOutlineX,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlinePrinter,
} from "react-icons/hi";

const EXPENSE_TYPES = [
  { id: "invoice", name: "فاتورة" },
  { id: "shipping", name: "شحن" },
  { id: "customs", name: "جمارك" },
  { id: "salary", name: "رواتب" },
  { id: "other", name: "أخرى" },
];

const emptyForm = {
  title: "",
  amount: "",
  type: "invoice",
  note: "",
};

export default function OtherExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const snap = await getDocs(collection(db, "otherExpenses"));
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setExpenses(data);
    } catch {
      toast.error("حدث خطأ في جلب المصروفات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("يرجى إدخال اسم المصروف أو الفاتورة");
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "otherExpenses"), {
        title: formData.title.trim(),
        amount: Number(formData.amount),
        type: formData.type,
        note: formData.note.trim(),
        createdAt: new Date().toISOString(),
      });

      toast.success("تم إضافة المصروف بنجاح");
      setShowModal(false);
      setFormData(emptyForm);
      await fetchExpenses();
    } catch {
      toast.error("حدث خطأ في إضافة المصروف");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${expense.title}"؟`)) return;

    try {
      await deleteDoc(doc(db, "otherExpenses", expense.id));
      toast.success("تم حذف المصروف");
      await fetchExpenses();
    } catch {
      toast.error("حدث خطأ في حذف المصروف");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTypeLabel = (typeId) =>
    EXPENSE_TYPES.find((t) => t.id === typeId)?.name || "أخرى";

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const buildSingleExpensePrintHtml = (expense) => {
    const amount = Number(expense.amount || 0);

    return `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>مصروف ${expense.title || ""}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              direction: rtl;
              font-family: Arial, sans-serif;
              background: #ffffff;
              color: #1f2937;
            }
            .expense-card {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              padding: 24px;
              background: #fff;
            }
            .expense-header {
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
            .expense-subtitle {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .expense-meta {
              display: flex;
              justify-content: center;
              gap: 20px;
              flex-wrap: wrap;
              font-size: 13px;
              color: #4b5563;
            }
            .expense-box {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 14px;
              margin-bottom: 14px;
              font-size: 14px;
            }
            .expense-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 12px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .expense-row:last-child {
              border-bottom: none;
            }
            .expense-label {
              color: #6b7280;
              font-weight: 700;
            }
            .expense-value {
              color: #111827;
              font-weight: 600;
            }
            .amount-box {
              margin-top: 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 14px 16px;
              border: 1px solid rgba(239,68,68,0.25);
              background: rgba(239,68,68,0.08);
              border-radius: 12px;
              font-size: 16px;
            }
            .amount-box strong {
              color: #ef4444;
              font-size: 20px;
            }
            .expense-footer {
              margin-top: 24px;
              text-align: center;
              padding-top: 12px;
              border-top: 1px dashed #d1d5db;
              color: #6b7280;
              font-size: 13px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="expense-card">
            <div class="expense-header">
              <div class="company-title">شركة سعود العقارية</div>
              <div class="expense-subtitle">سند مصروف / مصروفات أخرى</div>
              <div class="expense-meta">
                <span>التاريخ: ${formatDate(expense.createdAt)}</span>
                <span>النوع: ${getTypeLabel(expense.type)}</span>
              </div>
            </div>

            <div class="expense-box">
              <div class="expense-row">
                <span class="expense-label">اسم المصروف</span>
                <span class="expense-value">${expense.title || "-"}</span>
              </div>
              <div class="expense-row">
                <span class="expense-label">النوع</span>
                <span class="expense-value">${getTypeLabel(expense.type)}</span>
              </div>
              <div class="expense-row">
                <span class="expense-label">الملاحظات</span>
                <span class="expense-value">${expense.note || "-"}</span>
              </div>
            </div>

            <div class="amount-box">
              <span>المبلغ</span>
              <strong>${amount.toLocaleString()} ر.س</strong>
            </div>

            <div class="expense-footer">
              شركة سعود العقارية
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintSingleExpense = (expense) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    printWindow.document.write(buildSingleExpensePrintHtml(expense));
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

  const handlePrintOtherExpenses = () => {
    if (!expenses.length) {
      toast.error("لا توجد مصروفات للطباعة");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    const rows = expenses
      .map((expense, index) => {
        const amount = Number(expense.amount || 0);

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${expense.title || "-"}</td>
            <td>${getTypeLabel(expense.type)}</td>
            <td>${amount.toLocaleString()} ر.س</td>
            <td>${expense.note || "-"}</td>
            <td>${formatDate(expense.createdAt)}</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>تقرير المصروفات الأخرى</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              padding: 24px;
              color: #222;
              background: #fff;
            }
            h1 {
              margin-bottom: 8px;
              font-size: 28px;
            }
            p {
              margin-bottom: 18px;
              color: #666;
              font-size: 13px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: right;
              font-size: 13px;
              vertical-align: middle;
            }
            th {
              background: #f5f5f5;
              font-weight: 700;
            }
            .total {
              margin-top: 20px;
              padding: 12px 16px;
              border: 1px solid #ccc;
              border-radius: 10px;
              display: flex;
              justify-content: space-between;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <h1>تقرير المصروفات الأخرى</h1>
          <p>شركة سعود العقارية</p>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المصروف</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>ملاحظات</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="total">
            <span>الإجمالي</span>
            <strong>${totalExpenses.toLocaleString()} ر.س</strong>
          </div>

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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="page-header">
          <h1 style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 800 }}>
            مصروفات أخرى
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            مصروفات إضافية مرتبطة بالمشتريات (فواتير، شحن، جمارك…)
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handlePrintOtherExpenses}
            className="btn-secondary justify-center"
            type="button"
          >
            <HiOutlinePrinter size={18} />
            طباعة المصروفات الأخرى
          </button>

          <button
            onClick={() => {
              setFormData(emptyForm);
              setShowModal(true);
            }}
            className="btn-primary justify-center"
            id="add-expense-btn"
          >
            <HiOutlinePlus size={18} />
            إضافة مصروف
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 22px",
          borderRadius: 18,
          background: "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: "rgba(239,68,68,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
            }}
          >
            <HiOutlineCurrencyDollar size={22} />
          </div>
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              إجمالي المصروفات الأخرى
            </p>
            <p
              style={{
                color: "#ef4444",
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1.2,
              }}
            >
              {totalExpenses.toLocaleString()}
              <span style={{ fontSize: 14, fontWeight: 600, marginRight: 4 }}>
                ر.س
              </span>
            </p>
          </div>
        </div>
        <div
          style={{
            padding: "6px 14px",
            borderRadius: 99,
            background: "rgba(239,68,68,0.12)",
            color: "#ef4444",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {expenses.length} سجل
        </div>
      </div>

      {/* Table */}
      {expenses.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineReceiptTax
            size={48}
            style={{ color: "var(--text-muted)", margin: "0 auto 12px" }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
            لا توجد مصروفات مسجلة بعد
          </p>
          <p
            style={{
              color: "var(--text-placeholder)",
              fontSize: 13,
              marginTop: 6,
            }}
          >
            أضف فاتورة أو مصروف لتظهر هنا وتُحتسب في لوحة التحكم
          </p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>المصروف / الفاتورة</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>ملاحظات</th>
                <th>التاريخ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "rgba(239,68,68,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ef4444",
                          flexShrink: 0,
                        }}
                      >
                        <HiOutlineDocumentText size={17} />
                      </div>
                      <p style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                        {expense.title}
                      </p>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 12px",
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 700,
                        background: "rgba(201,168,76,0.12)",
                        color: "var(--gold-primary)",
                      }}
                    >
                      {getTypeLabel(expense.type)}
                    </span>
                  </td>
                  <td style={{ color: "#ef4444", fontWeight: 800, fontSize: 16 }}>
                    {(expense.amount || 0).toLocaleString()} ر.س
                  </td>
                  <td
                    style={{
                      color: "var(--text-muted)",
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {expense.note || "-"}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {formatDate(expense.createdAt)}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrintSingleExpense(expense)}
                        style={{
                          padding: 7,
                          borderRadius: 9,
                          color: "#2563eb",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          transition: "all .2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "rgba(37,99,235,0.08)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        title="طباعة"
                      >
                        <HiOutlinePrinter size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(expense)}
                        style={{
                          padding: 7,
                          borderRadius: 9,
                          color: "#ef4444",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          transition: "all .2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        title="حذف"
                      >
                        <HiOutlineTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 800,
                  fontSize: 20,
                }}
              >
                إضافة مصروف جديد
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: 8,
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

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  اسم المصروف أو الفاتورة *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="input-field"
                  placeholder="مثال: فاتورة شحن من الصين، رسوم جمارك..."
                  id="expense-title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    المبلغ (ر.س) *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="input-field"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    id="expense-amount"
                  />
                </div>
                <div>
                  <label
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    النوع
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="input-field"
                    id="expense-type"
                  >
                    {EXPENSE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  className="input-field resize-none"
                  rows="2"
                  placeholder="أي تفاصيل إضافية..."
                  id="expense-note"
                />
              </div>

              {formData.amount && Number(formData.amount) > 0 && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    سيُضاف للمصروفات
                  </span>
                  <span
                    style={{ color: "#ef4444", fontWeight: 800, fontSize: 15 }}
                  >
                    {Number(formData.amount).toLocaleString()} ر.س
                  </span>
                </div>
              )}

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 justify-center"
                  style={{ opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? "جاري الإضافة..." : "إضافة المصروف"}
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
    </div>
  );
}
