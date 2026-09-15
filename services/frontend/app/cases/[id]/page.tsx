"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Folder,
  FolderOpen,
  FileText,
  UploadCloud,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  CaseItem,
  fetchCaseById,
  uploadDocument,
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { UploadStaircase } from "../../components/UploadStaircase";
import { MarkdownViewer } from "../../components/MarkdownViewer";

export default function CaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id as string;
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Nested directory tree toggle state
  const [openBranches, setOpenBranches] = useState<Record<string, boolean>>({
    FIR: true,
    FORENSICS: true,
  });

  // Uploading state
  const [activeUpload, setActiveUpload] = useState<{
    trackingId: string;
    filename: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!caseId) return;
    loadCase();
  }, [caseId]);

  const loadCase = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCaseById(caseId, 3);
      setCaseData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load case docket.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadDocument(
        file,
        user?.badgeId || "IO-902",
        user?.role || "IO",
        user?.stationCode || "STATION_ASSAM_01",
        2
      );

      setActiveUpload({
        trackingId: res.tracking_id,
        filename: file.name,
      });

      // Optimistically add simulated file to FORENSICS branch
      setCaseData((prev) => {
        if (!prev) return prev;
        const branches = [...(prev.branches || [])];
        let branch = branches.find((b) => b.name === "FORENSICS");
        if (!branch) {
          branch = { name: "FORENSICS", min_clearance: 2, documents: [] };
          branches.push(branch);
        }
        branch.documents = [
          {
            id: res.tracking_id,
            filename: file.name,
            hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            trackingId: res.tracking_id,
          },
          ...branch.documents,
        ];
        return { ...prev, branches };
      });
      // ensure it is expanded to show upload
      setOpenBranches((p) => ({ ...p, FORENSICS: true }));
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStaircaseComplete = () => {
    if (activeUpload) {
      setActiveUpload(null);
    }
  };

  const toggleBranch = (branchName: string) => {
    setOpenBranches((prev) => ({
      ...prev,
      [branchName]: !prev[branchName],
    }));
  };

  const handleDocumentClick = (doc: any, branchName: string) => {
    const trackingId = doc.trackingId || doc.id || doc.filename;
    // Route to dedicated document viewer page
    // Passing required context in query for the mock API viewer
    const query = new URLSearchParams({
      filename: doc.filename,
      hash: doc.hash,
      branch: branchName,
    }).toString();
    router.push(`/cases/${caseId}/doc/${trackingId}?${query}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-3 bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">
          Loading encrypted repository...
        </p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm flex flex-col items-center gap-y-4 max-w-md w-full">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900">Docket Not Accessible</h2>
          <p className="text-sm text-gray-600">{error || "Case docket not found."}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="h-10 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-sm font-semibold shadow-sm flex items-center justify-center w-full"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans w-full py-8 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col gap-y-8">
        
        {/* Full Screen Upload Modal (if staging an upload) */}
        {activeUpload && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-xl p-8 shadow-xl">
              <h2 className="text-lg font-bold text-gray-900 mb-6 text-center border-b border-gray-100 pb-4">
                Executing Cryptographic Ingestion
              </h2>
              <UploadStaircase
                trackingId={activeUpload.trackingId}
                filename={activeUpload.filename}
                onComplete={handleStaircaseComplete}
              />
            </div>
          </div>
        )}

        {/* 1) Top Header Area */}
        <div className="flex flex-col gap-y-3">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-x-2 text-sm text-gray-500 mb-2">
            <Link
              href="/dashboard"
              className="hover:text-blue-600 transition-colors"
            >
              Dashboard
            </Link>
            <span>/</span>
            <span>State of Assam</span>
            <span>/</span>
            <span className="text-gray-900 font-bold">{caseData.case_number}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex flex-col min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
                {caseData.title}
              </h1>
            </div>
            
            <div className="flex items-center gap-x-3 shrink-0">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border uppercase tracking-wide ${
                  caseData.status === "OPEN"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {caseData.status}
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center justify-center gap-x-2 h-9 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4 shrink-0" />
                <span>Upload Evidence</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2) The File Explorer (Main Repository View) - Nested Graph Layout */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden text-sm relative">
          {/* Table Header Wrapper */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-x-4">
            {/* Header Columns */}
            <div className="flex items-center gap-x-3 w-1/2 lg:w-1/3 min-w-[200px] shrink-0 font-semibold text-gray-600">
              Name
            </div>
            <div className="hidden sm:block flex-1 min-w-[200px] font-semibold text-gray-600">
              Evidence Branch Activity
            </div>
            <div className="hidden lg:block w-32 shrink-0 font-semibold text-gray-600 text-right">
              Cryptographic Hash
            </div>
          </div>

          <div className="flex flex-col relative pb-1">
            {(caseData.branches || []).length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 italic">
                This repository is empty.
              </div>
            )}
            
            {caseData.branches?.map((branch, branchIdx) => {
              const isOpen = !!openBranches[branch.name];
              const isLastBranch = branchIdx === caseData.branches!.length - 1 && !isOpen && branch.documents.length === 0;
              
              return (
                <div key={branch.name} className="flex flex-col">
                  {/* Directory Row */}
                  <div
                    onClick={() => toggleBranch(branch.name)}
                    className={`flex items-center gap-x-4 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors group ${
                      !isLastBranch ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-x-2 w-1/2 lg:w-1/3 min-w-[200px] shrink-0 relative z-10">
                      {isOpen ? (
                        <FolderOpen className="w-4 h-4 text-blue-500 shrink-0 fill-blue-500/20" />
                      ) : (
                        <Folder className="w-4 h-4 text-blue-500 shrink-0 fill-blue-500/20" />
                      )}
                      <span className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                        {branch.name}
                      </span>
                    </div>
                    <div className="hidden sm:block flex-1 min-w-[200px] text-gray-500 truncate text-xs relative z-10">
                      Update branch evidence ledger ({branch.documents.length} items)
                    </div>
                    <div className="hidden lg:block w-32 shrink-0 text-right text-gray-300 font-mono text-[11px] relative z-10">
                      --
                    </div>
                  </div>

                  {/* Document Rows (Nested Tree layout) */}
                  {isOpen && branch.documents.map((doc, idx) => {
                    const isLastDoc = idx === branch.documents.length - 1;
                    const borderCls = isLastDoc && branchIdx === caseData.branches!.length - 1 
                      ? "" 
                      : "border-b border-gray-100";
                      
                    return (
                      <div
                        key={doc.id || doc.filename}
                        onClick={() => handleDocumentClick(doc, branch.name)}
                        className={`flex items-center gap-x-4 pr-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors group relative ${borderCls}`}
                      >
                        {/* Nested Tree connector guide lines */}
                        <div className="absolute left-[23px] top-0 w-px bg-gray-200" style={{ bottom: isLastDoc ? '50%' : '0' }}></div>
                        <div className="absolute left-[23px] top-1/2 w-[18px] h-px bg-gray-200"></div>

                        <div className="w-1/2 lg:w-1/3 flex items-center shrink-0 min-w-[200px]">
                          <div className="flex items-center gap-x-2 pl-[48px] truncate relative z-10">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {doc.filename}
                            </span>
                          </div>
                        </div>

                        <div className="hidden sm:block flex-1 min-w-[200px] text-gray-500 truncate text-xs pl-2 relative z-10">
                          Anchored SHA-256 hash securely via Sec. 65B pipeline
                        </div>
                        <div className="hidden lg:block w-32 shrink-0 text-right text-gray-400 font-mono text-[11px] truncate relative z-10">
                          {doc.hash ? doc.hash.substring(0, 7) : "pending"}...
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3) The README Summary Block */}
        <div className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm mt-2 pb-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-x-2">
            <BookOpen className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-[13px] font-semibold text-gray-800">CASE_README.md</span>
          </div>
          <div className="p-8 pb-10">
            <MarkdownViewer content={caseData.summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
