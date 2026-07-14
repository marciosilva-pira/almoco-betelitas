"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getFirestore } from "firebase/firestore";
import { auth } from "../lib/firebase";

export default function LoginPage() {
  const [isCadastro, setIsCadastro] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [senhaTemporariaGerada, setSenhaTemporariaGerada] = useState("");
  
  const router = useRouter();

  const gerarSenhaTemporaria = () => {
    const caracteres = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01233456789";
    let resultado = "";
    for (let i = 0; i < 8; i++) {
      resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.push("/dashboard");
    } catch (error: any) {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setCarregando(false);
    }
  };

  const handleEsqueciSenha = async () => {
    if (!email) {
      setErro("Por favor, digite seu e-mail no campo acima.");
      return;
    }
    setCarregando(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSucesso("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
    } catch (error) {
      setErro("Erro ao enviar e-mail. Verifique se o e-mail está correto.");
    } finally {
      setCarregando(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);
    const senhaProvisoria = gerarSenhaTemporaria();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senhaProvisoria);
      const db = getFirestore();
      await setDoc(doc(db, "users", userCredential.user.uid), { email, role: "usuario", criadoEm: new Date() });
      setSenhaTemporariaGerada(senhaProvisoria);
      setSucesso("Conta criada com sucesso!");
      setIsCadastro(false);
    } catch (error: any) {
      setErro("Erro ao cadastrar. Verifique o e-mail.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg max-w-md w-full mx-4">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">
        {isCadastro ? "Criar Novo Usuário" : "Almoço Betelitas"}
      </h2>
      
      {erro && <div className="bg-red-50 text-red-600 border border-red-200 text-sm p-3 rounded-lg mb-4 text-center">{erro}</div>}
      
      {sucesso && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm p-4 rounded-lg mb-4 text-left">
          <p className="font-bold mb-1">🎉 {sucesso}</p>
          {senhaTemporariaGerada && (
            <>
              <p className="text-xs">Use a senha abaixo para o primeiro login:</p>
              <div className="bg-white border border-emerald-200 text-center font-mono text-lg font-bold py-2 rounded-md my-2 text-slate-800">
                {senhaTemporariaGerada}
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={isCadastro ? handleCadastro : handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
          <input type="email" required placeholder="exemplo@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"/>
        </div>
        {!isCadastro && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Senha</label>
            <input type="password" required placeholder="Sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"/>
            <button type="button" onClick={handleEsqueciSenha} className="text-xs text-slate-500 hover:text-blue-600 mt-2 block w-full text-right">Esqueci minha senha</button>
          </div>
        )}
        <button type="submit" disabled={carregando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all text-sm">{carregando ? "Processando..." : isCadastro ? "Gerar Acesso" : "Entrar"}</button>
      </form>
      <div className="mt-6 text-center">
        <button type="button" onClick={() => { setIsCadastro(!isCadastro); setErro(""); setSucesso(""); }} className="text-xs text-blue-600 hover:underline font-medium">
          {isCadastro ? "Já tenho conta. Fazer Login" : "Não tem acesso? Cadastrar"}
        </button>
      </div>
    </div>
  );
}