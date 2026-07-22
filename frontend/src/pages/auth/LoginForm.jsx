import { useState } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import Input from "../../components/ui/Input";
import PasswordInput from "../../components/ui/PasswordInput";
import Button from "../../components/ui/Button";
import Checkbox from "../../components/ui/Checkbox";
import { Link } from "react-router-dom";
import { validateLoginForm } from "../../utils/validators";
import useAuth from "../../hooks/useAuth";

const INITIAL_FORM = { email: "", password: "" };
const INITIAL_ERRORS = { email: "", password: "" };

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const shakeAnimation = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.45 },
};

export default function LoginForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [rememberMe, setRememberMe] = useState(false);
  const [shake, setShake] = useState(false);
  const { login, isLoading, error } = useAuth();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { errors: validationErrors, isValid } = validateLoginForm(form);

    if (!isValid) {
      setErrors(validationErrors);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const { success, error: loginError } = await login({
      email: form.email,
      password: form.password,
      rememberMe,
    });

    if (!success) {
      setErrors((prev) => ({ ...prev, form: loginError.message }));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    toast.success("Welcome back! Redirecting…", {
      style: {
        borderRadius: "12px", background: "#0F172A", color: "#F8FAFC",
        fontFamily: "Poppins, sans-serif", fontSize: "14px",
      },
      iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
    });
  }

  return (
    <motion.div
      variants={cardVariants} initial="hidden" animate="visible"
      className="w-full max-w-md mx-auto"
    >
      <motion.div
        animate={shake ? shakeAnimation : {}}
        className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.15)] border border-slate-100 px-8 py-9 space-y-7"
      >
        {/* Header */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fieldVariants} className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center text-white font-bold text-base shadow-[0_8px_20px_-4px_rgba(79,70,229,0.5)]"
            >
              SC
            </motion.div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Smart Campus ERP</h2>
              <p className="text-xs text-slate-400 font-medium">Enterprise Platform · v2.0</p>
            </div>
          </motion.div>

          <motion.div variants={fieldVariants}>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-0.5">Sign in to your institutional account</p>
          </motion.div>
        </motion.div>

        {/* Form */}
        <motion.form
          variants={staggerContainer} initial="hidden" animate="visible"
          onSubmit={handleSubmit} noValidate className="space-y-4"
        >
          <motion.div variants={fieldVariants}>
            <Input
              id="email" name="email" label="Email address" type="email"
              placeholder="you@university.edu" autoComplete="email" icon={Mail}
              value={form.email} onChange={handleChange} error={errors.email}
            />
          </motion.div>

          <motion.div variants={fieldVariants}>
            <PasswordInput
              id="password" name="password" label="Password" placeholder="Min. 8 characters"
              autoComplete="current-password" value={form.password} onChange={handleChange} error={errors.password}
            />
          </motion.div>

          <motion.div variants={fieldVariants} className="flex items-center justify-between pt-0.5">
            <Checkbox id="remember" label="Remember me" checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)} />
            <Link to="/forgot-password" className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors duration-150">
              Forgot Password?
            </Link>
          </motion.div>

          {(error || errors.form) && (
            <motion.p
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="text-sm text-rose-600 text-center bg-rose-50 rounded-xl py-2.5 px-3"
            >
              {errors.form || error?.message}
            </motion.p>
          )}

          <motion.div variants={fieldVariants} className="pt-1">
            <Button type="submit" loading={isLoading} disabled={isLoading} className="w-full">
              Sign in to Dashboard
            </Button>
          </motion.div>
        </motion.form>

        <motion.p variants={fieldVariants} initial="hidden" animate="visible"
          transition={{ delay: 0.5 }} className="text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-600 hover:text-brand-700 font-semibold transition-colors duration-150">
            Sign Up
          </Link>
        </motion.p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-center text-xs text-slate-400 mt-6 font-medium"
      >
        © {new Date().getFullYear()} Smart Campus ERP · All rights reserved ·{" "}
        <button className="hover:text-slate-600 transition-colors">Privacy</button>
        {" · "}
        <button className="hover:text-slate-600 transition-colors">Terms</button>
      </motion.p>
    </motion.div>
  );
}