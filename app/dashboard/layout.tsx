// app/dashboard/layout.tsx
"use client";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header"; // Importamos o seu Header original

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  // Função para fechar o menu quando clicar em um link
  const fecharMenu = () => setMenuAberto(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Botão de 3 linhas (Hambúrguer) */}
      <button 
        className="md:hidden p-4 fixed top-0 left-0 z-50 text-2xl text-slate-900" 
        onClick={() => setMenuAberto(!menuAberto)}
      >
        ☰
      </button>

      {/* Sidebar com clique para fechar */}
      <div 
        className={`fixed md:relative z-40 h-full transition-transform ${menuAberto ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        onClick={fecharMenu}
      >
        <Sidebar />
      </div>

      {/* Conteúdo principal com Header incluído */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header /> {/* O Header volta a aparecer aqui */}
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}