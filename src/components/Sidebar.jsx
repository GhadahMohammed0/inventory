import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
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
  const { user, userData, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    let isFirstLoad = true;
    const q = query(collection(db, "orders"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrdersCount(snapshot.docs.length);

      if (!isFirstLoad) {
        const hasNew = snapshot.docChanges().some((change) => change.type === "added");
        if (hasNew) {
          toast("يوجد طلب جديد بانتظار موافقتك!", {
            icon: "🔔",
            className: "!bg-indigo-600 !text-white !border-indigo-400/40",
          });
        }
      }
      isFirstLoad = false;
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Observer for Engineer: Notify when their order is approved or rejected
  useEffect(() => {
    // Wait until `user` is available
    if (isAdmin || !user?.uid) return;

    let isFirstLoad = true;
    const q = query(
      collection(db, "orders"),
      where("engineerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isFirstLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const data = change.doc.data();
            const orderNum = change.doc.id.slice(-6).toUpperCase();
            
            if (data.status === "approved") {
              toast.success(`تمت الموافقة على طلبك رقم #${orderNum} 🎉`);
            } else if (data.status === "rejected") {
              toast.error(`تم رفض طلبك رقم #${orderNum} ❌`);
            }
          }
        });
      }
      isFirstLoad = false;
    });

    return () => unsubscribe();
  }, [isAdmin, user]);

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
      to: "/cart",
      icon: <HiOutlineShoppingCart size={21} />,
      label: "السلة",
    },
    {
      to: "/my-orders",
      icon: <HiOutlineClipboardList size={21} />,
      label: "طلباتي",
    },
  ];

  const links = isAdmin ? adminLinks : engineerLinks;
  const userAvatarClass = isAdmin
    ? "bg-[linear-gradient(135deg,#6366f1,#4f46e5)]"
    : "bg-[linear-gradient(135deg,#22c55e,#16a34a)]";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[70] flex h-dvh w-[calc(100vw-1rem)] max-w-[250px] flex-col border-l border-indigo-500/12 bg-[linear-gradient(180deg,#0f172a_0%,#0c1324_50%,#080e1c_100%)] p-2 transition-transform duration-300 ease-in-out lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:rounded-[28px]
          ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="px-7 py-8 border-b border-indigo-500/10">
          <div className="flex items-center gap-4">
            <div className="mb-1 mr-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6366f1,#4f46e5)] shadow-[0_6px_20px_rgba(99,102,241,0.35)]">
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
        <div className="mt-2 flex-1 overflow-y-auto px-5 py-6">
          <p className="mb-5 px-2 text-base font-bold tracking-widest text-slate-600">
            القائمة الرئيسية
          </p>

          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group relative flex items-center gap-4 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "border-indigo-500/25 bg-indigo-500/15 text-indigo-100 shadow-[0_8px_30px_rgba(79,70,229,0.12)]"
                      : "border-transparent text-slate-400 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                  }`
                }
              >
                  <span className="shrink-0 text-xl">{link.icon}</span>
                  <span className="text-[15px] whitespace-nowrap">
                    {link.label}
                  </span>
                  {link.to === "/cart" && cartCount > 0 && (
                    <span className="rounded-full bg-indigo-700/35 px-3 py-1 text-lg font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                  {isAdmin && link.to === "/orders" && pendingOrdersCount > 0 && (
                    <span className="mr-auto rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                      {pendingOrdersCount}
                    </span>
                  )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Profile Section */}
        <div className="border-t border-indigo-500/10 px-5 py-6 pb-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-4 bg-slate-800/40 border border-slate-700/30">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-bold ${userAvatarClass}`}>
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
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400/90 transition-all hover:bg-red-500/8 hover:text-red-300"
          >
            <HiOutlineLogout size={20} />
            <span className="text-[15px]">تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
