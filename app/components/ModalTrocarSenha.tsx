"use client";

import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function ModalTrocarSenha({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) return alert("As senhas não coincidem!");
    if (novaSenha.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, novaSenha);
        alert("Senha alterada com sucesso!");
        onClose();
      }
    } catch (error) {
      alert("Erro ao alterar senha. Tente sair e entrar novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Alterar Senha</h2>
        <input type="password" placeholder="Nova senha" className="w-full p-3 border rounded-lg" onChange={(e) => setNovaSenha(e.target.value)} required />
        <input type="password" placeholder="Confirme a nova senha" className="w-full p-3 border rounded-lg" onChange={(e) => setConfirmarSenha(e.target.value)} required />
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 p-2 text-slate-500 font-medium">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-1 p-2 bg-blue-600 text-white rounded-lg font-bold">
            {loading ? "Salvando..." : "Alterar"}
          </button>
        </div>
      </form>
    </div>
  );
}