import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, TriangleAlert, GraduationCap, Wallet, Award, CalendarClock, Bell, ArrowRight, Sparkles } from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { analyticsService, currentAcademicYear, fmt } from "../../services/analyticsService";
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

const ATT_COLORS = { SAFE: "#10b981", AT_RISK: "#f59e0b", DETAINED: "#f43f5e" };
const ATT_BG = {
  SAFE: "bg-emerald-100 text-emerald-700",
  AT_RISK: "bg-amber-100 text-amber-700",
  DETAINED: "bg-rose-100 text-rose-700",
};

const QUICK_LINKS = [
  { label: "Attendance", path: "/my-attendance", icon: GraduationCap, accent: "indigo" },
  { label: "Timetable", path: "/my-timetable", icon: CalendarClock, accent: "sky" },
  { label: "Results", path: "/my-results", icon: Award, accent: "violet" },
  { label: "Fee Payment", path: "/my-fees", icon: Wallet, accent: "emerald" },
  { label: "Exam Schedule", path: "/my-exams", icon: CalendarClock, accent: "amber" },
  { label: "Notices", path: "/notices", icon: Bell, accent: "rose" },
];

const ICON_ACCENTS = {
  indigo: "bg-brand-50 text-brand-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

function Panel({ title, action, children, className = "" }) {
  return (
    <motion.div variants={fadeUp} className={`bg-white rounded-2xl shadow-soft p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());

  useEffect(() => { load(academicYear); }, []);

  const load = async (year) => {
    setLoading(true);
    try { setData(await analyticsService.getStudentAnalytics(year)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <DashboardSkeleton />;

  if (!data) return (
    <div className="flex h-[60vh] items-center justify-center flex-col gap-3 text-slate-400">
      <p className="text-sm">Dashboard load nahi hua.</p>
      <p className="text-xs">Agar pehli baar login kar rahe ho to profile admin se assign karwao.</p>
    </div>
  );

  const low = (data.subjectAttendance ?? []).filter(s => s.percentage < 75);

  const radialData = [{
    name: "Attendance",
    value: data.overallAttendancePercent,
    fill: ATT_COLORS[data.attendanceStatus] ?? "#6366f1",
  }];

  const barData = (data.subjectAttendance ?? []).map(s => ({
    name: s.subjectCode,
    fullName: s.subjectName,
    value: s.percentage,
    fill: ATT_COLORS[s.statusLabel] ?? "#6366f1",
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
            Welcome, {user?.firstName ?? data.enrollmentNumber} 👋
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1.5">
            {data.enrollmentNumber} · {data.programName} · {data.semesterName} · Sec {data.sectionName}
          </p>
        </div>
        <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); load(e.target.value); }}
          className="px-3.5 py-2.5 text-sm font-medium bg-white border-0 shadow-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 hover:shadow-hover transition-shadow">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </motion.div>

      {/* ── Low attendance alert ── */}
      {low.length > 0 && (
        <motion.div
          variants={fadeUp}
          animate={{ x: [0, -4, 4, -3, 3, 0] }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="bg-gradient-to-r from-rose-50 to-rose-50/50 border border-rose-200 rounded-2xl p-4 flex gap-3 shadow-soft"
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
            <TriangleAlert size={17} className="text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-700">
              {low.length} subject(s) mein attendance 75% se kam — Exam eligibility at risk!
            </p>
            <p className="text-xs text-rose-500 mt-0.5">
              {low.map(s => `${s.subjectName} (${s.percentage}%)`).join(" · ")}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Row 1: Attendance + Fee + Result ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Radial attendance */}
        <Panel title="Overall Attendance">
          <div className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={150} height={150}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%"
                  startAngle={90} endAngle={-270} data={radialData}>
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "#f1f5f9" }}
                    animationDuration={1200} animationEasing="ease-out" />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold" style={{ color: ATT_COLORS[data.attendanceStatus] }}>
                  <CountUp value={`${data.overallAttendancePercent}%`} />
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${ATT_BG[data.attendanceStatus] ?? ""}`}>
                  {data.attendanceStatus?.replace("_", " ")}
                </span>
              </div>
            </div>
            <Link to="/my-attendance" className="text-xs font-medium text-brand-600 hover:text-brand-700 mt-3 flex items-center gap-1">
              View details <ArrowRight size={12} />
            </Link>
          </div>
        </Panel>

        {/* Fee summary */}
        <Panel title="Fee Summary">
          <div className="space-y-3.5">
            {[
              { label: "Paid", value: fmt(data.totalFeesPaid), color: "text-emerald-600", bar: "bg-gradient-to-r from-emerald-500 to-emerald-400" },
              { label: "Due", value: fmt(data.totalFeesDue), color: "text-rose-600", bar: "bg-gradient-to-r from-rose-500 to-rose-400" },
            ].map((row, i) => {
              const total = data.totalFeesPaid + data.totalFeesDue;
              const pct = total > 0 ? (row.label === "Paid" ? data.totalFeesPaid / total * 100 : data.totalFeesDue / total * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 font-medium">{row.label}</span>
                    <span className={`font-bold ${row.color}`}>{row.value}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.15, ease: "easeOut" }}
                      className={`h-full rounded-full ${row.bar}`}
                    />
                  </div>
                </div>
              );
            })}
            {data.pendingFeeRecords > 0 && (
              <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                ⚠ {data.pendingFeeRecords} pending fee record(s)
              </p>
            )}
          </div>
          <Link to="/my-fees" className="text-xs font-medium text-brand-600 hover:text-brand-700 mt-4 flex items-center gap-1">
            Pay fees <ArrowRight size={12} />
          </Link>
        </Panel>

        {/* Result summary */}
        <Panel title="Result">
          {data.sgpa != null ? (
            <div className="text-center py-2">
              <p className="text-5xl font-bold bg-gradient-to-br from-brand-600 to-brand-500 bg-clip-text text-transparent tracking-tight">
                <CountUp value={data.sgpa} />
              </p>
              <p className="text-sm text-slate-400 mt-1 font-medium">SGPA</p>
              <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-bold ${
                data.resultStatus === "PASS" ? "bg-emerald-100 text-emerald-700" :
                data.resultStatus === "FAIL" ? "bg-rose-100 text-rose-700" :
                "bg-amber-100 text-amber-700"}`}>
                {data.resultStatus}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-slate-400 gap-1">
              <p className="text-sm">Result abhi available nahi.</p>
              <p className="text-xs">Marks publish hone ke baad dikhega.</p>
            </div>
          )}
          <Link to="/my-results" className="text-xs font-medium text-brand-600 hover:text-brand-700 mt-3 flex items-center justify-center gap-1">
            View full result <ArrowRight size={12} />
          </Link>
        </Panel>
      </div>

      {/* ── Subject-wise Attendance ── */}
      {barData.length > 0 && (
        <Panel
          title="Subject-wise Attendance"
          action={
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />≥75%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />60–74%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{"<60%"}</span>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip
                formatter={(v, _, props) => [`${v}%`, props.payload.fullName]}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #f1f5f9", boxShadow: "0 4px 16px -2px rgba(0,0,0,0.08)" }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={44} animationDuration={1000} animationEasing="ease-out">
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 text-center mt-2">75% minimum required for exam eligibility</p>
        </Panel>
      )}

      {/* ── Upcoming Exams ── */}
      {data.upcomingExams?.length > 0 && (
        <Panel title="Upcoming Exams" action={
          <Link to="/my-exams" className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        }>
          <div className="space-y-1">
            {data.upcomingExams.map((exam, i) => {
              const daysLeft = Math.ceil((new Date(exam.examDate) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  whileHover={{ x: 2, backgroundColor: "#fafafa" }}
                  className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg border-b border-slate-50 last:border-0"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    daysLeft <= 3 ? "bg-rose-50 text-rose-600" : daysLeft <= 7 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"
                  }`}>
                    <CalendarClock size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{exam.subjectName}</p>
                    <p className="text-xs text-slate-400">{exam.examTypeDisplay}{exam.venue && ` · 🏫 ${exam.venue}`}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-700">
                      {new Date(exam.examDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                    <p className={`text-xs font-semibold ${daysLeft <= 3 ? "text-rose-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-400"}`}>
                      {daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `In ${daysLeft} days`}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Notices + Quick Access ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {data.recentNotices?.length > 0 && (
          <Panel title="Recent Notices" action={
            <Link to="/notices" className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
              All <ArrowRight size={12} />
            </Link>
          }>
            <div className="space-y-1">
              {data.recentNotices.map((n, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  whileHover={{ x: 2, backgroundColor: "#fafafa" }}
                  className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg border-b border-slate-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate font-medium">{n.title}</p>
                    <p className="text-xs text-slate-400">{n.category} · {n.postedBy}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{n.createdAt}</span>
                </motion.div>
              ))}
            </div>
          </Panel>
        )}

        <Panel title="Quick Access">
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_LINKS.map((a, i) => (
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
      </div>
    </motion.div>
  );
}