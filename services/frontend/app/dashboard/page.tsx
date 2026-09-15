"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FolderLock,
  GitBranch,
  Search,
  FileText,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Cpu,
  Database,
  Lock,
  Tag,
  Loader2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Upload,
  RefreshCw,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import {
  CaseItem,
  fetchCases,
  searchCases,
  uploadDocument,
  getAuditLog,
  AuditLogResponse,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";

export default function OfficerDashboardPage() {
  const { user } = useAuth();
  const { searchQuery } = useSearch();
  const router = useRouter();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [searchResults, setSearchResults] = useState<CaseItem[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLoadingCases, setIsLoadingCases] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Ingestion state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ledger stats
  const [ledgerStats, setLedgerStats] = useState<AuditLogResponse | null>(null);

  // Load initial cases and audit ledger
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoadingCases(true);
      const [fetchedCases, auditData] = await Promise.all([
        fetchCases(3),
        getAuditLog().catch(() => null),
      ]);
      setCases(fetchedCases);
      if (fetchedCases.length > 0) {
        setSelectedCase(fetchedCases[0]);
      }
      if (auditData) {
        setLedgerStats(auditData);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load jurisdiction cases.");
    } finally {
      setIsLoadingCases(false);
    }
  };

  // Debounced Semantic Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchCases(
          searchQuery.trim(),
          3,
          user?.badgeId || "IO_RAJESH_902"
        );
        setSearchResults(results);
      } catch (err: any) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadSuccessMsg(null);
      const res = await uploadDocument(
        file,
        user?.badgeId || "IO-902",
        user?.role || "IO",
        user?.stationCode || "STATION_ASSAM_01",
        2
      );
      setUploadSuccessMsg(`Document ${file.name} encrypted & anchored to Merkle ledger.`);
      const updatedAudit = await getAuditLog().catch(() => null);
      if (updatedAudit) setLedgerStats(updatedAudit);
      setTimeout(() => setUploadSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const displayedCases = searchResults !== null ? searchResults : cases;

  return (
    <div className="text-gray-900 flex flex-col gap-y-4 p-4 lg:px-8 lg:py-6 max-w-[1600px] mx-auto h-[calc(100vh-64px)] w-full">
      {/* Upload Notification Banner */}
      {uploadSuccessMsg && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center justify-between text-xs text-green-800 animate-in fade-in shrink-0 shadow-sm">
          <div className="flex items-center gap-x-3 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span className="truncate font-medium">{uploadSuccessMsg}</span>
          </div>
          <button
            onClick={() => setUploadSuccessMsg(null)}
            className="text-green-700 hover:text-green-900 text-xs font-semibold shrink-0 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 3-Column Enterprise GovTech Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN (25% / 3 cols): "My Assigned Cases"          */}
        {/* ======================================================== */}
        <aside className="col-span-12 lg:col-span-3 h-full overflow-y-auto lg:pr-2 flex flex-col gap-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
            <div className="bg-gray-50 px-4 h-12 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-x-3 text-xs font-bold text-gray-700 uppercase tracking-wider min-w-0">
                <FolderLock className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="truncate">Assigned Cases</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-200 border border-gray-300 rounded-full text-gray-700 font-semibold shrink-0">
                {cases.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {isLoadingCases ? (
                <div className="p-6 text-center text-xs text-gray-500 flex flex-col items-center gap-y-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <p>Loading jurisdiction dockets...</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  No cases assigned block.
                </div>
              ) : (
                cases.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
                  const isOpen = c.status === "OPEN";
                  return (
                    <div
                      key={c.id}
                      onClick={() => router.push(`/cases/${c.id}`)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 border-l-4 border-l-blue-700"
                          : "hover:bg-gray-50 text-gray-600 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-x-2">
                        <span className={`text-xs font-bold font-mono truncate flex items-center gap-x-1.5 hover:underline min-w-0 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          <span className="truncate">{c.case_number}</span>
                          <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            isOpen
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <p className={`text-xs mt-1.5 truncate font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                        {c.title}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 font-mono gap-x-2">
                        <span className="shrink-0">Tier {c.classification_tier}</span>
                        <span className="truncate">{c.origin_station}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Ingest Button inside Left Bar */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 shrink-0 flex flex-col">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleQuickUpload}
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-10 px-3 flex items-center justify-center gap-x-3 bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <Upload className="w-4 h-4 text-blue-700 shrink-0" />
                )}
                <span className="truncate">{isUploading ? "Sealing Evidence..." : "Ingest Case Evidence"}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* CENTER COLUMN (50% / 6 cols): Main Content Area          */}
        {/* ======================================================== */}
        <main className="col-span-12 lg:col-span-6 h-full overflow-y-auto lg:px-2 flex flex-col gap-y-4">
          {/* Header Title / Search Status */}
          <div className="flex items-center justify-between bg-white border border-gray-200 px-5 h-20 rounded-xl shadow-sm shrink-0">
            <div className="flex flex-col justify-center min-w-0 pr-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-x-2.5 truncate">
                {searchQuery ? (
                  <>
                    <Sparkles className="w-5 h-5 text-blue-700 shrink-0" />
                    <span className="truncate">Semantic Vector Search Results</span>
                  </>
                ) : (
                  <>
                    <FolderLock className="w-5 h-5 text-blue-700 shrink-0" />
                    <span className="truncate">High Priority Legal Dockets</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {searchQuery
                  ? `Natural language query matching across 384-dimensional embeddings.`
                  : "Section 65B certified evidence repositories & FSL forensic branches"}
              </p>
            </div>

            {isSearching && (
              <div className="flex items-center gap-x-3 text-xs text-blue-700 font-medium shrink-0">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span>Vectorizing...</span>
              </div>
            )}
          </div>

          {/* Search Result Cards or Default Trending Cards */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-y-4 pb-4 px-1">
            {isSearching ? (
              <div className="p-12 flex flex-col items-center bg-white border border-gray-200 rounded-xl gap-y-4 shadow-sm h-full justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-600 font-medium text-center">
                  Performing cosine similarity match on legal text...
                </p>
              </div>
            ) : displayedCases.length === 0 ? (
              <div className="p-12 flex flex-col items-center bg-gray-50 border border-gray-200 rounded-xl gap-y-2 shadow-sm text-center h-full justify-center">
                <AlertCircle className="w-8 h-8 text-gray-400" />
                <p className="text-sm font-semibold text-gray-900 mt-2">No matching cases found</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Try searching for keywords like "ransomware", "UPI", "hospital", or "narcotics".
                </p>
              </div>
            ) : (
              displayedCases.map((caseItem) => {
                const isSelected = selectedCase?.id === caseItem.id;
                const matchPct = caseItem.similarity_score
                  ? Math.round(caseItem.similarity_score * 100)
                  : null;

                return (
                  <div
                    key={caseItem.id}
                    onClick={() => router.push(`/cases/${caseItem.id}`)}
                    className={`bg-white border rounded-xl p-5 shadow-sm transition-all cursor-pointer flex flex-col ${
                      isSelected
                        ? "border-blue-500 ring-1 ring-blue-500/50 bg-blue-50/10"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                  >
                    {/* Top Row: Case Number, Match Confidence & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-x-3 min-w-0">
                        <span className="text-sm font-bold font-mono text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200 hover:underline shrink-0">
                          {caseItem.case_number}
                        </span>
                        <span className="text-xs text-gray-500 font-medium truncate">
                          {caseItem.origin_station}
                        </span>
                      </div>

                      <div className="flex items-center gap-x-2 shrink-0">
                        {matchPct !== null && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-x-1.5">
                            <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{matchPct}% Match</span>
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded border ${
                            caseItem.status === "OPEN"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {caseItem.status}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-gray-900 mb-3 leading-snug hover:text-blue-700 transition-colors">
                      {caseItem.title}
                    </h3>

                    {/* Clean Incident Summary */}
                    <div className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3.5 rounded-lg border border-gray-200 mb-4 space-y-1.5 line-clamp-3">
                      {caseItem.summary
                        .split("\n")
                        .filter((line) => line.trim() && !line.startsWith("#"))
                        .map((line, idx) => (
                          <p key={idx}>{line.replace(/^-\s*/, "• ")}</p>
                        ))}
                    </div>

                    {/* Tags & Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                      <div className="flex flex-wrap gap-2">
                        {caseItem.tags?.slice(0, 4).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium max-w-[120px] truncate"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-x-2 shrink-0 ml-2">
                        {caseItem.branches && (
                          <span className="text-[11px] text-blue-700 font-semibold flex items-center gap-x-1.5 hover:underline">
                            <GitBranch className="w-3.5 h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">{caseItem.branches.length} Branches &bull; Open Evidence</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* ======================================================== */}
        {/* RIGHT COLUMN (25% / 3 cols): Tasks & Audit Alerts        */}
        {/* ======================================================== */}
        <aside className="col-span-12 lg:col-span-3 h-full overflow-y-auto lg:pl-2 flex flex-col gap-y-4">
          {/* Pending Tasks Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-x-3 text-xs font-bold text-gray-800 uppercase tracking-wider min-w-0">
                <FileCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="truncate">Pending Tasks</span>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold tracking-tight shrink-0">
                3 REQUIRED
              </span>
            </div>

            <div className="flex flex-col gap-y-3 text-xs overflow-y-auto">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col gap-y-2 hover:border-gray-300 transition-colors shadow-sm">
                <div className="flex items-center justify-between font-semibold text-gray-900 gap-x-2">
                  <span className="truncate">Approve IO Upload</span>
                  <span className="text-[10px] text-amber-600 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">FIR-45</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">
                  Hospital server RAM dump requires SHO validation before anchoring.
                </p>
                <button
                  onClick={() => alert("Task: SHO Approval recorded in audit trail.")}
                  className="w-full h-8 mt-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded transition-colors flex items-center justify-center shrink-0"
                >
                  Authorize Ingestion
                </button>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col gap-y-2 hover:border-gray-300 transition-colors shadow-sm">
                <div className="flex items-center justify-between font-semibold text-gray-900 gap-x-2">
                  <span className="truncate">Review Forensic Report</span>
                  <span className="text-[10px] text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">FIR-12</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">
                  State FSL chemical purity assay uploaded for Operation Narc-Shield.
                </p>
                <button
                  onClick={() => alert("Task: Section 65B signature verified.")}
                  className="w-full h-8 mt-1 text-[11px] font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded transition-colors flex items-center justify-center shrink-0"
                >
                  Verify Certificate
                </button>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col gap-y-2 hover:border-gray-300 transition-colors shadow-sm">
                <div className="flex items-center justify-between font-semibold text-gray-900 gap-x-2">
                  <span className="truncate">Subpoena Execution</span>
                  <span className="text-[10px] text-green-700 font-mono bg-green-50 px-1.5 py-0.5 rounded border border-green-200 shrink-0">FIR-88</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">
                  UPI spoof gateway bank logs ready for judicial submission.
                </p>
                <button
                  onClick={() => alert("Task: Subpoena dispatch scheduled.")}
                  className="w-full h-8 mt-1 text-[11px] font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded transition-colors flex items-center justify-center shrink-0"
                >
                  Generate Docket
                </button>
              </div>
            </div>
          </div>

          {/* System & Ledger Status Widget */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col shrink-0">
            <div className="flex items-center gap-x-3 text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3 mb-3">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
              <span className="truncate">System Status</span>
            </div>

            <div className="flex flex-col gap-y-2.5 text-xs font-sans">
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200 gap-x-2 shadow-sm">
                <span className="text-gray-600 flex items-center gap-x-2 font-medium min-w-0">
                  <Cpu className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">Ledger State</span>
                </span>
                <span className="text-green-700 font-bold font-mono text-[10px] bg-green-50 px-1.5 py-0.5 rounded border border-green-200 shrink-0">
                  RFC 6962
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200 gap-x-2 shadow-sm">
                <span className="text-gray-600 flex items-center gap-x-2 font-medium min-w-0">
                  <Database className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">pgvector Metrics</span>
                </span>
                <span className="text-blue-700 font-mono text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                  384-d Cosine
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200 gap-x-2 shadow-sm">
                <span className="text-gray-600 flex items-center gap-x-2 font-medium min-w-0">
                  <Lock className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="truncate">Signatures Commit</span>
                </span>
                <span className="text-gray-900 font-mono font-semibold text-[10px] bg-white border border-gray-300 px-1.5 py-0.5 rounded shadow-sm shrink-0">
                  {ledgerStats?.total_transactions ?? 3} Tx
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
