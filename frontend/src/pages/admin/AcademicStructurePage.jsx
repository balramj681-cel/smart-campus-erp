import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen, Building2, ChevronRight, GraduationCap,
  Layers, Loader2, Pencil, Plus, Trash2, Users, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { academicService } from "../../services/academicService";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEGREE_TYPES  = ["DIPLOMA", "BACHELOR", "MASTER", "PHD", "CERTIFICATE"];
const DURATION_OPTS = [1, 2, 3, 4, 5, 6];

const ORDINALS = [
  "", "First", "Second", "Third", "Fourth",
  "Fifth", "Sixth", "Seventh", "Eighth",
  "Ninth", "Tenth", "Eleventh", "Twelfth",
];

// ─── Small reusable components ────────────────────────────────────────────────

function PanelHeader({ icon: Icon, title, color, count, onAdd }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r ${color}`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-white opacity-90" />
        <span className="text-sm font-semibold text-white">{title}</span>
        {count != null && (
          <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-white/90 hover:text-white bg-white/15 hover:bg-white/25 px-2 py-1 rounded-lg transition-colors"
        >
          <Plus size={12} /> Add
        </button>
      )}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-slate-300 gap-1.5">
      <Layers size={24} className="opacity-50" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AcademicStructurePage() {

  // ── Data ──────────────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [programs,    setPrograms]    = useState([]);
  const [semesters,   setSemesters]   = useState([]);
  const [sections,    setSections]    = useState([]);

  // ── Selected (drilldown state) ─────────────────────────────────────────────
  const [selectedDept,    setSelectedDept]    = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedSem,     setSelectedSem]     = useState(null);

  // ── Loading ────────────────────────────────────────────────────────────────
  const [loadingDept, setLoadingDept] = useState(true);
  const [loadingProg, setLoadingProg] = useState(false);
  const [loadingSem,  setLoadingSem]  = useState(false);
  const [loadingSec,  setLoadingSec]  = useState(false);
  const [saving,      setSaving]      = useState(false);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [modal, setModal] = useState({ type: null, editing: null });
  // type: "dept" | "program" | "semester" | "section"

  // ── Forms ─────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({});
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Load departments ───────────────────────────────────────────────────────
  useEffect(() => {
    loadDepts();
  }, []);

  const loadDepts = async () => {
    setLoadingDept(true);
    try {
      const data = await academicService.getDepartments();
      setDepartments(Array.isArray(data) ? data : data?.content ?? []);
    } catch { toast.error("Departments load nahi hue"); }
    finally  { setLoadingDept(false); }
  };

  const selectDept = async (dept) => {
    setSelectedDept(dept);
    setSelectedProgram(null);
    setSelectedSem(null);
    setSections([]);
    setLoadingProg(true);
    try {
      const data = await academicService.getPrograms(dept.id);
      setPrograms(Array.isArray(data) ? data : []);
    } catch { toast.error("Programs load nahi hue"); }
    finally  { setLoadingProg(false); }
  };

  const selectProgram = async (prog) => {
    setSelectedProgram(prog);
    setSelectedSem(null);
    setSections([]);
    setLoadingSem(true);
    try {
      const data = await academicService.getSemesters(prog.id);
      setSemesters(Array.isArray(data) ? data : []);
    } catch { toast.error("Semesters load nahi hue"); }
    finally  { setLoadingSem(false); }
  };

  const selectSem = async (sem) => {
    setSelectedSem(sem);
    setLoadingSec(true);
    try {
      const data = await academicService.getSections(sem.id);
      setSections(Array.isArray(data) ? data : []);
    } catch { toast.error("Sections load nahi hue"); }
    finally  { setLoadingSec(false); }
  };

  // ── Open modal helpers ─────────────────────────────────────────────────────
  const openAdd  = (type)         => { setForm(defaultForm(type)); setModal({ type, editing: null }); };
  const openEdit = (type, item)   => { setForm(editForm(type, item)); setModal({ type, editing: item }); };
  const closeModal = ()           => setModal({ type: null, editing: null });

  function defaultForm(type) {
    if (type === "dept")     return { name: "", code: "", description: "" };
    if (type === "program")  return { name: "", code: "", degree: "BACHELOR", durationYears: 4 };
    if (type === "semester") return { semesterNumber: 1, name: "" };
    if (type === "section")  return { name: "", maxCapacity: 60 };
    return {};
  }

  function editForm(type, item) {
    if (type === "dept")     return { name: item.name, code: item.code, description: item.description ?? "" };
    if (type === "program")  return { name: item.name, code: item.code, degree: item.degree, durationYears: item.durationYears };
    if (type === "semester") return { semesterNumber: item.semesterNumber, name: item.name };
    if (type === "section")  return { name: item.name, maxCapacity: item.maxCapacity };
    return {};
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const { type, editing } = modal;

      if (type === "dept") {
        const payload = { name: form.name, code: form.code, description: form.description };
        editing
          ? await academicService.updateDepartment(editing.id, payload)
          : await academicService.createDepartment(payload);
        await loadDepts();
        if (selectedDept) await selectDept(selectedDept);
      }

      if (type === "program") {
        const payload = { name: form.name, code: form.code, degree: form.degree,
                          durationYears: Number(form.durationYears), departmentId: selectedDept.id };
        editing
          ? await academicService.updateProgram(editing.id, payload)
          : await academicService.createProgram(payload);
        await selectDept(selectedDept);
        if (selectedProgram) await selectProgram(selectedProgram);
      }

      if (type === "semester") {
        const payload = { programId: selectedProgram.id,
                          semesterNumber: Number(form.semesterNumber), name: form.name };
        editing
          ? await academicService.updateSemester(editing.id, payload)
          : await academicService.createSemester(payload);
        await selectProgram(selectedProgram);
        if (selectedSem) await selectSem(selectedSem);
      }

      if (type === "section") {
        const payload = { semesterId: selectedSem.id,
                          name: form.name, maxCapacity: Number(form.maxCapacity) };
        editing
          ? await academicService.updateSection(editing.id, payload)
          : await academicService.createSection(payload);
        await selectSem(selectedSem);
      }

      toast.success(editing ? "Updated!" : "Created!");
      closeModal();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (type, id) => {
    if (!window.confirm("Delete karna chahte ho?")) return;
    try {
      if (type === "dept")     { await academicService.deleteDepartment(id); await loadDepts();
                                 if (selectedDept?.id === id) { setSelectedDept(null); setPrograms([]); setSemesters([]); setSections([]); } }
      if (type === "program")  { await academicService.deleteProgram(id); await selectDept(selectedDept);
                                 if (selectedProgram?.id === id) { setSelectedProgram(null); setSemesters([]); setSections([]); } }
      if (type === "semester") { await academicService.deleteSemester(id); await selectProgram(selectedProgram);
                                 if (selectedSem?.id === id) { setSelectedSem(null); setSections([]); } }
      if (type === "section")  { await academicService.deleteSection(id); await selectSem(selectedSem); }
      toast.success("Deleted!");
    } catch { toast.error("Delete nahi hua."); }
  };

  // ── Render item row ────────────────────────────────────────────────────────
  const ItemRow = ({ item, isSelected, onClick, onEdit, onDelete, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={[
        "group flex items-center gap-2 px-3 py-2.5 mx-2 my-0.5 rounded-lg cursor-pointer transition-all",
        isSelected
          ? "bg-indigo-50 border border-indigo-200"
          : "hover:bg-slate-50 border border-transparent",
      ].join(" ")}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>
          {item.name}
        </p>
        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
      {isSelected && <ChevronRight size={14} className="text-indigo-400 flex-shrink-0" />}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(item)}
          className="p-1 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600">
          <Pencil size={12} />
        </button>
        <button onClick={() => onDelete(item.id)}
          className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600">
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );

  // ── Panel loader ───────────────────────────────────────────────────────────
  const PanelLoader = () => (
    <div className="flex justify-center items-center h-20 text-slate-300">
      <Loader2 size={20} className="animate-spin" />
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">

      {/* Page title */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Academic Structure</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Department → Program → Semester → Section hierarchy manage karo
        </p>
      </div>

      {/* Breadcrumb */}
      {(selectedDept || selectedProgram || selectedSem) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
          {selectedDept    && <><span className="text-indigo-600 font-medium">{selectedDept.name}</span></>}
          {selectedProgram && <><ChevronRight size={12} /><span className="text-indigo-600 font-medium">{selectedProgram.name}</span></>}
          {selectedSem     && <><ChevronRight size={12} /><span className="text-indigo-600 font-medium">{selectedSem.name}</span></>}
        </div>
      )}

      {/* 4-panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Panel 1 — Departments */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          <PanelHeader
            icon={Building2} title="Departments" color="from-indigo-500 to-indigo-600"
            count={departments.length}
            onAdd={() => openAdd("dept")}
          />
          <div className="flex-1 overflow-y-auto py-2">
            {loadingDept ? <PanelLoader /> : departments.length === 0
              ? <EmptyState label="No departments yet" />
              : departments.map(d => (
                <ItemRow key={d.id} item={d}
                  isSelected={selectedDept?.id === d.id}
                  onClick={() => selectDept(d)}
                  onEdit={item => openEdit("dept", item)}
                  onDelete={id => handleDelete("dept", id)}
                  subtitle={`${d.programCount ?? 0} programs`}
                />
              ))
            }
          </div>
        </div>

        {/* Panel 2 — Programs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          <PanelHeader
            icon={BookOpen} title="Programs" color="from-violet-500 to-violet-600"
            count={selectedDept ? programs.length : null}
            onAdd={selectedDept ? () => openAdd("program") : null}
          />
          <div className="flex-1 overflow-y-auto py-2">
            {!selectedDept
              ? <EmptyState label="Department select karo" />
              : loadingProg ? <PanelLoader />
              : programs.length === 0 ? <EmptyState label="No programs yet" />
              : programs.map(p => (
                <ItemRow key={p.id} item={p}
                  isSelected={selectedProgram?.id === p.id}
                  onClick={() => selectProgram(p)}
                  onEdit={item => openEdit("program", item)}
                  onDelete={id => handleDelete("program", id)}
                  subtitle={`${p.degree} · ${p.durationYears}yr`}
                />
              ))
            }
          </div>
        </div>

        {/* Panel 3 — Semesters */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          <PanelHeader
            icon={GraduationCap} title="Semesters" color="from-sky-500 to-sky-600"
            count={selectedProgram ? semesters.length : null}
            onAdd={selectedProgram ? () => openAdd("semester") : null}
          />
          <div className="flex-1 overflow-y-auto py-2">
            {!selectedProgram
              ? <EmptyState label="Program select karo" />
              : loadingSem ? <PanelLoader />
              : semesters.length === 0 ? <EmptyState label="No semesters yet" />
              : semesters.map(s => (
                <ItemRow key={s.id} item={s}
                  isSelected={selectedSem?.id === s.id}
                  onClick={() => selectSem(s)}
                  onEdit={item => openEdit("semester", item)}
                  onDelete={id => handleDelete("semester", id)}
                  subtitle={`${s.sectionCount ?? 0} sections`}
                />
              ))
            }
          </div>
        </div>

        {/* Panel 4 — Sections */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          <PanelHeader
            icon={Users} title="Sections" color="from-emerald-500 to-emerald-600"
            count={selectedSem ? sections.length : null}
            onAdd={selectedSem ? () => openAdd("section") : null}
          />
          <div className="flex-1 overflow-y-auto py-2">
            {!selectedSem
              ? <EmptyState label="Semester select karo" />
              : loadingSec ? <PanelLoader />
              : sections.length === 0 ? <EmptyState label="No sections yet" />
              : sections.map(s => (
                <ItemRow key={s.id} item={s}
                  isSelected={false}
                  onClick={() => {}}
                  onEdit={item => openEdit("section", item)}
                  onDelete={id => handleDelete("section", id)}
                  subtitle={`${s.currentStrength}/${s.maxCapacity} students`}
                />
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Department Modal */}
      <Modal open={modal.type === "dept"}
        title={modal.editing ? "Edit Department" : "New Department"}
        onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name ?? ""} onChange={e => sf("name", e.target.value)} className={inputCls} placeholder="e.g. Computer Science" /></Field>
          <Field label="Code"><input value={form.code ?? ""} onChange={e => sf("code", e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. CSE" maxLength={10} /></Field>
          <Field label="Description"><textarea value={form.description ?? ""} onChange={e => sf("description", e.target.value)} className={inputCls} rows={2} placeholder="Optional..." /></Field>
          <SaveBtn loading={saving} onClick={handleSave} />
        </div>
      </Modal>

      {/* Program Modal */}
      <Modal open={modal.type === "program"}
        title={modal.editing ? "Edit Program" : `New Program — ${selectedDept?.name}`}
        onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name ?? ""} onChange={e => sf("name", e.target.value)} className={inputCls} placeholder="e.g. B.Tech Computer Science" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><input value={form.code ?? ""} onChange={e => sf("code", e.target.value.toUpperCase())} className={inputCls} placeholder="BTECH-CS" /></Field>
            <Field label="Duration (Years)">
              <select value={form.durationYears ?? 4} onChange={e => sf("durationYears", e.target.value)} className={inputCls}>
                {DURATION_OPTS.map(n => <option key={n} value={n}>{n} Year{n > 1 ? "s" : ""}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Degree Type">
            <select value={form.degree ?? "BACHELOR"} onChange={e => sf("degree", e.target.value)} className={inputCls}>
              {DEGREE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <SaveBtn loading={saving} onClick={handleSave} />
        </div>
      </Modal>

      {/* Semester Modal */}
      <Modal open={modal.type === "semester"}
        title={modal.editing ? "Edit Semester" : `New Semester — ${selectedProgram?.name}`}
        onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Semester Number">
            <select value={form.semesterNumber ?? 1} onChange={e => {
              const n = Number(e.target.value);
              sf("semesterNumber", n);
              if (!modal.editing) sf("name", `${ORDINALS[n] ?? n} Semester`);
            }} className={inputCls}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n =>
                <option key={n} value={n}>Semester {n}</option>
              )}
            </select>
          </Field>
          <Field label="Label"><input value={form.name ?? ""} onChange={e => sf("name", e.target.value)} className={inputCls} placeholder="e.g. First Semester" /></Field>
          <SaveBtn loading={saving} onClick={handleSave} />
        </div>
      </Modal>

      {/* Section Modal */}
      <Modal open={modal.type === "section"}
        title={modal.editing ? "Edit Section" : `New Section — ${selectedSem?.name}`}
        onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Section Name"><input value={form.name ?? ""} onChange={e => sf("name", e.target.value.toUpperCase())} className={inputCls} placeholder="A" maxLength={10} /></Field>
          <Field label="Max Capacity"><input type="number" value={form.maxCapacity ?? 60} onChange={e => sf("maxCapacity", e.target.value)} className={inputCls} min={10} max={200} /></Field>
          <SaveBtn loading={saving} onClick={handleSave} />
        </div>
      </Modal>
    </div>
  );
}

// ─── Save Button ──────────────────────────────────────────────────────────────
function SaveBtn({ loading, onClick }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
      {loading && <Loader2 size={14} className="animate-spin" />}
      Save
    </button>
  );
}