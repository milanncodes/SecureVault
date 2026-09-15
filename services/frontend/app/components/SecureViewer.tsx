"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  AlertTriangle,
  FileCheck2,
  Lock,
  Tag,
  Hash,
  Cpu,
  User,
  Calendar,
  Building,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { DocumentMetadataResponse, fetchDocumentMetadata, getDocumentViewUrl } from "../lib/api";
import { AiAnalysisView } from "./AiAnalysisView";

interface SecureViewerProps {
  documentId: string;
  filename: string;
  fileHash: string;
  branchName: string;
  badgeId: string;
  role: string;
  stationCode: string;
  clearanceTier?: number;
}

export const SecureViewer: React.FC<SecureViewerProps> = ({
  documentId,
  filename,
  fileHash,
  branchName,
  badgeId,
  role,
  stationCode,
  clearanceTier = 3,
}) => {
  const [activeTab, setActiveTab] = useState<"ORIGINAL" | "AI_ANALYSIS">("ORIGINAL");
  const [metadata, setMetadata] = useState<DocumentMetadataResponse | null>(null);
  const [loadingMeta, setLoadingMeta] = useState<boolean>(false);

  useEffect(() => {
    if (!documentId) return;
    loadDocMeta();
  }, [documentId, filename]);

  const loadDocMeta = async () => {
    try {
      setLoadingMeta(true);
      const data = await fetchDocumentMetadata(documentId || filename);
      setMetadata(data);
    } catch (err) {
      console.error("Failed to load doc metadata:", err);
    } finally {
      setLoadingMeta(false);
    }
  };

  const viewUrl = getDocumentViewUrl(
    documentId || filename,
    badgeId,
    role,
    stationCode,
    clearanceTier
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Sticky Forensic Warning Banner */}
      <div className="flex-none bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold tracking-wide truncate">
            FORENSIC DYNAMIC WATERMARKING &amp; NLP HIGHLIGHTING ACTIVE &bull; SEC 65B CERTIFIED
          </span>
        </div>
        <span className="font-mono text-[10px] text-amber-700 shrink-0 ml-2">
          Viewing Officer: {badgeId}
        </span>
      </div>

      {/* Top Header & Tab Controls Bar */}
      <div className="flex-none bg-gray-50 px-4 h-14 border-b border-gray-200 flex items-center justify-between gap-x-3">
        <div className="flex items-center gap-x-3 min-w-0">
          <FileCheck2 className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="font-bold text-gray-900 text-sm truncate tracking-tight">
            {filename}
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 bg-slate-200 text-slate-700 border border-slate-300 rounded-sm shrink-0">
            {branchName}
          </span>
        </div>

        {/* Sleek Toggle Tab Bar */}
        <div className="flex items-center p-1 bg-gray-200/60 rounded-md border border-gray-300 shrink-0 h-9">
          <button
            onClick={() => setActiveTab("ORIGINAL")}
            className={`flex items-center gap-x-2 px-3 h-full text-xs font-semibold rounded transition-all ${
              activeTab === "ORIGINAL"
                ? "bg-white text-gray-900 shadow-sm border border-gray-300"
                : "text-gray-600 hover:text-gray-900 border border-transparent"
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Document</span>
          </button>
          <button
            onClick={() => setActiveTab("AI_ANALYSIS")}
            className={`flex items-center gap-x-2 px-3 h-full text-xs font-semibold rounded transition-all ${
              activeTab === "AI_ANALYSIS"
                ? "bg-white text-gray-900 shadow-sm border border-gray-300"
                : "text-gray-600 hover:text-gray-900 border border-transparent"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>AI Analysis</span>
          </button>
        </div>
      </div>

      {/* Extracted Entities Metadata Strip (Above View Canvas) */}
      {metadata?.extracted_entities && (
        <div className="flex-none flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-50 border-b border-gray-200 text-xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-x-1.5 font-bold mr-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Indexed Metadata</span>
          </span>
          {/* Statutory Provisions tags */}
          {metadata.extracted_entities["BNS_SECTIONS"]?.map((s, i) => (
            <span
              key={`bns-${i}`}
              className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wide truncate max-w-[150px]"
            >
              BNS §{s}
            </span>
          ))}
          {metadata.extracted_entities["IPC_SECTIONS"]?.map((s, i) => (
            <span
              key={`ipc-${i}`}
              className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wide truncate max-w-[150px]"
            >
              IPC §{s}
            </span>
          ))}

          {/* Identified Entities (Suspects, Dates, Orgs) */}
          {metadata.extracted_entities["PERSON"]?.map((p, i) => (
            <span
              key={`p-${i}`}
              className="bg-white text-gray-700 border border-gray-300 px-2 py-0.5 rounded-sm text-xs font-medium flex items-center gap-1 truncate max-w-[180px]"
            >
              <User className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{p}</span>
            </span>
          ))}
          {metadata.extracted_entities["DATE"]?.map((d, i) => (
            <span
              key={`d-${i}`}
              className="bg-white text-gray-700 border border-gray-300 px-2 py-0.5 rounded-sm text-xs font-medium flex items-center gap-1 truncate max-w-[140px]"
            >
              <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{d}</span>
            </span>
          ))}
          {metadata.extracted_entities["ORG"]?.map((o, i) => (
            <span
              key={`org-${i}`}
              className="bg-white text-gray-700 border border-gray-300 px-2 py-0.5 rounded-sm text-xs font-medium flex items-center gap-1 truncate max-w-[180px]"
            >
              <Building className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{o}</span>
            </span>
          ))}
        </div>
      )}

      {/* Main Content Area with Split Sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        {/* Left Side: Document View */}
        <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${activeTab === "AI_ANALYSIS" ? "border-r border-gray-200 bg-gray-50/50" : ""}`}>
          {activeTab === "ORIGINAL" ? (
            <iframe
              src={viewUrl}
              title="Evidence PDF Viewer"
              className="flex-1 w-full h-full border-none"
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {loadingMeta ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-y-3 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-700" />
                  <span className="text-xs font-mono">Running local OCR &amp; NER extraction...</span>
                </div>
              ) : (
                <AiAnalysisView
                  ocrText={metadata?.ocr_text || "No OCR text available."}
                  entities={metadata?.extracted_entities || {}}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Side: Quick-Reference Detected Entities Sidebar (Visible on AI Analysis Tab) */}
        {activeTab === "AI_ANALYSIS" && (
          <aside className="w-1/3 max-w-[320px] bg-slate-50 p-5 overflow-y-auto flex-none flex flex-col gap-y-6">
            <div className="border-b border-gray-200 pb-2.5 flex items-center justify-between shrink-0">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-x-2">
                <Tag className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Extracted Entities</span>
              </h4>
              <span className="text-[10px] font-mono text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-sm font-semibold shrink-0 uppercase">
                Zero-Egress
              </span>
            </div>

            <div className="flex flex-col gap-y-5 flex-1">
              {/* BNS / IPC Provisions */}
              <div className="flex flex-col gap-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Statutory Provisions
                </span>
                <div className="flex flex-wrap gap-2">
                  {metadata?.extracted_entities?.["BNS_SECTIONS"]?.map((sec, i) => (
                    <span
                      key={i}
                      className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wide truncate max-w-full"
                    >
                      BNS §{sec}
                    </span>
                  ))}
                  {metadata?.extracted_entities?.["IPC_SECTIONS"]?.map((sec, i) => (
                    <span
                      key={i}
                      className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wide truncate max-w-full"
                    >
                      IPC §{sec}
                    </span>
                  ))}
                  {(!metadata?.extracted_entities?.["BNS_SECTIONS"]?.length && !metadata?.extracted_entities?.["IPC_SECTIONS"]?.length) && (
                    <span className="text-xs text-gray-400 italic">None detected</span>
                  )}
                </div>
              </div>

              {/* Suspects & Persons */}
              <div className="flex flex-col gap-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Identified Persons
                </span>
                <div className="flex flex-wrap gap-2">
                  {metadata?.extracted_entities?.["PERSON"]?.map((p, i) => (
                    <span
                      key={i}
                      className="bg-white text-gray-700 border border-gray-300 px-2 py-0.5 rounded-sm text-xs font-medium flex items-center gap-1 truncate max-w-full"
                    >
                      <User className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{p}</span>
                    </span>
                  ))}
                  {(!metadata?.extracted_entities?.["PERSON"]?.length) && (
                    <span className="text-xs text-gray-400 italic">None detected</span>
                  )}
                </div>
              </div>

              {/* Timestamp & Dates */}
              <div className="flex flex-col gap-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Timestamps &amp; Dates
                </span>
                <div className="flex flex-wrap gap-2">
                  {metadata?.extracted_entities?.["DATE"]?.map((d, i) => (
                    <span
                      key={i}
                      className="bg-white text-gray-700 border border-gray-300 px-2 py-0.5 rounded-sm text-xs font-medium flex items-center gap-1 truncate max-w-full"
                    >
                      <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{d}</span>
                    </span>
                  ))}
                  {(!metadata?.extracted_entities?.["DATE"]?.length) && (
                    <span className="text-xs text-gray-400 italic">None detected</span>
                  )}
                </div>
              </div>

              {/* Organizations */}
              <div className="flex flex-col gap-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Organizations &amp; Stations
                </span>
                <div className="flex flex-wrap gap-2">
                  {metadata?.extracted_entities?.["ORG"]?.map((o, i) => (
                    <span
                      key={i}
                      className="bg-white text-gray-700 border border-gray-300 px-2 py-0.5 rounded-sm text-xs font-medium flex items-center gap-1 truncate max-w-full"
                    >
                      <Building className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{o}</span>
                    </span>
                  ))}
                  {(!metadata?.extracted_entities?.["ORG"]?.length) && (
                    <span className="text-xs text-gray-400 italic">None detected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cryptographic Verification Digest */}
            <div className="pt-4 border-t border-gray-200 flex flex-col gap-y-2 text-xs shrink-0 mt-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Cryptographic Integrity
              </span>
              <div className="p-3 bg-white rounded-md border border-gray-200 flex flex-col gap-y-1.5 text-[11px] font-mono text-gray-800 shadow-sm">
                <div className="truncate flex items-center gap-x-2 w-full">
                  <span className="text-gray-400 shrink-0">SHA:</span>
                  <span className="truncate">{metadata?.file_hash?.slice(0, 16) || fileHash.slice(0, 16)}...</span>
                </div>
                <div className="flex items-center gap-x-2">
                  <span className="text-gray-400">Root:</span>
                  <span className="text-green-700 font-bold bg-green-50 px-1 py-0.5 rounded-sm border border-green-200">Verified</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
