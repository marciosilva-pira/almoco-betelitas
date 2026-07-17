"use client";

import { useEffect, useState } from "react";
// Importando o componente de estatísticas com base no caminho padrão do seu app
import EstatisticasContent from "@/app/components/EstatisticasContent";
// Importando a instância do banco de dados do seu arquivo de configuração do Firebase
import { db } from "../../lib/firebase"; 
import { collection, getDocs } from "firebase/firestore";

interface Almoço {
  casa: string;
  data: string;
  betelitas: string[];
}

export default function EstatisticasPage() {
  const [dados, setDados] = useState<Almoço[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buscarDados() {
      try {
        // ATENÇÃO: Substitua 'programacoes' pelo nome exato da sua coleção no Firestore
        const querySnapshot = await getDocs(collection(db, "programacoes"));
        const listaAlmocos: Almoço[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          listaAlmocos.push({
            casa: data.casa || "Casa não informada",
            data: data.data || new Date().toISOString(),
            betelitas: data.betelitas || [],
          });
        });

        setDados(listaAlmocos);
      } catch (error) {
        console.error("Erro ao buscar dados do Firebase:", error);
      } finally {
        setLoading(false);
      }
    }

    buscarDados();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-slate-400 flex items-center justify-center h-full">
        <span>Carregando estatísticas...</span>
      </div>
    );
  }

  return <EstatisticasContent historicoAlmoco={dados} />;
}