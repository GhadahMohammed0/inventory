import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineCube,
  HiOutlineX,
  HiOutlinePrinter,
} from "react-icons/hi";

const CATEGORIES = [
  {
    id: "plumbing",
    name: "سباكة",
    iconClass: "bg-sky-500/15 text-sky-400",
    badgeClass: "bg-sky-500/15 text-sky-400",
  },
  {
    id: "electrical",
    name: "كهرباء",
    iconClass: "bg-amber-500/15 text-amber-400",
    badgeClass: "bg-amber-500/15 text-amber-400",
  },
  {
    id: "smart",
    name: "أنظمة ذكية",
    iconClass: "bg-violet-500/15 text-violet-400",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
];

const FALLBACK_CATEGORY = {
  name: "عام",
  iconClass: "bg-indigo-500/15 text-indigo-400",
  badgeClass: "bg-indigo-500/15 text-indigo-400",
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    purchasePrice: "",
    salePrice: "",
    image: "",
    category: "plumbing",
    minStock: "5",
    description: "",
  });

  async function fetchProductsData() {
    const snap = await getDocs(collection(db, "products"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function refreshProducts() {
    try {
      const data = await fetchProductsData();
      setProducts(data);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ في جلب المنتجات");
    }
    setLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const data = await fetchProductsData();
        if (!isMounted) return;
        setProducts(data);
      } catch (error) {
        console.error(error);
        toast.error("حدث خطأ في جلب المنتجات");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInitializePurchasedQuantities = async () => {
    const confirmed = window.confirm(
      "سيتم تثبيت إجمالي الكمية المشتراة الحالية لكل المنتجات الحالية مرة واحدة. هل تريدين المتابعة؟"
    );
    if (!confirmed) return;

    setMigrating(true);

    try {
      const snap = await getDocs(collection(db, "products"));
      const batch = writeBatch(db);
      let updatedCount = 0;

      snap.docs.forEach((productDoc) => {
        const data = productDoc.data();
        const hasPurchasedQuantity =
          data.totalPurchasedQuantity !== undefined &&
          data.totalPurchasedQuantity !== null;

        if (!hasPurchasedQuantity) {
          batch.update(doc(db, "products", productDoc.id), {
            totalPurchasedQuantity: Number(data.quantity || 0),
            updatedAt: new Date().toISOString(),
          });
          updatedCount += 1;
        }
      });

      if (updatedCount === 0) {
        toast("كل المنتجات مهيأة بالفعل");
        setMigrating(false);
        return;
      }

      await batch.commit();
      toast.success(`تم تثبيت ${updatedCount} منتج بنجاح`);
      await refreshProducts();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تثبيت الكميات المشتراة");
    } finally {
      setMigrating(false);
    }
  };

  const handleImageUpload = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        image: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      formData.quantity === "" ||
      !formData.purchasePrice ||
      !formData.salePrice
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      const newQuantity = Number(formData.quantity || 0);
      const purchasePrice = Number(formData.purchasePrice || 0);
      const salePrice = Number(formData.salePrice || 0);
      const minStock = Number(formData.minStock) || 5;

      const baseProductData = {
        name: formData.name,
        quantity: newQuantity,
        purchasePrice,
        salePrice,
        image: formData.image || "",
        category: formData.category,
        minStock,
        description: formData.description,
        updatedAt: new Date().toISOString(),
      };

      if (editProduct) {
        const oldCurrentQuantity = Number(editProduct.quantity || 0);
        const oldTotalPurchasedQuantity = Number(
          editProduct.totalPurchasedQuantity ??
            editProduct.initialQuantity ??
            editProduct.purchasedQuantity ??
            oldCurrentQuantity
        );

        const addedQuantity =
          newQuantity > oldCurrentQuantity ? newQuantity - oldCurrentQuantity : 0;

        const updatedTotalPurchasedQuantity =
          oldTotalPurchasedQuantity + addedQuantity;

        await updateDoc(doc(db, "products", editProduct.id), {
          ...baseProductData,
          totalPurchasedQuantity: updatedTotalPurchasedQuantity,
        });

        toast.success("تم تعديل المنتج بنجاح");
      } else {
        await addDoc(collection(db, "products"), {
          ...baseProductData,
          totalPurchasedQuantity: newQuantity,
          createdAt: new Date().toISOString(),
        });

        toast.success("تم إضافة المنتج بنجاح");
      }

      setShowModal(false);
      setEditProduct(null);
      resetForm();
      await refreshProducts();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ في حفظ المنتج");
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${product.name}"؟`)) return;

    try {
      await deleteDoc(doc(db, "products", product.id));
      toast.success("تم حذف المنتج");
      await refreshProducts();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ في حذف المنتج");
    }
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name || "",
      quantity: String(product.quantity ?? ""),
      purchasePrice: String(product.purchasePrice ?? ""),
      salePrice: String(product.salePrice ?? ""),
      image: product.image || "",
      category: product.category || "plumbing",
      minStock: String(product.minStock ?? 5),
      description: product.description || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      quantity: "",
      purchasePrice: "",
      salePrice: "",
      image: "",
      category: "plumbing",
      minStock: "5",
      description: "",
    });
  };

  const getCategoryMeta = (catId) =>
    CATEGORIES.find((c) => c.id === catId) || FALLBACK_CATEGORY;

  const filteredProducts = products.filter((p) => {
    const matchesSearch = (p.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || p.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const handlePrintProducts = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    const rows = filteredProducts
      .map((product, index) => {
        const category = getCategoryMeta(product.category);
        const quantity = Number(product.quantity || 0);
        const totalPurchasedQuantity = Number(
          product.totalPurchasedQuantity ??
            product.initialQuantity ??
            product.purchasedQuantity ??
            product.quantity ??
            0
        );
        const purchasePrice = Number(product.purchasePrice || 0);
        const salePrice = Number(product.salePrice || 0);
        const totalPurchaseValue = totalPurchasedQuantity * purchasePrice;
        const profitMargin =
          purchasePrice > 0
            ? (((salePrice - purchasePrice) / purchasePrice) * 100).toFixed(1)
            : "0.0";

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${product.name || "-"}</td>
            <td>${category.name}</td>
            <td>${quantity}</td>
            <td>${totalPurchasedQuantity}</td>
            <td>${purchasePrice.toLocaleString()} ر.س</td>
            <td>${totalPurchaseValue.toLocaleString()} ر.س</td>
            <td>${salePrice.toLocaleString()} ر.س</td>
            <td>${profitMargin}%</td>
            <td>${quantity <= Number(product.minStock || 5) ? "منخفض" : "متوفر"}</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>طباعة المنتجات</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 24px; color: #222; }
            h1 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 13px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>تقرير المنتجات</h1>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>المنتج</th>
                <th>الفئة</th>
                <th>الكمية الحالية</th>
                <th>إجمالي الكمية المشتراة</th>
                <th>سعر الشراء من الصين</th>
                <th>إجمالي قيمة الشراء</th>
                <th>سعر البيع للمشاريع</th>
                <th>هامش الربح</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="page-header">
          <h1
            style={{
              color: "var(--text-primary)",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            إدارة المنتجات
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {products.length} منتج في المخزون
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handlePrintProducts}
            className="btn-secondary justify-center"
            type="button"
          >
            <HiOutlinePrinter size={18} />
            طباعة المنتجات
          </button>

          <button
            onClick={handleInitializePurchasedQuantities}
            className="btn-secondary justify-center"
            type="button"
            disabled={migrating}
          >
            {migrating ? "جاري التثبيت..." : "تثبيت المصروفات الحالية"}
          </button>

          <button
            onClick={() => {
              setEditProduct(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary justify-center"
            id="add-product-btn"
          >
            <HiOutlinePlus size={18} />
            إضافة منتج
          </button>
        </div>
      </div>

      <div className="surface-panel flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <HiOutlineSearch
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pr-10"
            placeholder="ابحث عن منتج..."
            id="search-products"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field w-full lg:w-56"
          id="filter-category"
        >
          <option value="all">جميع الفئات</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineCube className="mx-auto mb-4 text-slate-600" size={48} />
          <p style={{ color: "var(--text-muted)", fontSize: 18 }}>لا توجد منتجات</p>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            اضغط على "إضافة منتج" لإضافة منتج جديد
          </p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الفئة</th>
                <th>الكمية الحالية</th>
                <th>إجمالي الكمية المشتراة</th>
                <th>سعر الشراء من الصين</th>
                <th>إجمالي قيمة الشراء</th>
                <th>سعر البيع للمشاريع</th>
                <th>هامش الربح</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const category = getCategoryMeta(product.category);
                const quantity = Number(product.quantity || 0);
                const totalPurchasedQuantity = Number(
                  product.totalPurchasedQuantity ??
                    product.initialQuantity ??
                    product.purchasedQuantity ??
                    product.quantity ??
                    0
                );
                const purchasePrice = Number(product.purchasePrice || 0);
                const salePrice = Number(product.salePrice || 0);
                const totalPurchaseValue = totalPurchasedQuantity * purchasePrice;
                const profitMargin =
                  purchasePrice > 0
                    ? (((salePrice - purchasePrice) / purchasePrice) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-10 w-10 rounded-lg object-cover border border-white/10"
                          />
                        ) : (
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.iconClass}`}
                          >
                            <HiOutlineCube size={18} />
                          </div>
                        )}

                        <div>
                          <p
                            className="font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {product.name}
                          </p>
                          {product.description ? (
                            <p
                              style={{
                                maxWidth: 220,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: 12,
                                color: "var(--text-muted)",
                              }}
                            >
                              {product.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${category.badgeClass}`}>
                        {category.name}
                      </span>
                    </td>

                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {quantity}
                    </td>

                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {totalPurchasedQuantity}
                    </td>

                    <td style={{ color: "var(--text-primary)" }}>
                      {purchasePrice.toLocaleString()} ر.س
                    </td>

                    <td
                      style={{
                        fontWeight: 700,
                        color: "var(--gold-primary)",
                      }}
                    >
                      {totalPurchaseValue.toLocaleString()} ر.س
                    </td>

                    <td style={{ color: "var(--text-primary)" }}>
                      {salePrice.toLocaleString()} ر.س
                    </td>

                    <td>
                      <span
                        className={
                          Number(profitMargin) >= 0
                            ? "badge badge-success"
                            : "badge badge-danger"
                        }
                      >
                        {Number(profitMargin) >= 0 ? "+" : ""}
                        {profitMargin}%
                      </span>
                    </td>

                    <td>
                      {quantity <= Number(product.minStock || 5) ? (
                        <span className="badge badge-danger">منخفض</span>
                      ) : (
                        <span className="badge badge-success">متوفر</span>
                      )}
                    </td>

                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          className="rounded-lg p-2 text-indigo-400 transition-colors hover:bg-indigo-500/10"
                          title="تعديل"
                        >
                          <HiOutlinePencil size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(product)}
                          className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10"
                          title="حذف"
                        >
                          <HiOutlineTrash size={16} />
                        </button>
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
            <div className="mb-6 flex items-center justify-between">
              <h2
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 800,
                  fontSize: 20,
                }}
              >
                {editProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
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
                    marginBottom: 8,
                  }}
                >
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input-field"
                  placeholder="مثال: أنبوب PVC"
                  id="product-name"
                />
              </div>

              <div>
                <label
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  صورة المنتج
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  className="input-field"
                />

                {formData.image ? (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={formData.image}
                      alt="Preview"
                      style={{
                        width: 90,
                        height: 90,
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1px solid var(--border-color)",
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    الكمية الحالية *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    className="input-field"
                    placeholder="0"
                    min="0"
                    id="product-quantity"
                  />
                </div>

                <div>
                  <label
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    سعر الشراء من الصين *
                  </label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, purchasePrice: e.target.value })
                    }
                    className="input-field"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    id="product-purchase-price"
                  />
                </div>

                <div>
                  <label
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    سعر البيع للمشاريع *
                  </label>
                  <input
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, salePrice: e.target.value })
                    }
                    className="input-field"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    id="product-sale-price"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    الفئة
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="input-field"
                    id="product-category"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    حد أدنى للمخزون
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                    className="input-field"
                    placeholder="5"
                    min="0"
                    id="product-min-stock"
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="input-field resize-none"
                  rows="3"
                  placeholder="وصف اختياري للمنتج"
                  id="product-description"
                />
              </div>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  {editProduct ? "حفظ التعديلات" : "إضافة المنتج"}
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
