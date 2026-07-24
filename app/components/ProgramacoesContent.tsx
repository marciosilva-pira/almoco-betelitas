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

export default function ProgramacoesPage() {
    const [data, setData] = useState("");
    const [casaId, setCasaId] = useState("");

    const [casas, setCasas] = useState<any[]>([]);
    const [betelitas, setBetelitas] = useState<any[]>([]);

    // Estados para o Convidado Avulso / Visitante
    const [nomeConvidado, setNomeConvidado] = useState("");
    const [telefoneConvidado, setTelefoneConvidado] = useState("");
    const [convidadosDoDia, setConvidadosDoDia] = useState<any[]>([]);

    // Armazena onde cada betelita/convidado já está alocado na data selecionada
    const [alocacoesNaData, setAlocacoesNaData] = useState<Record<string, { agendamentoId: string; casaId: string; casaNome: string }>>({});

    // Armazena o status real consolidado de cada participante já salvo no banco para a data
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
            setConvidadosDoDia([]);
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
            const listaConvidadosTemp: any[] = [];

            querySnapshot.forEach((documento) => {
                const dados = documento.data();
                const casaEncontrada = casas.find(c => c.id === dados.casaId);

                const statusTemp: Record<string, string> = {};
                if (dados.statusParticipantes) {
                    Object.entries(dados.statusParticipantes).forEach(([betelitaId, status]) => {
                        if (dados.participantes?.includes(betelitaId)) {
                            mapaStatusConsolidados[betelitaId] = status as string;
                            statusTemp[betelitaId] = status as string;
                        }
                    });
                }

                // Recupera convidados salvos neste documento (se houver) e garante o agendamentoId
                if (dados.convidadosAvulsos && Array.isArray(dados.convidadosAvulsos)) {
                    dados.convidadosAvulsos.forEach((conv: any) => {
                        listaConvidadosTemp.push({ ...conv, agendamentoId: documento.id });
                        mapaStatusConsolidados[conv.id] = conv.status || "vaiAlmocar";

                        // Garante que o convidado salvo também entre no mapa de alocações para exibir o botão corretamente
                        mapaAlocacoes[conv.id] = {
                            agendamentoId: documento.id,
                            casaId: dados.casaId || "",
                            casaNome: casaEncontrada ? `Casa ${casaEncontrada.numeroCasa} — ${casaEncontrada.nomeFamilia}` : "Outro Registro"
                        };
                    });
                }

                if (dados.participantes && Array.isArray(dados.participantes)) {
                    dados.participantes.forEach((betelitaId: string) => {
                        let casaNome = "";

                        if (casaEncontrada) {
                            casaNome = `Casa ${casaEncontrada.numeroCasa} — ${casaEncontrada.nomeFamilia}`;
                        } else {
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
            setConvidadosDoDia(listaConvidadosTemp);
        } catch (error) {
            console.error("Erro ao buscar agendamentos na data:", error);
        }
    }

    // Adiciona um convidado avulsamente na tela (antes de salvar)
    function adicionarConvidadoAvulso() {
        if (!nomeConvidado.trim()) {
            alert("Por favor, digite o nome do convidado/visitante.");
            return;
        }

        const novoId = "convidado_" + Date.now();
        const novoConvidadoObj = {
            id: novoId,
            nome: `${nomeConvidado.trim()} (Visitante)`,
            telefone: telefoneConvidado.trim() || "Convidado avulso",
        };

        setConvidadosDoDia(prev => [...prev, novoConvidadoObj]);
        // Define o status padrão inicial como "vaiAlmocar"
        setStatusParticipantes(prev => ({ ...prev, [novoId]: "vaiAlmocar" }));

        // Limpa os campos do formulário de convidado
        setNomeConvidado("");
        setTelefoneConvidado("");
    }

    // Remove convidado avulso da lista local ou do banco
    async function removerConvidado(convidado: any) {
        if (!confirm(`Deseja remover o convidado ${convidado.nome}?`)) return;

        // Se já estava salvo no banco de dados (possui agendamentoId)
        if (convidado.agendamentoId) {
            try {
                const agendamentoRef = doc(db, "lunchSchedules", convidado.agendamentoId);
                const snapshot = await getDocs(query(collection(db, "lunchSchedules")));

                let docData: any = null;
                snapshot.forEach(d => {
                    if (d.id === convidado.agendamentoId) docData = d.data();
                });

                if (docData && docData.convidadosAvulsos) {
                    const novosConvidados = docData.convidadosAvulsos.filter((c: any) => c.id !== convidado.id);
                    const novosStatus = { ...docData.statusParticipantes };
                    delete novosStatus[convidado.id];

                    await updateDoc(agendamentoRef, {
                        convidadosAvulsos: novosConvidados,
                        statusParticipantes: novosStatus
                    });

                    alert("Convidado removido com sucesso!");
                    buscarAgendamentosNaData(data);
                }
            } catch (error) {
                console.error("Erro ao remover convidado:", error);
            }
        } else {
            // Se ainda não estava salvo, apenas remove da tela
            setConvidadosDoDia(prev => prev.filter(c => c.id !== convidado.id));
            setStatusParticipantes(prev => {
                const copia = { ...prev };
                delete copia[convidado.id];
                return copia;
            });
        }
    }

    async function liberarBetelita(betelitaId: string, nomeBetelita: string) {
        const alocacao = alocacoesNaData[betelitaId];
        if (!alocacao) return;

        const confirmar = window.confirm(
            `O(A) ${nomeBetelita} já está agendado(a) no status "${alocacao.casaNome}". Deseja removê-lo(a) de lá para agendar nesta nova configuração?`
        );

        if (!confirmar) return;

        try {
            // Referência direta ao documento usando o ID mapeado
            const agendamentoRef = doc(db, "lunchSchedules", alocacao.agendamentoId);

            // Busca o documento específico diretamente pelo ID (evita percorrer todos os registros)
            const snapshotDoc = await getDocs(query(collection(db, "lunchSchedules")));
            let agendamentoDoc: any = null;
            let docEncontradoRef: any = null;

            snapshotDoc.forEach(d => {
                if (d.id === alocacao.agendamentoId) {
                    agendamentoDoc = d.data();
                    docEncontradoRef = d.ref;
                }
            });

            if (agendamentoDoc && docEncontradoRef) {
                const novosParticipantes = (agendamentoDoc.participantes || []).filter((id: string) => id !== betelitaId);
                const novosConvidados = (agendamentoDoc.convidadosAvulsos || []).filter((c: any) => c.id !== betelitaId);

                if (novosParticipantes.length === 0 && novosConvidados.length === 0) {
                    await deleteDoc(docEncontradoRef);
                } else {
                    const novosStatus = { ...agendamentoDoc.statusParticipantes };
                    delete novosStatus[betelitaId];

                    await updateDoc(docEncontradoRef, {
                        participantes: novosParticipantes,
                        convidadosAvulsos: novosConvidados,
                        statusParticipantes: novosStatus
                    });
                }

                // Atualiza os estados locais imediatamente
                setAlocacoesNaData(prev => {
                    const copia = { ...prev };
                    delete copia[betelitaId];
                    return copia;
                });

                buscarAgendamentosNaData(data);
            }
        } catch (error) {
            console.error("Erro ao liberar Participante:", error);
            alert("Erro ao remover o participante da escala.");
        }
    }

    function alterarStatus(id: string, status: string) {
        setStatusParticipantes(prev => ({
            ...prev,
            [id]: status
        }));
    }

    async function salvarProgramacao() {
        if (!data) {
            alert("Por favor, selecione a Data do Almoço.");
            return;
        }

        // Listas para agrupar as pessoas por tipo
        const participantesDaCasaIds: string[] = [];
        const statusDaCasa: Record<string, string> = {};

        const participantesSemCasaIds: string[] = [];
        const statusSemCasa: Record<string, string> = {};

        const participantesAusentesIds: string[] = [];
        const statusAusentes: Record<string, string> = {};

        // Lista combinada de betelitas livres + convidados novos do dia
        const idsParaProcessar = [
            ...Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && !id.startsWith("convidado_")),
            ...convidadosDoDia.filter(c => !c.agendamentoId).map(c => c.id)
        ];

        if (idsParaProcessar.length === 0 && convidadosDoDia.length === 0) {
            alert("Não há nenhuma alteração pendente para salvar nesta data.");
            return;
        }

        // Separa betelitas normais
        idsParaProcessar.forEach(id => {
            const status = statusParticipantes[id] || "naoComparecera";

            if (status === "naoComparecera") {
                if (!id.startsWith("convidado_")) {
                    participantesAusentesIds.push(id);
                    statusAusentes[id] = status;
                }
            } else if (status === "vaiAlmocar" || status === "comparecerSemAlmoco") {
                if (!id.startsWith("convidado_")) {
                    participantesDaCasaIds.push(id);
                    statusDaCasa[id] = status;
                }
            } else if (status === "comparecerParticular") {
                if (!id.startsWith("convidado_")) {
                    participantesSemCasaIds.push(id);
                    statusSemCasa[id] = status;
                }
            }
        });

        // Separadores de convidados avulsos novos
        const convidadosParaCasa: any[] = [];
        const convidadosParticulares: any[] = [];

        convidadosDoDia.forEach(conv => {
            if (!conv.agendamentoId) {
                const statusConv = statusParticipantes[conv.id] || "vaiAlmocar";
                const convObj = {
                    id: conv.id,
                    nome: conv.nome,
                    telefone: conv.telefone,
                    status: statusConv
                };

                if (statusConv === "comparecerParticular") {
                    convidadosParticulares.push(convObj);
                    statusSemCasa[conv.id] = statusConv;
                } else if (statusConv !== "naoComparecera") {
                    convidadosParaCasa.push(convObj);
                    statusDaCasa[conv.id] = statusConv;
                }
            }
        });

        // Validação: Só exige Casa se houver alguém configurado para comer na Casa ("vaiAlmocar")
        const exigeCasa = participantesDaCasaIds.some(id => statusDaCasa[id] === "vaiAlmocar") ||
                          convidadosParaCasa.some(c => c.status === "vaiAlmocar");

        if (exigeCasa && !casaId) {
            alert("Por favor, selecione a Casa que servirá o almoço, pois há participantes escalados para almoçar.");
            return;
        }

        const confirmar = window.confirm("Deseja salvar a programação e os convidados para este dia?");
        if (!confirmar) return;

        try {
            // GRAVAÇÃO 1: Grupo da Casa Anfitriã (quem vai almoçar ou passar o dia na casa)
            if (participantesDaCasaIds.length > 0 || convidadosParaCasa.length > 0) {
                await addDoc(collection(db, "lunchSchedules"), {
                    data,
                    casaId: casaId || "",
                    participantes: participantesDaCasaIds,
                    convidadosAvulsos: convidadosParaCasa,
                    statusParticipantes: statusDaCasa,
                    criadoEm: new Date().toISOString(),
                });
            }

            // GRAVAÇÃO 2: Grupo Arranjo Particular (não exige vínculo com nenhuma Casa)
            if (participantesSemCasaIds.length > 0 || convidadosParticulares.length > 0) {
                await addDoc(collection(db, "lunchSchedules"), {
                    data,
                    casaId: "",
                    participantes: participantesSemCasaIds,
                    convidadosAvulsos: convidadosParticulares,
                    statusParticipantes: statusSemCasa,
                    criadoEm: new Date().toISOString(),
                });
            }

            // GRAVAÇÃO 3: Grupo dos Ausentes
            if (participantesAusentesIds.length > 0) {
                await addDoc(collection(db, "lunchSchedules"), {
                    data,
                    casaId: "",
                    participantes: participantesAusentesIds,
                    statusParticipantes: statusAusentes,
                    criadoEm: new Date().toISOString(),
                });
            }

            alert("Programação salva com sucesso!");
            buscarAgendamentosNaData(data);
            setCasaId("");
        } catch (error) {
            console.error("Erro ao salvar programação:", error);
            alert("Ocorreu um erro ao gravar no banco de dados.");
        }
    }

    const temProgramacaoSalvaNaData = Object.keys(alocacoesNaData).length > 0 || convidadosDoDia.length > 0;

    // CONTADORES INTELIGENTES
    const totalConfirmadosAlmoco = Object.values(statusConsolidadosNaData).filter(v => v === "vaiAlmocar").length +
        Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "vaiAlmocar").length;

    const totalSemAlmoco = Object.values(statusConsolidadosNaData).filter(v => v === "comparecerSemAlmoco").length +
        Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "comparecerSemAlmoco").length;

    const totalArranjoParticular = Object.values(statusConsolidadosNaData).filter(v => v === "comparecerParticular").length +
        Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "comparecerParticular").length;

    const totalAusentes = Object.values(statusConsolidadosNaData).filter(v => v === "naoComparecera").length +
        Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "naoComparecera").length;

    // Combina lista de betelitas com os convidados avulsos para exibição na tela
    const listaCompletaExibicao = [
        ...convidadosDoDia.map(c => ({ ...c, isConvidado: true })),
        ...betelitas
    ];

    const betelitasFiltrados = listaCompletaExibicao.filter(b =>
        b.nome?.toLowerCase().includes(filtroBusca.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">

            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Nova Programação de Almoço
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Selecione a data, adicione convidados avulsos se necessário e defina o status de presença.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* PARTE ESQUERDA: DEFINIÇÕES DO ALMOÇO + ADICIONAR CONVIDADO */}
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
                                Casa Anfitriã (Família)
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

                    {/* CAIXA DE ADICIONAR CONVIDADO AVULSO */}
                    <div className="bg-blue-50/70 p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                            ⭐ Adicionar Convidado / Visitante
                        </h3>
                        <p className="text-xs text-blue-700">
                            Para quem vai apenas hoje e não precisa cadastro fixo.
                        </p>

                        <div>
                            <input
                                type="text"
                                placeholder="Nome do Visitante"
                                value={nomeConvidado}
                                onChange={(e) => setNomeConvidado(e.target.value)}
                                className="w-full border border-blue-200 p-2.5 text-xs rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Telefone (opcional)"
                                value={telefoneConvidado}
                                onChange={(e) => setTelefoneConvidado(e.target.value)}
                                className="w-full border border-blue-200 p-2.5 text-xs rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={adicionarConvidadoAvulso}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            ➕ Incluir Convidado na Lista
                        </button>
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

                {/* PARTE DIREITA: CONTROLE DE PRESENÇA */}
                <div className="lg:col-span-2 space-y-4">

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            👥 Presença de Participantes ({betelitasFiltrados.length})
                        </span>

                        <div className="relative w-full sm:w-64">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar participante..."
                                value={filtroBusca}
                                onChange={(e) => setFiltroBusca(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {betelitasFiltrados.length > 0 ? (
                            betelitasFiltrados.map((item) => {
                                const statusAtual = statusParticipantes[item.id] || (item.isConvidado ? "vaiAlmocar" : "naoComparecera");
                                const alocacaoExistente = alocacoesNaData[item.id];

                                let cardBorder = "border-slate-200";
                                if (item.isConvidado && !item.agendamentoId) {
                                    cardBorder = "border-blue-300 bg-blue-50/20";
                                } else if (item.isConvidado && item.agendamentoId) {
                                    cardBorder = "border-amber-300 bg-amber-50/10 opacity-90";
                                } else if (alocacaoExistente) {
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
                                                {item.isConvidado && (
                                                    <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded-full">
                                                        Convidado Avulso
                                                    </span>
                                                )}
                                                {alocacaoExistente && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                                                        Escalado(a): {alocacaoExistente.casaNome}
                                                    </span>
                                                )}
                                                {item.agendamentoId && item.isConvidado && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                                                        Salvo no dia
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {item.telefone || "Sem telefone cadastrado"}
                                            </p>
                                        </div>

                                        {/* SE JÁ ESTIVER SALVO NO BANCO COMO ALOCAÇÃO */}
                                        {alocacaoExistente && !item.isConvidado ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => liberarBetelita(item.id, item.nome)}
                                                    className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all"
                                                >
                                                    🔄 Alterar Escala / Remover
                                                </button>
                                            </div>
                                        ) : item.agendamentoId && item.isConvidado ? (
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
                                            <div className="flex items-center gap-2">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
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

                                                {/* BOTÃO DE REMOVER DA LISTA SE AINDA NÃO FOI SALVO */}
                                                {item.isConvidado && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removerConvidado(item)}
                                                        className="px-2.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                                                        title="Remover convidado"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="bg-white p-12 text-center border border-slate-200 rounded-xl text-slate-400 text-sm">
                                Nenhuma pessoa encontrada.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}