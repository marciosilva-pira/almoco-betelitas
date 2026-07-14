// app/dashboard/layout.tsx
"use client";
import { useState } from "react";
import Sidebar from "../components/Sidebar"; // Importa seu Sidebar original

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Botão de 3 linhas (Hambúrguer) - só aparece no celular */}
      <button 
        className="md:hidden p-4 fixed top-0 left-0 z-50 text-2xl text-slate-900" 
        onClick={() => setMenuAberto(!menuAberto)}
      >
        ☰
      </button>

      {/* Sidebar - Oculte/Exiba usando menuAberto */}
      <div className={`fixed md:relative z-40 h-full transition-transform ${menuAberto ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <Sidebar />
      </div>

      {/* Conteúdo principal - Ajuste de margem para o botão hambúrguer */}
      <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0">
        {children}
      </main>
    </div>
  );
}