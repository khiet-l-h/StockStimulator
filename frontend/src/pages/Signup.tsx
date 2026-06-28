import { useGoogleLogin } from "@react-oauth/google";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Signup() {
  const { signup, googleLogin, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      setIsSubmitting(true);
      try {
        await googleLogin(tokenResponse.access_token);
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: () => setError("Google sign-in failed. Please try again."),
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) return <div className="min-h-screen bg-white dark:bg-navy-900" />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setIsSubmitting(true);
    try {
      await signup(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-mint/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="text-4xl font-bold text-mint mb-2 inline-block">
            FinSim
          </Link>
          <p className="text-slate-500 text-sm mt-2">AI-powered paper trading · no real money involved</p>
        </div>

        <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl p-8 shadow-dark-lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Create your account</h2>
          <p className="text-sm text-slate-500 mb-6">
            Start with <span className="text-mint font-semibold">$100,000</span> in virtual cash
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-pink-400/10 border border-pink-400/20 text-pink-500 dark:text-pink-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email" className="input-dark" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="new-password" className="input-dark" placeholder="At least 8 characters" />
            </div>
            <div className="pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-mint">
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : "Create account"}
              </button>
            </div>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-navy-600" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-navy-600" />
          </div>

          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            disabled={isSubmitting}
            className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-navy-600 transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-mint hover:text-mint-400 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
