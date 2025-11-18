export type IncidentType =
  | 'harassment'
  | 'accident'
  | 'cyber'
  | 'infrastructure'
  | 'medical'
  | 'other'
  | 'auto';

export type SeverityLabel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IncidentSubmission {
  text: string;
  incident_type?: IncidentType;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];
  reporter_wallet: string;
}

export interface Incident {
  id: string;
  text: string;
  incident_type?: string;
  media_urls: string[];
  severity_score?: number;
  severity_label?: SeverityLabel;
  summary?: string;
  recommended_actions: string[];
  urgency?: string;
  route?: string;
  status: string;
  created_at: string;
  updated_at: string;
  reporter: {
    wallet_address: string;
  };
  audit_log?: AuditLog;
  similar_incidents?: SimilarIncident[];
}

export interface AuditLog {
  id: string;
  audit_json: any;
  pdf_url?: string;
  created_at: string;
}

export interface SimilarIncident {
  incident_id: string;
  similarity_score: number;
  summary: string;
  severity_label: string;
  timestamp: string;
}

export interface CreditInfo {
  credits: number;
  priority_tier: string;
  staked: boolean;
}
