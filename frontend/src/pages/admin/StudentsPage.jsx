import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, GraduationCap,
  Loader2, Pencil, Plus, Search,
  Trash2, UserCheck, UserMinus, UserX, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { studentService } from "../../services/studentService";
import { academicService } from "../../services/academicService";

// ─── Constants ────────────────────────────────────────────────────────────────

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const BLOOD_GROUPS = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"];
const CURRENT_YEAR = new Date().getFullYear();
const BATCHES = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i);
/*
const EMPTY_FORM = {
  firstName:"", lastName:"", email:"", password:"",
  enrollmentNumber:"", batch: CURRENT_YEAR,
  admissionDate:"", dateOfBirth:"", gender:"MALE",
  bloodGroup:"", phone:"", address:"",
  guardianName:"", guardianContact:"",
};

*/

// naya — sirf ye 4 lines add karo end mein
const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", password: "",
  enrollmentNumber: "", batch: CURRENT_YEAR,
  admissionDate: "", dateOfBirth: "", gender: "MALE",
  bloodGroup: "", phone: "", address: "",
  guardianName: "", guardianContact: "",
  // section selection (only used during create)
  deptId: "", progId: "", semId: "", sectionId: "",
};

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Badge({ children, color = "slate" }) {
  const map = {
    indigo: "bg-indigo-100 text-indigo-700",
    green: "bg-green-100  text-green-700",
    amber: "bg-amber-100  text-amber-700",
    slate: "bg-slate-100  text-slate-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function Field({ label, children, cols }) {
  return (
    <div className={cols ? `col-span-${cols}` : ""}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SectionLabel({ s }) {
  if (!s?.currentSectionId) return <span className="text-slate-400 text-xs">Not assigned</span>;
  return (
    <div className="text-xs leading-tight">
      <p className="font-medium text-slate-700">
        {s.currentProgramName} — Sec {s.currentSectionName}
      </p>
      <p className="text-slate-400">{s.currentSemesterName} · {s.currentDepartmentName}</p>
    </div>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({ open, title, onClose, wide, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
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


// ─── Section Selector (used inside Create form) ───────────────────────────────

function SectionSelector({ deptId, progId, semId, sectionId, onChange }) {
  const [departments, setDepartments] = useState([]);
  const [programs,    setPrograms]    = useState([]);
  const [semesters,   setSemesters]   = useState([]);
  const [sections,    setSections]    = useState([]);

  useEffect(() => {
    academicService.getDepartments()
      .then(d => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Departments load nahi hue"));
  }, []);

  const onDeptChange = async (id) => {
    onChange("deptId", id); onChange("progId", "");
    onChange("semId", "");  onChange("sectionId", "");
    setPrograms([]); setSemesters([]); setSections([]);
    if (!id) return;
    try {
      const d = await academicService.getPrograms(id);
      setPrograms(Array.isArray(d) ? d : []);
    } catch { toast.error("Programs load nahi hue"); }
  };

  const onProgChange = async (id) => {
    onChange("progId", id); onChange("semId", ""); onChange("sectionId", "");
    setSemesters([]); setSections([]);
    if (!id) return;
    try {
      const d = await academicService.getSemesters(id);
      setSemesters(Array.isArray(d) ? d : []);
    } catch { toast.error("Semesters load nahi hue"); }
  };

  const onSemChange = async (id) => {
    onChange("semId", id); onChange("sectionId", ""); setSections([]);
    if (!id) return;
    try {
      const d = await academicService.getSections(id);
      setSections(Array.isArray(d) ? d : []);
    } catch { toast.error("Sections load nahi hue"); }
  };

  const selCls = inputCls + " disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div>
      <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-2">
        Section Assignment
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Department">
          <select value={deptId} onChange={e=>onDeptChange(e.target.value)} className={selCls}>
            <option value="">— Select —</option>
            {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Program">
          <select value={progId} onChange={e=>onProgChange(e.target.value)} disabled={!deptId} className={selCls}>
            <option value="">— Select —</option>
            {programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Semester">
          <select value={semId} onChange={e=>onSemChange(e.target.value)} disabled={!progId} className={selCls}>
            <option value="">— Select —</option>
            {semesters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Section">
          <select value={sectionId} onChange={e=>onChange("sectionId", e.target.value)} disabled={!semId} className={selCls}>
            <option value="">— Select —</option>
            {sections.map(s=>(
              <option key={s.id} value={s.id}>
                {s.name} ({s.currentStrength}/{s.maxCapacity})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-xs text-slate-400 mt-1.5">Optional — baad mein bhi assign kar sakte ho</p>
    </div>
  );
}



// ─── Add / Edit Form ──────────────────────────────────────────────────────────

function StudentForm({ form, onChange, onSubmit, loading, isEdit }) {
  const sf = (k, v) => onChange(k, v);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Account */}
      <div>
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
          Account
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name">
            <input value={form.firstName} onChange={e => sf("firstName", e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Last Name">
            <input value={form.lastName} onChange={e => sf("lastName", e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => sf("email", e.target.value)} required disabled={isEdit} className={inputCls + " disabled:bg-slate-50 disabled:text-slate-400"} />
          </Field>
          {!isEdit && (
            <Field label="Password">
              <input type="password" value={form.password} onChange={e => sf("password", e.target.value)} required minLength={8} className={inputCls} />
            </Field>
          )}
        </div>
      </div>

      {/* Academic */}
      <div>
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">
          Academic
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Enrollment Number">
            <input value={form.enrollmentNumber} onChange={e => sf("enrollmentNumber", e.target.value)} required disabled={isEdit} className={inputCls + " disabled:bg-slate-50 disabled:text-slate-400"} placeholder="CSE2024001" />
          </Field>
          <Field label="Batch Year">
            <select value={form.batch} onChange={e => sf("batch", Number(e.target.value))} className={inputCls}>
              {BATCHES.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Admission Date">
            <input type="date" value={form.admissionDate} onChange={e => sf("admissionDate", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Personal */}
      <div>
        <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-2">
          Personal
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth">
            <input type="date" value={form.dateOfBirth} onChange={e => sf("dateOfBirth", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={e => sf("gender", e.target.value)} className={inputCls}>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Blood Group">
            <select value={form.bloodGroup} onChange={e => sf("bloodGroup", e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b.replace("_", "")}</option>)}
            </select>
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={e => sf("phone", e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <textarea value={form.address} onChange={e => sf("address", e.target.value)} rows={2} className={inputCls} />
            </Field>
          </div>
        </div>
      </div>

      {/* Guardian */}
      <div>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
          Guardian
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Guardian Name">
            <input value={form.guardianName} onChange={e => sf("guardianName", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Guardian Contact">
            <input value={form.guardianContact} onChange={e => sf("guardianContact", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Section Assignment — only on create */}
      {!isEdit && (
        <SectionSelector
          deptId={form.deptId} progId={form.progId}
          semId={form.semId} sectionId={form.sectionId}
          onChange={onChange}
        />
      )}

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
        {loading && <Loader2 size={14} className="animate-spin" />}
        {isEdit ? "Save Changes" : "Add Student"}
      </button>
    </form>
  );
}

// ─── Assign Section Modal ─────────────────────────────────────────────────────

function AssignSectionModal({ open, student, onClose, onAssigned }) {
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);

  const [deptId, setDeptId] = useState("");
  const [progId, setProgId] = useState("");
  const [semId, setSemId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeptId(""); setProgId(""); setSemId(""); setSectionId("");
    academicService.getDepartments().then(d => setDepartments(Array.isArray(d) ? d : []));
  }, [open]);

  const onDeptChange = async (id) => {
    setDeptId(id); setProgId(""); setSemId(""); setSectionId("");
    setPrograms([]); setSemesters([]); setSections([]);
    if (!id) return;
    const data = await academicService.getPrograms(id);
    setPrograms(Array.isArray(data) ? data : []);
  };

  const onProgChange = async (id) => {
    setProgId(id); setSemId(""); setSectionId("");
    setSemesters([]); setSections([]);
    if (!id) return;
    const data = await academicService.getSemesters(id);
    setSemesters(Array.isArray(data) ? data : []);
  };

  const onSemChange = async (id) => {
    setSemId(id); setSectionId(""); setSections([]);
    if (!id) return;
    const data = await academicService.getSections(id);
    setSections(Array.isArray(data) ? data : []);
  };

  const handleAssign = async () => {
    if (!sectionId) return toast.error("Section select karo");
    setSaving(true);
    try {
      await studentService.assignSection(student.id, sectionId);
      toast.success("Section assigned!");
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Assignment failed");
    } finally { setSaving(false); }
  };

  const selCls = inputCls + " disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <Modal open={open} title={`Assign Section — ${student?.firstName} ${student?.lastName}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Department">
          <select value={deptId} onChange={e => onDeptChange(e.target.value)} className={selCls}>
            <option value="">— Select Department —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Program">
          <select value={progId} onChange={e => onProgChange(e.target.value)} disabled={!deptId} className={selCls}>
            <option value="">— Select Program —</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Semester">
          <select value={semId} onChange={e => onSemChange(e.target.value)} disabled={!progId} className={selCls}>
            <option value="">— Select Semester —</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Section">
          <select value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!semId} className={selCls}>
            <option value="">— Select Section —</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>
                Section {s.name} ({s.currentStrength}/{s.maxCapacity})
              </option>
            ))}
          </select>
        </Field>
        <button onClick={handleAssign} disabled={!sectionId || saving}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Assign Section
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const searchTimer = useRef(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async (page = 0, q = search, batch = batchFilter) => {
    setLoading(true);
    try {
      const data = await studentService.getAll({ page, search: q, batch });
      setStudents(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Students load nahi hue"); }
    finally { setLoading(false); }
  }, [search, batchFilter]);

  useEffect(() => { fetchStudents(0); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchStudents(0, val, batchFilter), 400);
  };

  const handleBatch = (val) => { setBatchFilter(val); fetchStudents(0, search, val); };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openCreate = () => { setForm(EMPTY_FORM); setCreateOpen(true); };
  const openEdit = (s) => {
    setForm({
      firstName: s.firstName, lastName: s.lastName, email: s.email, password: "",
      enrollmentNumber: s.enrollmentNumber, batch: s.batch,
      admissionDate: s.admissionDate?.slice(0, 10) ?? "",
      dateOfBirth: s.dateOfBirth?.slice(0, 10) ?? "",
      gender: s.gender ?? "MALE", bloodGroup: s.bloodGroup ?? "",
      phone: s.phone ?? "", address: s.address ?? "",
      guardianName: s.guardianName ?? "", guardianContact: s.guardianContact ?? "",
    });
    setEditStudent(s);
  };
/*
  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await studentService.create({
        ...form, batch: Number(form.batch),
        bloodGroup: form.bloodGroup || undefined,
        admissionDate: form.admissionDate || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      toast.success("Student added!");
      setCreateOpen(false); fetchStudents(meta.number);
    } catch (err) { toast.error(err?.response?.data?.message ?? err?.message ?? "Error"); }
    finally { setSaving(false); }
  };
  */


  // naya
const handleCreate = async (e) => {
  e.preventDefault(); setSaving(true);
  try {
    const created = await studentService.create({
      ...form, batch:Number(form.batch),
      bloodGroup:    form.bloodGroup    || undefined,
      admissionDate: form.admissionDate || undefined,
      dateOfBirth:   form.dateOfBirth   || undefined,
    });
    if (form.sectionId) {
      try {
        await studentService.assignSection(created.id, form.sectionId);
        toast.success("Student added aur section assign ho gaya!");
      } catch {
        toast.success("Student add hua — lekin section assign nahi hua, baad mein karo.");
      }
    } else {
      toast.success("Student added!");
    }
    setCreateOpen(false); fetchStudents(meta.number);
  } catch (err) { toast.error(err?.response?.data?.message ?? err?.message ?? "Error"); }
  finally { setSaving(false); }
};

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await studentService.update(editStudent.id, {
        firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        dateOfBirth: form.dateOfBirth || undefined, gender: form.gender,
        bloodGroup: form.bloodGroup || undefined, address: form.address,
        guardianName: form.guardianName, guardianContact: form.guardianContact,
        admissionDate: form.admissionDate || undefined,
      });
      toast.success("Student updated!"); setEditStudent(null); fetchStudents(meta.number);
    } catch (err) { toast.error(err?.response?.data?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await studentService.delete(deleteTarget.id);
      toast.success("Student deleted."); setDeleteTarget(null); fetchStudents(meta.number);
    } catch { toast.error("Delete failed."); }
  };

  const handleRemoveSection = async (student) => {
    try {
      await studentService.removeSection(student.id);
      toast.success("Section removed."); fetchStudents(meta.number);
    } catch { toast.error("Failed to remove section."); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Students</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.totalElements} enrolled students</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, email, or enrollment no…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={batchFilter} onChange={e => handleBatch(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Batches</option>
          {BATCHES.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <GraduationCap size={32} className="opacity-30" />
            <p className="text-sm">No students found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Enrollment No.</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Current Section</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map(s => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="indigo">{s.enrollmentNumber}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="amber">{s.batch}</Badge>
                    </td>
                    <td className="px-4 py-3"><SectionLabel s={s} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.userEnabled ? "text-green-600" : "text-slate-400"}`}>
                        <span className={`h-2 w-2 rounded-full ${s.userEnabled ? "bg-green-500" : "bg-slate-300"}`} />
                        {s.userEnabled ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setAssignModal(s)} title="Assign Section"
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600">
                          <UserCheck size={14} />
                        </button>
                        {s.currentSectionId && (
                          <button onClick={() => handleRemoveSection(s)} title="Remove from Section"
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600">
                            <UserMinus size={14} />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(s)} title="Delete"
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
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Page {meta.number + 1} of {meta.totalPages}
            </p>
            <div className="flex gap-1">
              <button onClick={() => fetchStudents(meta.number - 1)} disabled={meta.number === 0}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => fetchStudents(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} title="Add New Student" onClose={() => setCreateOpen(false)} wide>
        <StudentForm form={form} onChange={sf} onSubmit={handleCreate} loading={saving} isEdit={false} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editStudent} title="Edit Student" onClose={() => setEditStudent(null)} wide>
        <StudentForm form={form} onChange={sf} onSubmit={handleEdit} loading={saving} isEdit={true} />
      </Modal>

      {/* Assign Section Modal */}
      <AssignSectionModal
        open={!!assignModal} student={assignModal}
        onClose={() => setAssignModal(null)}
        onAssigned={() => fetchStudents(meta.number)}
      />

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} title="Delete Student" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">{deleteTarget?.firstName} {deleteTarget?.lastName}</span> ({deleteTarget?.enrollmentNumber}) ko delete karna chahte ho? User account bhi delete ho jaayega.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleDelete}
            className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}