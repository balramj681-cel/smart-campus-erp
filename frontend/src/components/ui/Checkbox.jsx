import { motion } from "framer-motion";

export default function Checkbox({ id,
  label,
  checked,
  onChange,
  disabled = false,
  className = "", }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2.5 select-none group ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={[
            "w-4.5 h-4.5 w-[18px] h-[18px] rounded-md border-2 transition-all duration-200",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1",
            checked
              ? "bg-blue-600 border-blue-600"
              : "bg-white border-slate-300 group-hover:border-blue-400",
          ].join(" ")}
        />
        {checked && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute w-3 h-3 text-white pointer-events-none"
            fill="none"
            viewBox="0 0 12 12"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </div>
      {label && (
        <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors duration-150">
          {label}
        </span>
      )}
    </label>
  );
}