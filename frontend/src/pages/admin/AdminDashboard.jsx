import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, GraduationCap, Users,
  Building2, Activity, Wallet, Clock, CheckCircle2, BookOpen,
  LayoutGrid, ArrowRight, Bell, Sparkles,
} from "lucide-react";
import { analyticsService, currentAcademicYear, CHART_COLORS, fmt } from "../../services/analyticsService";
import { staggerContainer, fadeUp, scaleIn, cardHover } from "../../lib/motion";
import CountUp from "../../components/ui/CountUp";
import { DashboardSkeleton } from "../../components/ui/Skeleton";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

const CARD_THEMES = {
  indigo: { bg: "bg-gradient-to-br from-brand-50 via-white to-white", icon: "bg-gradient-to-br from-brand-500 to-brand-600 text-white", ring: "hover:ring-brand-100" },
  violet: { bg: "bg-gradient-to-br from-violet-50 via-white to-white", icon: "bg-gradient-to-br from-violet-500 to-violet-600 text-white", ring: "hover:ring-violet-100" },
  sky: { bg: "bg-gradient-to-br from-sky-50 via-white to-white", icon: "bg-gradient-to-br from-sky-500 to-sky-600 text-white", ring: "hover:ring-sky-100" },
  emerald: { bg: "bg-gradient-to-br from-emerald-50 via-white to-white", icon: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white", ring: "hover:ring-emerald-100" },
  rose: { bg: "bg-gradient-to-br from-rose-50 via-white to-white", icon: "bg-gradient-to-br from-rose-500 to-rose-600 text-white", ring: "hover:ring-rose-100" },
  amber: { bg: "bg-gradient-to-br from-amber-50 via-white to-white", icon: "bg-gradient-to-br from-amber-500 to-amber-600 text-white", ring: "hover:ring-amber-100" },
  blue: { bg: "bg-gradient-to-br from-blue-50 via-white to-white", icon: "bg-gradient-to-br from-blue-500 to-blue-600 text-white", ring: "hover:ring-blue-100" },
};

function StatCard({ label, value, sub, icon: Icon, accent = "indigo", trend }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-500" : "text-slate-400";
  const theme = CARD_THEMES[accent];

  return (
    <motion.div variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`${theme.bg} rounded-2xl shadow-soft hover:shadow-hover ring-1 ring-transparent ${theme.ring} transition-all duration-300 p-5 cursor-default`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-[28px] leading-tight font-bold text-slate-900 mt-1.5 tracking-tight">
            <CountUp value={value} />
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {typeof trend === "number" && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
                <TrendIcon size={12} />
              </span>
            )}
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
          </div>
        </div>
        <motion.div
          whileHover={{ rotate: 8, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${theme.icon}`}>
          <Icon size={20} strokeWidth={2.2} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ChartCard({ title, subtitle, children, action, className = "" }) {
  return (
    <motion.div variants={fadeUp}
      className={`bg-white rounded-2xl shadow-soft p-5 ${className}`}>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      {children}
    </motion.div>
  );
}

function DonutWithCenter({ data, colors, centerValue, centerLabel, height = 200 }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={82}
            paddingAngle={3} dataKey="value" stroke="none"
            animationBegin={100} animationDuration={800} animationEasing="ease-out">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [v, n]}
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #f1f5f9", boxShadow: "0 4px 16px -2px rgba(0,0,0,0.08)" }} />
        </PieChart>
      </ResponsiveContainer>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -translate-y-3">
        <p className="text-xl font-bold text-slate-800">{centerValue}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{centerLabel}</p>
      </motion.div>
    </div>
  );
}

function DonutLegend({ data }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
      {data.map((d, i) => (
        <motion.span key={i}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + i * 0.05 }}
          className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
          {d.name ?? d.label}
        </motion.span>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());

  useEffect(() => { load(academicYear); }, []);

  const load = async (year) => {
    setLoading(true);
    try {
      const d = await analyticsService.getAdminAnalytics(year);
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (!data) return (
    <div className="flex h-[60vh] items-center justify-center text-slate-400 text-sm">
      Analytics load nahi hua. Refresh karo.
    </div>
  );

  const collectionRate = data.totalFeesCollected + data.totalFeesPending > 0
    ? ((data.totalFeesCollected / (data.totalFeesCollected + data.totalFeesPending)) * 100).toFixed(1)
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <motion.p
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className="text-xs font-semibold text-brand-600 flex items-center gap-1.5 mb-1">
            <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.2, delay: 0.5 }}>
              <Sparkles size={13} />
            </motion.span>
            {greeting}
          </motion.p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); load(e.target.value); }}
          className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-500 text-white border-0 shadow-[0_4px_14px_-2px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(79,70,229,0.55)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </motion.div>

      {/* ── Core KPIs ── */}
      <motion.div variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={data.totalStudents} sub={`${data.activeStudents} active`} icon={GraduationCap} accent="indigo" />
        <StatCard label="Total Faculty" value={data.totalFaculty} sub={`${data.activeFaculty} active`} icon={Users} accent="violet" />
        <StatCard label="Departments" value={data.totalDepartments} sub={`${data.totalPrograms} programs`} icon={Building2} accent="sky" />
        <StatCard label="Today's Attendance" value={`${data.todayAttendancePercent}%`}
          sub={`${data.todaySessionsMarked} sessions`} icon={Activity}
          accent={data.todayAttendancePercent >= 75 ? "emerald" : "amber"} />
      </motion.div>

      {/* ── Fee KPIs ── */}
      <motion.div variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Collected" value={fmt(data.totalFeesCollected)} sub="All time" icon={Wallet} accent="emerald" />
        <StatCard label="Total Pending" value={fmt(data.totalFeesPending)} sub="Across all students" icon={Clock} accent="rose" />
        <StatCard label="Collection Rate" value={`${collectionRate}%`} sub="Paid vs total" icon={TrendingUp} accent="blue" />
        <StatCard label="Paid Students" value={data.paidStudents} sub={`${data.pendingStudents} pending`} icon={CheckCircle2} accent="emerald" />
      </motion.div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <ChartCard title="Attendance Trend" subtitle="Last 7 days"
          action={<span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">Daily %</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.attendanceTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, "Attendance"]}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #f1f5f9", boxShadow: "0 4px 16px -2px rgba(0,0,0,0.08)" }} />
              <Area type="monotone" dataKey={() => 75} stroke="#f87171" strokeDasharray="5 5" strokeWidth={1.5} dot={false} fill="none" legendType="none" isAnimationActive={false} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5}
                fill="url(#attendanceFill)" dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}
                animationDuration={1200} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fee Collection" subtitle="Last 6 months"
          action={<span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">Monthly ₹</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.feeCollectionTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="feeBarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
              <Tooltip formatter={(v) => [fmt(v), "Collected"]}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #f1f5f9", boxShadow: "0 4px 16px -2px rgba(0,0,0,0.08)" }}
                cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="value" fill="url(#feeBarFill)" radius={[8, 8, 0, 0]} maxBarSize={42}
                animationDuration={1000} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <motion.div variants={staggerContainer} className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <ChartCard title="Fee Status">
          <DonutWithCenter data={data.feeStatusBreakdown} colors={CHART_COLORS}
            centerValue={`${collectionRate}%`} centerLabel="Collected" />
          <DonutLegend data={data.feeStatusBreakdown} />
        </ChartCard>

        <ChartCard title="Students by Department" subtitle={`${data.totalStudents} total`}>
          <DonutWithCenter
            data={data.studentsByDepartment} colors={CHART_COLORS}
            centerValue={data.totalStudents} centerLabel="Students" />
          <DonutLegend data={data.studentsByDepartment.map((d, i) => ({ ...d, color: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }))} />
        </ChartCard>

        <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-soft p-5">
          <SectionHeader title="Quick Stats" />
          <div className="space-y-1">
            {[
              { label: "Total Sections", val: data.totalSections, icon: LayoutGrid, accent: "sky" },
              { label: "Total Subjects", val: data.totalSubjects, icon: BookOpen, accent: "violet" },
              { label: "Today Sessions", val: data.todaySessionsMarked, icon: CheckCircle2, accent: "emerald" },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${CARD_THEMES[s.accent]}`}>
                    <s.icon size={14} />
                  </div>
                  <span className="text-sm text-slate-600">{s.label}</span>
                </div>
                <span className="font-bold text-slate-800 text-sm"><CountUp value={s.val} /></span>
              </motion.div>
            ))}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-50">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Quick Links</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Students", path: "/students", icon: GraduationCap },
                { label: "Faculty", path: "/faculty", icon: Users },
                { label: "Attendance", path: "/attendance", icon: Activity },
                { label: "Fees", path: "/finance", icon: Wallet },
              ].map(a => (
                <Link key={a.path} to={a.path}>
                  <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-brand-50 rounded-xl text-xs font-medium text-slate-600 hover:text-brand-700 transition-colors">
                    <a.icon size={14} /> {a.label}
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Recent Notices ── */}
      {data.recentNotices?.length > 0 && (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-soft p-5">
          <SectionHeader title="Recent Notices" action={
            <Link to="/notices">
              <motion.span whileHover={{ x: 3 }}
                className="text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-1.5 rounded-lg shadow-[0_2px_8px_-2px_rgba(79,70,229,0.4)] hover:shadow-[0_4px_14px_-2px_rgba(79,70,229,0.5)] flex items-center gap-1">
                View all <ArrowRight size={13} />
              </motion.span>
            </Link>
          } />
          <div className="space-y-1">
            {data.recentNotices.map((n, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ x: 2, backgroundColor: "#fafafa" }}
                className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                  <Bell size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.postedBy} · {n.category}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{n.createdAt}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}