import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { qrAttendanceService } from "../../services/qrAttendanceService";

const SCANNER_ID = "qr-reader";

export default function ScanAttendancePage() {
  const { token: routeToken } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("scanning"); // scanning | success | already | error
  const [message, setMessage] = useState("");
  const scannerRef = useRef(null);

  const submitToken = async (token) => {
    try {
      const res = await qrAttendanceService.scan(token);
      setStatus(res.alreadyMarked ? "already" : "success");
      setMessage(res.message + (res.subjectName ? ` (${res.subjectName})` : ""));
    } catch (err) {
      setStatus("error");
      setMessage(err?.response?.data?.message ?? "QR scan fail ho gaya.");
    }
  };

  // Agar link seedha token ke saath aaya hai (QR image scan → deep link),
  // to camera kholne ki zaroorat nahi — seedha mark kar do.


  useEffect(() => {
    if (routeToken) {
      submitToken(routeToken);
      return;
    }

    let cancelled = false;
    const isScanningRef = { current: false };

    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 220 },
      (decodedText) => {
        if (cancelled) return;
        isScanningRef.current = false;
        scanner.stop()
          .then(() => scanner.clear())
          .catch(() => { });
        const parts = decodedText.split("/scan-attendance/");
        const token = parts.length > 1 ? parts[1] : decodedText;
        submitToken(token);
      },
      () => { /* frame scan miss — ignore, keep trying */ }
    ).then(() => {
      // start() poori tarah resolve hone ke BAAD hi scanner "running" maana jaayega
      if (cancelled) {
        // Component already unmount ho chuka — turant band kar do
        scanner.stop().then(() => scanner.clear()).catch(() => { });
      } else {
        isScanningRef.current = true;
      }
    }).catch((err) => {
      console.error("Camera start failed:", err);
      if (!cancelled) {
        setStatus("error");
        setMessage("Camera access nahi mil paaya. Browser permissions check karein ya QR seedha camera app se scan karein.");
      }
    });

    return () => {
      cancelled = true;
      // Sirf tabhi stop() karo jab scanner sach mein "running" state mein pahunch chuka ho —
      // isi se "Cannot stop, scanner is not running" wali race-condition avoid hoti hai.
      if (isScanningRef.current) {
        scanner.stop().then(() => scanner.clear()).catch(() => { });
      }
    };
  }, [routeToken]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      {status === "scanning" && !routeToken && (
        <>
          <h1 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <ScanLine size={18} /> QR Scan Karein
          </h1>
          <p className="text-sm text-slate-500 mb-4">Faculty screen par dikha rahe QR code ko camera ke saamne rakhein</p>
          <div id={SCANNER_ID} className="w-full max-w-xs rounded-xl overflow-hidden border border-slate-200" />
        </>
      )}

      {status === "scanning" && routeToken && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">Attendance mark ho rahi hai…</p>
        </div>
      )}

      {(status === "success" || status === "already") && (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 size={48} className="text-green-500" />
          <p className="text-base font-semibold text-slate-800">{message}</p>
          <button onClick={() => navigate("/")}
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
            Dashboard par jaayein
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <XCircle size={48} className="text-red-500" />
          <p className="text-base font-semibold text-slate-800">{message}</p>
          <button onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-sm font-medium rounded-lg">
            Dobara Koshish Karein
          </button>
        </div>
      )}
    </div>
  );
}