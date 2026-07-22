import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle, Clock, BookOpen, CalendarDays, Users, CheckCircle2,
  Sparkles, ArrowRight, ClipboardCheck, Bell,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { analyticsService, currentAcademicYear } from "../../services/analyticsService";
import { useAuth } from "../../hooks/useAuth";
import { staggerContainer, fadeUp } from "../../lib/motion";
import CountUp from "../../components/ui/CountUp";
import { DashboardSkeleton } from "../../components/ui/Skeleton";

const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

const CARD_THEMES = {
  indigo:  { bg: "bg-gradient-to-br from-brand-50 via-white to-white", icon: "bg-gradient-to-br from-brand-500 to-brand-600 text-white", ring: "hover:ring-brand-100" },
  violet:  { bg: "bg-gradient-to-br from-violet-50 via-white to-white", icon: "bg-gradient-to-br from-violet-500 to-violet-600 text-white", ring: "hover:ring-violet-100" },
  sky:     { bg: "bg-gradient-to-br from-sky-50 via-white to-white", icon: "bg-gradient-to-br from-sky-500 to-sky-600 text-white", ring: "hover:ring-sky-100" },
  emerald: { bg: "bg-gradient-to-br from-emerald-50 via-white to-white", icon: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white", ring: "hover:ring-emerald-100" },
};

const ICON_ACCENTS = {
  indigo: "bg-brand-50 text-brand-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  rose: "bg-rose-50 text-rose-600",
};

function StatCard({ label, value, icon: Icon, accent }) {
  const theme = CARD_THEMES[accent];
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -4 }}
      className={`${theme.bg} rounded-2xl shadow-soft hover:shadow-hover ring-1 ring-transparent ${theme.ring} transition-all duration-300 p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-[28px] font-bold text-slate-900 mt-1.5 tracking-tight">
            <CountUp value={value} />
          </p>
        </div>
        <motion.div whileHover={{ rotate: 8, scale: 1.1 }} transition={{ type: "spring", stiffness: 300 }}
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${theme.icon}`}>
          <Icon size={20} strokeWidth={2.2} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function Panel({ title, action, children, className = "", noPad = false }) {
  return (
    <motion.div variants={fadeUp} className={`bg-white rounded-2xl shadow-soft overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        {action}
      </div>
      <div className={noPad ? "" : "p-5"}>{children}</div>
    </motion.div>
  );
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());

  useEffect(() => { load(academicYear); }, []);

  const load = async (year) => {
    setLoading(true);
    try { setData(await analyticsService.getFacultyAnalytics(year)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <DashboardSkeleton />;

  if (!data) return (
    <div className="flex h-[60vh] items-center justify-center text-slate-400 text-sm">
      Dashboard load nahi hua.
    </div>
  );

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const subjectBarData = (data.subjectAttendanceStats ?? []).map(s => ({
    name: `${s.subjectCode} / ${s.sectionName}`,
    value: s.avgAttendancePercent,
    sessions: s.totalSessions,
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-brand-600 flex items-center gap-1.5 mb-1">
            <Sparkles size={13} /> {greeting}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.firstName} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
          {data.departmentName && (
            <p className="text-xs font-medium text-slate-500 mt-1.5">
              {data.employeeId} · {data.departmentName} · {data.designation?.replace(/_/g, " ")}
            </p>
          )}
        </div>
        <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); load(e.target.value); }}
          className="px-3.5 py-2.5 text-sm font-medium bg-white border-0 shadow-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 hover:shadow-hover transition-shadow">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </motion.div>

      {/* ── KPIs ── */}
      <motion.div variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Subjects Assigned" value={data.totalSubjectsAssigned} icon={BookOpen} accent="indigo" />
        <StatCard label="Periods / Week" value={data.totalPeriodsPerWeek} icon={CalendarDays} accent="violet" />
        <StatCard label="Students Under Me" value={data.totalStudentsUnder} icon={Users} accent="sky" />
        <StatCard label="Sessions Today Marked" value={data.todaySessionsMarked} icon={CheckCircle2}
          accent={data.todaySessionsMarked > 0 ? "emerald" : "indigo"} />
      </motion.div>

      {/* ── Today's Classes — timeline style ── */}
      <Panel
        title="📅 Today's Classes"
        noPad
        action={
          <Link to="/attendance" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            Mark Attendance <ArrowRight size={12} />
          </Link>
        }
      >
        {(data.todayClasses ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-slate-400 gap-2">
            <CalendarDays size={22} className="opacity-30" />
            <p className="text-sm">Aaj koi class scheduled nahi hai.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {data.todayClasses.map((cls, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                whileHover={{ backgroundColor: "#fafafa" }}
                className="flex items-center justify-between px-5 py-3.5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-10 rounded-full ${cls.attendanceMarked ? "bg-gradient-to-b from-emerald-400 to-emerald-500" : "bg-slate-200"}`} />
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{cls.subjectName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sec {cls.sectionName} · {cls.semesterName}
                      {cls.roomNumber && ` · 🏫 ${cls.roomNumber}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-600">P{cls.periodNumber}</p>
                    <p className="text-xs text-slate-400">{cls.startTime?.slice(0, 5)} – {cls.endTime?.slice(0, 5)}</p>
                  </div>
                  {cls.attendanceMarked ? (
                    <span className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                      <CheckCircle size={15} className="text-emerald-500" />
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center">
                      <Clock size={15} className="text-slate-300" />
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── Subject Attendance Chart ── */}
      {subjectBarData.length > 0 && (
        <Panel title="Class-wise Average Attendance">
          <ResponsiveContainer width="100%" height={Math.max(200, subjectBarData.length * 42)}>
            <BarChart data={subjectBarData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={110} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v, _, props) => [`${v}%`, `${props.payload.sessions} sessions`]}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #f1f5f9", boxShadow: "0 4px 16px -2px rgba(0,0,0,0.08)" }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={22} animationDuration={1000} animationEasing="ease-out">
                {subjectBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.value >= 75 ? "#10b981" : entry.value >= 60 ? "#f59e0b" : "#f43f5e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* ── Recent Sessions ── */}
      {(data.recentSessions ?? []).length > 0 && (
        <Panel title="Recent Attendance Sessions" action={
          <Link to="/attendance" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        }>
          <div className="space-y-1">
            {data.recentSessions.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                whileHover={{ x: 2, backgroundColor: "#fafafa" }}
                className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.subjectName}</p>
                    <p className="text-xs text-slate-400">
                      Sec {s.sectionName} · {new Date(s.sessionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 font-semibold">{s.presentCount} P</span>
                  <span className="text-rose-600 font-semibold">{s.absentCount} A</span>
                  <span className={`px-2.5 py-1 rounded-full font-bold ${
                    s.percentage >= 75 ? "bg-emerald-100 text-emerald-700" :
                    s.percentage >= 60 ? "bg-amber-100 text-amber-700" :
                    "bg-rose-100 text-rose-700"}`}>
                    {s.percentage}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Quick Access ── */}
      <Panel title="Quick Access">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Mark Attendance", path: "/attendance", icon: ClipboardCheck, accent: "indigo" },
            { label: "My Timetable", path: "/my-timetable", icon: CalendarDays, accent: "sky" },
            { label: "Enter Marks", path: "/marks", icon: BookOpen, accent: "violet" },
            { label: "Notice Board", path: "/notices", icon: Bell, accent: "rose" },
          ].map((a, i) => (
            <Link key={a.path} to={a.path}>
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-brand-50 transition-colors text-sm text-slate-700 hover:text-brand-700 font-medium"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ICON_ACCENTS[a.accent]}`}>
                  <a.icon size={15} />
                </div>
                {a.label}
              </motion.div>
            </Link>
          ))}
        </div>
      </Panel>
    </motion.div>
  );
}