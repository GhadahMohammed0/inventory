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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)",
      }}
    >
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
              boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)",
            }}
          >
            <HiOutlineChartBar size={32} className="text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white absolute top-2 right-5 left-1">
            إنشاء حساب
          </h1>

          <p className="text-slate-400" style={{ margin: 5 }}>
            سجل كمهندس للمتابعة
          </p>
        </div>

        {/* Form */}
        <div
          className="pt-8 rounded-2xl"
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            backdropFilter: "blur(20px)",
            padding: 10,
          }}
        >
          <form
            onSubmit={handleSubmit}
            dir="rtl"
            className="flex flex-col gap-5"
          >
            {/* Name */}
            <div>
              <label
                className="block text-sm font-medium text-slate-300"
                style={{ margin: 4 }}
              >
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

            {/* Email */}
            <div>
              <label
                className="block text-sm font-medium text-slate-300"
                style={{ margin: 4 }}
              >
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

            {/* Phone */}
            <div>
              <label
                className="block text-sm font-medium text-slate-300"
                style={{ margin: 4 }}
              >
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

            {/* Password */}
            <div>
              <label
                className="block text-sm font-medium text-slate-300"
                style={{ margin: 4 }}
              >
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

            {/* Confirm Password */}
            <div>
              <label
                className="block text-sm font-medium text-slate-300"
                style={{ margin: 4 }}
              >
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
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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

          <div className="mt-6 text-center" style={{ marginTop: 6 }}>
            <p className="text-slate-400 text-sm">
              لديك حساب؟{" "}
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-medium"
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
