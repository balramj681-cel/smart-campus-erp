import { motion } from "framer-motion";

export default function Input({
  label,
  id,
  error,
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-slate-700 select-none"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon size={16} />
          </span>
        )}
        <motion.input
          id={id}
          whileFocus={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={[
            "w-full rounded-xl border bg-slate-50/60 px-4 py-3 text-sm text-slate-900",
            "placeholder:text-slate-400 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 focus:bg-white",
            error
              ? "border-red-400 ring-1 ring-red-300 bg-red-50/40"
              : "border-slate-200 hover:border-slate-300",
            Icon ? "pl-10" : "",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
      {error && (
        <motion.p
          id={`${id}-error`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 font-medium flex items-center gap-1"
        >
          <span>⚠</span> {error}
        </motion.p>
      )}
    </div>
  );
}