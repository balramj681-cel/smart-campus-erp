export function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-soft ${hover ? "transition-shadow hover:shadow-hover" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, trend, trendUp, accent = "indigo" }) {
  const accents = {
    indigo:  "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber:   "bg-amber-50 text-amber-600",
    rose:    "bg-rose-50 text-rose-600",
    sky:     "bg-sky-50 text-sky-600",
    violet:  "bg-violet-50 text-violet-600",
  };
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">{value}</p>
          {trend && (
            <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${trendUp ? "text-emerald-600" : "text-slate-400"}`}>
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${accents[accent]}`}>
            <Icon size={19} strokeWidth={2} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}