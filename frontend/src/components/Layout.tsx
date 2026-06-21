import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";

export default function Layout({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <header className="sticky top-0 z-40 bg-navy-900/80 backdrop-blur-md border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="text-lg font-bold shrink-0 bg-gradient-to-r from-mint to-cyan-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            FinSim
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-sm">
            <SearchBar />
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-xs text-slate-500 truncate max-w-[140px]">
                {user.email}
              </span>
            )}
            <button
              onClick={() => void handleLogout()}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-navy-600 hover:border-navy-500 transition-all duration-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="animate-fade-in">{children}</main>
    </div>
  );
}
