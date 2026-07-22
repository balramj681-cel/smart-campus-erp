import { useEffect, useState } from "react";
import {
  FileSpreadsheet, FileText, Users, Wallet, ClipboardList,
  Download, Loader2, FileBarChart,
} from "lucide-react";
import toast from "react-hot-toast";
import { reportService } from "../../services/reportService";
import { academicService } from "../../services/academicService";
import { currentAcademicYear } from "../../services/attendanceService";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
const disabledCls = `${inputCls} disabled:bg-slate-50 disabled:text-slate-400`;

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ReportCard({ icon: Icon, title, description, color, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function DownloadButton({ onClick, label, icon: Icon, variant = "primary" }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClick();
      toast.success("Report downloaded!");
    } catch (err) {
      toast.error(err?.message ?? "Report download failed");
    } finally {
      setLoading(false);
    }
  };

  const styles = variant === "primary"
    ? "bg-indigo-600 text-white hover:bg-indigo-700"
    : "bg-slate-100 text-slate-700 hover:bg-slate-200";

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${styles}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

// ─── Students Report ────────────────────────────────────────────────────────

function StudentsReportCard() {
  const [batch, setBatch] = useState("");

  return (
    <ReportCard
      icon={Users}
      title="Student List Report"
      description="Full roster with department, program, and section — optionally filtered by batch."
      color="bg-indigo-50 text-indigo-600"
    >
      <Field label="Batch (optional)">
        <input
          type="number"
          placeholder="e.g. 2023"
          className={inputCls}
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
        />
      </Field>
      <div className="flex gap-2 mt-3">
        <DownloadButton
          icon={FileSpreadsheet}
          label="Excel"
          onClick={() => reportService.downloadStudentsExcel(batch || undefined)}
        />
        <DownloadButton
          icon={FileText}
          label="PDF"
          variant="secondary"
          onClick={() => reportService.downloadStudentsPdf(batch || undefined)}
        />
      </div>
    </ReportCard>
  );
}

// ─── Fee Collection Report ──────────────────────────────────────────────────

function FeeCollectionReportCard() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  return (
    <ReportCard
      icon={Wallet}
      title="Fee Collection Report"
      description="All payments recorded within a date range, with a running total."
      color="bg-amber-50 text-amber-600"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 mt-3">
        <DownloadButton
          icon={FileSpreadsheet}
          label="Excel"
          onClick={() => reportService.downloadFeeCollectionExcel(from, to)}
        />
      </div>
    </ReportCard>
  );
}

// ─── Attendance Report ──────────────────────────────────────────────────────

function AttendanceReportCard() {
  const [depts, setDepts] = useState([]);
  const [progs, setProgs] = useState([]);
  const [sems, setSems] = useState([]);
  const [secs, setSecs] = useState([]);
  const [ids, setIds] = useState({ dept: "", prog: "", sem: "", sec: "" });
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());

  useEffect(() => {
    academicService.getDepartments().then((d) => setDepts(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const set = (k, v) => setIds((p) => ({ ...p, [k]: v }));

  const onDept = async (id) => {
    set("dept", id); set("prog", ""); set("sem", ""); set("sec", "");
    setProgs([]); setSems([]); setSecs([]);
    if (id) setProgs(await academicService.getPrograms(id).then((d) => (Array.isArray(d) ? d : [])));
  };
  const onProg = async (id) => {
    set("prog", id); set("sem", ""); set("sec", "");
    setSems([]); setSecs([]);
    if (id) setSems(await academicService.getSemesters(id).then((d) => (Array.isArray(d) ? d : [])));
  };
  const onSem = async (id) => {
    set("sem", id); set("sec", "");
    setSecs([]);
    if (id) setSecs(await academicService.getSections(id).then((d) => (Array.isArray(d) ? d : [])));
  };

  return (
    <ReportCard
      icon={ClipboardList}
      title="Attendance Summary Report"
      description="Subject-wise attendance percentage for every student in a section."
      color="bg-blue-50 text-blue-600"
    >
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Department">
          <select value={ids.dept} onChange={(e) => onDept(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Program">
          <select value={ids.prog} onChange={(e) => onProg(e.target.value)} disabled={!ids.dept} className={disabledCls}>
            <option value="">—</option>
            {progs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Semester">
          <select value={ids.sem} onChange={(e) => onSem(e.target.value)} disabled={!ids.prog} className={disabledCls}>
            <option value="">—</option>
            {sems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Section">
          <select value={ids.sec} onChange={(e) => set("sec", e.target.value)} disabled={!ids.sem} className={disabledCls}>
            <option value="">—</option>
            {secs.map((s) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Academic Year">
        <input className={inputCls} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
      </Field>
      <div className="flex gap-2 mt-3">
        <DownloadButton
          icon={FileSpreadsheet}
          label="Excel"
          onClick={() => {
            if (!ids.sec) { toast.error("Pehle section select karo"); throw new Error("no section"); }
            return reportService.downloadAttendanceExcel(ids.sec, academicYear);
          }}
        />
      </div>
    </ReportCard>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <FileBarChart className="text-indigo-600" size={22} />
        <h1 className="text-xl font-semibold text-slate-800">Reports & Export</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Generate downloadable Excel and PDF reports across students, fees, and attendance.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <StudentsReportCard />
        <FeeCollectionReportCard />
        <AttendanceReportCard />
      </div>
    </div>
  );
}