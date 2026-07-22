import { motion } from "framer-motion";
import LoginBranding from "./LoginBranding";
import LoginForm from "./LoginForm";

export default function Login() {
  return (
    <div className="min-h-screen bg-surface-muted flex overflow-hidden relative">
      {/* Ambient floating gradient blobs — subtle depth, poori page ke peeche */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-0 right-0 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl pointer-events-none"
      />

      {/* Left — branding panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative z-10">
        <LoginBranding />
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="lg:hidden mb-8 flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-brand-500/30">
            SC
          </div>
          <span className="font-bold text-slate-800 text-base">Smart Campus ERP</span>
        </motion.div>

        <LoginForm />
      </div>
    </div>
  );
}