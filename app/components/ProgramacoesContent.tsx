"use client";

import { useEffect, useState } from "react";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";

import { db } from "../../lib/firebase";

interface AgendamentoExistente {
    id: string;
    casaId: string;
    casaNome: string;
    participantes: string[];
}

export default function ProgramacoesPage() {
    const [data, setData] = useState("");
    const [casaId, setCasaId] = useState("");

    const [casas, setCasas] = useState<any[]>([]);
    const [betelitas, setBetelitas] = useState<any[]>([]);

    // Armazena onde cada betelita já está alocado na data selecionada
    // Formato: { [betelitaId]: { agendamentoId, casaId, casaNome } }
    const [alocacoesNaData, setAlocacoesNaData] = useState<Record<string, { agendamentoId: string; casaId: string; casaNome: string }>>({});

    // Armazena o status real consolidado de cada betelita já salvo no banco para a data
    const [statusConsolidadosNaData, setStatusConsolidadosNaData] = useState<Record<string, string>>({});

    const [statusParticipantes, setStatusParticipantes] = useState<Record<string, string>>({});
    const [filtroBusca, setFiltroBusca] = useState("");

    useEffect(() => {
        carregarDados();
    }, []);

    // Monitora a mudança de data para buscar agendamentos já existentes neste dia
    useEffect(() => {
        if (data) {
            buscarAgendamentosNaData(data);
        } else {
            setAlocacoesNaData({});
            setStatusConsolidadosNaData({});
        }
    }, [data, casas]);

    async function carregarDados() {
        try {
            // Busca as casas do Firestore
            const casasSnapshot = await getDocs(collection(db, "houses"));
            const listaCasas: any[] = [];
            casasSnapshot.forEach((doc) => {
                listaCasas.push({ id: doc.id, ...doc.data() });
            });
            listaCasas.sort((a, b) => Number(a.numeroCasa || 0) - Number(b.numeroCasa || 0));
            setCasas(listaCasas);

            // Busca os betelitas ativos
            const betelitasSnapshot = await getDocs(collection(db, "betelitas"));
            const listaBetelitas: any[] = [];
            betelitasSnapshot.forEach((doc) => {
                const dados = doc.data();
                if (dados.status !== "Inativo") {
                    listaBetelitas.push({ id: doc.id, ...dados });
                }
            });
            listaBetelitas.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
            setBetelitas(listaBetelitas);

            // Inicializa todos como "naoComparecera" (Ausente)
            const inicialStatus: Record<string, string> = {};
            listaBetelitas.forEach(b => {
                inicialStatus[b.id] = "naoComparecera";
            });
            setStatusParticipantes(inicialStatus);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }

    // Busca agendamentos salvos para a data e mapeia quem já está ocupado
    async function buscarAgendamentosNaData(dataSelecionada: string) {
        try {
            const q = query(collection(db, "lunchSchedules"), where("data", "==", dataSelecionada));
            const querySnapshot = await getDocs(q);

            const mapaAlocacoes: Record<string, { agendamentoId: string; casaId: string; casaNome: string }> = {};
            const mapaStatusConsolidados: Record<string, string> = {};

            querySnapshot.forEach((documento) => {
                const dados = documento.data();
                const casaEncontrada = casas.find(c => c.id === dados.casaId);

                // Primeiro salvamos temporariamente os status deste documento
                const statusTemp: Record<string, string> = {};
                if (dados.statusParticipantes) {
                    Object.entries(dados.statusParticipantes).forEach(([betelitaId, status]) => {
                        if (dados.participantes?.includes(betelitaId)) {
                            mapaStatusConsolidados[betelitaId] = status as string;
                            statusTemp[betelitaId] = status as string;
                        }
                    });
                }

                // Varre os participantes deste agendamento existente
                if (dados.participantes && Array.isArray(dados.participantes)) {
                    dados.participantes.forEach((betelitaId: string) => {
                        let casaNome = "";
                        
                        if (casaEncontrada) {
                            casaNome = `Casa ${casaEncontrada.numeroCasa} — ${casaEncontrada.nomeFamilia}`;
                        } else {
                            // Se não tiver casaId associada, gera a tag de acordo com o status real dele
                            const statusReal = statusTemp[betelitaId] || "";
                            if (statusReal === "comparecerParticular") {
                                casaNome = "Arranjo Particular";
                            } else if (statusReal === "comparecerSemAlmoco") {
                                casaNome = "Sem Almoço";
                            } else {
                                casaNome = "Ausentes";
                            }
                        }

                        mapaAlocacoes[betelitaId] = {
                            agendamentoId: documento.id,
                            casaId: dados.casaId || "",
                            casaNome: casaNome
                        };
                    });
                }
            });

            setAlocacoesNaData(mapaAlocacoes);
            setStatusConsolidadosNaData(mapaStatusConsolidados);
        } catch (error) {
            console.error("Erro ao buscar agendamentos na data:", error);
        }
    }

    // Função para remover um betelita de um agendamento anterior caso você precise remanejá-lo
    async function liberarBetelita(betelitaId: string, nomeBetelita: string) {
        const alocacao = alocacoesNaData[betelitaId];
        if (!alocacao) return;

        const confirmar = window.confirm(
            `O(A) ${nomeBetelita} já está agendado(a) no status "${alocacao.casaNome}". Deseja removê-lo(a) de lá para agendar nesta nova configuração?`
        );

        if (!confirmar) return;

        try {
            // 1. Busca o documento do agendamento anterior no Firestore
            const agendamentoRef = doc(db, "lunchSchedules", alocacao.agendamentoId);
            const snapshot = await getDocs(query(collection(db, "lunchSchedules")));

            let agendamentoDoc: any = null;
            snapshot.forEach(d => {
                if (d.id === alocacao.agendamentoId) agendamentoDoc = d.data();
            });

            if (agendamentoDoc) {
                // Remove o ID do array de participantes
                const novosParticipantes = (agendamentoDoc.participantes || []).filter((id: string) => id !== betelitaId);

                // Se não sobrar nenhum participante neste agendamento antigo, exclui o documento do banco
                if (novosParticipantes.length === 0) {
                    await deleteDoc(agendamentoRef);
                    alert(`${nomeBetelita} foi removido(a) e o registro de "${alocacao.casaNome}" foi excluído.`);
                } else {
                    // Caso contrário, apenas atualiza removendo o participante e ajustando o status
                    const novosStatus = { ...agendamentoDoc.statusParticipantes };
                    delete novosStatus[betelitaId]; // Deleta o status antigo para limpar completamente

                    await updateDoc(agendamentoRef, {
                        participantes: novosParticipantes,
                        statusParticipantes: novosStatus
                    });

                    alert(`${nomeBetelita} foi removido(a) do registro de "${alocacao.casaNome}" com sucesso!`);
                }

                // Recarrega as alocações da data para atualizar a tela
                buscarAgendamentosNaData(data);
            }
        } catch (error) {
            console.error("Erro ao liberar Betelita:", error);
            alert("Não foi possível liberar o Betelita do agendamento anterior.");
        }
    }

    function alterarStatus(betelitaId: string, status: string) {
        setStatusParticipantes(prev => ({
            ...prev,
            [betelitaId]: status
        }));
    }

    async function salvarProgramacao() {
        if (!data) {
            alert("Por favor, selecione a Data do Almoço.");
            return;
        }

        // Separação em grupos
        const participantesDaCasaIds: string[] = [];
        const statusDaCasa: Record<string, string> = {};

        const participantesAusentesIds: string[] = [];
        const statusAusentes: Record<string, string> = {};

        // Filtramos apenas quem NÃO está travado por escala já existente no banco de dados para evitar duplicidade
        const participantesLivresParaSalvar = Object.entries(statusParticipantes).filter(
            ([id]) => !alocacoesNaData[id]
        );

        if (participantesLivresParaSalvar.length === 0) {
            alert("Não há nenhuma alteração pendente para salvar nesta data.");
            return;
        }

        participantesLivresParaSalvar.forEach(([id, status]) => {
            if (status === "naoComparecera") {
                participantesAusentesIds.push(id);
                statusAusentes[id] = status;
            } else {
                participantesDaCasaIds.push(id);
                statusDaCasa[id] = status;
            }
        });

        // Valida se há alguém agendado para comer na casa mas nenhuma casa foi selecionada
        const temAlguemParaAlmocar = participantesDaCasaIds.some(
            id => statusDaCasa[id] === "vaiAlmocar"
        );

        if (temAlguemParaAlmocar && !casaId) {
            alert("Por favor, selecione a Casa que servirá o almoço, pois há participantes escalados para almoçar.");
            return;
        }

        const confirmar = window.confirm("Deseja salvar o status dos participantes editados para este dia?");
        if (!confirmar) return;

        try {
            // GRAVAÇÃO 1: Se houver pessoas associadas à Casa (Almoço / Sem almoço / Particular)
            if (participantesDaCasaIds.length > 0) {
                await addDoc(collection(db, "lunchSchedules"), {
                    data,
                    casaId: casaId || "", 
                    participantes: participantesDaCasaIds,
                    statusParticipantes: statusDaCasa,
                    criadoEm: new Date().toISOString(),
                });
            }

            // GRAVAÇÃO 2: Se houver pessoas ausentes (Serão salvas em um registro com casa vazia)
            if (participantesAusentesIds.length > 0) {
                await addDoc(collection(db, "lunchSchedules"), {
                    data,
                    casaId: "", // Sempre sem casa
                    participantes: participantesAusentesIds,
                    statusParticipantes: statusAusentes,
                    criadoEm: new Date().toISOString(),
                });
            }

            alert("Programação salva com sucesso!");

            // Atualiza as alocações da tela imediatamente sem perder o estado atual da lista
            buscarAgendamentosNaData(data);
            
            // Reseta a seleção da casa se necessário
            setCasaId("");
        } catch (error) {
            console.error("Erro ao salvar programação:", error);
            alert("Ocorreu um erro ao gravar no banco de dados.");
        }
    }

    // Verifica se já existe algum planejamento consolidado para este dia
    const temProgramacaoSalvaNaData = Object.keys(alocacoesNaData).length > 0;

    // CONTADORES INTELIGENTES
    const totalConfirmadosAlmoco = temProgramacaoSalvaNaData
        ? Object.values(statusConsolidadosNaData).filter(v => v === "vaiAlmocar").length
        : Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "vaiAlmocar").length;

    const totalSemAlmoco = temProgramacaoSalvaNaData
        ? Object.values(statusConsolidadosNaData).filter(v => v === "comparecerSemAlmoco").length
        : Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "comparecerSemAlmoco").length;

    const totalArranjoParticular = temProgramacaoSalvaNaData
        ? Object.values(statusConsolidadosNaData).filter(v => v === "comparecerParticular").length
        : Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "comparecerParticular").length;

    const totalAusentes = temProgramacaoSalvaNaData
        ? Object.values(statusConsolidadosNaData).filter(v => v === "naoComparecera").length
        : Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "naoComparecera").length;

    // FILTRO DE BUSCA DE BETELITAS
    const betelitasFiltrados = betelitas.filter(b =>
        b.nome?.toLowerCase().includes(filtroBusca.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">

            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Nova Programação de Almoço
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Selecione a data, a residência anfitriã e defina o status de presença dos Betelitas convidados.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* PARTE ESQUERDA: DEFINIÇÕES DO ALMOÇO */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-3 border-slate-100">
                            📍 Detalhes Básicos
                        </h3>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                Data do Almoço
                            </label>
                            <input
                                type="date"
                                value={data}
                                onChange={(e) => setData(e.target.value)}
                                className="w-full border border-slate-200 p-3 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                Casa Anfitriã (Família) <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional se não houver almoço)</span>
                            </label>
                            <select
                                value={casaId}
                                onChange={(e) => setCasaId(e.target.value)}
                                className="w-full border border-slate-200 p-3 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                            >
                                <option value="">Nenhuma / Apenas registro de status</option>
                                {casas.map((casa) => (
                                    <option key={casa.id} value={casa.id}>
                                        Casa {casa.numeroCasa} — {casa.nomeFamilia}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* PAINEL DE CONTADORES EM TEMPO REAL */}
                    <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                            <span>📊 Resumo do Planejamento</span>
                            {temProgramacaoSalvaNaData && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-medium normal-case">
                                    Consolidado do Dia
                                </span>
                            )}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Vão Almoçar</p>
                                <p className="text-2xl font-bold text-emerald-400 mt-1">{totalConfirmadosAlmoco}</p>
                            </div>
                            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Vêm (Sem Almoço)</p>
                                <p className="text-2xl font-bold text-amber-400 mt-1">{totalSemAlmoco}</p>
                            </div>
                            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Arranjo Part.</p>
                                <p className="text-2xl font-bold text-blue-400 mt-1">{totalArranjoParticular}</p>
                            </div>
                            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Não Vêm</p>
                                <p className="text-2xl font-bold text-rose-400 mt-1">{totalAusentes}</p>
                            </div>
                        </div>

                        <button
                            onClick={salvarProgramacao}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg text-sm font-bold shadow-lg transition-all mt-2 active:scale-[0.98]"
                        >
                            💾 Salvar Programação
                        </button>
                    </div>
                </div>

                {/* PARTE DIREITA: CONTROLE DE PRESENÇA DOS BETELITAS */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Filtro de Busca de Betelitas */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            👥 Presença de Betelitas ({betelitasFiltrados.length})
                        </span>

                        <div className="relative w-full sm:w-64">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar Betelita..."
                                value={filtroBusca}
                                onChange={(e) => setFiltroBusca(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                            />
                        </div>
                    </div>

                    {/* LISTAGEM DE CARDS DE BETELITAS */}
                    <div className="space-y-3">
                        {betelitasFiltrados.length > 0 ? (
                            betelitasFiltrados.map((item) => {
                                const statusAtual = statusParticipantes[item.id] || "naoComparecera";

                                // Verifica se o Betelita já está alocado em algum outro agendamento nesta data
                                const alocacaoExistente = alocacoesNaData[item.id];

                                let cardBorder = "border-slate-200";

                                if (alocacaoExistente) {
                                    cardBorder = "border-amber-300 bg-amber-50/10 opacity-90";
                                } else if (statusAtual === "vaiAlmocar") {
                                    cardBorder = "border-emerald-200 bg-emerald-50/15";
                                } else if (statusAtual === "comparecerSemAlmoco") {
                                    cardBorder = "border-amber-200 bg-amber-50/15";
                                } else if (statusAtual === "comparecerParticular") {
                                    cardBorder = "border-blue-200 bg-blue-50/15";
                                } else if (statusAtual === "naoComparecera") {
                                    cardBorder = "border-slate-100 bg-slate-50/30 opacity-60";
                                }

                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-white p-4 rounded-xl border ${cardBorder} shadow-sm transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-slate-800 text-sm">{item.nome}</p>
                                                {alocacaoExistente && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                                                        Escalado(a): {alocacaoExistente.casaNome}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {item.telefone || "Sem telefone cadastrado"}
                                            </p>
                                        </div>

                                        {/* GRID DE BOTÕES OU AVISO DE LIBERAÇÃO */}
                                        {alocacaoExistente ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => liberarBetelita(item.id, item.nome)}
                                                    className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all"
                                                >
                                                    🔄 Alterar Escala / Remover
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                                                {/* Botão: Vai Almoçar */}
                                                <button
                                                    type="button"
                                                    onClick={() => alterarStatus(item.id, "vaiAlmocar")}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${statusAtual === "vaiAlmocar"
                                                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    🍽️ Almoça
                                                </button>

                                                {/* Botão: Vem, Sem Almoço */}
                                                <button
                                                    type="button"
                                                    onClick={() => alterarStatus(item.id, "comparecerSemAlmoco")}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${statusAtual === "comparecerSemAlmoco"
                                                            ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    🚶 Sem Almoço
                                                </button>

                                                {/* Botão: Arranjo Particular */}
                                                <button
                                                    type="button"
                                                    onClick={() => alterarStatus(item.id, "comparecerParticular")}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${statusAtual === "comparecerParticular"
                                                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    🥪 Part.
                                                </button>

                                                {/* Botão: Não vem */}
                                                <button
                                                    type="button"
                                                    onClick={() => alterarStatus(item.id, "naoComparecera")}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${statusAtual === "naoComparecera"
                                                            ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    ❌ Ausente
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="bg-white p-12 text-center border border-slate-200 rounded-xl text-slate-400 text-sm">
                                Nenhum Betelita ativo encontrado.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}