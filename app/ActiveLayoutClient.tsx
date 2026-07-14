"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar"; // Ajustado para a sua pasta real de componentes[cite: 9]
import Header from "./components/Header";   // Ajustado para a sua pasta real de componentes[cite: 8]

export default function ActiveLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Se estiver na página de login, renderiza a tela totalmente limpa e estilizada
  const isPublicRoute = pathname === "/";

  if (isPublicRoute) {
    return (
      <main className="w-full h-screen bg-slate-50 flex items-center justify-center">
        {children}
      </main>
    );
  }

  // Se estiver logado, renderiza com a Sidebar e Header nas laterais[cite: 8, 9]
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}