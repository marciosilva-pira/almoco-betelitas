"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getFirestore } from "firebase/firestore"; // Importações do Firestore adicionadas
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
      console.error(error);
      if (
        error.code === "auth/invalid-credential" || 
        error.code === "auth/user-not-found" || 
        error.code === "auth/wrong-password"
      ) {
        setErro("E-mail ou senha incorretos.");
      } else {
        setErro("Ocorreu um erro ao tentar entrar. Tente novamente.");
      }
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
      // Cria o usuário no Firebase Auth[cite: 5]
      const userCredential = await createUserWithEmailAndPassword(auth, email, senhaProvisoria);
      
      // Salva no Firestore que ele é um usuário comum[cite: 5]
      const db = getFirestore();
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        role: "usuario", // Define nível de acesso inicial[cite: 5]
        criadoEm: new Date()
      });
      
      setSenhaTemporariaGerada(senhaProvisoria);
      setSucesso("Conta criada com sucesso!");
      
      setSenha("");
      setIsCadastro(false);
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está cadastrado no sistema.");
      } else if (error.code === "auth/invalid-email") {
        setErro("Formato de e-mail inválido.");
      } else {
        setErro("Erro ao cadastrar usuário. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg max-w-md w-full mx-4">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">
        {isCadastro ? "Criar Novo Usuário" : "Almoço Betelitas"}
      </h2>
      
      {erro && (
        <div className="bg-red-50 text-red-600 border border-red-200 text-sm p-3 rounded-lg mb-4 text-center">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm p-4 rounded-lg mb-4 text-left">
          <p className="font-bold mb-1">🎉 {sucesso}</p>
          <p className="text-xs">
            Sua conta foi criada. Use a senha temporária abaixo para o primeiro login:
          </p>
          <div className="bg-white border border-emerald-200 text-center font-mono text-lg font-bold py-2 rounded-md my-2 tracking-widest text-slate-800">
            {senhaTemporariaGerada}
          </div>
        </div>
      )}

      <form onSubmit={isCadastro ? handleCadastro : handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            E-mail
          </label>
          <input
            type="email"
            required
            placeholder="exemplo@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          />
        </div>

        {!isCadastro && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all text-sm disabled:opacity-50"
        >
          {carregando ? "Processando..." : isCadastro ? "Gerar Acesso Temporário" : "Entrar"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setIsCadastro(!isCadastro);
            setErro("");
            setSucesso("");
          }}
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          {isCadastro ? "Já tenho uma conta. Fazer Login" : "Não tem acesso? Cadastrar Novo Usuário"}
        </button>
      </div>
    </div>
  );
}