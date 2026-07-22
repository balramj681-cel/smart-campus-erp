import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays, ChevronLeft, ChevronRight,
  GraduationCap, Loader2, Plus, Trash2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  timetableService, currentAcademicYear,
  PERIODS, DAYS, DAY_SHORT, subjectColor, formatLocalDate,
} from "../../services/timetableService";
import { academicService } from "../../services/academicService";
import { courseService } from "../../services/courseService";
import { facultyService } from "../../services/facultyService";

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

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(offset = 0) {
  const today = new Date();
  const dow = today.getDay();                // 0 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDates(weekOffset) {
  const monday = getMondayOfWeek(weekOffset);
  return DAYS.map((_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return d;
  });
}

function formatDateHeader(date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatDateRange(dates) {
  if (!dates.length) return "";
  const s = dates[0].toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const e = dates[dates.length - 1].toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `${s} – ${e}`;
}

function isToday(date) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return date.getTime() === t.getTime();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl">
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

// ─── Section Selector ─────────────────────────────────────────────────────────

function SectionSelector({ onSelect }) {
  const [depts, setDepts] = useState([]);
  const [progs, setProgs] = useState([]);
  const [sems, setSems] = useState([]);
  const [sections, setSections] = useState([]);
  const [ids, setIds] = useState({ dept: "", prog: "", sem: "", sec: "" });

  useEffect(() => {
    academicService.getDepartments()
      .then(d => setDepts(Array.isArray(d) ? d : [])).catch(() => { });
  }, []);

  const set = (k, v) => setIds(p => ({ ...p, [k]: v }));

  const onDept = async (id) => {
    set("dept", id); set("prog", ""); set("sem", ""); set("sec", "");
    setProgs([]); setSems([]); setSections([]);
    if (id) setProgs(await academicService.getPrograms(id).then(d => Array.isArray(d) ? d : []));
  };
  const onProg = async (id) => {
    set("prog", id); set("sem", ""); set("sec", "");
    setSems([]); setSections([]);
    if (id) setSems(await academicService.getSemesters(id).then(d => Array.isArray(d) ? d : []));
  };
  const onSem = async (id) => {
    set("sem", id); set("sec", ""); setSections([]);
    if (id) setSections(await academicService.getSections(id).then(d => Array.isArray(d) ? d : []));
  };
  const onSec = (id) => {
    set("sec", id);
    const s = sections.find(x => x.id === id);
    if (s) onSelect({ ...s, semesterId: ids.sem });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Field label="Department">
        <select value={ids.dept} onChange={e => onDept(e.target.value)} className={inputCls}>
          <option value="">— Select —</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Program">
        <select value={ids.prog} onChange={e => onProg(e.target.value)} disabled={!ids.dept} className={disabledCls}>
          <option value="">— Select —</option>
          {progs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Semester">
        <select value={ids.sem} onChange={e => onSem(e.target.value)} disabled={!ids.prog} className={disabledCls}>
          <option value="">— Select —</option>
          {sems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="Section">
        <select value={ids.sec} onChange={e => onSec(e.target.value)} disabled={!ids.sem} className={disabledCls}>
          <option value="">— Select —</option>
          {sections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
        </select>
      </Field>
    </div>
  );
}

// ─── Timetable Grid (with date columns) ──────────────────────────────────────

function TimetableGrid({ entries, weekDates, examsByDay = {}, onAddClick, onDeleteClick, readOnly }) {
  const grid = {};
  for (const e of entries) {
    if (!grid[e.dayOfWeek]) grid[e.dayOfWeek] = {};
    grid[e.dayOfWeek][e.periodNumber] = e;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-500 font-medium text-left sticky left-0 z-10">
              Period
            </th>
            {DAYS.map((day, idx) => {
              const date = weekDates[idx];
              const today = isToday(date);
              return (
                <th key={day}
                  className={`px-3 py-2 border border-slate-200 font-semibold text-center min-w-[130px] transition-colors
                    ${today ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-700"}`}>
                  <p>{DAY_SHORT[day]}</p>
                  <p className={`text-xs font-normal mt-0.5 ${today ? "text-indigo-500" : "text-slate-400"}`}>
                    {formatDateHeader(date)}
                  </p>
                  {today && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] rounded-full leading-tight">
                      Today
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map(period => (
            <tr key={period.number}>
              <td className="px-3 py-2 border border-slate-200 bg-slate-50 text-center align-middle sticky left-0 z-10">
                <p className="font-semibold text-slate-700">{period.label}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">{period.start}–{period.end}</p>
              </td>
              {DAYS.map((day, idx) => {
                const entry = grid[day]?.[period.number];
                const todayCol = isToday(weekDates[idx]);
                const [cellCls] = entry ? subjectColor(entry.subjectCode) : [];

                return (
                  <td key={day}
                    className={`border border-slate-200 p-1 align-middle h-16
                      ${todayCol && !entry ? "bg-indigo-50/20" : ""}`}>
                    {entry ? (
                      entry.cancelled ? (
                        <div className="h-full rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center relative group">
                          <span className="text-[10px] text-slate-400 line-through px-1 text-center">{entry.subjectName}</span>
                          {!readOnly && (
                            <button onClick={() => onDeleteClick(entry)}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-all">
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className={`group relative h-full rounded-lg border p-1.5 flex flex-col justify-between ${cellCls}`}>
                          <div>
                            <p className="font-semibold leading-tight truncate">{entry.subjectName}</p>
                            <p className="opacity-70 truncate text-[10px] flex items-center gap-1">
                              {entry.facultyName?.split(" ")[0]}
                              {entry.facultyOnLeave && (
                                <span className="px-1 py-0.5 bg-amber-400 text-amber-900 rounded text-[8px] font-bold leading-none">
                                  ON LEAVE
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-mono opacity-60 text-[10px]">{entry.subjectCode}</span>
                            {entry.roomNumber && (
                              <span className="opacity-60 text-[10px]">🏫 {entry.roomNumber}</span>
                            )}
                          </div>
                          {!readOnly && (
                            <button onClick={() => onDeleteClick(entry)}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-all">
                              <Trash2 size={10} />
                            </button>
                          )}
                        </motion.div>
                      )
                    ) : (
                      !readOnly && (
                        <button onClick={() => onAddClick(day, period, weekDates[idx])}
                          className="w-full h-full rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 flex items-center justify-center transition-colors group">
                          <Plus size={14} className="text-slate-300 group-hover:text-indigo-400" />
                        </button>
                      )
                    )}
                  </td>
                );
              })}
            </tr>
          ))}




          {/* ── Exams Row ── */}
          {Object.values(examsByDay).some(arr => arr.length > 0) && (
            <tr>
              <td className="px-3 py-2 border border-red-200 bg-red-50 text-center sticky left-0 z-10">
                <p className="text-xs font-semibold text-red-600">📝 Exam</p>
              </td>
              {DAYS.map((day, idx) => {
                const exams = examsByDay[day] ?? [];
                const todayCol = isToday(weekDates[idx]);
                return (
                  <td key={day}
                    className={`border border-red-200 p-1 align-top min-h-[40px]
                      ${todayCol ? "bg-red-50/60" : "bg-red-50/20"}`}>
                    {exams.map(e => (
                      <div key={e.id}
                        className="mb-0.5 px-2 py-1 rounded-lg bg-red-100 border border-red-300 text-red-800 text-xs">
                        <p className="font-semibold leading-tight truncate">{e.subjectName}</p>
                        <p className="opacity-70 text-[10px]">
                          {e.startTime?.slice(0, 5)} – {e.endTime?.slice(0, 5)}
                        </p>
                        <p className="opacity-60 text-[10px]">{e.examTypeDisplay}</p>
                        {e.venue && (
                          <p className="opacity-50 text-[10px]">🏫 {e.venue}</p>
                        )}
                      </div>
                    ))}
                    {exams.length === 0 && (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          )}
          {Object.values(examsByDay).some(arr => arr.length > 0) && (
            <tr>
              <td className="px-3 py-2 border border-red-200 bg-red-50 text-center sticky left-0 z-10">
                <p className="text-xs font-semibold text-red-600">📝 Exams</p>
              </td>
              {DAYS.map((day, idx) => {
                const exams = examsByDay[day] ?? [];
                return (
                  <td key={day} className={`border border-red-200 p-1 align-top ${isToday(weekDates[idx]) ? "bg-red-50/60" : "bg-red-50/20"}`}>
                    {exams.map(e => (
                      <div key={e.id} className="mb-0.5 px-2 py-1 rounded-lg bg-red-100 border border-red-300 text-red-800 text-xs">
                        <p className="font-semibold leading-tight truncate">{e.subjectName}</p>
                        <p className="opacity-70 text-[10px]">{e.startTime?.slice(0, 5)} – {e.endTime?.slice(0, 5)}</p>
                        <p className="opacity-60 text-[10px]">{e.examTypeDisplay}</p>
                        {e.venue && <p className="opacity-50 text-[10px]">🏫 {e.venue}</p>}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Add Slot Modal ───────────────────────────────────────────────────────────

function AddSlotModal({ open, day, period, date, section, academicYear, onClose, onSaved }) {
  const [subjects, setSubjects] = useState([]);
  const [facList, setFacList] = useState([]);
  const [form, setForm] = useState({
    subjectId: "",
    facultyId: "",
    roomNumber: "",
    startTime: period?.start ?? "09:00",
    endTime: period?.end ?? "09:50",
    onlyThisWeek: false,
  });

  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open || !section) return;
    Promise.all([
      courseService.getSubjectsBySemester(section.semesterId ?? section.id)
        .then(d => Array.isArray(d) ? d : []).catch(() => []),
      facultyService.getAll({ size: 200 })
        .then(d => d.content ?? []).catch(() => []),
    ]).then(([subs, fac]) => {
      setSubjects(subs); setFacList(fac);
    });
    setForm({
      subjectId: "", facultyId: "", roomNumber: "",
      startTime: period?.start ?? "09:00",
      endTime: period?.end ?? "09:50",
      onlyThisWeek: false,
    });
  }, [open, section, period]);

  const handleSave = async () => {
    if (!form.subjectId || !form.facultyId) return toast.error("Subject aur Faculty select karo");
    setSaving(true);
    try {
      await timetableService.create({
        sectionId: section.id,
        subjectId: form.subjectId,
        facultyId: form.facultyId,
        dayOfWeek: day,
        periodNumber: period.number,
        startTime: form.startTime + ":00",
        endTime: form.endTime + ":00",
        roomNumber: form.roomNumber || null,
        academicYear,
        weekOf: form.onlyThisWeek ? formatLocalDate(date) : null,
      });
      toast.success("Slot added!"); onSaved(); onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Error");
    } finally { setSaving(false); }
  };

  const dateStr = date ? date.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" }) : "";

  return (
    <Modal open={open}
      title={`Add Slot — ${dateStr}`}
      onClose={onClose}>
      <div className="space-y-3">
        <Field label="Subject">
          <select value={form.subjectId} onChange={e => sf("subjectId", e.target.value)} className={inputCls}>
            <option value="">— Select Subject —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </Field>
        <Field label="Faculty">
          <select value={form.facultyId} onChange={e => sf("facultyId", e.target.value)} className={inputCls}>
            <option value="">— Select Faculty —</option>
            {facList.map(f => (
              <option key={f.id} value={f.id}>
                {f.firstName} {f.lastName} — {f.employeeId}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Time">
            <input type="time" value={form.startTime} onChange={e => sf("startTime", e.target.value)} className={inputCls} />
          </Field>
          <Field label="End Time">
            <input type="time" value={form.endTime} onChange={e => sf("endTime", e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Room (optional)">
          <input value={form.roomNumber} onChange={e => sf("roomNumber", e.target.value)}
            placeholder="e.g. A-201" className={inputCls} />
        </Field>



        <div className="flex gap-4 text-sm col-span-2">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={!form.onlyThisWeek} onChange={() => sf("onlyThisWeek", false)} />
            Recurring (har hafte)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={form.onlyThisWeek} onChange={() => sf("onlyThisWeek", true)} />
            Sirf is hafte
          </label>
        </div>

        <button onClick={handleSave} disabled={saving || !form.subjectId || !form.facultyId}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {saving && <Loader2 size={14} className="animate-spin" />} Add to Timetable
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const [activeTab, setActiveTab] = useState("section");
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(weekOffset);

  // Section view
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionEntries, setSectionEntries] = useState([]);
  //const [examsByDay, setExamsByDay] = useState({});
  const [loadingSec, setLoadingSec] = useState(false);

  // Faculty view
  const [facList, setFacList] = useState([]);
  const [selectedFacId, setSelectedFacId] = useState("");
  const [facultyEntries, setFacultyEntries] = useState([]);
  const [loadingFac, setLoadingFac] = useState(false);

  // Add slot modal
  const [addModal, setAddModal] = useState({ open: false, day: null, period: null, date: null });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cancelChoiceTarget, setCancelChoiceTarget] = useState(null);

  useEffect(() => {
    facultyService.getAll({ size: 200 })
      .then(d => setFacList(d.content ?? [])).catch(() => { });
  }, []);

  /*
    const loadSectionTimetable = async (sec = selectedSection, year = academicYear) => {
      if (!sec) return;
      setLoadingSec(true);
      try {
        const data = await timetableService.getForSection(sec.id, year);
        setSectionEntries(Array.isArray(data) ? data : []);
      } catch { toast.error("Timetable load nahi hua"); }
      finally   { setLoadingSec(false); }
    };

    */

  const [examsByDay, setExamsByDay] = useState({});

  const loadSectionTimetable = async (sec = selectedSection, year = academicYear) => {
    if (!sec) return;
    setLoadingSec(true);
    try {
      const [classes, ...examResponses] = await Promise.all([
        timetableService.getForSection(sec.id, year, formatLocalDate(weekDates[0])),
        ...weekDates.map(date =>
          timetableService.getExamsForDate(sec.id, formatLocalDate(date), year)
            .catch(() => [])
        ),
      ]);
      setSectionEntries(Array.isArray(classes) ? classes : []);

      const byDay = {};
      weekDates.forEach((date, idx) => {
        const day = DAYS[idx];
        const exams = examResponses[idx];
        if (Array.isArray(exams) && exams.length > 0) byDay[day] = exams;
      });
      setExamsByDay(byDay);
    } catch { toast.error("Timetable load nahi hua"); }
    finally { setLoadingSec(false); }
  };

  const loadFacultyTimetable = async (facId = selectedFacId, year = academicYear) => {
    if (!facId) return;
    setLoadingFac(true);
    try {
      const data = await timetableService.getForFaculty(facId, year, formatLocalDate(weekDates[0]));
      setFacultyEntries(Array.isArray(data) ? data : []);
    } catch { toast.error("Faculty timetable load nahi hua"); }
    finally { setLoadingFac(false); }
  };

  useEffect(() => {
    if (activeTab === "section" && selectedSection) {
      loadSectionTimetable(selectedSection, academicYear);
    }
    if (activeTab === "faculty" && selectedFacId) {
      loadFacultyTimetable(selectedFacId, academicYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.recurring) {
        // Recurring entry — do clear options do, koi confusing confirm() nahi
        setCancelChoiceTarget(deleteTarget);
        return;
      }
      await timetableService.delete(deleteTarget.id);
      toast.success("Deleted.");
    } catch (err) { toast.error(err?.response?.data?.message ?? "Error"); }

    setDeleteTarget(null);
    loadSectionTimetable();
  };

  const handleCancelThisWeek = async () => {
    try {
      await timetableService.cancelForWeek(cancelChoiceTarget.id, formatLocalDate(weekDates[0]));
      toast.success("Is hafte ke liye cancel ho gaya.");
    } catch (err) { toast.error(err?.response?.data?.message ?? "Error"); }
    setCancelChoiceTarget(null); setDeleteTarget(null);
    loadSectionTimetable();
  };

  const handleDeleteRecurringForever = async () => {
    try {
      await timetableService.delete(cancelChoiceTarget.id);
      toast.success("Recurring class hamesha ke liye delete ho gayi.");
    } catch (err) { toast.error(err?.response?.data?.message ?? "Error"); }
    setCancelChoiceTarget(null); setDeleteTarget(null);
    loadSectionTimetable();
  };

  const tabs = [
    { id: "section", label: "Section Timetable", icon: CalendarDays },
    { id: "faculty", label: "Faculty Timetable", icon: GraduationCap },
  ];

  // Week navigation bar
  const WeekNav = () => (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2">
      <button onClick={() => setWeekOffset(p => p - 1)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
        <ChevronLeft size={16} />
      </button>
      <div className="flex-1 text-center">
        <p className="text-sm font-semibold text-slate-800">{formatDateRange(weekDates)}</p>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)}
            className="text-xs text-indigo-600 hover:underline mt-0.5">
            Back to current week
          </button>
        )}
      </div>
      <button onClick={() => setWeekOffset(p => p + 1)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
        <ChevronRight size={16} />
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Timetable</h1>
          <p className="text-sm text-slate-500 mt-0.5">Date-wise class schedule</p>
        </div>
        <select value={academicYear}
          onChange={e => {
            setAcademicYear(e.target.value);
            if (selectedSection) loadSectionTimetable(selectedSection, e.target.value);
            if (selectedFacId) loadFacultyTimetable(selectedFacId, e.target.value);
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Week navigation */}
      <WeekNav />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Section Tab */}
      {activeTab === "section" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Select Section</p>
            <SectionSelector onSelect={sec => {
              setSelectedSection(sec); setSectionEntries([]);
              loadSectionTimetable(sec, academicYear);
            }} />
          </div>

          {selectedSection ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Section {selectedSection.name}
                    <span className="text-slate-400 font-normal ml-2">
                      {selectedSection.semesterName} · {selectedSection.programName}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {sectionEntries.length} slots scheduled · {academicYear}
                  </p>
                </div>
              </div>
              {loadingSec ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                <div className="p-4">
                  <TimetableGrid
                    entries={sectionEntries}
                    weekDates={weekDates}
                    examsByDay={examsByDay}
                    readOnly={false}
                    onAddClick={(day, period, date) => setAddModal({ open: true, day, period, date })}
                    onDeleteClick={e => setDeleteTarget(e)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">Section select karo</p>
            </div>
          )}
        </div>
      )}

      {/* Faculty Tab */}
      {activeTab === "faculty" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <Field label="Select Faculty">
              <select value={selectedFacId}
                onChange={e => { setSelectedFacId(e.target.value); loadFacultyTimetable(e.target.value); }}
                className={inputCls}>
                <option value="">— Select Faculty —</option>
                {facList.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.firstName} {f.lastName} ({f.employeeId}) — {f.departmentName ?? "No Dept"}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedFacId ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">
                  {facList.find(f => f.id === selectedFacId)?.firstName}{" "}
                  {facList.find(f => f.id === selectedFacId)?.lastName}
                  <span className="text-slate-400 font-normal ml-2">{academicYear}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {facultyEntries.length} periods per week
                </p>
              </div>
              {loadingFac ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                <div className="p-4">
                  <TimetableGrid
                    entries={facultyEntries}
                    weekDates={weekDates}
                    readOnly={true}
                    onAddClick={() => { }}
                    onDeleteClick={() => { }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <GraduationCap size={32} className="opacity-30" />
              <p className="text-sm">Faculty select karo</p>
            </div>
          )}
        </div>
      )}

      {/* Add Slot Modal */}
      <AddSlotModal
        open={addModal.open}
        day={addModal.day}
        period={addModal.period}
        date={addModal.date}
        section={selectedSection}
        academicYear={academicYear}
        onClose={() => setAddModal({ open: false, day: null, period: null, date: null })}
        onSaved={loadSectionTimetable}
      />

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} title="Remove Slot" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">{deleteTarget?.subjectName}</span> ko{" "}
          {deleteTarget?.dayDisplayName} Period {deleteTarget?.periodNumber} se remove karna chahte ho?
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleDelete}
            className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">
            Remove
          </button>
        </div>
      </Modal>

      <Modal open={!!cancelChoiceTarget} title="Ye class recurring hai" onClose={() => setCancelChoiceTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">{cancelChoiceTarget?.subjectName}</span> ke saath kya karna hai?
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={handleCancelThisWeek}
            className="w-full py-2.5 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-medium text-left px-4">
            📅 Sirf is hafte ({formatDateHeader(weekDates[0])} wale hafte) ke liye cancel karo
          </button>
          <button onClick={handleDeleteRecurringForever}
            className="w-full py-2.5 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium text-left px-4">
            🗑️ Poori recurring class hamesha ke liye delete karo
          </button>
          <button onClick={() => setCancelChoiceTarget(null)}
            className="w-full py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 mt-1">
            Cancel (kuch mat karo)
          </button>
        </div>
      </Modal>
    </div>
  );
}