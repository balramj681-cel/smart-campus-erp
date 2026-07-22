import { useEffect, useRef, useState } from "react";
import { QrCode, Loader2, Users, CheckCircle2, StopCircle, CalendarDays, Clock } from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { qrAttendanceService } from "../../services/qrAttendanceService";
import { attendanceService, currentAcademicYear } from "../../services/attendanceService";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
const APP_URL = window.location.origin;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const ACADEMIC_YEARS = (() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => {
        const yr = y - i;
        return `${yr}-${String(yr + 1).slice(-2)}`;
    });
})();

export default function QrAttendancePage() {
    const [date, setDate] = useState(today());
    const [academicYear, setAcademicYear] = useState(currentAcademicYear());
    const [schedule, setSchedule] = useState([]);
    const [loadingSched, setLoadingSched] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [validityMinutes, setValidityMinutes] = useState(10);

    const [session, setSession] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [progress, setProgress] = useState(null);
    const [starting, setStarting] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);

    const pollRef = useRef(null);
    const tickRef = useRef(null);

    // ── Step 1: apna schedule load karo (date change hone par) ──────────────
    const loadSchedule = async (d, year) => {
        setLoadingSched(true);
        setSchedule([]); setSelectedEntry(null);
        try {
            const data = await attendanceService.getMySchedule(d, year);
            const arr = Array.isArray(data) ? data : [];
            setSchedule(arr);
            if (arr.length === 0) toast("Is din koi class scheduled nahi hai.", { icon: "📅" });
        } catch { toast.error("Schedule load nahi hua"); }
        finally { setLoadingSched(false); }
    };

    useEffect(() => { loadSchedule(date, academicYear); }, []);

    // ── Step 2: period select karke QR start karo ────────────────────────────
    const handleStart = async () => {
        if (!selectedEntry) { toast.error("Pehle ek class period select karein"); return; }
        setStarting(true);
        try {
            const data = await qrAttendanceService.start({
                sectionId: selectedEntry.sectionId,
                subjectId: selectedEntry.subjectId,
                sessionDate: date,
                academicYear: selectedEntry.academicYear,   // ✅ usi timetable-entry ki actual year — hamesha assignment se match karegi
                periodNumber: selectedEntry.periodNumber, 
                validityMinutes,
            });
            setSession(data);
            const scanUrl = `${APP_URL}/scan-attendance/${data.qrToken}`;
            setQrDataUrl(await QRCode.toDataURL(scanUrl, { width: 260, margin: 1 }));
            toast.success("QR session shuru ho gaya!");
        } catch (err) { toast.error(err?.response?.data?.message ?? "Start nahi hua"); }
        finally { setStarting(false); }
    };

    // Live progress polling every 3s
    useEffect(() => {
        if (!session) return;
        const poll = async () => {
            try {
                const p = await qrAttendanceService.progress(session.sessionId);
                setProgress(p);
                if (!p.active) clearInterval(pollRef.current);
            } catch { /* silent */ }
        };
        poll();
        pollRef.current = setInterval(poll, 3000);
        return () => clearInterval(pollRef.current);
    }, [session]);

    // Countdown timer
    useEffect(() => {
        if (!session?.qrExpiresAt) return;
        const tick = () => {
            const diff = Math.max(0, Math.floor((new Date(session.qrExpiresAt) - Date.now()) / 1000));
            setSecondsLeft(diff);
        };
        tick();
        tickRef.current = setInterval(tick, 1000);
        return () => clearInterval(tickRef.current);
    }, [session]);

    const handleFinalize = async () => {
        setFinalizing(true);
        try {
            const p = await qrAttendanceService.finalize(session.sessionId);
            setProgress(p);
            toast.success("Attendance finalize ho gayi — baaki students ABSENT mark ho gaye.");
            clearInterval(pollRef.current);
            clearInterval(tickRef.current);
        } catch (err) { toast.error(err?.response?.data?.message ?? "Finalize nahi hua"); }
        finally { setFinalizing(false); }
    };

    const reset = () => {
        setSession(null); setQrDataUrl(null); setProgress(null); setSelectedEntry(null);
        clearInterval(pollRef.current); clearInterval(tickRef.current);
        loadSchedule(date, academicYear);
    };

    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const ss = String(secondsLeft % 60).padStart(2, "0");

    const subjectColors = [
        "border-blue-300 bg-blue-50 text-blue-800",
        "border-violet-300 bg-violet-50 text-violet-800",
        "border-emerald-300 bg-emerald-50 text-emerald-800",
        "border-amber-300 bg-amber-50 text-amber-800",
        "border-rose-300 bg-rose-50 text-rose-800",
    ];

    return (
        <div className="p-6 max-w-xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-slate-800">QR Attendance</h1>
                <p className="text-sm text-slate-500 mt-0.5">Students apne phone se QR scan karke khud attendance mark karenge</p>
            </div>

            {!session ? (
                <div className="space-y-4">
                    {/* ── Step 1: Date + Year ── */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Step 1 — Date select karo</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Date">
                                <input type="date" value={date}
                                    onChange={e => { setDate(e.target.value); loadSchedule(e.target.value, academicYear); }}
                                    className={inputCls} />
                            </Field>
                            <Field label="Academic Year">
                                <select value={academicYear}
                                    onChange={e => { setAcademicYear(e.target.value); loadSchedule(date, e.target.value); }}
                                    className={inputCls}>
                                    {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </Field>
                        </div>
                    </div>

                    {/* ── Step 2: Period select ── */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Step 2 — Class period select karo</p>
                        {loadingSched ? (
                            <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                        ) : schedule.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-6">Is din koi class scheduled nahi hai.</p>
                        ) : (
                            <div className="grid gap-2">
                                {schedule.map((entry, idx) => (
                                    <button key={entry.id} onClick={() => setSelectedEntry(entry)}
                                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border-2 text-left transition-all ${selectedEntry?.id === entry.id ? "border-indigo-500 bg-indigo-50" : subjectColors[idx % subjectColors.length]
                                            }`}>
                                        <div>
                                            <p className="text-sm font-semibold">{entry.subjectCode} — {entry.subjectName}</p>
                                            <p className="text-xs opacity-70 mt-0.5">Section {entry.sectionName} · Period {entry.periodNumber}</p>
                                        </div>
                                        <span className="flex items-center gap-1 text-xs font-medium">
                                            <Clock size={12} /> {entry.startTime}–{entry.endTime}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Step 3: Validity + Start ── */}
                    {selectedEntry && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Step 3 — QR generate karo</p>
                            <Field label="QR Validity (minutes)">
                                <input type="number" min={1} max={60} value={validityMinutes}
                                    onChange={e => setValidityMinutes(Number(e.target.value))} className={inputCls} />
                            </Field>
                            <button onClick={handleStart} disabled={starting}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                                {starting ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={15} />}
                                Start QR Attendance
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 text-center">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">{session.subjectName}</p>
                        <p className="text-xs text-slate-500">Section {session.sectionName}</p>
                    </div>

                    {qrDataUrl && (
                        <img src={qrDataUrl} alt="Attendance QR" className="mx-auto rounded-lg border border-slate-100" />
                    )}

                    <div className="flex items-center justify-center gap-2 text-sm">
                        <span className={`font-mono font-semibold ${secondsLeft < 30 ? "text-red-500" : "text-slate-700"}`}>
                            {mm}:{ss}
                        </span>
                        <span className="text-slate-400">tak valid</span>
                    </div>

                    {progress && (
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                            <Users size={15} />
                            <span className="font-semibold">{progress.scannedCount}</span> / {progress.totalStudents} scanned
                        </div>
                    )}

                    {progress?.scannedStudentNames?.length > 0 && (
                        <div className="text-left bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                            {progress.scannedStudentNames.map((n, i) => (
                                <p key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-green-500" /> {n}
                                </p>
                            ))}
                        </div>
                    )}

                    {progress?.active ? (
                        <button onClick={handleFinalize} disabled={finalizing}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                            {finalizing ? <Loader2 size={14} className="animate-spin" /> : <StopCircle size={15} />}
                            Stop & Finalize (mark remaining absent)
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-green-600 font-medium">✅ Session finalize ho chuki hai.</p>
                            <button onClick={reset}
                                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors">
                                New Session Start Karein
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
            {children}
        </div>
    );
}