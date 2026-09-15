import React from "react";
import { ShieldAlert, AlertTriangle, Scale, Shield, Check } from "lucide-react";
import { UserRole } from "../context/AuthContext";

interface TermsModalProps {
  isOpen: boolean;
  role: UserRole;
  badgeId: string;
  stationCode: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  role,
  badgeId,
  stationCode,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div className="bg-white border border-gray-200 text-gray-900 rounded-xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Warning Header */}
        <div className="bg-red-50 border-b border-red-200 p-4 flex items-center justify-center gap-x-3 shrink-0">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
          <h2 className="text-base font-bold text-red-900 uppercase tracking-widest truncate">
            Restricted Government System
          </h2>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <p className="text-sm font-semibold text-gray-800 leading-relaxed text-center">
            You are accessing a secure law enforcement database. Unauthorized access
            or dissemination is punishable under the Information Technology Act, 2000
            and Bharatiya Nyaya Sanhita (BNS), 2023.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center gap-x-3 text-gray-600">
              <span className="font-semibold w-24 shrink-0">Officer ID:</span>
              <span className="font-mono text-gray-900 font-bold truncate">{badgeId}</span>
            </div>
            <div className="flex items-center gap-x-3 text-gray-600">
              <span className="font-semibold w-24 shrink-0">Clearance:</span>
              <span className="font-mono text-gray-900 font-bold truncate">{role} (Tier 1-3)</span>
            </div>
            <div className="flex items-center gap-x-3 text-gray-600">
              <span className="font-semibold w-24 shrink-0">Jurisdiction:</span>
              <span className="font-mono text-gray-900 font-bold truncate">{stationCode}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-x-3">
              <Scale className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                By proceeding, you agree that your cryptographic signature and session activity will be permanently anchored to the RFC 6962 immutable ledger to comply with Section 65B evidential admissibility.
              </p>
            </div>
            <div className="flex items-start gap-x-3">
              <Shield className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Your IP address, MAC address, and action traces are subjected to continuous active monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-x-3 shrink-0">
          <button
            onClick={onClose}
            className="h-10 px-4 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors flex items-center justify-center shrink-0"
          >
            Cancel &amp; Exit
          </button>
          <button
            onClick={onConfirm}
            className="h-10 px-4 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors flex items-center justify-center gap-x-2 shrink-0"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>I Accept &amp; Acknowledge</span>
          </button>
        </div>
      </div>
    </div>
  );
};
