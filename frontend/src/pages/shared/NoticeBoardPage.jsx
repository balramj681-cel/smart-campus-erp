import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, ChevronLeft, ChevronRight, Eye, EyeOff,
  Loader2, Pin, PinOff, Plus, Search, Trash2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  noticeService, CATEGORY_CONFIG, VISIBILITY_CONFIG,
  CATEGORIES, VISIBILITIES,
} from "../../services/noticeService";
import { useAuth } from "../../hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

const EMPTY_FORM = {
  title: "", content: "",
  category: "GENERAL", visibility: "ALL",
  pinned: false, expiresAt: "",
};

const CAN_POST = ["ADMIN", "SUPER_ADMIN", "HOD", "FACULTY"];
const CAN_MANAGE = ["ADMIN", "SUPER_ADMIN"];

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

function CategoryBadge({ category }) {
  const cfg = CATEGORY_CONFIG[category];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span>{cfg.emoji}</span> {cfg.label}
    </span>
  );
}

function VisibilityBadge({ visibility }) {
  const cfg = VISIBILITY_CONFIG[visibility];
  if (!cfg) return null;
  return (
    <span className="text-xs text-slate-400">
      {cfg.icon} {cfg.label}
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

// ─── Notice Card ──────────────────────────────────────────────────────────────

function NoticeCard({ notice, canManage, canPin, onEdit, onDelete, onTogglePin, onToggleActive }) {
  const [expanded, setExpanded] = useState(false);
  const catCfg = CATEGORY_CONFIG[notice.category] ?? CATEGORY_CONFIG.GENERAL;
  const isLong = notice.content.length > 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "bg-white rounded-xl border-l-4 border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm",
        catCfg.border,
        !notice.active ? "opacity-60" : "",
        notice.expired ? "opacity-50" : "",
      ].join(" ")}>

      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {notice.pinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                <Pin size={10} /> Pinned
              </span>
            )}
            <CategoryBadge category={notice.category} />
            {!notice.active && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded-full">Inactive</span>
            )}
            {notice.expired && (
              <span className="px-2 py-0.5 bg-red-100 text-red-400 text-xs rounded-full">Expired</span>
            )}
          </div>

          {/* Actions */}
          {(canManage || canPin) && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {canPin && (
                <button onClick={() => onTogglePin(notice)}
                  className={`p-1.5 rounded-lg transition-colors ${notice.pinned ? "text-indigo-500 hover:bg-indigo-50" : "text-slate-400 hover:bg-slate-100"}`}
                  title={notice.pinned ? "Unpin" : "Pin"}>
                  {notice.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
              )}
              {canManage && (
                <>
                  <button onClick={() => onToggleActive(notice)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    title={notice.active ? "Deactivate" : "Activate"}>
                    {notice.active ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => onEdit(notice)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                    Edit
                  </button>
                  <button onClick={() => onDelete(notice)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-800 mt-2 leading-tight">
          {notice.title}
        </h3>

        {/* Content */}
        <div className="mt-2 text-sm text-slate-600 leading-relaxed">
          {isLong && !expanded
            ? (<>{notice.content.slice(0, 200)}<span className="text-slate-400">…</span></>)
            : notice.content}
          {isLong && (
            <button onClick={() => setExpanded(p => !p)}
              className="ml-2 text-xs text-indigo-600 hover:underline">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {notice.postedByName}
            <span className="text-slate-400 ml-1">({notice.postedByRole})</span>
          </span>
          <VisibilityBadge visibility={notice.visibility} />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {notice.expiresAt && (
            <span>Expires: {new Date(notice.expiresAt).toLocaleDateString("en-IN")}</span>
          )}
          <span>{timeAgo(notice.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create / Edit Form ───────────────────────────────────────────────────────

function NoticeForm({ form, onChange, onSubmit, loading, isEdit }) {
  const sf = (k, v) => onChange(k, v);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Title">
        <input value={form.title} onChange={e => sf("title", e.target.value)}
          required maxLength={200} placeholder="Notice ka title…" className={inputCls} />
      </Field>

      <Field label="Content">
        <textarea value={form.content} onChange={e => sf("content", e.target.value)}
          required rows={6} placeholder="Notice ka content likhein…"
          className={inputCls + " resize-none"} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select value={form.category} onChange={e => sf("category", e.target.value)} className={inputCls}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Visible To">
          <select value={form.visibility} onChange={e => sf("visibility", e.target.value)} className={inputCls}>
            {VISIBILITIES.map(v => (
              <option key={v} value={v}>
                {VISIBILITY_CONFIG[v].icon} {VISIBILITY_CONFIG[v].label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Expires On (optional)">
          <input type="date" value={form.expiresAt}
            onChange={e => sf("expiresAt", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Options">
          <label className="flex items-center gap-2 h-10 cursor-pointer">
            <input type="checkbox" checked={form.pinned}
              onChange={e => sf("pinned", e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-sm text-slate-600">📌 Pin this notice</span>
          </label>
        </Field>
      </div>

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
        {loading && <Loader2 size={14} className="animate-spin" />}
        {isEdit ? "Update Notice" : "Post Notice"}
      </button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NoticeBoardPage() {
  const { user } = useAuth();
  const role = (user?.role ?? "STUDENT").toUpperCase();
  const canPost   = CAN_POST.includes(role);
  const canManage = CAN_MANAGE.includes(role);
  const canPin    = CAN_MANAGE.includes(role);

  const [notices,  setNotices]  = useState([]);
  const [pinned,   setPinned]   = useState([]);
  const [meta,     setMeta]     = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("");
  const searchTimer = useRef(null);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editNotice, setEditNotice] = useState(null);
  const [viewNotice, setViewNotice] = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);

  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotices = useCallback(async (
    page = 0, q = search, cat = catFilter
  ) => {
    setLoading(true);
    try {
      const params = { page, size: 10 };
      if (q)   params.search   = q;
      if (cat) params.category = cat;
      const data = await noticeService.getAll(params);
      setNotices(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Notices load nahi hue"); }
    finally   { setLoading(false); }
  }, [search, catFilter]);

  const fetchPinned = async () => {
    try {
      const data = await noticeService.getPinned();
      setPinned(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => {
    fetchNotices(0);
    fetchPinned();
  }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchNotices(0, val, catFilter), 400);
  };

  const handleCatFilter = (val) => {
    setCatFilter(val);
    fetchNotices(0, search, val);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openCreate = () => { setForm(EMPTY_FORM); setCreateOpen(true); };
  const openEdit   = (n) => {
    setForm({
      title:      n.title,
      content:    n.content,
      category:   n.category,
      visibility: n.visibility,
      pinned:     n.pinned,
      expiresAt:  n.expiresAt ?? "",
    });
    setEditNotice(n);
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await noticeService.create({
        ...form,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success("Notice posted!");
      setCreateOpen(false);
      fetchNotices(0); fetchPinned();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await noticeService.update(editNotice.id, {
        ...form, expiresAt: form.expiresAt || undefined,
      });
      toast.success("Notice updated!");
      setEditNotice(null);
      fetchNotices(meta.number); fetchPinned();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handleTogglePin = async (notice) => {
    try {
      await noticeService.togglePin(notice.id);
      toast.success(notice.pinned ? "Unpinned." : "Pinned!");
      fetchNotices(meta.number); fetchPinned();
    } catch { toast.error("Failed."); }
  };

  const handleToggleActive = async (notice) => {
    try {
      await noticeService.toggleActive(notice.id);
      toast.success(notice.active ? "Deactivated." : "Activated!");
      fetchNotices(meta.number);
    } catch { toast.error("Failed."); }
  };

  const handleDelete = async () => {
    try {
      await noticeService.delete(deleteTarget.id);
      toast.success("Notice deleted.");
      setDeleteTarget(null);
      fetchNotices(meta.number); fetchPinned();
    } catch { toast.error("Delete failed."); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Notice Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {meta.totalElements} notices · Role-based visibility
          </p>
        </div>
        {canPost && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={15} /> Post Notice
          </button>
        )}
      </div>

      {/* Pinned Notices */}
      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
            <Pin size={12} /> Pinned Notices
          </p>
          {pinned.map(n => (
            <NoticeCard key={n.id} notice={n}
              canManage={canManage} canPin={canPin}
              onEdit={openEdit} onDelete={setDeleteTarget}
              onTogglePin={handleTogglePin} onToggleActive={handleToggleActive} />
          ))}
          <hr className="border-slate-200 mt-4" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search notices…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleCatFilter("")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${!catFilter ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
            All
          </button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => handleCatFilter(c === catFilter ? "" : c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${catFilter === c ? CATEGORY_CONFIG[c].color + " border-current" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
              {CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label}
            </button>
          ))}
        </div>
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <Bell size={32} className="opacity-30" />
          <p className="text-sm">Koi notice nahi mila.</p>
          {canPost && (
            <button onClick={openCreate}
              className="text-xs text-indigo-600 hover:underline">
              Post a notice
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notices.map(n => (
              <NoticeCard key={n.id} notice={n}
                canManage={canManage} canPin={canPin}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onTogglePin={handleTogglePin}
                onToggleActive={handleToggleActive}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {meta.number + 1} of {meta.totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => fetchNotices(meta.number - 1)} disabled={meta.number === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => fetchNotices(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} title="Post New Notice" wide onClose={() => setCreateOpen(false)}>
        <NoticeForm form={form} onChange={sf} onSubmit={handleCreate} loading={saving} isEdit={false} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editNotice} title="Edit Notice" wide onClose={() => setEditNotice(null)}>
        <NoticeForm form={form} onChange={sf} onSubmit={handleEdit} loading={saving} isEdit={true} />
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} title="Delete Notice" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">"{deleteTarget?.title}"</span> ko permanently delete karna chahte ho?
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