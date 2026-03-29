import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { HiOutlineUserGroup } from "react-icons/hi";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        const snap = await getDocs(collection(db, "users"));
        if (!isMounted) return;
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const getRoleBadge = (role) => {
    if (role === "admin") return <span className="badge badge-info">مدير</span>;
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
    <div className="page-stack animate-fade-in px-1 sm:px-2">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-white">المستخدمين</h1>
        <p className="text-sm text-slate-400">{users.length} مستخدم مسجل</p>
      </div>

      {users.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HiOutlineUserGroup className="mx-auto mb-6 text-slate-600" size={56} />
          <p className="text-lg text-slate-400">لا يوجد مستخدمين</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {users.map((user) => {
            const avatarClass =
              user.role === "admin"
                ? "bg-[linear-gradient(135deg,#6366f1,#0ea5e9)]"
                : "bg-[linear-gradient(135deg,#22c55e,#16a34a)]";

            return (
              <div key={user.id} className="glass-card p-5 sm:p-6 md:p-8">
                <div className="mb-6 flex items-center gap-5">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${avatarClass}`}
                  >
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-white">
                      {user.name || "بدون اسم"}
                    </h3>
                    <p className="truncate text-sm text-slate-400">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">الدور:</span>
                  {getRoleBadge(user.role)}
                </div>

                {user.phone && (
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-400">الهاتف:</span>
                    <span className="text-slate-200">{user.phone}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
