import { useEffect, useState } from "react";
import { CreditCard, FileBadge, Loader2, Search, Download, X } from "lucide-react";
import toast from "react-hot-toast";
import { documentService, CERTIFICATE_TYPES } from "../../services/documentService";
import { studentService } from "../../services/studentService";
import { facultyService } from "../../services/facultyService";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
      <Icon size={15} /> {children}
    </button>
  );
}

// ── ID Card tab ────────────────────────────────────────────────────────

function IdCardTab() {
  const [type, setType] = useState("STUDENT");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  /*
  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = type === "STUDENT"
        ? await studentService.search({ q: query, page: 0, size: 10 })
        : await facultyService.search({ q: query, page: 0, size: 10 });
      setResults(data.content ?? []);
    } catch { toast.error("Search failed"); }
    finally { setLoading(false); }
  };
  */

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = type === "STUDENT"
        ? await studentService.getAll({ search: query, page: 0, size: 10 })
        : await facultyService.getAll({ search: query, page: 0, size: 10 });
      setResults(data.content ?? []);
    } catch { toast.error("Search failed"); }
    finally { setLoading(false); }
  };

  const download = async (id) => {
    try {
      if (type === "STUDENT") await documentService.downloadStudentIdCard(id);
      else await documentService.downloadFacultyIdCard(id);
    } catch { toast.error("ID card generate nahi hua"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setType("STUDENT"); setResults([]); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg ${type === "STUDENT" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
          Student
        </button>
        <button onClick={() => { setType("FACULTY"); setResults([]); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg ${type === "FACULTY" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
          Faculty
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder={`${type === "STUDENT" ? "Naam ya enrollment no" : "Naam ya employee id"} se search karein…`}
          className="w-full pl-9 pr-24 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={search}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md">
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-2">
          {results.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{r.firstName} {r.lastName}</p>
                <p className="text-xs text-slate-500">{r.enrollmentNumber ?? r.employeeId}</p>
              </div>
              <button onClick={() => download(r.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors">
                <Download size={13} /> ID Card
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Certificate tab ───────────────────────────────────────────────────

function CertificateTab() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [form, setForm] = useState({ studentId: "", studentLabel: "", type: "BONAFIDE", purpose: "" });

  const fetchRows = async (page = 0) => {
    setLoading(true);
    try {
      const data = await documentService.getAllCertificates({ page, size: 10 });
      setRows(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch { toast.error("Certificates load nahi hue"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRows(0); }, []);
  /*
  const searchStudents = async (q) => {
    setStudentQuery(q);
    if (!q.trim()) { setStudentResults([]); return; }
    try {
      const data = await studentService.search({ q, page: 0, size: 6 });
      setStudentResults(data.content ?? []);
    } catch { }
  }; 

  const pickStudent = (s) => {
    setForm(p => ({ ...p, studentId: s.id, studentLabel: `${s.user?.firstName} ${s.user?.lastName} (${s.enrollmentNumber})` }));
    setStudentResults([]);
    setStudentQuery("");
  };
  */

  const searchStudents = async (q) => {
    setStudentQuery(q);
    if (!q.trim()) { setStudentResults([]); return; }
    try {
      const data = await studentService.getAll({ search: q, page: 0, size: 6 });
      setStudentResults(data.content ?? []);
    } catch { /* ignore */ }
  };

  const pickStudent = (s) => {
    setForm(p => ({ ...p, studentId: s.id, studentLabel: `${s.firstName} ${s.lastName} (${s.enrollmentNumber})` }));
    setStudentResults([]);
    setStudentQuery("");
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!form.studentId) { toast.error("Student select karein"); return; }
    setSaving(true);
    try {
      const cert = await documentService.issueCertificate({
        studentId: form.studentId, type: form.type, purpose: form.purpose,
      });
      toast.success("Certificate issue ho gaya!");
      setModalOpen(false);
      setForm({ studentId: "", studentLabel: "", type: "BONAFIDE", purpose: "" });
      fetchRows(0);
      documentService.downloadCertificate(cert.id);
    } catch (err) { toast.error(err?.response?.data?.message ?? "Issue failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <FileBadge size={15} /> Issue Certificate
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Certificate No</th>
                <th className="text-left px-4 py-2.5">Student</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Issued On</th>
                <th className="text-left px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.certificateNumber}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.studentName} <span className="text-slate-400">({r.enrollmentNumber})</span></td>
                  <td className="px-4 py-2.5">{r.typeDisplay}</td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => documentService.downloadCertificate(r.id)}
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Issue Certificate</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleIssue} className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Student</label>
                {form.studentLabel ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                    {form.studentLabel}
                    <button type="button" onClick={() => setForm(p => ({ ...p, studentId: "", studentLabel: "" }))}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input value={studentQuery} onChange={e => searchStudents(e.target.value)}
                      placeholder="Naam ya enrollment no se search…" className={inputCls} />
                    {studentResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {studentResults.map(s => (
                          <button key={s.id} type="button" onClick={() => pickStudent(s)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                            {s.firstName} {s.lastName} <span className="text-slate-400">({s.enrollmentNumber})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Certificate Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                  {CERTIFICATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Purpose (optional)</label>
                <input value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                  placeholder="e.g. applying for passport" className={inputCls} />
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Issue & Download
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentCenterPage() {
  const [tab, setTab] = useState("idcard");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Document Center</h1>
        <p className="text-sm text-slate-500 mt-0.5">ID cards aur certificates generate karein</p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "idcard"} onClick={() => setTab("idcard")} icon={CreditCard}>ID Cards</TabButton>
        <TabButton active={tab === "certificate"} onClick={() => setTab("certificate")} icon={FileBadge}>Certificates</TabButton>
      </div>

      {tab === "idcard" ? <IdCardTab /> : <CertificateTab />}
    </div>
  );
}