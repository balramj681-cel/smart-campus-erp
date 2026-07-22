import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen, ChevronLeft, ChevronRight, GraduationCap,
  Loader2, Pencil, Plus, Search, Trash2, UserCheck, UserX, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { facultyService }  from "../../services/facultyService";
import { academicService } from "../../services/academicService";

// ─── Constants ────────────────────────────────────────────────────────────────

const DESIGNATIONS = [
  "PROFESSOR", "ASSOCIATE_PROFESSOR", "ASSISTANT_PROFESSOR",
  "SENIOR_LECTURER", "LECTURER", "VISITING_FACULTY", "HOD",
];
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "VISITING", "CONTRACT"];
const GENDERS          = ["MALE", "FEMALE", "OTHER"];

const DESIGNATION_COLORS = {
  PROFESSOR:            "bg-purple-100 text-purple-700",
  ASSOCIATE_PROFESSOR:  "bg-indigo-100 text-indigo-700",
  ASSISTANT_PROFESSOR:  "bg-blue-100   text-blue-700",
  SENIOR_LECTURER:      "bg-sky-100    text-sky-700",
  LECTURER:             "bg-cyan-100   text-cyan-700",
  VISITING_FACULTY:     "bg-amber-100  text-amber-700",
  HOD:                  "bg-rose-100   text-rose-700",
};

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", password: "",
  employeeId: "", departmentId: "",
  designation: "ASSISTANT_PROFESSOR", employmentType: "FULL_TIME",
  qualification: "", specialization: "", researchInterests: "",
  experienceYears: 0, gender: "MALE",
  dateOfBirth: "", joiningDate: "", phone: "", officeRoom: "",
};

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
const disabledInputCls = inputCls + " disabled:bg-slate-50 disabled:text-slate-400";

// ─── Small helpers ────────────────────────────────────────────────────────────

const fmtDesignation = (d) =>
  d ? d.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

