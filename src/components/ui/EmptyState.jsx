export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center gap-3">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-300">
          <Icon size={26} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="text-sm text-white/50 max-w-xs">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
