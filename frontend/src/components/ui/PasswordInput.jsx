import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ label, id, error, className = "", ...props }) {
  const [visible, setVisible] = useState(false);

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
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Lock size={16} />
        </span>
        <motion.input
          id={id}
          type={visible ? "text" : "password"}
          whileFocus={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={[
            "w-full rounded-xl border bg-slate-50/60 pl-10 pr-11 py-3 text-sm text-slate-900",
            "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-100",
            "placeholder:text-slate-400 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 focus:bg-white",
            error
              ? "border-red-400 ring-1 ring-red-300 bg-red-50/40"
              : "border-slate-200 hover:border-slate-300",
            className,
          ].join(" ")}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-150 focus:outline-none"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
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