import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, CreditCard, Loader2,
  Plus, Receipt, Trash2, X, IndianRupee, CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  feeService, FEE_STATUS_CONFIG, PAYMENT_MODES, FEE_CATEGORIES, currentAcademicYear,
} from "../../services/feeService";
import { academicService } from "../../services/academicService";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

const BATCHES = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);

const inputCls    = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
const disabledCls = inputCls + " disabled:bg-slate-50 disabled:text-slate-400";

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = FEE_STATUS_CONFIG[status] ?? FEE_STATUS_CONFIG.PENDING;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, color = "bg-white" }) {
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${color}`}>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
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

// ─── Tab 1: Fee Structures ────────────────────────────────────────────────────

function StructuresTab() {
  const [structures,  setStructures]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [assignModal, setAssignModal] = useState(null); // structure object

  // Programs for dropdown
  const [programs, setPrograms] = useState([]);

  // Create form
  const [form, setForm] = useState({
    name: "", programId: "", batch: new Date().getFullYear(),
    academicYear: currentAcademicYear(),
    items: [{ category: "TUITION", amount: "", dueDate: "", description: "" }],
  });
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    loadStructures();
    // Load all programs for the create modal
    academicService.getDepartments().then(async (depts) => {
      const arr = Array.isArray(depts) ? depts : [];
      const allProgs = [];
      for (const d of arr) {
        const progs = await academicService.getPrograms(d.id).then(p => Array.isArray(p) ? p : []);
        allProgs.push(...progs.map(p => ({ ...p, deptName: d.name })));
      }
      setPrograms(allProgs);
    }).catch(() => {});
  }, []);

  const loadStructures = async () => {
    setLoading(true);
    try {
      const data = await feeService.getStructures();
      setStructures(Array.isArray(data) ? data : []);
    } catch { toast.error("Structures load nahi hui"); }
    finally   { setLoading(false); }
  };

  const addItem = () => setForm(p => ({
    ...p, items: [...p.items, { category: "TUITION", amount: "", dueDate: "", description: "" }],
  }));
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, k, v) => setForm(p => ({
    ...p, items: p.items.map((item, i) => i === idx ? { ...item, [k]: v } : item),
  }));

  const totalAmount = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const handleCreate = async () => {
    if (!form.programId) return toast.error("Program select karo");
    if (form.items.some(i => !i.amount || Number(i.amount) <= 0))
      return toast.error("Sab items ka amount dalo");
    setSaving(true);
    try {
      await feeService.createStructure({
        name: form.name, programId: form.programId,
        batch: Number(form.batch), academicYear: form.academicYear,
        items: form.items.map(i => ({
          category: i.category, amount: Number(i.amount),
          dueDate: i.dueDate || undefined,
          description: i.description || undefined,
        })),
      });
      toast.success("Fee structure created!");
      setCreateOpen(false);
      loadStructures();
    } catch (err) { toast.error(err?.response?.data?.message ?? err?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete karna chahte ho?")) return;
    try { await feeService.deleteStructure(id); toast.success("Deleted!"); loadStructures(); }
    catch { toast.error("Delete failed."); }
  };

  const handleAssign = async (structureId, studentId = null) => {
    try {
      const res = await feeService.assignFee({ feeStructureId: structureId, studentId });
      toast.success(res.message ?? "Fee assigned!");
      setAssignModal(null);
      loadStructures();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Assignment failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{structures.length} fee structures</p>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
          <Plus size={15} /> Create Structure
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40 text-slate-400"><Loader2 size={24} className="animate-spin"/></div>
      ) : structures.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
          <CreditCard size={28} className="opacity-30"/>
          <p className="text-sm">Koi fee structure nahi mila.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {structures.map(s => (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s.programName} · Batch {s.batch} · {s.academicYear}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAssignModal(s)}
                    className="px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg">
                    Assign to Students
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-0 divide-x divide-slate-100">
                {[
                  { label: "Total Fee",    value: fmt(s.totalAmount) },
                  { label: "Students",     value: s.totalStudents },
                  { label: "Paid",         value: s.paidCount },
                  { label: "Pending",      value: s.pendingCount },
                  { label: "Collected",    value: fmt(s.collectedAmount) },
                ].map(stat => (
                  <div key={stat.label} className="px-4 py-3 text-center">
                    <p className="text-base font-bold text-slate-700">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Fee items */}
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {s.items.map(item => (
                  <span key={item.id} className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg">
                    {item.categoryDisplay}: <b>{fmt(item.amount)}</b>
                    {item.dueDate && <span className="text-slate-400 ml-1">(Due: {new Date(item.dueDate).toLocaleDateString("en-IN")})</span>}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Structure Modal */}
      <Modal open={createOpen} title="Create Fee Structure" wide onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Structure Name">
                <input value={form.name} onChange={e => sf("name", e.target.value)} required
                  placeholder="e.g. B.Tech CSE 2024 Annual Fee" className={inputCls}/>
              </Field>
            </div>
            <Field label="Program">
              <select value={form.programId} onChange={e => sf("programId", e.target.value)} className={inputCls}>
                <option value="">— Select Program —</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.deptName})</option>)}
              </select>
            </Field>
            <Field label="Batch Year">
              <select value={form.batch} onChange={e => sf("batch", e.target.value)} className={inputCls}>
                {BATCHES.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Academic Year">
              <select value={form.academicYear} onChange={e => sf("academicYear", e.target.value)} className={inputCls}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>

          {/* Fee Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                Fee Items
              </p>
              <button onClick={addItem}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                <Plus size={12}/> Add Item
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <select value={item.category} onChange={e => updateItem(idx, "category", e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none">
                      {FEE_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={item.amount} min={1}
                      onChange={e => updateItem(idx, "amount", e.target.value)}
                      placeholder="Amount" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"/>
                  </div>
                  <div className="col-span-3">
                    <input type="date" value={item.dueDate}
                      onChange={e => updateItem(idx, "dueDate", e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"/>
                  </div>
                  <div className="col-span-2">
                    <input value={item.description}
                      onChange={e => updateItem(idx, "description", e.target.value)}
                      placeholder="Note" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"/>
                  </div>
                  <div className="col-span-1 text-right">
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <X size={14}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end mt-2 text-sm font-semibold text-slate-700">
              Total: <span className="text-indigo-600 ml-2">{fmt(totalAmount)}</span>
            </div>
          </div>

          <button onClick={handleCreate} disabled={saving || !form.name || !form.programId}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={14} className="animate-spin"/>} Create Fee Structure
          </button>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!assignModal} title={`Assign Fee — ${assignModal?.name}`} onClose={() => setAssignModal(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <b>Program:</b> {assignModal?.programName} &nbsp;·&nbsp;
            <b>Batch:</b> {assignModal?.batch} &nbsp;·&nbsp;
            <b>Amount:</b> {fmt(assignModal?.totalAmount)}
          </p>
          <div className="space-y-3">
            <button onClick={() => handleAssign(assignModal?.id)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl">
              <CheckCircle size={16}/> Assign to All Eligible Students ({assignModal?.batch} Batch)
            </button>
            <p className="text-center text-xs text-slate-400">
              Sirf unhe assign hogi jinhe abhi ye structure assign nahi hai
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 2: Student Fees ──────────────────────────────────────────────────────

function StudentFeesTab() {
  const [records,      setRecords]      = useState([]);
  const [meta,         setMeta]         = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [structures,   setStructures]   = useState([]);
  const [loading,      setLoading]      = useState(false);

  const [filterStructure, setFilterStructure] = useState("");
  const [filterStatus,    setFilterStatus]    = useState("");
  const [search,          setSearch]          = useState("");
  const searchTimer = useRef(null);

  const [paymentModal, setPaymentModal] = useState(null);  // record object
  const [historyModal, setHistoryModal] = useState(null);  // record object
  const [payments,     setPayments]     = useState([]);
  const [payForm, setPayForm] = useState({
    amount: "", paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: "CASH", transactionId: "", remarks: "",
  });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    feeService.getStructures()
      .then(d => setStructures(Array.isArray(d) ? d : [])).catch(() => {});
    fetchRecords(0);
  }, []);

  const fetchRecords = useCallback(async (
    page = 0, struct = filterStructure, status = filterStatus, q = search
  ) => {
    setLoading(true);
    try {
      const params = { page, size: 15 };
      if (struct) params.structureId = struct;
      if (status) params.status      = status;
      if (q)      params.search      = q;
      const data = await feeService.getRecords(params);
      setRecords(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Records load nahi hue"); }
    finally   { setLoading(false); }
  }, [filterStructure, filterStatus, search]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchRecords(0, filterStructure, filterStatus, val), 400);
  };

  const openPayment = (record) => {
    setPaymentModal(record);
    setPayForm({
      amount: record.dueAmount.toFixed(2),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: "CASH", transactionId: "", remarks: "",
    });
  };

  const openHistory = async (record) => {
    setHistoryModal(record);
    try {
      const data = await feeService.getPayments(record.id);
      setPayments(Array.isArray(data) ? data : []);
    } catch { toast.error("Payment history load nahi hua"); }
  };

  const handlePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0)
      return toast.error("Valid amount dalo");
    setPaying(true);
    try {
      await feeService.recordPayment({
        studentFeeRecordId: paymentModal.id,
        amount:      Number(payForm.amount),
        paymentDate: payForm.paymentDate,
        paymentMode: payForm.paymentMode,
        transactionId: payForm.transactionId || undefined,
        remarks:     payForm.remarks || undefined,
      });
      toast.success("Payment recorded!");
      setPaymentModal(null);
      fetchRecords(meta.number);
    } catch (err) { toast.error(err?.response?.data?.message ?? "Payment failed"); }
    finally { setPaying(false); }
  };

  const handleDeletePayment = async (payId, record) => {
    if (!window.confirm("Ye payment reverse karna chahte ho?")) return;
    try {
      await feeService.deletePayment(payId);
      toast.success("Payment reversed.");
      openHistory(record);
      fetchRecords(meta.number);
    } catch { toast.error("Delete failed."); }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Search by student name or enrollment no…"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        <select value={filterStructure}
          onChange={e => { setFilterStructure(e.target.value); fetchRecords(0, e.target.value, filterStatus); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
          <option value="">All Structures</option>
          {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); fetchRecords(0, filterStructure, e.target.value); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
          <option value="">All Status</option>
          {Object.entries(FEE_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <Loader2 size={24} className="animate-spin"/>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <CreditCard size={28} className="opacity-30"/>
            <p className="text-sm">Koi fee record nahi mila.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Structure</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map(r => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.studentName}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.enrollmentNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-600 text-xs">{r.feeStructureName}</p>
                      <p className="text-slate-400 text-xs">{r.academicYear}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 text-sm font-mono">{fmt(r.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-green-600 text-sm font-mono font-medium">{fmt(r.paidAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-600 text-sm font-mono font-medium">{fmt(r.dueAmount)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status !== "PAID" && r.status !== "WAIVED" && (
                          <button onClick={() => openPayment(r)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600"
                            title="Record Payment">
                            <IndianRupee size={14}/>
                          </button>
                        )}
                        <button onClick={() => openHistory(r)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600"
                          title="Payment History">
                          <Receipt size={14}/>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={p => fetchRecords(p)} />
      </div>

      {/* Payment Modal */}
      <Modal open={!!paymentModal} title={`Record Payment — ${paymentModal?.studentName}`} onClose={() => setPaymentModal(null)}>
        {paymentModal && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-sm font-bold text-slate-700">{fmt(paymentModal.totalAmount)}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
              <div>
                <p className="text-sm font-bold text-green-600">{fmt(paymentModal.paidAmount)}</p>
                <p className="text-xs text-slate-400">Paid</p>
              </div>
              <div>
                <p className="text-sm font-bold text-red-600">{fmt(paymentModal.dueAmount)}</p>
                <p className="text-xs text-slate-400">Due</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)">
                <input type="number" value={payForm.amount} min={1} max={paymentModal.dueAmount}
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} className={inputCls}/>
              </Field>
              <Field label="Payment Date">
                <input type="date" value={payForm.paymentDate}
                  onChange={e => setPayForm(p => ({ ...p, paymentDate: e.target.value }))} className={inputCls}/>
              </Field>
              <Field label="Payment Mode">
                <select value={payForm.paymentMode}
                  onChange={e => setPayForm(p => ({ ...p, paymentMode: e.target.value }))} className={inputCls}>
                  {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Transaction ID (optional)">
                <input value={payForm.transactionId}
                  onChange={e => setPayForm(p => ({ ...p, transactionId: e.target.value }))}
                  placeholder="UTR / Cheque no." className={inputCls}/>
              </Field>
              <div className="col-span-2">
                <Field label="Remarks (optional)">
                  <input value={payForm.remarks}
                    onChange={e => setPayForm(p => ({ ...p, remarks: e.target.value }))} className={inputCls}/>
                </Field>
              </div>
            </div>
            <button onClick={handlePayment} disabled={paying}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {paying && <Loader2 size={14} className="animate-spin"/>}
              <CheckCircle size={14}/> Confirm Payment
            </button>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal open={!!historyModal} title={`Payment History — ${historyModal?.studentName}`} wide onClose={() => setHistoryModal(null)}>
        {payments.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">Koi payment record nahi mila.</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-bold text-green-600">{fmt(p.amount)}</p>
                    <p className="text-xs text-slate-400">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">{p.paymentModeDisplay}</p>
                    {p.transactionId && <p className="text-xs text-slate-400 font-mono">{p.transactionId}</p>}
                  </div>
                  <div>
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-mono px-2 py-0.5 rounded">
                      {p.receiptNumber}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDeletePayment(p.id, historyModal)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeePage() {
  const [activeTab, setActiveTab] = useState("structures");

  const tabs = [
    { id: "structures", label: "Fee Structures", icon: CreditCard },
    { id: "students",   label: "Student Fees",   icon: IndianRupee },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Fee Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Fee structure define karo → Students ko assign karo → Payments track karo
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}>
            <tab.icon size={15}/> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {activeTab === "structures" && <StructuresTab />}
          {activeTab === "students"   && <StudentFeesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}