"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import StatCard from "../components/StatCard";
import { Phone, Utensils, Home } from "lucide-react";

interface ProgramacaoRealizada {
  id: string;
  data: string;
  casaId: string;
  casaNome: string;
  casaNumero: string;
  casaFamilia: string;
  endereco: string;
  complemento?: string;
  telefone: string;
  participantesDetalhados: Array<{
    nome: string;
    status: string;
  }>;
}

export default function Dashboard() {
  const [totalCasas, setTotalCasas] = useState(0);
  const [totalBetelitas, setTotalBetelitas] = useState(0);

  const [programacoesAlmoco, setProgramacoesAlmoco] = useState<ProgramacaoRealizada[]>([]);
  const [programacoesHospedagem, setProgramacoesHospedagem] = useState<ProgramacaoRealizada[]>([]);

  const [tipoVisualizacao, setTipoVisualizacao] = useState<"almoco" | "hospedagem">("almoco");

  const [loading, setLoading] = useState(true);
  const [menuTelefoneAberto, setMenuTelefoneAberto] = useState<string | null>(null);

  const limparTelefone = (tel: string) => tel.replace(/\D/g, "");

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirMenuTelefone = (id: string) => {
    setMenuTelefoneAberto(menuTelefoneAberto === id ? null : id);
  };

  useEffect(() => {
    function fecharAoClicarFora(event: MouseEvent) {
      if (menuTelefoneAberto && !(event.target as HTMLElement).closest('.btn-telefone-container')) {
        setMenuTelefoneAberto(null);
      }
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
    };
  }, [menuTelefoneAberto]);

  function formatarDataCurta(dataString: string) {
    if (!dataString) return "";
    const partes = dataString.split("-");
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function obterStatusInfoAlmoco(status: string) {
    switch (status) {
      case "vaiAlmocar":
        return { label: "Almoça na Casa", icone: "🍽️", classe: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", ordem: 1 };
      case "comparecerSemAlmoco":
        return { label: "Visita sem Almoço", icone: "🚶", classe: "bg-amber-500/20 text-amber-300 border-amber-500/30", ordem: 2 };
      case "comparecerParticular":
        return { label: "Almoço Particular", icone: "🥪", classe: "bg-blue-500/20 text-blue-300 border-blue-500/30", ordem: 3 };
      default:
        return { label: "Não Comparecerá", icone: "❌", classe: "bg-rose-500/20 text-rose-300 border-rose-500/30", ordem: 4 };
    }
  }

  function obterStatusInfoHospedagem(status: string) {
    switch (status) {
      case "vaiHospedar":
      case "hospedado":
        return { label: "Hospedado na Casa", icone: "🛏️", classe: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "hospedagemParticular":
        return { label: "Hospedagem Particular", icone: "🏠", classe: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      default:
        return { label: "Hospedagem Confirmada", icone: "🛏️", classe: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" };
    }
  }

  async function carregarDados() {
    try {
      setLoading(true);

      const [casasSnapshot, betelitasSnapshot, programacoesSnapshot, hospedagensSnapshot] = await Promise.all([
        getDocs(collection(db, "houses")),
        getDocs(collection(db, "betelitas")),
        getDocs(collection(db, "lunchSchedules")),
        getDocs(collection(db, "accommodationSchedules"))
      ]);

      setTotalCasas(casasSnapshot.size);
      setTotalBetelitas(betelitasSnapshot.size);

      const dicionarioCasas: Record<string, any> = {};
      casasSnapshot.forEach((doc) => {
        dicionarioCasas[doc.id] = { id: doc.id, ...doc.data() };
      });

      const dicionarioBetelitas: Record<string, any> = {};
      betelitasSnapshot.forEach((doc) => {
        dicionarioBetelitas[doc.id] = { id: doc.id, ...doc.data() };
      });

      const dicionarioConvidados: Record<string, string> = {};
      [...programacoesSnapshot.docs, ...hospedagensSnapshot.docs].forEach((doc) => {
        const dados = doc.data();
        if (dados.convidadosAvulsos && Array.isArray(dados.convidadosAvulsos)) {
          dados.convidadosAvulsos.forEach((conv: any) => {
            if (conv.id && conv.nome) {
              dicionarioConvidados[conv.id] = conv.nome;
            }
          });
        }
      });

      function obterNomeParticipante(id: string) {
        let nomeBruto = "";
        if (dicionarioBetelitas[id]) {
          nomeBruto = dicionarioBetelitas[id].nome;
        } else if (dicionarioConvidados[id]) {
          nomeBruto = dicionarioConvidados[id];
        } else {
          return `Participante (ID: ${id.substring(0, 5)})`;
        }
        return nomeBruto.replace(/⭐\s*/g, "").trim();
      }

      // Processar Almoços Agrupados por Data + Casa
      const agrupadosAlmoco: Record<string, ProgramacaoRealizada> = {};

      programacoesSnapshot.forEach((doc) => {
        const dados = doc.data();
        let idProcurado = dados.casaId || "";
        if (idProcurado && typeof idProcurado !== "string") idProcurado = idProcurado.id;
        const dataAgendada = dados.data || dados.dataInicio || "";

        const participantesDoc = dados.participantes || [];
        const statusMap = dados.statusParticipantes || {};

        if (dataAgendada) {
          const chaveAgrupamento = idProcurado ? `${dataAgendada}_${idProcurado}` : `particular_${doc.id}`;

          const casa = dicionarioCasas[idProcurado] || {};
          
          let statusPrimeiroParticipante = "naoComparecer";
          if (participantesDoc.length > 0) {
            statusPrimeiroParticipante = statusMap[participantesDoc[0]] || "naoComparecer";
            if (!idProcurado && statusPrimeiroParticipante === "comparecerParticular") {
              statusPrimeiroParticipante = "naoComparecer";
            }
          }

          const casaNomeFamilia = idProcurado && casa.nomeFamilia 
            ? casa.nomeFamilia 
            : (idProcurado ? "Sem Nome" : obterStatusInfoAlmoco(statusPrimeiroParticipante).label);

          const logradouro = casa.logradouro || "";
          const casaNumero = casa.numeroEndereco ? ` - ${casa.numeroEndereco}` : "";
          const complemento = casa.complemento || "";
          const bairro = casa.bairro ? ` - ${casa.bairro}` : "";
          const cidade = casa.cidade ? `, ${casa.cidade}` : "";
          const enderecoCompleto = casa.logradouro ? `${logradouro}${casaNumero}${bairro}${cidade}` : "";
          const endereco = enderecoCompleto ? enderecoCompleto.replace(", ,", ",").replace(" - ,", "") : "";
          const telefone = casa.telefone || "";

          const novosParticipantes = participantesDoc.map((betelitaId: string) => {
            let status = statusMap[betelitaId] || "naoComparecer";
            if (!idProcurado && status === "comparecerParticular") {
              status = "naoComparecer";
            }
            return { nome: obterNomeParticipante(betelitaId), status };
          });

          if (agrupadosAlmoco[chaveAgrupamento]) {
            novosParticipantes.forEach((novo: any) => {
              if (!agrupadosAlmoco[chaveAgrupamento].participantesDetalhados.some(e => e.nome === novo.nome)) {
                agrupadosAlmoco[chaveAgrupamento].participantesDetalhados.push(novo);
              }
            });
          } else {
            agrupadosAlmoco[chaveAgrupamento] = {
              id: doc.id,
              data: dataAgendada,
              casaId: idProcurado,
              casaNome: casaNomeFamilia,
              casaNumero: String(casaNumero),
              casaFamilia: casaNomeFamilia,
              endereco,
              complemento,
              telefone,
              participantesDetalhados: novosParticipantes,
            };
          }
        }
      });

      // Processar Hospedagens
      const agrupadosHospedagem: Record<string, ProgramacaoRealizada> = {};
      hospedagensSnapshot.forEach((doc) => {
        const dados = doc.data();
        let idProcurado = dados.casaId || "";
        if (idProcurado && typeof idProcurado !== "string") idProcurado = idProcurado.id;

        const dataAgendada = dados.dataInicio || dados.data || "";
        const listaParticipantesIds = dados.participantes || [];

        if (dataAgendada) {
          const chaveAgrupamento = idProcurado ? `${dataAgendada}_${idProcurado}` : `particular_${doc.id}`;
          const casa = dicionarioCasas[idProcurado] || {};
          const casaNomeFamilia = casa.nomeFamilia || (idProcurado ? "Sem Nome" : "Hospedagem Particular");
          const logradouro = casa.logradouro || "";
          const casaNumero = casa.numeroEndereco ? ` - ${casa.numeroEndereco}` : (idProcurado ? ", S/N" : "");
          const complemento = casa.complemento || "";
          const bairro = casa.bairro ? ` - ${casa.bairro}` : "";
          const cidade = casa.cidade ? `, ${casa.cidade}` : "";
          const enderecoCompleto = casa.logradouro ? `${logradouro}${casaNumero}${bairro}${cidade}` : "";
          const endereco = enderecoCompleto ? enderecoCompleto.replace(", ,", ",").replace(" - ,", "") : "";
          const telefone = casa.telefone || "";

          const novosParticipantes = listaParticipantesIds.map((betelitaId: string) => {
            const status = dados.statusParticipantes?.[betelitaId] || (!idProcurado ? "hospedagemParticular" : "vaiHospedar");
            return { nome: obterNomeParticipante(betelitaId), status };
          });

          if (agrupadosHospedagem[chaveAgrupamento]) {
            novosParticipantes.forEach((novo: any) => {
              if (!agrupadosHospedagem[chaveAgrupamento].participantesDetalhados.some(e => e.nome === novo.nome)) {
                agrupadosHospedagem[chaveAgrupamento].participantesDetalhados.push(novo);
              }
            });
          } else {
            agrupadosHospedagem[chaveAgrupamento] = {
              id: doc.id,
              data: dataAgendada,
              casaId: idProcurado,
              casaNome: casaNomeFamilia,
              casaNumero: String(casaNumero),
              casaFamilia: casaNomeFamilia,
              endereco,
              complemento,
              telefone,
              participantesDetalhados: novosParticipantes,
            };
          }
        }
      });

      const hojeDate = new Date();
      const diaDaSemana = hojeDate.getDay();
      const diffParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;

      const segundaFeiraDate = new Date(hojeDate);
      segundaFeiraDate.setDate(hojeDate.getDate() + diffParaSegunda);
      const dataInicioSemana = segundaFeiraDate.toISOString().split("T")[0];

      const domingoDate = new Date(segundaFeiraDate);
      domingoDate.setDate(segundaFeiraDate.getDate() + 6);
      const dataFimSemana = domingoDate.toISOString().split("T")[0];

      let listaAlmoco = Object.values(agrupadosAlmoco).filter(
        prog => prog.data >= dataInicioSemana && prog.data <= dataFimSemana
      );
      listaAlmoco.forEach(prog => {
        prog.participantesDetalhados.sort((a, b) => {
          return obterStatusInfoAlmoco(a.status).ordem - obterStatusInfoAlmoco(b.status).ordem;
        });
      });

      listaAlmoco.sort((a, b) => {
        if (a.data !== b.data) {
          return a.data.localeCompare(b.data);
        }
        const aTemCasa = Boolean(a.casaId);
        const bTemCasa = Boolean(b.casaId);

        if (aTemCasa && !bTemCasa) return -1;
        if (!aTemCasa && bTemCasa) return 1;
        return 0;
      });

      setProgramacoesAlmoco(listaAlmoco);

      let listaHospedagem = Object.values(agrupadosHospedagem).filter(
        prog => prog.data >= dataInicioSemana && prog.data <= dataFimSemana
      );
      listaHospedagem.sort((a, b) => {
        if (a.data !== b.data) {
          return a.data.localeCompare(b.data);
        }
        const aEhParticular = !a.casaId || a.casaFamilia.toLowerCase().includes("particular");
        const bEhParticular = !b.casaId || b.casaFamilia.toLowerCase().includes("particular");

        if (aEhParticular && !bEhParticular) return 1;
        if (!aEhParticular && bEhParticular) return -1;
        return 0;
      });
      setProgramacoesHospedagem(listaHospedagem);

    } catch (error) {
      console.error("Erro ao carregar dados do Dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  const programacoesAtuais = tipoVisualizacao === "almoco" ? programacoesAlmoco : programacoesHospedagem;

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
            {tipoVisualizacao === "almoco" ? "Visão Geral do Almoço" : "Visão Geral da Hospedagem"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tipoVisualizacao === "almoco"
              ? "Acompanhe o painel de distribuição, contagem de betelitas e controle de casas ativas (Almoços)."
              : "Acompanhe o painel de distribuição, contagem de hóspedes e controle de casas ativas (Hospedagens)."}
          </p>
        </div>

        <div className="inline-flex bg-slate-200 p-1 rounded-xl self-start">
          <button
            onClick={() => setTipoVisualizacao("almoco")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tipoVisualizacao === "almoco"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Utensils className="w-4 h-4 text-emerald-600" /> Almoços
          </button>
          <button
            onClick={() => setTipoVisualizacao("hospedagem")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tipoVisualizacao === "hospedagem"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Home className="w-4 h-4 text-purple-600" /> Hospedagens
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          titulo="Total de Casas"
          valor={totalCasas}
          icone="🏠"
          bgColorIcone="bg-blue-50"
          textColorIcone="text-blue-600"
        />

        <StatCard
          titulo="Betelitas Ativos"
          valor={totalBetelitas}
          icone="👥"
          bgColorIcone="bg-emerald-50"
          textColorIcone="text-emerald-600"
        />

        <StatCard
          titulo={tipoVisualizacao === "almoco" ? "Próximo Almoço" : "Próxima Hospedagem"}
          valor={programacoesAtuais.length > 0 ? formatarDataCurta(programacoesAtuais[0].data) : "Não programado"}
          icone="📅"
          bgColorIcone="bg-indigo-50"
          textColorIcone="text-indigo-600"
        />

        <StatCard
          titulo="Casas Disponíveis"
          valor={programacoesAtuais.length > 0
            ? Math.max(0, totalCasas - new Set(programacoesAtuais.filter(p => p.data === programacoesAtuais[0].data && p.casaId).map(p => p.casaId)).size)
            : totalCasas
          }
          icone="📍"
          bgColorIcone="bg-amber-50"
          textColorIcone="text-amber-600"
        />
      </div>

      <div className="pt-4 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">
          {tipoVisualizacao === "almoco" ? "Programações de Almoço Definidas" : "Programações de Hospedagem Definidas"}
        </h2>
        <p className="text-xs text-slate-400">
          {tipoVisualizacao === "almoco" ? "Distribuição completa de almoços agendados" : "Distribuição completa de hospedagens agendadas"}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          Carregando registros...
        </div>
      ) : programacoesAtuais.length > 0 ? (
        <div className="space-y-6">
          {programacoesAtuais.map((prog, idx) => {
            const isPrimeira = idx === 0;

            return (
              <div
                key={prog.id}
                className={`rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden transition-all ${isPrimeira
                  ? "bg-gradient-to-r from-slate-900 to-indigo-950 ring-2 ring-indigo-500/20"
                  : "bg-gradient-to-r from-slate-800 to-slate-900"
                  }`}
              >
                <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12 select-none pointer-events-none">
                  <span className="text-[180px]">{tipoVisualizacao === "almoco" ? "🍽️" : "🛏️"}</span>
                </div>

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="bg-slate-700/50 text-slate-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-slate-600/30">
                      {tipoVisualizacao === "almoco" ? "ALMOÇO AGENDADO" : "HOSPEDAGEM AGENDADA"}
                    </span>

                    <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                      Data: {formatarDataCurta(prog.data)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-4">
                      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        {prog.casaNumero ? `Casa — ${prog.casaFamilia}` : prog.casaFamilia}
                      </h2>

                      <div className="space-y-2 text-slate-300 text-sm">
                        {prog.endereco && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(prog.endereco)}&travelmode=driving`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 text-blue-300 hover:text-white transition-colors"
                          >
                            <span className="text-base shrink-0 text-blue-400 mt-0.5">📍</span>
                            <span className="underline decoration-blue-400/30 underline-offset-4 decoration-1 hover:decoration-blue-400 transition-all">
                              {prog.endereco}
                            </span>
                          </a>
                        )}

                        {prog.complemento && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(prog.endereco)}&travelmode=driving`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 text-blue-300 -mt-2 hover:text-white transition-colors"
                          >
                            <span className="text-base shrink-0 opacity-0 mt-0.5">📍</span>
                            <span className="text-sm underline decoration-blue-400/30 underline-offset-4 decoration-1 hover:decoration-blue-400">
                              {prog.complemento}
                            </span>
                          </a>
                        )}

                        {prog.telefone && (
                          <div className="relative btn-telefone-container">
                            <button
                              onClick={() => abrirMenuTelefone(prog.id)}
                              className="flex items-center gap-2 transition-all cursor-pointer group hover:opacity-80"
                            >
                              <Phone className="w-5 h-5 text-red-500 shrink-0" />
                              <span className="text-blue-300 underline decoration-blue-400/30 underline-offset-4 decoration-1 hover:decoration-blue-400 transition-all">
                                {prog.telefone}
                              </span>
                            </button>

                            {menuTelefoneAberto === prog.id && (
                              <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl z-50 p-2 border border-slate-100 animate-in fade-in zoom-in duration-200">
                                <a
                                  href={`https://wa.me/55${limparTelefone(prog.telefone)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 hover:bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                  <span>💬</span> WhatsApp
                                </a>
                                <a
                                  href={`tel:${limparTelefone(prog.telefone)}`}
                                  className="flex items-center gap-2 p-2 hover:bg-blue-50 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                  <span>📱</span> Ligar
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-7 bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span>👥</span> {tipoVisualizacao === "almoco" ? "Betelitas Escalados" : "Hóspedes Escalados"} ({prog.participantesDetalhados.length})
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {prog.participantesDetalhados.map((part, index) => {
                          const statusInfo = tipoVisualizacao === "almoco"
                            ? obterStatusInfoAlmoco(part.status)
                            : obterStatusInfoHospedagem(part.status);

                          return (
                            <div
                              key={index}
                              className="bg-white/10 border border-white/5 rounded-lg p-3.5 flex flex-col justify-between gap-2 hover:bg-white/15 transition-all"
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-white text-sm md:text-base">
                                  {part.nome}
                                </span>
                                <span className="text-xl">{statusInfo.icone}</span>
                              </div>

                              <span
                                className={`inline-flex items-center justify-center self-start text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.classe}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-400">
            {tipoVisualizacao === "almoco"
              ? "Nenhuma programação de almoço cadastrada no banco de dados."
              : "Nenhuma programação de hospedagem cadastrada no banco de dados."}
          </p>
        </div>
      )}
    </div>
  );
}