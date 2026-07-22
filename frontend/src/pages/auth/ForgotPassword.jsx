import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { forgotPassword } from "../../services/authService";

const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function validate(value) {
    if (!value.trim())                    return "Email is required";
    if (!/\S+@\S+\.\S+/.test(value))     return "Enter a valid email address";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate(email);
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success("OTP sent! Check your email.", {
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontSize: "14px" },
        iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
      });
      // Email ko reset page pe carry karo taaki dobara enter na karna pade
      navigate("/reset-password", { state: { email } });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Something went wrong. Please try again.", {
        style: { borderRadius: "12px", background: "#0F172A", color: "#F8FAFC", fontSize: "14px" },
      });
    } finally {
      setLoading(false);
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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password?</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Enter your registered email and we'll send you a reset code.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              id="email"
              name="email"
              label="Registered Email"
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              icon={Mail}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              error={error}
            />

            <Button type="submit" loading={loading} disabled={loading}>
              Send Reset Code
            </Button>
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