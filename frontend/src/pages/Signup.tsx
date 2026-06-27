import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Signup() {
  const { signup, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

          <p className="mt-6 text-center text-sm text-slate-500">
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
