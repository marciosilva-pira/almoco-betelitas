import React from 'react';

// Ajuste os tipos de acordo com o seu modelo de dados real
interface Almoço {
    casa: string;
    data: string;
    betelitas: string[];
}

export default function EstatisticasContent({ historicoAlmoco = [] }: { historicoAlmoco?: Almoço[] }) {
    if (!historicoAlmoco || historicoAlmoco.length === 0) {
        return <p>Nenhum dado de almoço encontrado.</p>;
    }
    // 1. Agrupamento e cálculo das estatísticas
    const estatisticas = historicoAlmoco.reduce((acc, curr) => {
        if (!acc[curr.casa]) {
            acc[curr.casa] = { total: 0, ultimaData: curr.data, betelitas: [] };
        }
        acc[curr.casa].total += 1;

        // Atualiza a última data se for mais recente
        if (new Date(curr.data) > new Date(acc[curr.casa].ultimaData)) {
            acc[curr.casa].ultimaData = curr.data;
            acc[curr.casa].betelitas = curr.betelitas;
        }
        return acc;
    }, {} as Record<string, { total: number; ultimaData: string; betelitas: string[] }>);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Estatísticas das Casas</h2>
            <div className="grid gap-4">
                {Object.entries(estatisticas).map(([casa, info]) => (
                    <div key={casa} className="bg-slate-800 p-4 rounded-lg text-slate-300">
                        <h3 className="text-lg font-semibold text-white">{casa}</h3>
                        <p>Almoços realizados: {info.total}</p>
                        <p>Última vez: {new Date(info.ultimaData).toLocaleDateString()}</p>
                        <p>Últimos betelitas: {info.betelitas.join(', ')}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}