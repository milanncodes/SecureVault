"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Terminal, ShieldCheck, CheckCircle2, Cpu } from "lucide-react";
import { AuthUser, useAuth } from "../context/AuthContext";

interface SplashScreenProps {
  userToAuthenticate: AuthUser;
  onComplete?: () => void;
}

const SEQUENCE_STEPS = [
  { text: "Initializing RSA-2048 Handshake...", icon: Terminal, progress: 25 },
  { text: "Verifying Biometric WebAuthn Token...", icon: ShieldCheck, progress: 50 },
  { text: "Syncing Merkle Tree Audit Ledger...", icon: Cpu, progress: 75 },
  { text: "Access Granted.", icon: CheckCircle2, progress: 100 },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  userToAuthenticate,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Sequence step timer (500ms per step)
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < SEQUENCE_STEPS.length - 1) {
          const nextIndex = prev + 1;
          setLogs((l) => [...l, SEQUENCE_STEPS[nextIndex].text]);
          return nextIndex;
        } else {
          clearInterval(interval);
          // Sequence completed: persist auth and transition to dashboard
          setTimeout(() => {
            login(userToAuthenticate);
            if (onComplete) onComplete();
            router.push("/dashboard");
          }, 600);
          return prev;
        }
      });
    }, 500);

    // Initial log entry
    setLogs([SEQUENCE_STEPS[0].text]);

    return () => clearInterval(interval);
  }, [userToAuthenticate, login, onComplete, router]);

  const currentStep = SEQUENCE_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col items-center justify-center p-6 select-none font-mono text-[#c9d1d9]">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#30363d_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Terminal Header */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-t-lg px-4 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#fa7970]/80" />
            <span className="w-3 h-3 rounded-full bg-[#faa356]/80" />
            <span className="w-3 h-3 rounded-full bg-[#7ce38b]/80" />
            <span className="ml-2 text-xs text-[#8b949e] font-sans font-medium">
              securevault-terminal://kernel.auth
            </span>
          </div>
          <div className="text-[10px] text-[#58a6ff] bg-[#58a6ff]/10 border border-[#58a6ff]/30 px-2 py-0.5 rounded">
            PKI v2.4
          </div>
        </div>

        {/* Terminal Screen Area */}
        <div className="bg-[#010409] border-x border-b border-[#30363d] rounded-b-lg p-5 space-y-4 shadow-2xl">
          {/* Active Status Display */}
          <div className="flex items-center space-x-3 p-3 bg-[#161b22] border border-[#30363d] rounded-md">
            <div
              className={`p-2 rounded-md ${
                currentStepIndex === SEQUENCE_STEPS.length - 1
                  ? "bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40"
                  : "bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/30 animate-pulse"
              }`}
            >
              <StepIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#8b949e] font-sans uppercase tracking-wider">
                State Transition ({currentStepIndex + 1}/4)
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {currentStep.text}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-[#8b949e]">
              <span>Orchestrating Vault Session</span>
              <span className="text-[#3fb950] font-bold">
                {currentStep.progress}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#21262d] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#238636] transition-all duration-300 ease-out"
                style={{ width: `${currentStep.progress}%` }}
              />
            </div>
          </div>

          {/* Live Command Logs */}
          <div className="pt-2 border-t border-[#30363d]/60 space-y-1 text-xs">
            {logs.map((log, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-[#8b949e] text-[10px]">
                  [00:00:0{index + 1}]
                </span>
                <span className="text-[#58a6ff]">&gt;</span>
                <span
                  className={
                    index === logs.length - 1 &&
                    index === SEQUENCE_STEPS.length - 1
                      ? "text-[#3fb950] font-bold"
                      : "text-[#c9d1d9]"
                  }
                >
                  {log}
                </span>
              </div>
            ))}
            {currentStepIndex < SEQUENCE_STEPS.length - 1 && (
              <div className="flex items-center space-x-2 text-[#8b949e]">
                <span className="text-[10px]">[00:00:0{logs.length + 1}]</span>
                <span className="text-[#58a6ff]">&gt;</span>
                <span className="w-2 h-3.5 bg-[#58a6ff] animate-pulse inline-block align-middle" />
              </div>
            )}
          </div>
        </div>

        {/* Footnote */}
        <div className="text-center text-[11px] text-[#8b949e]">
          Section 65B Certified \u2022 Zero-Egress Memory Isolation
        </div>
      </div>
    </div>
  );
};
