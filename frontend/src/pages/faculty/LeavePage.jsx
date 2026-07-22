import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarOff, Plus, X, Loader2, ChevronLeft, ChevronRight, Ban } from "lucide-react";
import toast from "react-hot-toast";
import { leaveService, LEAVE_TYPE_CONFIG, LEAVE_STATUS_CONFIG } from "../../services/leaveService";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

const EMPTY_FORM = { leaveType: "CASUAL", startDate: "", endDate: "", reason: "" };

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
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
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl">
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
  const cfg = LEAVE_STATUS_CONFIG[status] ?? { label: status, emoji: "", color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function ApplyLeaveModal({ open, onClose, onApplied }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(EMPTY_FORM); }, [open]);

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await leaveService.apply(form);
      toast.success("Leave request submitted!");
      onApplied();
      onClose();
    } catch (err) {
      toast.error(err?.message ?? "Leave apply nahi hua");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Apply for Leave" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Leave Type">
          <select className={inputCls} value={form.leaveType} onChange={(e) => sf("leaveType", e.target.value)}>
            {Object.entries(LEAVE_TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date">
            <input required type="date" className={inputCls} value={form.startDate}
              onChange={(e) => sf("startDate", e.target.value)} />
          </Field>
          <Field label="End Date">
            <input required type="date" className={inputCls} value={form.endDate}
              onChange={(e) => sf("endDate", e.target.value)} />
          </Field>
        </div>
        <Field label="Reason">
          <textarea required rows={3} className={inputCls} value={form.reason}
            onChange={(e) => sf("reason", e.target.value)} placeholder="Briefly explain the reason for leave..." />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function LeavePage() {
  const [leaves, setLeaves] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);

  const fetchLeaves = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const data = await leaveService.getMyLeaves({ page });
      setLeaves(data.content ?? []);
      setMeta({ totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Leave requests load nahi hue"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeaves(0); }, [fetchLeaves]);

  const handleCancel = async (id) => {
    try {
      await leaveService.cancel(id);
      toast.success("Leave request cancelled.");
      fetchLeaves(meta.number);
    } catch (err) {
      toast.error(err?.message ?? "Cancel nahi hua");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CalendarOff className="text-indigo-600" size={22} />
          <h1 className="text-xl font-semibold text-slate-800">My Leaves</h1>
        </div>
        <button onClick={() => setApplyOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          <Plus size={15} /> Apply for Leave
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Apply for leave and track approval status.</p>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <CalendarOff size={32} className="opacity-30" />
            <p className="text-sm">Aapne abhi tak koi leave apply nahi ki.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3">{l.leaveTypeEmoji} {l.leaveTypeDisplay}</td>
                  <td className="px-4 py-3 text-slate-600">{l.startDate} → {l.endDate}</td>
                  <td className="px-4 py-3 text-slate-500">{l.durationDays}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={l.reason}>{l.reason}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{l.reviewRemarks || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {l.status === "PENDING" && (
                      <button onClick={() => handleCancel(l.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 ml-auto">
                        <Ban size={12} /> Cancel
                      </button>
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

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} onApplied={() => fetchLeaves(0)} />
    </div>
  );
}