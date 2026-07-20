"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import StatCard from "../components/StatCard";
import { Phone } from "lucide-react";

interface ProgramacaoRealizada {
  id: string;
  data: string;
  casaId: string; // Chave para agruparmos
  casaNome: string;
  casaNumero: string;
  casaFamilia: string;
  endereco: string;
  complemento?: string; // O "?" torna o campo opcional, evitando erros em registros antigos
  telefone: string;
  participantesDetalhados: Array<{
    nome: string;
    status: string;
  }>;
}

export default function Dashboard() {
  const [totalCasas, setTotalCasas] = useState(0);
  const [totalBetelitas, setTotalBetelitas] = useState(0);
  const [programacoes, setProgramacoes] = useState<ProgramacaoRealizada[]>([]);
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
    // Função que fecha o menu se o clique não for no elemento do botão
    function fecharAoClicarFora(event: MouseEvent) {
      if (menuTelefoneAberto && !(event.target as HTMLElement).closest('.btn-telefone-container')) {
        setMenuTelefoneAberto(null);
      }
    }

    // Adiciona o listener
    document.addEventListener("mousedown", fecharAoClicarFora);

    // Remove o listener quando o componente é desmontado
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
    };
  }, [menuTelefoneAberto]);



  // Formata a data de AAAA-MM-DD para DD/MM/AAAA por extenso
  function formatarDataExtenso(dataString: string) {
    if (!dataString) return "";
    const partes = dataString.split("-");
    if (partes.length !== 3) return dataString;

    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const dia = partes[2];
    const mes = meses[parseInt(partes[1]) - 1];
    const ano = partes[0];

    return `${dia} de ${mes} de ${ano}`;
  }

  function formatarDataCurta(dataString: string) {
    if (!dataString) return "";
    const partes = dataString.split("-");
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  // Retorna os ícones e rótulos amigáveis do status de almoço
  function obterStatusInfo(status: string) {
    switch (status) {
      case "vaiAlmocar":
        return { label: "Almoça na Casa", icone: "🍽️", classe: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      case "comparecerSemAlmoco":
        return { label: "Visita sem Almoço", icone: "🚶", classe: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
      case "comparecerParticular":
        return { label: "Almoço Particular", icone: "🥪", classe: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      default:
        return { label: "Não Comparecerá", icone: "❌", classe: "bg-rose-500/20 text-rose-300 border-rose-500/30" };
    }
  }

  async function carregarDados() {
    try {
      setLoading(true);

      const [casasSnapshot, betelitasSnapshot, programacoesSnapshot] = await Promise.all([
        getDocs(collection(db, "houses")),
        getDocs(collection(db, "betelitas")),
        getDocs(collection(db, "lunchSchedules"))
      ]);

      setTotalCasas(casasSnapshot.size);
      setTotalBetelitas(betelitasSnapshot.size);

      // Mapeia as casas
      const dicionarioCasas: Record<string, any> = {};
      casasSnapshot.forEach((doc) => {
        dicionarioCasas[doc.id] = { id: doc.id, ...doc.data() };
      });

      // Mapeia os betelitas
      const dicionarioBetelitas: Record<string, any> = {};
      betelitasSnapshot.forEach((doc) => {
        dicionarioBetelitas[doc.id] = { id: doc.id, ...doc.data() };
      });

      // Mapeia nomes de convidados avulsos encontrados em todos os documentos de agendamento
      const dicionarioConvidados: Record<string, string> = {};
      programacoesSnapshot.forEach((doc) => {
        const dados = doc.data();
        if (dados.convidadosAvulsos && Array.isArray(dados.convidadosAvulsos)) {
          dados.convidadosAvulsos.forEach((conv: any) => {
            if (conv.id && conv.nome) {
              dicionarioConvidados[conv.id] = conv.nome;
            }
          });
        }
      });

      // 1ª PASSAGEM: Mapear quais Betelitas/Convidados estão ativamente escalados em alguma casa por Data
      const betelitasComCasaPorData: Record<string, Set<string>> = {};

      programacoesSnapshot.forEach((doc) => {
        const dados = doc.data();
        let idProcurado = dados.casaId || "";
        if (idProcurado && typeof idProcurado !== "string") {
          idProcurado = idProcurado.id;
        }

        const dataAgendada = dados.data || "";

        if (idProcurado) {
          if (!betelitasComCasaPorData[dataAgendada]) {
            betelitasComCasaPorData[dataAgendada] = new Set();
          }
          const listaIds = dados.participantes || [];
          listaIds.forEach((id: string) => {
            betelitasComCasaPorData[dataAgendada].add(id);
          });
          // Adiciona também os convidados avulsos vinculados a esta casa
          if (dados.convidadosAvulsos && Array.isArray(dados.convidadosAvulsos)) {
            dados.convidadosAvulsos.forEach((conv: any) => {
              betelitasComCasaPorData[dataAgendada].add(conv.id);
            });
          }
        }
      });

      // Dicionário temporário para agrupar as exibições finais
      const agrupados: Record<string, ProgramacaoRealizada> = {};

      // 2ª PASSAGEM: Construir os agrupamentos respeitando as prioridades
      programacoesSnapshot.forEach((doc) => {
        const dados = doc.data();
        let idProcurado = dados.casaId || "";
        if (idProcurado && typeof idProcurado !== "string") {
          idProcurado = idProcurado.id;
        }

        const dataAgendada = dados.data || "";

        // Reconstrói a lista de participantes do documento (incluindo convidados avulsos)
        const listaParticipantesIds = dados.participantes || [];
        if (dados.convidadosAvulsos && Array.isArray(dados.convidadosAvulsos)) {
          dados.convidadosAvulsos.forEach((conv: any) => {
            if (!listaParticipantesIds.includes(conv.id)) {
              listaParticipantesIds.push(conv.id);
            }
          });
        }

        if (listaParticipantesIds.length === 0 && dados.statusParticipantes) {
          Object.keys(dados.statusParticipantes).forEach((id) => {
            if (!listaParticipantesIds.includes(id)) {
              listaParticipantesIds.push(id);
            }
          });
        }

        // Função auxiliar para resolver o nome correto do participante/convidado
        function obterNomeParticipante(id: string) {
          let nomeBruto = "";
          if (dicionarioBetelitas[id]) {
            nomeBruto = dicionarioBetelitas[id].nome;
          } else if (dicionarioConvidados[id]) {
            nomeBruto = dicionarioConvidados[id];
          } else {
            return `Participante (ID: ${id.substring(0, 5)})`;
          }

          // Remove qualquer estrela ou emoji remanescente do nome
          return nomeBruto.replace(/⭐\s*/g, "").trim();
        }

        // Se NÃO tem casa
        if (!idProcurado) {
          listaParticipantesIds.forEach((betelitaId: string) => {
            if (betelitasComCasaPorData[dataAgendada]?.has(betelitaId)) {
              return;
            }

            const status = dados.statusParticipantes?.[betelitaId] || "naoComparecera";
            const statusInfo = obterStatusInfo(status);

            const part = {
              nome: obterNomeParticipante(betelitaId),
              status: status,
            };

            const chaveAgrupamentoSemCasa = `${dataAgendada}_${status}_semcasa`;

            if (agrupados[chaveAgrupamentoSemCasa]) {
              const jaExiste = agrupados[chaveAgrupamentoSemCasa].participantesDetalhados.some(
                (existente) => existente.nome === part.nome
              );
              if (!jaExiste) {
                agrupados[chaveAgrupamentoSemCasa].participantesDetalhados.push(part);
              }
            } else {
              agrupados[chaveAgrupamentoSemCasa] = {
                id: `${doc.id}_${status}`,
                data: dataAgendada,
                casaId: "",
                casaNome: statusInfo.label,
                casaNumero: "",
                casaFamilia: statusInfo.label,
                endereco: "",
                complemento: "",
                telefone: "",
                participantesDetalhados: [part],
              };
            }
          });
        } else {
          // Se TEM casa, renderiza normalmente agrupando por Casa
          const chaveAgrupamento = `${dataAgendada}_${idProcurado}`;
          const casa = dicionarioCasas[idProcurado] || {};
          const casaNomeFamilia = casa.nomeFamilia || "Sem Nome";
          const logradouro = casa.logradouro || "";
          const casaNumero = casa.numeroEndereco ? ` - ${casa.numeroEndereco}` : ", S/N";
          const complemento = casa.complemento || "";
          const bairro = casa.bairro ? ` - ${casa.bairro}` : "";
          const cidade = casa.cidade ? `, ${casa.cidade}` : "";
          const enderecoCompleto = casa.logradouro
            ? `${logradouro}${casaNumero}${bairro}${cidade}`
            : "Endereço não disponível";

          const endereco = enderecoCompleto.replace(", ,", ",").replace(" - ,", "");
          const telefone = casa.telefone || "Telefone não disponível";

          const novosParticipantes = listaParticipantesIds.map((betelitaId: string) => {
            const status = dados.statusParticipantes?.[betelitaId] || "naoComparecera";
            return {
              nome: obterNomeParticipante(betelitaId),
              status: status,
            };
          });

          if (agrupados[chaveAgrupamento]) {
            novosParticipantes.forEach((novo: any) => {
              const jaExiste = agrupados[chaveAgrupamento].participantesDetalhados.some(
                (existente) => existente.nome === novo.nome
              );
              if (!jaExiste) {
                agrupados[chaveAgrupamento].participantesDetalhados.push(novo);
              }
            });
          } else {
            agrupados[chaveAgrupamento] = {
              id: doc.id,
              data: dataAgendada,
              casaId: idProcurado,
              casaNome: casaNomeFamilia,
              casaNumero: String(casaNumero),
              casaFamilia: casaNomeFamilia,
              endereco,
              complemento: complemento,
              telefone,
              participantesDetalhados: novosParticipantes,
            };
          }
        }
      });

      // Converte o objeto agrupado de volta para array
      let listaProgramacoes = Object.values(agrupados);

      // Filtra para manter apenas a partir de hoje
      const hoje = new Date().toISOString().split("T")[0];
      listaProgramacoes = listaProgramacoes.filter(prog => prog.data >= hoje);

      // Filtra para remover qualquer card de status que tenha ficado sem participantes reais
      listaProgramacoes = listaProgramacoes.filter(prog => prog.participantesDetalhados.length > 0);

      // Ordena: Primeiro por Data (mais recentes), depois por Casa (agendadas vs outros)
      listaProgramacoes.sort((a, b) => {
        const dataComparacao = b.data.localeCompare(a.data);
        if (dataComparacao !== 0) return dataComparacao;

        if (!!a.casaId !== !!b.casaId) {
          return a.casaId ? -1 : 1;
        }

        return 0;
      });

      setProgramacoes(listaProgramacoes);

    } catch (error) {
      console.error("Erro ao carregar dados do Dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Título da Página */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
          Visão Geral do Almoço
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe o painel de distribuição, contagem de betelitas e controle de casas ativas.
        </p>
      </div>

      {/* Grid de Cards de Estatísticas */}
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
          titulo="Próximo Almoço"
          valor={programacoes.length > 0 ? formatarDataCurta(programacoes[0].data) : "Não programado"}
          icone="📅"
          bgColorIcone="bg-indigo-50"
          textColorIcone="text-indigo-600"
        />

        <StatCard
          titulo="Casas Disponíveis"
          valor={programacoes.length > 0
            ? Math.max(0, totalCasas - new Set(programacoes.filter(p => p.data === programacoes[0].data && p.casaId).map(p => p.casaId)).size)
            : totalCasas
          }
          icone="📍"
          bgColorIcone="bg-amber-50"
          textColorIcone="text-amber-600"
        />
      </div>

      {/* Título da seção de programações */}
      <div className="pt-4 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Programações Definidas</h2>
        <p className="text-xs text-slate-400">Distribuição completa de almoços agendados no sistema</p>
      </div>

      {/* LISTA DOS DESTAQUES DE ALMOÇO AGRUPADOS */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          Carregando registros de almoço...
        </div>
      ) : programacoes.length > 0 ? (
        <div className="space-y-6">
          {programacoes.map((prog, idx) => {
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
                  <span className="text-[180px]">🍽️</span>
                </div>

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="bg-slate-700/50 text-slate-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-slate-600/30">
                      PROGRAMAÇÃO AGENDADA
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
                        <span>👥</span> Betelitas Escalados ({prog.participantesDetalhados.length})
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {prog.participantesDetalhados.map((part, index) => {
                          const statusInfo = obterStatusInfo(part.status);
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
            Nenhuma programação de almoço cadastrada no banco de dados.
          </p>
        </div>
      )}
    </div>
  );
}