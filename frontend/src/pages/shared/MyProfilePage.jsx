import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Lock, Save, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import { profileService, photoUrl } from "../../services/profileService";
import { useAuth } from "../../hooks/useAuth";

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "U";
}

export default function MyProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phoneNumber: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const data = await profileService.getMe();
      setProfile(data);
      setForm({ firstName: data.firstName, lastName: data.lastName, phoneNumber: data.phoneNumber ?? "" });
    } catch { toast.error("Profile load nahi hua"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await profileService.updateProfile(form);
      setProfile(updated);
      updateUser?.({ name: `${updated.firstName} ${updated.lastName}` });
      toast.success("Profile update ho gayi!");
    } catch (err) { toast.error(err?.response?.data?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handlePhotoPick = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Sirf JPG/PNG image allowed hai"); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image 5MB se choti honi chahiye"); return;
    }
    setUploading(true);
    try {
      const updated = await profileService.uploadPhoto(file);
      setProfile(updated);
      toast.success("Photo update ho gayi!");
    } catch (err) { toast.error(err?.response?.data?.message ?? "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Naya password match nahi kar raha"); return;
    }
    setPwSaving(true);
    try {
      await profileService.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Password change ho gaya!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) { toast.error(err?.response?.data?.message ?? "Password change nahi hua"); }
    finally { setPwSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Apni personal details aur photo manage karein</p>
      </div>

      {/* ── Photo + basic info ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5">
        <div className="relative group flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl font-bold">
            {profile.photoUrl ? (
              <img src={photoUrl(profile.photoUrl)} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials(profile.firstName, profile.lastName)
            )}
          </div>
          <button onClick={handlePhotoPick} disabled={uploading}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? <Loader2 size={18} className="animate-spin text-white" /> : <Camera size={18} className="text-white" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800">{profile.firstName} {profile.lastName}</p>
          <p className="text-sm text-slate-500">{profile.email}</p>
          <span className="inline-block mt-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full uppercase tracking-wide">
            {profile.role}
          </span>
        </div>
      </div>

      {/* ── Edit details ── */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <UserIcon size={13} /> Personal Details
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
            <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
              required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
            <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
              required className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
          <input value={form.phoneNumber} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
            placeholder="+91 XXXXX XXXXX" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email (fixed)</label>
          <input value={profile.email} disabled className={inputCls + " bg-slate-50 text-slate-400"} />
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </form>

      {/* ── Change password ── */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Lock size={13} /> Change Password
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Current Password</label>
          <input type="password" value={pwForm.currentPassword}
            onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
            required className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
            <input type="password" value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
              required minLength={8} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New Password</label>
            <input type="password" value={pwForm.confirmPassword}
              onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
              required minLength={8} className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={pwSaving}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
          {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Update Password
        </button>
      </form>
    </div>
  );
}