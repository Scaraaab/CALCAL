// Heatmap simple de adherencia (cumplió rango calórico)
export default function AdherenceChart({ days, target }) {
  if (!days?.length || !target) return null;
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const ratio = d.kcal / target;
        let cls = 'bg-white/5';
        let label = 'Sin datos';
        if (d.kcal > 0) {
          if (ratio >= 0.9 && ratio <= 1.1) { cls = 'bg-emerald-500/80'; label = 'Adherente'; }
          else if (ratio < 0.9)              { cls = 'bg-yellow-500/60'; label = 'Bajo objetivo'; }
          else                                { cls = 'bg-rose-500/70';  label = 'Sobre objetivo'; }
        }
        return (
          <div key={d.date} className="flex flex-col items-center gap-1" title={`${d.date}: ${label}`}>
            <div className={`w-full aspect-square rounded-md ${cls}`} />
            <span className="text-[9px] text-white/40">{d.date.slice(-2)}</span>
          </div>
        );
      })}
    </div>
  );
}
