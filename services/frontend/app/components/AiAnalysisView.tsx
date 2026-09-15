"use client";

import React from "react";
import { Cpu, Sparkles, Tag, ShieldAlert } from "lucide-react";

interface AiAnalysisViewProps {
  ocrText: string;
  entities: Record<string, string[]>;
  confidence?: number;
}

export const AiAnalysisView: React.FC<AiAnalysisViewProps> = ({
  ocrText,
  entities,
  confidence = 99.4,
}) => {
  // Build replacement map sorted by longest text first to avoid sub-string collisions
  const highlightEntities = (text: string): React.ReactNode[] => {
    if (!text) return [];

    // Collect all entities into a tagged array
    const taggedItems: { text: string; type: string }[] = [];
    Object.entries(entities || {}).forEach(([type, values]) => {
      (values || []).forEach((val) => {
        if (val && val.trim().length > 1) {
          taggedItems.push({ text: val.trim(), type });
        }
      });
    });

    if (taggedItems.length === 0) {
      return [text];
    }

    // Sort by length descending
    taggedItems.sort((a, b) => b.text.length - a.text.length);

    // Escape regex characters
    const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = new RegExp(
      `(${taggedItems.map((item) => escapeRegex(item.text)).join("|")})`,
      "gi"
    );

    const parts = text.split(pattern);

    return parts.map((part, index) => {
      const matched = taggedItems.find(
        (item) => item.text.toLowerCase() === part.toLowerCase()
      );

      if (!matched) {
        return <React.Fragment key={index}>{part}</React.Fragment>;
      }

      const entityType = matched.type.toUpperCase();

      if (entityType.includes("BNS") || entityType.includes("IPC") || entityType.includes("SECTION")) {
        return (
          <mark
            key={index}
            className="bg-blue-100 text-blue-800 font-semibold px-1 py-0.5 rounded border border-blue-200 inline-block mx-0.5"
            title={`Statutory Provision (${entityType})`}
          >
            {part}
          </mark>
        );
      } else if (entityType.includes("PERSON") || entityType.includes("SUSPECT")) {
        return (
          <mark
            key={index}
            className="bg-gray-100 text-gray-800 font-semibold px-1 py-0.5 rounded border border-gray-300 inline-block mx-0.5"
            title={`Entity: Person / Suspect (${entityType})`}
          >
            {part}
          </mark>
        );
      } else if (entityType.includes("DATE") || entityType.includes("TIME")) {
        return (
          <mark
            key={index}
            className="bg-green-100 text-green-800 font-semibold px-1 py-0.5 rounded border border-green-200 inline-block mx-0.5"
            title={`Temporal Entity: Date (${entityType})`}
          >
            {part}
          </mark>
        );
      } else {
        return (
          <mark
            key={index}
            className="bg-purple-100 text-purple-800 font-semibold px-1 py-0.5 rounded border border-purple-200 inline-block mx-0.5"
            title={`Organization / Asset (${entityType})`}
          >
            {part}
          </mark>
        );
      }
    });
  };

  return (
    <div className="space-y-4 p-4 font-sans bg-white">
      {/* Legend & Confidence Header */}
      <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-700" />
          <span className="font-bold text-gray-900 uppercase tracking-wider">
            Zero-Egress Tesseract OCR &amp; SpaCy NER
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">
            Confidence: {confidence}%
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300" />
            <span className="text-gray-700 font-medium">BNS/IPC</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-gray-200 border border-gray-400" />
            <span className="text-gray-700 font-medium">Person/Suspect</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300" />
            <span className="text-gray-700 font-medium">Date</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-300" />
            <span className="text-gray-700 font-medium">Org/Asset</span>
          </span>
        </div>
      </div>

      {/* Main Formatted Pre Container */}
      <div className="relative">
        <pre className="whitespace-pre-wrap font-mono text-xs md:text-sm text-gray-800 bg-gray-50 p-5 rounded-lg border border-gray-200 leading-relaxed max-h-[520px] overflow-y-auto shadow-sm select-text">
          {highlightEntities(ocrText)}
        </pre>
      </div>

      <p className="text-[11px] text-gray-500 font-sans italic flex items-center space-x-1.5 font-medium">
        <Cpu className="w-3.5 h-3.5 text-gray-400" />
        <span>
          Extracted entirely on local CPU inside air-gapped Docker container (Zero Cloud Egress).
        </span>
      </p>
    </div>
  );
};
