// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { HeartHandshake, House } from 'lucide-react';
import { Users } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const ADMIN_EMAIL = "marciosilva.pira@gmail.com";
  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;

  const isActive = (path: string) => {
    return pathname === path ? "bg-blue-600/10 text-blue-400 font-medium" : "text-slate-400 hover:bg-slate-800 hover:text-white";
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (

    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full">

      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <Link href="/dashboard" className={`flex items-center justify-between p-3 rounded-lg ${isActive("/dashboard")}`}>
          <span>Dashboard</span>
          <span>📊</span>
        </Link>

        <Link href="/anfitrioes" className={`flex items-center justify-between p-3 rounded-lg ${isActive("/anfitrioes")}`}>
          <span>Anfitriões</span>
          <Users
            size={20}
            className="stroke-blue-700"
            style={{ color: '#ff6633' }}
          />
        </Link>

        {isAdmin && (
          <>
            <Link href="/casas" className={`flex items-center justify-between p-3 rounded-lg ${isActive("/casas")}`}>
              <span>Casas</span>
              <span>🏠</span>
            </Link>
            <Link href="/betelitas" className={`flex items-center justify-between p-3 rounded-lg ${isActive("/betelitas")}`}>
              <span>Betelitas</span>
              <span>👥</span>
            </Link>
            <Link href="/programacoes" className={`flex items-center justify-between p-3 rounded-lg ${isActive("/programacoes")}`}>
              <span>Programações</span>
              <span>📅</span>
            </Link>
            <Link href="/hospedagem" className={`flex items-center justify-between p-3 rounded-lg ${isActive("/hospedagem")}`}>
            <span>Hospedagem</span>
              <span>🛏️</span>
            </Link>

            <Link href="/estatisticas" className={`flex items-center justify-between p-3 rounded-lg ${isActive("/estatisticas")}`}>
              <span>Estatísticas</span>
              <span>📊</span>
            </Link>

          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 shrink-0 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full text-slate-400 p-3 text-sm hover:text-white bg-slate-800 rounded-lg"
        >
          🚪 Sair do Sistema
        </button>
      </div>


    </aside>
  );
}