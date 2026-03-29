import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineChartBar } from 'react-icons/hi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
        toast.error('المستخدم غير موجود');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('كلمة المرور غير صحيحة');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('بيانات الدخول غير صحيحة');
      } else {
        toast.error('حدث خطأ في تسجيل الدخول');
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#1e1b4b_100%)] px-4 py-10 sm:px-6">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.1)_0%,transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-6 space-y-3 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6366f1,#0ea5e9)] shadow-[0_8px_32px_rgba(99,102,241,0.3)]">
            <HiOutlineChartBar size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">نظام إدارة المخزون</h1>
          <p className="text-slate-400">قم بتسجيل الدخول للمتابعة</p>
        </div>

        {/* Login Form */}
        <div className="glass-card rounded-2xl px-4 py-6 sm:px-6 sm:py-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <HiOutlineMail
                  className="absolute left-3 top-1/2  -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="أدخل البريد الإلكتروني"
                  id="login-email"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                كلمة المرور
              </label>
              <div className="relative">
                <HiOutlineLockClosed
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field "
                  placeholder="أدخل كلمة المرور"
                  id="login-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
              id="login-submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري تسجيل الدخول...
                </span>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              ليس لديك حساب؟{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
                سجل كمهندس
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
