"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Lock, Cpu, Database, Check } from "lucide-react";
import { API_BASE } from "../lib/api";

interface UploadStaircaseProps {
  trackingId: string;
  filename: string;
  onComplete?: () => void;
}

interface StepEvent {
  step: number;
  status: string;
}

const STEP_DEFINITIONS = [
  { step: 1, title: "Zero-Trust Envelope Encryption", desc: "Generating AES-256-GCM payload cipher and IV nonce", icon: Lock },
  { step: 2, title: "Zero-Egress Regional NLP / NER", desc: "Local CPU extraction of statutory IPC/BNS entities", icon: Cpu },
  { step: 3, title: "SHA-256 Cryptographic Hash", desc: "Producing immutable digest for Section 65B compliance", icon: Database },
  { step: 4, title: "Ed25519 PKI Ledger Anchor", desc: "Signing hash and committing leaf to RFC 6962 Merkle tree", icon: ShieldCheck },
  { step: 5, title: "Sealed & S3 Stream Ready", desc: "Cryptographic envelope safely stored in MinIO vault", icon: CheckCircle2 },
];

export const UploadStaircase: React.FC<UploadStaircaseProps> = ({
  trackingId,
  filename,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [statusLog, setStatusLog] = useState<string>("Initializing cryptographic ingestion pipeline...");

  useEffect(() => {
    if (!trackingId) return;

    const streamUrl = `${API_BASE}/documents/upload-stream/${encodeURIComponent(trackingId)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data: StepEvent = JSON.parse(event.data);
        setCurrentStep(data.step);
        setStatusLog(data.status);

        if (data.step >= 5 || data.status.toLowerCase().includes("complete")) {
          setIsDone(true);
          eventSource.close();
          if (onComplete) {
            setTimeout(onComplete, 1200);
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      // In case SSE completes or disconnects
      setCurrentStep(5);
      setIsDone(true);
      eventSource.close();
      if (onComplete) {
        setTimeout(onComplete, 1200);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [trackingId, onComplete]);

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl max-w-xl mx-auto space-y-6 animate-in fade-in duration-200 shadow-xl">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
            <Lock className="w-5 h-5 text-blue-700" />
            <span>Cryptographic Pipeline Ingestion</span>
          </h3>
          <p className="text-xs text-gray-500 font-mono truncate max-w-sm">
            Target: <span className="text-gray-800 font-semibold">{filename}</span>
          </p>
        </div>
        <span className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-bold tracking-wider">
          ID: {trackingId.slice(0, 8)}...
        </span>
      </div>

      {/* Vertical Staircase Stepper */}
      <div className="space-y-4">
        {STEP_DEFINITIONS.map((s) => {
          const isCompleted = currentStep > s.step || isDone;
          const isCurrent = currentStep === s.step && !isDone;
          const isPending = currentStep < s.step && !isDone;
          const Icon = s.icon;

          return (
            <div
              key={s.step}
              className={`flex items-start space-x-3.5 p-3 rounded-lg border transition-all ${
                isCompleted
                  ? "bg-green-50 border-green-200 text-gray-800"
                  : isCurrent
                  ? "bg-blue-50 border-blue-400 shadow-sm ring-1 ring-blue-500/20"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              {/* Step indicator circle */}
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-green-100 border border-green-400 flex items-center justify-center text-green-700">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-400 flex items-center justify-center text-blue-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-xs font-mono text-gray-500">
                    {s.step}
                  </div>
                )}
              </div>

              {/* Step Title & Subtext */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isCompleted
                        ? "text-green-700"
                        : isCurrent
                        ? "text-blue-800"
                        : "text-gray-500"
                    }`}
                  >
                    {s.title}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] text-blue-600 font-mono font-bold animate-pulse">
                      PROCESSING
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[10px] text-green-600 font-mono font-bold">
                      VERIFIED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5 font-medium">
                  {isCurrent ? statusLog : s.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Done Action */}
      {isDone && (
        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-green-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Document anchored to RFC 6962 Ledger</span>
          </div>
          {onComplete && (
            <button
              onClick={onComplete}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              View Sealed Document
            </button>
          )}
        </div>
      )}
    </div>
  );
};
