 import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
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
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    purchasePrice: "",
    salePrice: "",
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
      console.error("Error fetching products:", error);
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
        console.error("Error fetching products:", error);
        toast.error("حدث خطأ في جلب المنتجات");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.quantity ||
      !formData.purchasePrice ||
      !formData.salePrice
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      const productData = {
        name: formData.name,
        quantity: Number(formData.quantity),
        purchasePrice: Number(formData.purchasePrice),
        salePrice: Number(formData.salePrice),
        category: formData.category,
        minStock: Number(formData.minStock) || 5,
        description: formData.description,
        updatedAt: new Date().toISOString(),
      };

      if (editProduct) {
        await updateDoc(doc(db, "products", editProduct.id), productData);
        toast.success("تم تعديل المنتج بنجاح");
      } else {
        productData.createdAt = new Date().toISOString();
        await addDoc(collection(db, "products"), productData);
        toast.success("تم إضافة المنتج بنجاح");
      }

      setShowModal(false);
      setEditProduct(null);
      resetForm();
      await refreshProducts();
    } catch (error) {
      console.error("Error saving product:", error);
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
      console.error("Error deleting product:", error);
      toast.error("حدث خطأ في حذف المنتج");
    }
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name || "",
      quantity: product.quantity?.toString() || "",
      purchasePrice: product.purchasePrice?.toString() || "",
      salePrice: product.salePrice?.toString() || "",
      category: product.category || "plumbing",
      minStock: (product.minStock || 5).toString(),
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
      category: "plumbing",
      minStock: "5",
      description: "",
    });
  };

  const getCategoryMeta = (catId) =>
    CATEGORIES.find((c) => c.id === catId) || FALLBACK_CATEGORY;

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      ?.toLowerCase()
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

    const rows = products
      .map((product, index) => {
        const category = getCategoryMeta(product.category);
        const quantity = Number(product.quantity || 0);
        const purchasePrice = Number(product.purchasePrice || 0);
        const salePrice = Number(product.salePrice || 0);
        const stockValuePurchase = quantity * purchasePrice;
        const stockValueSale = quantity * salePrice;

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${product.name || "-"}</td>
            <td>${category.name}</td>
            <td>${quantity}</td>
            <td>${purchasePrice.toFixed(2)} ر.س</td>
            <td>${salePrice.toFixed(2)} ر.س</td>
            <td>${stockValuePurchase.toFixed(2)} ر.س</td>
            <td>${stockValueSale.toFixed(2)} ر.س</td>
            <td>${quantity <= Number(product.minStock || 5) ? "منخفض" : "متوفر"}</td>
          </tr>
        `;
      })
      .join("");

    const totalQuantity = products.reduce(
      (sum, product) => sum + Number(product.quantity || 0),
      0
    );

    const totalPurchaseValue = products.reduce(
      (sum, product) =>
        sum + Number(product.quantity || 0) * Number(product.purchasePrice || 0),
      0
    );

    const totalSaleValue = products.reduce(
      (sum, product) =>
        sum + Number(product.quantity || 0) * Number(product.salePrice || 0),
      0
    );

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>طباعة المخزون</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              padding: 24px;
              color: #222;
            }
            h1 {
              margin: 0 0 8px;
            }
            p {
              margin: 0 0 8px;
              color: #666;
              font-size: 14px;
            }
            .summary {
              margin: 16px 0 20px;
              padding: 12px;
              background: #f8f8f8;
              border: 1px solid #ddd;
              border-radius: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 10px;
              text-align: right;
              font-size: 13px;
            }
            th {
              background: #f3f3f3;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>تقرير كامل المنتجات والمخزون</h1>
          <p>عدد المنتجات: ${products.length}</p>

          <div class="summary">
            <p><strong>إجمالي الكمية بالمخزون:</strong> ${totalQuantity}</p>
            <p><strong>إجمالي قيمة المخزون بسعر الشراء:</strong> ${totalPurchaseValue.toFixed(2)} ر.س</p>
            <p><strong>إجمالي قيمة المخزون بسعر البيع:</strong> ${totalSaleValue.toFixed(2)} ر.س</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المنتج</th>
                <th>الفئة</th>
                <th>الكمية</th>
                <th>سعر الشراء</th>
                <th>سعر البيع</th>
                <th>قيمة المخزون شراء</th>
                <th>قيمة المخزون بيع</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
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
          <h1 className="text-2xl font-bold text-white">إدارة المنتجات</h1>
          <p className="text-sm text-slate-400">
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
          <p className="text-lg text-slate-400">لا توجد منتجات</p>
          <p className="text-sm text-slate-500">
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
                <th>الكمية</th>
                <th>سعر الشراء</th>
                <th>سعر البيع</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const category = getCategoryMeta(product.category);

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.iconClass}`}
                        >
                          <HiOutlineCube size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{product.name}</p>
                          {product.description && (
                            <p className="max-w-[200px] truncate text-xs text-slate-500">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${category.badgeClass}`}>
                        {category.name}
                      </span>
                    </td>

                    <td className="font-semibold text-white">
                      {product.quantity}
                    </td>

                    <td>{Number(product.purchasePrice || 0).toLocaleString()} ر.س</td>
                    <td>{Number(product.salePrice || 0).toLocaleString()} ر.س</td>

                    <td>
                      {(product.quantity || 0) <= (product.minStock || 5) ? (
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
              <h2 className="text-xl font-bold text-white">
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
                <label className="mb-2 block text-sm font-medium text-slate-300">
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    الكمية *
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
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    سعر الشراء *
                  </label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchasePrice: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    id="product-purchase-price"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    سعر البيع *
                  </label>
                  <input
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salePrice: e.target.value,
                      })
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
                  <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  <label className="mb-2 block text-sm font-medium text-slate-300">
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
                <label className="mb-2 block text-sm font-medium text-slate-300">
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
