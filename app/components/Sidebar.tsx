// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

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
    // Alteramos para h-screen e flex-col para forçar o ajuste na altura da tela
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed md:relative z-40">
      
      {/* Título fixo no topo */}
      <div className="p-6 border-b border-slate-800 shrink-0">
        <h1 className="text-xl font-bold tracking-wide">🍽️ Almoço Betelitas</h1>
      </div>

      {/* Área central com rolagem (overflow-y-auto) caso tenha muitos itens */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <Link href="/dashboard" className={`flex items-center gap-3 p-3 rounded-lg ${isActive("/dashboard")}`}>
          📊 Dashboard
        </Link>

        {isAdmin && (
          <>
            <Link href="/casas" className={`flex items-center gap-3 p-3 rounded-lg ${isActive("/casas")}`}>🏠 Casas</Link>
            <Link href="/betelitas" className={`flex items-center gap-3 p-3 rounded-lg ${isActive("/betelitas")}`}>👥 Betelitas</Link>
            <Link href="/programacoes" className={`flex items-center gap-3 p-3 rounded-lg ${isActive("/programacoes")}`}>📅 Programações</Link>
          </>
        )}
      </nav>

      {/* Botão Sair fixo na parte inferior da sidebar */}
      <div className="p-4 border-t border-slate-800 shrink-0 mt-auto">
        <button onClick={handleLogout} className="w-full text-slate-400 p-3 text-sm hover:text-white bg-slate-800 rounded-lg">
          🚪 Sair do Sistema
        </button>
      </div>
    </aside>
  );
}