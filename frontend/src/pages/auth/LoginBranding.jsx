import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, CalendarCheck, MessageSquareHeart, ShieldCheck, Sparkles } from "lucide-react";

const FEATURES = [
  { icon: CalendarCheck, title: "Smart Attendance", desc: "QR-based aur manual attendance, real-time tracking" },
  { icon: GraduationCap, title: "Complete Academics", desc: "Timetable, marks, exams — sab ek jagah" },
  { icon: MessageSquareHeart, title: "Instant Connect", desc: "Chat, notices, grievances — turant response" },
  { icon: ShieldCheck, title: "Secure & Reliable", desc: "Role-based access, encrypted sessions" },
];

export default function LoginBranding() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % FEATURES.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full flex flex-col justify-center px-14 xl:px-20 py-16 overflow-hidden
      bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800">

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* Floating decorative shapes */}
      <motion.div
        animate={{ y: [0, -16, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-16 right-16 w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20"
      />
      <motion.div
        animate={{ y: [0, 14, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-24 right-32 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
      />

      <div className="relative z-10 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-10"
        >
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center">
            <GraduationCap size={22} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">SmartCampus</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}
          className="text-4xl xl:text-[42px] font-bold text-white leading-tight tracking-tight"
        >
          Har cheez, ek jagah.<br />
          <span className="text-brand-100">College ka poora system.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2 }}
          className="text-brand-100/90 text-base mt-4 leading-relaxed"
        >
          Attendance, academics, communication — sab ek modern, connected platform mein.
        </motion.p>

        {/* Rotating feature showcase */}
        <div className="mt-12 h-24 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center">
                {(() => { const Icon = FEATURES[active].icon; return <Icon size={22} className="text-white" />; })()}
              </div>
              <div>
                <p className="text-white font-semibold text-base">{FEATURES[active].title}</p>
                <p className="text-brand-100/80 text-sm mt-0.5">{FEATURES[active].desc}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-6">
            {FEATURES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Feature ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === active ? 24 : 8, background: i === active ? "white" : "rgba(255,255,255,0.35)" }}
              />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 flex items-center gap-2 text-brand-100/70 text-xs"
        >
          <Sparkles size={13} /> Trusted by institutions nationwide
        </motion.div>
      </div>
    </div>
  );
}