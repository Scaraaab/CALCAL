import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function WeightChart({ data }) {
  if (!data || data.length < 2) {
    return <div className="h-48 flex items-center justify-center text-sm text-white/40">Añade al menos 2 pesajes</div>;
  }
  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date)).map((d) => ({
    date: d.date.slice(5),
    kg: d.kg
  }));
  const min = Math.min(...sorted.map((d) => d.kg)) - 1;
  const max = Math.max(...sorted.map((d) => d.kg)) + 1;
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <LineChart data={sorted} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7c5cff" />
              <stop offset="1" stopColor="#c8ff3d" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#ffffff60', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[min, max]} tick={{ fill: '#ffffff60', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: '#10101c', border: '1px solid #ffffff10', borderRadius: 12, color: '#fff' }}
            formatter={(v) => [`${v} kg`, 'Peso']}
          />
          <Line type="monotone" dataKey="kg" stroke="url(#wg)" strokeWidth={3} dot={{ r: 3, fill: '#c8ff3d' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
