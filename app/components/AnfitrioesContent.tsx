"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Phone, MapPin, Search, X, MessageCircle } from "lucide-react";

export default function AnfitrioesContent() {
    const [casas, setCasas] = useState<any[]>([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function carregarCasas() {
            const snapshot = await getDocs(collection(db, "houses"));
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCasas(lista);
            setLoading(false);
        }
        carregarCasas();
    }, []);

    // Lógica de filtragem
    const normalizar = (texto: string) => {
        return texto
            .normalize("NFD") // Decompõe os caracteres (separa o acento da letra)
            .replace(/[\u0300-\u036f]/g, "") // Remove os acentos (diacríticos)
            .toLowerCase();
    };

    const termoBusca = normalizar(busca);

    const casasFiltradas = casas.filter(casa =>
        normalizar(casa.nomeFamilia || "").includes(termoBusca) ||
        casa.numeroEndereco?.toString().includes(busca) ||
        normalizar(casa.responsavel || "").includes(termoBusca) ||
        normalizar(casa.bairro || "").includes(termoBusca)
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Lista de Anfitriões</h1>

            {/* Campo de Busca */}
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />

                <input
                    type="text"
                    value={busca}
                    placeholder="Buscar por número, família, resp. ou bairro"
                    className="w-full pl-10 pr-10 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    onChange={(e) => setBusca(e.target.value)}
                />

                {/* Botão de Limpar que só aparece se houver texto */}
                {busca && (
                    <button
                        onClick={() => setBusca("")}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Grid de Cards */}
            {loading ? <p>Carregando...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {casasFiltradas
                        .sort((a, b) => a.nomeFamilia.localeCompare(b.nomeFamilia)) // <-- ADICIONE ESTA LINHA
                        .map((casa) => (
                            <div key={casa.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                <h3 className="font-bold text-lg text-slate-800">{casa.nomeFamilia}</h3>
                                <p className="text-sm text-slate-500 mb-4">Resp: {casa.responsavel}</p>

                                <div className="space-y-2 text-sm text-slate-600">
                                    <p>{casa.logradouro}, {casa.numeroEndereco} - {casa.bairro}</p>
                                    <p>{casa.complemento}</p>
                                    <p>{casa.telefone}</p>
                                </div>

                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                    {/* Maps - Aumentado para p-3 e size 22 */}
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${casa.logradouro}, ${casa.numeroEndereco}, ${casa.cidade}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <MapPin size={22} />
                                    </a>

                                    {/* WhatsApp - Agora com ícone oficial e tamanho ajustado */}
                                    <a
                                        href={`https://wa.me/55${casa.telefone?.replace(/\D/g, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                    >
                                        <MessageCircle size={22} />
                                    </a>

                                    {/* Ligar - Aumentado para p-3 e size 22 */}
                                    <a
                                        href={`tel:${casa.telefone?.replace(/\D/g, "")}`}
                                        className="p-3 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <Phone size={22} />
                                    </a>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}