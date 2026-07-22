import { useEffect, useState } from "react";
import { CreditCard, FileBadge, Loader2, Download } from "lucide-react";
import toast from "react-hot-toast";
import { documentService } from "../../services/documentService";

export default function MyDocumentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await documentService.getMyCertificates({ page: 0, size: 20 });
        setRows(data.content ?? []);
      } catch { toast.error("Certificates load nahi hue"); }
      finally { setLoading(false); }
    })();
  }, []);

  const downloadIdCard = async () => {
    setCardLoading(true);
    try { await documentService.downloadMyIdCard(); }
    catch { toast.error("ID card generate nahi hua"); }
    finally { setCardLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My Documents</h1>
        <p className="text-sm text-slate-500 mt-0.5">Apna ID card aur issued certificates yahan se download karein</p>
      </div>

      <button onClick={downloadIdCard} disabled={cardLoading}
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
        {cardLoading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
        Download My ID Card
      </button>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Issued Certificates</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
            <FileBadge size={26} className="opacity-30" />
            <p className="text-sm">Abhi tak koi certificate issue nahi hua.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.typeDisplay}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.certificateNumber} · {new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <button onClick={() => documentService.downloadCertificate(r.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors">
                  <Download size={13} /> Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}