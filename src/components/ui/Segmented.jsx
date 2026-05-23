export default function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex p-1 rounded-2xl bg-ink-700/60 border border-white/5 ${className}`}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              isActive ? 'bg-white text-ink-950 shadow' : 'text-white/60 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
