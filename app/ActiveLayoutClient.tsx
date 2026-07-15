"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

export default function ActiveLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Adicionamos o estado para controlar o menu aqui
  const [menuAberto, setMenuAberto] = useState(false);

  const isPublicRoute = pathname === "/";

  if (isPublicRoute) {
    return (
      <main className="w-full h-screen bg-slate-50 flex items-center justify-center">
        {children}
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      {/* Sidebar com controle de visibilidade mobile */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}>
        <div onClick={() => setMenuAberto(false)} className="h-full">
           <Sidebar />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header agora recebe a função para abrir o menu */}
        <Header toggleMenu={() => setMenuAberto(!menuAberto)} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
      
      {/* Overlay para fechar o menu ao clicar fora no celular */}
      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMenuAberto(false)}></div>
      )}
    </div>
  );
}