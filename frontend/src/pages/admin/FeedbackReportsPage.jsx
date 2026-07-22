import { useEffect, useState } from "react";
import { Star, Loader2, TrendingUp, Award } from "lucide-react";
import toast from "react-hot-toast";
import { feedbackService } from "../../services/feedbackService";

export default function FeedbackReportsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await feedbackService.getAdminOverview();
        setRows(Array.isArray(data) ? data : []);
      } catch { toast.error("Overview load nahi hua"); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Faculty Feedback Report</h1>
        <p className="text-sm text-slate-500 mt-0.5">Institution-wide teaching ratings, highest first</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <TrendingUp size={28} className="opacity-30" />
          <p className="text-sm">Abhi tak koi feedback data nahi hai.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Rank</th>
                <th className="text-left px-4 py-2.5">Faculty</th>
                <th className="text-left px-4 py-2.5">Rating</th>
                <th className="text-left px-4 py-2.5">Responses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={r.facultyName + i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500">
                    {i === 0 ? <Award size={16} className="text-amber-500" /> : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.facultyName}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star size={13} className="fill-amber-400 text-amber-400" /> {r.averageRating}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{r.totalResponses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}