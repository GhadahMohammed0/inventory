import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { HiOutlineMenu, HiOutlineShoppingCart } from "react-icons/hi";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-950 lg:flex lg:min-h-dvh lg:items-start lg:gap-6 lg:p-4 xl:p-6">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:min-h-[calc(100dvh-2rem)]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-slate-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <HiOutlineMenu size={24} />
          </button>

          <h1 className="text-lg font-bold gradient-text">المخزون</h1>

          {!isAdmin && (
            <button
              onClick={() => navigate("/cart")}
              className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <HiOutlineShoppingCart size={24} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          )}
          {isAdmin && <div className="w-10" />}
        </header>

        <main className="flex-1 px-4 pb-6 pt-5 sm:px-5 sm:pb-8 sm:pt-6 lg:px-0 lg:pb-0 lg:pt-0">
          <div className="content-shell w-full lg:pt-4 xl:pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
