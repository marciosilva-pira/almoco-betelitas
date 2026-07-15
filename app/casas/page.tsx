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

export default function CasasPage() {
    // Estados do Formulário
    const [idEdicao, setIdEdicao] = useState<string | null>(null);
    const [numeroCasa, setNumeroCasa] = useState("");
    const [nomeFamilia, setNomeFamilia] = useState("");
    const [responsavel, setResponsavel] = useState("");
    const [telefone, setTelefone] = useState("");
    const [logradouro, setLogradouro] = useState("");
    const [numeroEndereco, setNumeroEndereco] = useState("");
    const [bairro, setBairro] = useState("");
    const [cidade, setCidade] = useState("");
    const [cep, setCep] = useState("");

    // Estados da Listagem e Filtros
    const [casas, setCasas] = useState<any[]>([]);
    const [pesquisa, setPesquisa] = useState(""); // Filtro de busca
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 10; // Quantas casas aparecem por vez na tela

    useEffect(() => {
        carregarCasas();
    }, []);

    // Calcula e define automaticamente o próximo número de casa disponível
    useEffect(() => {
        if (!idEdicao && casas.length > 0) {
            const numeros = casas.map(c => Number(c.numeroCasa) || 0);
            const maiorNumero = Math.max(...numeros, 0);
            setNumeroCasa((maiorNumero + 1).toString());
        } else if (!idEdicao && casas.length === 0) {
            setNumeroCasa("1");
        }
    }, [casas, idEdicao]);

    async function carregarCasas() {
        const snapshot = await getDocs(collection(db, "houses"));
        const lista: any[] = [];
        snapshot.forEach((doc) => {
            lista.push({
                id: doc.id,
                ...doc.data(),
            });
        });
        
        // Ordena as casas por número para uma visualização limpa
        lista.sort((a, b) => (Number(a.numeroCasa) || 0) - (Number(b.numeroCasa) || 0));
        setCasas(lista);
    }

    // Preenche o formulário com os dados da casa selecionada para editar
    function iniciarEdicao(casa: any) {
        setIdEdicao(casa.id);
        setNumeroCasa(casa.numeroCasa.toString());
        setNomeFamilia(casa.nomeFamilia || "");
        setResponsavel(casa.responsavel || "");
        setTelefone(casa.telefone || "");
        setLogradouro(casa.logradouro || "");
        setNumeroEndereco(casa.numeroEndereco || "");
        setBairro(casa.bairro || "");
        setCidade(casa.cidade || "");
        setCep(casa.cep || "");
        
        // Scroll suave até o topo do formulário
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelarEdicao() {
        setIdEdicao(null);
        limparFormulario();
    }

    function limparFormulario() {
        setNumeroCasa("");
        setNomeFamilia("");
        setResponsavel("");
        setTelefone("");
        setLogradouro("");
        setNumeroEndereco("");
        setBairro("");
        setCidade("");
        setCep("");
    }

    async function excluirCasa(id: string) {
        if (!confirm("Deseja excluir esta casa?")) {
            return;
        }
        await deleteDoc(doc(db, "houses", id));
        if (idEdicao === id) cancelarEdicao();
        carregarCasas();
    }

    async function salvarCasa() {
        if (!numeroCasa || !nomeFamilia) {
            alert("Por favor, preencha o número da casa e o nome da família.");
            return;
        }

        const numCasaNumero = Number(numeroCasa);

        const numeroJaExiste = casas.some(casa =>
            Number(casa.numeroCasa) === numCasaNumero && casa.id !== idEdicao
        );

        if (numeroJaExiste) {
            alert(`O número identificador #${numCasaNumero} já está cadastrado em outra casa!`);
            return;
        }

        try {
            const dadosCasa = {
                numeroCasa: numCasaNumero,
                nomeFamilia,
                responsavel,
                telefone,
                logradouro,
                numeroEndereco,
                bairro,
                cidade,
                cep,
                ativo: true,
            };

            if (idEdicao) {
                await updateDoc(doc(db, "houses", idEdicao), dadosCasa);
                alert("Cadastro atualizado com sucesso!");
                setIdEdicao(null);
            } else {
                await addDoc(collection(db, "houses"), {
                    ...dadosCasa,
                    totalAlmocosRecebidos: 0
                });
                alert("Casa salva com sucesso!");
            }

            limparFormulario();
            await carregarCasas();
        } catch (error) {
            console.error(error);
            alert("Erro ao processar operação.");
        }
    }

    // Lógica do Filtro Dinâmico (Busca em tempo real)
    const casasFiltradas = casas.filter((casa) => {
        const termo = pesquisa.toLowerCase();
        return (
            casa.numeroCasa?.toString().includes(termo) ||
            casa.nomeFamilia?.toLowerCase().includes(termo) ||
            casa.responsavel?.toLowerCase().includes(termo) ||
            casa.bairro?.toLowerCase().includes(termo) ||
            casa.telefone?.includes(termo)
        );
    });

    // Lógica de Paginação (divide o array de casas filtradas)
    const totalPaginas = Math.ceil(casasFiltradas.length / itensPorPagina) || 1;
    const indiceUltimoItem = paginaAtual * itensPorPagina;
    const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
    const casasPaginadas = casasFiltradas.slice(indicePrimeiroItem, indiceUltimoItem);

    // Reinicia para a página 1 toda vez que o termo de pesquisa mudar
    useEffect(() => {
        setPaginaAtual(1);
    }, [pesquisa]);

    return (
        <div className="px-4 py-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
            
            {/* TÍTULO DA SEÇÃO */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Gestão de Casas
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Cadastre e gerencie as residências e famílias que participam da distribuição de almoço.
                </p>
            </div>

            {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
            <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${idEdicao ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}>
                <div className={`border-b p-5 flex justify-between items-center ${idEdicao ? 'border-amber-100 bg-amber-50/45' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        {idEdicao ? (
                            <>
                                <span className="text-amber-500">✏️</span> Editar Residência #{numeroCasa}
                            </>
                        ) : (
                            <>
                                <span className="text-blue-500">➕</span> Adicionar Nova Residência
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
                        {/* Informações Básicas */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Número Identificador</label>
                                {!idEdicao && (
                                    <span className="text-[10px] text-blue-600 bg-blue-50 font-bold px-1.5 py-0.2 rounded uppercase">
                                        Gerado Automaticamente
                                    </span>
                                )}
                            </div>
                            <input
                                type="number"
                                placeholder="Ex: 4"
                                value={numeroCasa}
                                onChange={(e) => setNumeroCasa(e.target.value)}
                                disabled={!idEdicao}
                                className={`w-full border p-2.5 text-sm rounded-lg outline-none transition-all ${
                                    !idEdicao 
                                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-semibold' 
                                    : 'border-amber-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                                }`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nome da Família</label>
                            <input
                                type="text"
                                placeholder="Ex: Família Silva"
                                value={nomeFamilia}
                                onChange={(e) => setNomeFamilia(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Responsável</label>
                            <input
                                type="text"
                                placeholder="Ex: João Silva"
                                value={responsavel}
                                onChange={(e) => setResponsavel(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        {/* Contato e Endereço */}
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

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Logradouro (Rua/Avenida)</label>
                            <input
                                type="text"
                                placeholder="Rua das Palmeiras"
                                value={logradouro}
                                onChange={(e) => setLogradouro(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Número Endereço</label>
                            <input
                                type="text"
                                placeholder="123"
                                value={numeroEndereco}
                                onChange={(e) => setNumeroEndereco(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Bairro</label>
                            <input
                                type="text"
                                placeholder="Centro"
                                value={bairro}
                                onChange={(e) => setBairro(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Cidade</label>
                            <input
                                type="text"
                                placeholder="Piracicaba"
                                value={cidade}
                                onChange={(e) => setCidade(e.target.value)}
                                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">CEP</label>
                            <input
                                type="text"
                                placeholder="00000-000"
                                value={cep}
                                onChange={(e) => setCep(e.target.value)}
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
                            onClick={salvarCasa}
                            className={`px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all text-white ${
                                idEdicao 
                                ? 'bg-amber-600 hover:bg-amber-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {idEdicao ? "💾 Atualizar Cadastro" : "💾 Salvar Cadastro"}
                        </button>
                    </div>
                </div>
            </div>

            {/* SEÇÃO DA TABELA (NOVO LAYOUT PARA SUPORTAR +80 CASAS PROFISSIONALMENTE) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* BARRA DE PESQUISA SUPERIOR */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">
                            Base de Casas Cadastradas
                        </h3>
                        <p className="text-xs text-slate-500">
                            Exibindo {casasFiltradas.length} de {casas.length} registros no total.
                        </p>
                    </div>

                    {/* Campo de Pesquisa em Tempo Real */}
                    <div className="relative w-full md:w-80">
                        <span className="absolute left-3.5 top-3.5 text-slate-400 text-xs">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por número, família, resp. ou bairro..."
                            value={pesquisa}
                            onChange={(e) => setPesquisa(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-slate-700 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white"
                        />
                        {pesquisa && (
                            <button 
                                onClick={() => setPesquisa("")}
                                className="absolute right-3 top-2.5 text-[10px] text-slate-400 hover:text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded"
                            >
                                Limpar
                            </button>
                        )}
                    </div>
                </div>

                {/* TABELA DE DADOS COMPACTA */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-slate-600">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                                <th className="py-3.5 px-6 w-24 text-center">Nº Identificador</th>
                                <th className="py-3.5 px-6">Família / Responsável</th>
                                <th className="py-3.5 px-6">Telefone</th>
                                <th className="py-3.5 px-6">Bairro / Cidade</th>
                                <th className="py-3.5 px-6">Endereço Completo</th>
                                <th className="py-3.5 px-6 text-right w-44">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {casasPaginadas.length > 0 ? (
                                casasPaginadas.map((casa) => (
                                    <tr 
                                        key={casa.id} 
                                        className={`hover:bg-slate-50/70 transition-colors ${
                                            idEdicao === casa.id ? 'bg-amber-50/40 font-medium' : ''
                                        }`}
                                    >
                                        {/* ID da Casa */}
                                        <td className="py-3 px-6 text-center">
                                            <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold px-2.5 py-1 rounded">
                                                #{casa.numeroCasa}
                                            </span>
                                        </td>
                                        {/* Família e Responsável */}
                                        <td className="py-3 px-6">
                                            <div className="font-semibold text-slate-800">{casa.nomeFamilia}</div>
                                            <div className="text-xs text-slate-400">Resp: {casa.responsavel || "Não informado"}</div>
                                        </td>
                                        {/* Telefone */}
                                        <td className="py-3 px-6 font-medium text-slate-700">
                                            {casa.telefone || "—"}
                                        </td>
                                        {/* Bairro / Cidade */}
                                        <td className="py-3 px-6">
                                            <div className="text-slate-700">{casa.bairro || "—"}</div>
                                            <div className="text-xs text-slate-400">{casa.cidade || "—"}</div>
                                        </td>
                                        {/* Endereço */}
                                        <td className="py-3 px-6 text-xs text-slate-500 max-w-xs truncate">
                                            {casa.logradouro}, {casa.numeroEndereco} {casa.cep ? `(CEP: ${casa.cep})` : ""}
                                        </td>
                                        {/* Ações */}
                                        <td className="py-3 px-6 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <button
                                                    onClick={() => iniciarEdicao(casa)}
                                                    className="text-amber-600 hover:text-amber-700 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-amber-50 transition-all border border-transparent hover:border-amber-200"
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    onClick={() => excluirCasa(casa.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                                                >
                                                    🗑️ Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400 bg-slate-50/20">
                                        <span className="text-2xl">🔍</span>
                                        <p className="text-sm font-semibold mt-2">Nenhuma casa correspondente encontrada</p>
                                        <p className="text-xs text-slate-400 mt-1">Experimente remover alguns termos da busca.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* BARRA DE PAGINAÇÃO COMPACTA */}
                {casasFiltradas.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            Mostrando {indicePrimeiroItem + 1} a {Math.min(indiceUltimoItem, casasFiltradas.length)} de {casasFiltradas.length} residências
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                                disabled={paginaAtual === 1}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                ⬅️ Anterior
                            </button>
                            <div className="text-xs font-semibold text-slate-700 px-2 select-none">
                                Página {paginaAtual} de {totalPaginas}
                            </div>
                            <button
                                onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                                disabled={paginaAtual === totalPaginas}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Próxima ➡️
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}