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

export default function HospedagemContent() {
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [casaId, setCasaId] = useState("");

    const [casas, setCasas] = useState<any[]>([]);
    const [betelitas, setBetelitas] = useState<any[]>([]);

    // Estados para Hóspede Avulso / Visitante
    const [nomeConvidado, setNomeConvidado] = useState("");
    const [telefoneConvidado, setTelefoneConvidado] = useState("");
    const [convidadosDoDia, setConvidadosDoDia] = useState<any[]>([]);

    const [alocacoesNaData, setAlocacoesNaData] = useState<Record<string, { agendamentoId: string; casaId: string; casaNome: string }>>({});
    const [statusConsolidadosNaData, setStatusConsolidadosNaData] = useState<Record<string, string>>({});
    const [statusParticipantes, setStatusParticipantes] = useState<Record<string, string>>({});
    const [filtroBusca, setFiltroBusca] = useState("");

    useEffect(() => {
        carregarDados();
    }, []);

    useEffect(() => {
        if (dataInicio) {
            buscarAgendamentosNaData(dataInicio);
        } else {
            setAlocacoesNaData({});
            setStatusConsolidadosNaData({});
            setConvidadosDoDia([]);
        }
    }, [dataInicio, casas]);

    async function carregarDados() {
        try {
            const casasSnapshot = await getDocs(collection(db, "houses"));
            const listaCasas: any[] = [];
            casasSnapshot.forEach((doc) => {
                listaCasas.push({ id: doc.id, ...doc.data() });
            });
            listaCasas.sort((a, b) => Number(a.numeroCasa || 0) - Number(b.numeroCasa || 0));
            setCasas(listaCasas);

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

            const inicialStatus: Record<string, string> = {};
            listaBetelitas.forEach(b => {
                inicialStatus[b.id] = "naoHospedar";
            });
            setStatusParticipantes(inicialStatus);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }

    async function buscarAgendamentosNaData(dataSelecionada: string) {
        try {
            const q = query(collection(db, "accommodationSchedules"), where("dataInicio", "==", dataSelecionada));
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

                if (dados.convidadosAvulsos && Array.isArray(dados.convidadosAvulsos)) {
                    dados.convidadosAvulsos.forEach((conv: any) => {
                        listaConvidadosTemp.push({ ...conv, agendamentoId: documento.id });
                        mapaStatusConsolidados[conv.id] = conv.status || "vaiHospedar";
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
                            if (statusReal === "hospedagemParticular") {
                                casaNome = "Hospedagem Particular";
                            } else {
                                casaNome = "Hospedagem Ativa";
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
            console.error("Erro ao buscar hospedagens na data:", error);
        }
    }

    function adicionarConvidadoAvulso() {
        if (!nomeConvidado.trim()) {
            alert("Por favor, digite o nome do hóspede/visitante.");
            return;
        }

        const novoId = "hospede_" + Date.now();
        const novoConvidadoObj = {
            id: novoId,
            nome: `${nomeConvidado.trim()} (Hóspede)`,
            telefone: telefoneConvidado.trim() || "Avulso",
        };

        setConvidadosDoDia(prev => [...prev, novoConvidadoObj]);
        setStatusParticipantes(prev => ({ ...prev, [novoId]: "vaiHospedar" }));
        setNomeConvidado("");
        setTelefoneConvidado("");
    }

    async function removerConvidado(convidado: any) {
        if (!confirm(`Deseja remover o hóspede ${convidado.nome}?`)) return;

        if (convidado.agendamentoId) {
            try {
                const agendamentoRef = doc(db, "accommodationSchedules", convidado.agendamentoId);
                const snapshot = await getDocs(query(collection(db, "accommodationSchedules")));
                
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

                    alert("Hóspede removido com sucesso!");
                    buscarAgendamentosNaData(dataInicio);
                }
            } catch (error) {
                console.error("Erro ao remover hóspede:", error);
            }
        } else {
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
            `O(A) ${nomeBetelita} já está alocado(a) em "${alocacao.casaNome}". Deseja removê-lo(a) de lá?`
        );

        if (!confirmar) return;

        try {
            const agendamentoRef = doc(db, "accommodationSchedules", alocacao.agendamentoId);
            const snapshotDoc = await getDocs(query(collection(db, "accommodationSchedules")));
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
                
                setAlocacoesNaData(prev => {
                    const copia = { ...prev };
                    delete copia[betelitaId];
                    return copia;
                });
                
                buscarAgendamentosNaData(dataInicio);
            }
        } catch (error) {
            console.error("Erro ao liberar Participante:", error);
        }
    }

    function alterarStatus(id: string, status: string) {
        setStatusParticipantes(prev => ({
            ...prev,
            [id]: status
        }));
    }

    async function salvarProgramacao() {
        if (!dataInicio) {
            alert("Por favor, selecione a Data de Início da Hospedagem.");
            return;
        }

        const participantesDaCasaIds: string[] = [];
        const statusDaCasa: Record<string, string> = {};

        const participantesParticularesIds: string[] = [];
        const statusParticulares: Record<string, string> = {};

        const idsParaProcessar = [
            ...Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && !id.startsWith("hospede_")),
            ...convidadosDoDia.filter(c => !c.agendamentoId).map(c => c.id)
        ];

        if (idsParaProcessar.length === 0 && convidadosDoDia.length === 0) {
            alert("Não há nenhuma alteração pendente para salvar.");
            return;
        }

        idsParaProcessar.forEach(id => {
            const status = statusParticipantes[id] || "naoHospedar";

            if (status === "hospedagemParticular") {
                if (!id.startsWith("hospede_")) {
                    participantesParticularesIds.push(id);
                    statusParticulares[id] = status;
                }
            } else if (status !== "naoHospedar") {
                if (!id.startsWith("hospede_")) {
                    participantesDaCasaIds.push(id);
                    statusDaCasa[id] = status;
                }
            }
        });

        const convidadosNovosParaSalvar: any[] = [];
        convidadosDoDia.forEach(conv => {
            if (!conv.agendamentoId) {
                const statusConv = statusParticipantes[conv.id] || "vaiHospedar";
                convidadosNovosParaSalvar.push({
                    id: conv.id,
                    nome: conv.nome,
                    telefone: conv.telefone,
                    status: statusConv
                });
                statusDaCasa[conv.id] = statusConv;
            }
        });

        const temAlguemParaHospedar = [...participantesDaCasaIds, ...convidadosNovosParaSalvar.map(c => c.id)].some(
            id => statusDaCasa[id] === "vaiHospedar"
        );

        if (temAlguemParaHospedar && !casaId) {
            alert("Por favor, selecione a Casa anfitriã da hospedagem.");
            return;
        }

        const confirmar = window.confirm("Deseja salvar a escala de hospedagem?");
        if (!confirmar) return;

        try {
            // GRAVAÇÃO 1: Grupo da Casa Anfitriã
            if (participantesDaCasaIds.length > 0 || convidadosNovosParaSalvar.length > 0) {
                await addDoc(collection(db, "accommodationSchedules"), {
                    dataInicio,
                    dataFim: dataFim || dataInicio,
                    casaId: casaId || "", 
                    participantes: participantesDaCasaIds,
                    convidadosAvulsos: convidadosNovosParaSalvar,
                    statusParticipantes: statusDaCasa,
                    criadoEm: new Date().toISOString(),
                });
            }

            // GRAVAÇÃO 2: Hospedagem Particular
            if (participantesParticularesIds.length > 0) {
                await addDoc(collection(db, "accommodationSchedules"), {
                    dataInicio,
                    dataFim: dataFim || dataInicio,
                    casaId: "", 
                    participantes: participantesParticularesIds,
                    statusParticipantes: statusParticulares,
                    criadoEm: new Date().toISOString(),
                });
            }

            alert("Hospedagem salva com sucesso!");
            buscarAgendamentosNaData(dataInicio);
            setCasaId("");
        } catch (error) {
            console.error("Erro ao salvar hospedagem:", error);
            alert("Ocorreu um erro ao gravar no banco de dados.");
        }
    }

    const totalHospedados = Object.values(statusConsolidadosNaData).filter(v => v === "vaiHospedar").length +
        Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "vaiHospedar").length;

    const totalParticular = Object.values(statusConsolidadosNaData).filter(v => v === "hospedagemParticular").length +
        Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "hospedagemParticular").length;

    const totalNaoHospedar = Object.values(statusConsolidadosNaData).filter(v => v === "naoHospedar").length +
        Object.keys(statusParticipantes).filter(id => !alocacoesNaData[id] && statusParticipantes[id] === "naoHospedar").length;

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
                    Gerenciamento de Hospedagem
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Organize as acomodações e o fluxo de hóspedes nas casas.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-3 border-slate-100">
                            🏠 Detalhes da Hospedagem
                        </h3>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                Data de Início
                            </label>
                            <input
                                type="date"
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                                className="w-full border border-slate-200 p-3 text-sm rounded-lg outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                Data de Término (Opcional)
                            </label>
                            <input
                                type="date"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                className="w-full border border-slate-200 p-3 text-sm rounded-lg outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                Casa Anfitriã
                            </label>
                            <select
                                value={casaId}
                                onChange={(e) => setCasaId(e.target.value)}
                                className="w-full border border-slate-200 p-3 text-sm rounded-lg outline-none bg-white"
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

                    <div className="bg-indigo-50/70 p-6 rounded-xl border border-indigo-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                            ➕ Adicionar Hóspede Avulso
                        </h3>
                        <input
                            type="text"
                            placeholder="Nome do Visitante/Hóspede"
                            value={nomeConvidado}
                            onChange={(e) => setNomeConvidado(e.target.value)}
                            className="w-full border border-indigo-200 p-2.5 text-xs rounded-lg bg-white outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Telefone (opcional)"
                            value={telefoneConvidado}
                            onChange={(e) => setTelefoneConvidado(e.target.value)}
                            className="w-full border border-indigo-200 p-2.5 text-xs rounded-lg bg-white outline-none"
                        />
                        <button
                            type="button"
                            onClick={adicionarConvidadoAvulso}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-xs font-bold transition-all"
                        >
                            Incluir Hóspede
                        </button>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            📊 Resumo
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Hospedados</p>
                                <p className="text-2xl font-bold text-indigo-400 mt-1">{totalHospedados}</p>
                            </div>
                            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Particular</p>
                                <p className="text-2xl font-bold text-blue-400 mt-1">{totalParticular}</p>
                            </div>
                        </div>
                        <button
                            onClick={salvarProgramacao}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg text-sm font-bold transition-all"
                        >
                            💾 Salvar Hospedagem
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-slate-700">
                            🛏️ Betelitas e Hóspedes ({betelitasFiltrados.length})
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={filtroBusca}
                            onChange={(e) => setFiltroBusca(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 text-xs border border-slate-200 rounded-lg outline-none"
                        />
                    </div>

                    <div className="space-y-3">
                        {betelitasFiltrados.map((item) => {
                            const statusAtual = statusParticipantes[item.id] || (item.isConvidado ? "vaiHospedar" : "naoHospedar");
                            const alocacaoExistente = alocacoesNaData[item.id];

                            return (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-800 text-sm">{item.nome}</p>
                                            {alocacaoExistente && (
                                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                                                    Alocado(a): {alocacaoExistente.casaNome}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400">{item.telefone || "Sem telefone"}</p>
                                    </div>

                                    {alocacaoExistente && !item.isConvidado ? (
                                        <button
                                            onClick={() => liberarBetelita(item.id, item.nome)}
                                            className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg"
                                        >
                                            🔄 Alterar / Remover
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="grid grid-cols-3 gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => alterarStatus(item.id, "vaiHospedar")}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${statusAtual === "vaiHospedar"
                                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    🛏️ Hospedar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => alterarStatus(item.id, "hospedagemParticular")}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${statusAtual === "hospedagemParticular"
                                                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    🏠 Particular
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => alterarStatus(item.id, "naoHospedar")}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${statusAtual === "naoHospedar"
                                                            ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    ❌ Não Hospedar
                                                </button>
                                            </div>

                                            {item.isConvidado && (
                                                <button
                                                    type="button"
                                                    onClick={() => removerConvidado(item)}
                                                    className="px-2.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                                                    title="Remover hóspede"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}