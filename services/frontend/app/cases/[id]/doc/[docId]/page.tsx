"use client";

import React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { SecureViewer } from "../../../../components/SecureViewer";

export default function DocumentViewerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const caseId = params?.id as string;
  const trackingId = params?.docId as string;

  const filename = searchParams?.get("filename") || trackingId;
  const hash = searchParams?.get("hash") || "N/A";
  const branchName = searchParams?.get("branch") || "UNKNOWN";

  const badgeDisplay = user ? user.badgeId : "IO-902";
  const roleDisplay = user ? user.role : "IO";
  const stationDisplay = user ? user.stationCode : "STATION_ASSAM_01";

  if (!trackingId || !caseId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col font-sans bg-gray-50">
      <div className="flex-none bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-x-3">
        <button
          onClick={() => router.push(`/cases/${caseId}`)}
          className="p-1 -ml-1 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-x-2 text-sm text-gray-500 font-medium">
          <Link href="/dashboard" className="hover:text-gray-900">
            Dashboard
          </Link>
          <span>/</span>
          <Link href={`/cases/${caseId}`} className="hover:text-gray-900">
            {caseId}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-bold truncate">{filename}</span>
        </div>
      </div>
      
      {/* Full screen Secure Viewer */}
      <div className="flex-1 flex overflow-hidden min-h-0 container mx-auto py-4 px-4 w-full h-full max-w-7xl">
         <div className="w-full h-full bg-white border border-gray-200 shadow-sm rounded-md flex flex-col overflow-hidden text-sm">
           <SecureViewer
             documentId={trackingId}
             filename={filename}
             fileHash={hash}
             branchName={branchName}
             badgeId={badgeDisplay}
             role={roleDisplay}
             stationCode={stationDisplay}
           />
         </div>
      </div>
    </div>
  );
}
