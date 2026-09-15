"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, Building, UserCheck } from "lucide-react";
import { UserRole, AuthUser } from "../context/AuthContext";
import { TermsModal } from "../components/TermsModal";
import { LoadingTransition } from "../components/LoadingTransition";

export default function LoginPage() {
  const [badgeId, setBadgeId] = useState<string>("IO-902");
  const [stationCode, setStationCode] = useState<string>("STATION_ASSAM_01");
  const [role, setRole] = useState<UserRole>("IO");

  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showLoadingState, setShowLoadingState] = useState<boolean>(false);

  const handleAuthenticateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId.trim() || !stationCode.trim()) {
      return;
    }
    setShowTermsModal(true);
  };

  const handleTermsConfirm = () => {
    setShowTermsModal(false);
    setShowLoadingState(true);
  };

  const userToAuthenticate: AuthUser = {
    badgeId: badgeId.trim() || "IO-902",
    role,
    stationCode: stationCode.trim() || "STATION_ASSAM_01",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-gray-900 font-sans relative">
      {/* Centered Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">
        {/* Header with Official Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 bg-white border border-gray-200 rounded-xl flex items-center justify-center p-2 shadow-sm">
            <Image
              src="/logo.png"
              alt="Department Logo"
              width={72}
              height={72}
              className="w-16 h-16 object-contain rounded-lg"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Secure Digital Evidence Vault
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Department of Legal &amp; Investigation Services
            </p>
          </div>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleAuthenticateSubmit} className="space-y-4 pt-2">
          {/* Officer Badge ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="badgeId"
              className="block text-sm font-medium text-gray-700"
            >
              Officer Badge ID
            </label>
            <div className="relative">
              <input
                id="badgeId"
                type="text"
                required
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="e.g. IO-902 / SHO-101"
                className="w-full h-10 px-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-sm"
              />
            </div>
          </div>

          {/* Jurisdiction / Station Code */}
          <div className="space-y-1.5">
            <label
              htmlFor="stationCode"
              className="block text-sm font-medium text-gray-700"
            >
              Jurisdiction / Station Code
            </label>
            <div className="relative">
              <input
                id="stationCode"
                type="text"
                required
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value)}
                placeholder="e.g. STATION_ASSAM_01"
                className="w-full h-10 px-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-sm"
              />
            </div>
          </div>

          {/* Role Authorization Dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              Role Authorization
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors cursor-pointer shadow-sm"
            >
              <option value="IO">Investigating Officer (IO)</option>
              <option value="SHO">Station House Officer (SHO)</option>
              <option value="Magistrate">Judicial Magistrate</option>
              <option value="Admin">Security Administrator</option>
            </select>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            className="w-full h-10 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-white mt-2"
          >
            Authenticate Session
          </button>
        </form>

        {/* Security Footer Note */}
        <div className="pt-4 border-t border-gray-200 text-center mt-6">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-x-2">
            <Lock className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate">Section 65B Certified &bull; Immutable Audit Logging</span>
          </p>
        </div>
      </div>

      {/* Security Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        role={role}
        badgeId={badgeId}
        stationCode={stationCode}
        onClose={() => setShowTermsModal(false)}
        onConfirm={handleTermsConfirm}
      />

      {/* Fullscreen Loading State */}
      {showLoadingState && (
        <LoadingTransition userToAuthenticate={userToAuthenticate} />
      )}
    </div>
  );
}
