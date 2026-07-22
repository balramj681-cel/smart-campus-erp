import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText, Plus, X, Loader2, Users2, Download, Pencil,
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Trash2, Paperclip,
} from "lucide-react";
import toast from "react-hot-toast";
import { courseworkService, SUBMISSION_STATUS_CONFIG } from "../../services/courseworkService";
import { currentAcademicYear } from "../../services/attendanceService";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

const EMPTY_FORM = { subjectId: "", sectionId: "", title: "", description: "", dueDate: "", maxMarks: "" };

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

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
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function StatusBadge({ status }) {
  const cfg = SUBMISSION_STATUS_CONFIG[status] ?? { label: status, emoji: "", color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ─── Create/Edit Assignment Modal ──────────────────────────────────────────

function AssignmentFormModal({ open, onClose, onSaved, teachingLoad, academicYear }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(EMPTY_FORM); setFile(null); } }, [open]);

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Unique subject list + sections available for the chosen subject
  const subjectOptions = [...new Map(teachingLoad.map((t) => [t.subjectId, t])).values()];
  const sectionOptions = teachingLoad.filter((t) => t.subjectId === form.subjectId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sectionId) { toast.error("Section select karo"); return; }
    setSaving(true);
    try {
      await courseworkService.createAssignment({
        subjectId: form.subjectId,
        sectionId: form.sectionId,
        title: form.title,
        description: form.description,
        dueDate: new Date(form.dueDate).toISOString(),
        maxMarks: form.maxMarks ? Number(form.maxMarks) : null,
        academicYear,
      }, file);
      toast.success("Assignment created!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.message ?? "Assignment create nahi hua");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="New Assignment" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Subject">
            <select required className={inputCls} value={form.subjectId}
              onChange={(e) => { sf("subjectId", e.target.value); sf("sectionId", ""); }}>
              <option value="">Select subject...</option>
              {subjectOptions.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>{s.subjectCode} — {s.subjectName}</option>
              ))}
            </select>
          </Field>
          <Field label="Section">
            <select required className={inputCls} value={form.sectionId} disabled={!form.subjectId}
              onChange={(e) => sf("sectionId", e.target.value)}>
              <option value="">Select section...</option>
              {sectionOptions.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>Section {s.sectionName}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Title">
          <input required className={inputCls} value={form.title} onChange={(e) => sf("title", e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => sf("description", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Due Date & Time">
            <input required type="datetime-local" className={inputCls} value={form.dueDate}
              onChange={(e) => sf("dueDate", e.target.value)} />
          </Field>
          <Field label="Max Marks (optional)">
            <input type="number" min={0} className={inputCls} value={form.maxMarks}
              onChange={(e) => sf("maxMarks", e.target.value)} />
          </Field>
        </div>
        <Field label="Question Paper / Instructions (optional)">
          <input type="file" className={inputCls}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Creating..." : "Create Assignment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Submissions Modal (grading) ───────────────────────────────────────────

function SubmissionsModal({ assignment, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courseworkService.getSubmissionsForAssignment(assignment.id);
      setSubmissions(data ?? []);
    } catch { toast.error("Submissions load nahi hue"); }
    finally { setLoading(false); }
  }, [assignment.id]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const openGrade = (s) => {
    setGradingId(s.id);
    setMarks(s.marksObtained ?? "");
    setFeedback(s.feedback ?? "");
  };

  const handleGrade = async (id) => {
    if (marks === "") { toast.error("Marks daalo"); return; }
    setSaving(true);
    try {
      await courseworkService.gradeSubmission(id, { marksObtained: Number(marks), feedback });
      toast.success("Graded!");
      setGradingId(null);
      fetchSubmissions();
    } catch (err) {
      toast.error(err?.message ?? "Grading fail hui");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={`Submissions — ${assignment.title}`} onClose={onClose} wide>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={22} /></div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
          <Users2 size={28} className="opacity-30" />
          <p className="text-sm">Abhi tak koi submission nahi aayi.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {submissions.map((s) => (
            <div key={s.id} className="border border-slate-100 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.studentName}</p>
                  <p className="text-xs text-slate-400">{s.enrollmentNumber} • {s.originalFileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <button onClick={() => courseworkService.downloadSubmission(s.id, s.originalFileName)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Download">
                    <Download size={14} />
                  </button>
                </div>
              </div>

              {gradingId === s.id ? (
                <div className="mt-3 space-y-2 bg-slate-50 rounded-lg p-3">
                  <div className="flex gap-2">
                    <input type="number" min={0} max={assignment.maxMarks ?? undefined}
                      placeholder={`Marks${assignment.maxMarks ? ` / ${assignment.maxMarks}` : ""}`}
                      className={inputCls} value={marks} onChange={(e) => setMarks(e.target.value)} />
                  </div>
                  <textarea placeholder="Feedback (optional)" rows={2} className={inputCls}
                    value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setGradingId(null)} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-200">Cancel</button>
                    <button onClick={() => handleGrade(s.id)} disabled={saving}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                      {saving ? "Saving..." : "Submit Grade"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {s.marksObtained != null
                      ? `Marks: ${s.marksObtained}${assignment.maxMarks ? `/${assignment.maxMarks}` : ""}`
                      : "Not graded yet"}
                  </p>
                  <button onClick={() => openGrade(s)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-50">
                    <Pencil size={12} /> {s.marksObtained != null ? "Re-grade" : "Grade"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [teachingLoad, setTeachingLoad] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingSubmissions, setViewingSubmissions] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const academicYear = currentAcademicYear();

  const fetchAssignments = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const data = await courseworkService.getMyCreatedAssignments({ page, academicYear });
      setAssignments(data.content ?? []);
      setMeta({ totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Assignments load nahi hue"); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => {
    fetchAssignments(0);
    courseworkService.getMyTeachingLoad(academicYear).then(setTeachingLoad).catch(() => {});
  }, [fetchAssignments, academicYear]);

  const handleToggleActive = async (a) => {
    try {
      await courseworkService.toggleActive(a.id);
      fetchAssignments(meta.number);
    } catch { toast.error("Action failed"); }
  };

  const handleDelete = async () => {
    try {
      await courseworkService.deleteAssignment(deleteTarget.id);
      toast.success("Assignment deleted.");
      setDeleteTarget(null);
      fetchAssignments(meta.number);
    } catch (err) {
      toast.error(err?.message ?? "Delete failed — submissions already exist");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <FileText className="text-indigo-600" size={22} />
          <h1 className="text-xl font-semibold text-slate-800">Assignments</h1>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          <Plus size={15} /> New Assignment
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Create coursework tasks and grade student submissions.</p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <FileText size={32} className="opacity-30" />
          <p className="text-sm">Koi assignment nahi bana abhi tak.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{a.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{a.subjectName} • Section {a.sectionName}</p>
                </div>
                <button onClick={() => handleToggleActive(a)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                  {a.active ? "Active" : "Closed"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Due: {new Date(a.dueDate).toLocaleString()}
                {a.pastDue && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
              </p>
              {a.hasAttachment && (
                <button
                  onClick={() => courseworkService.downloadAssignmentAttachment(a.id, a.attachmentFileName)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1"
                >
                  <Paperclip size={11} /> {a.attachmentFileName}
                </button>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Users2 size={12} /> {a.submissionCount} submission{a.submissionCount === 1 ? "" : "s"}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setViewingSubmissions(a)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-700 rounded-lg hover:bg-indigo-50">
                    View Submissions
                  </button>
                  <button onClick={() => setDeleteTarget(a)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          <button onClick={() => fetchAssignments(meta.number - 1)} disabled={meta.number === 0}
            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={14} /></button>
          <button onClick={() => fetchAssignments(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      )}

      <AssignmentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => fetchAssignments(0)}
        teachingLoad={teachingLoad}
        academicYear={academicYear}
      />

      {viewingSubmissions && (
        <SubmissionsModal assignment={viewingSubmissions} onClose={() => setViewingSubmissions(null)} />
      )}

      <Modal open={!!deleteTarget} title="Delete Assignment" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-4">
          Are you sure you want to delete <b>{deleteTarget?.title}</b>?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
        </div>
      </Modal>
    </div>
  );
}