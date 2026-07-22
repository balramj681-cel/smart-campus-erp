import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ChevronLeft, ChevronRight, Loader2, MessageSquareWarning,
  Plus, Search, Trash2, X, Clock, CheckCircle2, XCircle, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  grievanceService, CATEGORY_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG,
  CATEGORIES, PRIORITIES, STATUSES,
} from "../../services/grievanceService";
import { useAuth } from "../../hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

const EMPTY_FORM = {
  title: "", description: "",
  category: "ACADEMIC", priority: "MEDIUM", anonymous: false,
};

const CAN_MANAGE = ["ADMIN", "SUPER_ADMIN", "STAFF"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Badge({ config, value }) {
  const cfg = config[value];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span>{cfg.emoji}</span> {cfg.label}
    </span>
  );
}

function Modal({ open, title, wide, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
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

// ─── Stat Card (admin view) ─────────────────────────────────────────────────

function StatCard({ label, value, emoji }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-lg font-semibold text-slate-800">{value ?? 0}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Grievance Card ───────────────────────────────────────────────────────────

function GrievanceCard({ g, canManage, onManage, onDelete, canDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge config={STATUS_CONFIG} value={g.status} />
            <Badge config={PRIORITY_CONFIG} value={g.priority} />
            <Badge config={CATEGORY_CONFIG} value={g.category} />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {canManage && (
              <button onClick={() => onManage(g)}
                className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors">
                Manage
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(g)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-800 mt-2 leading-tight">{g.title}</h3>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{g.description}</p>

        {g.resolutionRemarks && (
          <div className="mt-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-0.5">Response:</p>
            <p className="text-sm text-slate-700">{g.resolutionRemarks}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          {g.anonymous ? "🕵️ Anonymous" : g.raisedByName}
          {g.assignedToName && <span className="text-slate-400 ml-2">→ {g.assignedToName}</span>}
        </span>
        <span className="text-xs text-slate-400">{timeAgo(g.createdAt)}</span>
      </div>
    </motion.div>
  );
}

// ─── Raise Grievance Form ───────────────────────────────────────────────────

function GrievanceForm({ form, onChange, onSubmit, loading }) {
  const sf = (k, v) => onChange(k, v);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Title">
        <input value={form.title} onChange={e => sf("title", e.target.value)}
          required maxLength={200} placeholder="Complaint ka title…" className={inputCls} />
      </Field>
      <Field label="Description">
        <textarea value={form.description} onChange={e => sf("description", e.target.value)}
          required rows={5} placeholder="Poora detail likhein…" className={inputCls + " resize-none"} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select value={form.category} onChange={e => sf("category", e.target.value)} className={inputCls}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority} onChange={e => sf("priority", e.target.value)} className={inputCls}>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].emoji} {PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.anonymous}
          onChange={e => sf("anonymous", e.target.checked)}
          className="w-4 h-4 rounded accent-indigo-500" />
        <span className="text-sm text-slate-600">🕵️ Submit anonymously</span>
      </label>
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Submit Grievance
      </button>
    </form>
  );
}

// ─── Manage Form (admin/staff) ───────────────────────────────────────────────

function ManageForm({ grievance, onSubmit, loading }) {
  const [status, setStatus] = useState(grievance.status);
  const [remarks, setRemarks] = useState(grievance.resolutionRemarks ?? "");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ status, resolutionRemarks: remarks }); }}
      className="space-y-4">
      <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
        <p className="text-sm font-semibold text-slate-800">{grievance.title}</p>
        <p className="text-xs text-slate-500 mt-1">{grievance.description}</p>
      </div>
      <Field label="Status">
        <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </Field>
      <Field label="Resolution Remarks">
        <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
          rows={4} placeholder="Response likhein…" className={inputCls + " resize-none"} />
      </Field>
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Update
      </button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GrievancePage() {
  const { user } = useAuth();
  const role = (user?.role ?? "STUDENT").toUpperCase();
  const canManage = CAN_MANAGE.includes(role);

  const [items,  setItems]  = useState([]);
  const [stats,  setStats]  = useState({});
  const [meta,   setMeta]   = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading,setLoading]= useState(true);

  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fetchItems = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const params = { page, size: 10 };
      if (search) params.search = search;
      if (canManage && statusFilter) params.status = statusFilter;

      const data = canManage
        ? await grievanceService.getAll(params)
        : await grievanceService.getMy(params);

      setItems(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Grievances load nahi hue"); }
    finally { setLoading(false); }
  }, [search, statusFilter, canManage]);

  const fetchStats = async () => {
    if (!canManage) return;
    try { setStats(await grievanceService.getStats()); } catch {}
  };

  useEffect(() => { fetchItems(0); fetchStats(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await grievanceService.create(form);
      toast.success("Grievance submitted!");
      setCreateOpen(false); setForm(EMPTY_FORM);
      fetchItems(0);
    } catch (err) { toast.error(err?.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleManage = async (payload) => {
    setSaving(true);
    try {
      await grievanceService.updateStatus(manageTarget.id, payload);
      toast.success("Grievance updated!");
      setManageTarget(null);
      fetchItems(meta.number); fetchStats();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await grievanceService.delete(deleteTarget.id);
      toast.success("Grievance withdrawn.");
      setDeleteTarget(null);
      fetchItems(meta.number); fetchStats();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Delete failed."); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            {canManage ? "Grievances" : "My Grievances"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {meta.totalElements} {canManage ? "complaints filed" : "raised by you"}
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={15} /> Raise Grievance
        </button>
      </div>

      {canManage && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Pending"     value={stats.PENDING}     emoji="⏳" />
          <StatCard label="In Progress" value={stats.IN_PROGRESS} emoji="🔄" />
          <StatCard label="Resolved"    value={stats.RESOLVED}    emoji="✅" />
          <StatCard label="Rejected"    value={stats.REJECTED}    emoji="❌" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search}
            onChange={e => { setSearch(e.target.value); }}
            onKeyDown={e => e.key === "Enter" && fetchItems(0)}
            placeholder="Search grievances…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setStatusFilter(""); fetchItems(0); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${!statusFilter ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>
              All
            </button>
            {STATUSES.map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); fetchItems(0); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${statusFilter === s ? STATUS_CONFIG[s].color + " border-current" : "bg-white text-slate-600 border-slate-200"}`}>
                {STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <MessageSquareWarning size={32} className="opacity-30" />
          <p className="text-sm">Koi grievance nahi mili.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map(g => (
              <GrievanceCard key={g.id} g={g}
                canManage={canManage}
                canDelete={!canManage && g.status === "PENDING"}
                onManage={setManageTarget}
                onDelete={setDeleteTarget} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {meta.number + 1} of {meta.totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => fetchItems(meta.number - 1)} disabled={meta.number === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => fetchItems(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <Modal open={createOpen} title="Raise a Grievance" wide onClose={() => setCreateOpen(false)}>
        <GrievanceForm form={form} onChange={sf} onSubmit={handleCreate} loading={saving} />
      </Modal>

      <Modal open={!!manageTarget} title="Manage Grievance" wide onClose={() => setManageTarget(null)}>
        {manageTarget && <ManageForm grievance={manageTarget} onSubmit={handleManage} loading={saving} />}
      </Modal>

      <Modal open={!!deleteTarget} title="Withdraw Grievance" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">"{deleteTarget?.title}"</span> ko withdraw karna chahte ho?
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleDelete}
            className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">
            Withdraw
          </button>
        </div>
      </Modal>
    </div>
  );
}