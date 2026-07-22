import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { studentService, currentAcademicYear } from "../../services/studentService";
import { timetableService, DAYS, DAY_SHORT, PERIODS, subjectColor, formatLocalDate } from "../../services/timetableService";

const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

function isToday(date) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return date.getTime() === t.getTime();
}

function getMondayOfWeek(offset = 0) {
  const today = new Date();
  const dow = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getWeekDates(offset) {
  const monday = getMondayOfWeek(offset);
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function StudentTimetablePage() {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(weekOffset);

  useEffect(() => { load(academicYear); }, [weekOffset]);

  const load = async (year) => {
    setLoading(true);
    try {
      const data = await timetableService.getMyTimetable(year, formatLocalDate(weekDates[0]));
      setEntries(Array.isArray(data) ? data : []);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  };

  // Build grid
  const grid = {};
  for (const e of entries) {
    if (!grid[e.dayOfWeek]) grid[e.dayOfWeek] = {};
    grid[e.dayOfWeek][e.periodNumber] = e;
  }

  // Aaj ki classes
  const todayDay = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todayCls = Object.values(grid[todayDay] ?? {});

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My Timetable</h1>
          <p className="text-sm text-slate-500">{entries.length} classes scheduled</p>
        </div>
        <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); load(e.target.value); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Today's classes */}
      {todayCls.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
            📅 Today's Classes ({new Date().toLocaleDateString("en-IN", { weekday: "long" })})
          </p>
          <div className="flex flex-wrap gap-2">
            {todayCls.map(cls => (
              <div key={cls.id} className="bg-white rounded-xl px-3 py-2 border border-indigo-200 text-sm">
                <p className="font-semibold text-slate-800">{cls.subjectName}</p>
                <p className="text-xs text-slate-500">P{cls.periodNumber} · {cls.startTime?.slice(0, 5)} – {cls.endTime?.slice(0, 5)}</p>
                <p className="text-xs text-slate-400">{cls.facultyName} {cls.roomNumber ? `· 🏫 ${cls.roomNumber}` : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
        <button onClick={() => setWeekOffset(p => p - 1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">‹</button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-slate-800">
            {weekDates[0].toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} –{" "}
            {weekDates[5].toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-indigo-600 hover:underline">
              Back to this week
            </button>
          )}
        </div>
        <button onClick={() => setWeekOffset(p => p + 1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">›</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-500 font-medium text-left sticky left-0 z-10">
                    Period
                  </th>
                  {DAYS.map((day, idx) => {
                    const date = weekDates[idx];
                    const today = isToday(date);
                    return (
                      <th key={day}
                        className={`px-3 py-2 border border-slate-200 font-semibold text-center min-w-[120px] ${today ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-700"}`}>
                        <p>{DAY_SHORT[day]}</p>
                        <p className={`text-[10px] font-normal mt-0.5 ${today ? "text-indigo-500" : "text-slate-400"}`}>
                          {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                        {today && <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-indigo-500 text-white text-[9px] rounded-full">Today</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(period => (
                  <tr key={period.number}>
                    <td className="px-3 py-2 border border-slate-200 bg-slate-50 text-center sticky left-0 z-10">
                      <p className="font-semibold text-slate-700">{period.label}</p>
                      <p className="text-slate-400 text-[10px]">{period.start}–{period.end}</p>
                    </td>
                    {DAYS.map((day, idx) => {
                      const entry = grid[day]?.[period.number];
                      const [cellCls] = entry ? subjectColor(entry.subjectCode) : [];
                      const today = isToday(weekDates[idx]);
                      return (
                        <td key={day}
                          className={`border border-slate-200 p-1 align-middle h-14 ${today && !entry ? "bg-indigo-50/20" : ""}`}>
                          {entry ? (
                            entry.cancelled ? (
                              <div className="h-full rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                                <span className="text-[10px] text-slate-400 line-through px-1 text-center">{entry.subjectName}</span>
                              </div>
                            ) : (
                              <div className={`h-full rounded-lg border p-1.5 flex flex-col justify-between ${cellCls}`}>
                                <p className="font-semibold leading-tight truncate text-[11px] flex items-center gap-1">
                                  {entry.subjectName}
                                  {entry.facultyOnLeave && (
                                    <span className="px-1 py-0.5 bg-amber-400 text-amber-900 rounded text-[8px] font-bold leading-none">
                                      LEAVE
                                    </span>
                                  )}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[10px] opacity-60">{entry.subjectCode}</span>
                                  {entry.roomNumber && <span className="text-[10px] opacity-50">🏫 {entry.roomNumber}</span>}
                                </div>
                                <p className="text-[10px] opacity-60 truncate">{entry.facultyName?.split(" ")[0]}</p>
                              </div>
                            )
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}