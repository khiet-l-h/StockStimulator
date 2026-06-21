import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-xl font-bold text-gray-900 shrink-0 hover:text-blue-600 transition-colors"
        >
          FinSim
        </button>
        <div className="flex-1 max-w-md">
          <SearchBar />
        </div>
        <button
          onClick={() => void handleLogout()}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
        >
          Sign out
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}
