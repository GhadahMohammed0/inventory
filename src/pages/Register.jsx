import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineChartBar,
} from "react-icons/hi";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !phone || !password || !confirmPassword) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("كلمة المرور غير متطابقة");
      return;
    }

    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name, phone);
      toast.success("تم إنشاء الحساب بنجاح");
      navigate("/dashboard");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        toast.error("البريد الإلكتروني مستخدم بالفعل");
      } else {
        toast.error("حدث خطأ في إنشاء الحساب");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#1e1b4b_100%)] px-4 py-10 sm:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.1)_0%,transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="mb-6 space-y-3 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6366f1,#0ea5e9)] shadow-[0_8px_32px_rgba(99,102,241,0.3)]">
            <HiOutlineChartBar size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">إنشاء حساب</h1>
          <p className="text-slate-400">سجل كمهندس للمتابعة</p>
        </div>

        <div className="glass-card rounded-2xl px-4 py-6 sm:px-6 sm:py-8">
          <form onSubmit={handleSubmit} dir="rtl" className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                الاسم الكامل
              </label>
              <div className="relative">
                <HiOutlineUser
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-10 text-right"
                  placeholder="أدخل الاسم"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <HiOutlineMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10 text-right"
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                رقم الهاتف
              </label>
              <div className="relative">
                <HiOutlinePhone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field pl-10 text-right"
                  placeholder="أدخل رقم الهاتف"
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
                  className="input-field pl-10 text-right"
                  placeholder="أدخل كلمة المرور"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <HiOutlineLockClosed
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10 text-right"
                  placeholder="أعد إدخال كلمة المرور"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 w-full justify-center py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  جاري إنشاء الحساب...
                </span>
              ) : (
                "إنشاء حساب"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              لديك حساب؟{" "}
              <Link
                to="/login"
                className="font-medium text-indigo-400 hover:text-indigo-300"
              >
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
