import { useEffect, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { studentService, currentAcademicYear } from "../../services/studentService";

const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

const STATUS_COLOR = {
  SAFE:     "bg-green-100 text-green-700",
  AT_RISK:  "bg-amber-100 text-amber-700",
  DETAINED: "bg-red-100   text-red-700",
};

export default function StudentAttendancePage() {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => { load(academicYear); }, []);

  const load = async (year) => {
    setLoading(true);
    try {
      const data = await studentService.getMyAttendance(year);
      const arr  = Array.isArray(data) ? data : [];
      setSummary(arr[0] ?? null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const subjects = summary?.subjects ?? [];
  const low      = subjects.filter(s => s.percentage < 75);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Overall: <span className={`font-semibold ${summary?.overallPercentage >= 75 ? "text-green-600" : "text-red-600"}`}>
              {summary?.overallPercentage ?? "—"}%
            </span>
          </p>
        </div>
        <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); load(e.target.value); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Low attendance warning */}
      {low.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <TriangleAlert size={18} className="text-red-600 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-semibold text-red-700">
              {low.length} subject(s) below 75% — Exam eligibility at risk!
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {low.map(s => s.subjectName).join(", ")}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin"/>
        </div>
      ) : subjects.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Koi attendance record nahi mila.
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map(sub => {
            const pct = sub.percentage;
            return (
              <div key={sub.subjectId} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{sub.subjectName}</p>
                    <p className="text-xs text-slate-400 font-mono">{sub.subjectCode}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${pct >= 75 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                      {pct}%
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[sub.statusLabel] ?? ""}`}>
                      {sub.statusLabel === "SAFE" ? "Safe" : sub.statusLabel === "AT_RISK" ? "At Risk" : "Detained"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Present: <b className="text-green-600">{sub.attendedSessions}</b></span>
                  <span>Absent: <b className="text-red-600">{sub.absentSessions}</b></span>
                  <span>Total: <b>{sub.totalSessions}</b></span>
                  {!sub.eligibleForExam && (
                    <span className="text-red-600 font-semibold">🚫 Exam Debarred</span>
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