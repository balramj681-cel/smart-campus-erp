import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen, ChevronDown, ChevronUp, Eye, EyeOff,
  GraduationCap, Loader2, Plus, Save, Trash2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  marksService, currentAcademicYear,
  EXAM_TYPES, GRADE_COLORS, RESULT_COLORS,
} from "../../services/marksService";
import { academicService } from "../../services/academicService";
import { courseService } from "../../services/courseService";

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
            className={`relative w-full ${wide ? "max-w-4xl" : "max-w-md"} bg-white rounded-2xl shadow-xl`}>
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

// ─── Section Drill-down ───────────────────────────────────────────────────────

function SectionDrillDown({ onSelect, includeSubject = false, onSubjectChange }) {
  const [depts, setDepts] = useState([]);
  const [progs, setProgs] = useState([]);
  const [sems, setSems] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [ids, setIds] = useState({ dept: "", prog: "", sem: "", sec: "" });

  useEffect(() => {
    academicService.getDepartments()
      .then(d => setDepts(Array.isArray(d) ? d : [])).catch(() => { });
  }, []);

  const set = (k, v) => setIds(p => ({ ...p, [k]: v }));

  const onDept = async (id) => {
    set("dept", id); set("prog", ""); set("sem", ""); set("sec", "");
    setProgs([]); setSems([]); setSections([]); setSubjects([]);
    if (id) setProgs(await academicService.getPrograms(id).then(d => Array.isArray(d) ? d : []));
  };
  const onProg = async (id) => {
    set("prog", id); set("sem", ""); set("sec", "");
    setSems([]); setSections([]); setSubjects([]);
    if (id) setSems(await academicService.getSemesters(id).then(d => Array.isArray(d) ? d : []));
  };
  const onSem = async (id) => {
    set("sem", id); set("sec", ""); setSections([]); setSubjects([]);
    if (id) {
      const [secs, subs] = await Promise.all([
        academicService.getSections(id).then(d => Array.isArray(d) ? d : []),
        includeSubject
          ? courseService.getSubjectsBySemester(id).then(d => Array.isArray(d) ? d : [])
          : Promise.resolve([]),
      ]);
      setSections(secs); setSubjects(subs);
    }
  };
  const onSec = (id) => {
    set("sec", id);
    const s = sections.find(x => x.id === id);
    if (s) onSelect({ ...s, semesterId: ids.sem });
  };

  return (
    <div className={`grid gap-3 ${includeSubject ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
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
      {includeSubject && onSubjectChange && (
        <Field label="Subject (optional)">
          <select disabled={!ids.sec} onChange={e => {
            const s = subjects.find(x => x.id === e.target.value);
            onSubjectChange(s ?? null);
          }} className={disabledCls}>
            <option value="">— All Subjects —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}
    </div>
  );
}

// ─── Tab 1: Exam Components ───────────────────────────────────────────────────

function ComponentsTab() {
  const [section, setSection] = useState(null);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form drill-down
  const [formDepts, setFormDepts] = useState([]);
  const [formProgs, setFormProgs] = useState([]);
  const [formSems, setFormSems] = useState([]);
  const [formSubjs, setFormSubjs] = useState([]);
  const [fDeptId, setFDeptId] = useState("");
  const [fProgId, setFProgId] = useState("");
  const [fSemId, setFSemId] = useState("");
  const [form, setForm] = useState({
    sectionId: "", subjectId: "", examType: "INTERNAL_1",
    maxMarks: 30, weightage: 25, academicYear: currentAcademicYear(),
    scheduledDate: "",
  });
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    academicService.getDepartments()
      .then(d => setFormDepts(Array.isArray(d) ? d : [])).catch(() => { });
  }, []);

  const onFDept = async (id) => {
    setFDeptId(id); setFProgId(""); setFSemId("");
    setFormProgs([]); setFormSems([]); setFormSubjs([]);
    sf("sectionId", ""); sf("subjectId", "");
    if (id) setFormProgs(await academicService.getPrograms(id).then(d => Array.isArray(d) ? d : []));
  };
  const onFProg = async (id) => {
    setFProgId(id); setFSemId("");
    setFormSems([]); setFormSubjs([]);
    sf("sectionId", ""); sf("subjectId", "");
    if (id) setFormSems(await academicService.getSemesters(id).then(d => Array.isArray(d) ? d : []));
  };
  const onFSem = async (id) => {
    setFSemId(id); setFormSubjs([]);
    sf("sectionId", ""); sf("subjectId", "");
    if (!id) return;
    const [secs, subs] = await Promise.all([
      academicService.getSections(id).then(d => Array.isArray(d) ? d : []),
      courseService.getSubjectsBySemester(id).then(d => Array.isArray(d) ? d : []),
    ]);
    // Store sections temporarily
    setFormSubjs(subs);
    // We'll use first section or ask user to pick
    if (secs.length === 1) sf("sectionId", secs[0].id);
    // If multiple sections, need a section picker
    window._tempSections = secs;
  };

  const onExamTypeChange = (type) => {
    const et = EXAM_TYPES.find(e => e.value === type);
    sf("examType", type);
    if (et) sf("maxMarks", et.defaultMax);
  };

  const fetchComponents = async (sec = section, year = academicYear) => {
    if (!sec) return;
    setLoading(true);
    try {
      const data = await marksService.getComponents(sec.id, year);
      setComponents(Array.isArray(data) ? data : []);
    } catch { toast.error("Components load nahi hue"); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.sectionId || !form.subjectId) return toast.error("Section aur Subject select karo");
    setSaving(true);
    try {
      await marksService.createComponent({
        ...form,
        maxMarks: Number(form.maxMarks),
        weightage: Number(form.weightage),
        scheduledDate: form.scheduledDate || undefined,
      });
      toast.success("Exam component created!");
      setCreateOpen(false);
      if (section) fetchComponents();
    } catch (err) { toast.error(err?.response?.data?.message ?? err?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleTogglePublish = async (id) => {
    try {
      await marksService.togglePublish(id);
      toast.success("Status updated!"); fetchComponents();
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete karna chahte ho?")) return;
    try {
      await marksService.deleteComponent(id);
      toast.success("Deleted!"); fetchComponents();
    } catch { toast.error("Delete failed"); }
  };

  // Group by subject
  const grouped = components.reduce((acc, c) => {
    const key = c.subjectId;
    if (!acc[key]) acc[key] = { subjectName: c.subjectName, subjectCode: c.subjectCode, items: [] };
    acc[key].items.push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Select Section</p>
          <div className="flex items-center gap-2">
            <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); fetchComponents(section, e.target.value); }}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none">
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
              <Plus size={14} /> Add Component
            </button>
          </div>
        </div>
        <SectionDrillDown onSelect={sec => { setSection(sec); fetchComponents(sec, academicYear); }} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !section ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
          <BookOpen size={28} className="opacity-30" />
          <p className="text-sm">Section select karo</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
          <BookOpen size={28} className="opacity-30" />
          <p className="text-sm">Koi exam component nahi mila. "Add Component" karo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.values(grouped).map(group => (
            <div key={group.subjectCode} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span className="font-mono text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{group.subjectCode}</span>
                <span className="text-sm font-semibold text-slate-800">{group.subjectName}</span>
                <span className="text-xs text-slate-400 ml-auto">{group.items.length} components</span>
              </div>
              <div className="divide-y divide-slate-50">
                {group.items.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{c.examTypeDisplay}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                          {c.published ? "Published" : "Draft"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                        <span>Max: <b className="text-slate-600">{c.maxMarks}</b></span>
                        <span>Weightage: <b className="text-slate-600">{c.weightage}%</b></span>
                        <span>Entered: <b className="text-slate-600">{c.marksEntered}/{c.totalStudents}</b></span>
                        {c.scheduledDate && <span>Date: {new Date(c.scheduledDate).toLocaleDateString("en-IN")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleTogglePublish(c.id)}
                        className={`p-1.5 rounded-lg transition-colors ${c.published ? "hover:bg-amber-50 text-amber-500" : "hover:bg-green-50 text-slate-400 hover:text-green-600"}`}
                        title={c.published ? "Unpublish" : "Publish"}>
                        {c.published ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} title="Add Exam Component" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Navigate to Section</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <select value={fDeptId} onChange={e => onFDept(e.target.value)} className={inputCls}>
                <option value="">— Select —</option>
                {formDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Program">
              <select value={fProgId} onChange={e => onFProg(e.target.value)} disabled={!fDeptId} className={disabledCls}>
                <option value="">— Select —</option>
                {formProgs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Semester">
              <select value={fSemId} onChange={e => onFSem(e.target.value)} disabled={!fProgId} className={disabledCls}>
                <option value="">— Select —</option>
                {formSems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Section">
              <select value={form.sectionId} onChange={e => sf("sectionId", e.target.value)} disabled={!fSemId} className={disabledCls}>
                <option value="">— Select —</option>
                {(window._tempSections ?? []).map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Subject">
                <select value={form.subjectId} onChange={e => sf("subjectId", e.target.value)} disabled={!fSemId} className={disabledCls}>
                  <option value="">— Select Subject —</option>
                  {formSubjs.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </Field>
            </div>
          </div>

          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide pt-1">Component Details</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Exam Type">
              <select value={form.examType} onChange={e => onExamTypeChange(e.target.value)} className={inputCls}>
                {EXAM_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </Field>
            <Field label="Academic Year">
              <select value={form.academicYear} onChange={e => sf("academicYear", e.target.value)} className={inputCls}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Max Marks">
              <input type="number" value={form.maxMarks} onChange={e => sf("maxMarks", e.target.value)} min={1} max={200} className={inputCls} />
            </Field>
            <Field label="Weightage (%)">
              <input type="number" value={form.weightage} onChange={e => sf("weightage", e.target.value)} min={0} max={100} step={5} className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Scheduled Date (optional)">
                <input type="date" value={form.scheduledDate} onChange={e => sf("scheduledDate", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>

          <button onClick={handleCreate} disabled={saving || !form.sectionId || !form.subjectId}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={14} className="animate-spin" />} Create Component
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 2: Enter Marks ───────────────────────────────────────────────────────

function EnterMarksTab() {
  const [section, setSection] = useState(null);
  // Bug 5: Pending completed exams
  const [pendingExams, setPendingExams] = useState([]);

  const fetchPendingExams = async (sec, year) => {
    try {
      const data = await marksService.getPendingExams(sec.id, year);
      setPendingExams(Array.isArray(data) ? data : []);
    } catch {}
  };

  // Section select hone ke baad call karo fetchPendingExams
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [components, setComponents] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [marks, setMarks] = useState([]);   // [{studentId, studentName, enrollment, marksObtained, absent, remarks}]
  const [loadingComp, setLoadingComp] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadComponents = async (sec = section, year = academicYear) => {
    if (!sec) return;
    setLoadingComp(true); setSelectedComp(null); setMarks([]);
    try {
      const data = await marksService.getComponents(sec.id, year);
      setComponents(Array.isArray(data) ? data : []);
    } catch { toast.error("Components load nahi hue"); }
    finally { setLoadingComp(false); }
  };

  const selectComponent = async (comp) => {
    setSelectedComp(comp); setMarks([]);
    setLoadingMarks(true);
    try {
      const data = await marksService.getMarks(comp.id);
      setMarks((Array.isArray(data) ? data : []).map(m => ({
        studentId: m.studentId,
        studentName: m.studentName,
        enrollmentNumber: m.enrollmentNumber,
        marksObtained: m.marksObtained ?? "",
        absent: m.absent,
        remarks: m.remarks ?? "",
      })));
    } catch { toast.error("Marks load nahi hue"); }
    finally { setLoadingMarks(false); }
  };

  const updateMark = (idx, field, value) => {
    setMarks(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    if (!selectedComp) return;
    setSaving(true);
    try {
      await marksService.enterMarks({
        componentId: selectedComp.id,
        entries: marks.map(m => ({
          studentId: m.studentId,
          marksObtained: m.absent ? null : (m.marksObtained === "" ? null : Number(m.marksObtained)),
          absent: m.absent,
          remarks: m.remarks || null,
        })),
      });
      toast.success("Marks saved successfully!");
      selectComponent(selectedComp);
    } catch (err) { toast.error(err?.response?.data?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const present = marks.filter(m => !m.absent && m.marksObtained !== "").length;
  const absent = marks.filter(m => m.absent).length;
  const avg = marks.filter(m => !m.absent && m.marksObtained !== "").length > 0
    ? (marks.filter(m => !m.absent && m.marksObtained !== "")
      .reduce((s, m) => s + Number(m.marksObtained), 0) /
      marks.filter(m => !m.absent && m.marksObtained !== "").length).toFixed(1)
    : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Select Section</p>
          <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); loadComponents(section, e.target.value); }}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <SectionDrillDown onSelect={sec => { setSection(sec); loadComponents(sec, academicYear); }} />
      </div>

      {/* Component Picker */}
      {section && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Select Exam Component</p>
          {loadingComp ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>
          ) : components.length === 0 ? (
            <p className="text-sm text-slate-400">Koi component nahi mila. Pehle "Exam Components" tab mein create karo.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {components.map(c => (
                <button key={c.id} onClick={() => selectComponent(c)}
                  className={[
                    "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                    selectedComp?.id === c.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300",
                  ].join(" ")}>
                  {c.subjectCode} — {c.examTypeDisplay}
                  <span className="ml-1.5 opacity-60">({c.marksEntered}/{c.totalStudents})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Marks Table */}
      {selectedComp && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedComp.subjectName} — {selectedComp.examTypeDisplay}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Max: {selectedComp.maxMarks} · Weightage: {selectedComp.weightage}% ·
                {present > 0 && ` Avg: ${avg}/${selectedComp.maxMarks}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Present: <b className="text-green-600">{present}</b></span>
              <span className="text-xs text-slate-400">Absent: <b className="text-red-600">{absent}</b></span>
              <button onClick={handleSave} disabled={saving || marks.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Marks
              </button>
            </div>
          </div>

          {loadingMarks ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : marks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <GraduationCap size={28} className="opacity-30" />
              <p className="text-sm">Is section mein koi student nahi hai.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Enroll No.</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3 text-center">Marks / {selectedComp.maxMarks}</th>
                    <th className="px-4 py-3 text-center">%</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {marks.map((m, idx) => {
                    const pct = m.absent ? 0
                      : m.marksObtained !== "" && m.marksObtained != null
                        ? ((Number(m.marksObtained) / selectedComp.maxMarks) * 100).toFixed(1)
                        : null;
                    return (
                      <tr key={m.studentId} className={`${m.absent ? "bg-red-50/50" : "hover:bg-slate-50"}`}>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{m.studentName}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{m.enrollmentNumber}</td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="checkbox" checked={m.absent}
                            onChange={e => updateMark(idx, "absent", e.target.checked)}
                            className="w-4 h-4 rounded accent-red-500" />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="number" value={m.marksObtained} min={0} max={selectedComp.maxMarks}
                            disabled={m.absent}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "" || (Number(val) >= 0 && Number(val) <= selectedComp.maxMarks)) {
                                updateMark(idx, "marksObtained", val);
                              } else if (Number(val) > selectedComp.maxMarks) {
                                updateMark(idx, "marksObtained", String(selectedComp.maxMarks));
                                toast.error(`Max marks ${selectedComp.maxMarks} se jyada nahi dal sakte!`);
                              }
                            }}
                            className="w-20 px-2 py-1 text-center text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-300" />
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs">
                          {m.absent ? (
                            <span className="text-red-400">AB</span>
                          ) : pct != null ? (
                            <span className={`font-medium ${Number(pct) >= 40 ? "text-green-600" : "text-red-600"}`}>
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <input value={m.remarks} onChange={e => updateMark(idx, "remarks", e.target.value)}
                            placeholder="Optional..." disabled={!m.absent && m.marksObtained === ""}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-transparent disabled:border-transparent" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Results / GPA ─────────────────────────────────────────────────────

function ResultsTab() {
  const [section, setSection] = useState(null);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const fetchResults = async (sec = section, year = academicYear) => {
    if (!sec) return;
    setLoading(true); setExpanded({});
    try {
      const data = await marksService.getResult(sec.id, year);
      setResults(Array.isArray(data) ? data : []);
    } catch { toast.error("Result load nahi hua"); }
    finally { setLoading(false); }
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const pass = results.filter(r => r.resultStatus === "PASS").length;
  const fail = results.filter(r => r.resultStatus === "FAIL").length;
  const inc = results.filter(r => r.resultStatus === "INCOMPLETE").length;
  const avgSgpa = results.length > 0
    ? (results.reduce((s, r) => s + r.sgpa, 0) / results.length).toFixed(2) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Select Section</p>
          <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); fetchResults(section, e.target.value); }}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <SectionDrillDown onSelect={sec => { setSection(sec); fetchResults(sec, academicYear); }} />
      </div>

      {/* Stats row */}
      {results.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: results.length, color: "bg-slate-50 border-slate-200 text-slate-700" },
            { label: "Pass", value: pass, color: "bg-green-50 border-green-200 text-green-700" },
            { label: "Fail", value: fail, color: "bg-red-50 border-red-200 text-red-700" },
            { label: "Avg SGPA", value: avgSgpa, color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.color}`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Result Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !section ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
          <GraduationCap size={28} className="opacity-30" />
          <p className="text-sm">Section select karo</p>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
          <BookOpen size={28} className="opacity-30" />
          <p className="text-sm">Koi result data nahi mila. Marks enter karo pehle.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((student, idx) => {
            const resCfg = RESULT_COLORS[student.resultStatus] ?? RESULT_COLORS.INCOMPLETE;
            const isExpanded = expanded[student.studentId];
            return (
              <div key={student.studentId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Row header */}
                <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => toggleExpand(student.studentId)}>
                  <span className="text-xs text-slate-400 w-6">{idx + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{student.studentName}</p>
                    <p className="text-xs text-slate-400 font-mono">{student.enrollmentNumber}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{student.totalCredits} credits</span>
                    <div className="text-center">
                      <p className="text-lg font-bold text-indigo-600">{student.sgpa}</p>
                      <p className="text-xs text-slate-400">SGPA</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${resCfg}`}>
                      {student.resultStatus}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide font-medium">
                          <th className="px-4 py-2 text-left">Subject</th>
                          <th className="px-3 py-2 text-center">Credits</th>
                          {student.subjects[0]?.components.map(c => (
                            <th key={c.componentId} className="px-3 py-2 text-center">{c.examTypeDisplay}</th>
                          ))}
                          <th className="px-3 py-2 text-center">Total%</th>
                          <th className="px-3 py-2 text-center">Grade</th>
                          <th className="px-3 py-2 text-center">GP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {student.subjects.map(sub => (
                          <tr key={sub.subjectId} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-slate-700">{sub.subjectName}</p>
                              <p className="font-mono text-slate-400">{sub.subjectCode}</p>
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600">{sub.creditHours}</td>
                            {sub.components.map(c => (
                              <td key={c.componentId} className="px-3 py-2.5 text-center">
                                {c.absent ? (
                                  <span className="text-red-500 font-medium">AB</span>
                                ) : c.marksObtained != null ? (
                                  <span className="text-slate-700">{c.marksObtained}/{c.maxMarks}</span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-center font-semibold text-slate-700">
                              {sub.totalWeightedMarks}%
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold ${GRADE_COLORS[sub.gradeLetter] ?? ""}`}>
                                {sub.gradeLetter}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-indigo-600">
                              {sub.gradePoints}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-indigo-50/50 font-semibold">
                          <td className="px-4 py-2.5 text-slate-700" colSpan={2}>Semester GPA</td>
                          {student.subjects[0]?.components.map(c => (
                            <td key={c.componentId} className="px-3 py-2.5" />
                          ))}
                          <td className="px-3 py-2.5 text-center text-slate-600">
                            {student.totalCredits} cr
                          </td>
                          <td className="px-3 py-2.5 text-center text-2xl font-bold text-indigo-600" colSpan={2}>
                            {student.sgpa}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarksPage() {
  const [activeTab, setActiveTab] = useState("components");

  const tabs = [
    { id: "components", label: "Exam Components", icon: BookOpen },
    { id: "marks", label: "Enter Marks", icon: Save },
    { id: "results", label: "Results & GPA", icon: GraduationCap },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Marks & Grade Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Exam configure karo → Marks enter karo → GPA auto-calculate
        </p>
      </div>

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

      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {activeTab === "components" && <ComponentsTab />}
          {activeTab === "marks" && <EnterMarksTab />}
          {activeTab === "results" && <ResultsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}