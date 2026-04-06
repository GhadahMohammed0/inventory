import { useState, useEffect, useRef } from "react";
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
  HiOutlinePhotograph,
} from "react-icons/hi";

const CATEGORIES = [
  { id: "plumbing",    name: "سباكة" },
  { id: "electrical",  name: "كهرباء" },
  { id: "smart",       name: "أنظمة ذكية" },
  { id: "general",     name: "عام" },
];

const FALLBACK_CATEGORY = { name: "عام" };

function getCategoryMeta(catId) {
  return CATEGORIES.find((c) => c.id === catId) || FALLBACK_CATEGORY;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef();

  const emptyForm = {
    name: "",
    quantity: "",
    purchasePrice: "",
    salePrice: "",
    category: "plumbing",
    minStock: "5",
    description: "",
    imageUrl: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  async function fetchProducts() {
    const snap = await getDocs(collection(db, "products"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function refreshProducts() {
    try {
      setProducts(await fetchProducts());
    } catch {
      toast.error("حدث خطأ في جلب المنتجات");
    }
    setLoading(false);
  }

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await fetchProducts();
        if (isMounted) setProducts(data);
      } catch {
        toast.error("حدث خطأ في جلب المنتجات");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  /* ── Image handling ── */
  const handleImageFile = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("الصورة يجب أن تكون أقل من 2 ميجابايت"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setImagePreview(base64);
      setFormData((prev) => ({ ...prev, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.purchasePrice || !formData.salePrice) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (Number(formData.salePrice) < Number(formData.purchasePrice)) {
      toast.error("سعر البيع يجب أن يكون أكبر من أو يساوي سعر الشراء");
      return;
    }

    const productData = {
      name: formData.name,
      quantity: Number(formData.quantity),
      purchasePrice: Number(formData.purchasePrice),
      salePrice: Number(formData.salePrice),
      category: formData.category,
      minStock: Number(formData.minStock) || 5,
      description: formData.description,
      imageUrl: formData.imageUrl || "",
      updatedAt: new Date().toISOString(),
    };

    try {
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
    } catch {
      toast.error("حدث خطأ في حفظ المنتج");
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${product.name}"؟`)) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
      toast.success("تم حذف المنتج");
      await refreshProducts();
    } catch {
      toast.error("حدث خطأ في حذف المنتج");
    }
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name,
      quantity: product.quantity.toString(),
      purchasePrice: product.purchasePrice?.toString() || "",
      salePrice: product.salePrice?.toString() || "",
      category: product.category || "plumbing",
      minStock: (product.minStock || 5).toString(),
      description: product.description || "",
      imageUrl: product.imageUrl || "",
    });
    setImagePreview(product.imageUrl || "");
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setImagePreview("");
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    return matchSearch && matchCat;
  });

  const profit = (p) => {
    if (!p.salePrice || !p.purchasePrice) return null;
    const margin = ((p.salePrice - p.purchasePrice) / p.purchasePrice * 100).toFixed(1);
    return margin;
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
          <h1 style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 800 }}>إدارة المنتجات</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{products.length} منتج في المخزون</p>
        </div>
        <button
          onClick={() => { setEditProduct(null); resetForm(); setShowModal(true); }}
          className="btn-primary justify-center"
          id="add-product-btn"
        >
          <HiOutlinePlus size={18} />
          إضافة منتج
        </button>
      </div>

      {/* Filters */}
      <div className="surface-panel flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <HiOutlineSearch
            className="absolute right-3 top-1/2 -translate-y-1/2"
            size={18}
            style={{ color: "var(--text-muted)" }}
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
          className="input-field w-full lg:w-52"
          id="filter-category"
        >
          <option value="all">جميع الفئات</option>
          {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineCube size={48} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>لا توجد منتجات</p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الفئة</th>
                <th>الكمية</th>
                <th>سعر الشراء (الصين)</th>
                <th>إجمالي سعر المنتج</th>
                <th>سعر البيع (المهندسين)</th>
                <th>هامش الربح</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const category = getCategoryMeta(product.category);
                const margin = profit(product);
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", border: "1px solid var(--border-color)" }}
                          />
                        ) : (
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: "linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05))",
                            border: "1px solid var(--border-color)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--gold-primary)",
                          }}>
                            <HiOutlineCube size={18} />
                          </div>
                        )}
                        <div>
                          <p style={{ color: "var(--text-primary)", fontWeight: 700 }}>{product.name}</p>
                          {product.description && (
                            <p style={{ color: "var(--text-muted)", fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gold">{category.name}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{product.quantity}</td>
                    <td style={{ color: "var(--text-muted)" }}>{product.purchasePrice?.toLocaleString()} ر.س</td>
                    <td style={{ color: "#c084fc", fontWeight: 700 }}>
                      {((product.purchasePrice || 0) * (product.quantity || 0)).toLocaleString()} ر.س
                    </td>
                    <td style={{ color: "var(--gold-primary)", fontWeight: 700 }}>{product.salePrice?.toLocaleString()} ر.س</td>
                    <td>
                      {margin !== null && (
                        <span className="badge badge-success">+{margin}%</span>
                      )}
                    </td>
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
                          style={{ padding: 7, borderRadius: 9, color: "var(--gold-primary)", border: "none", background: "transparent", cursor: "pointer", transition: "all .2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          title="تعديل"
                        >
                          <HiOutlinePencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          style={{ padding: 7, borderRadius: 9, color: "#ef4444", border: "none", background: "transparent", cursor: "pointer", transition: "all .2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content mt-55" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20 }}>
                {editProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: 8, borderRadius: 9, border: "none", background: "var(--bg-surface-2)", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Image Upload */}
              <div>
                <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  صورة المنتج
                </label>
                <div
                  className="img-upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleImageFile(e.dataTransfer.files[0]); }}
                >
                  {imagePreview ? (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img src={imagePreview} alt="preview" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 10, objectFit: "contain" }} />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setImagePreview(""); setFormData((p) => ({ ...p, imageUrl: "" })); }}
                        style={{ position: "absolute", top: -8, left: -8, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <HiOutlineX size={12} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <HiOutlinePhotograph size={32} style={{ margin: "0 auto 6px", display: "block" }} />
                      <p style={{ fontSize: 13 }}>انقر لاختيار صورة أو اسحب وأفلت</p>
                      <p style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>PNG, JPG حتى 2MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleImageFile(e.target.files[0])}
                />
              </div>

              {/* Name */}
              <div>
                <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>اسم المنتج *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="مثال: أنبوب PVC" id="product-name" />
              </div>

              {/* Quantity + minStock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>الكمية *</label>
                  <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="input-field" placeholder="0" min="0" id="product-quantity" />
                </div>
                <div>
                  <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>حد أدنى للمخزون</label>
                  <input type="number" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} className="input-field" placeholder="5" min="0" id="product-min-stock" />
                </div>
              </div>

              {/* Purchase Price + Sale Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                    سعر الشراء (الصين) *
                  </label>
                  <input type="number" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} className="input-field" placeholder="0" min="0" step="0.01" id="product-purchase-price" />
                </div>
                <div>
                  <label style={{ color: "var(--gold-primary)", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                    سعر البيع (المهندسين) *
                  </label>
                  <input type="number" value={formData.salePrice} onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} className="input-field" placeholder="0" min="0" step="0.01" id="product-sale-price"
                    style={{ borderColor: formData.salePrice ? "var(--gold-primary)" : undefined }}
                  />
                </div>
              </div>

              {/* Profit preview */}
              {formData.purchasePrice && formData.salePrice && Number(formData.salePrice) >= Number(formData.purchasePrice) && (
                <div style={{
                  background: "rgba(201,168,76,0.08)",
                  border: "1px solid rgba(201,168,76,0.25)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>هامش الربح</span>
                  <span style={{ color: "var(--gold-primary)", fontWeight: 800, fontSize: 15 }}>
                    {((Number(formData.salePrice) - Number(formData.purchasePrice)) / Number(formData.purchasePrice) * 100).toFixed(1)}%
                    &nbsp;= {(Number(formData.salePrice) - Number(formData.purchasePrice)).toFixed(2)} ر.س
                  </span>
                </div>
              )}

              {/* Category */}
              <div>
                <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>الفئة</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-field" id="product-category">
                  {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>الوصف</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field resize-none" rows="2" placeholder="وصف اختياري" id="product-description" />
              </div>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  {editProduct ? "حفظ التعديلات" : "إضافة المنتج"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary justify-center">
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
