import { useCallback, useEffect, useState } from "react";
import { Loader2, BookOpen, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { libraryService, ISSUE_STATUS_CONFIG } from "../../services/libraryService";

function StatusBadge({ status }) {
  const cfg = ISSUE_STATUS_CONFIG[status] ?? { label: status, emoji: "", color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

export default function StudentLibraryPage() {
  const [issues,  setIssues]  = useState([]);
  const [meta,    setMeta]    = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);

  const fetchMyIssues = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const data = await libraryService.getMyIssues({ page });
      setIssues(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { /* silent — page still renders empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMyIssues(0); }, [fetchMyIssues]);

  const activeCount  = issues.filter(i => i.status === "ISSUED").length;
  const overdueCount = issues.filter(i => i.overdue).length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My Library</h1>
        <p className="text-sm text-slate-500">Books issued to you, due dates, and return history.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Currently Issued", value: activeCount,  color: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Overdue",          value: overdueCount, color: overdueCount > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200" },
          { label: "Total Records",    value: meta.totalElements, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-4 border ${c.color}`}>
            <p className="text-xl font-bold">{c.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400"><Loader2 size={24} className="animate-spin"/></div>
      ) : issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <BookOpen size={32} className="opacity-30" />
          <p className="text-sm">Aapne abhi tak koi book issue nahi karwayi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Return Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fine</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.bookTitle}</td>
                  <td className="px-4 py-3 text-slate-500">{r.issueDate}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.dueDate}
                    {r.overdue && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.returnDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.overdue ? "OVERDUE" : r.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.fineAmount > 0 ? `₹${r.fineAmount}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">Page {meta.number + 1} of {meta.totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => fetchMyIssues(meta.number - 1)} disabled={meta.number === 0}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => fetchMyIssues(meta.number + 1)} disabled={meta.number >= meta.totalPages - 1}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}