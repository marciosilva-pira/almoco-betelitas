interface StatCardProps {
  titulo: string;
  valor: string | number;
  icone: string;
  bgColorIcone?: string; // Ex: bg-blue-50
  textColorIcone?: string; // Ex: text-blue-600
}

export default function StatCard({
  titulo,
  valor,
  icone,
  bgColorIcone = "bg-slate-100",
  textColorIcone = "text-slate-600",
}: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            {titulo}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {valor}
          </p>
        </div>
        <span className={`text-xl p-2.5 rounded-lg ${bgColorIcone} ${textColorIcone}`}>
          {icone}
        </span>
      </div>
    </div>
  );
}