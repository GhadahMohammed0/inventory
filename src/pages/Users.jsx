import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { HiOutlineUserGroup } from 'react-icons/hi';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return <span className="badge badge-info">مدير</span>;
    return <span className="badge badge-success">مهندس</span>;
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
      <div>
        <h1 className="text-2xl font-bold text-white">المستخدمين</h1>
        <p className="text-slate-400 text-sm">{users.length} مستخدم مسجل</p>
      </div>

      {users.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineUserGroup className="mx-auto text-slate-600 mb-6" size={56} />
          <p className="text-slate-400 text-lg">لا يوجد مستخدمين</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {users.map((user) => (
            <div key={user.id} className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-5 mb-6">
                <div
                  className="w-14 h-14 rounded-full flex shrink-0 items-center justify-center text-white text-xl font-bold"
                  style={{
                    background:
                      user.role === 'admin'
                        ? 'linear-gradient(135deg, #6366f1, #0ea5e9)'
                        : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  }}
                >
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{user.name || 'بدون اسم'}</h3>
                  <p className="text-sm text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">الدور:</span>
                {getRoleBadge(user.role)}
              </div>

              {user.phone && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-400">الهاتف:</span>
                  <span className="text-slate-200">{user.phone}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
