import axiosServices from 'utils/axios';

// ==============================|| COMPANY BRAND THEME API ||============================== //
//
// Per-company brand theme persisted on the backend. axiosServices injects the
// Authorization + X-Role-ID headers, so the backend resolves the company from the role.
// Pure mapping + cache helpers live in utils/brandThemeCache (no axios import, so they are
// unit-testable without pulling the browser-only axios/mock chain).

/** What the client sends on PUT — heading_font is always a string ('' means default). */
export interface CompanyThemePayload {
  primary_hex: string;
  secondary_hex: string;
  heading_font: string;
  logo_url?: string | null;
  custom_font_url?: string | null;
  extracted_palette?: string[];
  overrides?: Record<string, unknown>;
}

/** What the server returns on GET — nullable fields mirror the model. */
export interface CompanyThemeResponse {
  primary_hex: string;
  secondary_hex: string;
  heading_font: string | null;
  logo_url: string | null;
  custom_font_url: string | null;
  extracted_palette: string[];
  overrides: Record<string, unknown>;
  updated_at: string;
}

/** GET the caller's company theme, or null if none is set. Readable by any member. */
export async function getCompanyTheme(): Promise<CompanyThemeResponse | null> {
  const { data } = await axiosServices.get<CompanyThemeResponse | null>('/company/theme/');
  return data ?? null;
}

/** PUT (upsert) the caller's company theme. Admin only (403 otherwise). */
export async function putCompanyTheme(payload: CompanyThemePayload): Promise<CompanyThemeResponse> {
  const { data } = await axiosServices.put<CompanyThemeResponse>('/company/theme/', payload);
  return data;
}
