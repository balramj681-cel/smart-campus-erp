import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, Loader2, AlertTriangle, Download, CheckCircle2, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { courseworkService, SUBMISSION_STATUS_CONFIG } from "../../services/courseworkService";
import { currentAcademicYear } from "../../services/attendanceService";

function StatusBadge({ status }) {
  const cfg = SUBMISSION_STATUS_CONFIG[status] ?? { label: status, emoji: "", color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function AssignmentCard({ assignment, onSubmitted }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await courseworkService.submit(assignment.id, file);
      toast.success("Submitted!");
      onSubmitted();
    } catch (err) {
      toast.error(err?.message ?? "Submission fail hui");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const status = assignment.mySubmissionStatus;
  const canSubmit = assignment.active && (!status || (status !== "GRADED"));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{assignment.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{assignment.subjectName}</p>
        </div>
        {status && <StatusBadge status={status} />}
      </div>

      {assignment.description && (
        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{assignment.description}</p>
      )}

      {assignment.hasAttachment && (
        <button
          onClick={() => courseworkService.downloadAssignmentAttachment(assignment.id, assignment.attachmentFileName)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-2"
        >
          <Paperclip size={11} /> {assignment.attachmentFileName}
        </button>
      )}

      <p className="text-xs text-slate-500 mt-2">
        Due: {new Date(assignment.dueDate).toLocaleString()}
        {assignment.pastDue && !status && (
          <span className="ml-1 text-red-500 inline-flex items-center gap-0.5">
            <AlertTriangle size={11} /> Overdue
          </span>
        )}
        {assignment.maxMarks != null && <span className="ml-2 text-slate-400">• {assignment.maxMarks} marks</span>}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {canSubmit && (
          <>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {status ? "Resubmit" : "Submit File"}
            </button>
          </>
        )}
        {status === "GRADED" && (
          <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
            <CheckCircle2 size={13} /> Graded
          </span>
        )}
        {!assignment.active && !status && (
          <span className="text-xs text-slate-400">Submissions closed</span>
        )}
      </div>
    </div>
  );
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const academicYear = currentAcademicYear();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assignData, subsData] = await Promise.all([
        courseworkService.getMyAssignments(academicYear),
        courseworkService.getMySubmissions(),
      ]);
      setAssignments(assignData ?? []);
      setMySubmissions(subsData ?? []);
    } catch {
      toast.error("Assignments load nahi hue");
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const gradedSubmissions = mySubmissions.filter((s) => s.status === "GRADED");

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="text-indigo-600" size={22} />
          <h1 className="text-xl font-semibold text-slate-800">My Assignments</h1>
        </div>
        <p className="text-sm text-slate-500">Coursework tasks for your section, and where to submit them.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <FileText size={32} className="opacity-30" />
          <p className="text-sm">Abhi koi assignment nahi hai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} onSubmitted={fetchAll} />
          ))}
        </div>
      )}

      {gradedSubmissions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Grades & Feedback</h2>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                  <th className="px-4 py-3">Assignment</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">Feedback</th>
                  <th className="px-4 py-3 text-right">File</th>
                </tr>
              </thead>
              <tbody>
                {gradedSubmissions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.assignmentTitle}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.marksObtained}{s.maxMarks ? ` / ${s.maxMarks}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.feedback || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => courseworkService.downloadSubmission(s.id, s.originalFileName)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}