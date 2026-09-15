"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  LogOut,
  UserCheck,
  Building,
  X,
  Radio,
  FilePlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SearchProvider, useSearch } from "../context/SearchContext";
import { checkBackendHealth } from "../lib/api";

function TopNavbar() {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const router = useRouter();
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [showNewCaseModal, setShowNewCaseModal] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      const ok = await checkBackendHealth();
      setBackendOnline(ok);
    };
    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    logout();
    router.push("/login");
  };

  const badgeDisplay = user ? user.badgeId : "IO-902";
  const roleDisplay = user ? user.role : "IO";
  const stationDisplay = user ? user.stationCode : "STATION_ASSAM_01";

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-800 border-b border-slate-900 px-4 lg:px-6 h-[64px] flex flex-col justify-center shadow-sm shrink-0">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-x-4">
          {/* Left: Brand / Logo */}
          <div
            onClick={() => {
              setSearchQuery("");
              router.push("/dashboard");
            }}
            className="flex items-center gap-x-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-10 h-10 bg-white border border-slate-300 rounded-xl flex items-center justify-center p-1 shadow-sm shrink-0">
              <Image
                src="/logo.png"
                alt="Department Logo"
                width={36}
                height={36}
                className="w-8 h-8 object-contain rounded-lg"
                priority
              />
            </div>
            <div className="hidden sm:flex sm:flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight truncate">
                Secure Evidence Vault
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                GovTech Section 65B &bull; Assam Jurisdiction
              </span>
            </div>
          </div>

          {/* Center: Wide Semantic Search Bar */}
          <div className="flex-1 max-w-xl mx-2 min-w-0">
            <div className="relative flex items-center w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases, suspects, or IPC sections..."
                className="w-full h-10 pl-9 pr-8 text-sm text-slate-100 bg-slate-900 border border-slate-700 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors truncate shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-slate-400 hover:text-white p-1 rounded shrink-0 flex items-center justify-center"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* Right: User Profile Widget & Actions */}
          <div className="flex items-center gap-x-3 shrink-0">
            {/* Backend Connectivity Pill */}
            <div className="hidden md:flex items-center gap-x-2 px-2.5 h-10 rounded-md border border-slate-700 bg-slate-900 text-xs shrink-0 shadow-sm">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  backendOnline ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-slate-300 font-mono text-[11px] truncate">
                {backendOnline ? "Engine: 8000" : "Offline"}
              </span>
            </div>

            {/* Officer Profile Badge */}
            <div className="flex items-center gap-x-2 px-3 h-10 rounded-md border border-slate-700 bg-slate-900 text-xs text-slate-200 shrink-0 shadow-sm">
              <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex flex-col text-left leading-none min-w-0">
                <span className="text-white text-xs font-semibold truncate max-w-[100px]">
                  {badgeDisplay}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                  {roleDisplay} &bull; {stationDisplay.slice(0, 10)}
                </span>
              </div>
            </div>

            {/* New Case Button */}
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="flex items-center justify-center gap-x-2 px-4 h-10 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-semibold rounded-md shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline truncate">New Case</span>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 rounded-md transition-colors shrink-0 shadow-sm"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* New Case Action Modal / Dialog - Light Theme for main app */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 text-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-x-2 font-bold text-base text-gray-900 min-w-0">
                <FilePlus className="w-5 h-5 text-blue-700 shrink-0" />
                <span className="truncate">Register New Criminal Case</span>
              </div>
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 shrink-0"
              >
                <X className="w-4 h-4 shrink-0" />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Under Section 154 CrPC / Bharatiya Nagarik Suraksha Sanhita (BNSS),
              electronic First Information Reports must be signed using the
              jurisdictional Station Master Key.
            </p>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col gap-y-2 text-xs">
              <div className="text-gray-600 flex items-center gap-x-2 min-w-0">
                <span className="shrink-0">Authorizing Officer:</span>
                <span className="text-gray-900 font-mono font-medium truncate">{badgeDisplay} ({roleDisplay})</span>
              </div>
              <div className="text-gray-600 flex items-center gap-x-2 min-w-0">
                <span className="shrink-0">Jurisdiction:</span>
                <span className="text-gray-900 font-mono font-medium truncate">{stationDisplay}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-x-3 pt-2">
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="px-4 h-10 flex flex-col justify-center items-center text-xs text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors shadow-sm shrink-0"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Case generation request initiated under authorization of ${badgeDisplay}.`);
                  setShowNewCaseModal(false);
                }}
                className="px-4 h-10 flex flex-col justify-center items-center text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition-colors shadow-sm shrink-0"
              >
                Create FIR Docket
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SearchProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans overflow-hidden">
        <TopNavbar />
        {/* Adjusted padding to 0 or controlled padding to fit exactly into h-[calc(100vh-64px)] if needed */}
        {/* We keep p-4 lg:p-6 but use flex-1 min-h-0 to contain cases/[id] correctly. */}
        <div className="flex-1 w-full flex flex-col min-h-0">{children}</div>
      </div>
    </SearchProvider>
  );
}
