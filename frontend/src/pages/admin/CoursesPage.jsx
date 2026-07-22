import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen, ChevronLeft, ChevronRight, GraduationCap,
  Layers, Loader2, Pencil, Plus, Search, Trash2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { courseService, currentAcademicYear } from "../../services/courseService";
import { academicService } from "../../services/academicService";
import { facultyService } from "../../services/facultyService";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECT_TYPES = ["THEORY", "PRACTICAL", "TUTORIAL", "ELECTIVE"];

const TYPE_COLORS = {
  THEORY: "bg-blue-100   text-blue-700",
  PRACTICAL: "bg-green-100  text-green-700",
  TUTORIAL: "bg-amber-100  text-amber-700",
  ELECTIVE: "bg-purple-100 text-purple-700",
};

const ACADEMIC_YEARS = (() => {
  const cur = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const y = cur - i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });
})();

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
const disabledCls = inputCls + " disabled:bg-slate-50 disabled:text-slate-400";

const EMPTY_SUBJECT_FORM = {
  code: "", name: "", creditHours: 3, weeklyHours: 3,
  type: "THEORY", description: "", semesterId: "",
};

const EMPTY_ASSIGN_FORM = {
  facultyId: "", subjectId: "", sectionId: "",
  academicYear: currentAcademicYear(),
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[type] ?? "bg-slate-100 text-slate-600"}`}>
      {type}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ color, children }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${color}`}>
      {children}
    </p>
  );
}

