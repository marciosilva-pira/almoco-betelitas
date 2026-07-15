// components/Header.tsx
"use client";

import { useState, useEffect } from "react";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import ModalTrocarSenha from "./ModalTrocarSenha";

export default function Header() {
  const [userName, setUserName] = useState("Carregando...");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserName(user?.email || "Usuário");
    });
    return () => unsubscribe();
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-4 flex justify-between items-center shrink-0">
      {/* Espaço vazio para manter o alinhamento no celular */}
      // Substitua o <div className="w-10"></div> por isto:
      <button
        className="p-2 -ml-2 text-slate-600 md:hidden"
        onClick={() => { /* lógica para abrir o menu lateral */ }}
      >
        {/* Ícone das 3 linhas (SVG ou Heroicon) */}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-3 text-slate-800 shrink-0">
        {/* AQUI É ONDE VOCÊ VAI MUDAR */}
        <div className="text-right overflow-hidden min-w-0">
          <p className="text-xs md:text-sm font-bold text-slate-900 truncate max-w-[150px] md:max-w-[250px]">
            {userName}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[10px] text-blue-600 hover:underline font-bold uppercase"
          >
            Trocar Senha
          </button>
        </div>
        <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
          {userName.substring(0, 2).toUpperCase()}
        </div>
      </div>

      <ModalTrocarSenha isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
}