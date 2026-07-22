import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarOff, X, Loader2, ChevronLeft, ChevronRight, Check, XCircle,
  Search, Clock, CheckCircle2, Ban,
} from "lucide-react";
import toast from "react-hot-toast";
import { leaveService, LEAVE_STATUS_CONFIG } from "../../services/leaveService";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

function StatusBadge({ status }) {
  const cfg = LEAVE_STATUS_CONFIG[status] ?? { label: status, emoji: "", color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-800 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
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

export default function LeaveRequestsPage() {
  const [leaves, setLeaves] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewDecision, setReviewDecision] = useState(null); // "APPROVED" | "REJECTED"
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLeaves = useCallback(async (page = 0, st = status, q = search) => {
    setLoading(true);
    try {
      const data = await leaveService.getAll({ page, status: st || undefined, search: q });
      setLeaves(data.content ?? []);
      setMeta({ totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Leave requests load nahi hue"); }
    finally { setLoading(false); }
  }, [status, search]);

  useEffect(() => {
    fetchLeaves(0);
    leaveService.getStats().then(setStats).catch(() => {});
  }, []);

  const handleStatusFilter = (val) => {
    setStatus(val);
    fetchLeaves(0, val, search);
  };

  const openReview = (leave, decision) => {
    setReviewTarget(leave);
    setReviewDecision(decision);
    setRemarks("");
  };

  const handleReview = async () => {
    setSaving(true);
    try {
      await leaveService.review(reviewTarget.id, { status: reviewDecision, remarks });
      toast.success(reviewDecision === "APPROVED" ? "Leave approved!" : "Leave rejected.");
      setReviewTarget(null);
      fetchLeaves(meta.number);
      leaveService.getStats().then(setStats).catch(() => {});
    } catch (err) {
      toast.error(err?.message ?? "Action failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <CalendarOff className="text-indigo-600" size={22} />
        <h1 className="text-xl font-semibold text-slate-800">Faculty Leave Requests</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">Review and approve/reject faculty leave applications.</p>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon={Clock} label="Pending" value={stats.pendingCount} color="bg-amber-50 text-amber-600" />
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approvedCount} color="bg-green-50 text-green-600" />
          <StatCard icon={Ban} label="Rejected" value={stats.rejectedCount} color="bg-red-50 text-red-600" />
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); fetchLeaves(0, status, e.target.value); }}
            placeholder="Search faculty name/ID..." className={`${inputCls} pl-9`} />
        </div>
        <select value={status} onChange={(e) => handleStatusFilter(e.target.value)} className={inputCls} style={{ maxWidth: 160 }}>
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <CalendarOff size={32} className="opacity-30" />
            <p className="text-sm">Koi leave request nahi mili.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="px-4 py-3">Faculty</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{l.facultyName}</p>
                    <p className="text-xs text-slate-400">{l.employeeId} • {l.departmentName}</p>
                  </td>
                  <td className="px-4 py-3">{l.leaveTypeEmoji} {l.leaveTypeDisplay}</td>
                  <td className="px-4 py-3 text-slate-600">{l.startDate} → {l.endDate}</td>
                  <td className="px-4 py-3 text-slate-500">{l.durationDays}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={l.reason}>{l.reason}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3">
                    {l.status === "PENDING" && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openReview(l, "APPROVED")}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-green-700 hover:bg-green-50">
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => openReview(l, "REJECTED")}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50">
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Page {meta.number + 1} of {meta.totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => fetchLeaves(meta.number - 1)} disabled={meta.number === 0}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => fetchLeaves(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!reviewTarget} title={reviewDecision === "APPROVED" ? "Approve Leave" : "Reject Leave"} onClose={() => setReviewTarget(null)}>
        <p className="text-sm text-slate-600 mb-3">
          {reviewDecision === "APPROVED" ? "Approve" : "Reject"} <b>{reviewTarget?.facultyName}</b>'s{" "}
          {reviewTarget?.leaveTypeDisplay?.toLowerCase()} request ({reviewTarget?.startDate} → {reviewTarget?.endDate})?
        </p>
        <label className="block text-xs font-medium text-slate-600 mb-1">Remarks (optional)</label>
        <textarea className={inputCls} rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={() => setReviewTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Cancel</button>
          <button onClick={handleReview} disabled={saving}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
              reviewDecision === "APPROVED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}>
            {saving ? "Saving..." : reviewDecision === "APPROVED" ? "Approve" : "Reject"}
          </button>
        </div>
      </Modal>
    </div>
  );
}