import { motion } from "framer-motion";

const VARIANTS = {
  primary: "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-[0_4px_14px_-2px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(79,70,229,0.55)]",
  secondary: "bg-white text-slate-700 shadow-soft hover:shadow-hover border border-slate-100",
  ghost: "bg-transparent text-slate-600 hover:bg-brand-50 hover:text-brand-700",
  danger: "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-[0_4px_14px_-2px_rgba(225,29,72,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(225,29,72,0.55)]",
  success: "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_4px_14px_-2px_rgba(5,150,105,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(5,150,105,0.55)]",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

export default function Button({
  children, variant = "primary", size = "md", icon: Icon,
  iconPosition = "left", loading = false, disabled = false,
  className = "", ...props
}) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: disabled ? 1 : 1.015 }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={disabled || loading}
      className={[
        "relative inline-flex items-center justify-center rounded-xl font-semibold",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
        "overflow-hidden group",
        VARIANTS[variant], SIZES[size], className,
      ].join(" ")}
      {...props}
    >
      {/* Shine sweep on hover — premium button jaisa feel */}
      {(variant === "primary" || variant === "danger" || variant === "success") && (
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12" />
      )}
      {loading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon size={size === "lg" ? 18 : size === "sm" ? 13 : 15} />}
          <span className="relative z-10">{children}</span>
          {Icon && iconPosition === "right" && <Icon size={size === "lg" ? 18 : size === "sm" ? 13 : 15} />}
        </>
      )}
    </motion.button>
  );
}