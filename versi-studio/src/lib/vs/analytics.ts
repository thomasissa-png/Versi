export type AnalyticsEvent =
  | "lot_auto_created"
  | "lot_auto_validated"
  | "lot_manually_adjusted"
  | "ia_fallback_triggered";

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  project_id: string;
  plan_id?: string;
  lot_id?: string;
  lot_name?: string;
  floor_number?: number;
  confidence_avg?: number;
  surface_m2?: number | null;
  room_count?: number;
  habitable_room_count?: number;
  source?: "ai" | "manual";
  trigger?: "single_click" | "bulk_validate";
  adjustment_type?: "zone_redraw" | "deleted";
  reason?: "no_units_detected" | "low_confidence";
  candidate_count?: number;
  plan_count?: number;
  [key: string]: unknown;
}

export function track(payload: AnalyticsPayload): void {
  const entry = { analytics: { ...payload, ts: new Date().toISOString() } };
  if (typeof window === "undefined") {
    // Server-side : pickup par les logs Next.js
    console.log(JSON.stringify(entry));
  } else {
    // Client-side V1 : log local — POST /api/vs/analytics en s22
    console.log("[analytics]", entry);
  }
}