function EmptyTable({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
      <Icon size={32} className="opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ open, title, onClose, wide, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className={`relative w-full ${wide ? "max-w-2xl" : "max-w-lg"} bg-white rounded-2xl shadow-xl`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
              <button onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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

// ─── Tab: Subjects ────────────────────────────────────────────────────────────

function SubjectsTab() {
  const [subjects, setSubjects] = useState([]);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Drill-down filter
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [progId, setProgId] = useState("");
  const [semId, setSemId] = useState("");
  const [search, setSearch] = useState("");
  const searchTimer = useRef(null);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form
  const [form, setForm] = useState(EMPTY_SUBJECT_FORM);
  const [formSems, setFormSems] = useState([]);   // semesters in create modal

  // Drill-down filter for modal
  const [fDepts, setFDepts] = useState([]);
  const [fProgs, setFProgs] = useState([]);
  const [fDeptId, setFDeptId] = useState("");
  const [fProgId, setFProgId] = useState("");

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load departments
  useEffect(() => {
    academicService.getDepartments().then(d => {
      const arr = Array.isArray(d) ? d : [];
      setDepartments(arr); setFDepts(arr);
    }).catch(() => { });
  }, []);

  const onDeptChange = async (id) => {
    setDeptId(id); setProgId(""); setSemId(""); setPrograms([]); setSemesters([]);
    if (!id) return;
    const data = await academicService.getPrograms(id);
    setPrograms(Array.isArray(data) ? data : []);
  };
  const onProgChange = async (id) => {
    setProgId(id); setSemId(""); setSemesters([]);
    if (!id) return;
    const data = await academicService.getSemesters(id);
    setSemesters(Array.isArray(data) ? data : []);
  };

  // Modal drill-down
  const onFDeptChange = async (id) => {
    setFDeptId(id); setFProgId(""); setFormSems([]); sf("semesterId", "");
    if (!id) return;
    const data = await academicService.getPrograms(id);
    setFProgs(Array.isArray(data) ? data : []);
  };
  const onFProgChange = async (id) => {
    setFProgId(id); setFormSems([]); sf("semesterId", "");
    if (!id) return;
    const data = await academicService.getSemesters(id);
    setFormSems(Array.isArray(data) ? data : []);
  };

  const fetchSubjects = useCallback(async (page = 0, q = search, sid = semId) => {
    setLoading(true);
    try {
      const data = await courseService.getSubjects({ page, search: q, semesterId: sid });
      setSubjects(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Subjects load nahi hue"); }
    finally { setLoading(false); }
  }, [search, semId]);

  useEffect(() => { fetchSubjects(0); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchSubjects(0, val, semId), 400);
  };

  const openCreate = () => {
    setForm(EMPTY_SUBJECT_FORM); setFDeptId(""); setFProgId(""); setFormSems([]); setFProgs([]);
    setCreateOpen(true);
  };
  const openEdit = (s) => {
    setForm({
      code: s.code, name: s.name, creditHours: s.creditHours,
      weeklyHours: s.weeklyHours, type: s.type,
      description: s.description ?? "", semesterId: s.semesterId,
    });
    setEditSubject(s);
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await courseService.createSubject({
        ...form, creditHours: Number(form.creditHours),
        weeklyHours: Number(form.weeklyHours),
      });
      toast.success("Subject added!"); setCreateOpen(false); fetchSubjects(meta.number);
    } catch (err) { toast.error(err?.response?.data?.message ?? err?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await courseService.updateSubject(editSubject.id, {
        name: form.name,
        creditHours: Number(form.creditHours),
        weeklyHours: Number(form.weeklyHours),
        type: form.type,
        description: form.description || undefined,
      });
      toast.success("Subject updated!"); setEditSubject(null); fetchSubjects(meta.number);
    } catch (err) { toast.error(err?.response?.data?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await courseService.deleteSubject(deleteTarget.id);
      toast.success("Subject deleted."); setDeleteTarget(null); fetchSubjects(meta.number);
    } catch { toast.error("Delete failed."); }
  };

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or code…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={deptId} onChange={e => onDeptChange(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={progId} onChange={e => onProgChange(e.target.value)} disabled={!deptId}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
          <option value="">All Programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={semId} onChange={e => { setSemId(e.target.value); fetchSubjects(0, search, e.target.value); }}
          disabled={!progId}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
          <option value="">All Semesters</option>
          {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
          <Plus size={15} /> Add Subject
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading
          ? <div className="flex justify-center items-center h-48 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
          : subjects.length === 0
            ? <EmptyTable icon={BookOpen} text="No subjects found." />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Credits</th>
                      <th className="px-4 py-3">Hrs/wk</th>
                      <th className="px-4 py-3">Semester</th>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subjects.map(s => (
                      <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{s.code}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                        <td className="px-4 py-3"><TypeBadge type={s.type} /></td>
                        <td className="px-4 py-3 text-slate-600 text-center">{s.creditHours}</td>
                        <td className="px-4 py-3 text-slate-600 text-center">{s.weeklyHours}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{s.semesterName}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[120px] truncate">{s.programName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(s)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteTarget(s)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
        <Pagination meta={meta} onPage={p => fetchSubjects(p)} />
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} title="Add New Subject" onClose={() => setCreateOpen(false)} wide>
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <SectionTitle color="text-indigo-600">Semester (Drill-down)</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Department">
                <select value={fDeptId} onChange={e => onFDeptChange(e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {fDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Program">
                <select value={fProgId} onChange={e => onFProgChange(e.target.value)} disabled={!fDeptId} className={disabledCls}>
                  <option value="">— Select —</option>
                  {fProgs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Semester">
                <select value={form.semesterId} onChange={e => sf("semesterId", e.target.value)} disabled={!fProgId} className={disabledCls} required>
                  <option value="">— Select —</option>
                  {formSems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div>
            <SectionTitle color="text-violet-600">Subject Details</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject Code">
                <input value={form.code} onChange={e => sf("code", e.target.value.toUpperCase())} required maxLength={20} className={inputCls} placeholder="CS301" />
              </Field>
              <Field label="Subject Name">
                <input value={form.name} onChange={e => sf("name", e.target.value)} required className={inputCls} placeholder="Data Structures" />
              </Field>
              <Field label="Type">
                <select value={form.type} onChange={e => sf("type", e.target.value)} className={inputCls}>
                  {SUBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Credit Hours">
                  <input type="number" value={form.creditHours} onChange={e => sf("creditHours", e.target.value)} min={1} max={10} className={inputCls} />
                </Field>
                <Field label="Hrs/week">
                  <input type="number" value={form.weeklyHours} onChange={e => sf("weeklyHours", e.target.value)} min={1} max={20} className={inputCls} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Description (optional)">
                  <textarea value={form.description} onChange={e => sf("description", e.target.value)} rows={2} className={inputCls} />
                </Field>
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />} Add Subject
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editSubject} title="Edit Subject" onClose={() => setEditSubject(null)}>
        <form onSubmit={handleEdit} className="space-y-3">
          <Field label="Subject Name"><input value={form.name} onChange={e => sf("name", e.target.value)} required className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={e => sf("type", e.target.value)} className={inputCls}>
                {SUBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Credits"><input type="number" value={form.creditHours} onChange={e => sf("creditHours", e.target.value)} min={1} max={10} className={inputCls} /></Field>
              <Field label="Hrs/wk"><input type="number" value={form.weeklyHours} onChange={e => sf("weeklyHours", e.target.value)} min={1} max={20} className={inputCls} /></Field>
            </div>
          </div>
          <Field label="Description"><textarea value={form.description} onChange={e => sf("description", e.target.value)} rows={2} className={inputCls} /></Field>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={14} className="animate-spin" />} Save Changes
          </button>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} title="Delete Subject" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">{deleteTarget?.code} — {deleteTarget?.name}</span> delete karna chahte ho?
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleDelete} className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: Faculty Assignments ─────────────────────────────────────────────────

function AssignmentsTab() {
  const [assignments, setAssignments] = useState([]);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [yearFilter, setYearFilter] = useState(currentAcademicYear());
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [form, setForm] = useState(EMPTY_ASSIGN_FORM);
  const [facList, setFacList] = useState([]);
  const [depts, setDepts] = useState([]);
  const [progs, setProgs] = useState([]);
  const [sems, setSems] = useState([]);
  const [subjs, setSubjs] = useState([]);
  const [sections, setSections] = useState([]);
  const [fDeptId, setFDeptId] = useState("");
  const [fProgId, setFProgId] = useState("");
  const [fSemId, setFSemId] = useState("");

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      facultyService.getAll({ size: 200 }),
      academicService.getDepartments(),
    ]).then(([fac, dept]) => {
      setFacList(fac.content ?? []);
      const arr = Array.isArray(dept) ? dept : [];
      setDepts(arr);
    }).catch(() => { });
  }, []);

  const onFDept = async (id) => {
    setFDeptId(id); setFProgId(""); setFSemId(""); setProgs([]); setSems([]); setSubjs([]); setSections([]); sf("subjectId", ""); sf("sectionId", "");
    if (!id) return;
    setProgs(await academicService.getPrograms(id).then(d => Array.isArray(d) ? d : []));
  };
  const onFProg = async (id) => {
    setFProgId(id); setFSemId(""); setSems([]); setSubjs([]); setSections([]); sf("subjectId", ""); sf("sectionId", "");
    if (!id) return;
    setSems(await academicService.getSemesters(id).then(d => Array.isArray(d) ? d : []));
  };
  const onFSem = async (id) => {
    setFSemId(id); setSubjs([]); setSections([]); sf("subjectId", ""); sf("sectionId", "");
    if (!id) return;
    const [s, sec] = await Promise.all([
      courseService.getSubjectsBySemester(id).then(d => Array.isArray(d) ? d : []),
      academicService.getSections(id).then(d => Array.isArray(d) ? d : []),
    ]);
    setSubjs(s); setSections(sec);
  };

  const fetchAssignments = useCallback(async (page = 0, year = yearFilter) => {
    setLoading(true);
    try {
      const data = await courseService.getAssignments({ page, academicYear: year });
      setAssignments(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Assignments load nahi hue"); }
    finally { setLoading(false); }
  }, [yearFilter]);

  useEffect(() => { fetchAssignments(0); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await courseService.createAssignment(form);
      toast.success("Assignment created!"); setCreateOpen(false); fetchAssignments(0);
    } catch (err) { toast.error(err?.response?.data?.message ?? err?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Assignment remove karna chahte ho?")) return;
    try { await courseService.deleteAssignment(id); toast.success("Removed."); fetchAssignments(meta.number); }
    catch { toast.error("Delete failed."); }
  };

  return (
    <div className="space-y-4">

      {/* Filters + Add */}
      <div className="flex gap-3 items-center">
        <select value={yearFilter}
          onChange={e => { setYearFilter(e.target.value); fetchAssignments(0, e.target.value); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm text-slate-400 flex-1">{meta.totalElements} assignments</span>
        <button onClick={() => { setForm({ ...EMPTY_ASSIGN_FORM, academicYear: yearFilter }); setFDeptId(""); setFProgId(""); setFSemId(""); setProgs([]); setSems([]); setSubjs([]); setSections([]); setCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={15} /> Assign Faculty
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading
          ? <div className="flex justify-center items-center h-48 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
          : assignments.length === 0
            ? <EmptyTable icon={GraduationCap} text="No assignments found." />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Faculty</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Semester</th>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {assignments.map(a => (
                      <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{a.facultyName}</p>
                            <p className="text-xs text-slate-400">{a.facultyEmployeeId}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-slate-700">{a.subjectName}</p>
                            <span className="font-mono text-xs text-slate-400">{a.subjectCode}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            Sec {a.sectionName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{a.semesterName}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[120px] truncate">{a.programName}</td>
                        <td className="px-4 py-3">
                          <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">{a.academicYear}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDelete(a.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
        <Pagination meta={meta} onPage={p => fetchAssignments(p)} />
      </div>

      {/* Create Assignment Modal */}
      <Modal open={createOpen} title="Assign Faculty to Subject" onClose={() => setCreateOpen(false)} wide>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <SectionTitle color="text-indigo-600">Select Academic Year</SectionTitle>
            <Field label="Academic Year">
              <select value={form.academicYear} onChange={e => sf("academicYear", e.target.value)} className={inputCls}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <SectionTitle color="text-violet-600">Navigate to Section</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Department">
                <select value={fDeptId} onChange={e => onFDept(e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Program">
                <select value={fProgId} onChange={e => onFProg(e.target.value)} disabled={!fDeptId} className={disabledCls}>
                  <option value="">— Select —</option>
                  {progs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Semester">
                <select value={fSemId} onChange={e => onFSem(e.target.value)} disabled={!fProgId} className={disabledCls}>
                  <option value="">— Select —</option>
                  {sems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle color="text-sky-600">Assignment Details</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Faculty">
                <select value={form.facultyId} onChange={e => sf("facultyId", e.target.value)} required disabled={!fDeptId} className={disabledCls}>
                  <option value="">{fDeptId ? "— Select Faculty —" : "Pehle department select karein"}</option>
                  {facList.filter(f => f.departmentId === fDeptId).map(f => (
                    <option key={f.id} value={f.id}>
                      {f.firstName} {f.lastName} ({f.employeeId})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subject">
                <select value={form.subjectId} onChange={e => sf("subjectId", e.target.value)} required disabled={!fSemId} className={disabledCls}>
                  <option value="">— Select Subject —</option>
                  {subjs.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </Field>
              <Field label="Section">
                <select value={form.sectionId} onChange={e => sf("sectionId", e.target.value)} required disabled={!fSemId} className={disabledCls}>
                  <option value="">— Select Section —</option>
                  {sections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <button type="submit" disabled={saving || !form.facultyId || !form.subjectId || !form.sectionId}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />} Create Assignment
          </button>
        </form>
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState("subjects");

  const tabs = [
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "assignments", label: "Faculty Assignments", icon: GraduationCap },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Course & Subject Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Subjects define karo aur faculty ko courses assign karo
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
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {activeTab === "subjects" && <SubjectsTab />}
          {activeTab === "assignments" && <AssignmentsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}