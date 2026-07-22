import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight,
  ClipboardList, Clock, Loader2, Pencil, Save, X, UserX, UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  attendanceService, debarmentService,
  STATUS_CONFIG, SUMMARY_STATUS, currentAcademicYear,
} from "../../services/attendanceService";
import { timetableService } from "../../services/timetableService";
import { academicService } from "../../services/academicService";
import { useAuth } from "../../hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
const disabledCls = inputCls + " disabled:bg-slate-50 disabled:text-slate-400";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ open, title, wide, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className={`relative w-full ${wide ? "max-w-3xl" : "max-w-lg"} bg-white rounded-2xl shadow-xl`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Status Toggle ────────────────────────────────────────────────────────────
function StatusToggle({ status, onChange }) {
  const cycle = { PRESENT: "ABSENT", ABSENT: "LATE", LATE: "PRESENT" };
  const cfg = STATUS_CONFIG[status];
  return (
    <button type="button" onClick={() => onChange(cycle[status])}
      className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${cfg.color}`}
      title={cfg.fullLabel}>
      {cfg.label}
    </button>
  );
}

// ─── Section Drill-down (Admin ke liye) ──────────────────────────────────────
function SectionDrillDown({ onSelect }) {
  const [depts, setDepts] = useState([]);
  const [progs, setProgs] = useState([]);
  const [sems, setSems] = useState([]);
  const [secs, setSecs] = useState([]);
  const [ids, setIds] = useState({ dept: "", prog: "", sem: "", sec: "" });

  useEffect(() => {
    academicService.getDepartments().then(d => setDepts(Array.isArray(d) ? d : [])).catch(() => { });
  }, []);

  const set = (k, v) => setIds(p => ({ ...p, [k]: v }));
  const onDept = async (id) => {
    set("dept", id); set("prog", ""); set("sem", ""); set("sec", "");
    setProgs([]); setSems([]); setSecs([]);
    if (id) setProgs(await academicService.getPrograms(id).then(d => Array.isArray(d) ? d : []));
  };
  const onProg = async (id) => {
    set("prog", id); set("sem", ""); set("sec", ""); setSems([]); setSecs([]);
    if (id) setSems(await academicService.getSemesters(id).then(d => Array.isArray(d) ? d : []));
  };
  const onSem = async (id) => {
    set("sem", id); set("sec", ""); setSecs([]);
    if (id) setSecs(await academicService.getSections(id).then(d => Array.isArray(d) ? d : []));
  };
  const onSec = (id) => {
    set("sec", id);
    const s = secs.find(x => x.id === id);
    if (s) onSelect(s);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Field label="Department"><select value={ids.dept} onChange={e => onDept(e.target.value)} className={inputCls}><option value="">—</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      <Field label="Program"><select value={ids.prog} onChange={e => onProg(e.target.value)} disabled={!ids.dept} className={disabledCls}><option value="">—</option>{progs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Semester"><select value={ids.sem} onChange={e => onSem(e.target.value)} disabled={!ids.prog} className={disabledCls}><option value="">—</option>{sems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Section"><select value={ids.sec} onChange={e => onSec(e.target.value)} disabled={!ids.sem} className={disabledCls}><option value="">—</option>{secs.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}</select></Field>
    </div>
  );
}

// ─── Tab 1: Mark Attendance ───────────────────────────────────────────────────
function MarkAttendanceTab() {
  const { user } = useAuth();
  const isFaculty = user?.role === "faculty" || user?.role === "hod" ||
    user?.role === "FACULTY" || user?.role === "HOD";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" ||
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [date, setDate] = useState(today());
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [section, setSection] = useState(null);

  // Step 2: classes for selected date
  const [schedule, setSchedule] = useState([]);
  const [loadingSched, setLoadingSched] = useState(false);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  // Step 3: selected class + students
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Faculty ke liye auto-load today's schedule on mount
  useEffect(() => {
    if (isFaculty) {
      loadFacultySchedule(today(), academicYear);
    }
  }, []);

  const loadFacultySchedule = async (d, year) => {
    setLoadingSched(true);
    setSchedule([]); setSelectedEntry(null); setStudents([]);
    setScheduleLoaded(false); setSubmitted(false);
    try {
      const data = await attendanceService.getMySchedule(d, year);
      const arr = Array.isArray(data) ? data : [];
      setSchedule(arr);
      setScheduleLoaded(true);
      if (arr.length === 0) toast("Aaj koi class scheduled nahi hai.", { icon: "📅" });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Schedule load nahi hua");
    } finally {
      setLoadingSched(false);
    }
  };

  const loadAdminSchedule = async () => {
    if (!section) return toast.error("Section select karo pehle");
    setLoadingSched(true);
    setSchedule([]); setSelectedEntry(null); setStudents([]);
    setScheduleLoaded(false); setSubmitted(false);
    try {
      const data = await timetableService.getForDate(section.id, date, academicYear);
      const arr = Array.isArray(data) ? data : [];
      setSchedule(arr);
      setScheduleLoaded(true);
      if (arr.length === 0) toast("Is din koi class scheduled nahi hai.", { icon: "📅" });
    } catch {
      toast.error("Schedule load nahi hua");
    } finally {
      setLoadingSched(false);
    }
  };

  const selectClass = async (entry) => {
    setSelectedEntry(entry); setStudents([]); setSubmitted(false);
    setLoadingStudents(true);
    try {
      const sectionId = isFaculty ? entry.sectionId : section?.id;
      if (!sectionId) return toast.error("Section ID nahi mila");
      const data = await attendanceService.getStudents(sectionId);
      setStudents((Array.isArray(data) ? data : []).map(s => ({ ...s, status: "PRESENT" })));
    } catch {
      toast.error("Students load nahi hue. Section mein students assign karo pehle.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStatus = (idx, status) =>
    setStudents(prev => prev.map((s, i) => i === idx ? { ...s, status } : s));
  const markAll = (status) => setStudents(p => p.map(s => ({ ...s, status })));

  const handleSubmit = async () => {
    if (!selectedEntry) return toast.error("Class select karo");
    if (students.length === 0) return toast.error("Koi student nahi mila");
    setSaving(true);
    try {
      const sectionId = isFaculty ? selectedEntry.sectionId : section?.id;
      console.log("Sending periodNumber:", selectedEntry.periodNumber);
      await attendanceService.mark({
        sectionId,
        subjectId: selectedEntry.subjectId,
        sessionDate: date,
        academicYear,
        periodNumber: selectedEntry.periodNumber,
        remarks,
        records: students.map(s => ({ studentId: s.studentId, status: s.status, remarks: "" })),
      });
      toast.success("Attendance marked successfully!");
      setSubmitted(true);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const present = students.filter(s => s.status === "PRESENT").length;
  const late = students.filter(s => s.status === "LATE").length;
  const absent = students.filter(s => s.status === "ABSENT").length;

  const subjectColors = [
    "border-blue-300 bg-blue-50 text-blue-800",
    "border-violet-300 bg-violet-50 text-violet-800",
    "border-emerald-300 bg-emerald-50 text-emerald-800",
    "border-amber-300 bg-amber-50 text-amber-800",
    "border-rose-300 bg-rose-50 text-rose-800",
  ];
  const getColor = (idx) => subjectColors[idx % subjectColors.length];

  return (
    <div className="space-y-5">

      {/* ── Step 1 ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
          Step 1 — {isFaculty ? "Date select karo" : "Section & Date select karo"}
        </p>

        {/* Admin ke liye section drill-down */}
        {isAdmin && (
          <SectionDrillDown onSelect={sec => {
            setSection(sec);
            setSchedule([]); setSelectedEntry(null); setStudents([]);
            setScheduleLoaded(false); setSubmitted(false);
          }} />
        )}

        {/* Faculty ke liye info */}
        {isFaculty && (
          <div className="bg-indigo-50 rounded-xl px-4 py-2.5 text-sm text-indigo-700 font-medium">
            📅 Aapka schedule auto-load hota hai. Date choose karo:
          </div>
        )}

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <Field label="Date">
              <input type="date" value={date} max={today()}
                onChange={e => {
                  setDate(e.target.value);
                  setSchedule([]); setSelectedEntry(null);
                  setStudents([]); setScheduleLoaded(false); setSubmitted(false);
                  if (isFaculty) loadFacultySchedule(e.target.value, academicYear);
                }}
                className={inputCls} />
            </Field>
          </div>
          <div className="w-36">
            <Field label="Academic Year">
              <select value={academicYear} onChange={e => {
                setAcademicYear(e.target.value);
                if (isFaculty) loadFacultySchedule(date, e.target.value);
              }} className={inputCls}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>
          {isAdmin && (
            <button onClick={loadAdminSchedule} disabled={!section || loadingSched}
              className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {loadingSched ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
              Load Schedule
            </button>
          )}
          {isFaculty && loadingSched && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading...
            </div>
          )}
        </div>
      </div>

      {/* ── Step 2: Class select ── */}
      {scheduleLoaded && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
            Step 2 — Class select karo ({new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" })})
          </p>
          {schedule.length === 0 ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
              <CalendarDays size={18} />
              <p>Is din koi class scheduled nahi hai. Timetable mein add karo pehle.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

              {schedule.map((entry, idx) => {
                const isSelected = selectedEntry?.id === entry.id;
                const onLeave = entry.facultyOnLeave;
                return (
                  <button key={entry.id} onClick={() => !onLeave && selectClass(entry)}
                    disabled={onLeave}
                    className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${onLeave ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                      : isSelected ? "border-indigo-500 bg-indigo-50" : getColor(idx) + " hover:border-opacity-70"
                      }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs opacity-70">{entry.subjectCode}</span>
                      <span className="flex items-center gap-1 text-xs opacity-60">
                        <Clock size={10} /> P{entry.periodNumber}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-tight">{entry.subjectName}</p>
                    <p className="text-xs opacity-60 mt-1">{entry.facultyName}</p>
                    {entry.roomNumber && <p className="text-xs opacity-50">🏫 {entry.roomNumber}</p>}
                    {onLeave && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full">
                        🚫 Faculty on Leave
                      </span>
                    )}
                    {!onLeave && isSelected && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-indigo-500 text-white text-[10px] rounded-full">
                        Selected ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Mark students ── */}
      {selectedEntry && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-slate-800">Step 3 — Attendance Mark Karo</p>
              <p className="text-xs text-slate-400">{selectedEntry.subjectName} · {selectedEntry.facultyName}</p>
            </div>
            <Field label="Remarks">
              <input value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="Optional..." className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none w-48" />
            </Field>
          </div>

          {students.length > 0 && !loadingStudents && (
            <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-2.5 border-b border-slate-100">
              <div className="flex gap-4">
                <span className="text-xs font-medium text-green-600">✔ {present} P</span>
                <span className="text-xs font-medium text-amber-600">⏰ {late} L</span>
                <span className="text-xs font-medium text-red-600">✘ {absent} A</span>
              </div>
              <div className="flex gap-2">
                {["PRESENT", "LATE", "ABSENT"].map(s => (
                  <button key={s} onClick={() => markAll(s)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border ${STATUS_CONFIG[s].light}`}>
                    All {STATUS_CONFIG[s].fullLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingStudents ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <AlertTriangle size={28} className="opacity-30" />
              <p className="text-sm">Section mein koi student nahi mila.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {students.map((s, idx) => (
                <div key={s.studentId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.studentName}</p>
                    <p className="text-xs text-slate-400">{s.enrollmentNumber}</p>
                  </div>
                  <StatusToggle status={s.status} onChange={v => toggleStatus(idx, v)} />
                </div>
              ))}
            </div>
          )}

          {students.length > 0 && (
            <div className="px-4 py-4 border-t border-slate-100 bg-slate-50">
              {submitted ? (
                <div className="flex items-center justify-center gap-2 text-green-600 font-medium text-sm py-2">
                  <Check size={16} /> Attendance submitted!
                </div>
              ) : (
                <button onClick={handleSubmit} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Submit Attendance ({students.length} Students)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Sessions History + Edit (Bug 3) ───────────────────────────────────
function SessionsTab() {
  const [section, setSection] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(false);
  const [viewSession, setViewSession] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editStudents, setEditStudents] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const { user } = useAuth();
  const isFaculty = ["faculty", "hod", "FACULTY", "HOD"].includes(user?.role);

  const fetchSessions = async (page = 0, sec = section) => {
    if (!sec && !isFaculty) return;
    setLoading(true);
    try {
      const params = { page, size: 15 };
      let data;
      if (isFaculty && !sec) {
        // Faculty apni khud ki sessions dekhta hai — section drill-down ki
        // zaroorat nahi, backend login-email se khud resolve karta hai.
        data = await attendanceService.getMySessions(params);
      } else {
        if (sec) params.sectionId = sec.id;
        data = await attendanceService.getSessions(params);
      }
      setSessions(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Sessions load nahi hue"); }
    finally { setLoading(false); }
  };

  const openSession = async (id) => {
    try {
      const data = await attendanceService.getSession(id);
      setViewSession(data);
      setEditMode(false);
      setEditStudents((data.records ?? []).map(r => ({ ...r })));
    } catch { toast.error("Session detail load nahi hua"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Session delete karna chahte ho?")) return;
    try {
      await attendanceService.deleteSession(id);
      toast.success("Deleted."); fetchSessions(meta.number);
    } catch { toast.error("Delete failed."); }
  };

  const toggleEditStatus = (idx, status) => {
    const cycle = { PRESENT: "ABSENT", ABSENT: "LATE", LATE: "PRESENT" };
    setEditStudents(p => p.map((s, i) => i === idx ? { ...s, status: cycle[status] ?? status } : s));
  };

  const handleSaveEdit = async () => {
    if (!viewSession) return;
    setEditSaving(true);
    try {
      await attendanceService.update(viewSession.id, {
        sectionId: viewSession.sectionId,
        subjectId: viewSession.subjectId,
        sessionDate: viewSession.sessionDate,
        academicYear: viewSession.academicYear,
        periodNumber: viewSession.periodNumber,
        records: editStudents.map(s => ({ studentId: s.studentId, status: s.status, remarks: "" })),
      });
      toast.success("Attendance updated!");
      setEditMode(false);
      await openSession(viewSession.id);
      fetchSessions(meta.number);
    } catch (err) {
      console.error("Attendance update failed:", err);
      toast.error(err?.response?.data?.message ?? "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isFaculty && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase">Filter by Section</p>
          <SectionDrillDown onSelect={sec => { setSection(sec); fetchSessions(0, sec); }} />
        </div>
      )}
      {isFaculty && !sessions.length && (
        <button onClick={() => fetchSessions(0)} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg">
          My Sessions Load Karo
        </button>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <CalendarDays size={28} className="opacity-30" />
            <p className="text-sm">{!isFaculty ? "Section select karo" : "Koi session nahi mila"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Faculty</th>
                  <th className="px-4 py-3 text-left">P/L/A</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.map(s => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(s.sessionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{s.subjectName}</p>
                      <p className="text-xs text-slate-400 font-mono">{s.subjectCode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{s.facultyName}</td>
                    <td className="px-4 py-3">
                      <span className="text-green-600 text-xs font-medium">{s.presentCount}P</span>{" "}
                      <span className="text-amber-600 text-xs font-medium">{s.lateCount}L</span>{" "}
                      <span className="text-red-600 text-xs font-medium">{s.absentCount}A</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openSession(s.id)}
                          className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg">
                          View / Edit
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-lg">
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Page {meta.number + 1} of {meta.totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => fetchSessions(meta.number - 1)} disabled={meta.number === 0}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => fetchSessions(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Session detail + Edit modal */}
      <Modal open={!!viewSession} wide
        title={viewSession ? `${viewSession.subjectName} — ${new Date(viewSession.sessionDate).toLocaleDateString("en-IN")}` : ""}
        onClose={() => { setViewSession(null); setEditMode(false); }}>
        {viewSession && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">{viewSession.presentCount} P</span>
                <span className="text-amber-600 font-medium">{viewSession.lateCount} L</span>
                <span className="text-red-600 font-medium">{viewSession.absentCount} A</span>
              </div>
              {!editMode ? (
                <button onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg">
                  <Pencil size={12} /> Edit Attendance
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} disabled={editSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg">
                    {editSaving && <Loader2 size={12} className="animate-spin" />}
                    <Save size={12} /> Save Changes
                  </button>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase">
                    <th className="px-4 py-2 text-left">Student</th>
                    <th className="px-4 py-2 text-left">Enrollment</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(editMode ? editStudents : viewSession.records ?? []).map((r, idx) => (
                    <tr key={r.recordId ?? r.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{r.studentName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.enrollmentNumber}</td>
                      <td className="px-4 py-2.5 text-center">
                        {editMode ? (
                          <StatusToggle status={r.status} onChange={v => toggleEditStatus(idx, v)} />
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[r.status]?.light}`}>
                            {STATUS_CONFIG[r.status]?.fullLabel}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Tab 3: Summary + Debarment (Bug 8 & 9) ──────────────────────────────────
function SummaryTab() {
  const [section, setSection] = useState(null);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [summaries, setSummaries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debarring, setDebarring] = useState(null); // { studentId, subjectId, subjectName }
  const { user } = useAuth();
  const canManage = ["admin", "super_admin", "hod", "ADMIN", "SUPER_ADMIN", "HOD"].includes(user?.role);

  const fetchSummary = async (sec = section, year = academicYear) => {
    if (!sec) return;
    setLoading(true);
    try {
      const data = await attendanceService.getSummary(sec.id, year);
      const arr = Array.isArray(data) ? data : [];
      setSummaries(arr);
      const subMap = new Map();
      arr.forEach(s => s.subjects?.forEach(sub => subMap.set(sub.subjectId, sub)));
      setSubjects(Array.from(subMap.values()));
    } catch { toast.error("Summary load nahi hua"); }
    finally { setLoading(false); }
  };

  const handleDebar = async (studentId, subjectId, subjectName, enroll) => {
    if (!window.confirm(`${enroll} ko ${subjectName} ke exam se debar karna chahte ho?`)) return;
    try {
      await debarmentService.debar(studentId, section.id, subjectId, academicYear, "Low attendance (<75%)");
      toast.success("Student debarred!"); fetchSummary();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Debar failed"); }
  };

  const handleLift = async (studentId, subjectId, subjectName) => {
    if (!window.confirm(`Debarment lift karna chahte ho for ${subjectName}?`)) return;
    try {
      await debarmentService.lift(studentId, section.id, subjectId, academicYear);
      toast.success("Debarment lifted!"); fetchSummary();
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1">
            <SectionDrillDown onSelect={sec => { setSection(sec); fetchSummary(sec, academicYear); }} />
          </div>
          <div className="min-w-[140px]">
            <Field label="Academic Year">
              <select value={academicYear}
                onChange={e => { setAcademicYear(e.target.value); fetchSummary(section, e.target.value); }}
                className={inputCls}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        {Object.entries(SUMMARY_STATUS).map(([key, val]) => (
          <span key={key} className={`px-2.5 py-0.5 rounded-full font-medium ${val.color}`}>{val.label}</span>
        ))}
        <span className="text-slate-400">≥75% Safe · 60–74% At Risk · &lt;60% Detained</span>
        {canManage && <span className="text-red-500 font-medium">🚫 &lt;75% = Can be debarred</span>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
        ) : !section ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Section select karo</div>
        ) : summaries.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Koi attendance record nahi mila.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">Enroll</th>
                  {subjects.map(sub => (
                    <th key={sub.subjectId} className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase whitespace-nowrap">
                      {sub.subjectCode}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summaries.map(student => {
                  const subMap = Object.fromEntries((student.subjects ?? []).map(s => [s.subjectId, s]));
                  const overallCfg = SUMMARY_STATUS[student.overallStatus];
                  return (
                    <tr key={student.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{student.studentName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{student.enrollmentNumber}</td>
                      {subjects.map(sub => {
                        const entry = subMap[sub.subjectId];
                        const cfg = entry ? SUMMARY_STATUS[entry.statusLabel] : null;
                        const lowAttendance = entry && !entry.eligibleForExam;
                        return (
                          <td key={sub.subjectId} className="px-3 py-3 text-center">
                            {entry ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg?.color ?? ""}`}>
                                  {entry.percentage}%
                                </span>
                                {canManage && lowAttendance && (
                                  <div className="flex gap-0.5">
                                    <button onClick={() => handleDebar(student.studentId, sub.subjectId, sub.subjectName, student.enrollmentNumber)}
                                      className="p-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700 text-[10px]"
                                      title="Debar from exam">
                                      <UserX size={10} />
                                    </button>
                                  </div>
                                )}
                                {canManage && !lowAttendance && entry.percentage < 80 && (
                                  <button onClick={() => handleDebar(student.studentId, sub.subjectId, sub.subjectName, student.enrollmentNumber)}
                                    className="p-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px]"
                                    title="Manual debar">
                                    <UserX size={10} />
                                  </button>
                                )}
                              </div>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${overallCfg?.color}`}>
                          {student.overallPercentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("mark");

  const tabs = [
    { id: "mark", label: "Mark Attendance", icon: ClipboardList },
    { id: "sessions", label: "Sessions History", icon: CalendarDays },
    { id: "summary", label: "Summary + Debarment", icon: AlertTriangle },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Attendance Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Timetable-connected · Auto faculty detect · Edit supported · 75% debarment
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={["flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            ].join(" ")}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {activeTab === "mark" && <MarkAttendanceTab />}
          {activeTab === "sessions" && <SessionsTab />}
          {activeTab === "summary" && <SummaryTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}