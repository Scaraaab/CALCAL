import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';

export default function CaloriesChart({ data, target }) {
  if (!data?.length) {
    return <div className="h-48 flex items-center justify-center text-sm text-white/40">Sin datos aún</div>;
  }
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#ffffff60', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#ffffff60', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: '#10101c', border: '1px solid #ffffff10', borderRadius: 12, color: '#fff' }}
            formatter={(v) => [`${v} kcal`, 'Consumido']}
          />
          {target && <ReferenceLine y={target} stroke="#c8ff3d" strokeDasharray="4 4" />}
          <Bar dataKey="kcal" fill="#7c5cff" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
