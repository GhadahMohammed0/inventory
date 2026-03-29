import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineShoppingCart,
  HiOutlineX,
} from 'react-icons/hi';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    price: '',
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [purchasesSnap, productsSnap] = await Promise.all([
        getDocs(collection(db, 'purchases')),
        getDocs(collection(db, 'products')),
      ]);
      setPurchases(
        purchasesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const dateA = a.date || a.createdAt || '';
            const dateB = b.date || b.createdAt || '';
            return dateB.localeCompare(dateA);
          })
      );
      setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.quantity || !formData.price || !formData.supplier) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const selectedProduct = products.find((p) => p.id === formData.productId);

    try {
      // Add purchase record
      await addDoc(collection(db, 'purchases'), {
        productId: formData.productId,
        productName: selectedProduct?.name || '',
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        totalPrice: Number(formData.quantity) * Number(formData.price),
        supplier: formData.supplier,
        date: formData.date,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      });

      // Update product quantity (increase for purchases/restocking)
      await updateDoc(doc(db, 'products', formData.productId), {
        quantity: increment(Number(formData.quantity)),
        purchasePrice: Number(formData.price),
      });

      toast.success('تم تسجيل المشتريات بنجاح');
      setShowModal(false);
      setFormData({
        productId: '',
        quantity: '',
        price: '',
        supplier: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error adding purchase:', error);
      toast.error('حدث خطأ في تسجيل المشتريات');
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
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المشتريات</h1>
          <p className="text-slate-400 text-sm">{purchases.length} عملية شراء</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          id="add-purchase-btn"
        >
          <HiOutlinePlus size={18} />
          تسجيل مشتريات
        </button>
      </div>

      {purchases.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineShoppingCart className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 text-lg">لا توجد مشتريات</p>
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
                    {purchase.totalPrice || (purchase.quantity * purchase.price)} ر.س
                  </td>
                  <td>{purchase.supplier}</td>
                  <td className="text-slate-400">{purchase.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">تسجيل مشتريات جديدة</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
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

              <div className="flex gap-3 mt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  تسجيل المشتريات
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
    </div>
  );
}
