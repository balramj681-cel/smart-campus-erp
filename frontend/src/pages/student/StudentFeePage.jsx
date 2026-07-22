import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { studentService } from "../../services/studentService";
import { FEE_STATUS_CONFIG } from "../../services/feeService";
import { feeService } from "../../services/feeService";

const fmt = n => `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function StudentFeePage() {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [payments, setPayments] = useState({});

  useEffect(() => {
    studentService.getMyFees()
      .then(d => setRecords(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadPayments = async (recordId) => {
    if (payments[recordId]) return;
    try {
      const data = await feeService.getPayments(recordId);
      setPayments(p => ({ ...p, [recordId]: Array.isArray(data) ? data : [] }));
    } catch {}
  };

  const totalDue  = records.reduce((s, r) => s + (r.dueAmount ?? 0), 0);
  const totalPaid = records.reduce((s, r) => s + (r.paidAmount ?? 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My Fees</h1>
        <p className="text-sm text-slate-500">Fee records aur payment history</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Paid",   value: fmt(totalPaid), color: "bg-green-50 text-green-700 border-green-200" },
          { label: "Total Due",    value: fmt(totalDue),  color: totalDue > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200" },
          { label: "Fee Records",  value: records.length, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-4 border ${c.color}`}>
            <p className="text-xl font-bold">{c.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400"><Loader2 size={24} className="animate-spin"/></div>
      ) : records.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Koi fee record nahi mila.
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => {
            const cfg  = FEE_STATUS_CONFIG[r.status] ?? FEE_STATUS_CONFIG.PENDING;
            const rPay = payments[r.id];
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-800">{r.feeStructureName}</p>
                    <p className="text-xs text-slate-400">{r.programName} · {r.academicYear}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-0 divide-x divide-slate-100 px-0">
                  {[
                    { label: "Total",  val: fmt(r.totalAmount),  cls: "text-slate-700" },
                    { label: "Paid",   val: fmt(r.paidAmount),   cls: "text-green-600" },
                    { label: "Due",    val: fmt(r.dueAmount),    cls: r.dueAmount > 0 ? "text-red-600" : "text-green-600" },
                  ].map(col => (
                    <div key={col.label} className="px-4 py-3 text-center">
                      <p className={`text-base font-bold font-mono ${col.cls}`}>{col.val}</p>
                      <p className="text-xs text-slate-400">{col.label}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-3">
                  <button
                    onClick={() => loadPayments(r.id)}
                    className="text-xs text-indigo-600 hover:underline">
                    {rPay ? "Hide" : "Show"} Payment History
                  </button>
                  {rPay && rPay.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {rPay.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                          <span className="font-mono text-slate-400">{p.receiptNumber}</span>
                          <span className="text-slate-600">{p.paymentModeDisplay}</span>
                          <span className="text-slate-500">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</span>
                          <span className="font-semibold text-green-600">{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {rPay && rPay.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">Koi payment record nahi.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}