function DesignationBadge({ designation }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DESIGNATION_COLORS[designation] ?? "bg-slate-100 text-slate-600"}`}>
      {fmtDesignation(designation)}
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

// ─── Modal Shell ──────────────────────────────────────────────────────────────

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

// ─── Faculty Form ─────────────────────────────────────────────────────────────

function FacultyForm({ form, onChange, onSubmit, loading, isEdit, departments }) {
  const sf = (k, v) => onChange(k, v);
  return (
    <form onSubmit={onSubmit} className="space-y-5">

      {/* Account */}
      <div>
        <SectionTitle color="text-indigo-600">Account</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name">
            <input value={form.firstName} onChange={e => sf("firstName", e.target.value)}
              required className={inputCls} />
          </Field>
          <Field label="Last Name">
            <input value={form.lastName} onChange={e => sf("lastName", e.target.value)}
              required className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => sf("email", e.target.value)}
              required disabled={isEdit} className={disabledInputCls} />
          </Field>
          {!isEdit && (
            <Field label="Password">
              <input type="password" value={form.password}
                onChange={e => sf("password", e.target.value)}
                required minLength={8} className={inputCls} />
            </Field>
          )}
        </div>
      </div>

      {/* Professional */}
      <div>
        <SectionTitle color="text-violet-600">Professional</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee ID">
            <input value={form.employeeId} onChange={e => sf("employeeId", e.target.value)}
              required disabled={isEdit} className={disabledInputCls} placeholder="FAC2024001" />
          </Field>
          <Field label="Department">
            <select value={form.departmentId} onChange={e => sf("departmentId", e.target.value)}
              className={inputCls}>
              <option value="">— No Department —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Designation">
            <select value={form.designation} onChange={e => sf("designation", e.target.value)}
              className={inputCls}>
              {DESIGNATIONS.map(d => (
                <option key={d} value={d}>{fmtDesignation(d)}</option>
              ))}
            </select>
          </Field>
          <Field label="Employment Type">
            <select value={form.employmentType} onChange={e => sf("employmentType", e.target.value)}
              className={inputCls}>
              {EMPLOYMENT_TYPES.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Joining Date">
            <input type="date" value={form.joiningDate}
              onChange={e => sf("joiningDate", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Office / Room">
            <input value={form.officeRoom} onChange={e => sf("officeRoom", e.target.value)}
              placeholder="e.g. A-201" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Academic Background */}
      <div>
        <SectionTitle color="text-sky-600">Academic Background</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qualification">
            <input value={form.qualification} onChange={e => sf("qualification", e.target.value)}
              placeholder="e.g. Ph.D Computer Science" className={inputCls} />
          </Field>
          <Field label="Specialization">
            <input value={form.specialization} onChange={e => sf("specialization", e.target.value)}
              placeholder="e.g. Machine Learning" className={inputCls} />
          </Field>
          <Field label="Experience (Years)">
            <input type="number" value={form.experienceYears} min={0} max={60}
              onChange={e => sf("experienceYears", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={e => sf("gender", e.target.value)}
              className={inputCls}>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Research Interests">
              <textarea value={form.researchInterests}
                onChange={e => sf("researchInterests", e.target.value)}
                rows={2} placeholder="AI, Deep Learning, NLP..." className={inputCls} />
            </Field>
          </div>
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
        {loading && <Loader2 size={14} className="animate-spin" />}
        {isEdit ? "Save Changes" : "Add Faculty"}
      </button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FacultyPage() {
  const [faculty,     setFaculty]     = useState([]);
  const [meta,        setMeta]        = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  // Filters
  const [search,      setSearch]      = useState("");
  const [deptFilter,  setDeptFilter]  = useState("");
  const [desigFilter, setDesigFilter] = useState("");
  const searchTimer = useRef(null);

  // Modals
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editFaculty,   setEditFaculty]   = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Load departments once ──────────────────────────────────────────────────

  useEffect(() => {
    academicService.getDepartments()
      .then(d => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchFaculty = useCallback(async (
    page = 0, q = search, dept = deptFilter, desig = desigFilter
  ) => {
    setLoading(true);
    try {
      const data = await facultyService.getAll({
        page, search: q, departmentId: dept, designation: desig,
      });
      setFaculty(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Faculty load nahi hui"); }
    finally   { setLoading(false); }
  }, [search, deptFilter, desigFilter]);

  useEffect(() => { fetchFaculty(0); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchFaculty(0, val, deptFilter, desigFilter), 400);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openCreate = () => { setForm(EMPTY_FORM); setCreateOpen(true); };
  const openEdit   = (f) => {
    setForm({
      firstName: f.firstName, lastName: f.lastName,
      email: f.email, password: "",
      employeeId: f.employeeId,
      departmentId: f.departmentId ?? "",
      designation: f.designation,
      employmentType: f.employmentType,
      qualification: f.qualification ?? "",
      specialization: f.specialization ?? "",
      researchInterests: f.researchInterests ?? "",
      experienceYears: f.experienceYears ?? 0,
      gender: f.gender ?? "MALE",
      dateOfBirth: f.dateOfBirth?.slice(0, 10) ?? "",
      joiningDate: f.joiningDate?.slice(0, 10)  ?? "",
      phone: f.phone ?? "",
      officeRoom: f.officeRoom ?? "",
    });
    setEditFaculty(f);
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await facultyService.create({
        ...form,
        departmentId:     form.departmentId     || undefined,
        dateOfBirth:      form.dateOfBirth      || undefined,
        joiningDate:      form.joiningDate      || undefined,
        experienceYears:  Number(form.experienceYears),
      });
      toast.success("Faculty added!"); setCreateOpen(false); fetchFaculty(meta.number);
    } catch (err) { toast.error(err?.response?.data?.message ?? err?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await facultyService.update(editFaculty.id, {
        firstName:        form.firstName,
        lastName:         form.lastName,
        phone:            form.phone,
        departmentId:     form.departmentId     || undefined,
        designation:      form.designation,
        employmentType:   form.employmentType,
        qualification:    form.qualification    || undefined,
        specialization:   form.specialization   || undefined,
        researchInterests:form.researchInterests|| undefined,
        experienceYears:  Number(form.experienceYears),
        gender:           form.gender,
        dateOfBirth:      form.dateOfBirth      || undefined,
        joiningDate:      form.joiningDate      || undefined,
        officeRoom:       form.officeRoom       || undefined,
      });
      toast.success("Faculty updated!"); setEditFaculty(null); fetchFaculty(meta.number);
    } catch (err) { toast.error(err?.response?.data?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handleToggle = async (f) => {
    try {
      await facultyService.toggleActive(f.id);
      toast.success(`${f.firstName} ${f.active ? "deactivated" : "activated"}.`);
      fetchFaculty(meta.number);
    } catch { toast.error("Status change failed."); }
  };

  const handleDelete = async () => {
    try {
      await facultyService.delete(deleteTarget.id);
      toast.success("Faculty deleted."); setDeleteTarget(null); fetchFaculty(meta.number);
    } catch { toast.error("Delete failed."); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Faculty</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.totalElements} faculty members</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> Add Faculty
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, email, or employee ID…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); fetchFaculty(0, search, e.target.value, desigFilter); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={desigFilter}
          onChange={e => { setDesigFilter(e.target.value); fetchFaculty(0, search, deptFilter, e.target.value); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Designations</option>
          {DESIGNATIONS.map(d => <option key={d} value={d}>{fmtDesignation(d)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : faculty.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <GraduationCap size={32} className="opacity-30" />
            <p className="text-sm">No faculty members found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3">Exp.</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {faculty.map(f => (
                  <motion.tr key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{f.firstName} {f.lastName}</p>
                        <p className="text-xs text-slate-400">{f.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {f.employeeId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DesignationBadge designation={f.designation} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {f.departmentName ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[140px] truncate">
                      {f.specialization ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs text-center">
                      {f.experienceYears > 0 ? `${f.experienceYears}y` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${f.active ? "text-green-600" : "text-slate-400"}`}>
                        <span className={`h-2 w-2 rounded-full ${f.active ? "bg-green-500" : "bg-slate-300"}`} />
                        {f.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(f)} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleToggle(f)}
                          title={f.active ? "Deactivate" : "Activate"}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600">
                          {f.active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button onClick={() => setDeleteTarget(f)} title="Delete"
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
              <button onClick={() => fetchFaculty(meta.number - 1)} disabled={meta.number === 0}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => fetchFaculty(meta.number + 1)}
                disabled={meta.number >= meta.totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} title="Add Faculty Member" onClose={() => setCreateOpen(false)} wide>
        <FacultyForm form={form} onChange={sf} onSubmit={handleCreate}
          loading={saving} isEdit={false} departments={departments} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editFaculty} title="Edit Faculty Member" onClose={() => setEditFaculty(null)} wide>
        <FacultyForm form={form} onChange={sf} onSubmit={handleEdit}
          loading={saving} isEdit={true} departments={departments} />
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} title="Delete Faculty" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">{deleteTarget?.firstName} {deleteTarget?.lastName}</span> ({deleteTarget?.employeeId}) ko delete karna chahte ho? User account bhi remove ho jaayega.
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