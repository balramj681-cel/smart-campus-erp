import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { studentService, currentAcademicYear } from "../../services/studentService";
import { GRADE_COLORS, RESULT_COLORS } from "../../services/marksService";

const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

export default function StudentResultsPage() {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState({});

  useEffect(() => { load(academicYear); }, []);

  const load = async (year) => {
    setLoading(true);
    try {
      const data = await studentService.getMyResults(year);
      setResult(data ?? null);
    } catch { setResult(null); }
    finally   { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My Results</h1>
          <p className="text-sm text-slate-500">Subject-wise marks aur grades</p>
        </div>
        <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); load(e.target.value); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400"><Loader2 size={24} className="animate-spin"/></div>
      ) : !result ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Koi result nahi mila. Marks abhi publish nahi hue.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-indigo-600">{result.sgpa}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">SGPA</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-700">{result.totalCredits}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">Total Credits</p>
              </div>
              <div>
                <span className={`inline-block text-sm px-4 py-1.5 rounded-full font-bold mt-2 ${RESULT_COLORS[result.resultStatus] ?? ""}`}>
                  {result.resultStatus}
                </span>
                <p className="text-xs text-slate-500 mt-1 font-medium">Result</p>
              </div>
            </div>
          </div>

          {/* Subject-wise */}
          <div className="space-y-2">
            {(result.subjects ?? []).map((sub, idx) => (
              <div key={sub.subjectId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 text-left"
                  onClick={() => setExpanded(p => ({ ...p, [sub.subjectId]: !p[sub.subjectId] }))}>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{sub.subjectName}</p>
                    <p className="text-xs text-slate-400 font-mono">{sub.subjectCode} · {sub.creditHours} Credits</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-indigo-600">{sub.totalWeightedMarks}%</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${GRADE_COLORS[sub.gradeLetter] ?? ""}`}>
                      {sub.gradeLetter}
                    </span>
                    <span className="text-xs text-slate-400">GP: {sub.gradePoints}</span>
                    {expanded[sub.subjectId] ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                  </div>
                </button>

                {expanded[sub.subjectId] && sub.components?.length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {sub.components.map(c => (
                        <div key={c.componentId} className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs font-medium text-slate-500">{c.examTypeDisplay}</p>
                          <p className="text-lg font-bold text-slate-800 mt-1">
                            {c.absent ? "AB" : c.marksObtained != null ? `${c.marksObtained}/${c.maxMarks}` : "—"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {c.weightage}% weightage
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}