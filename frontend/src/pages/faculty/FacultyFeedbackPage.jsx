import { useEffect, useState } from "react";
import { Star, Loader2, Users, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { feedbackService } from "../../services/feedbackService";

function RatingBar({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-40">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 w-8">{value.toFixed(1)}</span>
    </div>
  );
}

function AssignmentCard({ item }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!open && comments === null) {
      setLoading(true);
      try {
        const data = await feedbackService.getForAssignment(item.assignmentId);
        setComments(Array.isArray(data) ? data : []);
      } catch { toast.error("Comments load nahi hue"); }
      finally { setLoading(false); }
    }
    setOpen(p => !p);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-3">
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-800">{item.subjectCode} — {item.subjectName}</p>
          <p className="text-xs text-slate-500 mt-0.5">Section {item.sectionName} · {item.totalResponses} responses</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
            <Star size={14} className="fill-amber-400 text-amber-400" /> {item.averageRating || "—"}
          </span>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">Abhi tak koi comment nahi.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <RatingBar label="Teaching" value={c.teachingQuality} />
                  <RatingBar label="Syllabus" value={c.syllabusCoverage} />
                  <RatingBar label="Communication" value={c.communicationSkills} />
                  <RatingBar label="Punctuality" value={c.punctuality} />
                </div>
                {c.comments && (
                  <p className="text-xs text-slate-600 italic flex items-start gap-1.5 pt-1">
                    <MessageSquare size={12} className="mt-0.5 flex-shrink-0" /> "{c.comments}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function FacultyFeedbackPage() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await feedbackService.getMySummary();
        setSummary(Array.isArray(data) ? data : []);
      } catch { toast.error("Feedback summary load nahi hui"); }
      finally { setLoading(false); }
    })();
  }, []);

  const overall = summary.length
    ? (summary.reduce((s, i) => s + i.averageRating, 0) / summary.length).toFixed(1)
    : "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My Feedback</h1>
        <p className="text-sm text-slate-500 mt-0.5">Students ki anonymous ratings — subject-wise</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
          <Star size={22} className="fill-amber-400 text-amber-400" />
          <div>
            <p className="text-lg font-semibold text-slate-800">{overall}</p>
            <p className="text-xs text-slate-500">Overall Rating</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
          <Users size={20} className="text-indigo-500" />
          <div>
            <p className="text-lg font-semibold text-slate-800">
              {summary.reduce((s, i) => s + i.totalResponses, 0)}
            </p>
            <p className="text-xs text-slate-500">Total Responses</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : summary.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Star size={28} className="opacity-30" />
          <p className="text-sm">Abhi tak koi feedback nahi mila.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summary.map(s => <AssignmentCard key={s.assignmentId} item={s} />)}
        </div>
      )}
    </div>
  );
}