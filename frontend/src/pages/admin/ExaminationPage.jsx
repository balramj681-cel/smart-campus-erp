import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen, CalendarDays, ChevronLeft, ChevronRight,
  ClipboardList, Loader2, Pencil, Plus, Printer,
  Trash2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  examService, currentAcademicYear,
  EXAM_STATUS_CONFIG, EXAM_TYPE_OPTIONS, EXAM_STATUSES,
} from "../../services/examService";
import { academicService } from "../../services/academicService";
import { courseService }   from "../../services/courseService";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

const inputCls    = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
const disabledCls = inputCls + " disabled:bg-slate-50 disabled:text-slate-400";

const EMPTY_FORM = {
  subjectId: "", examType: "END_TERM", examDate: "",
  startTime: "09:00", endTime: "12:00",
  venue: "", instructions: "", academicYear: currentAcademicYear(),
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";

const fmtTime = (t) => t
  ? t.slice(0, 5)
  : "—";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = EXAM_STATUS_CONFIG[status] ?? EXAM_STATUS_CONFIG.SCHEDULED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
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
            className={`relative w-full ${wide ? "max-w-2xl" : "max-w-lg"} bg-white rounded-2xl shadow-xl`}>
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

function Pagination({ meta, onPage }) {
  if (meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">Page {meta.number + 1} of {meta.totalPages}</p>
      <div className="flex gap-1">
        <button onClick={() => onPage(meta.number - 1)} disabled={meta.number === 0}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
          <ChevronLeft size={14} />
        </button>
        <button onClick={() => onPage(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Section Drill-down (reusable pattern) ────────────────────────────────────

function SectionDrillDown({ onSelect }) {
  const [depts,    setDepts]    = useState([]);
  const [progs,    setProgs]    = useState([]);
  const [sems,     setSems]     = useState([]);
  const [sections, setSections] = useState([]);
  const [ids, setIds] = useState({ dept:"", prog:"", sem:"", sec:"" });

  useEffect(() => {
    academicService.getDepartments()
      .then(d => setDepts(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const set = (k, v) => setIds(p => ({ ...p, [k]: v }));
  const onDept = async (id) => {
    set("dept",id); set("prog",""); set("sem",""); set("sec","");
    setProgs([]); setSems([]); setSections([]);
    if (id) setProgs(await academicService.getPrograms(id).then(d => Array.isArray(d) ? d : []));
  };
  const onProg = async (id) => {
    set("prog",id); set("sem",""); set("sec",""); setSems([]); setSections([]);
    if (id) setSems(await academicService.getSemesters(id).then(d => Array.isArray(d) ? d : []));
  };
  const onSem = async (id) => {
    set("sem",id); set("sec",""); setSections([]);
    if (id) setSections(await academicService.getSections(id).then(d => Array.isArray(d) ? d : []));
  };
  const onSec = (id) => {
    set("sec",id);
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

// ─── Hall Ticket Print ────────────────────────────────────────────────────────

function printHallTicket(ticket, college = "Smart Campus ERP") {
  const rows = (ticket.exams ?? []).map(e => `
    <tr>
      <td>${e.subjectCode}</td>
      <td>${e.subjectName}</td>
      <td>${e.creditHours}</td>
      <td>${e.examTypeDisplay}</td>
      <td>${new Date(e.examDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</td>
      <td>${e.startTime?.slice(0,5)} – ${e.endTime?.slice(0,5)}</td>
      <td>${e.venue ?? "—"}</td>
      <td><span style="color:${e.statusDisplay === "Scheduled" ? "#2563eb" : "#16a34a"}">${e.statusDisplay}</span></td>
    </tr>`).join("");

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Hall Ticket – ${ticket.hallTicketNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 18px; font-weight: bold; }
    .header h2 { font-size: 14px; margin-top: 4px; }
    .header h3 { font-size: 13px; margin-top: 6px; color: #444; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; }
    .info-row { display: flex; gap: 6px; }
    .info-label { font-weight: bold; min-width: 120px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; }
    .ht-num { font-size: 14px; font-weight: bold; color: #1e40af; text-align: right; }
    .footer { margin-top: 32px; display: flex; justify-content: space-between; }
    .sign-box { text-align: center; }
    .sign-line { border-top: 1px solid #000; width: 160px; margin: 0 auto; padding-top: 4px; font-size: 11px; }
    .instructions { margin-top: 16px; padding: 10px; background: #fef9c3; border: 1px solid #fde68a; border-radius: 4px; font-size: 11px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${college}</h1>
    <h2>${ticket.examTypeLabel}</h2>
    <h3>${ticket.academicYear} | ${ticket.programName} | ${ticket.semesterName}</h3>
  </div>

  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
    <div class="info-grid" style="flex:1; margin-right:16px">
      <div class="info-row"><span class="info-label">Student Name:</span>${ticket.studentName}</div>
      <div class="info-row"><span class="info-label">Enroll. No.:</span>${ticket.enrollmentNumber}</div>
      <div class="info-row"><span class="info-label">Program:</span>${ticket.programName}</div>
      <div class="info-row"><span class="info-label">Department:</span>${ticket.departmentName}</div>
      <div class="info-row"><span class="info-label">Semester:</span>${ticket.semesterName}</div>
      <div class="info-row"><span class="info-label">Section:</span>${ticket.sectionName}</div>
      <div class="info-row"><span class="info-label">Batch:</span>${ticket.batch}</div>
    </div>
    <div style="text-align:center; border:2px solid #1e40af; border-radius:8px; padding:12px 16px; min-width:160px">
      <p style="font-size:10px; color:#64748b">HALL TICKET NO.</p>
      <p class="ht-num">${ticket.hallTicketNumber}</p>
      <div style="width:80px; height:80px; border:1px dashed #ccc; margin:8px auto; display:flex; align-items:center; justify-content:center; font-size:10px; color:#aaa">Photo</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th><th>Subject</th><th>Cr.</th><th>Type</th>
        <th>Date</th><th>Time</th><th>Venue</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="instructions">
    <strong>Instructions:</strong>
    1. Carry this hall ticket along with a valid photo ID.
    2. Reach the exam venue 15 minutes before the scheduled time.
    3. Mobile phones and electronic devices are not allowed in the exam hall.
    4. This hall ticket must be presented on demand.
  </div>

  <div class="footer">
    <div class="sign-box"><div class="sign-line">Student Signature</div></div>
    <div class="sign-box"><div class="sign-line">Controller of Examinations</div></div>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`);
  win.document.close();
}

// ─── Tab 1: Exam Schedule ─────────────────────────────────────────────────────

function ScheduleTab() {
  const [section,     setSection]     = useState(null);
  const [academicYear,setAcademicYear]= useState(currentAcademicYear());
  const [exams,       setExams]       = useState([]);
  const [meta,        setMeta]        = useState({ totalElements:0, totalPages:0, number:0 });
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Filters
  const [statusFilter,   setStatusFilter]   = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("");

  // Modals
  const [createOpen,  setCreateOpen]  = useState(false);
  const [editExam,    setEditExam]    = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);

  // Create form
  const [form, setForm]       = useState(EMPTY_FORM);
  const [subjects, setSubjects] = useState([]);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fetchExams = async (page = 0, sec = section, year = academicYear, status = statusFilter, type = examTypeFilter) => {
    if (!sec) return;
    setLoading(true);
    try {
      const params = { sectionId: sec.id, academicYear: year, page, size: 15 };
      if (status) params.status   = status;
      if (type)   params.examType = type;
      const data = await examService.getAll(params);
      setExams(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Exams load nahi hue"); }
    finally   { setLoading(false); }
  };

  const openCreate = async () => {
    setForm({ ...EMPTY_FORM, academicYear, sectionId: section?.id });
    // Load subjects for selected section's semester
    if (section?.semesterId) {
      const data = await courseService.getSubjectsBySemester(section.semesterId)
        .then(d => Array.isArray(d) ? d : []).catch(() => []);
      setSubjects(data);
    }
    setCreateOpen(true);
  };

  const openEdit = async (exam) => {
    setForm({
      subjectId:    exam.subjectId,
      examType:     exam.examType,
      examDate:     exam.examDate,
      startTime:    exam.startTime?.slice(0, 5) ?? "",
      endTime:      exam.endTime?.slice(0, 5) ?? "",
      venue:        exam.venue ?? "",
      instructions: exam.instructions ?? "",
      academicYear: exam.academicYear,
    });
    if (section?.semesterId) {
      const data = await courseService.getSubjectsBySemester(section.semesterId)
        .then(d => Array.isArray(d) ? d : []).catch(() => []);
      setSubjects(data);
    }
    setEditExam(exam);
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await examService.create({
        sectionId:    section.id,
        subjectId:    form.subjectId,
        examType:     form.examType,
        examDate:     form.examDate,
        startTime:    form.startTime + ":00",
        endTime:      form.endTime   + ":00",
        venue:        form.venue || undefined,
        instructions: form.instructions || undefined,
        academicYear: form.academicYear,
      });
      toast.success("Exam scheduled!"); setCreateOpen(false); fetchExams();
    } catch (err) { toast.error(err?.response?.data?.message ?? err?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await examService.update(editExam.id, {
        sectionId:    section?.id,
        subjectId:    form.subjectId,
        examType:     form.examType,
        examDate:     form.examDate,
        startTime:    form.startTime + ":00",
        endTime:      form.endTime   + ":00",
        venue:        form.venue || undefined,
        instructions: form.instructions || undefined,
        academicYear: form.academicYear,
      });
      toast.success("Updated!"); setEditExam(null); fetchExams(meta.number);
    } catch (err) { toast.error(err?.response?.data?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await examService.updateStatus(id, status);
      toast.success("Status updated!"); fetchExams(meta.number);
    } catch { toast.error("Status update failed."); }
  };

  const handleDelete = async () => {
    try {
      await examService.delete(deleteTarget.id);
      toast.success("Deleted!"); setDeleteTarget(null); fetchExams(meta.number);
    } catch { toast.error("Delete failed."); }
  };

  // Group exams by examType for better readability
  const grouped = exams.reduce((acc, e) => {
    const key = e.examTypeDisplay;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const ExamForm = ({ onSubmit, isEdit }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Subject">
            <select value={form.subjectId} onChange={e => sf("subjectId", e.target.value)} required className={inputCls}>
              <option value="">— Select Subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </Field>
        </div>
        <Field label="Exam Type">
          <select value={form.examType} onChange={e => sf("examType", e.target.value)} className={inputCls}>
            {EXAM_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Academic Year">
          <select value={form.academicYear} onChange={e => sf("academicYear", e.target.value)} className={inputCls}>
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Exam Date">
          <input type="date" value={form.examDate} onChange={e => sf("examDate", e.target.value)} required className={inputCls}/>
        </Field>
        <Field label="Venue">
          <input value={form.venue} onChange={e => sf("venue", e.target.value)} placeholder="e.g. Exam Hall A" className={inputCls}/>
        </Field>
        <Field label="Start Time">
          <input type="time" value={form.startTime} onChange={e => sf("startTime", e.target.value)} required className={inputCls}/>
        </Field>
        <Field label="End Time">
          <input type="time" value={form.endTime} onChange={e => sf("endTime", e.target.value)} required className={inputCls}/>
        </Field>
        <div className="col-span-2">
          <Field label="Instructions (optional)">
            <textarea value={form.instructions} onChange={e => sf("instructions", e.target.value)} rows={2} className={inputCls}/>
          </Field>
        </div>
      </div>
      <button type="submit" disabled={saving || !form.subjectId}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
        {saving && <Loader2 size={14} className="animate-spin"/>}
        {isEdit ? "Save Changes" : "Schedule Exam"}
      </button>
    </form>
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Select Section</p>
          <div className="flex items-center gap-2">
            <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); fetchExams(0, section, e.target.value); }}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none">
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {section && (
              <button onClick={openCreate}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                <Plus size={14}/> Add Exam
              </button>
            )}
          </div>
        </div>
        <SectionDrillDown onSelect={sec => { setSection(sec); fetchExams(0, sec); }} />

        {/* Sub-filters */}
        {section && (
          <div className="flex gap-2 flex-wrap pt-1">
            {["", ...EXAM_STATUSES].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); fetchExams(0, section, academicYear, s, examTypeFilter); }}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${statusFilter === s && !s
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : statusFilter === s
                    ? (EXAM_STATUS_CONFIG[s]?.color ?? "") + " border-current"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                {s ? EXAM_STATUS_CONFIG[s]?.label : "All Status"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400"><Loader2 size={24} className="animate-spin"/></div>
      ) : !section ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
          <CalendarDays size={28} className="opacity-30"/>
          <p className="text-sm">Section select karo</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
          <ClipboardList size={28} className="opacity-30"/>
          <p className="text-sm">Koi exam scheduled nahi hai. "Add Exam" karo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <BookOpen size={14} className="text-slate-400"/>
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{type}</span>
                <span className="text-xs text-slate-400">({items.length} exams)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">Subject</th>
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-left">Time</th>
                      <th className="px-4 py-2.5 text-left">Venue</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map(exam => (
                      <motion.tr key={exam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{exam.subjectName}</p>
                          <p className="text-xs text-slate-400 font-mono">{exam.subjectCode}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {fmtDate(exam.examDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                          {fmtTime(exam.startTime)} – {fmtTime(exam.endTime)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {exam.venue ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <select value={exam.status}
                            onChange={e => handleStatusChange(exam.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none">
                            {EXAM_STATUSES.map(s => (
                              <option key={s} value={s}>{EXAM_STATUS_CONFIG[s].label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(exam)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
                              <Pencil size={13}/>
                            </button>
                            <button onClick={() => setDeleteTarget(exam)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <Pagination meta={meta} onPage={p => fetchExams(p)} />
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} title="Schedule New Exam" wide onClose={() => setCreateOpen(false)}>
        <ExamForm onSubmit={handleCreate} isEdit={false} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editExam} title="Edit Exam" wide onClose={() => setEditExam(null)}>
        <ExamForm onSubmit={handleEdit} isEdit={true} />
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} title="Delete Exam" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">{deleteTarget?.subjectName} — {deleteTarget?.examTypeDisplay}</span> ({fmtDate(deleteTarget?.examDate)}) ko delete karna chahte ho?
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleDelete} className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 2: Hall Tickets ──────────────────────────────────────────────────────

function HallTicketsTab() {
  const [section,      setSection]      = useState(null);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [examType,     setExamType]     = useState("END_TERM");
  const [tickets,      setTickets]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [generated,    setGenerated]    = useState(false);
  const [searchName,   setSearchName]   = useState("");

  const generateTickets = async () => {
    if (!section) return toast.error("Section select karo");
    setLoading(true); setGenerated(false); setTickets([]);
    try {
      const data = await examService.getHallTickets(section.id, academicYear, examType || undefined);
      setTickets(Array.isArray(data) ? data : []);
      setGenerated(true);
      if (data.length === 0) toast("Is section mein koi student nahi hai.", { icon: "ℹ️" });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Hall tickets generate nahi hue");
    } finally { setLoading(false); }
  };

  const filtered = tickets.filter(t =>
    !searchName || t.studentName.toLowerCase().includes(searchName.toLowerCase()) ||
    t.enrollmentNumber.toLowerCase().includes(searchName.toLowerCase())
  );

  const printAll = () => {
    if (!filtered.length) return;
    filtered.forEach((t, i) => setTimeout(() => printHallTicket(t), i * 300));
  };

  const examTypeLabel = EXAM_TYPE_OPTIONS.find(t => t.value === examType)?.label ?? "All";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Generate Hall Tickets</p>
        <SectionDrillDown onSelect={sec => { setSection(sec); setGenerated(false); setTickets([]); }} />
        <div className="flex items-end gap-3 flex-wrap">
          <div className="w-48">
            <Field label="Exam Type">
              <select value={examType} onChange={e => setExamType(e.target.value)} className={inputCls}>
                <option value="">All Types</option>
                {EXAM_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="w-40">
            <Field label="Academic Year">
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className={inputCls}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>
          <button onClick={generateTickets} disabled={!section || loading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <ClipboardList size={14}/>}
            Generate Hall Tickets
          </button>
        </div>
      </div>

      {/* Results */}
      {generated && (
        <>
          {/* Summary + print all */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-slate-800">
                {filtered.length} Hall Tickets
                <span className="font-normal text-slate-400 ml-2">
                  · {examTypeLabel} · {section?.name} · {academicYear}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input value={searchName} onChange={e => setSearchName(e.target.value)}
                placeholder="Filter by name…"
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none w-44"/>
              {filtered.length > 0 && (
                <button onClick={printAll}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg">
                  <Printer size={14}/> Print All ({filtered.length})
                </button>
              )}
            </div>
          </div>

          {/* Ticket cards */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <ClipboardList size={28} className="opacity-30"/>
              <p className="text-sm">
                {tickets.length === 0
                  ? "Is section mein koi student ya exam nahi mila."
                  : "Koi match nahi mila."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(ticket => (
                <motion.div key={ticket.studentId}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Ticket header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{ticket.studentName}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {ticket.enrollmentNumber} · Batch {ticket.batch} · Sec {ticket.sectionName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Hall Ticket</p>
                        <p className="text-xs font-mono font-semibold text-indigo-600">
                          {ticket.hallTicketNumber}
                        </p>
                      </div>
                      <button onClick={() => printHallTicket(ticket)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition-colors">
                        <Printer size={12}/> Print
                      </button>
                    </div>
                  </div>

                  {/* Exam entries */}
                  {ticket.exams.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Is type ka koi exam scheduled nahi hai.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 font-medium uppercase tracking-wide border-b border-slate-100">
                            <th className="px-4 py-2 text-left">Subject</th>
                            <th className="px-4 py-2 text-left">Type</th>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Time</th>
                            <th className="px-4 py-2 text-left">Venue</th>
                            <th className="px-4 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {ticket.exams.map(e => (
                            <tr key={e.examScheduleId} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-slate-700">{e.subjectName}</span>
                                <span className="font-mono text-slate-400 ml-1.5">{e.subjectCode}</span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-500">{e.examTypeDisplay}</td>
                              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(e.examDate)}</td>
                              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                                {fmtTime(e.startTime)} – {fmtTime(e.endTime)}
                              </td>
                              <td className="px-4 py-2.5 text-slate-500">{e.venue ?? "—"}</td>
                              <td className="px-4 py-2.5 text-center">
                                <StatusBadge status={e.statusDisplay.toUpperCase().replace(" ", "_")} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExaminationPage() {
  const [activeTab, setActiveTab] = useState("schedule");

  const tabs = [
    { id: "schedule",    label: "Exam Schedule", icon: CalendarDays  },
    { id: "halltickets", label: "Hall Tickets",  icon: Printer       },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Examination Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Exams schedule karo → Status manage karo → Hall tickets generate & print karo
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}>
            <tab.icon size={15}/> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {activeTab === "schedule"    && <ScheduleTab />}
          {activeTab === "halltickets" && <HallTicketsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}