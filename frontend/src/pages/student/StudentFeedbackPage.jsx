import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star, Loader2, MessageSquareHeart, CheckCircle2, X } from "lucide-react";
import toast from "react-hot-toast";
import { feedbackService } from "../../services/feedbackService";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

const RATING_FIELDS = [
  { key: "teachingQuality",     label: "Teaching Quality" },
  { key: "syllabusCoverage",    label: "Syllabus Coverage" },
  { key: "communicationSkills", label: "Communication Skills" },
  { key: "punctuality",         label: "Punctuality" },
];

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <Star size={22}
            className={(hover || value) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
        </button>
      ))}
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
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

export default function StudentFeedbackPage() {
  const [pending,   setPending]   = useState([]);
  const [submitted, setSubmitted] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [target,    setTarget]    = useState(null);
  const [ratings,   setRatings]   = useState({ teachingQuality: 0, syllabusCoverage: 0, communicationSkills: 0, punctuality: 0 });
  const [comments,  setComments]  = useState("");
  const [saving,    setSaving]    = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        feedbackService.getPending(),
        feedbackService.getMySubmitted(),
      ]);
      setPending(Array.isArray(p) ? p : []);
      setSubmitted(Array.isArray(s) ? s : []);
    } catch { toast.error("Feedback data load nahi hui"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openRate = (item) => {
    setTarget(item);
    setRatings({ teachingQuality: 0, syllabusCoverage: 0, communicationSkills: 0, punctuality: 0 });
    setComments("");
  };

  const allRated = RATING_FIELDS.every(f => ratings[f.key] > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allRated) { toast.error("Sabhi categories rate karein"); return; }
    setSaving(true);
    try {
      await feedbackService.submit({
        assignmentId: target.assignmentId,
        ...ratings,
        comments,
      });
      toast.success("Feedback submit ho gaya!");
      setTarget(null);
      fetchAll();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Submit failed"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Course Feedback</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Apne faculty ko anonymously rate karein — ye unki teaching improve karne mein madad karega.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <CheckCircle2 size={28} className="opacity-40" />
          <p className="text-sm">Sabhi subjects rate ho chuke hain. Shukriya!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            Pending ({pending.length})
          </p>
          {pending.map(p => (
            <div key={p.assignmentId}
              className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{p.subjectCode} — {p.subjectName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.facultyName} · Section {p.sectionName}</p>
              </div>
              <button onClick={() => openRate(p)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
                <MessageSquareHeart size={13} /> Rate
              </button>
            </div>
          ))}
        </div>
      )}

      {submitted.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Submitted ({submitted.length})
          </p>
          {submitted.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{s.subjectCode} — {s.subjectName}</p>
                <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                  <Star size={14} className="fill-amber-400 text-amber-400" /> {s.overallRating}
                </span>
              </div>
              {s.comments && <p className="text-xs text-slate-500 mt-1.5">"{s.comments}"</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!target} title={target ? `Rate: ${target.subjectName}` : ""} onClose={() => setTarget(null)}>
        {target && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {RATING_FIELDS.map(f => (
              <div key={f.key} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{f.label}</span>
                <StarInput value={ratings[f.key]} onChange={v => setRatings(p => ({ ...p, [f.key]: v }))} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Comments (optional)</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)}
                rows={3} placeholder="Koi additional feedback…" className={inputCls + " resize-none"} />
            </div>
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Submit Feedback
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}