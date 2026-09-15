"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, CheckCircle2 } from "lucide-react";
import { AuthUser, useAuth } from "../context/AuthContext";

interface LoadingTransitionProps {
  userToAuthenticate: AuthUser;
  onComplete?: () => void;
}

const LOADING_STEPS = [
  "Authenticating Credentials...",
  "Establishing Secure Connection...",
  "Loading Jurisdiction Cases...",
];

export const LoadingTransition: React.FC<LoadingTransitionProps> = ({
  userToAuthenticate,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            login(userToAuthenticate);
            if (onComplete) onComplete();
            router.push("/dashboard");
          }, 400);
          return prev;
        }
      });
    }, 800);

    return () => clearInterval(interval);
  }, [userToAuthenticate, login, onComplete, router]);

  const currentStepText = LOADING_STEPS[stepIndex];
  const isFinalStep = stepIndex === LOADING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 animate-in fade-in duration-200">
        {/* Shield Icon with Pulse Ring */}
        <div className="relative">
          <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/40 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
            <Shield className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        {/* Status Indicator */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Secure Digital Evidence Vault
          </h2>
          <p className="text-sm text-slate-400">
            Official Law Enforcement &amp; Legal DMS
          </p>
        </div>

        {/* Spinner & Active Text Step */}
        <div className="flex items-center space-x-3 px-5 py-3 bg-slate-800/80 border border-slate-700 rounded-xl shadow-md">
          {isFinalStep ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-200">
            {currentStepText}
          </span>
        </div>

        {/* Step dots */}
        <div className="flex items-center space-x-2 pt-2">
          {LOADING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === stepIndex
                  ? "w-6 bg-blue-500"
                  : idx < stepIndex
                  ? "w-2 bg-blue-400"
                  : "w-2 bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
