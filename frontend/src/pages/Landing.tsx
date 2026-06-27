import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "$100K Virtual Cash",
    desc: "Start trading immediately with $100,000 in simulated funds. Build confidence before committing real money.",
    accent: "text-mint",
    border: "border-mint/25",
    bg: "bg-mint/5",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Live Market Data",
    desc: "Real stock prices, interactive charts, 52-week highs/lows, and company fundamentals refreshed daily.",
    accent: "text-cyan-500 dark:text-cyan-400",
    border: "border-cyan-400/25",
    bg: "bg-cyan-400/5",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: "AI Stock Analysis",
    desc: "Gemini-powered BUY / HOLD / SELL recommendations backed by real data — not hallucinations.",
    accent: "text-violet-600 dark:text-violet-400",
    border: "border-violet-400/25",
    bg: "bg-violet-400/5",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    title: "Portfolio & History",
    desc: "Track every position, realized P&L, and trade decision. Review your history to improve over time.",
    accent: "text-pink-600 dark:text-pink-400",
    border: "border-pink-400/25",
    bg: "bg-pink-400/5",
  },
];

const steps = [
  { num: "01", title: "Create a free account", desc: "Sign up in seconds — no card required." },
  { num: "02", title: "Search any stock", desc: "AAPL, TSLA, GOOGL — get live data instantly." },
  { num: "03", title: "Trade & learn", desc: "Buy and sell with virtual cash, track your P&L." },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-slate-200 dark:border-navy-700">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <span className="text-lg font-bold text-mint">
            FinSim
          </span>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link to="/dashboard" className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-mint text-navy-900 hover:bg-mint-400 transition-all shadow-glow-mint-sm">
                Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors px-4 py-1.5 rounded-lg">
                  Sign In
                </Link>
                <Link to="/signup" className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-mint text-navy-900 hover:bg-mint-400 transition-all shadow-glow-mint-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-14 text-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-mint/8 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-cyan-500/6 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-navy-800 border border-slate-300 dark:border-navy-600 text-slate-600 dark:text-slate-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-widest uppercase">
            Educational simulation · No real money
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 text-slate-900 dark:text-white">
            Master the markets.
            <br />
            <span className="text-mint">Risk‑free.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Trade real stocks with $100,000 in virtual cash, get AI-powered analysis,
            and build investing skills — without risking a single dollar.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="group px-8 py-3.5 rounded-xl bg-mint text-navy-900 font-bold text-base hover:bg-mint-400 transition-colors shadow-glow-mint-sm inline-flex items-center justify-center gap-2">
                Go to Dashboard
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            ) : (
              <>
                <Link to="/signup" className="group px-8 py-3.5 rounded-xl bg-mint text-navy-900 font-bold text-base hover:bg-mint-400 transition-colors shadow-glow-mint-sm inline-flex items-center justify-center gap-2">
                  Start Trading Free
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link to="/login" className="px-8 py-3.5 rounded-xl border border-slate-300 dark:border-navy-600 text-slate-700 dark:text-slate-300 font-medium text-base hover:border-slate-400 dark:hover:border-navy-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all inline-flex items-center justify-center">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400 dark:text-slate-600 animate-bounce">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-850/60 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x divide-slate-200 dark:divide-navy-700 text-center">
          {[
            { value: "$100K", label: "Virtual starting balance" },
            { value: "Free", label: "No credit card needed" },
            { value: "AI", label: "Gemini-powered insights" },
          ].map(({ value, label }) => (
            <div key={label} className="px-6">
              <p className="text-3xl font-extrabold text-mint tabular-nums">{value}</p>
              <p className="text-sm text-slate-500 mt-1.5 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold mb-3 text-slate-900 dark:text-white">Everything you need to learn</h2>
            <p className="text-slate-500 text-base max-w-md mx-auto">
              A complete paper trading platform built for serious skill-building.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className={`rounded-2xl border p-6 ${f.bg} ${f.border} transition-all hover:shadow-dark`}>
                <div className={`${f.accent} mb-4`}>{f.icon}</div>
                <h3 className={`text-base font-bold mb-2 ${f.accent}`}>{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50 dark:bg-navy-850/40 border-y border-slate-200 dark:border-navy-700">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-14 text-slate-900 dark:text-white">Get started in 3 steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <p className="text-4xl font-extrabold text-mint/60 mb-4">
                  {s.num}
                </p>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 text-base">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-mint/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-xl mx-auto">
          <h2 className="text-4xl font-extrabold mb-4 text-slate-900 dark:text-white">Ready to start trading?</h2>
          <p className="text-slate-500 mb-10 text-base">Create an account in seconds. No payment, no risk.</p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/signup"}
            className="inline-block px-10 py-4 rounded-xl bg-mint text-navy-900 font-bold text-base hover:bg-mint-400 transition-colors shadow-glow-mint-sm"
          >
            {isAuthenticated ? "Go to Dashboard →" : "Get Started Free →"}
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-navy-700 py-8 px-6 text-center">
        <p className="text-lg font-bold text-mint mb-2">
          FinSim
        </p>
        <p className="text-sm text-slate-500">
          Educational simulation only. Not financial advice. No real money involved.
        </p>
      </footer>
    </div>
  );
}
