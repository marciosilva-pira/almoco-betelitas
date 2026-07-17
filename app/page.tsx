"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getFirestore } from "firebase/firestore";
import { auth } from "../lib/firebase";

export default function LoginPage() {
  const [isCadastro, setIsCadastro] = useState(false);
  const [esquecendoSenha, setEsquecendoSenha] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [senhaTemporariaGerada, setSenhaTemporariaGerada] = useState("");

  const EM_MANUTENCAO = false;

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

  const handleEsqueciSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErro("Por favor, digite seu e-mail acima.");
      return;
    }
    setCarregando(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSucesso("E-mail de redefinição enviado com sucesso!");
      setEsquecendoSenha(false);
    } catch (error: any) {
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

    if (senhaTemporariaGerada) {
      router.push("/dashboard");
      return;
    }

    const senhaProvisoria = gerarSenhaTemporaria();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senhaProvisoria);
      const db = getFirestore();
      await setDoc(doc(db, "users", userCredential.user.uid), { email, role: "usuario", criadoEm: new Date() });
      setSenhaTemporariaGerada(senhaProvisoria);
      setSucesso("Conta criada com sucesso!");
    } catch (error: any) {
      setErro("Erro ao cadastrar. Verifique o e-mail.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    // ESTA DIV É A QUE CENTRALIZA TUDO NA TELA
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg max-w-md w-full">

        {EM_MANUTENCAO && (
          <div className="bg-amber-100 border border-amber-300 text-amber-800 p-3 rounded-lg mb-4 text-xs text-center font-bold">
            ⚠️ Sistema em manutenção! Estamos atualizando as funcionalidades. Retornaremos em breve.
          </div>
        )}

        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">
          {isCadastro ? "Criar Novo Usuário" : (esquecendoSenha ? "Recuperar Senha" : "Almoço Betelitas")}
        </h2>

        {erro && <div className="bg-red-50 text-red-600 border border-red-200 text-sm p-3 rounded-lg mb-4 text-center">{erro}</div>}

        {sucesso && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm p-4 rounded-lg mb-4 text-left font-bold">
            <p>{sucesso}</p>
            <div className="mt-3 p-3 bg-white border border-emerald-200 rounded text-center">
              <p className="text-slate-500 font-normal text-xs mb-1">Senha temporária:</p>
              <p className="text-2xl font-mono tracking-widest text-blue-600">
                {senhaTemporariaGerada || "Erro ao recuperar senha"}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={isCadastro ? handleCadastro : (esquecendoSenha ? handleEsqueciSenha : handleLogin)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
            <input disabled={EM_MANUTENCAO} type="email" required placeholder="exemplo@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
          </div>

          {(!esquecendoSenha && (!isCadastro || senhaTemporariaGerada)) && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Senha</label>
              <input disabled={EM_MANUTENCAO} type="password" required={!senhaTemporariaGerada} placeholder="Sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
            </div>
          )}

          <button type="submit" disabled={carregando || EM_MANUTENCAO} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all text-sm">
            {carregando ? "Processando..." : (esquecendoSenha ? "Enviar E-mail" : (isCadastro && senhaTemporariaGerada ? "Fazer Login" : (isCadastro ? "Gerar Acesso" : "Entrar")))}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {!esquecendoSenha && (
            <button type="button" onClick={() => { setIsCadastro(!isCadastro); setErro(""); setSucesso(""); setSenhaTemporariaGerada(""); }} className="text-xs text-blue-600 hover:underline font-medium block w-full">
              {isCadastro ? "Já tenho conta. Fazer Login" : "Não tem acesso? Cadastrar"}
            </button>
          )}
          {!isCadastro && (
            <button type="button" onClick={() => { setEsquecendoSenha(!esquecendoSenha); setErro(""); setSucesso(""); }} className="text-xs text-slate-500 hover:underline font-medium block w-full">
              {esquecendoSenha ? "Voltar ao Login" : "Esqueci minha senha"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}