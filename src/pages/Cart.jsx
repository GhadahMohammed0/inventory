import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineShoppingCart,
} from 'react-icons/hi';

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartCount } = useCart();
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    setSubmitting(true);
    try {
      const orderData = {
        engineerId: user.uid,
        engineerName: userData?.name || user.email,
        items: cartItems.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
        })),
        note: note,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      setNote('');
      toast.success('تم إرسال الطلب بنجاح! سيتم مراجعته من قبل المدير');
      navigate('/my-orders');
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('حدث خطأ في إرسال الطلب');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">سلة الطلبات</h1>
        <p className="text-slate-400 text-sm">{cartCount} عنصر في السلة</p>
      </div>

      {cartItems.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineShoppingCart className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 text-lg mb-4">السلة فارغة</p>
          <button
            onClick={() => navigate('/categories')}
            className="btn-primary"
          >
            تصفح المنتجات
          </button>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="flex flex-col gap-3">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="glass-card p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-white">{item.name}</h3>
                  <p className="text-sm text-slate-400">{item.category || ''}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
                    >
                      <HiOutlineMinus size={14} />
                    </button>
                    <span className="text-white font-bold min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
                    >
                      <HiOutlinePlus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <HiOutlineTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field resize-none"
              rows="3"
              placeholder="أضف ملاحظات للطلب..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="btn-primary flex-1 justify-center py-3"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري الإرسال...
                </span>
              ) : (
                'إرسال الطلب'
              )}
            </button>
            <button
              onClick={clearCart}
              className="btn-danger"
            >
              إفراغ السلة
            </button>
          </div>
        </>
      )}
    </div>
  );
}
