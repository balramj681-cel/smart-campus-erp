import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, ArrowLeft, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/ui/Input";
import PasswordInput from "../../components/ui/PasswordInput";
import Button from "../../components/ui/Button";
import { authApi } from "../../services/api";
import { validateSignUpForm } from "../../utils/validators";

// ─── Animation variants ───────────────────────────────────────────────────────
const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

const INIT_FORM = { name: "", email: "", password: "", confirmPassword: "", phone: "" };
const INIT_ERRORS = { name: "", email: "", password: "", confirmPassword: "", phone: "" };

export default function RegisterForm() {
  const navigate = useNavigate();

  // Step: "form" | "otp"
  const [step, setStep] = useState("form");

  // Form state
  const [form, setForm]     = useState(INIT_FORM);
  const [errors, setErrors] = useState(INIT_ERRORS);
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError]   = useState("");
  const [verifying, setVerifying] = useState(false);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimer = useRef(null);

  // ─── Form handlers ──────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSendOtp(e) {
    e.preventDefault();

    const { errors: vErrors, isValid } = validateSignUpForm({
      name: form.name,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
      phone: form.phone,
    });

    if (!isValid) { setErrors(vErrors); return; }

    setLoading(true);
    try {
      await authApi.sendOtp({
        fullName:    form.name,
        email:       form.email,
        password:    form.password,
        phoneNumber: form.phone,
      });

      toast.success("OTP sent! Check your email and phone.", {
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontFamily: "Poppins, sans-serif" },
        iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
      });

      setStep("otp");
      startResendCooldown();

    } catch (err) {
      const msg = err?.message ?? "Failed to send OTP. Try again.";
      if (err?.code === "EMAIL_ALREADY_EXISTS") {
        setErrors((prev) => ({ ...prev, email: "This email is already registered." }));
      } else {
        toast.error(msg, { style: { borderRadius: "12px", fontFamily: "Poppins, sans-serif" } });
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── OTP box handlers ───────────────────────────────────────────────────────

  const otpRefs = useRef([]);

  function handleOtpChange(index, value) {
    // Sirf digit allow karo
    if (!/^\d?$/.test(value)) return;

    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    setOtpError("");

    // Auto-advance to next box
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    // Focus last filled box
    const lastIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[lastIdx]?.focus();
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();

    const otp = otpDigits.join("");
    if (otp.length < OTP_LENGTH) {
      setOtpError("Please enter the complete 6-digit OTP.");
      return;
    }

    setVerifying(true);
    try {
      await authApi.verifyOtp({ email: form.email, otp });

      toast.success("Account verified! Please sign in.", {
        duration: 3500,
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontFamily: "Poppins, sans-serif" },
        iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
      });

      navigate("/login", { state: { registered: true, email: form.email } });

    } catch (err) {
      const msg = err?.message ?? "Verification failed. Try again.";
      setOtpError(msg);
      // Shake the OTP boxes
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  // ─── Resend OTP ─────────────────────────────────────────────────────────────

  function startResendCooldown() {
    setResendCooldown(RESEND_COOLDOWN);
    clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(resendTimer.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await authApi.sendOtp({
        fullName:    form.name,
        email:       form.email,
        password:    form.password,
        phoneNumber: form.phone,
      });
      toast.success("OTP resent!", {
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontFamily: "Poppins, sans-serif" },
        iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
      });
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      startResendCooldown();
    } catch (err) {
      toast.error(err?.message ?? "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">

        {/* ── STEP 1: Registration Form ── */}
        {step === "form" && (
          <motion.div key="form" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
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
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create an account</h1>
                  <p className="text-sm text-slate-500 mt-0.5">We'll verify your email & phone with an OTP</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSendOtp} noValidate className="space-y-4">
                <Input
                  id="name" name="name" label="Full Name" type="text"
                  placeholder="e.g. Arjun Sharma"
                  value={form.name} onChange={handleChange} error={errors.name}
                />
                <Input
                  id="email" name="email" label="Email Address" type="email"
                  placeholder="you@university.edu" icon={Mail}
                  value={form.email} onChange={handleChange} error={errors.email}
                />
                <Input
                  id="phone" name="phone" label="Mobile Number" type="tel"
                  placeholder="10-digit Indian number" icon={Phone}
                  value={form.phone} onChange={handleChange} error={errors.phone}
                />
                <PasswordInput
                  id="password" name="password" label="Password"
                  placeholder="Min. 8 chars, include A-z, 0-9, symbol"
                  value={form.password} onChange={handleChange} error={errors.password}
                />
                <PasswordInput
                  id="confirmPassword" name="confirmPassword" label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword}
                />

                <div className="pt-1">
                  <Button type="submit" loading={loading} disabled={loading}>
                    {loading ? "Sending OTP…" : "Send OTP"}
                  </Button>
                </div>
              </form>

              {/* Sign in link */}
              <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6 font-medium">
              © {new Date().getFullYear()} Smart Campus ERP · All rights reserved
            </p>
          </motion.div>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === "otp" && (
          <motion.div key="otp" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-100 px-8 py-9 space-y-7">

              {/* Header */}
              <div className="space-y-2">
                <button
                  onClick={() => { setStep("form"); setOtpDigits(Array(OTP_LENGTH).fill("")); setOtpError(""); }}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-2"
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verify your identity</h1>
                <p className="text-sm text-slate-500">
                  A 6-digit OTP was sent to{" "}
                  <span className="font-semibold text-slate-700">{form.email}</span>
                  {form.phone && (
                    <> and <span className="font-semibold text-slate-700">{"****" + form.phone.slice(-4)}</span></>
                  )}
                </p>
              </div>

              {/* OTP Boxes */}
              <form onSubmit={handleVerifyOtp} noValidate>
                <div className="flex justify-center gap-3 mb-2">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className={[
                        "w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                        "bg-slate-50 text-slate-900",
                        otpError
                          ? "border-red-400 bg-red-50"
                          : digit
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300",
                      ].join(" ")}
                    />
                  ))}
                </div>

                {/* OTP Error */}
                <AnimatePresence>
                  {otpError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-xs text-red-500 font-medium text-center mt-2 flex items-center justify-center gap-1"
                    >
                      ⚠ {otpError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="pt-4">
                  <Button type="submit" loading={verifying} disabled={verifying || otpDigits.join("").length < OTP_LENGTH}>
                    {verifying ? "Verifying…" : "Verify & Create Account"}
                  </Button>
                </div>
              </form>

              {/* Resend OTP */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-slate-400">
                    Resend OTP in <span className="font-semibold text-slate-600">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    Resend OTP
                  </button>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6 font-medium">
              © {new Date().getFullYear()} Smart Campus ERP · All rights reserved
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}