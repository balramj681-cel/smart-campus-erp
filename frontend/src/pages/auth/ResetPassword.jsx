import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Input from "../../components/ui/Input";
import PasswordInput from "../../components/ui/PasswordInput";
import Button from "../../components/ui/Button";
import { resetPassword, forgotPassword } from "../../services/authService";

const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function ResetPassword() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // ForgotPassword page ne email state mein bheja tha
  const prefillEmail = location.state?.email ?? "";

  const [form, setForm] = useState({
    email:       prefillEmail,
    otpCode:     "",
    newPassword: "",
  });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const errs = {};
    if (!form.email.trim())                         errs.email       = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))     errs.email       = "Enter a valid email";
    if (!form.otpCode.trim())                       errs.otpCode     = "OTP is required";
    else if (!/^\d{6}$/.test(form.otpCode))        errs.otpCode     = "OTP must be exactly 6 digits";
    if (!form.newPassword.trim())                   errs.newPassword = "New password is required";
    else if (form.newPassword.length < 8)           errs.newPassword = "Password must be at least 8 characters";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await resetPassword(form);
      toast.success("Password reset successfully! Please login.", {
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontSize: "14px" },
        iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
      });
      navigate("/login");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Invalid or expired OTP. Please try again.", {
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontSize: "14px" },
      });
    } finally {
      setLoading(false);
    }
  }

  // OTP dobara bhejna — wahi email use karke
  async function handleResend() {
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
      setErrors((prev) => ({ ...prev, email: "Enter a valid email to resend OTP" }));
      return;
    }
    setResending(true);
    try {
      await forgotPassword(form.email);
      toast.success("New OTP sent! Check your email.", {
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontSize: "14px" },
        iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
      });
      setForm((prev) => ({ ...prev, otpCode: "" }));
    } catch {
      toast.error("Could not resend OTP. Please try again.", {
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontSize: "14px" },
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 px-4">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-100 px-8 py-9 space-y-7">

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-500/30">
                SC
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Smart Campus ERP</h2>
                <p className="text-xs text-slate-400 font-medium">Enterprise Platform · v2.0</p>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Enter the 6-digit code sent to your email and choose a new password.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email — pre-filled, editable in case user came directly to this URL */}
            <Input
              id="email"
              name="email"
              label="Email address"
              type="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
            />

            {/* OTP */}
            <div className="space-y-1">
              <Input
                id="otpCode"
                name="otpCode"
                label="Verification Code"
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={form.otpCode}
                onChange={handleChange}
                error={errors.otpCode}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors duration-150 disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend Code"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <PasswordInput
              id="newPassword"
              name="newPassword"
              label="New Password"
              placeholder="Min. 8 characters"
              value={form.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
            />

            <div className="pt-1">
              <Button type="submit" loading={loading} disabled={loading}>
                Reset Password
              </Button>
            </div>
          </form>

          {/* Back to login */}
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          © {new Date().getFullYear()} Smart Campus ERP · All rights reserved
        </p>
      </motion.div>
    </div>
  );
}