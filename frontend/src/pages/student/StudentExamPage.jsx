import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { studentService, currentAcademicYear } from "../../services/studentService";
import { EXAM_STATUS_CONFIG } from "../../services/examService";

const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtT = (t) => t ? t.slice(0,5) : "—";

export default function StudentExamPage() {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [exams,        setExams]        = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => { load(academicYear); }, []);

  const load = async (year) => {
    setLoading(true);
    try {
      const data = await studentService.getMyExams(year);
      setExams(Array.isArray(data) ? data : []);
    } catch { setExams([]); }
    finally   { setLoading(false); }
  };

  // Group by examType
  const grouped = exams.reduce((acc, e) => {
    const key = e.examTypeDisplay;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const upcoming = exams.filter(e => e.status === "SCHEDULED" || e.status === "ONGOING");

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My Exam Schedule</h1>
          <p className="text-sm text-slate-500">{upcoming.length} upcoming exams</p>
        </div>
        <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); load(e.target.value); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400"><Loader2 size={24} className="animate-spin"/></div>
      ) : exams.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Koi exam schedule nahi mila.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{type}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 uppercase">
                      <th className="px-4 py-2 text-left">Subject</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-left">Venue</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map(e => {
                      const cfg = EXAM_STATUS_CONFIG[e.status] ?? EXAM_STATUS_CONFIG.SCHEDULED;
                      return (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{e.subjectName}</p>
                            <p className="font-mono text-xs text-slate-400">{e.subjectCode}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(e.examDate)}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                            {fmtT(e.startTime)} – {fmtT(e.endTime)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {e.venue ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}/>
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}