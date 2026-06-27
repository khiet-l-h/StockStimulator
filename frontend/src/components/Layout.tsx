import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";

export default function Layout({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-slate-200 dark:border-navy-700">
        {/* Primary row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            to="/"
            className="text-lg font-bold shrink-0 text-mint hover:opacity-80 transition-opacity"
          >
            FinSim
          </Link>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-sm text-slate-500 dark:text-slate-500 truncate max-w-[160px]">
                {user.email}
              </span>
            )}
            <ThemeToggle />
            <button
              onClick={() => void handleLogout()}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-navy-600 hover:border-slate-400 dark:hover:border-navy-500 transition-all duration-200"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Search row */}
        <div className="border-t border-slate-100 dark:border-navy-800 bg-slate-50/60 dark:bg-navy-900/60 px-4 sm:px-6 py-2.5 flex justify-center">
          <div className="w-full max-w-lg">
            <SearchBar />
          </div>
        </div>
      </header>

      <main className="animate-fade-in">{children}</main>
    </div>
  );
}
