"use client";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      
      {/* Sidebar - Menu Lateral */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}>
        <div onClick={() => setMenuAberto(false)} className="h-full">
           <Sidebar />
        </div>
      </div>

      {/* Overlay para fechar ao clicar fora no mobile */}
      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMenuAberto(false)}></div>
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header toggleMenu={() => setMenuAberto(!menuAberto)} />
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}