import LoginBranding from "./LoginBranding";
import RegisterForm from "./RegisterForm";

/**
 * Register page — mirrors the Login page layout exactly:
 * Left: LoginBranding panel (already built, reused as-is)
 * Right: RegisterForm card
 *
 * No logic lives here — all form handling is in RegisterForm.jsx
 */
export default function Register() {
  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Left — branding panel (desktop only, reused from Login) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%]">
        <LoginBranding />
      </div>

      {/* Right — register form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:px-12">
        {/* Mobile-only top branding badge (same as Login) */}
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            SC
          </div>
          <span className="font-bold text-slate-800 text-base">
            Smart Campus ERP
          </span>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}