import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineCube,
  HiOutlineX,
} from 'react-icons/hi';

const CATEGORIES = [
  { id: 'plumbing', name: 'سباكة', color: '#0ea5e9' },
  { id: 'electrical', name: 'كهرباء', color: '#f59e0b' },
  { id: 'smart', name: 'أنظمة ذكية', color: '#8b5cf6' },
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    purchasePrice: '',
    category: 'plumbing',
    minStock: '5',
    description: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('حدث خطأ في جلب المنتجات');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.purchasePrice) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const productData = {
        name: formData.name,
        quantity: Number(formData.quantity),
        purchasePrice: Number(formData.purchasePrice),
        category: formData.category,
        minStock: Number(formData.minStock) || 5,
        description: formData.description,
        updatedAt: new Date().toISOString(),
      };

      if (editProduct) {
        await updateDoc(doc(db, 'products', editProduct.id), productData);
        toast.success('تم تعديل المنتج بنجاح');
      } else {
        productData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'products'), productData);
        toast.success('تم إضافة المنتج بنجاح');
      }

      setShowModal(false);
      setEditProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('حدث خطأ في حفظ المنتج');
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${product.name}"؟`)) return;
    try {
      await deleteDoc(doc(db, 'products', product.id));
      toast.success('تم حذف المنتج');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('حدث خطأ في حذف المنتج');
    }
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name,
      quantity: product.quantity.toString(),
      purchasePrice: product.purchasePrice.toString(),
      category: product.category || 'plumbing',
      minStock: (product.minStock || 5).toString(),
      description: product.description || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      quantity: '',
      purchasePrice: '',
      category: 'plumbing',
      minStock: '5',
      description: '',
    });
  };

  const getCategoryColor = (catId) => {
    return CATEGORIES.find((c) => c.id === catId)?.color || '#6366f1';
  };

  const getCategoryName = (catId) => {
    return CATEGORIES.find((c) => c.id === catId)?.name || 'عام';
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المنتجات</h1>
          <p className="text-slate-400 text-sm">{products.length} منتج في المخزون</p>
        </div>
        <button
          onClick={() => {
            setEditProduct(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
          id="add-product-btn"
        >
          <HiOutlinePlus size={18} />
          إضافة منتج
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
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
          className="input-field sm:w-48"
          id="filter-category"
        >
          <option value="all">جميع الفئات</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineCube className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 text-lg">لا توجد منتجات</p>
          <p className="text-slate-500 text-sm">اضغط على "إضافة منتج" لإضافة منتج جديد</p>
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
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          background: `${getCategoryColor(product.category)}20`,
                          color: getCategoryColor(product.category),
                        }}
                      >
                        <HiOutlineCube size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: `${getCategoryColor(product.category)}20`,
                        color: getCategoryColor(product.category),
                      }}
                    >
                      {getCategoryName(product.category)}
                    </span>
                  </td>
                  <td className="font-semibold text-white">{product.quantity}</td>
                  <td>{product.purchasePrice} ر.س</td>
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
                        className="p-2 rounded-lg hover:bg-indigo-500/10 text-indigo-400 transition-colors"
                        title="تعديل"
                      >
                        <HiOutlinePencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h2>
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
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="مثال: أنبوب PVC"
                  id="product-name"
                />
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
                    min="0"
                    id="product-quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    سعر الشراء *
                  </label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="input-field"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    id="product-price"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    الفئة
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                    id="product-category"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    حد أدنى للمخزون
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="input-field"
                    placeholder="5"
                    min="0"
                    id="product-min-stock"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field resize-none"
                  rows="3"
                  placeholder="وصف اختياري للمنتج"
                  id="product-description"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  {editProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
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
