import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  HiOutlineHome,
  HiOutlineCube,
  HiOutlineShoppingCart,
  HiOutlineClipboardList,
  HiOutlineDocumentText,
  HiOutlineLogout,
  HiOutlineUserGroup,
  HiOutlineChartBar,
} from "react-icons/hi";
import { HiOutlineArchiveBox } from "react-icons/hi2";

export default function Sidebar({ isOpen, onClose }) {
  const { userData, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const adminLinks = [
    {
      to: "/dashboard",
      icon: <HiOutlineHome size={21} />,
      label: "لوحة التحكم",
    },
    { to: "/products", icon: <HiOutlineCube size={21} />, label: "المنتجات" },
    {
      to: "/purchases",
      icon: <HiOutlineShoppingCart size={21} />,
      label: "المشتريات",
    },
    {
      to: "/inventory",
      icon: <HiOutlineArchiveBox size={21} />,
      label: "المخزون",
    },
    {
      to: "/orders",
      icon: <HiOutlineClipboardList size={21} />,
      label: "الطلبات",
    },
    {
      to: "/receipts",
      icon: <HiOutlineDocumentText size={21} />,
      label: "الفواتير",
    },
    {
      to: "/users",
      icon: <HiOutlineUserGroup size={21} />,
      label: "المستخدمين",
    },
  ];

  const engineerLinks = [
    { to: "/dashboard", icon: <HiOutlineHome size={21} />, label: "الرئيسية" },
    { to: "/categories", icon: <HiOutlineCube size={21} />, label: "الأقسام" },
    {
      to: "/my-orders",
      icon: <HiOutlineClipboardList size={21} />,
      label: "طلباتي",
    },
    {
      to: "/inventory",
      icon: <HiOutlineArchiveBox size={21} />,
      label: "المخزون",
    },
  ];

  const links = isAdmin ? adminLinks : engineerLinks;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] lg:hidden"
          style={{ backdropFilter: "blur(4px)" }}
          onClick={onClose}
        />
      )}

      <aside
        className={`h-screen sticky top-0 flex flex-col z-[70] transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          fixed lg:relative right-0 flex-shrink-0
        `}
        style={{
          width: "250px",
          background:
            "linear-gradient(180deg, #0f172a 0%, #0c1324 50%, #080e1c 100%)",
          borderLeft: "1px solid rgba(99, 102, 241, 0.12)",
          padding:7
        }}
      >
        {/* Logo */}
        <div className="px-7 py-8 border-b border-indigo-500/10">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: "0 6px 20px rgba(99, 102, 241, 0.35)",
                margin: 6,
                marginBottom:7
              }}
            >
              <HiOutlineChartBar size={26} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold text-white truncate">المخزون</h1>
              <p className="text-xs text-slate-500 mt-1 truncate">
                نظام إدارة المخزون
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-5 py-6 flex-1 overflow-y-auto" style={{marginTop:10}}>
          <p className="text-[11px] font-bold text-slate-600 tracking-widest mb-6 px-2" style={{ fontSize: 16, marginBottom:10}}>
            القائمة الرئيسية
          </p>

          <nav className="flex flex-col gap-15">
            {links.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className="group relative flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: isActive
                      ? "rgba(99,102,241,0.15)"
                      : "transparent",
                    color: isActive ? "#c7d2fe" : "#94a3b8",
                    border: isActive
                      ? "3px solid rgba(99,102,241,0.2)"
                      : "3px solid transparent",
                  }}
                >
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[4px] h-8 bg-indigo-500 rounded-l-full" />
                  )}
                  <span className="flex-shrink-0 text-xl">{link.icon}</span>
                  <span className="text-[15px] whitespace-nowrap">
                    {link.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile Section */}
        <div className="px-5 py-6 border-t border-indigo-500/10">
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-4 bg-slate-800/40 border border-slate-700/30">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{
                background: isAdmin
                  ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                  : "linear-gradient(135deg, #22c55e, #16a34a)",
              }}
            >
              {userData?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userData?.name || "مستخدم"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {isAdmin ? "مدير النظام" : "مهندس"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-400/90 transition-all hover:bg-red-500/10"
          >
            <HiOutlineLogout size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
