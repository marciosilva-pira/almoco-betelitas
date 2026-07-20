"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface EstatisticaCasa {
  total: number;
  ultimaData: string;
  betelitas: string[];
}

interface Almoço {
  casa: string;
  data: string;
  betelitas: string[];
}

interface EstatisticasContentProps {
  historicoAlmoco: Almoço[]; // <-- Adicione esta linha nas propriedades aceitas pelo componente
}

export default function EstatisticasPage({ historicoAlmoco }: EstatisticasContentProps) {
  const [estatisticas, setEstatisticas] = useState<Record<string, EstatisticaCasa>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  async function carregarEstatisticas() {
    try {
      setLoading(true);

      const [casasSnapshot, betelitasSnapshot, programacoesSnapshot] = await Promise.all([
        getDocs(collection(db, "houses")),
        getDocs(collection(db, "betelitas")),
        getDocs(collection(db, "lunchSchedules"))
      ]);

      const dicionarioCasas: Record<string, string> = {};
      casasSnapshot.forEach((doc) => {
        const dados = doc.data();
        dicionarioCasas[doc.id] = dados.nomeFamilia || "Casa sem Nome";
      });

      const dicionarioBetelitas: Record<string, string> = {};
      betelitasSnapshot.forEach((doc) => {
        const dados = doc.data();
        dicionarioBetelitas[doc.id] = dados.nome || "Betelita";
      });

      // Data de hoje no formato YYYY-MM-DD
      const hoje = new Date().toISOString().split("T")[0];

      // Rastreia combinações únicas de Casa + Data para evitar contagem duplicada no mesmo dia
      const almocosRegistradosPorData = new Set<string>();

      // Auxiliar para acumular os dados por Nome da Casa
      const acumulado: Record<string, { datasSet: Set<string>; betelitasSet: Set<string> }> = {};

      programacoesSnapshot.forEach((doc) => {
        const dados = doc.data();
        let casaId = dados.casaId || "";
        if (casaId && typeof casaId !== "string") {
          casaId = casaId.id;
        }

        const dataAgendada = dados.data || "";

        // Ignora programações futuras ou sem data (apenas histórico passado)
        if (!dataAgendada || dataAgendada > hoje) return;

        if (casaId) {
          const nomeCasa = dicionarioCasas[casaId] || "Casa Desconhecida";

          if (!acumulado[nomeCasa]) {
            acumulado[nomeCasa] = { datasSet: new Set(), betelitasSet: new Set() };
          }

          // Chave única para garantir 1 contagem por casa por dia
          const chaveCasaData = `${casaId}_${dataAgendada}`;
          if (!almocosRegistradosPorData.has(chaveCasaData)) {
            almocosRegistradosPorData.add(chaveCasaData);
            acumulado[nomeCasa].datasSet.add(dataAgendada);
          }

          // Processa os participantes do documento
          const participantesIds = dados.participantes || [];
          const statusParticipantes = dados.statusParticipantes || {};

          participantesIds.forEach((id: string) => {
            const status = statusParticipantes[id];
            // Ignora quem não compareceu
            if (status === "naoComparecera") return;

            const nomeBetelita = dicionarioBetelitas[id];
            if (nomeBetelita) {
              acumulado[nomeCasa].betelitasSet.add(nomeBetelita);
            }
          });
        }
      });

      // Formata para o objeto final de exibição
      const resultadoFinal: Record<string, EstatisticaCasa> = {};
      Object.keys(acumulado).forEach((casa) => {
        const datasArray = Array.from(acumulado[casa].datasSet).sort();
        const ultimaData = datasArray.length > 0 ? datasArray[datasArray.length - 1] : "";

        resultadoFinal[casa] = {
          total: acumulado[casa].datasSet.size, // Conta apenas dias únicos de almoço realizados
          ultimaData: ultimaData,
          betelitas: Array.from(acumulado[casa].betelitasSet)
        };
      });

      setEstatisticas(resultadoFinal);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        Carregando estatísticas...
      </div>
    );
  }

  const entradas = Object.entries(estatisticas);

  if (entradas.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-slate-900">Estatísticas das Casas</h2>
        <p className="text-slate-500">Nenhum dado de almoço encontrado.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Estatísticas das Casas</h2>
        <p className="text-sm text-slate-500 mt-1">Resumo consolidado do histórico de almoços realizados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entradas.map(([casa, info]) => (
          <div key={casa} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-lg font-bold text-slate-800">{casa}</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong className="text-slate-900">Almoços realizados:</strong> {info.total}</p>
              <p><strong className="text-slate-900">Última data:</strong> {info.ultimaData ? info.ultimaData.split("-").reverse().join("/") : "-"}</p>
              <div>
                <strong className="text-slate-900">Betelitas que frequentaram:</strong>
                <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                  {info.betelitas.length > 0 ? info.betelitas.join(", ") : "Nenhum registrado"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}