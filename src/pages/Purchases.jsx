import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlinePlus,
  HiOutlineShoppingCart,
  HiOutlineX,
} from "react-icons/hi";

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    price: "",
    supplier: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  async function fetchPurchaseData() {
    const [purchasesSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, "purchases")),
      getDocs(collection(db, "products")),
    ]);

    return {
      purchases: purchasesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const dateA = a.date || a.createdAt || "";
          const dateB = b.date || b.createdAt || "";
          return dateB.localeCompare(dateA);
        }),
      products: productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }

  async function refreshData() {
    try {
      const data = await fetchPurchaseData();
      setPurchases(data.purchases);
      setProducts(data.products);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("حدث خطأ في جلب البيانات");
    }
    setLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await fetchPurchaseData();
        if (!isMounted) return;
        setPurchases(data.purchases);
        setProducts(data.products);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("حدث خطأ في جلب البيانات");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.quantity || !formData.price || !formData.supplier) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const selectedProduct = products.find((p) => p.id === formData.productId);

    try {
      await addDoc(collection(db, "purchases"), {
        productId: formData.productId,
        productName: selectedProduct?.name || "",
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        totalPrice: Number(formData.quantity) * Number(formData.price),
        supplier: formData.supplier,
        date: formData.date,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "products", formData.productId), {
        quantity: increment(Number(formData.quantity)),
        purchasePrice: Number(formData.price),
      });

      toast.success("تم تسجيل المشتريات بنجاح");
      setShowModal(false);
      setFormData({
        productId: "",
        quantity: "",
        price: "",
        supplier: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      await refreshData();
    } catch (error) {
      console.error("Error adding purchase:", error);
      toast.error("حدث خطأ في تسجيل المشتريات");
    }
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
          <h1 className="text-2xl font-bold text-white">إدارة المشتريات</h1>
          <p className="text-sm text-slate-400">{purchases.length} عملية شراء</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary justify-center"
          id="add-purchase-btn"
        >
          <HiOutlinePlus size={18} />
          تسجيل مشتريات
        </button>
      </div>

      {purchases.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineShoppingCart className="mx-auto mb-4 text-slate-600" size={48} />
          <p className="text-lg text-slate-400">لا توجد مشتريات</p>
        </div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
                <th>المورد</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="font-medium text-white">{purchase.productName}</td>
                  <td>{purchase.quantity}</td>
                  <td>{purchase.price} ر.س</td>
                  <td className="font-semibold text-indigo-400">
                    {purchase.totalPrice || purchase.quantity * purchase.price} ر.س
                  </td>
                  <td>{purchase.supplier}</td>
                  <td className="text-slate-400">{purchase.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">تسجيل مشتريات جديدة</h2>
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
                  المنتج *
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="input-field"
                  id="purchase-product"
                >
                  <option value="">اختر المنتج</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    الكمية *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="input-field"
                    placeholder="0"
                    min="1"
                    id="purchase-quantity"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    السعر *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    id="purchase-price"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  اسم المورد *
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="input-field"
                  placeholder="اسم المورد"
                  id="purchase-supplier"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  تاريخ الشراء
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field"
                  id="purchase-date"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field resize-none"
                  rows="2"
                  placeholder="ملاحظات اختيارية"
                  id="purchase-notes"
                />
              </div>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  تسجيل المشتريات
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
