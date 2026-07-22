import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen, ChevronLeft, ChevronRight, Library, Loader2,
  Pencil, Plus, Search, Trash2, X, RotateCcw, AlertTriangle,
  BookCopy, BookX, Users2,
} from "lucide-react";
import toast from "react-hot-toast";
import { libraryService, ISSUE_STATUS_CONFIG } from "../../services/libraryService";
import { studentService } from "../../services/studentService";

// ─── Constants ──────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

const EMPTY_BOOK_FORM = {
  title: "", author: "", isbn: "", publisher: "", category: "",
  edition: "", publishedYear: "", rackNumber: "", description: "",
  totalCopies: 1, active: true,
};

const EMPTY_ISSUE_FORM = { bookId: "", studentId: "", loanDays: 14 };

// ─── Small helpers ────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = ISSUE_STATUS_CONFIG[status] ?? { label: status, emoji: "", color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function EmptyTable({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
      <Icon size={32} className="opacity-30" />
      <p className="text-sm">{text}</p>
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

function Pagination({ meta, onPage }) {
  if (meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">Page {meta.number + 1} of {meta.totalPages}</p>
      <div className="flex gap-1">
        <button onClick={() => onPage(meta.number - 1)} disabled={meta.number === 0}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
          <ChevronLeft size={14} />
        </button>
        <button onClick={() => onPage(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
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

// ─── Tab: Catalogue ─────────────────────────────────────────────────────────

function CatalogueTab() {
  const [books,   setBooks]   = useState([]);
  const [meta,    setMeta]    = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");
  const searchTimer = useRef(null);

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editBook,      setEditBook]     = useState(null);
  const [deleteTarget,  setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_BOOK_FORM);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchBooks = useCallback(async (page = 0, q = search) => {
    setLoading(true);
    try {
      const data = await libraryService.getBooks({ page, search: q });
      setBooks(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Books load nahi hue"); }
    finally   { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchBooks(0); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchBooks(0, val), 400);
  };

  const openCreate = () => { setForm(EMPTY_BOOK_FORM); setCreateOpen(true); };
  const openEdit = (b) => {
    setForm({
      title: b.title, author: b.author, isbn: b.isbn,
      publisher: b.publisher ?? "", category: b.category ?? "",
      edition: b.edition ?? "", publishedYear: b.publishedYear ?? "",
      rackNumber: b.rackNumber ?? "", description: b.description ?? "",
      totalCopies: b.totalCopies, active: b.active,
    });
    setEditBook(b);
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await libraryService.createBook({
        ...form, totalCopies: Number(form.totalCopies),
        publishedYear: form.publishedYear ? Number(form.publishedYear) : null,
      });
      toast.success("Book added!"); setCreateOpen(false); fetchBooks(meta.number);
    } catch (err) { toast.error(err?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await libraryService.updateBook(editBook.id, {
        ...form, totalCopies: Number(form.totalCopies),
        publishedYear: form.publishedYear ? Number(form.publishedYear) : null,
      });
      toast.success("Book updated!"); setEditBook(null); fetchBooks(meta.number);
    } catch (err) { toast.error(err?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await libraryService.deleteBook(deleteTarget.id);
      toast.success("Book deleted."); setDeleteTarget(null); fetchBooks(meta.number);
    } catch (err) { toast.error(err?.message ?? "Delete failed. Copies may be issued."); }
  };

  const handleToggleActive = async (b) => {
    try {
      await libraryService.toggleActive(b.id);
      toast.success(b.active ? "Book deactivated." : "Book activated.");
      fetchBooks(meta.number);
    } catch { toast.error("Action failed."); }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search title, author, ISBN..."
            className={`${inputCls} pl-9`} />
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          <Plus size={15} /> Add Book
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
        ) : books.length === 0 ? (
          <EmptyTable icon={BookOpen} text="No books found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">ISBN</th>
                <th className="px-4 py-3">Copies</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{b.title}</td>
                  <td className="px-4 py-3 text-slate-600">{b.author}</td>
                  <td className="px-4 py-3 text-slate-500">{b.isbn}</td>
                  <td className="px-4 py-3">
                    <span className={b.availableCopies > 0 ? "text-green-700" : "text-red-600"}>
                      {b.availableCopies}
                    </span>
                    <span className="text-slate-400"> / {b.totalCopies}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(b)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                      {b.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => fetchBooks(p)} />
      </div>

      {/* Create / Edit Modal */}
      <Modal open={createOpen || !!editBook} title={editBook ? "Edit Book" : "Add Book"}
        onClose={() => { setCreateOpen(false); setEditBook(null); }} wide>
        <form onSubmit={editBook ? handleEdit : handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title"><input required className={inputCls} value={form.title} onChange={e => sf("title", e.target.value)} /></Field>
            <Field label="Author"><input required className={inputCls} value={form.author} onChange={e => sf("author", e.target.value)} /></Field>
            <Field label="ISBN"><input required className={inputCls} value={form.isbn} onChange={e => sf("isbn", e.target.value)} /></Field>
            <Field label="Publisher"><input className={inputCls} value={form.publisher} onChange={e => sf("publisher", e.target.value)} /></Field>
            <Field label="Category"><input className={inputCls} value={form.category} onChange={e => sf("category", e.target.value)} placeholder="e.g. Computer Science" /></Field>
            <Field label="Edition"><input className={inputCls} value={form.edition} onChange={e => sf("edition", e.target.value)} /></Field>
            <Field label="Published Year"><input type="number" className={inputCls} value={form.publishedYear} onChange={e => sf("publishedYear", e.target.value)} /></Field>
            <Field label="Rack Number"><input className={inputCls} value={form.rackNumber} onChange={e => sf("rackNumber", e.target.value)} /></Field>
            <Field label="Total Copies">
              <input type="number" min={editBook ? 0 : 1} required className={inputCls}
                value={form.totalCopies} onChange={e => sf("totalCopies", e.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className={inputCls} rows={3} value={form.description} onChange={e => sf("description", e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setCreateOpen(false); setEditBook(null); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving..." : editBook ? "Update Book" : "Add Book"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} title="Delete Book" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-4">
          Are you sure you want to delete <b>{deleteTarget?.title}</b>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: Issue / Return ────────────────────────────────────────────────────

function IssuesTab() {
  const [issues,  setIssues]  = useState([]);
  const [meta,    setMeta]    = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState("");
  const searchTimer = useRef(null);

  const [issueOpen, setIssueOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_ISSUE_FORM);
  const [bookOptions,    setBookOptions]    = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [lostTarget, setLostTarget] = useState(null);
  const [lostRemarks, setLostRemarks] = useState("");

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchIssues = useCallback(async (page = 0, q = search, st = status) => {
    setLoading(true);
    try {
      const data = await libraryService.getIssues({ page, search: q, status: st || undefined });
      setIssues(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Issue records load nahi hue"); }
    finally   { setLoading(false); }
  }, [search, status]);

  useEffect(() => { fetchIssues(0); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchIssues(0, val, status), 400);
  };

  const openIssueModal = async () => {
    setForm(EMPTY_ISSUE_FORM);
    setIssueOpen(true);
    try {
      const [booksData, studentsData] = await Promise.all([
        libraryService.getBooks({ page: 0, size: 100, active: true }),
        studentService.getAll({ page: 0, size: 100 }),
      ]);
      setBookOptions((booksData.content ?? []).filter(b => b.available));
      setStudentOptions(studentsData.content ?? []);
    } catch { toast.error("Options load nahi hue"); }
  };

  const handleIssue = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await libraryService.issueBook({
        bookId: form.bookId, studentId: form.studentId,
        loanDays: Number(form.loanDays) || 14,
      });
      toast.success("Book issued!"); setIssueOpen(false); fetchIssues(0);
    } catch (err) { toast.error(err?.message ?? "Issue failed"); }
    finally { setSaving(false); }
  };

  const handleReturn = async (record) => {
    try {
      await libraryService.returnBook(record.id);
      toast.success("Book returned!"); fetchIssues(meta.number);
    } catch (err) { toast.error(err?.message ?? "Return failed"); }
  };

  const handleMarkLost = async () => {
    try {
      await libraryService.markLost(lostTarget.id, lostRemarks);
      toast.success("Marked as lost."); setLostTarget(null); setLostRemarks(""); fetchIssues(meta.number);
    } catch (err) { toast.error(err?.message ?? "Action failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search book, student..."
              className={`${inputCls} pl-9`} />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); fetchIssues(0, search, e.target.value); }}
            className={inputCls} style={{ maxWidth: 160 }}>
            <option value="">All Status</option>
            <option value="ISSUED">Issued</option>
            <option value="RETURNED">Returned</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
        <button onClick={openIssueModal}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          <Plus size={15} /> Issue Book
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
        ) : issues.length === 0 ? (
          <EmptyTable icon={Users2} text="No issue records found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fine</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.bookTitle}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.studentName}
                    <span className="block text-xs text-slate-400">{r.studentEnrollmentNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.issueDate}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.dueDate}
                    {r.overdue && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.overdue ? "OVERDUE" : r.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.fineAmount > 0 ? `₹${r.fineAmount}` : "—"}</td>
                  <td className="px-4 py-3">
                    {r.status === "ISSUED" && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleReturn(r)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-green-700 hover:bg-green-50">
                          <RotateCcw size={13} /> Return
                        </button>
                        <button onClick={() => setLostTarget(r)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50">
                          <BookX size={13} /> Lost
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => fetchIssues(p)} />
      </div>

      {/* Issue modal */}
      <Modal open={issueOpen} title="Issue Book" onClose={() => setIssueOpen(false)}>
        <form onSubmit={handleIssue} className="space-y-4">
          <Field label="Book">
            <select required className={inputCls} value={form.bookId} onChange={e => sf("bookId", e.target.value)}>
              <option value="">Select a book...</option>
              {bookOptions.map(b => (
                <option key={b.id} value={b.id}>{b.title} ({b.availableCopies} available)</option>
              ))}
            </select>
          </Field>
          <Field label="Student">
            <select required className={inputCls} value={form.studentId} onChange={e => sf("studentId", e.target.value)}>
              <option value="">Select a student...</option>
              {studentOptions.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.enrollmentNumber})</option>
              ))}
            </select>
          </Field>
          <Field label="Loan Period (days)">
            <input type="number" min={1} className={inputCls} value={form.loanDays} onChange={e => sf("loanDays", e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIssueOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Issuing..." : "Issue Book"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mark lost modal */}
      <Modal open={!!lostTarget} title="Mark Book as Lost" onClose={() => setLostTarget(null)}>
        <p className="text-sm text-slate-600 mb-3">
          Mark <b>{lostTarget?.bookTitle}</b> (issued to {lostTarget?.studentName}) as lost?
        </p>
        <Field label="Remarks (optional)">
          <textarea className={inputCls} rows={3} value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={() => setLostTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Cancel</button>
          <button onClick={handleMarkLost} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Mark Lost</button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [tab, setTab] = useState("catalogue");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    libraryService.getStats().then(setStats).catch(() => {});
  }, [tab]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Library className="text-indigo-600" size={22} />
        <h1 className="text-xl font-semibold text-slate-800">Library Management</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">Manage the book catalogue and track issue/return activity.</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={BookOpen} label="Total Titles" value={stats.totalBooks} color="bg-indigo-50 text-indigo-600" />
          <StatCard icon={BookCopy} label="Available Copies" value={stats.availableCopies} color="bg-green-50 text-green-600" />
          <StatCard icon={Users2}   label="Active Issues" value={stats.activeIssues} color="bg-blue-50 text-blue-600" />
          <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdueIssues} color="bg-red-50 text-red-600" />
        </div>
      )}

      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { id: "catalogue", label: "Catalogue" },
          { id: "issues",    label: "Issue / Return" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "catalogue" ? <CatalogueTab /> : <IssuesTab />}
    </div>
  );
}