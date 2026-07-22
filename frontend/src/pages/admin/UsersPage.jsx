import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Loader2, Pencil, Plus,
  Search, Shield, Trash2, UserCheck, UserX, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { userService } from "../../services/userService";
import { facultyService } from "../../services/facultyService";
import { studentService } from "../../services/studentService";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ["ADMIN", "FACULTY", "STUDENT", "STAFF"];

const ROLE_COLORS = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-red-100    text-red-700",
  FACULTY: "bg-blue-100   text-blue-700",
  STUDENT: "bg-green-100  text-green-700",
  STAFF: "bg-amber-100  text-amber-700",
};

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "",
  password: "", phoneNumber: "", role: "STUDENT",
};



// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ role }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? "bg-slate-100 text-slate-600"}`}>
      {role}
    </span>
  );
}

function StatusDot({ enabled }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${enabled ? "text-green-600" : "text-slate-400"}`}>
      <span className={`h-2 w-2 rounded-full ${enabled ? "bg-green-500" : "bg-slate-300"}`} />
      {enabled ? "Active" : "Inactive"}
    </span>
  );
}

function Modal({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function UserForm({ form, onChange, onSubmit, loading, isEdit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[["firstName", "First Name"], ["lastName", "Last Name"]].map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
            <input
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input
          type="email" value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          required disabled={isEdit}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>

      {!isEdit && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
          <input
            type="password" value={form.password}
            onChange={(e) => onChange("password", e.target.value)}
            required minLength={8}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <input
            value={form.phoneNumber}
            onChange={(e) => onChange("phoneNumber", e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => onChange("role", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {isEdit ? "Save Changes" : "Create User"}
      </button>
    </form>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const searchTimer = useRef(null);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);   // null = closed
  const [deleteUser, setDeleteUser] = useState(null);   // null = closed

  // Form
  const [form, setForm] = useState(EMPTY_FORM);

  const [linkModal, setLinkModal] = useState(null); // { user, role } | null
  const [linkForm, setLinkForm] = useState({});
  const [linkSaving, setLinkSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (page = 0, q = search, role = roleFilter) => {
    setLoading(true);
    try {
      const data = await userService.getAll({ page, search: q, role });
      setUsers(data.content ?? []);
      setMeta({ totalElements: data.totalElements, totalPages: data.totalPages, number: data.number });
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(0); }, []);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchUsers(0, val, roleFilter), 400);
  };

  const handleRoleFilter = (val) => {
    setRoleFilter(val);
    fetchUsers(0, search, val);
  };

  // ── Form helpers ───────────────────────────────────────────────────────────

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => { setForm(EMPTY_FORM); setCreateOpen(true); };
  const openEdit = (u) => {
    setForm({
      firstName: u.firstName, lastName: u.lastName, email: u.email,
      password: "", phoneNumber: u.phoneNumber ?? "", role: u.role
    });
    setEditUser(u);
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.create(form);
      toast.success("User created successfully.");
      setCreateOpen(false);
      fetchUsers(meta.number);
    } catch (err) {
      toast.error(err?.message ?? "Could not create user.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.update(editUser.id, {
        firstName: form.firstName, lastName: form.lastName,
        phoneNumber: form.phoneNumber, role: form.role,
      });
      toast.success("User updated.");
      setEditUser(null);
      fetchUsers(meta.number);
    } catch (err) {
      toast.error(err?.message ?? "Could not update user.");
    } finally {
      setSaving(false);
    }
  };



  const handleLinkProfile = async (e) => {
    e.preventDefault();
    setLinkSaving(true);
    try {
      if (linkModal.role === "FACULTY") {
        await facultyService.linkExistingUser(linkModal.user.id, linkForm);
      } else {
        await studentService.linkExistingUser(linkModal.user.id, linkForm);
      }
      toast.success(`${linkModal.role === "FACULTY" ? "Faculty" : "Student"} profile ban gayi!`);
      setLinkModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Profile create nahi hui.");
    } finally {
      setLinkSaving(false);
    }
  };

  const handleToggle = async (user) => {
    try {
      await userService.toggleStatus(user.id);
      toast.success(`${user.firstName} ${user.enabled ? "deactivated" : "activated"}.`);
      fetchUsers(meta.number);
    } catch {
      toast.error("Status change failed.");
    }
  };

  const handleDelete = async () => {
    try {
      await userService.delete(deleteUser.id);
      toast.success("User deleted.");
      setDeleteUser(null);
      fetchUsers(meta.number);
    } catch {
      toast.error("Could not delete user.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.totalElements} total users</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <Shield size={32} className="opacity-30" />
            <p className="text-sm">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3"><Badge role={u.role} /></td>
                    <td className="px-4 py-3"><StatusDot enabled={u.enabled} /></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">

                      {(u.role === "FACULTY" || u.role === "STUDENT") && !u.hasProfile && (
                          <button
                            onClick={() => { setLinkForm({}); setLinkModal({ user: u, role: u.role }); }}
                            className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-medium rounded-lg">
                            Complete Profile
                          </button>
                        )}




                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggle(u)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                          title={u.enabled ? "Deactivate" : "Activate"}
                        >
                          {u.enabled ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>


                        


                        <button
                          onClick={() => setDeleteUser(u)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Page {meta.number + 1} of {meta.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchUsers(meta.number - 1)}
                disabled={meta.number === 0}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => fetchUsers(meta.number + 1)}
                disabled={meta.number >= meta.totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} title="Add New User" onClose={() => setCreateOpen(false)}>
        <UserForm form={form} onChange={setField} onSubmit={handleCreate} loading={saving} isEdit={false} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editUser} title="Edit User" onClose={() => setEditUser(null)}>
        <UserForm form={form} onChange={setField} onSubmit={handleEdit} loading={saving} isEdit={true} />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteUser} title="Delete User" onClose={() => setDeleteUser(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">{deleteUser?.firstName} {deleteUser?.lastName}</span> ko permanently delete karna chahte ho? Ye action undo nahi ho sakta.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteUser(null)}
            className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>



  {
    linkModal && (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setLinkModal(null)} />
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              {linkModal.user.firstName} {linkModal.user.lastName} ko {linkModal.role} profile do
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Role assign ho gaya, lekin {linkModal.role === "FACULTY" ? "Faculty" : "Student"} page pe dikhne ke liye ye zaroori details bharni hongi.
            </p>
          </div>
          <form onSubmit={handleLinkProfile} className="px-5 py-5 space-y-3">
            {linkModal.role === "FACULTY" ? (
              <>
                <input required placeholder="Employee ID" value={linkForm.employeeId ?? ""}
                  onChange={e => setLinkForm(f => ({ ...f, employeeId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                <select required value={linkForm.designation ?? ""}
                  onChange={e => setLinkForm(f => ({ ...f, designation: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="">— Designation select karein —</option>
                  <option value="PROFESSOR">Professor</option>
                  <option value="ASSOCIATE_PROFESSOR">Associate Professor</option>
                  <option value="ASSISTANT_PROFESSOR">Assistant Professor</option>
                  <option value="LECTURER">Lecturer</option>
                </select>
              </>
            ) : (
              <>
                <input required placeholder="Enrollment Number" value={linkForm.enrollmentNumber ?? ""}
                  onChange={e => setLinkForm(f => ({ ...f, enrollmentNumber: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                <input required type="number" placeholder="Batch (e.g. 2025)" value={linkForm.batch ?? ""}
                  onChange={e => setLinkForm(f => ({ ...f, batch: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </>
            )}
            <button type="submit" disabled={linkSaving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg">
              {linkSaving ? "Saving…" : "Profile Complete Karein"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  </>
  
  );
}