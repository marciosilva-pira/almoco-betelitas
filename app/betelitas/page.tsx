"use client";

import { useState, useEffect } from "react";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc
} from "firebase/firestore";

import { db } from "../../lib/firebase";

export default function BetelitasPage() {
    // Estados do Formulário
    const [idEdicao, setIdEdicao] = useState<string | null>(null);
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [telefone, setTelefone] = useState("");
    const [status, setStatus] = useState("Ativo");

    const [betelitas, setBetelitas] = useState<any[]>([]);

    // Estados: Busca e Paginação
    const [filtroBusca, setFiltroBusca] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 10; // Limite visual de 10 por página[cite: 13]

    useEffect(() => {
        carregarBetelitas();
    }, []);

    async function carregarBetelitas() {
        try {
            const snapshot = await getDocs(collection(db, "betelitas"));
            const lista: any[] = [];
            snapshot.forEach((doc) => {
                lista.push({
                    id: doc.id,
                    ...doc.data(),
                });
            });
            
            // Ordena os betelitas por nome em ordem alfabética
            lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
            setBetelitas(lista);
        } catch (error) {
            console.error("Erro ao buscar betelitas:", error);
        }
    }

    function iniciarEdicao(betelita: any) {
        setIdEdicao(betelita.id);
        setNome(betelita.nome || "");
        setEmail(betelita.email || "");
        setTelefone(betelita.telefone || "");
        setStatus(betelita.status || "Ativo");
        
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll suave até o topo[cite: 13]
    }

    function cancelarEdicao() {
        setIdEdicao(null);
        limparFormulario();
    }

    function limparFormulario() {
        setNome("");
        setEmail("");
        setTelefone("");
        setStatus("Ativo");
    }

    async function excluirBetelita(id: string) {
        if (!confirm("Deseja realmente remover este Betelita?")) {
            return;
        }
        await deleteDoc(doc(db, "betelitas", id));
        if (idEdicao === id) cancelarEdicao();
        carregarBetelitas();
    }

    async function salvarBetelita() {
        if (!nome) {
            alert("Por favor, preencha o Nome do Betelita.");
            return;
        }

        try {
            const dadosBetelita = {
                nome,
                email,
                telefone,
                status,
                dataAtualizacao: new Date().toISOString()
            };

            if (idEdicao) {
                await updateDoc(doc(db, "betelitas", idEdicao), dadosBetelita);
                alert("Cadastro de Betelita atualizado com sucesso!");
                setIdEdicao(null);
            } else {
                await addDoc(collection(db, "betelitas"), {
                    ...dadosBetelita,
                    dataCadastro: new Date().toISOString(),
                });
                alert("Betelita cadastrado com sucesso!");
            }

            limparFormulario();
            await carregarBetelitas();
        } catch (error) {
            console.error(error);
            alert("Erro ao processar operação.");
        }
    }

    // LÓGICA DE FILTRAGEM DINÂMICA
    const betelitasFiltrados = betelitas.filter(betelita => {
        const termo = filtroBusca.toLowerCase();
        return (
            betelita.nome?.toLowerCase().includes(termo) ||
            betelita.email?.toLowerCase().includes(termo) ||
            betelita.telefone?.toLowerCase().includes(termo)
        );
    });

    // LÓGICA DE PAGINAÇÃO[cite: 13]
    const totalPaginas = Math.ceil(betelitasFiltrados.length / itensPorPagina) || 1;
    const indiceUltimoItem = paginaAtual * itensPorPagina;
    const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
    const betelitasPaginados = betelitasFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);

    // Reseta para a primeira página ao pesquisar[cite: 13]
    useEffect(() => {
        setPaginaAtual(1);
    }, [filtroBusca]);

    return (
        <div className="px-4 py-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
            
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Gestão de Betelitas
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Cadastre e gerencie a equipe de colaboradores e voluntários dedicados ao projeto.
                </p>
            </div>

            {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
            <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${idEdicao ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}>
                <div className={`border-b p-5 flex justify-between items-center ${idEdicao ? 'border-amber-100 bg-amber-50/45' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        {idEdicao ? (
                            <>
                                <span className="text-amber-500">✏️</span> Editar Betelita
                            </>
                        ) : (
                            <>
                                <span className="text-blue-500">➕</span> Cadastrar Novo Betelita
                            </>
                        )}
                    </h3>
                    {idEdicao && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded">
                            Modo de Edição Ativo
                        </span>
                    )}
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nome Completo</label>
                            <input
                                type="text"
                                placeholder="Ex: Carlos Alberto Souza"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Telefone / Whatsapp</label>
                            <input
                                type="text"
                                placeholder="(19) 99999-9999"
                                value={telefone}
                                onChange={(e) => setTelefone(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Status do Cadastro</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                            >
                                <option value="Ativo">🟢 Ativo</option>
                                <option value="Inativo">🔴 Inativo</option>
                            </select>
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">E-mail</label>
                            <input
                                type="email"
                                placeholder="carlos@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        {idEdicao && (
                            <button
                                onClick={cancelarEdicao}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={salvarBetelita}
                            className={`px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all text-white ${
                                idEdicao 
                                ? 'bg-amber-600 hover:bg-amber-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {idEdicao ? "💾 Atualizar Betelita" : "💾 Salvar Betelita"}
                        </button>
                    </div>
                </div>
            </div>

            {/* SEÇÃO DA TABELA DINÂMICA (DATAGRID) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* BARRA DE FILTROS DO DATAGRID */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">
                            Betelitas Cadastrados ({betelitasFiltrados.length})
                        </h3>
                        <p className="text-xs text-slate-400">Total geral no banco: {betelitas.length}</p>
                    </div>

                    {/* Campo de Busca ERP */}
                    <div className="relative w-full sm:w-72">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">
                            🔍
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nome, contato ou e-mail..."
                            value={filtroBusca}
                            onChange={(e) => setFiltroBusca(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                        />
                        {filtroBusca && (
                            <button 
                                onClick={() => setFiltroBusca("")}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* TABELA DE DADOS COMPACTA */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                                <th className="px-6 py-3.5">Nome do Betelita</th>
                                <th className="px-6 py-3.5">Contato / E-mail</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5">Cadastrado em</th>
                                <th className="px-6 py-3.5 text-right w-36">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {betelitasPaginados.length > 0 ? (
                                betelitasPaginados.map((betelita) => (
                                    <tr 
                                        key={betelita.id} 
                                        className={`hover:bg-slate-50/70 transition-colors ${
                                            idEdicao === betelita.id ? 'bg-amber-50/40' : ''
                                        }`}
                                    >
                                        {/* Nome */}
                                        <td className="px-6 py-3.5">
                                            <p className="font-semibold text-slate-800">{betelita.nome}</p>
                                        </td>
                                        {/* Contato */}
                                        <td className="px-6 py-3.5 text-xs">
                                            <p className="font-medium text-slate-700">{betelita.telefone || "—"}</p>
                                            <p className="text-slate-400 text-[11px]">{betelita.email || "—"}</p>
                                        </td>
                                        {/* Status */}
                                        <td className="px-6 py-3.5 text-xs">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                                betelita.status === "Ativo" 
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                : 'bg-red-50 text-red-700 border border-red-200'
                                            }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${betelita.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {betelita.status || "Ativo"}
                                            </span>
                                        </td>
                                        {/* Data Cadastro */}
                                        <td className="px-6 py-3.5 text-xs text-slate-500">
                                            {betelita.dataCadastro 
                                                ? new Date(betelita.dataCadastro).toLocaleDateString("pt-BR") 
                                                : "—"}
                                        </td>
                                        {/* Ações */}
                                        <td className="px-6 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => iniciarEdicao(betelita)}
                                                    className="text-amber-600 hover:text-amber-700 font-semibold text-xs hover:bg-amber-50 px-2.5 py-1.5 rounded-md transition-colors"
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    onClick={() => excluirBetelita(betelita.id)}
                                                    className="text-red-600 hover:text-red-700 font-semibold text-xs hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-colors"
                                                >
                                                    🗑️ Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                                        Nenhum voluntário localizado para o filtro digitado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* CONTROLES DE PAGINAÇÃO */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                        Mostrando de {indicePrimeiroItem + 1} a {Math.min(indiceUltimoItem, betelitasFiltrados.length)} de {betelitasFiltrados.length} resultados
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                            disabled={paginaAtual === 1}
                            className="px-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white text-slate-600 hover:bg-slate-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ◀ Anterior
                        </button>
                        <span className="text-xs text-slate-600 px-3 font-semibold">
                            Página {paginaAtual} de {totalPaginas}
                        </span>
                        <button
                            onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                            disabled={paginaAtual === totalPaginas}
                            className="px-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white text-slate-600 hover:bg-slate-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Próximo ▶
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}