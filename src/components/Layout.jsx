import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineShoppingCart } from 'react-icons/hi';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex p-4 lg:p-6 gap-6" style={{ background: 'var(--color-dark-950)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 min-h-full transition-all duration-300 overflow-hidden">
          {/* Top bar - mobile */}
        <header
          className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between lg:hidden"
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
          >
            <HiOutlineMenu size={24} />
          </button>

          <h1 className="text-lg font-bold gradient-text">المخزون</h1>

          {!isAdmin && (
            <button
              onClick={() => navigate('/cart')}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 relative"
            >
              <HiOutlineShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount}</span>
              )}
            </button>
          )}
          {isAdmin && <div className="w-10" />}
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
