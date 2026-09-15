/**
 * SecureVault Client API
 * Utilitarian fetch wrappers connecting directly to the FastAPI engine.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const ENGINE_BASE = API_BASE.replace(/\/api\/v1\/?$/, "");

export interface CaseDocumentItem {
  id?: string;
  filename: string;
  hash: string;
}

export interface CaseBranch {
  id?: string;
  name: string;
  min_clearance: number;
  documents: CaseDocumentItem[];
}

export interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  origin_station: string;
  classification_tier: number;
  status: "OPEN" | "UNDER_REVIEW" | "CLOSED" | string;
  summary: string;
  tags: string[];
  branches?: CaseBranch[];
  similarity_score?: number;
}

export interface CaseSearchResponse {
  query: string;
  results_count: number;
  results: CaseItem[];
}

export interface UploadResponse {
  status: string;
  tracking_id: string;
  filename: string;
  message: string;
}

export interface DocumentMetadataResponse {
  id: string;
  filename: string;
  file_hash: string;
  leaf_hash?: string;
  ocr_text: string;
  extracted_entities: Record<string, string[]>;
  classification_tier: number;
  hitl_required?: boolean;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  doc_hash: string;
  leaf_hash: string;
  signature: string;
  user_pub_key: string;
  metadata: {
    tracking_id?: string;
    user_id?: string;
    role?: string;
    station_code?: string;
    filename?: string;
    hitl_required?: boolean;
    [key: string]: any;
  };
}

export interface AuditLogResponse {
  merkle_root: string;
  total_transactions: number;
  entries: AuditEntry[];
}

export async function fetchCases(clearanceTier: number = 3): Promise<CaseItem[]> {
  const response = await fetch(`${API_BASE}/cases?clearance_tier=${clearanceTier}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch cases: ${response.status}`);
  }
  return response.json();
}

export async function fetchCaseById(
  caseId: string,
  clearanceTier: number = 3
): Promise<CaseItem> {
  const response = await fetch(
    `${API_BASE}/cases/${encodeURIComponent(caseId)}?clearance_tier=${clearanceTier}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch case ${caseId}: ${response.status}`);
  }
  return response.json();
}

export async function fetchDocumentMetadata(
  docId: string
): Promise<DocumentMetadataResponse> {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(docId)}/metadata`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch document metadata: ${response.status}`);
  }
  return response.json();
}

export async function searchCases(
  query: string,
  clearanceTier: number = 3,
  userId: string = "IO_OFFICER_902"
): Promise<CaseItem[]> {
  const params = new URLSearchParams({
    q: query,
    clearance_tier: clearanceTier.toString(),
    user_id: userId,
  });
  const response = await fetch(`${API_BASE}/cases/search?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to perform semantic search: ${response.status}`);
  }
  const data: CaseSearchResponse = await response.json();
  return data.results;
}

export async function uploadDocument(
  file: File,
  userId: string = "IO_OFFICER_902",
  role: string = "IO",
  stationCode: string = "STATION_ASSAM_01",
  classificationTier: number = 2
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  formData.append("role", role);
  formData.append("station_code", stationCode);
  formData.append("classification_tier", classificationTier.toString());

  const response = await fetch(`${API_BASE}/documents/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ingest failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function getAuditLog(): Promise<AuditLogResponse> {
  const response = await fetch(`${API_BASE}/ledger/audit`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Ledger fetch failed with status ${response.status}`);
  }

  return response.json();
}

export function getDocumentViewUrl(
  trackingId: string,
  userId: string = "IO_OFFICER_902",
  role: string = "IO",
  stationCode: string = "STATION_ASSAM_01",
  clearanceTier: number = 3
): string {
  return `${API_BASE}/documents/${encodeURIComponent(
    trackingId
  )}/view?user_id=${encodeURIComponent(
    userId
  )}&role=${encodeURIComponent(role)}&station_code=${encodeURIComponent(
    stationCode
  )}&clearance_tier=${clearanceTier}`;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ENGINE_BASE}/health`, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
