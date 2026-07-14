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
    <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-8 flex justify-between items-center shrink-0">
      {/* A frase "Ambiente de Produção" foi removida daqui */}
      <div></div> 

      <div className="flex items-center gap-4 text-slate-800">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{userName}</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-[10px] text-blue-600 hover:underline font-bold uppercase"
          >
            Trocar Senha
          </button>
        </div>
        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
          {userName.substring(0, 2).toUpperCase()}
        </div>
      </div>

      <ModalTrocarSenha isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
}