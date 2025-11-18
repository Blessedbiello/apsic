// Type definitions for APSIC

export type IncidentType =
  | 'harassment'
  | 'accident'
  | 'cyber'
  | 'infrastructure'
  | 'medical'
  | 'other'
  | 'auto';

export type SeverityLabel = 'Low' | 'Medium' | 'High' | 'Critical';

export type RouteDecision = 'LogOnly' | 'Review' | 'Escalate' | 'Immediate';

export type IncidentStatus = 'processing' | 'completed' | 'failed';

export type PriorityTier = 'standard' | 'premium' | 'enterprise';

export interface IncidentSubmission {
  text: string;
  incident_type?: IncidentType;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];
  reporter_wallet: string;
}

export interface ExtractedFields {
  incident_type: string;
  severity_score: number;
  severity_label: SeverityLabel;
  entities: {
    location?: string;
    time?: string;
    parties?: string[];
  };
  emotion: string;
  risk_indicators: string[];
}

export interface GeminiSummary {
  summary: string;
  recommended_actions: string[];
  urgency: string;
}

export interface RouteDecisionResult {
  route: RouteDecision;
  rules_triggered: string[];
  ai_validation?: {
    agrees_with_routing: boolean;
    override_suggested: boolean;
    reasoning: string;
    additional_factors?: string[];
  };
}

export interface AgenticReview {
  policy_compliance: {
    passed: boolean;
    notes: string;
  };
  bias_check: {
    passed: boolean;
    concerns: string[];
  };
  missing_information: string[];
  legal_considerations: string[];
  overall_passed: boolean;
}

export interface HumanReview {
  required: boolean;
  completed: boolean;
  reviewer?: string;
  decision?: string;
  notes?: string;
  timestamp?: string;
}

export interface SimilarIncidentData {
  incident_id: string;
  similarity_score: number;
  summary: string;
  severity_label: string;
  timestamp: string;
}

export interface AuditLogData {
  version: string;
  incident_id: string;
  timestamp: string;
  input: {
    text: string;
    media_urls: string[];
    reporter_wallet: string;
    submission_timestamp: string;
  };
  processing_pipeline: {
    intake: {
      timestamp: string;
      normalized_data: any;
      external_context?: any;
    };
    understand: {
      timestamp: string;
      gemini_extraction: ExtractedFields;
      gemini_summary: GeminiSummary;
    };
    decide: {
      timestamp: string;
      rules_triggered: string[];
      route: RouteDecision;
      ai_validation: any;
    };
    review: {
      timestamp: string;
      agentic_review: AgenticReview;
      human_review?: HumanReview;
    };
  };
  final_decision: {
    route: RouteDecision;
    severity: SeverityLabel;
    priority: string;
    assigned_to: string;
    recommended_actions: string[];
  };
  similar_incidents: SimilarIncidentData[];
  external_data_sources: string[];
  credits_used: number;
  processing_time_ms: number;
}

export interface OpusJobPayload {
  incident_id: string;
  text: string;
  media_urls: string[];
  reporter_wallet: string;
  timestamp: string;
  incident_type?: string;
}

export interface OpusJobResponse {
  job_id: string;
  status: string;
  result?: any;
}

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    text: string;
    summary: string;
    severity_score: number;
    severity_label: string;
    incident_type: string;
    timestamp: string;
    route: string;
    tags: string[];
  };
}
